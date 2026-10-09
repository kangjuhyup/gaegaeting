import 'dart:math';
import 'dart:convert';

import 'package:auth_platform_flutter/auth_platform_flutter.dart';
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:dio/dio.dart';
import 'package:jose/jose.dart';

import 'account_repository.dart';
import 'auth_identity_repository.dart';

class IdTokenValidator {
  IdTokenValidator({
    required this.dio,
    required this.config,
    required this.store,
    DateTime Function()? now,
  }) : now = now ?? DateTime.now;
  final Dio dio;
  final AuthClientConfig config;
  final VerifiedIdentityStore store;
  final DateTime Function() now;
  Future<void> validate(
    String token, {
    required String nonce,
    String? previousSubject,
    bool refresh = false,
    int? expectedGeneration,
  }) async {
    final generation = expectedGeneration ?? store.generation;
    try {
      final discovery = await dio.get<Map<String, dynamic>>(
        config.discoveryUrl.toString(),
        options: Options(followRedirects: false),
      );
      final metadata = discovery.data!;
      final source = config.issuer;
      final jwks = Uri.parse(metadata['jwks_uri'] as String);
      if (metadata['issuer'] != source.toString() ||
          jwks.origin != source.origin ||
          jwks.userInfo.isNotEmpty ||
          (jwks.scheme != 'https' && !config.allowInsecureConnections)) {
        throw const FormatException('issuer');
      }
      final response = await dio.get<Map<String, dynamic>>(
        jwks.toString(),
        options: Options(followRedirects: false),
      );
      final keys = JsonWebKeyStore()
        ..addKeySet(JsonWebKeySet.fromJson(response.data!));
      final jws = JsonWebSignature.fromCompactSerialization(token);
      final header = jws.commonProtectedHeader.toJson();
      if (['jku', 'jwk', 'x5u', 'x5c'].any(header.containsKey)) {
        throw const FormatException('untrusted key reference');
      }
      final allowed = metadata['id_token_signing_alg_values_supported'];
      if (allowed is List && !allowed.contains(header['alg'])) {
        throw const FormatException('algorithm');
      }
      final claims = Map<String, dynamic>.from(
        (await jws.getPayload(
          keys,
          allowedAlgorithms: const ['RS256', 'ES256'],
        )).jsonContent,
      );
      final audience = claims['aud'];
      final audiences = audience is String
          ? [audience]
          : audience is List
          ? audience
          : [];
      final seconds = now().toUtc().millisecondsSinceEpoch ~/ 1000;
      if (claims['iss'] != source.toString() ||
          claims['sub'] is! String ||
          (claims['sub'] as String).isEmpty ||
          !audiences.contains(config.clientId) ||
          (audiences.length > 1 && claims['azp'] != config.clientId) ||
          (claims['azp'] != null && claims['azp'] != config.clientId) ||
          claims['exp'] is! num ||
          (claims['exp'] as num) <= seconds ||
          claims['iat'] is! num ||
          (claims['iat'] as num) > seconds + 120 ||
          (claims['nbf'] is num && (claims['nbf'] as num) > seconds) ||
          (!refresh && claims['nonce'] != nonce) ||
          (refresh && claims['nonce'] != null && claims['nonce'] != nonce) ||
          (previousSubject != null && previousSubject != claims['sub'])) {
        throw const FormatException('claims');
      }
      await store.write({
        'issuer': source.toString(),
        'subject': claims['sub'],
        'clientId': config.clientId,
        'nonce': nonce,
        'digest': idTokenDigest(token),
      }, expectedGeneration: generation);
    } catch (_) {
      throw const ApiFailure(
        '로그인 응답의 신원을 확인하지 못했어요. 다시 로그인해 주세요.',
        requiresLogin: true,
      );
    }
  }
}

class VerifiedAppAuthDriver implements AppAuthDriver {
  VerifiedAppAuthDriver({required this.validator, AppAuthDriver? delegate})
    : delegate = delegate ?? const FlutterAppAuthDriver();
  final IdTokenValidator validator;
  final AppAuthDriver delegate;
  @override
  Future<AuthorizationTokenResponse> authorizeAndExchangeCode(
    AuthorizationTokenRequest request,
  ) async {
    validator.store.invalidate();
    final generation = validator.store.generation;
    await validator.store.write(null, expectedGeneration: generation);
    // OIDC offline access needs consent in the authorization request; showing
    // consent later does not make the issuer retain offline_access retroactively.
    if (request.scopes?.contains('offline_access') == true &&
        request.promptValues?.contains('none') != true) {
      request.promptValues = {...?request.promptValues, 'consent'}.toList();
    }
    final r = Random.secure();
    request.nonce = base64UrlEncode(List.generate(32, (_) => r.nextInt(256)))
        .replaceAll('=', '');
    final result = await delegate.authorizeAndExchangeCode(request);
    if (result.idToken == null) {
      throw const ApiFailure('로그인 응답을 확인해 주세요.', requiresLogin: true);
    }
    await validator.validate(
      result.idToken!,
      nonce: request.nonce!,
      expectedGeneration: generation,
    );
    return result;
  }

  @override
  Future<TokenResponse> token(TokenRequest request) async {
    final generation = validator.store.generation;
    final identity = await validator.store.read();
    if (identity == null) {
      throw const ApiFailure('기존 로그인을 다시 확인해 주세요.', requiresLogin: true);
    }
    final result = await delegate.token(request);
    if (generation != validator.store.generation) {
      throw const ApiFailure('로그인 계정이 변경됐어요.', requiresLogin: true);
    }
    if (result.idToken != null) {
      await validator.validate(
        result.idToken!,
        nonce: identity['nonce'],
        previousSubject: identity['subject'],
        refresh: true,
        expectedGeneration: generation,
      );
    }
    return result;
  }

  @override
  Future<void> endSession(EndSessionRequest request) =>
      delegate.endSession(request);
}
