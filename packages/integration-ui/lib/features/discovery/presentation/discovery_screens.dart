import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/design/app_theme.dart';
import '../../../core/design/widgets.dart';
import '../../flow/application/flow_controller.dart';
import '../domain/friend_profile.dart';

class MainScreen extends ConsumerStatefulWidget {
  const MainScreen({super.key, this.navigation});
  final Widget? navigation;

  @override
  ConsumerState<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends ConsumerState<MainScreen> {
  @override
  Widget build(BuildContext context) => FlowScreen(
    title: '추천',
    titleWidget: const Align(
      alignment: Alignment.centerLeft,
      child: SizedBox(
        width: 48,
        height: 48,
        child: Center(child: DesignIcon('paw')),
      ),
    ),
    actions: SnackPill(count: ref.watch(flowProvider).snacks),
    canGoBack: false,
    navigation: widget.navigation,
    contentTopPadding: 16,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(child: Text('추천', style: AppText.heading)),
            IconButton(
              tooltip: '내 동네 친구들 추천받기',
              constraints: const BoxConstraints(minWidth: 48, minHeight: 32),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              onPressed: () => context.go('/recommendations'),
              icon: const DesignIcon('filter'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        for (final friend in recommendedFriends.take(2)) ...[
          _BasicFriendCard(
            friend: friend,
            liked: ref.watch(flowProvider).sentInterests.contains(friend.id),
            onLike: () {
              ref.read(flowProvider.notifier).sendInterest(friend.id);
              context.go('/likes?tab=sent');
            },
          ),
          const SizedBox(height: 16),
        ],
      ],
    ),
  );
}

class _BasicFriendCard extends StatelessWidget {
  const _BasicFriendCard({
    required this.friend,
    required this.liked,
    required this.onLike,
  });
  final FriendProfile friend;
  final bool liked;
  final VoidCallback onLike;

