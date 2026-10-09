import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:gaegaeting/core/design/app_theme.dart';
import 'package:gaegaeting/core/network/gateway_api.dart';
import 'package:gaegaeting/features/payment/application/payment_controller.dart';
import 'package:gaegaeting/features/payment/application/payment_providers.dart';
import 'package:gaegaeting/features/payment/data/payment_repository.dart';
import 'package:gaegaeting/features/payment/data/purchase_journal.dart';
import 'package:gaegaeting/features/payment/presentation/snack_purchase_screen.dart';

import '../test/payment_fixtures.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('Android에서 Retrofit HTTP 조회 후 비활성 스토어와 서버 잔액을 표시한다', (
    tester,
  ) async {
    // A disposable HTTP contract fixture, not the live stg or a real store.
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final calls = <String>[];
    final subscription = server.listen((request) async {
      final json = jsonDecode(await utf8.decoder.bind(request).join()) as Map;
      final query = json['query'] as String;
      final Map<String, dynamic> response;
      if (query.contains('mySnackWallet')) {
        calls.add('wallet');
        response = {
          'data': {
            'mySnackWallet': {
              'balance': 7,
              'availableBalance': 7,
              'frozen': false,
            },
          },
        };
      } else if (query.contains('mySnackTransactions')) {
        calls.add('transactions');
        response = {
          'data': {'mySnackTransactions': []},
        };
      } else if (query.contains('snackProducts')) {
        calls.add('products');
        response = {
          'errors': [
            {
              'message': 'STORE_UNAVAILABLE',
              'extensions': {'code': 'STORE_UNAVAILABLE'},
            },
          ],
        };
      } else {
        calls.add('unexpected-mutation');
        response = {
          'errors': [
            {
              'message': 'Not allowed',
              'extensions': {'code': 'FORBIDDEN'},
            },
          ],
        };
      }
      request.response.headers.contentType = ContentType.json;
      request.response.write(jsonEncode(response));
      await request.response.close();
    });
    final dio = Dio();
    final billing = TestBilling(provider: 'GOOGLE');
    final journal = SecurePurchaseJournal(
      'isolated-payment-emulator-${server.port}',
    );
    final controller = PaymentController(
      api: PaymentRepository(
        gateway: GatewayApi(
          dio,
          baseUrl: 'http://127.0.0.1:${server.port}/gateway/graphql',
        ),
        accessToken: () async => 'synthetic-emulator-session',
      ),
      billing: billing,
      journal: journal,
      ownerId: () => 'synthetic-emulator-profile',
      storeEnabled: false,
    );
    addTearDown(() async {
      controller.dispose();
      dio.close();
      await journal.storage.delete(key: journal.key);
      await billing.events.close();
      await subscription.cancel();
      await server.close(force: true);
    });
    await tester.pumpWidget(
      ProviderScope(
        overrides: [paymentControllerProvider.overrideWithValue(controller)],
        child: MaterialApp(
          theme: buildAppTheme(),
          locale: const Locale('ko'),
          supportedLocales: const [Locale('ko')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          home: const ApiSnackPurchaseScreen(),
        ),
      ),
    );
    await controller.synchronize();
    await tester.pumpAndSettle();
    expect(find.text('보유 간식 7개 · 사용 가능 7개'), findsOneWidget);
    expect(find.text('스토어 결제 준비 중이에요. 지금은 구매할 수 없어요.'), findsOneWidget);
    expect(billing.launched, 0);
    expect(billing.queried, 0);
    expect(billing.restored, 0);
    expect(calls, ['wallet', 'transactions', 'products']);
    await binding.convertFlutterSurfaceToImage();
    await tester.pump();
    await binding.takeScreenshot('payment-disabled-android');
    await tester.tap(find.text('구매 내역 동기화'));
    // Allow actual HTTP futures to complete on the device, then settle frames.
    for (var attempt = 0; attempt < 100 && calls.length < 6; attempt++) {
      await Future<void>.delayed(const Duration(milliseconds: 20));
    }
    await tester.pumpAndSettle();
    expect(calls, [
      'wallet',
      'transactions',
      'products',
      'wallet',
      'transactions',
      'products',
    ]);
    expect(tester.takeException(), isNull);
  });
}
