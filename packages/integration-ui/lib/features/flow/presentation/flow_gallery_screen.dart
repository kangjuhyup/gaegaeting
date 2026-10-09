import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/design/app_theme.dart';
import '../../../core/design/widgets.dart';
import '../application/flow_controller.dart';

/// Review entry point, separate from the designed product screens.
class FlowGalleryScreen extends ConsumerWidget {
  const FlowGalleryScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => FlowScreen(
    title: '플로우 미리보기',
    backPath: '/',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const FlowHeading(
          '개개팅 화면 둘러보기',
          description: 'Figma의 화면과 이동을 확인하는 미리보기입니다.\n인증번호는 123456이며 SMS·카카오 인증·결제는\n진행되지 않습니다. 관심·채팅은 다른 사용자에게\n전송되지 않습니다. 입력과 간식은 현재 세션에만\n보관되며 새로고침하면 초기화됩니다.',
        ),
        const SizedBox(height: 24),
        for (final group in [
          (
            '가입·인증',
            [
              ('회원가입', '/'),
              ('휴대폰 가입', '/signup/phone'),
              ('휴대폰 인증', '/signup/verify'),
              ('가입 동의', '/signup/agreements'),
              ('로그인', '/login'),
              ('휴대폰 로그인', '/login/phone'),
            ],
          ),
          (
            '프로필 등록',
            [
              ('내 프로필 등록', '/onboarding/profile'),
              ('강아지 등록', '/onboarding/pet'),
            ],
          ),
          (
            '추천·열람',
            [
              ('메인', '/main'),
              ('동네 친구 10명', '/recommendations'),
              ('간식 사용 확인', '/recommendations/1/unlock'),
              ('간식 부족', '/snacks/insufficient?profile=2'),
              ('간식 패키지 선택', '/snacks/purchase'),
            ],
          ),
          (
            '관심·채팅',
            [
              ('받은 관심 없음', '/likes'),
              ('관심 보냄', '/likes?tab=sent'),
              ('받은 관심', '/likes?fixture=received'),
              ('서로 관심', '/likes?tab=mutual&fixture=mutual'),
              ('채팅 목록', '/chats'),
              ('관심 알림', '/notifications'),
            ],
          ),
          (
            '프로필·알림',
            [('내 프로필', '/profile'), ('알림·마케팅 설정', '/settings/notifications')],
          ),
        ]) ...[
          Text(group.$1, style: AppText.title),
          const SizedBox(height: 12),
          for (final link in group.$2)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: FlowButton(
                link.$1,
                secondary: true,
                onPressed: () {
                  if (link.$2.startsWith('/snacks/insufficient')) {
                    ref.read(flowProvider.notifier).previewEmptyWallet();
                  }
                  if (link.$1 == '받은 관심 없음' ||
                      link.$1 == '관심 보냄' ||
                      link.$2.contains('fixture=')) {
                    ref.read(flowProvider.notifier).previewClearInterests();
                  }
                  if (link.$2.contains('fixture=received')) {
                    ref
                        .read(flowProvider.notifier)
                        .previewReceivedInterest('received');
                  }
                  if (link.$2.contains('fixture=mutual')) {
                    ref.read(flowProvider.notifier).sendInterest('1');
                    ref
                        .read(flowProvider.notifier)
                        .previewReceivedInterest('1');
                  }
                  if (link.$1 == '관심 보냄') {
                    ref.read(flowProvider.notifier).sendInterest('1');
                  }
                  context.push(link.$2);
                },
              ),
            ),
          const SizedBox(height: 16),
        ],
        FlowButton(
          '미리보기 처음부터 시작',
          onPressed: () {
            ref.read(flowProvider.notifier).reset();
            context.go('/');
          },
        ),
      ],
    ),
  );
}
