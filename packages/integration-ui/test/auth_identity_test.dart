import 'dart:async';

import 'package:auth_platform_flutter/auth_platform_flutter.dart';
import 'package:dio/dio.dart';
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gaegaeting/core/config/app_config.dart';
import 'package:gaegaeting/features/account/application/api_session.dart';
import 'package:jose/jose.dart';
import 'package:gaegaeting/features/account/data/auth_identity_repository.dart';
import 'package:gaegaeting/features/account/data/verified_appauth_driver.dart';
import 'package:gaegaeting/features/account/data/account_repository.dart';
import 'package:gaegaeting/features/challenge/data/challenge_repository.dart';
import 'package:gaegaeting/core/network/gateway_api.dart';
import 'package:gaegaeting/features/challenge/domain/challenge_models.dart';

class MemoryIdentityStore implements VerifiedIdentityStore {
  Map<String, dynamic>? value;
  int _generation = 0;
  @override
  int get generation => _generation;
  @override
  void invalidate() {
    _generation++;
  }

  @override
  Future<Map<String, dynamic>?> read() async => value;
  @override
  Future<void> write(Map<String, dynamic>? v, {int? expectedGeneration}) async {
    if (expectedGeneration != null && expectedGeneration != generation) {
      throw const ApiFailure('changed');
    }
    value = v;
  }
}

class MemorySessionStore implements AuthSessionStore {
  AuthSession? value;
  @override
  Future<AuthSession?> read() async => value;
  @override
  Future<void> write(AuthSession session) async {
    value = session;
  }

  @override
  Future<void> clear() async {
    value = null;
  }
}

class RefreshDriver implements AppAuthDriver {
  RefreshDriver(this.response);
  final Future<TokenResponse> Function() response;
  Future<AuthorizationTokenResponse> Function(AuthorizationTokenRequest)?
  authorize;
  @override
  Future<TokenResponse> token(TokenRequest request) => response();
  @override
  Future<AuthorizationTokenResponse> authorizeAndExchangeCode(
    AuthorizationTokenRequest request,
  ) => authorize!(request);
  @override
  Future<void> endSession(EndSessionRequest request) async {}
}

