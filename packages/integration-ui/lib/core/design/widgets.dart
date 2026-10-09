import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import 'app_theme.dart';

class DesignIcon extends StatelessWidget {
  const DesignIcon(
    this.name, {
    super.key,
    this.size = 24,
    this.color = AppColors.text,
  });
  final String name;
  final double size;
  final Color color;
  @override
  Widget build(BuildContext context) => SvgPicture.asset(
    'assets/icons/$name.svg',
    width: size,
    height: size,
    colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
    excludeFromSemantics: true,
  );
}

class FlowScreen extends StatelessWidget {
  const FlowScreen({
    super.key,
    required this.title,
    required this.child,
    this.footer,
    this.navigation,
    this.backPath,
    this.canGoBack = true,
    this.actions,
    this.titleWidget,
    this.contentHeader,
    this.contentTopPadding = 16,
    this.scrollController,
  });
  final String title;
  final Widget child;
  final Widget? footer, navigation, actions, titleWidget, contentHeader;
  final String? backPath;
  final bool canGoBack;
  final double contentTopPadding;
  final ScrollController? scrollController;
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: const Color(0xFFF1F0EE),
    body: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 430),
        child: Material(
          color: Colors.white,
          child: SafeArea(
            bottom: false,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  height: 64,
                  child: Row(
                    children: [
                      if (canGoBack)
                        Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: SizedBox(
                            width: 48,
                            height: 48,
                            child: IconButton(
                              tooltip: '뒤로',
                              onPressed: () {
                                if (context.canPop()) {
                                  context.pop();
                                } else {
                                  context.go(backPath ?? '/');
                                }
                              },
                              icon: const DesignIcon(
                                'back',
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ),
                      if (canGoBack)
                        const SizedBox(width: 8)
                      else
                        const SizedBox(width: 16),
                      Expanded(
                        child:
                            titleWidget ?? Text(title, style: AppText.heading),
                      ),
                      if (actions != null)
                        actions!
                      else
                        const SizedBox(width: 16),
                    ],
                  ),
                ),
                ?contentHeader,
                Expanded(
                  child: SingleChildScrollView(
                    key: const ValueKey('flow-scroll'),
                    controller: scrollController,
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    padding: EdgeInsets.fromLTRB(16, contentTopPadding, 16, 24),
                    child: child,
                  ),
                ),
                if (footer != null)
                  Padding(
                    padding: EdgeInsets.fromLTRB(
                      16,
                      16,
                      16,
                      navigation != null
                          ? 16
                          : MediaQuery.viewPaddingOf(context).bottom > 34
                          ? MediaQuery.viewPaddingOf(context).bottom
                          : 34,
                    ),
                    child: footer,
                  ),
                ?navigation,
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class RecommendationTabs extends StatelessWidget {
  const RecommendationTabs({
    super.key,
    required this.onNearby,
    this.nearby = false,
    this.onRecommended,
  });
  final VoidCallback onNearby;
  final VoidCallback? onRecommended;
  final bool nearby;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16),
    child: SizedBox(
      height: 52,
      child: Row(
        children: [
          for (final tab in [
            ('추천 친구', false, onRecommended),
            ('가까운 친구', true, onNearby),
          ]) ...[
            Flexible(
              child: InkWell(
                onTap: tab.$3,
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Container(
                    padding: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                          color: nearby == tab.$2
                              ? AppColors.brand
                              : Colors.transparent,
                          width: 2,
                        ),
                      ),
                    ),
                    child: Text(
                      tab.$1,
                      style: AppText.title.copyWith(
                        color: nearby == tab.$2
                            ? AppColors.text
                            : AppColors.secondary,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
          ],
        ],
      ),
    ),
  );
}

class SnackPill extends StatelessWidget {
  const SnackPill({super.key, this.count});
  final int? count;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(right: 16),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.peach,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const DesignIcon('snack'),
          const SizedBox(width: 8),
          Text(
            count == null ? '간식 —' : '간식 $count개',
            style: AppText.small.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    ),
  );
}

class FlowButton extends StatelessWidget {
  const FlowButton(
    this.label, {
    super.key,
    required this.onPressed,
    this.secondary = false,
    this.kakao = false,
  });
  final String label;
  final VoidCallback? onPressed;
  final bool secondary, kakao;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    height: kakao ? 56 : 52,
    child: FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: kakao
            ? const Color(0xFFFEE500)
            : secondary
            ? AppColors.subtle
            : AppColors.primary,
        foregroundColor: secondary || kakao ? AppColors.text : Colors.white,
        disabledBackgroundColor: const Color(0xFFE8E0D5),
        disabledForegroundColor: AppColors.muted,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: AppText.body,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (kakao) ...[
            const DesignIcon('kakao-symbol', size: 20, color: Colors.black),
            const SizedBox(width: 8),
          ],
          Flexible(child: Text(label, textAlign: TextAlign.center)),
        ],
      ),
    ),
  );
}

