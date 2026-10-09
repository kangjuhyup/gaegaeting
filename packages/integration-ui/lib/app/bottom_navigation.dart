import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/design/app_theme.dart';
import '../core/design/widgets.dart';

class AppBottomNavigation extends StatelessWidget {
  const AppBottomNavigation({
    super.key,
    required this.selected,
    this.apiMode = false,
  });
  final String selected;
  final bool apiMode;
  static const items = [
    ('추천', 'paw', '/main'),
    ('관심', 'heart', '/likes'),
    ('챌린지', 'trophy', '/challenge'),
    ('채팅', 'chat', '/chats'),
    ('프로필', 'user', '/profile'),
  ];
  @override
  Widget build(BuildContext context) => Container(
    decoration: const BoxDecoration(
      color: Colors.white,
      border: Border(top: BorderSide(color: AppColors.divider)),
    ),
    padding: EdgeInsets.only(
      bottom: MediaQuery.viewPaddingOf(context).bottom > 34
          ? MediaQuery.viewPaddingOf(context).bottom
          : 34,
    ),
    child: Row(
      children: [
        for (final item in items)
          Expanded(
            child: Semantics(
              selected: selected == item.$3,
              child: InkWell(
                onTap: () => context.go(
                  apiMode
                      ? (item.$3 == '/profile' ? '/api/me' : '/api${item.$3}')
                      : item.$3,
                ),
                child: SizedBox(
                  height: 72,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      DesignIcon(
                        item.$2,
                        color: selected == item.$3
                            ? AppColors.primary
                            : AppColors.secondary,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item.$1,
                        style: AppText.caption.copyWith(
                          color: selected == item.$3
                              ? AppColors.primary
                              : AppColors.secondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    ),
  );
}

class PendingTabScreen extends StatelessWidget {
  const PendingTabScreen({
    super.key,
    required this.title,
    required this.path,
    this.apiMode = false,
  });
  final String title, path;
  final bool apiMode;
  @override
  Widget build(BuildContext context) => FlowScreen(
    title: title,
    canGoBack: false,
    navigation: AppBottomNavigation(selected: path, apiMode: apiMode),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FlowHeading(
          '$title 화면을 준비하고 있어요',
          description: '이번 플로우에서는 가입, 프로필 등록과\n산책 친구 추천 화면을 둘러볼 수 있어요.',
        ),
        const SizedBox(height: 24),
        FlowButton(
          '추천 친구 보러 가기',
          onPressed: () => context.go(apiMode ? '/api/main' : '/main'),
        ),
      ],
    ),
  );
}
