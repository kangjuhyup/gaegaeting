import 'dart:async';

import 'package:flutter/foundation.dart';

import '../data/payment_repository.dart';
import '../data/purchase_journal.dart';
import '../data/store_billing.dart';
import '../domain/payment_models.dart';

enum PaymentPhase {
  idle,
  loading,
  preparing,
  awaitingStore,
  pending,
  verifying,
  purchased,
  canceled,
  failed,
  refunded,
}

class PaymentController extends ChangeNotifier {
  PaymentController({
    required this.api,
    required this.billing,
    required this.journal,
    required this.ownerId,
    required this.storeEnabled,
  }) {
    // Subscribe before any purchase launch. A disabled build never invokes SDK.
    if (storeEnabled && billing.provider != null) {
      _subscription = billing.purchases.listen(
        (batch) {
          unawaited(handlePurchases(batch));
        },
        onError: (Object _) => _fail(const PaymentFailure('STORE_UNAVAILABLE')),
      );
    }
  }
  final PaymentApi api;
  final StoreBilling billing;
  final PurchaseJournal journal;
  final String? Function() ownerId;
  final bool storeEnabled;
  StreamSubscription<List<StorePurchase>>? _subscription;
  Future<void> _tail = Future.value();
  bool _disposed = false;
  SnackWallet? wallet;
  List<SnackOffer> offers = [];
  List<SnackTransaction> transactions = [];
  Map<String, StoreProduct> products = {};
  PaymentPhase phase = PaymentPhase.idle;
  PaymentFailure? error;
  String? notice;
  bool storeUnavailable = false;
  int unresolved = 0;
  int? creditedQuantity;
  bool get busy => const {
    PaymentPhase.loading,
    PaymentPhase.preparing,
    PaymentPhase.verifying,
    PaymentPhase.awaitingStore,
  }.contains(phase);
  bool canBuy(SnackOffer offer) =>
      storeEnabled &&
      !storeUnavailable &&
      !busy &&
      ownerId() != null &&
      unresolved == 0 &&
      products.containsKey(offer.storeProductId) &&
      offer.storeOfferId == null;
  void _emit() {
    if (!_disposed) notifyListeners();
  }

  void _fail(Object e) {
    error = e is PaymentFailure ? e : const PaymentFailure('REQUEST_FAILED');
    phase = PaymentPhase.failed;
    _emit();
  }

  void clearSessionView() {
    wallet = null;
    offers = [];
    transactions = [];
    products = {};
    error = null;
    notice = null;
    creditedQuantity = null;
    unresolved = 0;
    phase = PaymentPhase.idle;
    _emit();
  }

  String _owner() =>
      ownerId() ?? (throw const PaymentFailure('UNAUTHENTICATED'));
  void _assertOwner(String owner) {
    if (_disposed || ownerId() != owner) {
      throw const PaymentFailure('ACCOUNT_CHANGED');
    }
  }

  Future<void> _enqueue(Future<void> Function() work) {
    final result = _tail.then((_) async {
      if (_disposed) return;
      try {
        await work();
      } catch (e) {
        _fail(e);
      }
    });
    _tail = result;
    return result;
  }

  Future<List<PurchaseRecord>> _read() async {
    try {
      return await journal.read();
    } catch (_) {
      throw const PaymentFailure('STORAGE_UNAVAILABLE');
    }
  }

  Future<void> _write(List<PurchaseRecord> records) async {
    // Retain unfinished records, plus a small digest-only completed replay map.
    final settled = records.where((e) => e.settled).toList();
    final retained = [
      ...records.where((e) => !e.settled),
      ...settled.skip(settled.length > 50 ? settled.length - 50 : 0),
    ];
    try {
      await journal.write(retained);
    } catch (_) {
      throw const PaymentFailure('STORAGE_UNAVAILABLE');
    }
    unresolved = retained
        .where((e) => !e.settled && e.ownerId == ownerId())
        .length;
  }

  Future<void> _load(String owner) async {
    final latestWallet = await api.wallet();
    final latestTransactions = await api.transactions();
    _assertOwner(owner);
    wallet = latestWallet;
    transactions = latestTransactions;
    // Read errors must clear stale data; never show an old balance as current.
    offers = [];
    products = {};
    storeUnavailable = false;
    final provider = billing.provider;
    if (provider != null) {
      try {
        final latestOffers = await api.offers(provider);
        _assertOwner(owner);
        offers = latestOffers;
        if (storeEnabled && offers.isNotEmpty) {
          final details = await billing.products(
            offers.map((o) => o.storeProductId).toSet(),
          );
          _assertOwner(owner);
          products = {for (final p in details) p.id: p};
        }
      } on PaymentFailure catch (e) {
        if (e.code != 'STORE_UNAVAILABLE') rethrow;
        storeUnavailable = true;
      }
    }
  }

