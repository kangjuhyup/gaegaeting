import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/design/widgets.dart';
import '../../../core/design/app_theme.dart';
import '../application/profile_providers.dart';
import '../application/api_session.dart';
import '../data/account_repository.dart';

class ProfileImagesScreen extends ConsumerStatefulWidget {
  const ProfileImagesScreen({super.key, this.petId});
  final int? petId;
  @override
  ConsumerState<ProfileImagesScreen> createState() =>
      _ProfileImagesScreenState();
}

class _ProfileImagesScreenState extends ConsumerState<ProfileImagesScreen> {
  List<Map<String, dynamic>> photos = [];
  bool busy = false, loading = true;
  String? error;
  Map<String, dynamic> variables(int slot) => {
    'imageNo': slot,
    'petId': ?widget.petId,
  };
  String op(String user, String pet) => widget.petId == null ? user : pet;
  @override
  void initState() {
    super.initState();
    Future.microtask(load);
  }

  Future<void> load({bool clearError = true}) async {
    setState(() {
      loading = true;
      if (clearError) error = null;
    });
    try {
      final list = await ref.read(profileRepositoryProvider).call(
        op('myProfileImageUploads', 'myPetImageUploads'),
        {'petId': ?widget.petId},
      ) as List;
      if (mounted) {
        setState(
          () => photos = list.map((p) => Map<String, dynamic>.from(p)).toList(),
        );
      }
    } catch (e) {
      if (mounted) setState(() => error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> run(Future<void> Function() action) async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await action();
      await ref.read(apiSessionProvider.notifier).reload();
    } catch (e) {
      if (mounted) setState(() => error = apiErrorMessage(e));
    } finally {
      if (mounted) {
        setState(() => busy = false);
        await load(clearError: false);
      }
    }
  }

  Future<void> add() async {
    if (busy) return;
    final used = photos.map((p) => p['imageNo']).toSet();
    final slot = List.generate(
      6,
      (i) => i,
    ).where((i) => !used.contains(i)).firstOrNull;
    if (slot == null) {
      setState(() => error = '사진은 최대 6장까지 등록할 수 있어요.');
      return;
    }
    final who = ref.read(apiSessionProvider).asData?.value?.authIdentity;
    await run(() async {
      final file = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        requestFullMetadata: false,
      );
      if (file == null) return;
      if (!mounted ||
          ref.read(apiSessionProvider).asData?.value?.authIdentity != who) {
        throw const ApiFailure('계정이 변경됐어요.', requiresLogin: true);
      }
      if (await file.length() > 5 * 1024 * 1024) {
        throw const ApiFailure('원본 사진은 5MiB 이하여야 해요.');
      }
      await ref
          .read(profileRepositoryProvider)
          .upload(await file.readAsBytes(), slot, petId: widget.petId);
    });
  }

  Future<void> remove(int slot) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('사진을 삭제할까요?'),
        content: const Text('등록된 사진과 승인 요청이 삭제돼요.'),
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
    if (confirmed == true && mounted) {
      await run(() async {
        await ref
            .read(profileRepositoryProvider)
            .call(op('deleteProfileImage', 'deletePetImage'), variables(slot));
      });
    }
  }

  @override
  Widget build(BuildContext context) => FlowScreen(
    title: widget.petId == null ? '내 프로필 사진' : '강아지 사진',
    backPath: '/api/me',
    footer: FlowButton(
      busy ? '처리 중…' : '사진 추가',
      onPressed: busy || loading ? null : add,
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const FlowHeading(
          '사진으로 소개해요',
          description: '최대 6장 · 승인된 사진만 친구에게 보여요.',
        ),
        const SizedBox(height: 16),
        if (error != null) Text(error!, style: AppText.body),
        if (loading) const LinearProgressIndicator(),
        TextButton(
          onPressed: busy ? null : load,
          child: const Text('사진 상태 새로고침'),
        ),
        if (!loading && photos.isEmpty)
          const SoftCard(child: Text('등록한 사진이 없어요.')),
        for (final photo in photos)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: SoftCard(
              child: Column(
                children: [
                  if (photo['url'] != null)
                    Image.network(
                      photo['url'],
                      height: 180,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) =>
                          const Text('사진 주소가 만료됐어요. 새로고침해 주세요.'),
                    ),
                  Text(
                    {
                          'UPLOADING': '업로드 중',
                          'PENDING': '승인 대기',
                          'APPROVED': '승인됨',
                          'REJECTED': '반려됨',
                        }[photo['status']] ??
                        '사진 상태 확인 중',
                    style: AppText.body,
                  ),
                  if (photo['status'] == 'UPLOADING')
                    TextButton(
                      onPressed: busy
                          ? null
                          : () => run(() async {
                              await ref
                                  .read(profileRepositoryProvider)
                                  .call(
                                    op(
                                      'completeProfileImage',
                                      'completePetImage',
                                    ),
                                    variables(photo['imageNo']),
                                  );
                            }),
                      child: const Text('제출 결과 확인·재시도'),
                    ),
                  TextButton(
                    onPressed: busy ? null : () => remove(photo['imageNo']),
                    child: const Text('사진 삭제'),
                  ),
                ],
              ),
            ),
          ),
      ],
    ),
  );
}
