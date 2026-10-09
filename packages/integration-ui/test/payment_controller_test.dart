import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/features/payment/application/payment_controller.dart';
import 'package:gaegaeting/features/payment/data/store_billing.dart';
import 'package:gaegaeting/features/payment/domain/payment_models.dart';

import 'payment_fixtures.dart';

void main() {
  late TestPaymentApi api;
  late TestBilling store;
  late TestJournal journal;
  late PaymentController controller;
  String? owner;
  PaymentController create({bool enabled = true}) => PaymentController(
    api: api,
    billing: store,
    journal: journal,
    ownerId: () => owner,
    storeEnabled: enabled,
  );
  setUp(() {
    owner = 'profile-a';
    api = TestPaymentApi();
    store = TestBilling();
    journal = TestJournal();
    controller = create();
  });
  tearDown(() async {
    controller.dispose();
    await store.events.close();
  });
  Future<void> start() async {
    await controller.synchronize();
    await controller.buy(testOffer(provider: api.provider));
  }

  group('서버 검증과 간식 지급 정책', () {
    test('Apple finish 실패 후에도 복구 증거와 같은 준비 ID를 유지한다', () async {
      await start();
      store.failFinish = true;
      await controller.handlePurchases([testPurchase()]);
      expect(journal.records.single.settled, false);
      expect(store.finished, 0);
      store.failFinish = false;
      await controller.synchronize();
      expect(api.submitted, ['test-intent', 'test-intent']);
      expect(api.prepared, 1);
      expect(store.finished, 1);
      expect(journal.records.single.proof, isNull);
    });
    test('검증 응답 전 성공을 표시하거나 스토어 거래를 완료하지 않는다', () async {
      await start();
      api.holdConfirmation = Completer();
      final handling = controller.handlePurchases([testPurchase()]);
      await Future<void>.delayed(Duration.zero);
      expect(controller.phase, PaymentPhase.verifying);
      expect(controller.creditedQuantity, isNull);
      expect(store.finished, 0);
      api.holdConfirmation!.complete(
        const PurchaseConfirmation(
          id: 'test-payment',
          state: 'PURCHASED',
          snackQuantity: 10,
        ),
      );
      await handling;
      expect(controller.phase, PaymentPhase.purchased);
      expect(store.finished, 1);
      expect(controller.wallet!.balance, 42); // Server balance, never 42 + 10.
      expect(store.purchaserLink, 'test-account-link');
      expect(journal.records.single.proof, isNull);
    });
    test('같은 구매 이벤트와 완료 후 재시작은 추가 지급과 finish를 실행하지 않는다', () async {
      await start();
      await controller.handlePurchases([testPurchase(), testPurchase()]);
      expect(api.confirmed, 1);
      expect(store.finished, 1);
      controller.dispose();
      controller = create();
      await controller.handlePurchases([testPurchase()]);
      expect(api.confirmed, 1);
      expect(store.finished, 1);
    });
    test('스토어 대기 콜백은 검증 요청이나 지급을 실행하지 않는다', () async {
      await start();
      await controller.handlePurchases([
        testPurchase(state: StorePurchaseState.pending),
      ]);
      expect(controller.phase, PaymentPhase.pending);
      expect(api.confirmed, 0);
      expect(store.finished, 0);
      expect(controller.creditedQuantity, isNull);
    });
    test('서버의 PENDING은 같은 준비 ID로 재시도하며 PURCHASED 이후 완료된다', () async {
      await start();
      api.confirmationState = 'PENDING';
      await controller.handlePurchases([testPurchase()]);
      expect(controller.phase, PaymentPhase.pending);
      expect(store.finished, 0);
      api.confirmationState = 'PURCHASED';
      await controller.synchronize();
      expect(api.submitted, ['test-intent', 'test-intent']);
      expect(controller.phase, PaymentPhase.purchased);
      expect(store.finished, 1);
    });
    for (final state in [
      StorePurchaseState.canceled,
      StorePurchaseState.failed,
    ]) {
      test('스토어 ${state.name} 콜백은 재화를 지급하지 않고 새 구매를 허용한다', () async {
        await start();
        await controller.handlePurchases([testPurchase(state: state)]);
        expect(api.confirmed, 0);
        expect(store.finished, 0);
        expect(journal.records, isEmpty);
        expect(controller.creditedQuantity, isNull);
      });
    }
    test('서버 검증 실패는 증거를 보존하며 finish와 성공 표시를 하지 않는다', () async {
      await start();
      api.confirmError = const PaymentFailure('PURCHASE_MISMATCH');
      await controller.handlePurchases([testPurchase()]);
      expect(controller.error!.code, 'PURCHASE_MISMATCH');
      expect(store.finished, 0);
      expect(journal.records.single.settled, false);
      expect(controller.creditedQuantity, isNull);
    });
    test('환불 거래를 성공으로 표시하거나 finish하지 않는다', () async {
      await start();
      api.confirmationState = 'REFUNDED';
      await controller.handlePurchases([testPurchase()]);
      expect(controller.phase, PaymentPhase.refunded);
      expect(store.finished, 0);
      expect(controller.creditedQuantity, isNull);
    });
    test('Google 지급 성공의 consume과 acknowledge는 서버에 맡긴다', () async {
      controller.dispose();
      api = TestPaymentApi(provider: 'GOOGLE');
      store = TestBilling(provider: 'GOOGLE');
      controller = create();
      await start();
      await controller.handlePurchases([testPurchase()]);
      expect(controller.phase, PaymentPhase.purchased);
      expect(store.finished, 0);
    });
    test('검증 네트워크 오류 후 재시작은 보존된 증거로 원래 구매를 재검증한다', () async {
      await start();
      api.confirmError = const PaymentFailure('NETWORK_ERROR');
      await controller.handlePurchases([testPurchase()]);
      expect(store.finished, 0);
      controller.dispose();
      controller = create();
      api.confirmError = null;
      await controller.synchronize();
      expect(api.prepared, 1);
      expect(api.submitted, ['test-intent', 'test-intent']);
      expect(store.finished, 1);
    });
    test('서버 지급 후 잔액 조회 실패는 잔액을 만들어내지 않는다', () async {
      await start();
      api.walletError = const PaymentFailure('NETWORK_ERROR');
      await controller.handlePurchases([testPurchase()]);
      expect(controller.phase, PaymentPhase.purchased);
      expect(controller.wallet, isNull);
      expect(controller.notice, contains('다시 동기화'));
      expect(store.finished, 1);
    });
  });
  group('판매와 인증 경계', () {
    test('복구 저장소 손상은 기존 정보를 버리지 않고 새 구매를 막는다', () async {
      journal.refuseReads = true;
      await controller.synchronize();
      await controller.buy(testOffer());
      expect(store.launched, 0);
      expect(api.prepared, 0);
    });
    test('비활성 앱 설정은 스토어 SDK 조회·복원·구매를 호출하지 않는다', () async {
      controller.dispose();
      controller = create(enabled: false);
      await controller.synchronize();
      await controller.buy(testOffer());
      expect(controller.wallet!.balance, 42);
      expect(store.queried, 0);
      expect(store.restored, 0);
      expect(store.launched, 0);
      expect(api.prepared, 0);
    });
    test('서버 스토어 비활성은 지갑을 읽고 구매를 차단한다', () async {
      api.offerError = const PaymentFailure('STORE_UNAVAILABLE');
      await controller.synchronize();
      expect(controller.storeUnavailable, true);
      expect(controller.offers, isEmpty);
      expect(controller.wallet!.availableBalance, 40);
      expect(store.queried, 0);
    });
    test('서버에 없는 SKU와 지원하지 않는 할인 offer는 구매 불가다', () async {
      store.missingProduct = true;
      await controller.synchronize();
      expect(controller.canBuy(testOffer()), false);
      store.missingProduct = false;
      await controller.synchronize();
      expect(controller.canBuy(testOffer(storeOfferId: 'test-offer')), false);
    });
    test('선택 후 판매 종료는 스토어 구매를 시작하지 않는다', () async {
      await controller.synchronize();
      api.listedOffers = [];
      await controller.buy(testOffer());
      expect(controller.error!.code, 'OFFER_UNAVAILABLE');
      expect(store.launched, 0);
    });
    test('안전한 복구 정보 저장 실패는 결제 시작을 막는다', () async {
      await controller.synchronize();
      journal.refuseWrites = true;
      await controller.buy(testOffer());
      expect(controller.error!.code, 'STORAGE_UNAVAILABLE');
      expect(store.launched, 0);
    });
    test('다른 계정의 미완료 구매는 제출하거나 완료하지 않는다', () async {
      await start();
      owner = 'profile-b';
      controller.clearSessionView();
      await controller.handlePurchases([testPurchase()]);
      expect(api.confirmed, 0);
      expect(store.finished, 0);
      expect(journal.records.single.ownerId, 'profile-a');
    });
    test('검증 중 로그아웃은 성공 표시와 finish를 막는다', () async {
      await start();
      api.holdConfirmation = Completer();
      final handling = controller.handlePurchases([testPurchase()]);
      await Future<void>.delayed(Duration.zero);
      owner = null;
      controller.clearSessionView();
      api.holdConfirmation!.complete(
        const PurchaseConfirmation(
          id: 'test-payment',
          state: 'PURCHASED',
          snackQuantity: 10,
        ),
      );
      await handling;
      expect(store.finished, 0);
      expect(controller.creditedQuantity, isNull);
    });
    test('연결할 준비 내역 없는 복원은 새 준비 요청이나 지급을 하지 않는다', () async {
      await controller.handlePurchases([testPurchase()]);
      expect(controller.error!.code, 'UNMATCHED_PURCHASE');
      expect(api.prepared, 0);
      expect(api.confirmed, 0);
      expect(store.finished, 0);
    });
    test('권한 오류는 복구 증거를 지우지 않고 재로그인을 안내한다', () async {
      await start();
      api.confirmError = const PaymentFailure('FORBIDDEN');
      await controller.handlePurchases([testPurchase()]);
      expect(controller.error!.requiresLogin, true);
      expect(journal.records.single.proof, isNotNull);
      expect(store.finished, 0);
    });
  });
}