  Future<void> synchronize() => _enqueue(() async {
    final owner = _owner();
    phase = PaymentPhase.loading;
    error = null;
    notice = null;
    creditedQuantity = null;
    wallet = null;
    offers = [];
    products = {};
    transactions = [];
    _emit();
    var records = await _read();
    unresolved = records.where((e) => e.ownerId == owner && !e.settled).length;
    if (storeEnabled && billing.provider != null) {
      // Explicitly query unfinished consumables; completed consumables are
      // restored from the server wallet, not re-granted by restorePurchases.
      for (final purchase in await billing.unfinished()) {
        try {
          await _handle(purchase, owner);
        } catch (e) {
          _fail(e);
        }
      }
      records = await _read();
      for (final record in records.where(
        (e) => e.ownerId == owner && !e.settled && e.proof != null,
      )) {
        try {
          await _confirm(record, owner);
        } catch (e) {
          _fail(e);
        }
      }
    }
    await _load(owner);
    _assertOwner(owner);
    if (error == null && creditedQuantity == null) {
      phase = unresolved > 0 ? PaymentPhase.pending : PaymentPhase.idle;
      notice = unresolved > 0
          ? '미완료 구매가 있어요. 구매 내역 동기화로 확인해 주세요.'
          : '서버 잔액과 구매 내역을 갱신했어요.';
    }
    _emit();
  });

  Future<void> buy(SnackOffer selected) => _enqueue(() async {
    if (!canBuy(selected)) throw const PaymentFailure('STORE_DISABLED');
    final owner = _owner();
    phase = PaymentPhase.preparing;
    error = null;
    notice = null;
    creditedQuantity = null;
    _emit();
    final records = await _read();
    if (records.any((r) => !r.settled && r.ownerId == owner)) {
      throw const PaymentFailure('UNMATCHED_PURCHASE');
    }
    // Recheck server sale availability, SDK price and prepared snapshot.
    final fresh = await api.offers(billing.provider!);
    if (!fresh.any((o) => o.id == selected.id)) {
      throw const PaymentFailure('OFFER_UNAVAILABLE');
    }
    final details = await billing.products({selected.storeProductId});
    final product = details
        .where((p) => p.id == selected.storeProductId)
        .firstOrNull;
    if (product == null ||
        product.price != products[selected.storeProductId]?.price ||
        product.currency != products[selected.storeProductId]?.currency) {
      throw const PaymentFailure('PRODUCT_UNAVAILABLE');
    }
    final prepared = await api.prepare(billing.provider!, selected.id);
    final offer = prepared.offer;
    if (offer.provider != billing.provider ||
        offer.storeProductId != selected.storeProductId ||
        offer.snackQuantity != selected.snackQuantity ||
        offer.priceKrw != selected.priceKrw ||
        offer.storeOfferId != null) {
      throw const PaymentFailure('OFFER_UNAVAILABLE');
    }
    _assertOwner(owner);
    final record = PurchaseRecord(
      preparedId: prepared.id,
      ownerId: owner,
      productId: offer.storeProductId,
      provider: offer.provider,
      accountToken: prepared.accountToken,
    );
    await _write([...records, record]);
    _assertOwner(owner);
    phase = PaymentPhase.awaitingStore;
    _emit();
    if (!await billing.buy(product, prepared.accountToken)) {
      await _write(records);
      phase = PaymentPhase.failed;
      error = const PaymentFailure('STORE_UNAVAILABLE');
      _emit();
    }
  });

  Future<void> handlePurchases(List<StorePurchase> batch) => _enqueue(() async {
    final owner = _owner();
    for (final purchase in batch) {
      try {
        await _handle(purchase, owner);
      } catch (e) {
        _fail(e);
      }
    }
  });

