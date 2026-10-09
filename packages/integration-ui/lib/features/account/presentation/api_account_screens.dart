import 'package:flutter/material.dart';

import '../../payment/presentation/snack_purchase_screen.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/bottom_navigation.dart';
import '../../../core/design/app_theme.dart';
import '../../../core/design/widgets.dart';
import '../application/api_session.dart';
import '../data/account_repository.dart';
import 'api_auth_screens.dart';
import '../application/profile_providers.dart';

class ApiProfileScreen extends ConsumerStatefulWidget {
  const ApiProfileScreen({super.key, required this.account});
  final AccountSnapshot account;
  @override
  ConsumerState<ApiProfileScreen> createState() => _ApiProfileScreenState();
}

class _ApiProfileScreenState extends ConsumerState<ApiProfileScreen> {
  late final _nickname = TextEditingController(
    text: widget.account.profile?.nickname ?? '',
  );
  late final _bio = TextEditingController(
    text: widget.account.profile?.bio ?? '',
  );
  late String _region = widget.account.profile?.region ?? 'SEOUL';
  bool _busy = false;
  String? _error;
  Future<void> _save() async {
    if (_nickname.text.trim().isEmpty) {
      setState(() => _error = '닉네임을 입력해 주세요.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(accountRepositoryProvider).saveProfile({
        'nickname': _nickname.text.trim(),
        'region': _region,
        'bio': _bio.text.trim(),
      }, id: widget.account.profile?.id);
      final account = await ref.read(apiSessionProvider.notifier).reload();
      if (mounted) {
        final returnTo = GoRouterState.of(context)
            .uri
            .queryParameters['returnTo'];
        context.go(
          returnTo != null &&
                  returnTo.startsWith('/api/') &&
                  !returnTo.contains('://')
              ? returnTo
              : account.destination,
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _nickname.dispose();
    _bio.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FlowScreen(
    title: widget.account.profile == null ? '내 프로필 등록' : '내 프로필 수정',
    backPath: widget.account.profile == null ? '/api/login' : '/api/me',
    footer: FlowButton(
      _busy
          ? '저장 중…'
          : widget.account.pets.isEmpty
          ? '저장하고 강아지 등록'
          : '저장하기',
      onPressed: _busy ? null : _save,
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FlowPill(widget.account.profile == null ? '프로필 등록 · 1/2' : '프로필 수정'),
        const SizedBox(height: 16),
        const FlowHeading('나를 소개해 주세요', description: '친구들에게 보여줄 내 프로필이에요.'),
        const SizedBox(height: 16),
        Row(
          children: [
            _ServerAvatar(
              images: widget.account.profile?.images ?? const [],
              name: _nickname.text,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                '프로필 사진은 나중에 추가해도 돼요.',
                style: AppText.small.copyWith(color: AppColors.secondary),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        FlowField(
          '닉네임',
          controller: _nickname,
          hint: '산책하는 민지',
          maxLength: 50,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 16),
        _LabeledSelect(
          label: '활동 지역',
          value: _region,
          values: regions,
          onChanged: _busy ? null : (v) => setState(() => _region = v!),
        ),
        const SizedBox(height: 16),
        FlowField(
          '한 줄 소개 (선택)',
          controller: _bio,
          hint: '하루와 함께 저녁 산책을 좋아해요.',
          maxLength: 120,
        ),
        ApiError(_error),
      ],
    ),
  );
}

class ApiPetScreen extends ConsumerStatefulWidget {
  const ApiPetScreen({
    super.key,
    required this.account,
    this.pet,
    this.expectedPetId,
  });
  final ServerPet? pet;
  final int? expectedPetId;
  final AccountSnapshot account;
  @override
  ConsumerState<ApiPetScreen> createState() => _ApiPetScreenState();
}

class _ApiPetScreenState extends ConsumerState<ApiPetScreen> {
  final _name = TextEditingController(),
      _age = TextEditingController(text: '3'),
      _description = TextEditingController();
  String _breed = 'GOLDEN_RETRIEVER', _gender = 'MALE', _size = 'LARGE';
  final _traits = <String>{'FRIENDLY'};
  @override
  void initState() {
    super.initState();
    final pet = widget.pet;
    if (pet != null) {
      _name.text = pet.name;
      _age.text = '${pet.age}';
      _description.text = pet.description;
      _breed = pet.breed;
      _gender = pet.gender;
      _size = pet.size;
      _traits
        ..clear()
        ..addAll(pet.traits);
    }
  }

  bool _busy = false;
  String? _error;
  Future<void> _save() async {
    final age = int.tryParse(_age.text);
    if (_name.text.trim().isEmpty ||
        age == null ||
        age < 0 ||
        age > 30 ||
        _traits.isEmpty) {
      setState(() => _error = '이름, 0~30살 나이와 성격을 입력해 주세요.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final input = <String, dynamic>{
        'name': _name.text.trim(),
        'age': age,
        'breed': _breed,
        'gender': _gender,
        'size': _size,
        'personalities': _traits.toList(),
        'description': _description.text.trim(),
      };
      if (widget.pet == null) {
        await ref.read(accountRepositoryProvider).createPet(input);
      } else {
        await ref.read(profileRepositoryProvider).call('updatePet', {
          'id': widget.pet!.id,
          'input': {
            'name': input['name'],
            'age': age,
            'personalities': _traits.toList(),
            'description': input['description'],
          },
        });
      }
      final account = await ref.read(apiSessionProvider.notifier).reload();
      if (mounted) {
        final returnTo = GoRouterState.of(context)
            .uri
            .queryParameters['returnTo'];
        context.go(
          returnTo != null &&
                  returnTo.startsWith('/api/') &&
                  !returnTo.contains('://')
              ? returnTo
              : account.destination,
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _age.dispose();
    _description.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      widget.expectedPetId != null && widget.pet == null
      ? const ApiMissingPetScreen()
      : FlowScreen(
          title: widget.pet == null ? '강아지 등록' : '강아지 프로필 수정',
          backPath: widget.pet == null ? '/api/profile' : '/api/me',
          footer: FlowButton(
            _busy
                ? '저장 중…'
                : widget.pet == null
                ? '등록 완료하고 시작하기'
                : '수정 저장',
            onPressed: _busy ? null : _save,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FlowPill(widget.pet == null ? '프로필 등록 · 2/2' : '강아지 정보 수정'),
              const SizedBox(height: 16),
              const FlowHeading(
                '우리 강아지도 소개해 주세요',
                description: '잘 맞는 산책 친구를 찾을 수 있어요.',
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _ServerAvatar(
                    pet: true,
                    images: widget.pet?.images ?? const [],
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      '${_name.text.trim().isEmpty ? '강아지' : _name.text.trim()}의 프로필 사진',
                      style: AppText.small.copyWith(color: AppColors.secondary),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              FlowField(
                '강아지 이름',
                controller: _name,
                hint: '하루',
                maxLength: 50,
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 16),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: _LabeledSelect(
                      label: '품종',
                      value: _breed,
                      values: breeds,
                      onChanged: _busy || widget.pet != null
                          ? null
                          : (v) => setState(() => _breed = v!),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FlowField(
                      '나이',
                      controller: _age,
                      digitsOnly: true,
                      maxLength: 2,
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text('성별', style: AppText.small),
              const SizedBox(height: 8),
              Row(
                children: [
                  for (final gender in [('MALE', '수컷'), ('FEMALE', '암컷')]) ...[
                    FlowChoice(
                      label: gender.$2,
                      selected: _gender == gender.$1,
                      onTap: _busy || widget.pet != null
                          ? null
                          : () => setState(() => _gender = gender.$1),
                    ),
                    const SizedBox(width: 8),
                  ],
                ],
              ),
              const SizedBox(height: 16),
              Theme(
                data: Theme.of(context)
                    .copyWith(dividerColor: Colors.transparent),
                child: ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  childrenPadding: EdgeInsets.zero,
                  title: const Text('추가 정보', style: AppText.small),
                  children: [
                    _LabeledSelect(
                      label: '크기',
                      value: _size,
                      values: const {
                        'SMALL': '소형',
                        'MEDIUM': '중형',
                        'LARGE': '대형',
                      },
                      onChanged: _busy || widget.pet != null
                          ? null
                          : (v) => setState(() => _size = v!),
                    ),
                    if (widget.pet != null)
                      const Text(
                        '품종·성별·크기는 등록 후 변경할 수 없어요.',
                        style: AppText.caption,
                      ),
                    const SizedBox(height: 16),
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text('성격 (복수 선택)', style: AppText.small),
                    ),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Wrap(
                        spacing: 8,
                        children: [
                          for (final trait in personalities.entries)
                            FilterChip(
                              label: Text(trait.value),
                              selected: _traits.contains(trait.key),
                              onSelected: _busy
                                  ? null
                                  : (selected) => setState(
                                      () => selected
                                          ? _traits.add(trait.key)
                                          : _traits.remove(trait.key),
                                    ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    FlowField(
                      '소개 (선택)',
                      controller: _description,
                      maxLength: 300,
                    ),
                  ],
                ),
              ),
              ApiError(_error),
            ],
          ),
        );
}

class ApiMainScreen extends ConsumerStatefulWidget {
  const ApiMainScreen({super.key, required this.account});
  final AccountSnapshot account;
  @override
  ConsumerState<ApiMainScreen> createState() => _ApiMainScreenState();
}

class _ApiMainScreenState extends ConsumerState<ApiMainScreen> {
  final _pending = <String>{};
  String? _error;
  Future<void> _like(Recommendation item) async {
    if (_pending.contains(item.itemId)) return;
    setState(() {
      _pending.add(item.itemId);
      _error = null;
    });
    try {
      await ref.read(accountRepositoryProvider).like(item.itemId);
      ref.invalidate(recommendationsProvider);
    } catch (e) {
      if (mounted) setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _pending.remove(item.itemId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final feed = ref.watch(recommendationsProvider);
    return FlowScreen(
      title: '추천',
      titleWidget: const Align(
        alignment: Alignment.centerLeft,
        child: SizedBox(
          width: 48,
          height: 48,
          child: Center(child: DesignIcon('paw')),
        ),
      ),
      canGoBack: false,
      actions: const ApiSnackPill(),
      navigation: const AppBottomNavigation(selected: '/main', apiMode: true),
      contentTopPadding: 16,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ApiLocationStatus(),
          ApiError(_error),
          const SizedBox(height: 16),
          const Text('추천', style: AppText.heading),
          const SizedBox(height: 16),
          feed.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, stack) => Column(
              children: [
                ApiError(apiErrorMessage(e)),
                TextButton(
                  onPressed: () => ref.invalidate(recommendationsProvider),
                  child: const Text('다시 불러오기'),
                ),
              ],
            ),
            data: (items) => items.isEmpty
                ? const SoftCard(
                    child: Text(
                      '아직 근처에 추천할 산책 친구가 없어요.\n다음 추천 시간에 다시 확인해 주세요.',
                      style: AppText.small,
                    ),
                  )
                : Column(
                    children: [
                      for (final item in items)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: _RecommendationCard(
                            item: item,
                            busy: _pending.contains(item.itemId),
                            onLike: () => _like(item),
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

class _RecommendationCard extends StatelessWidget {
  const _RecommendationCard({
    required this.item,
    required this.busy,
    required this.onLike,
  });
  final Recommendation item;
  final bool busy;
  final VoidCallback onLike;
  @override
  Widget build(BuildContext context) {
    final images = item.pets.expand((pet) => pet.images).toList();
    final name = [
      item.profile?.nickname ?? '산책 친구',
      if (item.pets.isNotEmpty) item.pets.first.name,
    ].join('과 ');
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _ServerPhoto(images: images, height: 264),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: AppText.title),
                const SizedBox(height: 8),
                Text(
                  regions[item.profile?.region] ?? '활동 지역 미등록',
                  style: AppText.small.copyWith(color: AppColors.secondary),
                ),
                for (final pet in item.pets) ...[
                  const SizedBox(height: 16),
                  Text(
                    '${breeds[pet.breed] ?? pet.breed} · ${pet.age}살 · ${pet.gender == 'MALE' ? '수컷' : '암컷'}',
                    style: AppText.body,
                  ),
                  if (pet.traits.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final trait in pet.traits)
                          FlowPill(personalities[trait] ?? trait),
                      ],
                    ),
                  ],
                ],
                if (item.profile?.bio.isNotEmpty == true) ...[
                  const SizedBox(height: 16),
                  Text(item.profile!.bio, style: AppText.small),
                ],
                const SizedBox(height: 16),
                FlowButton(
                  item.state == 'LIKE'
                      ? '관심 보냄'
                      : item.state == 'PASS'
                      ? '넘긴 프로필'
                      : busy
                      ? '저장 중…'
                      : '관심 표현하기',
                  secondary: true,
                  onPressed: busy || ['LIKE', 'PASS'].contains(item.state)
                      ? null
                      : onLike,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ServerPhoto extends StatelessWidget {
  const _ServerPhoto({this.images = const [], required this.height});
  final List<String> images;
  final double height;
  Widget get placeholder => Container(
    height: height,
    width: double.infinity,
    color: AppColors.subtle,
    child: const Center(
      child: DesignIcon('paw', size: 48, color: AppColors.muted),
    ),
  );
  @override
  Widget build(BuildContext context) => images.isEmpty
      ? placeholder
      : Image.network(
          images.first,
          height: height,
          width: double.infinity,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stack) => placeholder,
        );
}

class _ServerAvatar extends StatelessWidget {
  const _ServerAvatar({
    this.images = const [],
    this.name = '',
    this.pet = false,
  });
  final List<String> images;
  final String name;
  final bool pet;
  @override
  Widget build(BuildContext context) => Container(
    width: 80,
    height: 80,
    clipBehavior: Clip.antiAlias,
    decoration: BoxDecoration(
      color: AppColors.peach,
      borderRadius: BorderRadius.circular(pet ? 40 : 20),
    ),
    child: images.isNotEmpty
        ? _ServerPhoto(images: images, height: 80)
        : Center(
            child: pet || name.trim().isEmpty
                ? const DesignIcon('paw', color: AppColors.primary)
                : Text(
                    name.trim().characters.first,
                    style: AppText.heading.copyWith(color: AppColors.primary),
                  ),
          ),
  );
}

class _LabeledSelect extends StatelessWidget {
  const _LabeledSelect({
    required this.label,
    required this.value,
    required this.values,
    required this.onChanged,
  });
  final String label, value;
  final Map<String, String> values;
  final ValueChanged<String?>? onChanged;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: AppText.small),
      const SizedBox(height: 8),
      DropdownButtonFormField<String>(
        initialValue: value,
        isExpanded: true,
        style: AppText.body.copyWith(color: AppColors.text),
        decoration: const InputDecoration(
          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        items: [
          for (final entry in values.entries)
            DropdownMenuItem(
              value: entry.key,
              child: Text(entry.value, overflow: TextOverflow.ellipsis),
            ),
        ],
        onChanged: onChanged,
      ),
    ],
  );
}

class ApiOwnProfileScreen extends ConsumerStatefulWidget {
  const ApiOwnProfileScreen({super.key, required this.account});
  final AccountSnapshot account;
  @override
  ConsumerState<ApiOwnProfileScreen> createState() =>
      _ApiOwnProfileScreenState();
}

class _ApiOwnProfileScreenState extends ConsumerState<ApiOwnProfileScreen> {
  Future<void> _deletePet(ServerPet pet) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text('${pet.name} 프로필을 삭제할까요?'),
        content: const Text('삭제하면 이 강아지를 새 산책에 선택할 수 없어요.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('삭제'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(profileRepositoryProvider).call('deletePet', {
        'id': pet.id,
      });
      await ref.read(apiSessionProvider.notifier).reload();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _certify(ServerPet pet) async {
    final input = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => const PetCertificationDialog(),
    );
    if (input == null || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(profileRepositoryProvider).call('certifyPet', {
        'id': pet.id,
        'input': input,
      });
      await ref.read(apiSessionProvider.notifier).reload();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  bool _busy = false;
  Future<void> _logout() async {
    setState(() => _busy = true);
    try {
      await ref.read(apiSessionProvider.notifier).signOut();
    } catch (_) {
      /* Local credentials are cleared even when remote logout fails. */
    } finally {
      if (mounted) context.go('/api/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.account.profile;
    return FlowScreen(
      title: '프로필',
      canGoBack: false,
      navigation: const AppBottomNavigation(
        selected: '/profile',
        apiMode: true,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FlowHeading(
            profile?.nickname ?? '프로필을 등록해 주세요',
            description:
                '${regions[profile?.region] ?? ''}${widget.account.pets.isEmpty ? '' : ' · ${widget.account.pets.first.name}와 함께'}',
          ),
          const SizedBox(height: 16),
          _ServerAvatar(
            images: profile?.images ?? const [],
            name: profile?.nickname ?? '',
          ),
          const SizedBox(height: 16),
          for (final pet in widget.account.pets) ...[
            SoftCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(pet.name, style: AppText.title),
                  Wrap(
                    spacing: 8,
                    children: [
                      TextButton(
                        onPressed: () => context.push(
                          '/api/pet/${pet.id}?returnTo=%2Fapi%2Fme',
                        ),
                        child: const Text('강아지 정보 수정'),
                      ),
                      TextButton(
                        onPressed: () =>
                            context.push('/api/pet/${pet.id}/images'),
                        child: const Text('강아지 사진'),
                      ),
                      TextButton(
                        onPressed: _busy ? null : () => _deletePet(pet),
                        child: const Text('강아지 삭제'),
                      ),
                      TextButton(
                        onPressed: _busy || pet.certified
                            ? null
                            : () => _certify(pet),
                        child: Text(pet.certified ? '등록번호 인증됨' : '등록번호 인증'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${breeds[pet.breed] ?? pet.breed} · ${pet.age}살 · ${pet.gender == 'MALE' ? '수컷' : '암컷'}',
                    style: AppText.small.copyWith(color: AppColors.secondary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
          const SizedBox(height: 8),
          FlowButton(
            '내 프로필 사진',
            secondary: true,
            onPressed: profile == null
                ? null
                : () => context.push('/api/profile/images'),
          ),
          const SizedBox(height: 12),
          if (profile != null) Text(profile.bio, style: AppText.body),
          FlowButton(
            '내 산책 기록',
            secondary: true,
            onPressed: () =>
                context.push('/api/challenge/records?returnTo=%2Fapi%2Fme'),
          ),
          const SizedBox(height: 12),
          FlowButton(
            '내 프로필 수정',
            secondary: true,
            onPressed: () => context.push('/api/profile?returnTo=%2Fapi%2Fme'),
          ),
          const SizedBox(height: 12),
          FlowButton(
            '강아지 추가 등록',
            secondary: true,
            onPressed: () => context.push('/api/pet'),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: _busy ? null : _logout,
            child: Text(_busy ? '로그아웃 중…' : '로그아웃'),
          ),
        ],
      ),
    );
  }
}

class PetCertificationDialog extends StatefulWidget {
  const PetCertificationDialog({super.key});
  @override
  State<PetCertificationDialog> createState() => _PetCertificationDialogState();
}

class _PetCertificationDialogState extends State<PetCertificationDialog> {
  final name = TextEditingController(), code = TextEditingController();
  @override
  void dispose() {
    name.dispose();
    code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('강아지 등록번호 인증'),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TextField(
          controller: name,
          maxLength: 50,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(labelText: '등록한 보호자 이름'),
        ),
        TextField(
          controller: code,
          maxLength: 50,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(labelText: '동물 등록번호'),
          keyboardType: TextInputType.number,
        ),
      ],
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('취소'),
      ),
      TextButton(
        onPressed: name.text.trim().isEmpty || code.text.trim().isEmpty
            ? null
            : () => Navigator.pop(context, {
                'userName': name.text.trim(),
                'certificationCode': code.text.trim(),
              }),
        child: const Text('인증'),
      ),
    ],
  );
}

class ApiMissingPetScreen extends StatelessWidget {
  const ApiMissingPetScreen({super.key});
  @override
  Widget build(BuildContext context) => const FlowScreen(
    title: '강아지 프로필',
    backPath: '/api/me',
    child: FlowHeading(
      '강아지 정보를 확인할 수 없어요',
      description: '본인의 강아지 목록에서 다시 선택해 주세요.',
    ),
  );
}
