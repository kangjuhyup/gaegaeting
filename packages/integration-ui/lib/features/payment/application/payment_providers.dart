import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/network_providers.dart';
import '../../account/application/api_session.dart';
import '../data/payment_repository.dart';
import '../data/purchase_journal.dart';
import '../data/store_billing.dart';
import 'payment_controller.dart';

final paymentRepositoryProvider = Provider<PaymentApi>(
  (ref) => PaymentRepository(
    gateway: ref.watch(gatewayApiProvider),
    accessToken: ref.watch(authClientProvider).accessToken,
  ),
);
final storeBillingProvider = Provider<StoreBilling>(
  (ref) => NativeStoreBilling(),
);
final purchaseJournalProvider = Provider<PurchaseJournal>((ref) {
  final app = ref.watch(appConfigProvider);
  return SecurePurchaseJournal(
    '${app.oidcIssuer}|${app.oidcClientId}|${app.gatewayGraphqlUrl}',
  );
});
final paymentControllerProvider = Provider<PaymentController>((ref) {
  final controller = PaymentController(
    api: ref.watch(paymentRepositoryProvider),
    billing: ref.watch(storeBillingProvider),
    journal: ref.watch(purchaseJournalProvider),
    ownerId: () => ref.read(apiSessionProvider).asData?.value?.profile?.id,
    storeEnabled: ref.watch(appConfigProvider).storePurchasesEnabled,
  );
  ref.onDispose(controller.dispose);
  return controller;
});
