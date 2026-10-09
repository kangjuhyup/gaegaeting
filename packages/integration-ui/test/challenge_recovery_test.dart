import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/features/challenge/application/walk_controller.dart';
import 'package:gaegaeting/features/challenge/application/photo_controller.dart';
import 'package:gaegaeting/features/challenge/domain/challenge_models.dart';

import 'dart:typed_data';
import 'dart:async';

import 'challenge_fixtures.dart';

void main() {
  group('산책 기록 복구와 계정 소유권', () {
    late MemoryChallengeApi api;
    late MemoryVault vault;
    late FakeGps gps;
    late WalkController c;
    String? owner;
    late DateTime now;
    setUp(() {
      api = MemoryChallengeApi();
      vault = MemoryVault();
      gps = FakeGps();
      owner = 'owner-a';
      now = api.clock;
      c = WalkController(
        api: api,
        vault: vault,
        gps: gps,
        owner: () => owner,
        now: () => now,
      );
    });
    tearDown(() async {
      c.dispose();
      await gps.controller.close();
    });
    Future<void> begin() async {
      await c.start([1], null);
      await c.stopGps();
    }

    Future<void> point(int i, {int segment = 0}) async {
      now = api.clock.add(Duration(seconds: i + 1));
      await c.capture(
        TrackPoint(37.5665 + i / 100000, 126.978, now, 5, segment),
      );
    }

    test('응답을 잃은 시작은 동일 requestId로 다시 확인하고 중복 산책을 만들지 않는다', () async {
      api.loseResponse = 'startWalk';
      await expectLater(c.start([1], null), throwsA(isA<ChallengeFailure>()));
      final id = c.queue!.start!['requestId'];
      await c.recover();
      expect(c.walk!.value['requestId'], id);
      expect(c.queue!.start, isNull);
    });
    test('200점 배치 응답 유실 뒤 앱 재시작은 서버 확인 점을 제거하고 나머지만 전송한다', () async {
      await begin();
      for (var i = 0; i < 201; i++) {
        await point(i);
      }
      api.loseResponse = 'appendWalkPoints';
      await expectLater(c.flush(), throwsA(isA<ChallengeFailure>()));
      expect(c.queue!.pending.length, 201);
      c.dispose();
      c = WalkController(
        api: api,
        vault: vault,
        gps: gps,
        owner: () => owner,
        now: () => now,
      );
      await c.recover();
      expect(c.queue!.pending.length, 1);
      await c.flush();
      expect(c.walk!.points.length, 201);
      expect(
        api.calls
            .where((x) => x.$1 == 'appendWalkPoints')
            .last
            .$2['input']['fromIndex'],
        200,
      );
    });
    test('일시정지 요청은 미전송 점 뒤에 보내며 재개 뒤 새 세그먼트 순서를 보존한다', () async {
      await begin();
      await point(1);
      api.clock = now;
      await c.pause(true);
      expect(c.walk!.state, 'PAUSED');
      await point(2);
      expect(c.queue!.pending, isEmpty);
      api.clock = api.clock.add(const Duration(seconds: 5));
      now = api.clock;
      await c.pause(false);
      await c.stopGps();
      await point(20, segment: 1);
      await c.flush();
      expect(c.walk!.points.map((p) => p.segment), [0, 1]);
      final names = api.calls.map((x) => x.$1).toList();
      expect(
        names.indexOf('appendWalkPoints'),
        lessThan(names.indexOf('setWalkPaused')),
      );
    });
    test('일시정지 응답 유실 후 재시작은 같은 상태를 확인하여 재개 세그먼트를 중복 생성하지 않는다', () async {
      await begin();
      api.loseResponse = 'setWalkPaused';
      await expectLater(c.pause(true), throwsA(isA<ChallengeFailure>()));
      expect(c.walk!.state, 'RECORDING');
      await c.recover();
      expect(c.walk!.state, 'PAUSED');
      expect(api.calls.where((x) => x.$1 == 'setWalkPaused').length, 1);
    });
    test('오프라인에서는 일시정지를 성공으로 표시하지 않으며 재연결 뒤 명령을 확인한다', () async {
      await begin();
      api.offline = true;
      await expectLater(c.pause(true), throwsA(isA<ChallengeFailure>()));
      expect(c.walk!.state, 'RECORDING');
      expect(c.queue!.pausedCommand, true);
      api.offline = false;
      await c.flush();
      expect(c.walk!.state, 'PAUSED');
    });
    test('종료 응답 유실과 재시작에도 처음 endedAt으로 재시도하고 서버 완주 결과를 표시한다', () async {
      await begin();
      await point(1);
      final end = now;
      api.loseResponse = 'finishWalk';
      await expectLater(c.finish(), throwsA(isA<ChallengeFailure>()));
      expect(c.queue!.finishAt, end);
      now = now.add(const Duration(hours: 1));
      c.dispose();
      c = WalkController(
        api: api,
        vault: vault,
        gps: gps,
        owner: () => owner,
        now: () => now,
      );
      await c.recover();
      final ends = api.calls
          .where((x) => x.$1 == 'finishWalk')
          .map((x) => x.$2['endedAt'])
          .toList();
      expect(ends, [end.toIso8601String(), end.toIso8601String()]);
      expect(c.walk!.distance, 1234);
      expect(c.queue!.finishAt, isNull);
    });
    test('GPS 종료와 큐 flush가 완료된 뒤에만 finish 요청을 보낸다', () async {
      await begin();
      await point(1);
      await c.finish();
      expect(c.collecting, false);
      final names = api.calls.map((x) => x.$1).toList();
      expect(
        names.indexOf('appendWalkPoints'),
        lessThan(names.indexOf('finishWalk')),
      );
      expect(c.queue!.pending, isEmpty);
    });
    test('로그아웃과 계정 전환은 이전 계정의 대기 점을 새 계정으로 전송하지 않는다', () async {
      await begin();
      await point(1);
      owner = null;
      c.detach();
      final before = api.calls.length;
      await c.flush();
      expect(api.calls.length, before);
      owner = 'owner-b';
      api.walk = null;
      await c.recover();
      expect(c.queue!.pending, isEmpty);
      expect((await vault.read('owner-a', 'walk'))!['pending'], hasLength(1));
    });
    test('동시 전송 요청은 순차 처리하고 점을 중복 전송하지 않는다', () async {
      await begin();
      for (var i = 0; i < 401; i++) {
        await point(i);
      }
      await Future.wait([c.flush(), c.flush(), c.flush()]);
      expect(c.walk!.points.length, 401);
      expect(
        api.calls
            .where((x) => x.$1 == 'appendWalkPoints')
            .map((x) => x.$2['input']['points'].length),
        [200, 200, 1],
      );
    });
    test('복구가 디스크를 읽는 동안 GPS 수집을 중단하고 기존 미전송 점을 보존한다', () async {
      final gated = GatedVault();
      c.dispose();
      vault = gated;
      c = WalkController(
        api: api,
        vault: gated,
        gps: gps,
        owner: () => owner,
        now: () => now,
      );
      await begin();
      await point(1);
      await c.record();
      gated.onRead = () {
        gps.controller.add(
          TrackPoint(37.5, 126.9, now.add(const Duration(seconds: 1)), 5, 0),
        );
      };
      await c.recover();
      expect(c.queue!.pending.length, 1);
      expect(c.collecting, true);
    });
    test('디스크 저장 대기 중 계정 전환이 일어나면 이전 append 요청도 전송하지 않는다', () async {
      final gated = GatedVault();
      c.dispose();
      vault = gated;
      c = WalkController(
        api: api,
        vault: gated,
        gps: gps,
        owner: () => owner,
        now: () => now,
      );
      await begin();
      gated.writeGate = Completer<void>();
      final capture = point(1);
      final flush = c.flush();
      await Future<void>.delayed(Duration.zero);
      owner = 'owner-b';
      c.detach();
      gated.writeGate!.complete();
      await capture;
      await flush;
      expect(api.calls.where((e) => e.$1 == 'appendWalkPoints'), isEmpty);
    });
    test('산책 삭제 확인 뒤 해당 계정의 복구 큐를 정리한다', () async {
      await begin();
      final id = c.walk!.id;
      await c.clearDeletedWalk(id);
      expect(c.walk, isNull);
      expect(await vault.read('owner-a', 'walk'), isNull);
    });
    test('동시에 일시정지와 종료를 누르면 한 명령만 처리하고 다음 종료 시각을 고정한다', () async {
      await begin();
      final pause = c.pause(true);
      await expectLater(
        c.finish(),
        throwsA(isA<ChallengeFailure>().having((e) => e.status, 'status', 409)),
      );
      await pause;
      expect(c.walk!.state, 'PAUSED');
      await c.finish();
      expect(c.walk!.state, 'FINISHED');
    });
    test('오프라인 일시정지 대기 후 종료는 새 pause 요청 없이 고정 종료 시각으로 저장한다', () async {
      await begin();
      api.offline = true;
      await expectLater(c.pause(true), throwsA(isA<ChallengeFailure>()));
      await expectLater(c.finish(), throwsA(isA<ChallengeFailure>()));
      final ended = c.queue!.finishAt;
      api.offline = false;
      api.clock = api.clock.add(const Duration(minutes: 5));
      await c.flush();
      expect(c.walk!.state, 'FINISHED');
      expect(c.walk!.value['endedAt'], ended!.toIso8601String());
      expect(api.calls.where((x) => x.$1 == 'setWalkPaused'), isEmpty);
    });
    test('시간 역행과 잘못된 세그먼트 위치는 큐에 저장하지 않는다', () async {
      await begin();
      await point(1);
      await point(0);
      await point(3, segment: 1);
      expect(c.queue!.pending.length, 1);
    });
  });
  group('사진 예약 복구와 기존 파일 보호', () {
    late MemoryChallengeApi api;
    late MemoryVault vault;
    late MemoryPhotoTransport transport;
    late PhotoUploadController c;
    String? owner;
    setUp(() {
      api = MemoryChallengeApi();
      vault = MemoryVault();
      transport = MemoryPhotoTransport(api);
      owner = 'a';
      c = PhotoUploadController(
        api: api,
        vault: vault,
        transport: transport,
        owner: () => owner,
      );
    });
    test('예약 응답 유실 후 소유 불명 사진은 채택하거나 삭제하지 않는다', () async {
      api.loseResponse = 'beginWalkingPhotoUpload';
      await expectLater(
        c.upload('w', Uint8List.fromList([1, 2])),
        throwsA(isA<ChallengeFailure>()),
      );
      api.photos.add({
        'id': 'other-device',
        'status': 'READY',
        'url': null,
        'expiresIn': 300,
      });
      await expectLater(
        c.retry('w'),
        throwsA(isA<ChallengeFailure>().having((e) => e.status, 'status', 409)),
      );
      await c.cancel('w', {});
      expect(api.photos.map((p) => p['id']), ['photo-1', 'other-device']);
      expect(api.calls.where((x) => x.$1 == 'deleteWalkingPhoto'), isEmpty);
    });
    test('업로드 완료 응답을 잃은 뒤 재시작은 READY를 재사용하고 새 예약을 만들지 않는다', () async {
      api.loseResponse = 'completeWalkingPhotoUpload';
      await expectLater(
        c.upload('w', Uint8List.fromList([1])),
        throwsA(isA<ChallengeFailure>()),
      );
      c = PhotoUploadController(
        api: api,
        vault: vault,
        transport: transport,
        owner: () => owner,
      );
      final p = await c.retry('w');
      expect(p['status'], 'READY');
      expect(
        api.calls.where((x) => x.$1 == 'beginWalkingPhotoUpload').length,
        1,
      );
    });
    test('작성 취소는 이번 새 예약만 지우고 기존 저장 사진을 보존한다', () async {
      api.photos.add({
        'id': 'existing',
        'status': 'READY',
        'url': null,
        'expiresIn': 300,
      });
      transport.offline = true;
      await expectLater(
        c.upload('w', Uint8List.fromList([1])),
        throwsA(isA<ChallengeFailure>()),
      );
      await c.cancel('w', {});
      expect(api.photos.map((p) => p['id']), ['existing']);
      expect(await c.pending('w'), isNull);
    });
    test('계정 전환 뒤 업로드 재시도는 이전 사진 큐를 열지 않는다', () async {
      transport.offline = true;
      await expectLater(
        c.upload('w', Uint8List.fromList([1])),
        throwsA(isA<ChallengeFailure>()),
      );
      owner = 'b';
      await expectLater(c.retry('w'), throwsA(isA<ChallengeFailure>()));
      expect(await vault.read('a', 'photo.w'), isNotNull);
    });
    test('다른 기기에 저장된 일기 사진은 새 미사용 목록에 있어도 삭제하지 않는다', () async {
      api.photos.add({
        'id': 'protected',
        'status': 'READY',
        'url': null,
        'expiresIn': 300,
      });
      api.diary = {
        'photos': [
          {'id': 'protected'},
        ],
      };
      await c.cancel('w', {'protected'});
      expect(api.photos.single['id'], 'protected');
      expect(api.calls.where((x) => x.$1 == 'deleteWalkingPhoto'), isEmpty);
    });
    test('예약을 포함해 4장 상한이면 업로드 시작을 요청하지 않는다', () async {
      for (var i = 0; i < 4; i++) {
        api.photos.add({'id': '$i', 'status': 'UPLOADING'});
      }
      await expectLater(
        c.upload('w', Uint8List.fromList([1])),
        throwsA(isA<ChallengeFailure>()),
      );
      expect(
        api.calls.where((x) => x.$1 == 'beginWalkingPhotoUpload'),
        isEmpty,
      );
    });
  });
}

class GatedVault extends MemoryVault {
  Completer<void>? writeGate, readGate;
  void Function()? onRead;
  @override
  Future<void> write(String owner, String key, Json? value) async {
    await writeGate?.future;
    await super.write(owner, key, value);
  }

  @override
  Future<Json?> read(String owner, String key) async {
    onRead?.call();
    await readGate?.future;
    return super.read(owner, key);
  }
}
