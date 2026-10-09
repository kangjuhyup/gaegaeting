class PaymentFailure implements Exception {
  const PaymentFailure(this.code);
  final String code;
  bool get requiresLogin => const {
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'INSUFFICIENT_SCOPE',
  }.contains(code);
  String get message => switch (code) {
    'UNAUTHENTICATED' => '로그인이 만료되었어요. 다시 로그인해 주세요.',
    'FORBIDDEN' ||
    'INSUFFICIENT_SCOPE' => '결제 권한이 필요해요. 다시 로그인해 주세요. 계속되면 고객지원에 문의해 주세요.',
    'STORE_UNAVAILABLE' || 'STORE_DISABLED' => '스토어 결제 준비 중이에요. 지금은 구매할 수 없어요.',
    'OFFER_UNAVAILABLE' ||
    'PRODUCT_UNAVAILABLE' => '현재 구매할 수 없는 상품이에요. 목록을 새로고침해 주세요.',
    'UNSUPPORTED_OFFER' => '이 할인 상품은 아직 앱에서 구매할 수 없어요.',
    'ACCOUNT_CHANGED' => '구매를 시작한 계정으로 로그인해 주세요.',
    'UNMATCHED_PURCHASE' => '미완료 구매의 연결 정보를 찾지 못했어요. 잔액을 확인한 뒤 고객지원에 문의해 주세요.',
    'INVALID_PROOF' ||
    'PURCHASE_MISMATCH' => '구매 검증을 완료하지 못했어요. 재시도 후에도 계속되면 고객지원에 문의해 주세요.',
    'STORAGE_UNAVAILABLE' => '구매 복구 정보를 안전하게 저장하지 못했어요. 결제를 시작하지 않았어요.',
    _ => '요청을 완료하지 못했어요. 연결을 확인하고 구매 내역을 다시 동기화해 주세요.',
  };
}

class SnackOffer {
  const SnackOffer({
    required this.id,
    required this.productId,
    required this.snackQuantity,
    required this.priceKrw,
    required this.basePriceKrw,
    required this.provider,
    required this.storeProductId,
    this.storeOfferId,
    this.eventName,
  });
  factory SnackOffer.fromJson(Map<String, dynamic> j) => SnackOffer(
    id: j['id'] as String,
    productId: j['productId'] as String,
    snackQuantity: j['snackQuantity'] as int,
    priceKrw: j['priceKrw'] as int,
    basePriceKrw: j['basePriceKrw'] as int,
    provider: j['provider'] as String,
    storeProductId: j['storeProductId'] as String,
    storeOfferId: j['storeOfferId'] as String?,
    eventName: j['eventName'] as String?,
  );
  final String id, productId, provider, storeProductId;
  final String? storeOfferId, eventName;
  final int snackQuantity, priceKrw, basePriceKrw;
}

class SnackWallet {
  const SnackWallet({
    required this.balance,
    required this.availableBalance,
    required this.frozen,
  });
  factory SnackWallet.fromJson(Map<String, dynamic> j) => SnackWallet(
    balance: j['balance'] as int,
    availableBalance: j['availableBalance'] as int,
    frozen: j['frozen'] as bool,
  );
  final int balance, availableBalance;
  final bool frozen;
}

class PreparedPurchase {
  const PreparedPurchase({
    required this.id,
    required this.accountToken,
    required this.offer,
  });
  factory PreparedPurchase.fromJson(Map<String, dynamic> j) => PreparedPurchase(
    id: j['id'] as String,
    accountToken: j['accountToken'] as String,
    offer: SnackOffer.fromJson(j['offer'] as Map<String, dynamic>),
  );
  final String id, accountToken;
  final SnackOffer offer;
}

class PurchaseConfirmation {
  const PurchaseConfirmation({
    required this.id,
    required this.state,
    required this.snackQuantity,
  });
  factory PurchaseConfirmation.fromJson(Map<String, dynamic> j) =>
      PurchaseConfirmation(
        id: j['id'] as String,
        state: j['state'] as String,
        snackQuantity: j['snackQuantity'] as int,
      );
  final String id, state;
  final int snackQuantity;
}

class SnackTransaction {
  const SnackTransaction({
    required this.id,
    required this.state,
    required this.snackQuantity,
    required this.refundReview,
    this.amountMinor,
    this.currency,
  });
  factory SnackTransaction.fromJson(Map<String, dynamic> j) => SnackTransaction(
    id: j['id'] as String,
    state: j['state'] as String,
    snackQuantity: j['snackQuantity'] as int,
    refundReview: j['refundReview'] as bool,
    amountMinor: j['amountMinor'] as int?,
    currency: j['currency'] as String?,
  );
  final String id, state;
  final int snackQuantity;
  final bool refundReview;
  final int? amountMinor;
  final String? currency;
}
