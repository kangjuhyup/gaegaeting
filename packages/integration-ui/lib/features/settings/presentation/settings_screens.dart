import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/design/app_theme.dart';
import '../../../core/design/widgets.dart';
import '../../flow/application/flow_controller.dart';

class OwnProfileScreen extends ConsumerWidget {
  const OwnProfileScreen({super.key, required this.navigation});
  final Widget navigation;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(flowProvider);
    return FlowScreen(
      title: '프로필',
      actions: IconButton(
        tooltip: '알림 설정',
        onPressed: () => context.push('/settings/notifications'),
        icon: const DesignIcon('bell'),
      ),
      canGoBack: false,
      navigation: navigation,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FlowHeading(
            state.nickname,
            description: '${state.region} · ${state.petName}와 함께',
          ),
          const SizedBox(height: 16),
          Container(
            width: 80,
            height: 80,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.peach,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              state.nickname.contains('민지')
                  ? '민'
                  : state.nickname.characters.first,
              style: AppText.heading.copyWith(color: AppColors.primary),
            ),
          ),
          const SizedBox(height: 16),
          FlowButton(
            '내 산책 기록',
            secondary: true,
            onPressed: () =>
                context.push('/challenge/records?returnTo=%2Fprofile'),
          ),
          const SizedBox(height: 16),
          SoftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(state.petName, style: AppText.title),
                const SizedBox(height: 8),
                Text(
                  '${state.breed} · ${state.age} · ${state.sex}',
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

class NotificationSettingsScreen extends ConsumerStatefulWidget {
  const NotificationSettingsScreen({super.key});
  @override
  ConsumerState<NotificationSettingsScreen> createState() =>
      _NotificationSettingsState();
}

class _NotificationSettingsState
    extends ConsumerState<NotificationSettingsScreen> {
  late bool marketing, chat, interest, mutual;
  @override
  void initState() {
    super.initState();
    final state = ref.read(flowProvider);
    marketing = state.marketing;
    chat = state.chatNotifications;
    interest = state.interestNotifications;
    mutual = state.mutualNotifications;
  }

  @override
  Widget build(BuildContext context) => FlowScreen(
    title: '알림 설정',
    backPath: '/profile',
    footer: FlowButton(
      '설정 저장',
      onPressed: () {
        ref
            .read(flowProvider.notifier)
            .saveNotifications(
              marketing: marketing,
              chat: chat,
              interest: interest,
              mutual: mutual,
            );
        context.go('/main');
      },
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const FlowHeading('필요한 소식만 받아보세요', description: '받고 싶은 소식을 선택해 주세요.'),
        const SizedBox(height: 16),
        const Text('서비스 알림', style: AppText.title),
        const SizedBox(height: 12),
        FlowCheck(
          '관심 표현 알림',
          value: interest,
          onChanged: (v) => setState(() => interest = v),
        ),
        FlowCheck(
          '상호 관심 알림',
          value: mutual,
          onChanged: (v) => setState(() => mutual = v),
        ),
        FlowCheck(
          '새 채팅 메시지 알림',
          value: chat,
          onChanged: (v) => setState(() => chat = v),
        ),
        const SizedBox(height: 16),
        const Text('마케팅 수신 동의', style: AppText.title),
        const SizedBox(height: 12),
        FlowCheck(
          '이벤트·혜택 마케팅 메시지',
          value: marketing,
          onChanged: (v) => setState(() => marketing = v),
        ),
        const SizedBox(height: 16),
        Text(
          marketing
              ? '이벤트와 혜택 소식을 푸시 알림으로 받아요.\n언제든 체크를 해제해 수신 동의를 끌 수 있어요.\n채팅 등 서비스 알림 설정에는 영향을 주지 않아요.'
              : '가입 시 선택한 수신 동의를 여기에서 변경해요.\n끄면 이벤트와 혜택 푸시 알림을 받지 않아요.\n채팅 등 서비스 알림 설정에는 영향을 주지 않아요.',
          style: AppText.small.copyWith(color: AppColors.secondary),
        ),
      ],
    ),
  );
}
