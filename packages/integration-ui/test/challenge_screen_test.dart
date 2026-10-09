import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/app/gaegaeting_app.dart';
import 'package:gaegaeting/app/router.dart';
import 'package:gaegaeting/features/account/application/api_session.dart';
import 'package:gaegaeting/features/challenge/application/challenge_providers.dart';
import 'package:gaegaeting/features/challenge/domain/challenge_models.dart';
import 'package:gaegaeting/core/design/widgets.dart';

import 'challenge_app_fixture.dart';
import 'challenge_fixtures.dart';

Future<void> renderChallenge(
  WidgetTester tester,
  ChallengeAppFixture f,
  String route,
) async {
  await f.container.read(apiSessionProvider.future);
  f.container.read(routerProvider).go(route);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: f.container,
      child: const GaegaetingApp(),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> seedFinished(ChallengeAppFixture f, {bool course = false}) async {
  f.api.routes.add({...sampleRoute});
  await f.api.call('startWalk', {
    'input': {
      'requestId': uuid(),
      'petIds': [1],
      'routeId': course ? 'route-1' : null,
    },
  });
  f.api.walk!['points'] = [
    for (var i = 0; i < samplePath.length; i++)
      {
        ...samplePath[i],
        'recordedAt': f.api.clock
            .add(Duration(seconds: i * 5))
            .toIso8601String(),
        'accuracyMeters': 5.0,
        'segment': 0,
      },
  ];
  await f.api.call('finishWalk', {
    'id': 'walk-1',
    'endedAt': f.api.clock.add(const Duration(minutes: 32)).toIso8601String(),
  });
}

void main() {
  testWidgets('실제 챌린지 탭에서 kind별 문구를 매핑하고 참여 결과 0/3과 취소 상태를 보여준다', (
    tester,
  ) async {
    final f = ChallengeAppFixture();
    addTearDown(f.dispose);
    await renderChallenge(tester, f, '/api/challenge');
    expect(find.text('동네 탐험가'), findsOneWidget);
    expect(find.text('우리 동네 탐험대'), findsNothing);
    await tester.ensureVisible(find.text('동네 탐험가'));
    await tester.tap(find.text('동네 탐험가'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('챌린지 참여'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '참여'));
    await tester.pumpAndSettle();
    expect(find.text('0 / 3'), findsOneWidget);
    expect(f.api.calls.where((x) => x.$1 == 'joinChallenge').length, 1);
    expect(find.text('동네 탐험가 배지'), findsNothing);
    await tester.ensureVisible(find.text('참여 취소'));
    await tester.tap(find.text('참여 취소'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '참여 취소'));
    await tester.pumpAndSettle();
    expect(find.text('참여를 취소했어요'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('일기는 기본 나만 보기로 저장하고 실제 walkId와 revision을 보낸다', (tester) async {
    final f = ChallengeAppFixture();
    addTearDown(f.dispose);
    await seedFinished(f);
    await renderChallenge(tester, f, '/api/challenge/diary-editor/walk-1');
    await tester.enterText(find.byType(TextField).last, '그늘 아래에서 쉬었어요.');
    await tester.tap(find.text('일기 저장'));
    await tester.pumpAndSettle();
    expect(find.text('나만 보기'), findsOneWidget);
    await tester.tap(find.text('선택한 범위로 저장'));
    await tester.pumpAndSettle();
    expect(f.api.diary!['visibility'], 'PRIVATE');
    expect(f.api.diary!['walkId'], 'walk-1');
    expect(f.api.diary!['content'], '그늘 아래에서 쉬었어요.');
    expect(tester.takeException(), isNull);
  });
  testWidgets('완주한 공개 코스 일기는 공개 확인 단계를 거친 뒤 PUBLIC으로 저장한다', (tester) async {
    final f = ChallengeAppFixture();
    addTearDown(f.dispose);
    await seedFinished(f, course: true);
    await renderChallenge(tester, f, '/api/challenge/diary-editor/walk-1');
    await tester.enterText(find.byType(TextField).last, '좋았어요.');
    await tester.tap(find.text('일기 저장'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('코스 공개 후기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('선택한 범위로 저장'));
    await tester.pumpAndSettle();
    expect(find.text('코스 후기로 공개할까요?'), findsOneWidget);
    expect(f.api.diary, isNull);
    await tester.tap(find.text('확인하고 공개'));
    await tester.pumpAndSettle();
    expect(f.api.diary!['visibility'], 'PUBLIC');
    expect(tester.takeException(), isNull);
  });
  testWidgets('일기 버전 충돌에서 내 입력을 보존하고 최신 버전을 확인한 뒤 저장한다', (tester) async {
    final f = ChallengeAppFixture();
    addTearDown(f.dispose);
    await seedFinished(f);
    await renderChallenge(tester, f, '/api/challenge/diary-editor/walk-1');
    await tester.enterText(find.byType(TextField).last, '내가 쓴 이야기');
    f.api.diary = {
      'id': 'diary-1',
      'walkId': 'walk-1',
      'revision': 1,
      'content': '다른 기기 이야기',
      'photos': [],
      'walkDate': '2026-10-05',
      'visibility': 'PRIVATE',
    };
    await tester.tap(find.text('일기 저장'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('선택한 범위로 저장'));
    await tester.pumpAndSettle();
    expect(find.text('일기가 다른 곳에서 바뀌었어요'), findsOneWidget);
    expect(f.api.diary!['content'], '다른 기기 이야기');
    await tester.ensureVisible(find.text('최신 버전 확인 후 내 입력 유지'));
    await tester.tap(find.text('최신 버전 확인 후 내 입력 유지'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('선택한 범위로 저장'));
    await tester.pumpAndSettle();
    expect(f.api.diary!['content'], '내가 쓴 이야기');
    expect(tester.takeException(), isNull);
  });
  testWidgets('코스 공유는 연속 구간과 사적 위치 제외 확인 후 실제 inclusive index로 초안을 저장한다', (
    tester,
  ) async {
    final f = ChallengeAppFixture();
    addTearDown(f.dispose);
    await seedFinished(f);
    await renderChallenge(tester, f, '/api/challenge/route-create/walk-1');
    await tester.tap(find.text('공개 미리보기'));
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<FilledButton>(find.widgetWithText(FilledButton, '코스 정보 입력'))
          .onPressed,
      isNull,
    );
    await tester.ensureVisible(find.text('집 등 사적인 위치를 제외했어요'));
    await tester.tap(find.text('집 등 사적인 위치를 제외했어요'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('코스 정보 입력'));
    await tester.pumpAndSettle();
    for (final entry in [
      ('코스 제목', '나무 그늘 산책'),
      ('출발 장소', '출입구'),
      ('도착 장소', '출입구'),
    ]) {
      final field = find.descendant(
        of: find.widgetWithText(FlowField, entry.$1),
        matching: find.byType(TextField),
      );
      await tester.ensureVisible(field);
      await tester.enterText(field, entry.$2);
    }
    await tester.tap(find.text('초안 저장'));
    await tester.pumpAndSettle();
    final create = f.api.calls
        .firstWhere((e) => e.$1 == 'createWalkingRoute')
        .$2['input'];
    expect(create['fromIndex'], 0);
    expect(create['toIndex'], 3);
    expect(find.text('초안'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('새 강아지 등록 선행조건이 없는 로그인 사용자는 선택 강아지로 실제 산책을 시작한다', (tester) async {
    final f = ChallengeAppFixture();
    addTearDown(f.dispose);
    await renderChallenge(tester, f, '/api/challenge/prepare');
    await tester.tap(find.byType(CheckboxListTile).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('선택한 강아지와 산책 시작'));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    expect(f.api.walk!['state'], 'RECORDING');
    for (
      var i = 0;
      i < 30 && !f.container.read(walkControllerProvider).collecting;
      i++
    ) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    expect(
      f.container.read(walkControllerProvider).collecting,
      true,
      reason:
          '${f.container.read(walkControllerProvider).error} / ${f.container.read(walkControllerProvider).walk?.state} / ${f.api.calls.map((e) => e.$1).join(',')}',
    );
    expect(tester.takeException(), isNull);
  });
  testWidgets('저장 코스는 다음 offset 페이지를 병합하고 마지막 페이지에서 더 보기를 숨긴다', (tester) async {
    final f = ChallengeAppFixture();
    addTearDown(f.dispose);
    f.api.routes.addAll([
      for (var i = 0; i < 21; i++)
        {...sampleRoute, 'id': 'route-$i', 'title': '저장한 길 $i'},
    ]);
    await renderChallenge(tester, f, '/api/challenge/records/bookmarks');
    expect(find.text('저장한 길 20'), findsNothing);
    await tester.ensureVisible(find.text('더 보기'));
    await tester.tap(find.text('더 보기'));
    await tester.pumpAndSettle();
    final requests = f.api.calls
        .where((e) => e.$1 == 'myBookmarkedWalkingRoutes')
        .map((e) => e.$2)
        .toList();
    expect(requests.map((v) => v['offset']), [0, 20]);
    expect(requests.every((v) => v['limit'] == 20), true);
    expect(find.text('저장한 길 20'), findsOneWidget);
    expect(find.text('더 보기'), findsNothing);
    expect(tester.takeException(), isNull);
  });
  testWidgets('API 환경에서도 명시적 미리보기 경로는 실제 catalogue나 참여를 호출하지 않는다', (
    tester,
  ) async {
    final f = ChallengeAppFixture();
    addTearDown(f.dispose);
    await renderChallenge(tester, f, '/challenge');
    expect(find.text('디자인 미리보기'), findsOneWidget);
    expect(f.api.calls.where((e) => e.$1 == 'challenges'), isEmpty);
    expect(f.gps.permissionCalls, 0);
    expect(tester.takeException(), isNull);
  });
  testWidgets('일시정지에는 기록 중으로 오해할 안내 대신 GPS 수집 중단을 표시한다', (tester) async {
    final f = ChallengeAppFixture();
    addTearDown(f.dispose);
    await f.api.call('startWalk', {
      'input': {
        'requestId': uuid(),
        'petIds': [1],
        'routeId': null,
      },
    });
    await f.api.call('setWalkPaused', {'id': 'walk-1', 'paused': true});
    await renderChallenge(tester, f, '/api/challenge/walk/walk-1');
    expect(find.text('위치 기록을 잠시 멈췄어요. 산책 재개를 누르면 다시 기록해요.'), findsOneWidget);
    expect(f.gps.permissionCalls, 0);
    expect(tester.takeException(), isNull);
  });
  for (final kind in [
    'routes',
    'bookmarks',
    'walks',
    'diaries',
    'passport',
    'challenges',
  ]) {
    testWidgets('내 기록 $kind 빈 상태와 좁은 화면에서 API 목록 계약을 지킨다', (tester) async {
      tester.view.physicalSize = const Size(320, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final f = ChallengeAppFixture();
      addTearDown(f.dispose);
      await renderChallenge(tester, f, '/api/challenge/records/$kind');
      expect(find.text('아직 기록이 없어요. 새로운 산책을 시작해 보세요.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }
}