  Future<void> _handle(StorePurchase purchase, String owner) async {
    _assertOwner(owner);
    final records = await _read();
    final digest = purchase.proof.isEmpty ? null : proofDigest(purchase.proof);
    var record = records
        .where(
          (r) =>
              r.provider == billing.provider &&
              ((digest != null && r.digest == digest) ||
                  (purchase.transactionId != null &&
                      r.transactionId == purchase.transactionId)),
        )
        .firstOrNull;
    if (record != null && record.ownerId != owner) {
      throw const PaymentFailure('ACCOUNT_CHANGED');
    }
    if (record == null) {
      final candidates = records
          .where(
            (r) =>
                r.ownerId == owner &&
                !r.settled &&
                r.proof == null &&
                r.provider == billing.provider &&
                r.productId == purchase.productId &&
                (purchase.accountToken == null ||
                    r.accountToken.toLowerCase() ==
                        purchase.accountToken!.toLowerCase()),
          )
          .toList();
      if (candidates.length == 1) record = candidates.single;
    }
    if (record == null) throw const PaymentFailure('UNMATCHED_PURCHASE');
    if (record.settled) return; // Already server-verified and finished.
    switch (purchase.state) {
      case StorePurchaseState.pending:
        phase = PaymentPhase.pending;
        notice = '스토어 결제 대기 중이에요. 승인 전에는 간식이 충전되지 않아요.';
        _emit();
        return;
      case StorePurchaseState.canceled:
      case StorePurchaseState.failed:
        // Only remove a never-submitted intent on an explicit terminal callback.
        if (record.proof == null) {
          await _write(
            records.where((r) => r.preparedId != record!.preparedId).toList(),
          );
        }
        phase = purchase.state == StorePurchaseState.canceled
            ? PaymentPhase.canceled
            : PaymentPhase.failed;
        notice = purchase.state == StorePurchaseState.canceled
            ? '구매를 취소했어요. 간식은 충전되지 않았어요.'
            : '스토어 구매에 실패했어요. 구매 내역을 동기화해 주세요.';
        _emit();
        return;
      case StorePurchaseState.purchased:
        if (purchase.proof.isEmpty || purchase.proof.length > 65536) {
          throw const PaymentFailure('INVALID_PROOF');
        }
        record = record.evidence(purchase.proof, purchase.transactionId);
        await _write(
          records
              .map((r) => r.preparedId == record!.preparedId ? record : r)
              .toList(),
        );
        await _confirm(record, owner);
    }
  }

  Future<void> _confirm(PurchaseRecord record, String owner) async {
    _assertOwner(owner);
    phase = PaymentPhase.verifying;
    error = null;
    creditedQuantity = null;
    _emit();
    final confirmation = await api.confirm(record.preparedId, record.proof!);
    _assertOwner(owner);
    if (confirmation.state == 'PENDING') {
      phase = PaymentPhase.pending;
      notice = '서버에서 결제 완료를 기다리고 있어요. 간식은 아직 충전되지 않았어요.';
      _emit();
      return;
    }
    if (confirmation.state == 'REFUNDED') {
      phase = PaymentPhase.refunded;
      notice = '환불된 구매예요. 서버 잔액과 구매 내역을 확인해 주세요.';
      _emit();
      return;
    }
    if (confirmation.state != 'PURCHASED' || confirmation.snackQuantity <= 0) {
      throw const PaymentFailure('INVALID_PROOF');
    }
    if (record.provider == 'APPLE') {
      if (record.transactionId == null) {
        throw const PaymentFailure('INVALID_PROOF');
      }
      await billing.finishApple(record.transactionId!);
    }
    _assertOwner(owner);
    final records = await _read();
    await _write(
      records
          .map((r) => r.preparedId == record.preparedId ? r.complete() : r)
          .toList(),
    );
    // No local credit arithmetic: balance is always reloaded from Gateway.
    wallet = null;
    creditedQuantity = confirmation.snackQuantity;
    phase = PaymentPhase.purchased;
    notice = '서버에서 간식 ${confirmation.snackQuantity}개 충전을 확인했어요.';
    try {
      await _load(owner);
    } catch (e) {
      _assertOwner(owner);
      error = e is PaymentFailure ? e : const PaymentFailure('REQUEST_FAILED');
      notice = '충전은 확인됐어요. 최신 잔액을 불러오지 못해 다시 동기화가 필요해요.';
    }
    _emit();
  }

  Future<void> loadMoreTransactions() => _enqueue(() async {
    if (transactions.isEmpty) return;
    final owner = _owner();
    final more = await api.transactions(after: transactions.last.id);
    _assertOwner(owner);
    final known = transactions.map((t) => t.id).toSet();
    transactions = [
      ...transactions,
      ...more.where((t) => !known.contains(t.id)),
    ];
    _emit();
  });
  @override
  void dispose() {
    _disposed = true;
    unawaited(_subscription?.cancel());
    super.dispose();
  }
}