class FlowHeading extends StatelessWidget {
  const FlowHeading(this.title, {super.key, this.description});
  final String title;
  final String? description;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(title, style: AppText.heading),
      if (description != null) ...[
        const SizedBox(height: 16),
        Text(
          description!,
          style: AppText.small.copyWith(color: AppColors.secondary),
        ),
      ],
    ],
  );
}

class FlowPill extends StatelessWidget {
  const FlowPill(
    this.label, {
    super.key,
    this.success = false,
    this.neutral = false,
  });
  final String label;
  final bool success, neutral;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: success
          ? AppColors.successBackground
          : neutral
          ? AppColors.subtle
          : AppColors.peach,
      borderRadius: BorderRadius.circular(999),
    ),
    child: Text(
      label,
      style: AppText.caption.copyWith(
        color: success
            ? AppColors.success
            : neutral
            ? AppColors.secondary
            : AppColors.primary,
      ),
    ),
  );
}

class FlowField extends StatelessWidget {
  const FlowField(
    this.label, {
    super.key,
    required this.controller,
    this.hint,
    this.keyboardType,
    this.maxLength,
    this.onChanged,
    this.error,
    this.digitsOnly = false,
    this.obscureText = false,
  });
  final String label;
  final TextEditingController controller;
  final String? hint, error;
  final TextInputType? keyboardType;
  final int? maxLength;
  final ValueChanged<String>? onChanged;
  final bool digitsOnly;
  final bool obscureText;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: AppText.small),
      const SizedBox(height: 8),
      Semantics(
        label: label,
        child: TextField(
          obscureText: obscureText,
          enableSuggestions: !obscureText,
          autocorrect: !obscureText,
          controller: controller,
          onChanged: onChanged,
          keyboardType: keyboardType,
          maxLength: maxLength,
          inputFormatters: digitsOnly
              ? [FilteringTextInputFormatter.digitsOnly]
              : null,
          style: AppText.body,
          decoration: InputDecoration(
            hintText: hint,
            errorText: error,
            counterText: '',
          ),
        ),
      ),
    ],
  );
}

class FlowCheck extends StatelessWidget {
  const FlowCheck(
    this.label, {
    super.key,
    required this.value,
    required this.onChanged,
  });
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: () => onChanged(!value),
    borderRadius: BorderRadius.circular(8),
    child: ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 48),
      child: Row(
        children: [
          SizedBox(
            width: 24,
            height: 24,
            child: Checkbox(
              value: value,
              onChanged: (v) => onChanged(v ?? false),
              activeColor: AppColors.primary,
              side: const BorderSide(color: AppColors.muted),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: AppText.small)),
        ],
      ),
    ),
  );
}

class SoftCard extends StatelessWidget {
  const SoftCard({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppColors.subtle,
      borderRadius: BorderRadius.circular(12),
    ),
    child: child,
  );
}

class PetPhoto extends StatelessWidget {
  const PetPhoto({
    super.key,
    this.ownPet = false,
    this.height = 264,
    this.radius = 20,
  });
  final bool ownPet;
  final double height, radius;
  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(radius),
    child: Image.asset(
      ownPet
          ? 'assets/images/pet-golden.png'
          : 'assets/images/friend-golden.jpg',
      height: height,
      width: double.infinity,
      fit: BoxFit.cover,
      excludeFromSemantics: true,
    ),
  );
}

class FlowChoice extends StatelessWidget {
  const FlowChoice({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final bool selected;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(999),
    child: Container(
      height: 48,
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: selected ? AppColors.peach : AppColors.subtle,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: selected ? AppColors.primary : Colors.transparent,
        ),
      ),
      child: Text(
        label,
        style: AppText.small.copyWith(
          color: selected ? AppColors.primary : AppColors.secondary,
        ),
      ),
    ),
  );
}

/// Shared Figma package card; server mode supplies every commercial value.
class SnackPackageTile extends StatelessWidget {
  const SnackPackageTile({
    super.key,
    required this.quantity,
    required this.price,
    required this.detail,
    required this.selected,
    required this.onTap,
  });
  final int quantity;
  final String price, detail;
  final bool selected;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: selected,
    enabled: onTap != null,
    label: '간식 $quantity개, $price, $detail',
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        constraints: BoxConstraints(minHeight: selected ? 92 : 90),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected ? AppColors.peach : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.divider,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 20,
              height: 20,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: selected ? AppColors.primary : AppColors.muted,
                  width: 2,
                ),
              ),
              child: selected
                  ? const DecoratedBox(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.primary,
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          '간식 $quantity개',
                          style: AppText.body.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Flexible(
                        fit: FlexFit.tight,
                        child: Text(
                          price,
                          textAlign: TextAlign.end,
                          style: AppText.body.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    detail,
                    style: AppText.caption.copyWith(color: AppColors.secondary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
