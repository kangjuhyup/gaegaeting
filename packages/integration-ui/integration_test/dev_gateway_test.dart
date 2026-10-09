import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:gaegaeting/app/gaegaeting_app.dart';
import 'package:gaegaeting/core/config/app_config.dart';
import 'package:gaegaeting/core/network/gateway_api.dart';
import 'package:gaegaeting/core/network/graphql_models.dart';
import 'package:gaegaeting/features/account/application/api_session.dart';
import 'package:gaegaeting/features/account/data/account_repository.dart';
import 'package:gaegaeting/features/account/data/profile_repository.dart';
import 'package:gaegaeting/features/challenge/data/challenge_repository.dart';
import 'package:gaegaeting/features/social/data/social_repository.dart';

// Explicit, development-only, read-only device probe. No fixtures, injected
// identity, internal assertion, or token in a dart-define. A real native session
// must already exist in this app's secure store for authenticated checks.
class _Read {
  const _Read(this.name, this.query, [this.variables = const {}]);
  final String name, query;
  final Map<String, dynamic> variables;
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('실제 개발 Gateway의 인증 경계와 저장된 native 세션 조회를 확인한다', (tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final config = container.read(appConfigProvider);
    expect(config.apiEnabled, isTrue);
    expect(config.storePurchasesEnabled, isFalse);
    expect(
      config.gatewayGraphqlUrl,
      'https://test-ggt-api.rvkang.app/gateway/graphql',
    );
    expect(config.oidcIssuer, 'https://auth.rvkang.app/t/gaegaeting-dev/oidc');
    expect(config.oidcClientId, 'gaegaeting-mobile');

    final report = <String, dynamic>{
      'checkedAt': DateTime.now().toUtc().toIso8601String(),
      'mode': 'live-development-device',
      'fixtures': false,
      'mutationsExecuted': 0,
      'storeSdkExecuted': false,
      'nativeSessionAvailable': false,
      'nativeIdentityVerified': false,
      'readResults': <Map<String, dynamic>>[],
      'writeFlows': 'not_executed',
    };
    binding.reportData = report;
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const GaegaetingApp(),
      ),
    );
    // Wait for real secure-storage session restoration, not a fixed fake login.
    await tester.runAsync(() async {
      try {
        await container.read(apiSessionProvider.future);
      } catch (_) {
        report['sessionRestore'] = 'failed';
      }
    });
    await tester.pumpAndSettle();

    String? token;
    await tester.runAsync(() async {
      try {
        token = await container.read(authClientProvider).accessToken();
        if (token != null) {
          await container.read(authIdentityRepositoryProvider).identity();
          report['nativeSessionAvailable'] = true;
          report['nativeIdentityVerified'] = true;
        }
      } catch (_) {
        token = null;
        report['sessionRestore'] = 'failed';
      }
    });

