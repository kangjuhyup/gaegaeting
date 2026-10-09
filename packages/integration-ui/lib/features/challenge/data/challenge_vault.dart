import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../domain/challenge_models.dart';

abstract class ChallengeVault {
  Future<Json?> read(String owner, String key);
  Future<void> write(String owner, String key, Json? value);
}

class SecureChallengeVault implements ChallengeVault {
  const SecureChallengeVault([this.storage = const FlutterSecureStorage()]);
  final FlutterSecureStorage storage;
  String _key(String owner, String key) =>
      'challenge.v1.${sha256.convert(utf8.encode(owner))}.$key';
  @override
  Future<Json?> read(String owner, String key) async {
    final text = await storage.read(key: _key(owner, key));
    if (text == null) return null;
    try {
      return json(jsonDecode(text));
    } catch (_) {
      throw const ChallengeFailure('저장된 기록을 읽지 못했어요. 삭제하지 않고 보존했어요.');
    }
  }

  @override
  Future<void> write(String owner, String key, Json? value) async {
    if (value == null) {
      await storage.delete(key: _key(owner, key));
    } else {
      await storage.write(key: _key(owner, key), value: jsonEncode(value));
    }
  }
}
