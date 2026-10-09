import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../../account/data/account_repository.dart';

enum ChatConnection { connected, reconnecting }

abstract class ChatEvents {
  Stream<ChatConnection> watch({int? roomId});
}

class GatewayChatEvents implements ChatEvents {
  GatewayChatEvents({
    required this.url,
    required this.accessToken,
    required this.owner,
    WebSocketChannel Function(Uri)? connect,
  }) : connect =
           connect ??
           ((uri) => WebSocketChannel.connect(
             uri,
             protocols: ['graphql-transport-ws'],
           ));
  final String url;
  final Future<String?> Function() accessToken;
  final String? Function() owner;
  final WebSocketChannel Function(Uri) connect;
  @override
  Stream<ChatConnection> watch({int? roomId}) {
    late final StreamController<ChatConnection> output;
    WebSocketChannel? socket;
    Timer? retry, timeout;
    StreamSubscription? subscription;
    final who = owner();
    var stopped = false, attempts = 0, serial = 0, authRetrying = false;
    String? lastToken;
    late Future<void> Function() start;
    void failed([int? code]) {
      if (stopped || owner() != who || authRetrying) return;
      timeout?.cancel();
      subscription?.cancel();
      socket?.sink.close();
      if (code == 4401 || code == 4403) {
        authRetrying = true;
        unawaited(() async {
          String? token;
          try {
            token = await accessToken();
          } catch (_) {
            /* Show a safe authentication error below. */
          }
          authRetrying = false;
          if (stopped || owner() != who) return;
          if (token != null && token != lastToken) {
            attempts = 0;
            await start();
            return;
          }
          stopped = true;
          output.addError(
            const ApiFailure('채팅 인증이 만료됐어요. 다시 로그인해 주세요.', requiresLogin: true),
          );
        }());
        return;
      }
      output.add(ChatConnection.reconnecting);
      retry?.cancel();
      retry = Timer(
        Duration(seconds: [1, 2, 4, 8, 16, 30][attempts.clamp(0, 5)]),
        () {
          start();
        },
      );
      attempts++;
    }

    start = () async {
      final generation = ++serial;
      try {
        final token = await accessToken();
        if (stopped || owner() != who || generation != serial) return;
        if (token == null) {
          failed(4401);
          return;
        }
        final u = Uri.parse(url);
        if (u.userInfo.isNotEmpty ||
            u.query.isNotEmpty ||
            !['http', 'https'].contains(u.scheme)) {
          throw const ApiFailure('채팅 연결 주소를 확인해 주세요.');
        }
        socket = connect(u.replace(scheme: u.scheme == 'https' ? 'wss' : 'ws'));
        await socket!.ready;
        if (stopped || owner() != who || generation != serial) {
          await socket?.sink.close();
          return;
        }
        lastToken = token;
        socket!.sink.add(
          jsonEncode({
            'type': 'connection_init',
            'payload': {'authorization': 'Bearer $token'},
          }),
        );
        timeout = Timer(const Duration(seconds: 15), failed);
        subscription = socket!.stream.listen(
          (raw) {
            if (stopped || generation != serial || owner() != who) return;
            try {
              final frame = jsonDecode(raw as String) as Map;
              switch (frame['type']) {
                case 'connection_ack':
                  timeout?.cancel();
                  attempts = 0;
                  socket!.sink.add(
                    jsonEncode({
                      'id': 'events',
                      'type': 'subscribe',
                      'payload': {
                        'query': r'subscription Changes($roomId: Int) { chatEvents(roomId: $roomId) { kind roomId messageId } }',
                        'variables': {'roomId': ?roomId},
                      },
                    }),
                  );
                  output.add(ChatConnection.connected);
                case 'ping':
                  socket!.sink.add(
                    jsonEncode({'type': 'pong', 'payload': frame['payload']}),
                  );
                case 'next':
                  final payload = frame['payload'] as Map;
                  if ((payload['errors'] as List?)?.isNotEmpty == true) {
                    failed();
                    return;
                  }
                  output.add(ChatConnection.connected);
                case 'error':
                  stopped = true;
                  timeout?.cancel();
                  socket?.sink.close();
                  output.addError(
                    const ApiFailure('실시간 채팅을 사용할 수 없어요. 새로고침해 주세요.'),
                  );
                case 'complete':
                  failed();
              }
            } catch (_) {
              failed();
            }
          },
          onError: (Object _) => failed(),
          onDone: () => failed(socket?.closeCode),
        );
      } catch (_) {
        failed();
      }
    };
    output = StreamController<ChatConnection>(
      onListen: start,
      onCancel: () async {
        stopped = true;
        serial++;
        retry?.cancel();
        timeout?.cancel();
        await subscription?.cancel();
        await socket?.sink.close();
      },
    );
    return output.stream;
  }
}
