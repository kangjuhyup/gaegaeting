import 'package:dio/dio.dart';
import 'package:auth_platform_flutter/auth_platform_flutter.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/core/network/gateway_api.dart';
import 'package:gaegaeting/features/payment/data/payment_repository.dart';
import 'package:gaegaeting/features/payment/domain/payment_models.dart';

void main() {
  late Dio dio;
  setUp(() => dio = Dio());
  tearDown(() => dio.close());
  test('결제 요청은 만료된 Auth 세션을 기존 SDK로 갱신하고 회전된 세션을 저장한다', () async {
    final now = DateTime.utc(2026, 10, 5);
    final session = _TestSessionStore(
      AuthSession(
        accessToken: 'synthetic-expired',
        refreshToken: 'synthetic-refresh',
        idToken: 'synthetic-id',
        accessTokenExpiresAt: now.subtract(const Duration(minutes: 1)),
        scopes: const ['payment:read', 'payment:write'],
      ),
    );
    final authorization = _TestAuthorization(now);
    final auth = AuthClient(
      config: AuthClientConfig(
        issuer: Uri.parse('https://example.test/t/dev/oidc'),
        clientId: 'test-native',
        resource: Uri.parse('https://example.test'),
        redirectUri: Uri.parse('app.gaegaeting:/oauth/callback'),
      ),
      authorizationGateway: authorization,
      sessionStore: session,
      tokenRevoker: _TestRevoker(),
      now: () => now,
    );
    final sent = <String>[];
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          sent.add(options.headers['Authorization'] as String);
          handler.resolve(
            Response(
              requestOptions: options,
              statusCode: 200,
              data: {
                'data': {
                  'mySnackWallet': {
                    'balance': 0,
                    'availableBalance': 0,
                    'frozen': false,
                  },
                },
              },
            ),
          );
        },
      ),
    );
    final api = PaymentRepository(
      gateway: GatewayApi(dio),
      accessToken: auth.accessToken,
    );
    await api.wallet();
    await api.wallet();
    expect(sent, ['Bearer synthetic-refreshed', 'Bearer synthetic-refreshed']);
    expect(authorization.refreshes, 1);
    expect(session.value!.refreshToken, 'synthetic-rotated');
  });
  test('구매 확정은 기존 Gateway에 증거와 준비 ID만 보내고 현재 세션 토큰을 매번 얻는다', () async {
    final requests = <RequestOptions>[];
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          requests.add(options);
          handler.resolve(
            Response(
              requestOptions: options,
              statusCode: 200,
              data: {
                'data': {
                  'confirmSnackPurchase': {
                    'id': 'test-payment',
                    'state': 'PURCHASED',
                    'snackQuantity': 10,
                  },
                },
              },
            ),
          );
        },
      ),
    );
    var tokenRequests = 0;
    final api = PaymentRepository(
      gateway: GatewayApi(dio, baseUrl: 'https://example.test/gateway/graphql'),
      accessToken: () async => 'synthetic-session-${++tokenRequests}',
    );
    await api.confirm('test-intent', 'synthetic-test-proof');
    await api.confirm('test-intent', 'synthetic-test-proof');
    expect(
      requests.first.uri.toString(),
      'https://example.test/gateway/graphql',
    );
    expect((requests.first.data as Map)['variables'], {
      'input': {'preparedId': 'test-intent', 'proof': 'synthetic-test-proof'},
    });
    expect(
      requests.first.headers['Authorization'],
      'Bearer synthetic-session-1',
    );
    expect(
      requests.last.headers['Authorization'],
      'Bearer synthetic-session-2',
    );
    expect(dio.options.headers, isNot(contains('Authorization')));
  });
  test('만료된 세션은 전송 전에 로그인을 요구한다', () async {
    final api = PaymentRepository(
      gateway: GatewayApi(dio),
      accessToken: () async => null,
    );
    await expectLater(
      api.wallet(),
      throwsA(
        isA<PaymentFailure>().having((e) => e.requiresLogin, '로그인 필요', true),
      ),
    );
  });
  for (final status in [401, 403]) {
    test('HTTP $status 오류는 토큰이나 응답 원문 대신 재로그인을 안내한다', () async {
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) => handler.reject(
            DioException(
              requestOptions: options,
              response: Response(
                requestOptions: options,
                statusCode: status,
                data: 'synthetic-private-payload',
              ),
              type: DioExceptionType.badResponse,
            ),
          ),
        ),
      );
      final api = PaymentRepository(
        gateway: GatewayApi(dio),
        accessToken: () async => 'synthetic-session',
      );
      await expectLater(
        api.wallet(),
        throwsA(
          isA<PaymentFailure>()
              .having((e) => e.requiresLogin, '재로그인', true)
              .having(
                (e) => e.message.contains('synthetic-private-payload'),
                '원문 비노출',
                false,
              ),
        ),
      );
    });
  }
  test('HTTP 200의 검증 오류와 부분 성공 응답도 성공으로 취급하지 않는다', () async {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) => handler.resolve(
          Response(
            requestOptions: options,
            statusCode: 200,
            data: {
              'data': {
                'confirmSnackPurchase': {
                  'id': 'test-payment',
                  'state': 'PURCHASED',
                  'snackQuantity': 10,
                },
              },
              'errors': [
                {
                  'message': 'synthetic-private-payload',
                  'extensions': {'code': 'INVALID_PROOF'},
                },
              ],
            },
          ),
        ),
      ),
    );
    final api = PaymentRepository(
      gateway: GatewayApi(dio),
      accessToken: () async => 'synthetic-session',
    );
    await expectLater(
      api.confirm('test-intent', 'synthetic-test-proof'),
      throwsA(
        isA<PaymentFailure>()
            .having((e) => e.code, '검증 오류', 'INVALID_PROOF')
            .having(
              (e) => e.message.contains('synthetic-private-payload'),
              '원문 비노출',
              false,
            ),
      ),
    );
  });
}

class _TestSessionStore implements AuthSessionStore {
  _TestSessionStore(this.value);
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

class _TestAuthorization implements AuthorizationGateway {
  _TestAuthorization(this.now);
  final DateTime now;
  int refreshes = 0;
  @override
  Future<AuthTokenResponse> authorize(AuthClientConfig config) async =>
      throw UnimplementedError();
  @override
  Future<void> endSession(AuthClientConfig config, String idToken) async {}
  @override
  Future<AuthTokenResponse> refresh(
    AuthClientConfig config,
    String refreshToken,
  ) async {
    refreshes++;
    return AuthTokenResponse(
      accessToken: 'synthetic-refreshed',
      refreshToken: 'synthetic-rotated',
      accessTokenExpiresAt: now.add(const Duration(hours: 1)),
    );
  }
}

class _TestRevoker implements TokenRevoker {
  @override
  Future<void> revoke(
    AuthClientConfig config,
    String token,
    TokenTypeHint hint,
  ) async {}
}
