import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config/app_config.dart';
import '../../../core/design/widgets.dart';
import '../../../core/design/app_theme.dart';
import '../../account/data/account_repository.dart';
import '../application/challenge_providers.dart';
import '../data/challenge_repository.dart';
import '../data/preview_challenge_api.dart';

export 'package:flutter/material.dart';
export 'package:flutter_riverpod/flutter_riverpod.dart';
export 'package:go_router/go_router.dart';

export '../../../core/design/widgets.dart';
export '../../../core/design/app_theme.dart';
export '../application/challenge_providers.dart';
export '../domain/challenge_models.dart';

String challengePath(bool api, String tail, {String? returnTo}) => Uri(
  path: '${api ? '/api' : ''}/challenge$tail',
  queryParameters: returnTo == null ? null : {'returnTo': returnTo},
).toString();

abstract class ChallengeState<T extends ConsumerStatefulWidget>
    extends ConsumerState<T> {
  bool loading = true, busy = false;
  String? error;
  bool needsLogin = false;
  bool get apiMode =>
      ref.read(appConfigProvider).apiEnabled &&
      GoRouterState.of(context).uri.path.startsWith('/api/challenge');
  ChallengeApi get api =>
      apiMode ? ref.read(challengeApiProvider) : PreviewChallengeApi();
  String backTo(String fallback) =>
      GoRouterState.of(context).uri.queryParameters['returnTo'] ??
      challengePath(apiMode, fallback);
  Future<void> run(Future<void> Function() action, {bool load = false}) async {
    if (busy) return;
    if (mounted) {
      setState(() {
        busy = true;
        if (load) loading = true;
        error = null;
        needsLogin = false;
      });
    }
    try {
      await action();
    } catch (e) {
      if (mounted) {
        setState(() {
          error = apiErrorMessage(e);
          needsLogin = e is ApiFailure && e.requiresLogin;
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          busy = false;
          loading = false;
        });
      }
    }
  }

  Widget notice() => error == null
      ? const SizedBox.shrink()
      : Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Semantics(
            liveRegion: true,
            child: SoftCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(error!, style: AppText.small),
                  if (needsLogin)
                    TextButton(
                      onPressed: () => context.push(
                        Uri(
                          path: '/api/login',
                          queryParameters: {
                            'returnTo': GoRouterState.of(context).uri
                                .toString(),
                          },
                        ).toString(),
                      ),
                      child: const Text('다시 로그인'),
                    ),
                ],
              ),
            ),
          ),
        );
  Widget body(List<Widget> children) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      if (loading) const LinearProgressIndicator(),
      notice(),
      ...children,
    ],
  );
  Future<bool> confirm(
    String title,
    String description, {
    String action = '확인',
  }) async =>
      await showDialog<bool>(
        context: context,
        builder: (c) => AlertDialog(
          title: Text(title),
          content: Text(description),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(c, false),
              child: const Text('계속하기'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(c, true),
              child: Text(action),
            ),
          ],
        ),
      ) ??
      false;
  void go(String tail, {String? returnTo}) => context.push(
    challengePath(
      apiMode,
      tail,
      returnTo: returnTo ?? GoRouterState.of(context).uri.toString(),
    ),
  );
}

class ChallengeCard extends StatelessWidget {
  const ChallengeCard(
    this.title, {
    super.key,
    this.description,
    this.onTap,
    this.peach = false,
    this.child,
  });
  final String title;
  final String? description;
  final VoidCallback? onTap;
  final bool peach;
  final Widget? child;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Semantics(
      button: onTap != null,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: peach ? AppColors.peach : AppColors.subtle,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppText.body.copyWith(fontWeight: FontWeight.w700),
              ),
              if (description != null) ...[
                const SizedBox(height: 8),
                Text(
                  description!,
                  style: AppText.small.copyWith(color: AppColors.secondary),
                ),
              ],
              if (child != null) ...[const SizedBox(height: 12), child!],
            ],
          ),
        ),
      ),
    ),
  );
}

class ChallengeEmpty extends StatelessWidget {
  const ChallengeEmpty(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 24),
    child: Text(
      text,
      style: AppText.small.copyWith(color: AppColors.secondary),
    ),
  );
}
