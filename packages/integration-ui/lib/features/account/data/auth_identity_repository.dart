import 'dart:convert';

import 'package:auth_platform_flutter/auth_platform_flutter.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'account_repository.dart';

abstract class VerifiedIdentityStore {
  int get generation;
  void invalidate();
  Future<Map<String, dynamic>?> read();
  Future<void> write(Map<String, dynamic>? value, {int? expectedGeneration});
}

class SecureVerifiedIdentityStore implements VerifiedIdentityStore {
  SecureVerifiedIdentityStore(String scope)
    : key = 'auth.identity.v1.${sha256.convert(utf8.encode(scope))}';
  final String key;
  int _generation = 0;
  @override
  int get generation => _generation;
  @override
  void invalidate() {
    _generation++;
  }

  Future<void> _tail = Future.value();
  final storage = const FlutterSecureStorage();
  @override
  Future<Map<String, dynamic>?> read() async {
    final value = await storage.read(key: key);
    return value == null ? null : Map<String, dynamic>.from(jsonDecode(value));
  }

  @override
  Future<void> write(Map<String, dynamic>? value, {int? expectedGeneration}) {
    final job = _tail.catchError((Object _) {}).then((_) async {
      if (expectedGeneration != null && generation != expectedGeneration) {
        throw const ApiFailure('로그인 계정이 변경됐어요.', requiresLogin: true);
      }
      if (value == null) {
        await storage.delete(key: key);
      } else {
        await storage.write(key: key, value: jsonEncode(value));
      }
    });
    _tail = job;
    return job;
  }
}

String idTokenDigest(String token) =>
    sha256.convert(utf8.encode(token)).toString();

class AuthIdentityRepository {
  AuthIdentityRepository({
    required this.session,
    required this.store,
    required this.issuer,
    required this.clientId,
  });
  final Future<AuthSession?> Function() session;
  final VerifiedIdentityStore store;
  final String issuer, clientId;
  Future<String> identity() async {
    final current = await session();
    final validated = await store.read();
    if (current == null ||
        validated == null ||
        validated['issuer'] != issuer ||
        validated['clientId'] != clientId ||
        validated['digest'] != idTokenDigest(current.idToken) ||
        validated['subject'] is! String) {
      throw const ApiFailure(
        '로그인 계정을 다시 확인해 주세요. 안전하게 재로그인이 필요해요.',
        requiresLogin: true,
      );
    }
    return '$issuer|${validated['subject']}';
  }
}

class VerifiedAuthSessionStore implements AuthSessionStore {
  VerifiedAuthSessionStore(this.delegate, this.identity);
  final AuthSessionStore delegate;
  final VerifiedIdentityStore identity;
  Future<void> _tail = Future.value();
  Future<T> _serial<T>(Future<T> Function() fn) {
    final f = _tail.catchError((Object _) {}).then((_) => fn());
    _tail = f.then<void>((_) {}, onError: (Object _, StackTrace _) {});
    return f;
  }

  @override
  Future<AuthSession?> read() => _serial(delegate.read);
  @override
  Future<void> write(AuthSession session) {
    final generation = identity.generation;
    return _serial(() async {
      final verified = await identity.read();
      if (generation != identity.generation ||
          verified?['digest'] != idTokenDigest(session.idToken)) {
        throw const ApiFailure(
          '로그인 응답이 변경됐어요. 다시 로그인해 주세요.',
          requiresLogin: true,
        );
      }
      await delegate.write(session);
    });
  }

  @override
  Future<void> clear() {
    identity.invalidate();
    return _serial(() async {
      await delegate.clear();
      await identity.write(null);
    });
  }
}
