import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/core/design/app_theme.dart';
import 'package:gaegaeting/features/payment/application/payment_controller.dart';
import 'package:gaegaeting/features/payment/application/payment_providers.dart';
import 'package:gaegaeting/features/payment/presentation/snack_purchase_screen.dart';

import 'payment_fixtures.dart';

void main() {
  testWidgets('서버 상품과 스토어 현지 가격으로 선택하고 새 구매를 한 번만 시작한다', (tester) async {
    final store = TestBilling();
    final controller = PaymentController(
      api: TestPaymentApi(),
      billing: store,
      journal: TestJournal(),
      ownerId: () => 'profile-a',
      storeEnabled: true,
    );
    addTearDown(() async {
      controller.dispose();
      await store.events.close();
    });
    await controller.synchronize();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [paymentControllerProvider.overrideWithValue(controller)],
        child: MaterialApp(
          theme: buildAppTheme(),
          home: const ApiSnackPurchaseScreen(),
        ),
      ),
    );
    expect(find.text('₩2,000 (KRW)'), findsOneWidget);
    await tester.tap(find.text('간식 10개'));
    await tester.pump();
    await tester.tap(find.text('간식 10개 · ₩2,000 (KRW) 구매'));
    // The store sheet is still open; the progress indicator keeps animating.
    await tester.pump(const Duration(milliseconds: 100));
    expect(store.launched, 1);
    await tester.tap(find.text('간식 10개 · ₩2,000 (KRW) 구매'));
    await tester.pump();
    expect(store.launched, 1);
  });
  testWidgets('비활성 결제 화면은 320px과 큰 글자에서도 서버 잔액과 구매 불가 상태를 표시한다', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final store = TestBilling();
    final controller = PaymentController(
      api: TestPaymentApi(),
      billing: store,
      journal: TestJournal(),
      ownerId: () => 'profile-a',
      storeEnabled: false,
    );
    addTearDown(() async {
      controller.dispose();
      await store.events.close();
    });
    await controller.synchronize();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [paymentControllerProvider.overrideWithValue(controller)],
        child: MaterialApp(
          theme: buildAppTheme(),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: const TextScaler.linear(1.5)),
            child: child!,
          ),
          home: const ApiSnackPurchaseScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('보유 간식 42개 · 사용 가능 40개'), findsOneWidget);
    expect(find.text('스토어 결제 준비 중이에요. 지금은 구매할 수 없어요.'), findsOneWidget);
    expect(tester.takeException(), isNull);
    expect(store.launched, 0);
  });
}
