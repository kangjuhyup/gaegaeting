import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/design/app_theme.dart';
import '../../../core/design/widgets.dart';
import '../../account/application/api_session.dart';
import '../application/payment_controller.dart';
import '../application/payment_providers.dart';
import '../domain/payment_models.dart';

class ApiSnackPill extends ConsumerWidget {
  const ApiSnackPill({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = ref.watch(paymentControllerProvider);
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) => Semantics(
        button: true,
        label: controller.storeEnabled && !controller.storeUnavailable
            ? '간식 잔액과 구매'
            : '간식 잔액과 내역',
        child: InkWell(
          onTap: () => context.go('/api/snacks'),
          child: SnackPill(count: controller.wallet?.balance),
        ),
      ),
    );
  }
}

class ApiSnackPurchaseScreen extends ConsumerStatefulWidget {
  const ApiSnackPurchaseScreen({super.key});
  @override
  ConsumerState<ApiSnackPurchaseScreen> createState() =>
      _ApiSnackPurchaseScreenState();
}

class _ApiSnackPurchaseScreenState
    extends ConsumerState<ApiSnackPurchaseScreen> {
  String? _selected;
  Future<void> _login() async {
    try {
      await ref.read(apiSessionProvider.notifier).signIn();
      if (mounted) await ref.read(paymentControllerProvider).synchronize();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('다시 로그인하지 못했어요. 잠시 후 시도해 주세요.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = ref.watch(paymentControllerProvider);
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final storeAvailable =
            controller.storeEnabled &&
            !controller.storeUnavailable &&
            controller.billing.provider != null;
        final selected = controller.offers
            .where((o) => o.id == _selected)
            .firstOrNull;
        return FlowScreen(
          title: storeAvailable ? '간식 구매' : '간식 잔액',
          backPath: '/api/main',
          footer: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              FlowButton(
                !storeAvailable
                    ? '지금은 구매할 수 없어요'
                    : selected == null
                    ? '상품을 선택해 주세요'
                    : '간식 ${selected.snackQuantity}개 · ${_price(controller, selected)} 구매',
                onPressed: selected != null && controller.canBuy(selected)
                    ? () => controller.buy(selected)
                    : null,
              ),
              const SizedBox(height: 8),
              FlowButton(
                '기본 추천으로 돌아가기',
                secondary: true,
                onPressed: () => context.go('/api/main'),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FlowHeading(
                storeAvailable ? '간식을 충전해 주세요' : '간식 잔액을 확인하세요',
                description: storeAvailable
                    ? '원하는 패키지를 선택하세요.\n서버가 구매를 확인하면 간식이 충전돼요.'
                    : '서버 잔액과 구매 내역을 확인해요.\n현재 스토어 결제는 준비 중이에요.',
              ),
              const SizedBox(height: 16),
              Text(
                controller.wallet == null
                    ? '서버 잔액 —'
                    : '보유 간식 ${controller.wallet!.balance}개 · 사용 가능 ${controller.wallet!.availableBalance}개',
                style: AppText.body,
              ),
              if (controller.wallet?.frozen == true)
                const Text('환불 검토로 지갑 사용이 보류되어 있어요.', style: AppText.small),
              const SizedBox(height: 16),
              if (controller.busy) const LinearProgressIndicator(),
              if (!controller.storeEnabled ||
                  controller.storeUnavailable ||
                  controller.billing.provider == null)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Text(
                    '스토어 결제 준비 중이에요. 지금은 구매할 수 없어요.',
                    style: AppText.body,
                  ),
                ),
              if (controller.error != null)
                Semantics(
                  liveRegion: true,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      controller.error!.message,
                      style: AppText.small,
                    ),
                  ),
                ),
              if (controller.error?.requiresLogin == true)
                FlowButton(
                  '결제 권한으로 다시 로그인',
                  onPressed: controller.busy ? null : _login,
                ),
              if (controller.notice != null)
                Semantics(
                  liveRegion: true,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text(controller.notice!, style: AppText.small),
                  ),
                ),
              for (final offer in controller.offers)
                _offerTile(controller, offer),
              if (controller.offers.isEmpty &&
                  !controller.busy &&
                  controller.error == null &&
                  !controller.storeUnavailable)
                const Text('현재 구매 가능한 상품이 없어요.', style: AppText.small),
              const SizedBox(height: 16),
              FlowButton(
                '구매 내역 동기화',
                secondary: true,
                // Resync must be available during store pending / interrupted launch.
                onPressed:
                    controller.phase == PaymentPhase.loading ||
                        controller.phase == PaymentPhase.verifying ||
                        controller.phase == PaymentPhase.preparing
                    ? null
                    : controller.synchronize,
              ),
              const SizedBox(height: 12),
              const Text(
                '이미 충전된 소모성 구매는 서버 잔액으로 확인해요. 미완료 구매는 재검증하며, 중복 제출해도 추가 지급하지 않아요.',
                style: AppText.caption,
              ),
              const SizedBox(height: 16),
              const Text('구매 내역', style: AppText.title),
              if (controller.transactions.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Text('표시할 구매 내역이 없어요.'),
                ),
              for (final transaction in controller.transactions)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('간식 ${transaction.snackQuantity}개'),
                  subtitle: Text(
                    '${_transactionState(transaction.state)}${transaction.refundReview ? ' · 환불 검토 중' : ''}',
                  ),
                ),
              if (controller.transactions.isNotEmpty)
                TextButton(
                  onPressed: controller.busy
                      ? null
                      : controller.loadMoreTransactions,
                  child: const Text('이전 구매 내역 더 보기'),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _offerTile(PaymentController controller, SnackOffer offer) {
    final product = controller.products[offer.storeProductId];
    final unavailable = offer.storeOfferId != null
        ? '이 할인 상품은 아직 지원하지 않아요'
        : product == null
        ? '스토어에서 구매할 수 없는 상품'
        : null;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: SnackPackageTile(
        key: ValueKey('server-snack-package-${offer.id}'),
        quantity: offer.snackQuantity,
        price: _price(controller, offer),
        detail: unavailable ?? (offer.eventName ?? '스토어 결제 · 서버 검증 후 충전'),
        selected: _selected == offer.id,
        onTap: unavailable == null && controller.canBuy(offer)
            ? () => setState(() => _selected = offer.id)
            : null,
      ),
    );
  }
}

String _transactionState(String state) => switch (state) {
  'PURCHASED' => '충전 완료',
  'PENDING' => '결제 대기',
  'REFUNDED' => '환불',
  _ => '상태 확인 필요',
};

String _price(PaymentController controller, SnackOffer offer) {
  final product = controller.products[offer.storeProductId];
  return product == null
      ? '참고 ${offer.priceKrw}원'
      : '${product.price} (${product.currency})';
}
