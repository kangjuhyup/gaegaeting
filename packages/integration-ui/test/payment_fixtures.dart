import 'dart:async';

import 'package:gaegaeting/features/payment/data/payment_repository.dart';
import 'package:gaegaeting/features/payment/data/purchase_journal.dart';
import 'package:gaegaeting/features/payment/data/store_billing.dart';
import 'package:gaegaeting/features/payment/domain/payment_models.dart';

SnackOffer testOffer({String provider = 'APPLE', String? storeOfferId}) =>
    SnackOffer(
      id: '${provider.toLowerCase()}-snacks-10',
      productId: 'snacks-10',
      snackQuantity: 10,
      priceKrw: 2000,
      basePriceKrw: 2000,
      provider: provider,
      storeProductId: 'app.gaegaeting.snacks.10',
      storeOfferId: storeOfferId,
    );

class TestPaymentApi implements PaymentApi {
  TestPaymentApi({this.provider = 'APPLE'});
  final String provider;
  PaymentFailure? offerError, confirmError, prepareError, walletError;
  String confirmationState = 'PURCHASED';
  int confirmed = 0, prepared = 0;
  final submitted = <String>[];
  Completer<PurchaseConfirmation>? holdConfirmation;
  SnackWallet serverWallet = const SnackWallet(
    balance: 42,
    availableBalance: 40,
    frozen: false,
  );
  List<SnackOffer>? listedOffers;
  @override
  Future<List<SnackOffer>> offers(String provider) async {
    if (offerError != null) throw offerError!;
    return listedOffers ?? [testOffer(provider: provider)];
  }

  @override
  Future<SnackWallet> wallet() async {
    if (walletError != null) throw walletError!;
    return serverWallet;
  }

  @override
  Future<List<SnackTransaction>> transactions({String? after}) async => [];
  @override
  Future<PreparedPurchase> prepare(String provider, String offerId) async {
    prepared++;
    if (prepareError != null) throw prepareError!;
    return PreparedPurchase(
      id: 'test-intent',
      accountToken: 'test-account-link',
      offer: testOffer(provider: provider),
    );
  }

  @override
  Future<PurchaseConfirmation> confirm(String preparedId, String proof) async {
    confirmed++;
    submitted.add(preparedId);
    if (confirmError != null) throw confirmError!;
    if (holdConfirmation != null) return holdConfirmation!.future;
    return PurchaseConfirmation(
      id: 'test-payment',
      state: confirmationState,
      snackQuantity: confirmationState == 'PURCHASED' ? 10 : 0,
    );
  }
}

class TestJournal implements PurchaseJournal {
  List<PurchaseRecord> records = [];
  bool refuseWrites = false;
  bool refuseReads = false;
  @override
  Future<List<PurchaseRecord>> read() async {
    if (refuseReads) throw const FormatException('synthetic corrupt journal');
    return [...records];
  }

  @override
  Future<void> write(List<PurchaseRecord> value) async {
    if (refuseWrites) throw StateError('test storage unavailable');
    records = [...value];
  }
}

class TestBilling implements StoreBilling {
  TestBilling({this.provider = 'APPLE'});
  @override
  final String? provider;
  int launched = 0, queried = 0, restored = 0, finished = 0;
  bool launchAccepted = true, missingProduct = false;
  bool failFinish = false;
  List<StorePurchase> outstanding = [];
  String? purchaserLink;
  final events = StreamController<List<StorePurchase>>.broadcast();
  @override
  Stream<List<StorePurchase>> get purchases => events.stream;
  @override
  Future<List<StoreProduct>> products(Set<String> ids) async {
    queried++;
    return missingProduct
        ? []
        : [const StoreProduct('app.gaegaeting.snacks.10', '₩2,000', 'KRW')];
  }

  @override
  Future<bool> buy(StoreProduct product, String accountToken) async {
    launched++;
    purchaserLink = accountToken;
    return launchAccepted;
  }

  @override
  Future<List<StorePurchase>> unfinished() async {
    restored++;
    return outstanding;
  }

  @override
  Future<void> finishApple(String transactionId) async {
    if (failFinish) throw StateError('synthetic finish failure');
    finished++;
  }
}

StorePurchase testPurchase({
  StorePurchaseState state = StorePurchaseState.purchased,
}) => StorePurchase(
  productId: 'app.gaegaeting.snacks.10',
  state: state,
  proof: state == StorePurchaseState.purchased ? 'synthetic-test-proof' : '',
  transactionId: state == StorePurchaseState.purchased ? '123' : null,
  accountToken: 'test-account-link',
);