class ControlledRevoker implements TokenRevoker {
  final entered = Completer<void>(), gate = Completer<void>();
  @override
  Future<void> revoke(
    AuthClientConfig config,
    String token,
    TokenTypeHint hint,
  ) async {
    if (!entered.isCompleted) entered.complete();
    await gate.future;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final key = JsonWebKey.generate('RS256', keyBitLength: 2048);
  const issuer = 'https://auth.example.test/t/dev/oidc';
  final now = DateTime.utc(2026, 10, 5, 12);
  final seconds = now.millisecondsSinceEpoch ~/ 1000;
  Map<String, dynamic> claims() => {
    'iss': issuer,
    'sub': 'subject-a',
    'aud': 'mobile',
    'exp': seconds + 3600,
    'iat': seconds,
    'nonce': 'nonce-fixture',
  };
  String sign(Map<String, dynamic> value, {JsonWebKey? signer}) {
    final builder = JsonWebSignatureBuilder()..jsonContent = value;
    builder.addRecipient(signer ?? key, algorithm: 'RS256');
    return builder.build().toCompactSerialization();
  }

  IdTokenValidator validator(MemoryIdentityStore store) {
    final dio = Dio();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (o, h) => h.resolve(
          Response(
            requestOptions: o,
            data: o.path.contains('well-known')
                ? {'issuer': issuer, 'jwks_uri': '$issuer/jwks'}
                : {
                    'keys': [key.toJson()],
                  },
          ),
        ),
      ),
    );
    return IdTokenValidator(
      dio: dio,
      config: AuthClientConfig(
        issuer: Uri.parse(issuer),
        clientId: 'mobile',
        redirectUri: Uri.parse('app.gaegaeting:/oauth/callback'),
        resource: Uri.parse('https://gateway.example.test'),
        scopes: const ['openid'],
      ),
      store: store,
      now: () => now,
    );
  }

  test('offline access 로그인은 consent를 요청하고 검증된 갱신 세션을 받는다', () async {
    final ids = MemoryIdentityStore();
    AuthorizationTokenRequest? sent;
    final delegate = RefreshDriver(() async => throw UnimplementedError())
      ..authorize = ((request) async {
        sent = request;
        return AuthorizationTokenResponse(
          'opaque-access',
          'refresh-fixture',
          now.add(const Duration(hours: 1)),
          sign(claims()..['nonce'] = request.nonce),
          'Bearer',
          request.scopes,
          null,
          null,
        );
      });
    final gateway = AppAuthAuthorizationGateway(
      driver: VerifiedAppAuthDriver(
        validator: validator(ids),
        delegate: delegate,
      ),
    );
    final session = await gateway.authorize(
      AuthClientConfig(
        issuer: Uri.parse(issuer),
        clientId: 'mobile',
        redirectUri: Uri.parse('app.gaegaeting:/oauth/callback'),
        resource: Uri.parse('https://gateway.example.test'),
        scopes: const ['openid', 'offline_access', 'account:read'],
      ),
    );
    expect(sent!.promptValues, contains('consent'));
    expect(
      sent!.additionalParameters!['resource'],
      'https://gateway.example.test',
    );
    expect(sent!.scopes, contains('account:read'));
    expect(session.refreshToken, 'refresh-fixture');
    expect(ids.value!['subject'], 'subject-a');
  });

  test(
    'JWKS 서명과 issuer·audience·expiry·nonce를 검증한 ID token의 신원만 저장한다',
    () async {
      final store = MemoryIdentityStore();
      final token = sign(claims());
      await validator(store).validate(token, nonce: 'nonce-fixture');
      final session = AuthSession(
        accessToken: 'opaque-fixture',
        refreshToken: null,
        idToken: token,
        accessTokenExpiresAt: now.add(const Duration(hours: 1)),
        scopes: const ['openid'],
      );
      final repo = AuthIdentityRepository(
        session: () async => session,
        store: store,
        issuer: issuer,
        clientId: 'mobile',
      );
      expect(await repo.identity(), '$issuer|subject-a');
    },
  );
  for (final edit in ['issuer', 'audience', 'expired', 'nonce', 'subject']) {
    test('ID token의 $edit 검증이 실패하면 로그인 신원과 세션을 만들지 않는다', () async {
      final value = claims();
      switch (edit) {
        case 'issuer':
          value['iss'] = 'https://wrong.example';
        case 'audience':
          value['aud'] = 'wrong-client';
        case 'expired':
          value['exp'] = seconds;
        case 'nonce':
          value['nonce'] = 'wrong';
        case 'subject':
          value['sub'] = '';
      }
      final store = MemoryIdentityStore();
      await expectLater(
        validator(store).validate(sign(value), nonce: 'nonce-fixture'),
        throwsA(isA<ApiFailure>()),
      );
      expect(store.value, isNull);
    });
  }
  test('신뢰하지 않는 키로 서명한 ID token을 거절한다', () async {
    final store = MemoryIdentityStore();
    final other = JsonWebKey.generate('RS256', keyBitLength: 2048);
    await expectLater(
      validator(store)
          .validate(sign(claims(), signer: other), nonce: 'nonce-fixture'),
      throwsA(isA<ApiFailure>()),
    );
    expect(store.value, isNull);
  });
  test('검증된 로그인 기록과 ID token이 달라지면 재로그인이 필요하다', () async {
    final store = MemoryIdentityStore();
    await validator(store).validate(sign(claims()), nonce: 'nonce-fixture');
    final session = AuthSession(
      accessToken: 'opaque-fixture',
      refreshToken: null,
      idToken: 'unvalidated-fixture',
      accessTokenExpiresAt: now.add(const Duration(hours: 1)),
      scopes: const ['openid'],
    );
    await expectLater(
      AuthIdentityRepository(
        session: () async => session,
        store: store,
        issuer: issuer,
        clientId: 'mobile',
      ).identity(),
      throwsA(isA<ApiFailure>()),
    );
  });
  test('refresh ID token은 같은 subject를 유지해야 한다', () async {
    final store = MemoryIdentityStore();
    final value = claims()..['sub'] = 'subject-b';
    await expectLater(
      validator(store).validate(
        sign(value),
        nonce: 'nonce-fixture',
        refresh: true,
        previousSubject: 'subject-a',
      ),
      throwsA(isA<ApiFailure>()),
    );
  });
  AuthSession sessionFor(String token) => AuthSession(
    accessToken: 'opaque-fixture',
    refreshToken: null,
    idToken: token,
    accessTokenExpiresAt: now.add(const Duration(hours: 1)),
    scopes: const ['openid'],
  );
  test('검증된 세션은 재시작 후 같은 issuer와 subject로 복원된다', () async {
    final ids = MemoryIdentityStore();
    final token = sign(claims());
    await validator(ids).validate(token, nonce: 'nonce-fixture');
    final sessions = MemorySessionStore();
    await VerifiedAuthSessionStore(sessions, ids).write(sessionFor(token));
    final restarted = VerifiedAuthSessionStore(sessions, ids);
    expect(
      await AuthIdentityRepository(
        session: restarted.read,
        store: ids,
        issuer: issuer,
        clientId: 'mobile',
      ).identity(),
      '$issuer|subject-a',
    );
  });
  test('로그아웃 중 도착한 이전 ID token 검증은 신원을 다시 저장하지 않는다', () async {
    final ids = MemoryIdentityStore();
    final generation = ids.generation;
    final sessions = MemorySessionStore();
    await VerifiedAuthSessionStore(sessions, ids).clear();
    await expectLater(
      validator(ids).validate(
        sign(claims()),
        nonce: 'nonce-fixture',
        expectedGeneration: generation,
      ),
      throwsA(isA<ApiFailure>()),
    );
    expect(ids.value, isNull);
    expect(sessions.value, isNull);
  });
  test('새 계정 로그인 후 이전 세션 write는 저장되지 않는다', () async {
    final ids = MemoryIdentityStore();
    final a = sign(claims());
    final b = sign(claims()..['sub'] = 'subject-b');
    await validator(ids).validate(a, nonce: 'nonce-fixture');
    final sessions = MemorySessionStore();
    final wrapper = VerifiedAuthSessionStore(sessions, ids);
    await wrapper.clear();
    await validator(ids).validate(b, nonce: 'nonce-fixture');
    await wrapper.write(sessionFor(b));
    await expectLater(wrapper.write(sessionFor(a)), throwsA(isA<ApiFailure>()));
    expect(sessions.value!.idToken, b);
  });
  for (final withId in [false, true]) {
    test(
      'refresh ID token ${withId ? '있음' : '없음'}에도 검증 신원과 digest를 유지한다',
      () async {
        final ids = MemoryIdentityStore();
        final old = sign(claims());
        await validator(ids).validate(old, nonce: 'nonce-fixture');
        final next = withId ? sign(claims()..remove('nonce')) : null;
        final driver = VerifiedAppAuthDriver(
          validator: validator(ids),
          delegate: RefreshDriver(
            () async => TokenResponse(
              'opaque-new',
              null,
              now.add(const Duration(hours: 1)),
              next,
              'Bearer',
              null,
              null,
            ),
          ),
        );
        await driver.token(
          TokenRequest(
            'mobile',
            'app.gaegaeting:/oauth/callback',
            issuer: issuer,
          ),
        );
        expect(ids.value!['subject'], 'subject-a');
        expect(ids.value!['digest'], idTokenDigest(next ?? old));
      },
    );
  }
  test('로그아웃 후 늦게 도착한 authorize 응답은 세션과 신원을 복원하지 않는다', () async {
    final ids = MemoryIdentityStore();
    final gate = Completer<AuthorizationTokenResponse>();
    final entered = Completer<AuthorizationTokenRequest>();
    final delegate = RefreshDriver(() async => throw UnimplementedError())
      ..authorize = ((request) {
        entered.complete(request);
        return gate.future;
      });
    final driver = VerifiedAppAuthDriver(
      validator: validator(ids),
      delegate: delegate,
    );
    final result = driver.authorizeAndExchangeCode(
      AuthorizationTokenRequest(
        'mobile',
        'app.gaegaeting:/oauth/callback',
        issuer: issuer,
      ),
    );
    final rejected = expectLater(result, throwsA(isA<ApiFailure>()));
    final request = await entered.future;
    final sessions = MemorySessionStore();
    await VerifiedAuthSessionStore(sessions, ids).clear();
    gate.complete(
      AuthorizationTokenResponse(
        'opaque',
        null,
        now.add(const Duration(hours: 1)),
        sign(claims()..['nonce'] = request.nonce),
        'Bearer',
        null,
        null,
        null,
      ),
    );
    await rejected;
    expect(ids.value, isNull);
    expect(sessions.value, isNull);
  });
  test('로그아웃 후 늦게 도착한 refresh 응답은 거절된다', () async {
    final ids = MemoryIdentityStore();
    await validator(ids).validate(sign(claims()), nonce: 'nonce-fixture');
    final gate = Completer<TokenResponse>();
    final entered = Completer<void>();
    final driver = VerifiedAppAuthDriver(
      validator: validator(ids),
      delegate: RefreshDriver(() {
        entered.complete();
        return gate.future;
      }),
    );
    final result = driver.token(
      TokenRequest('mobile', 'app.gaegaeting:/oauth/callback', issuer: issuer),
    );
    final rejected = expectLater(result, throwsA(isA<ApiFailure>()));
    await entered.future;
    await VerifiedAuthSessionStore(MemorySessionStore(), ids).clear();
    gate.complete(
      TokenResponse(
        'opaque-new',
        null,
        now,
        sign(claims()),
        'Bearer',
        null,
        null,
      ),
    );
    await rejected;
    expect(ids.value, isNull);
  });
  test('키 회전 후 검증은 JWKS를 다시 조회한다', () async {
    final ids = MemoryIdentityStore();
    final rotated = JsonWebKey.generate('RS256', keyBitLength: 2048);
    var active = key;
    var jwksReads = 0;
    final dio = Dio();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (o, h) {
          final discovery = o.path.contains('well-known');
          if (!discovery) jwksReads++;
          h.resolve(
            Response(
              requestOptions: o,
              data: discovery
                  ? {'issuer': issuer, 'jwks_uri': '$issuer/jwks'}
                  : {
                      'keys': [active.toJson()],
                    },
            ),
          );
        },
      ),
    );
    final v = IdTokenValidator(
      dio: dio,
      config: validator(ids).config,
      store: ids,
      now: () => now,
    );
    await v.validate(sign(claims()), nonce: 'nonce-fixture');
    active = rotated;
    await v.validate(sign(claims(), signer: rotated), nonce: 'nonce-fixture');
    expect(jwksReads, 2);
    dio.close();
  });
  test('앱 로그아웃 시작이 원격 revoke 완료 전에 신원을 무효화하고 늦은 로그인·중복 탭을 차단한다', () async {
    final ids = MemoryIdentityStore();
    final old = sign(claims());
    await validator(ids).validate(old, nonce: 'nonce-fixture');
    final sessions = MemorySessionStore()..value = sessionFor(old);
    final gate = Completer<AuthorizationTokenResponse>();
    final entered = Completer<AuthorizationTokenRequest>();
    final delegate = RefreshDriver(() async => throw UnimplementedError())
      ..authorize = ((request) {
        entered.complete(request);
        return gate.future;
      });
    final revoker = ControlledRevoker();
    final client = AuthClient(
      config: validator(ids).config,
      authorizationGateway: AppAuthAuthorizationGateway(
        driver: VerifiedAppAuthDriver(
          validator: validator(ids),
          delegate: delegate,
        ),
      ),
      sessionStore: VerifiedAuthSessionStore(sessions, ids),
      tokenRevoker: revoker,
    );
    final container = ProviderContainer(
      overrides: [
        appConfigProvider.overrideWithValue(
          const AppConfig(gatewayGraphqlUrl: 'https://gateway.example.test'),
        ),
        authClientProvider.overrideWithValue(client),
        verifiedIdentityStoreProvider.overrideWithValue(ids),
      ],
    );
    addTearDown(container.dispose);
    await container.read(apiSessionProvider.future);
    final api = container.read(apiSessionProvider.notifier);
    final login = api.signIn();
    final rejected = expectLater(login, throwsA(isA<ApiFailure>()));
    final request = await entered.future;
    await expectLater(api.signIn(), throwsA(isA<ApiFailure>()));
    final before = ids.generation;
    final logout = api.signOut();
    expect(ids.generation, greaterThan(before));
    await revoker.entered.future;
    gate.complete(
      AuthorizationTokenResponse(
        'opaque-new',
        null,
        now.add(const Duration(hours: 1)),
        sign(claims()..['nonce'] = request.nonce),
        'Bearer',
        null,
        null,
        null,
      ),
    );
    await rejected;
    expect(ids.value, isNull);
    expect(container.read(apiSessionProvider).asData!.value, isNull);
    revoker.gate.complete();
    await logout;
    expect(sessions.value, isNull);
  });
  test('원격 revoke 중 기존 SDK 세션이 남아 있어도 reload가 로그아웃 계정을 복원하지 않는다', () async {
    final ids = MemoryIdentityStore();
    final old = sign(claims());
    await validator(ids).validate(old, nonce: 'nonce-fixture');
    final sessions = MemorySessionStore()..value = sessionFor(old);
    final revoker = ControlledRevoker();
    final wrapper = VerifiedAuthSessionStore(sessions, ids);
    final client = AuthClient(
      config: validator(ids).config,
      authorizationGateway: AppAuthAuthorizationGateway(
        driver: RefreshDriver(() async => throw UnimplementedError()),
      ),
      sessionStore: wrapper,
      tokenRevoker: revoker,
    );
    final container = ProviderContainer(
      overrides: [
        appConfigProvider.overrideWithValue(
          const AppConfig(gatewayGraphqlUrl: 'https://gateway.example.test'),
        ),
        authClientProvider.overrideWithValue(client),
        verifiedIdentityStoreProvider.overrideWithValue(ids),
        authIdentityRepositoryProvider.overrideWithValue(
          AuthIdentityRepository(
            session: wrapper.read,
            store: ids,
            issuer: issuer,
            clientId: 'mobile',
          ),
        ),
      ],
    );
    addTearDown(container.dispose);
    await container.read(apiSessionProvider.future);
    final api = container.read(apiSessionProvider.notifier);
    final logout = api.signOut();
    await revoker.entered.future;
    expect(sessions.value, isNotNull);
    await expectLater(
      api.reload(),
      throwsA(
        isA<ApiFailure>().having(
          (e) => e.message,
          'logout message',
          contains('로그아웃'),
        ),
      ),
    );
    expect(container.read(apiSessionProvider).asData!.value, isNull);
    revoker.gate.complete();
    await logout;
    expect(sessions.value, isNull);
  });
  test('프로필 없는 두 계정 사이에 지연된 이전 참여 응답은 새 계정에 반영하지 않는다', () async {
    String? identity = '$issuer|subject-a';
    final gate = Completer<void>();
    final requested = Completer<void>();
    final dio = Dio();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (o, h) async {
          requested.complete();
          await gate.future;
          h.resolve(
            Response(
              requestOptions: o,
              data: {
                'data': {'myChallenges': []},
              },
            ),
          );
        },
      ),
    );
    final repo = ChallengeRepository(
      gateway: GatewayApi(dio, baseUrl: 'https://gateway.example.test/graphql'),
      accessToken: () async => 'opaque',
      owner: () => identity,
    );
    final result = repo.call('myChallenges', {'limit': 50});
    final rejected = expectLater(result, throwsA(isA<ChallengeFailure>()));
    await requested.future;
    identity = '$issuer|subject-b';
    gate.complete();
    await rejected;
    dio.close();
  });
}