  @override
  Widget build(BuildContext context) => Container(
    clipBehavior: Clip.antiAlias,
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: AppColors.divider),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const PetPhoto(radius: 0),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(friend.name, style: AppText.title),
              const SizedBox(height: 8),
              Text(
                '${friend.region} · 1.2km',
                style: AppText.small.copyWith(color: AppColors.secondary),
              ),
              const SizedBox(height: 12),
              const FlowPill('프로필 인증', success: true),
              const SizedBox(height: 16),
              const Text('골든 리트리버 · 3살 · 산책을 좋아해요', style: AppText.body),
              const SizedBox(height: 16),
              const Text('함께 좋아하는 것', style: AppText.small),
              const SizedBox(height: 8),
              const Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [_InterestChip('저녁 산책'), _InterestChip('한강 산책')],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: FlowButton(
                      liked ? '관심 보냄' : '관심 표현하기',
                      secondary: true,
                      onPressed: onLike,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FlowButton(
                      '프로필 보기',
                      onPressed: () =>
                          context.push('/recommendations/${friend.id}/unlock'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class NeighborhoodScreen extends ConsumerWidget {
  const NeighborhoodScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(flowProvider);
    return FlowScreen(
      title: '내 동네 친구들',
      backPath: '/main',
      footer: FlowButton(
        '기본 추천으로 돌아가기',
        secondary: true,
        onPressed: () => context.go('/main'),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const FlowHeading(
            '내 동네 친구 10명',
            description: '가까운 곳에서 함께 산책할 친구들이에요.',
          ),
          const SizedBox(height: 16),
          FlowPill('보유 간식 ${state.snacks}개'),
          const SizedBox(height: 12),
          Text(
            '프로필 1명을 열 때 간식 2개를 사용해요.\n이미 열린 프로필은 추가 차감 없이 다시 볼 수 있어요.',
            style: AppText.small.copyWith(color: AppColors.secondary),
          ),
          const SizedBox(height: 16),
          LayoutBuilder(
            builder: (context, constraints) => Wrap(
              spacing: 12,
              runSpacing: 16,
              children: [
                for (final friend in recommendedFriends)
                  SizedBox(
                    width: (constraints.maxWidth - 12) / 2,
                    child: _NeighborhoodCard(
                      friend: friend,
                      opened: state.opened.contains(friend.id),
                      onPressed: () => context.push(
                        state.opened.contains(friend.id)
                            ? '/recommendations/${friend.id}/profile'
                            : state.snacks >= 2
                            ? '/recommendations/${friend.id}/unlock'
                            : '/snacks/insufficient?profile=${friend.id}',
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NeighborhoodCard extends StatelessWidget {
  const _NeighborhoodCard({
    required this.friend,
    required this.opened,
    required this.onPressed,
  });
  final FriendProfile friend;
  final bool opened;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Container(
    key: ValueKey('friend-${friend.id}'),
    clipBehavior: Clip.antiAlias,
    decoration: BoxDecoration(
      border: Border.all(color: AppColors.divider),
      borderRadius: BorderRadius.circular(16),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (opened)
          const PetPhoto(height: 144, radius: 0)
        else
          const _LockedPhoto(),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                friend.name,
                style: AppText.body.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                friend.region,
                style: AppText.caption.copyWith(color: AppColors.secondary),
              ),
              const SizedBox(height: 8),
              FlowPill(
                opened ? '열람 완료' : '간식 2개',
                success: opened,
                neutral: !opened,
              ),
              const SizedBox(height: 12),
              FlowButton(
                opened ? '다시 보기' : '프로필 열기',
                secondary: opened,
                onPressed: onPressed,
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _LockedPhoto extends StatelessWidget {
  const _LockedPhoto();

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    height: 144,
    color: AppColors.subtle,
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const DesignIcon('lock', size: 32),
        const SizedBox(height: 8),
        Text('프로필 잠김', style: AppText.caption.copyWith(color: AppColors.muted)),
      ],
    ),
  );
}

class UnlockConfirmationScreen extends ConsumerWidget {
  const UnlockConfirmationScreen({super.key, required this.profileId});
  final String profileId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final friend = findFriend(profileId);
    if (friend == null) return const _UnknownProfileScreen();
    final state = ref.watch(flowProvider);
    if (state.opened.contains(profileId)) {
      return FriendProfileScreen(profileId: profileId);
    }
    if (state.snacks < 2) return InsufficientSnacksScreen(profileId: profileId);
    return FlowScreen(
      title: '프로필 열람',
      backPath: '/recommendations',
      footer: Column(
        children: [
          FlowButton(
            '간식 2개 사용하고 열기',
            onPressed: () {
              if (ref.read(flowProvider.notifier).unlock(profileId)) {
                context.go('/recommendations/$profileId/profile');
              } else {
                context.go('/snacks/insufficient?profile=$profileId');
              }
            },
          ),
          const SizedBox(height: 8),
          FlowButton(
            '나중에 보기',
            secondary: true,
            onPressed: () => context.go('/recommendations'),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FlowPill('보유 간식 ${state.snacks}개'),
          const SizedBox(height: 16),
          FlowHeading(
            '이 친구의 프로필을 열까요?',
            description: '${friend.name}님의 프로필을 볼 수 있어요.',
          ),
          const SizedBox(height: 16),
          Container(
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.divider),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _LockedPhoto(),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(friend.name, style: AppText.title),
                      const SizedBox(height: 8),
                      Text(
                        friend.region,
                        style: AppText.small.copyWith(
                          color: AppColors.secondary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      const FlowPill('간식 2개', neutral: true),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SoftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '사용 간식 · 2개',
                  style: AppText.body.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 12),
                Text(
                  '사용 후 남는 간식 · ${state.snacks - 2}개',
                  style: AppText.small.copyWith(color: AppColors.secondary),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            '선택한 1명의 프로필만 열려요.\n취소하면 간식을 사용하지 않아요.',
            style: AppText.caption.copyWith(color: AppColors.secondary),
          ),
        ],
      ),
    );
  }
}

class FriendProfileScreen extends ConsumerWidget {
  const FriendProfileScreen({super.key, required this.profileId});
  final String profileId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final friend = findFriend(profileId);
    if (friend == null) return const _UnknownProfileScreen();
    final state = ref.watch(flowProvider);
    if (!state.opened.contains(profileId)) {
      return FlowScreen(
        title: '프로필 열람',
        backPath: '/recommendations',
        footer: FlowButton(
          '프로필 열기',
          onPressed: () => context.go(
            state.snacks >= 2
                ? '/recommendations/$profileId/unlock'
                : '/snacks/insufficient?profile=$profileId',
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const FlowHeading(
              '아직 열지 않은 프로필이에요',
              description: '간식 2개를 사용해 이 친구의 프로필을 볼 수 있어요.',
            ),
            const SizedBox(height: 16),
            const _LockedPhoto(),
            const SizedBox(height: 16),
            Text(friend.name, style: AppText.title),
          ],
        ),
      );
    }
    return FlowScreen(
      title: '프로필',
      backPath: '/recommendations',
      footer: Column(
        children: [
          FlowButton(
            state.sentInterests.contains(profileId) ? '관심 보냄' : '관심 표현하기',
            onPressed: () {
              ref.read(flowProvider.notifier).sendInterest(profileId);
              context.go('/likes?tab=sent');
            },
          ),
          const SizedBox(height: 8),
          FlowButton(
            '추천 목록으로 돌아가기',
            secondary: true,
            onPressed: () => context.go('/recommendations'),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const FlowPill('열람 완료 · 추가 차감 없음', success: true),
          const SizedBox(height: 16),
          const ClipRRect(
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            child: PetPhoto(radius: 0),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(friend.name, style: AppText.title),
                const SizedBox(height: 8),
                Text(
                  friend.region,
                  style: AppText.small.copyWith(color: AppColors.secondary),
                ),
                const SizedBox(height: 8),
                const FlowPill('프로필 인증', success: true),
                const SizedBox(height: 16),
                const Text('골든 리트리버 · 3살', style: AppText.body),
                const SizedBox(height: 16),
                const Text('함께 좋아하는 것', style: AppText.small),
                const SizedBox(height: 8),
                const Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [_InterestChip('저녁 산책'), _InterestChip('한강 산책')],
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          SoftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('같이 산책해요', style: AppText.title),
                const SizedBox(height: 12),
                Text(
                  '평일 저녁에는 동네 공원을 걷고,\n주말에는 한강 산책을 좋아해요.',
                  style: AppText.small.copyWith(color: AppColors.secondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InterestChip extends StatelessWidget {
  const _InterestChip(this.label);
  final String label;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    decoration: BoxDecoration(
      color: AppColors.subtle,
      borderRadius: BorderRadius.circular(999),
    ),
    child: Text(label, style: AppText.caption),
  );
}

class InsufficientSnacksScreen extends ConsumerWidget {
  const InsufficientSnacksScreen({super.key, required this.profileId});
  final String profileId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (findFriend(profileId) == null) return const _UnknownProfileScreen();
    final state = ref.watch(flowProvider);
    return FlowScreen(
      title: '프로필 열람',
      backPath: '/recommendations',
      footer: Column(
        children: [
          FlowButton(
            '간식 구매하기',
            onPressed: () => context.go('/snacks/purchase?profile=$profileId'),
          ),
          const SizedBox(height: 8),
          FlowButton(
            '기본 추천으로 돌아가기',
            secondary: true,
            onPressed: () => context.go('/main'),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DesignIcon('snack', size: 48, color: AppColors.primary),
          const SizedBox(height: 16),
          const FlowHeading(
            '간식이 부족해요',
            description: '프로필 1명을 보려면 간식 2개가 필요해요.',
          ),
          const SizedBox(height: 16),
          FlowPill('보유 간식 ${state.snacks}개'),
          const SizedBox(height: 16),
          Text(
            '간식을 구매한 뒤 원하는 친구의 프로필을 열어보세요.\n이미 열린 프로필은 추가 차감 없이 다시 볼 수 있어요.',
            style: AppText.small.copyWith(color: AppColors.secondary),
          ),
        ],
      ),
    );
  }
}

class SnackPurchaseScreen extends ConsumerStatefulWidget {
  const SnackPurchaseScreen({super.key, this.profileId});
  final String? profileId;

  @override
  ConsumerState<SnackPurchaseScreen> createState() =>
      _SnackPurchaseScreenState();
}

class _SnackPurchaseScreenState extends ConsumerState<SnackPurchaseScreen> {
  int _selected = 10;
  static const _packages = [
    (count: 10, price: '2,000', detail: '5명 열람 · 1개당 200원'),
    (count: 50, price: '6,000', detail: '25명 열람 · 1개당 120원'),
    (count: 100, price: '10,000', detail: '50명 열람 · 1개당 100원'),
  ];

  Future<void> _showPaymentPreview() async {
    final count = _selected;
    final preview = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            24,
            8,
            24,
            24 + MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('결제 연동 준비 중', style: AppText.title),
              const SizedBox(height: 16),
              Text(
                '이 화면에서는 실제 결제나 과금이 발생하지 않아요.\n간식 $count개를 충전한 뒤의 화면 흐름을 미리 볼 수 있어요.',
                style: AppText.small.copyWith(color: AppColors.secondary),
              ),
              const SizedBox(height: 16),
              FlowButton(
                '충전 후 흐름 미리보기',
                onPressed: () => Navigator.of(context).pop(true),
              ),
              const SizedBox(height: 12),
              FlowButton(
                '닫기',
                secondary: true,
                onPressed: () => Navigator.of(context).pop(false),
              ),
            ],
          ),
        ),
      ),
    );
    if (!mounted || preview != true) return;
    ref.read(flowProvider.notifier).previewTopUp(count);
    final id = widget.profileId;
    context.go(
      id != null && findFriend(id) != null
          ? ref.read(flowProvider).opened.contains(id)
                ? '/recommendations/$id/profile'
                : '/recommendations/$id/unlock'
          : '/recommendations',
    );
  }

  @override
  Widget build(BuildContext context) {
    final selected = _packages.firstWhere(
      (package) => package.count == _selected,
    );
    return FlowScreen(
      title: '간식 구매',
      backPath: '/recommendations',
      footer: Column(
        children: [
          FlowButton(
            '간식 ${selected.count}개 · ${selected.price}원 구매',
            onPressed: _showPaymentPreview,
          ),
          const SizedBox(height: 8),
          FlowButton(
            '기본 추천으로 돌아가기',
            secondary: true,
            onPressed: () => context.go('/main'),
          ),
        ],
      ),
      child: RadioGroup<int>(
        groupValue: _selected,
        onChanged: (value) {
          if (value != null) setState(() => _selected = value);
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const FlowHeading(
              '간식을 충전해 주세요',
              description: '원하는 패키지를 선택하세요.\n간식 2개로 친구 1명의 프로필을 볼 수 있어요.',
            ),
            const SizedBox(height: 16),
            for (final package in _packages) ...[
              SnackPackageTile(
                key: ValueKey('snack-package-${package.count}'),
                quantity: package.count,
                price: '${package.price}원',
                detail: package.detail,
                selected: _selected == package.count,
                onTap: () => setState(() => _selected = package.count),
              ),
              const SizedBox(height: 12),
            ],
            const SizedBox(height: 4),
            Text(
              '프로필을 열 때만 간식이 사용돼요.',
              style: AppText.small.copyWith(color: AppColors.secondary),
            ),
          ],
        ),
      ),
    );
  }
}

class _UnknownProfileScreen extends StatelessWidget {
  const _UnknownProfileScreen();

  @override
  Widget build(BuildContext context) => FlowScreen(
    title: '프로필',
    backPath: '/recommendations',
    footer: FlowButton(
      '추천 목록으로 돌아가기',
      onPressed: () => context.go('/recommendations'),
    ),
    child: const FlowHeading(
      '프로필을 찾을 수 없어요',
      description: '추천 목록에서 친구를 다시 선택해 주세요.',
    ),
  );
}
