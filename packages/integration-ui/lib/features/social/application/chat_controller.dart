import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../account/data/account_repository.dart';
import '../../challenge/data/challenge_vault.dart';
import '../../challenge/domain/challenge_models.dart' show uuid;
import '../data/social_repository.dart';

class ChatController extends ChangeNotifier {
  ChatController({
    required this.api,
    required this.roomId,
    required this.owner,
    this.vault,
  });
  final SocialApi api;
  final ChallengeVault? vault;
  final int roomId;
  final String? Function() owner;
  final messages = <SocialJson>[];
  SocialJson? room;
  String? error, pendingBody, pendingId;
  bool loading = true, sending = false, hasMore = false, active = true;
  var _disposed = false;
  Future<void> _tail = Future.value();
  Future<void> _serial(Future<void> Function() f) {
    final next = _tail.then((_) => f());
    _tail = next.then<void>((_) {}, onError: (Object _) {});
    return next;
  }

  bool _owns(String? who) => !_disposed && who != null && owner() == who;
  void _emit() {
    if (!_disposed) notifyListeners();
  }

  void _merge(List incoming) {
    final all = {for (final m in messages) m['id'] as int: m};
    for (final m in incoming) {
      all[m['id'] as int] = SocialJson.from(m);
    }
    messages
      ..clear()
      ..addAll(all.values);
    messages.sort((a, b) => (a['id'] as int).compareTo(b['id'] as int));
  }

  Future<void> restore() async {
    final who = owner();
    if (!_owns(who)) return;
    try {
      final saved = await vault?.read(who!, 'chat.pending.$roomId');
      if (!_owns(who)) return;
      if (saved != null) {
        pendingId = saved['id'] as String;
        pendingBody = saved['body'] as String;
        _emit();
      }
    } catch (e) {
      if (_owns(who)) {
        error = apiErrorMessage(e);
        _emit();
      }
    }
  }

  Future<void> refresh({bool older = false}) => _serial(() async {
    final who = owner();
    if (!_owns(who)) return;
    error = null;
    try {
      final detail = SocialJson.from(
        await api.call('chatRoom', {'roomId': roomId}),
      );
      var pairActive = false;
      for (var offset = 0; offset <= 10000; offset += 50) {
        final pairs =
            await api.call('myPairs', {'limit': 50, 'offset': offset}) as List;
        if (!_owns(who)) return;
        if (pairs.any((p) => p['id'] == detail['pairId'])) {
          pairActive = true;
          break;
        }
        if (pairs.length < 50) break;
      }
      final initial = messages.isEmpty;
      final page = SocialJson.from(
        await api.call('chatMessages', {
          'roomId': roomId,
          'cursor': {
            'limit': 50,
            if (messages.isNotEmpty)
              (older ? 'before' : 'after'): older
                  ? messages.first['id']
                  : messages.last['id'],
          },
        }),
      );
      if (!_owns(who)) return;
      room = detail;
      active = pairActive;
      _merge(page['messages'] as List);
      if (older || initial) hasMore = page['hasMore'] == true;
      // Drain newer cursors after a reconnect rather than losing >50 messages.
      if (!older && !initial) {
        var more = page['hasMore'] == true;
        while (more && _owns(who)) {
          final next = SocialJson.from(
            await api.call('chatMessages', {
              'roomId': roomId,
              'cursor': {'limit': 100, 'after': messages.last['id']},
            }),
          );
          if (!_owns(who)) return;
          final batch = next['messages'] as List;
          if (batch.isEmpty) break;
          _merge(batch);
          more = next['hasMore'] == true;
        }
      }
      if (messages.isNotEmpty &&
          messages.last['id'] > detail['lastReadMessageId']) {
        await api.call('markChatRead', {
          'roomId': roomId,
          'messageId': messages.last['id'],
        });
      }
    } catch (e) {
      if (_owns(who)) error = apiErrorMessage(e);
    } finally {
      if (_owns(who)) {
        loading = false;
        _emit();
      }
    }
  });
  Future<bool> send(String body) async {
    if (sending || !active || _disposed) return false;
    final text = body.trim();
    if (text.isEmpty || text.length > 2000) {
      error = '메시지는 1~2000자로 입력해 주세요.';
      _emit();
      return false;
    }
    if (pendingBody != null && text != pendingBody) {
      error = '전송 결과를 먼저 확인하거나 같은 메시지를 재시도해 주세요.';
      _emit();
      return false;
    }
    final who = owner();
    if (!_owns(who)) return false;
    pendingBody = text;
    pendingId ??= uuid();
    sending = true;
    error = null;
    _emit();
    try {
      await vault?.write(who!, 'chat.pending.$roomId', {
        'id': pendingId,
        'body': pendingBody,
      });
      if (!_owns(who)) return false;
      final message = await api.call('sendChatMessage', {
        'input': {'roomId': roomId, 'body': text, 'clientMessageId': pendingId},
      });
      if (!_owns(who)) return false;
      _merge([message]);
      await vault?.write(who!, 'chat.pending.$roomId', null);
      if (!_owns(who)) return false;
      pendingBody = null;
      pendingId = null;
      return true;
    } catch (e) {
      if (_owns(who)) error = apiErrorMessage(e);
      return false;
    } finally {
      if (_owns(who)) {
        sending = false;
        _emit();
      }
    }
  }

  @override
  void dispose() {
    _disposed = true;
    pendingBody = null;
    pendingId = null;
    messages.clear();
    super.dispose();
  }
}