    final reads = <_Read>[
      const _Read(
        'account',
        'query Account { myProfile { $profileFields } pets { $petFields } }',
      ),
      const _Read(
        'feed',
        'query Feed { getDailyFeed { items { id targetUserId state } } }',
      ),
      _Read(
        'myProfileImageUploads',
        profileOperations['myProfileImageUploads']!,
      ),
      for (final name in ['myReceivedLikes', 'mySentLikes', 'myPairs'])
        _Read(name, socialOperations[name]!, {'limit': 20, 'offset': 0}),
      _Read('chatRooms', socialOperations['chatRooms']!),
      for (final name in ['challenges', 'myWalkingPassport', 'myCurrentWalk'])
        _Read(name, operations[name]!.query(name)),
      _Read('myChallenges', operations['myChallenges']!.query('myChallenges'), {
        'limit': 20,
      }),
      for (final name in [
        'myWalkingRoutes',
        'myBookmarkedWalkingRoutes',
        'myWalks',
        'myWalkingDiaries',
      ])
        _Read(name, operations[name]!.query(name), {'limit': 20, 'offset': 0}),
      const _Read(
        'mySnackWallet',
        'query MySnackWallet { mySnackWallet { balance availableBalance frozen } }',
      ),
      const _Read(
        'mySnackTransactions',
        r'query MySnackTransactions($after: String) { mySnackTransactions(after: $after) { id state snackQuantity amountMinor currency refundReview } }',
        {'after': null},
      ),
      for (final provider in ['GOOGLE', 'APPLE'])
        _Read(
          'snackProducts:$provider',
          r'query Products($provider: PaymentProvider!) { snackProducts(provider: $provider) { id productId snackQuantity basePriceKrw priceKrw provider storeProductId storeOfferId eventName } }',
          {'provider': provider},
        ),
    ];
    final dio = Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 20),
        sendTimeout: const Duration(seconds: 20),
        followRedirects: false,
      ),
    );
    addTearDown(dio.close);
    final gateway = GatewayApi(dio, baseUrl: config.gatewayGraphqlUrl);

    Future<Map<String, dynamic>> probe(_Read read, String? bearer) async {
      try {
        final response = await gateway.execute(
          GraphqlRequest(query: read.query, variables: read.variables),
          bearer == null ? null : 'Bearer $bearer',
        );
        // Never retain raw response/error messages, IDs, GPS, URLs, or content.
        if (response.errors?.isNotEmpty == true) {
          final codes = response.errors!
              .map((e) => e.extensions?['code'])
              .toSet();
          final outcome = codes.contains('UNAUTHENTICATED')
              ? 'authentication_required'
              : codes.contains('GRAPHQL_VALIDATION_FAILED')
              ? 'contract_unavailable'
              : codes.contains('FORBIDDEN')
              ? 'scope_denied'
              : codes.contains('STORE_UNAVAILABLE')
              ? 'store_disabled'
              : 'graphql_error';
          return {'operation': read.name, 'outcome': outcome};
        }
        final roots = read.name == 'account'
            ? ['myProfile', 'pets']
            : [
                read.name == 'feed'
                    ? 'getDailyFeed'
                    : read.name.split(':').first,
              ];
        return {
          'operation': read.name,
          'outcome':
              roots.every((root) => response.data?.containsKey(root) == true)
              ? 'read_success'
              : 'response_contract_mismatch',
        };
      } on DioException catch (error) {
        return {
          'operation': read.name,
          'httpStatus': error.response?.statusCode,
          'outcome': switch (error.response?.statusCode) {
            401 => 'authentication_required',
            403 => 'scope_denied',
            _ => 'transport_failure',
          },
        };
      } catch (_) {
        return {
          'operation': read.name,
          'outcome': 'response_contract_mismatch',
        };
      }
    }

    final results = report['readResults'] as List<Map<String, dynamic>>;
    await tester.runAsync(() async {
      for (final read in reads) {
        final negative = await probe(read, null);
        results.add({...negative, 'authenticated': false});
        if (token != null) {
          final positive = await probe(read, token);
          results.add({...positive, 'authenticated': true});
        }
      }
    });
    report['fullApiE2E'] =
        false; // Writes, uploads, WS and GPS remain separate.
    if (token == null) {
      report['authenticatedReads'] = 'blocked_native_login';
      expect(find.text('아이디로 로그인'), findsOneWidget);
      await binding.convertFlutterSurfaceToImage();
      await tester.pump();
      await binding.takeScreenshot('development-native-login');
    }
    expect(
      results
          .where((r) => r['authenticated'] == false)
          .every((r) => r['outcome'] == 'authentication_required'),
      isTrue,
      reason: '개발 API의 미인증 거절 결과를 확인하세요. 원문은 기록하지 않습니다.',
    );
    if (token != null) {
      expect(
        results
            .where((r) => r['authenticated'] == true)
            .every(
              (r) =>
                  r['outcome'] == 'read_success' ||
                  (r['operation'].toString().startsWith('snackProducts:') &&
                      r['outcome'] == 'store_disabled'),
            ),
        isTrue,
        reason: '개발 API 계약·scope·스토어 비활성 결과를 확인하세요.',
      );
    }
  }, timeout: const Timeout(Duration(minutes: 8)));
}
