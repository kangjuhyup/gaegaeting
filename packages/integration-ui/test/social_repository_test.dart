import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'dart:ui' as ui;
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/core/network/gateway_api.dart';
import 'package:gaegaeting/features/account/data/account_repository.dart';
import 'package:gaegaeting/features/account/data/profile_repository.dart';
import 'package:gaegaeting/features/challenge/application/photo_controller.dart';
import 'package:gaegaeting/features/social/data/social_repository.dart';

import 'social_fixture.dart';

class DelayedUpload implements PhotoTransport {
  final wait = Completer<void>();
  var calls = 0;
  @override
  Future<void> put(String url, Uint8List bytes) async {
    calls++;
    await wait.future;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Uint8List png;
  setUpAll(() async {
    final docs = {
      ...socialOperations,
      ...profileOperations,
      'friend':
          'query Friend(\$id: String!) { profile(id: \$id) { $profileFields } petsByUserId(userId: \$id) { $petFields } }',
      'chatEvents': r'subscription Changes($roomId: Int) { chatEvents(roomId: $roomId) { kind roomId messageId } }',
    };
    final file = File('build/social-review/operation-documents.json');
    await file.parent.create(recursive: true);
    await file.writeAsString(jsonEncode(docs));
    final recorder = ui.PictureRecorder();
    ui.Canvas(recorder).drawRect(
      const ui.Rect.fromLTWH(0, 0, 2, 2),
      ui.Paint()..color = const ui.Color(0xffabcdef),
    );
    final picture = recorder.endRecording();
    final image = await picture.toImage(2, 2);
    png = (await image.toByteData(format: ui.ImageByteFormat.png))!.buffer
        .asUint8List();
    image.dispose();
    picture.dispose();
  });
  late MemorySocialApi api;
  late Dio dio;
  late SocialGatewayAdapter adapter;
  late AccountRepository account;
  String? owner;
  setUp(() {
    api = MemorySocialApi();
    adapter = SocialGatewayAdapter(api);
    dio = Dio()..httpClientAdapter = adapter;
    owner = 'account-a';
    account = AccountRepository(
      account: GatewayApi(dio, baseUrl: 'https://fixture.test/graphql'),
      gateway: GatewayApi(dio, baseUrl: 'https://fixture.test/graphql'),
      accessToken: () async => 'opaque-user-access-token',
    );
  });
  tearDown(() => dio.close());
  test('관심 목록과 수락·채팅 동기화는 실제 Retrofit에 opaque Bearer와 실제 ID를 전달한다', () async {
    final repo = SocialRepository(account: account, owner: () => owner);
    expect((await repo.call('myReceivedLikes')) as List, hasLength(1));
    expect(
      adapter.headers.first['Authorization'],
      'Bearer opaque-user-access-token',
    );
    await repo.call('acceptLike', {'id': 1});
    expect((await repo.call('myPairs')) as List, hasLength(1));
    expect((await repo.call('syncChatRooms')) as List, hasLength(1));
    final friend = await repo.friend('friend');
    expect(friend.profile?.nickname, '지우');
    expect(friend.pets.first.name, '콩이');
  });
  test('권한 오류가 포함된 부분 응답을 성공으로 사용하지 않는다', () async {
    api.pairs.clear();
    final repo = SocialRepository(account: account, owner: () => owner);
    await expectLater(
      repo.call('sendChatMessage', {
        'input': {'roomId': 1, 'body': '안녕', 'clientMessageId': 'fixture'},
      }),
      throwsA(isA<ApiFailure>()),
    );
  });
  test('토큰을 기다리는 동안 계정이 바뀌면 새 계정으로 이전 요청을 전송하지 않는다', () async {
    final token = Completer<String?>();
    account = AccountRepository(
      account: account.account,
      gateway: account.gateway,
      accessToken: () => token.future,
    );
    final repo = SocialRepository(account: account, owner: () => owner);
    final future = repo.call('acceptLike', {'id': 1});
    await Future<void>.delayed(Duration.zero);
    owner = 'account-b';
    token.complete('opaque-b');
    await expectLater(
      future,
      throwsA(
        isA<ApiFailure>().having((e) => e.requiresLogin, 'requiresLogin', true),
      ),
    );
    expect(api.operations, isEmpty);
  });
  test('사진 저장소가 없으면 예약·PUT·완료를 실행하지 않는다', () async {
    final transport = MemoryPhotoTransport();
    final repo = ProfileRepository(
      account: account,
      owner: () => owner,
      transport: transport,
      imageOrigin: '',
    );
    await expectLater(repo.upload(png, 0), throwsA(isA<ApiFailure>()));
    expect(api.operations, isEmpty);
    expect(transport.calls, 0);
  });
  test('프로필 사진은 PNG 변환 후 허용된 저장소 PUT과 서버 완료로 승인 대기가 된다', () async {
    final transport = MemoryPhotoTransport();
    final repo = ProfileRepository(
      account: account,
      owner: () => owner,
      transport: transport,
      imageOrigin: 'https://images.example.test',
    );
    await repo.upload(png, 0);
    expect(api.operations, ['generatePresignedUrl', 'completeProfileImage']);
    expect(transport.calls, 1);
    expect(api.photos.single['status'], 'PENDING');
  });
  test('업로드 주소가 허용 origin과 다르면 사진을 전송하지 않는다', () async {
    final transport = MemoryPhotoTransport();
    final repo = ProfileRepository(
      account: account,
      owner: () => owner,
      transport: transport,
      imageOrigin: 'https://other.example.test',
    );
    await expectLater(repo.upload(png, 0), throwsA(isA<ApiFailure>()));
    expect(transport.calls, 0);
    expect(api.operations, ['generatePresignedUrl']);
  });
  test('사진 PUT 중 계정이 변경되면 새 계정으로 완료 요청을 보내지 않는다', () async {
    final transport = DelayedUpload();
    final repo = ProfileRepository(
      account: account,
      owner: () => owner,
      transport: transport,
      imageOrigin: 'https://images.example.test',
    );
    final future = repo.upload(png, 0);
    while (transport.calls == 0) {
      await Future<void>.delayed(Duration.zero);
    }
    owner = 'account-b';
    transport.wait.complete();
    await expectLater(future, throwsA(isA<ApiFailure>()));
    expect(api.operations, ['generatePresignedUrl']);
    expect(api.photos.single['status'], 'UPLOADING');
  });
  test('강아지 변경은 서버가 허용한 수정 입력·정수 ID를 사용한다', () async {
    final repo = ProfileRepository(
      account: account,
      owner: () => owner,
      transport: MemoryPhotoTransport(),
      imageOrigin: '',
    );
    await repo.call('updatePet', {
      'id': 1,
      'input': {
        'name': '하루',
        'age': 4,
        'personalities': ['CALM'],
        'description': '차분해요',
      },
    });
    await repo.call('deletePet', {'id': 1});
    expect(api.operations, ['updatePet', 'deletePet']);
  });
}
