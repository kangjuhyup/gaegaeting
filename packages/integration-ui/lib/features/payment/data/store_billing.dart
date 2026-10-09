import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';
import 'package:in_app_purchase_storekit/in_app_purchase_storekit.dart';
import 'package:in_app_purchase_storekit/store_kit_2_wrappers.dart';

import '../domain/payment_models.dart';

enum StorePurchaseState { pending, purchased, canceled, failed }

class StoreProduct {
  const StoreProduct(this.id, this.price, this.currency, {this.native});
  final String id, price, currency;
  final ProductDetails? native;
}

class StorePurchase {
  const StorePurchase({
    required this.productId,
    required this.state,
    this.proof = '',
    this.accountToken,
    this.transactionId,
  });
  final String productId, proof;
  final String? accountToken, transactionId;
  final StorePurchaseState state;
}

abstract interface class StoreBilling {
  String? get provider;
  Stream<List<StorePurchase>> get purchases;
  Future<List<StoreProduct>> products(Set<String> ids);
  Future<bool> buy(StoreProduct product, String accountToken);
  Future<List<StorePurchase>> unfinished();
  Future<void> finishApple(String transactionId);
}

class NativeStoreBilling implements StoreBilling {
  @override
  String? get provider => kIsWeb
      ? null
      : switch (defaultTargetPlatform) {
          TargetPlatform.android => 'GOOGLE',
          TargetPlatform.iOS => 'APPLE',
          _ => null,
        };
  InAppPurchase get _iap => InAppPurchase.instance;
  StorePurchase _convert(PurchaseDetails p) => StorePurchase(
    productId: p.productID,
    transactionId: p.purchaseID,
    proof: p.verificationData.serverVerificationData,
    accountToken: p is GooglePlayPurchaseDetails
        ? p.billingClientPurchase.obfuscatedAccountId
        : p is SK2PurchaseDetails
        ? p.appAccountToken
        : null,
    state: switch (p.status) {
      PurchaseStatus.pending => StorePurchaseState.pending,
      PurchaseStatus.purchased ||
      PurchaseStatus.restored => StorePurchaseState.purchased,
      PurchaseStatus.canceled => StorePurchaseState.canceled,
      PurchaseStatus.error => StorePurchaseState.failed,
    },
  );
  @override
  Stream<List<StorePurchase>> get purchases =>
      _iap.purchaseStream.map((batch) => batch.map(_convert).toList());
  @override
  Future<List<StoreProduct>> products(Set<String> ids) async {
    if (!await _iap.isAvailable()) {
      throw const PaymentFailure('STORE_UNAVAILABLE');
    }
    final response = await _iap.queryProductDetails(ids);
    if (response.error != null) throw const PaymentFailure('STORE_UNAVAILABLE');
    return response.productDetails
        .map((p) => StoreProduct(p.id, p.price, p.currencyCode, native: p))
        .toList();
  }

  @override
  Future<bool> buy(StoreProduct product, String accountToken) {
    final native = product.native;
    if (native == null) throw const PaymentFailure('PRODUCT_UNAVAILABLE');
    return _iap.buyConsumable(
      purchaseParam: provider == 'GOOGLE'
          ? GooglePlayPurchaseParam(
              productDetails: native,
              applicationUserName: accountToken,
            )
          : Sk2PurchaseParam(
              productDetails: native,
              applicationUserName: accountToken,
            ),
      // iOS uses this option as an assertion; finish is still explicit. Android
      // must not consume/acknowledge before the server commits fulfillment.
      autoConsume: provider == 'APPLE',
    );
  }

  @override
  Future<List<StorePurchase>> unfinished() async {
    if (provider == 'APPLE') {
      return (await SK2Transaction.unfinishedTransactions())
          .map(
            (t) => StorePurchase(
              productId: t.productId,
              transactionId: t.id,
              proof: t.receiptData ?? t.id,
              accountToken: t.appAccountToken,
              state: StorePurchaseState.purchased,
            ),
          )
          .toList();
    }
    if (provider == 'GOOGLE') {
      final result = await _iap
          .getPlatformAddition<InAppPurchaseAndroidPlatformAddition>()
          .queryPastPurchases();
      if (result.error != null) throw const PaymentFailure('STORE_UNAVAILABLE');
      return result.pastPurchases.map(_convert).toList();
    }
    return [];
  }

  @override
  Future<void> finishApple(String transactionId) =>
      SK2Transaction.finish(int.parse(transactionId));
}
