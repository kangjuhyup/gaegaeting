import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/features/social/application/chat_controller.dart';
import 'package:gaegaeting/features/social/data/chat_events.dart';
import 'package:gaegaeting/features/account/data/account_repository.dart';

import 'challenge_fixtures.dart';
import 'social_fixture.dart';

void main() {
  group('메시지 전송과 복구', () {
    late MemorySocialApi api;
    late MemoryVault vault;
    String? owner;
    setUp(() {
      api = MemorySocialApi()..pairs.add({'id': 10});
      vault = MemoryVault();
      owner = 'account-a';
    });
    ChatController create() =>
        ChatController(api: api, roomId: 1, owner: () => owner, vault: vault);
    test('서버 저장 후 응답을 잃고 앱을 다시 열어도 같은 UUID로 한 번만 저장한다', () async {
      final first = create();
      api.loseSend = true;
      expect(await first.send(' 같이 걸어요 '), false);
      final id = first.pendingId;
      first.dispose();
      final restart = create();
      await restart.restore();
      expect(restart.pendingBody, '같이 걸어요');
      expect(restart.pendingId, id);
      expect(await restart.send(restart.pendingBody!), true);
      expect(api.messages.where((m) => m['body'] == '같이 걸어요'), hasLength(1));
      expect(api.sentInputs.map((i) => i['clientMessageId']).toSet(), {id});
      expect(await vault.read('account-a', 'chat.pending.1'), null);
      restart.dispose();
    });
    test('미확인 메시지의 본문을 변경한 재시도는 거절한다', () async {
      final c = create();
      api.loseSend = true;
      await c.send('원본');
      expect(await c.send('변경'), false);
      expect(api.sentInputs, hasLength(1));
      expect(c.pendingBody, '원본');
      c.dispose();
    });
    test('공백·2000자 초과와 중복 탭은 전송하지 않는다', () async {
      final c = create();
      expect(await c.send('   '), false);
      expect(await c.send('a' * 2001), false);
      final results = await Future.wait([c.send('안녕'), c.send('안녕')]);
      expect(results.where((v) => v), hasLength(1));
      expect(api.sentInputs, hasLength(1));
      c.dispose();
    });
    test('다른 계정은 이전 계정의 전송 대기를 복원하지 않는다', () async {
      final a = create();
      api.loseSend = true;
      await a.send('개인 대화');
      a.dispose();
      owner = 'account-b';
      final b = create();
      await b.restore();
      expect(b.pendingBody, null);
      expect(api.sentInputs, hasLength(1));
      b.dispose();
    });
    test('취소된 매칭은 기록을 보여 주고 새 전송을 차단한다', () async {
      final c = create();
      api.pairs.clear();
      await c.refresh();
      expect(c.messages, hasLength(1));
      expect(c.active, false);
      expect(await c.send('새 메시지'), false);
      expect(api.sentInputs, isEmpty);
      c.dispose();
    });
    test('새 메시지가 없는 새로고침은 중복 읽음 요청을 보내지 않는다', () async {
      final c = create();
      await c.refresh();
      await c.refresh();
      expect(api.operations.where((n) => n == 'markChatRead'), hasLength(1));
      c.dispose();
    });
    test('재연결 후 100개 넘는 누락 메시지를 커서로 병합하고 중복 표시하지 않는다', () async {
      final c = create();
      await c.refresh();
      for (var id = 2; id <= 152; id++) {
        api.messages.add({
          'id': id,
          'senderId': 'friend',
          'roomId': 1,
          'body': '메시지 $id',
          'sentAt': '2026-10-06T00:00:00Z',
        });
      }
      await c.refresh();
      await c.refresh();
      expect(c.messages, hasLength(152));
      expect(c.messages.last['id'], 152);
      c.dispose();
    });
    test('과거 페이지 존재 여부를 새 메시지 갱신이 지우지 않는다', () async {
      for (var id = 2; id <= 80; id++) {
        api.messages.add({
          'id': id,
          'senderId': 'friend',
          'roomId': 1,
          'body': '과거 $id',
          'sentAt': '2026-10-06T00:00:00Z',
        });
      }
      final c = create();
      await c.refresh();
      expect(c.hasMore, true);
      await c.refresh();
      expect(c.hasMore, true);
      await c.refresh(older: true);
      expect(c.messages, hasLength(80));
      expect(c.hasMore, false);
      c.dispose();
    });
  });
  test('실제 WebSocket은 토큰을 URL 없이 init에 보내고 ack 뒤 구독하며 ping에 답한다', () async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final frames = <Map>[];
    WebSocket? socket;
    final received = Completer<void>();
    server.listen((request) async {
      expect(request.uri.query, isEmpty);
      socket = await WebSocketTransformer.upgrade(
        request,
        protocolSelector: (values) => values.contains('graphql-transport-ws')
            ? 'graphql-transport-ws'
            : null,
      );
      socket!.listen((raw) {
        final frame = jsonDecode(raw) as Map;
        frames.add(frame);
        if (frame['type'] == 'connection_init') {
          socket!.add(jsonEncode({'type': 'connection_ack'}));
          socket!.add(
            jsonEncode({
              'type': 'ping',
              'payload': {'probe': 1},
            }),
          );
        }
        if (frame['type'] == 'subscribe') {
          socket!.add(
            jsonEncode({
              'id': 'events',
              'type': 'next',
              'payload': {
                'data': {
                  'chatEvents': {
                    'kind': 'MESSAGE',
                    'roomId': 1,
                    'messageId': 1,
                  },
                },
              },
            }),
          );
        }
        if (frame['type'] == 'pong' && !received.isCompleted) {
          received.complete();
        }
      });
    });
    final states = <ChatConnection>[];
    final events = GatewayChatEvents(
      url: 'http://127.0.0.1:${server.port}/gateway/graphql',
      accessToken: () async => 'opaque-local-test',
      owner: () => 'account-a',
    );
    final sub = events.watch(roomId: 1).listen(states.add);
    await received.future.timeout(const Duration(seconds: 5));
    await Future<void>.delayed(const Duration(milliseconds: 20));
    expect(frames.first, {
      'type': 'connection_init',
      'payload': {'authorization': 'Bearer opaque-local-test'},
    });
    expect(frames[1]['type'], 'subscribe');
    expect(states, contains(ChatConnection.connected));
    await sub.cancel();
    await socket?.close();
    await server.close(force: true);
  });
  test('WS 인증 거절은 무한 재연결 대신 재로그인을 요구한다', () async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    var connections = 0;
    server.listen((r) async {
      connections++;
      final ws = await WebSocketTransformer.upgrade(r);
      ws.listen((_) {
        ws.close(4401);
      });
    });
    final rejected = Completer<Object>();
    final sub =
        GatewayChatEvents(
          url: 'http://127.0.0.1:${server.port}/gateway/graphql',
          accessToken: () async => 'opaque',
          owner: () => 'a',
        ).watch().listen(
          (_) {},
          onError: (Object e) {
            rejected.complete(e);
          },
        );
    expect(
      await rejected.future.timeout(const Duration(seconds: 5)),
      isA<ApiFailure>().having((e) => e.requiresLogin, 'requiresLogin', true),
    );
    await Future<void>.delayed(const Duration(milliseconds: 1100));
    expect(connections, 1);
    await sub.cancel();
    await server.close(force: true);
  });
  test('WS 인증 만료 시 새 opaque 토큰으로 다시 인증하고 구독한다', () async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    var token = 'opaque-old', connections = 0;
    final connected = Completer<void>();
    final sockets = <WebSocket>[];
    server.listen((r) async {
      connections++;
      final ws = await WebSocketTransformer.upgrade(r);
      sockets.add(ws);
      ws.listen((raw) {
        final frame = jsonDecode(raw as String) as Map;
        if (frame['type'] == 'connection_init') {
          if (frame['payload']['authorization'] == 'Bearer opaque-old') {
            token = 'opaque-refreshed';
            ws.close(4401);
          } else {
            expect(
              frame['payload']['authorization'],
              'Bearer opaque-refreshed',
            );
            ws.add(jsonEncode({'type': 'connection_ack'}));
          }
        }
        if (frame['type'] == 'subscribe' && !connected.isCompleted) {
          connected.complete();
        }
      });
    });
    final errors = <Object>[];
    final sub = GatewayChatEvents(
      url: 'http://127.0.0.1:${server.port}/gateway/graphql',
      accessToken: () async => token,
      owner: () => 'a',
    ).watch(roomId: 1).listen((_) {}, onError: errors.add);
    await connected.future.timeout(const Duration(seconds: 5));
    expect(connections, 2);
    expect(errors, isEmpty);
    await sub.cancel();
    for (final socket in sockets) {
      await socket.close();
    }
    await server.close(force: true);
  });
}
