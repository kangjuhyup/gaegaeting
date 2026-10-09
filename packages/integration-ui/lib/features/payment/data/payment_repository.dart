import 'package:dio/dio.dart';

import '../../../core/network/gateway_api.dart';
import '../../../core/network/graphql_models.dart';
import '../domain/payment_models.dart';

abstract interface class PaymentApi {
  Future<List<SnackOffer>> offers(String provider);
  Future<SnackWallet> wallet();
  Future<List<SnackTransaction>> transactions({String? after});
  Future<PreparedPurchase> prepare(String provider, String offerId);
  Future<PurchaseConfirmation> confirm(String preparedId, String proof);
}

const _offerFields =
    'id productId snackQuantity basePriceKrw priceKrw provider storeProductId storeOfferId eventName';

class PaymentRepository implements PaymentApi {
  PaymentRepository({required this.gateway, required this.accessToken});
  final GatewayApi gateway;
  // AuthClient refreshes expiring tokens and serializes refresh rotation.
  final Future<String?> Function() accessToken;

  Future<Map<String, dynamic>> _execute(
    String query,
    Map<String, dynamic> variables,
  ) async {
    String? token;
    try {
      token = await accessToken();
    } catch (_) {
      throw const PaymentFailure('UNAUTHENTICATED');
    }
    if (token == null) throw const PaymentFailure('UNAUTHENTICATED');
    try {
      final response = await gateway.execute(
        GraphqlRequest(query: query, variables: variables),
        'Bearer $token',
      );
      if (response.errors?.isNotEmpty == true) {
        // Never display raw GraphQL messages (they may contain purchase evidence).
        throw PaymentFailure(
          response.errors!.first.extensions?['code'] as String? ?? 'API_ERROR',
        );
      }
      if (response.data == null) throw const PaymentFailure('API_ERROR');
      return response.data!;
    } on DioException catch (e) {
      throw PaymentFailure(switch (e.response?.statusCode) {
        401 => 'UNAUTHENTICATED',
        403 => 'FORBIDDEN',
        _ => 'NETWORK_ERROR',
      });
    }
  }

  @override
  Future<List<SnackOffer>> offers(String provider) async {
    final data = await _execute(
      'query SnackProducts(\$provider: PaymentProvider!) { snackProducts(provider: \$provider) { $_offerFields } }',
      {'provider': provider},
    );
    return (data['snackProducts'] as List)
        .map((e) => SnackOffer.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<SnackWallet> wallet() async => SnackWallet.fromJson(
    (await _execute(
          'query MySnackWallet { mySnackWallet { balance availableBalance frozen } }',
          {},
        ))['mySnackWallet']
        as Map<String, dynamic>,
  );
  @override
  Future<List<SnackTransaction>> transactions({String? after}) async {
    final data = await _execute(
      'query MySnackTransactions(\$after: String) { mySnackTransactions(after: \$after) { id state snackQuantity amountMinor currency refundReview } }',
      {'after': after},
    );
    return (data['mySnackTransactions'] as List)
        .map((e) => SnackTransaction.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<PreparedPurchase> prepare(
    String provider,
    String offerId,
  ) async => PreparedPurchase.fromJson(
    (await _execute(
          'mutation PrepareSnackPurchase(\$input: PrepareSnackPurchaseInput!) { prepareSnackPurchase(input: \$input) { id accountToken offer { $_offerFields } } }',
          {
            'input': {'provider': provider, 'offerId': offerId},
          },
        ))['prepareSnackPurchase']
        as Map<String, dynamic>,
  );
  @override
  Future<PurchaseConfirmation> confirm(String preparedId, String proof) async =>
      PurchaseConfirmation.fromJson(
        (await _execute(
              'mutation ConfirmSnackPurchase(\$input: ConfirmSnackPurchaseInput!) { confirmSnackPurchase(input: \$input) { id state snackQuantity } }',
              {
                'input': {'preparedId': preparedId, 'proof': proof},
              },
            ))['confirmSnackPurchase']
            as Map<String, dynamic>,
      );
}
