import 'dart:async';

import 'package:image_picker/image_picker.dart';

import '../../account/application/api_session.dart';
import '../application/photo_controller.dart';
import 'challenge_common.dart';
import 'course_screens.dart';

class DiaryEditorScreen extends ConsumerStatefulWidget {
  const DiaryEditorScreen({super.key, required this.walkId, this.returnTo});
  final String walkId;
  final String? returnTo;
  @override
  ConsumerState<DiaryEditorScreen> createState() => _DiaryEditorState();
}

class _DiaryEditorState extends ChallengeState<DiaryEditorScreen> {
  final content = TextEditingController(), mood = TextEditingController();
  Json? original;
  WalkRecord? walk;
  List<Json> photos = [];
  final Set<String> selected = {}, newUnused = {};
  int revision = 0, step = 0;
  bool customMood = false;
  bool eligible = false,
      public = false,
      uploading = false,
      pendingPhoto = false,
      allowPop = false,
      conflict = false;
  String? identity;
  Future<void> draftTail = Future.value();
  String get draftKey => 'diary.${widget.walkId}';
  @override
  void initState() {
    super.initState();
    content.addListener(draft);
    mood.addListener(draft);
    Future.microtask(load);
  }

  @override
  void dispose() {
    content.dispose();
    mood.dispose();
    super.dispose();
  }

  void draft() {
    if (identity == null || loading) return;
    final who = identity!;
    final snapshot = <String, dynamic>{
      'content': content.text,
      'mood': mood.text,
      'photoIds': selected.toList(),
      'newUnused': newUnused.toList(),
      'expectedRevision': revision,
      'visibility': public ? 'PUBLIC' : 'PRIVATE',
    };
    draftTail = draftTail
        .catchError((Object _) {})
        .then(
          (_) =>
              ref.read(challengeVaultProvider).write(who, draftKey, snapshot),
        );
  }

  Future<void> load() => run(() async {
    identity =
        (ref.read(apiSessionProvider).asData?.value?.authIdentity ??
        ref.read(apiSessionProvider).asData?.value?.profile?.id);
    walk = WalkRecord(json(await api.call('myWalk', {'id': widget.walkId})));
    final result = await api.call('myWalkDiary', {'walkId': widget.walkId});
    original = result == null ? null : json(result);
    revision = original?['revision'] ?? 0;
    photos = rows(await api.call('myWalkingPhotos', {'walkId': widget.walkId}));
    content.text = original?['content'] ?? '';
    mood.text = original?['mood'] ?? '';
    selected.clear();
    selected.addAll(rows(original?['photos']).map((p) => p['id'] as String));
    public = original?['visibility'] == 'PUBLIC';
    if (walk!.completed && walk!.route != null) {
      try {
        await api.call('walkingRoute', {'id': walk!.route!['id']});
        eligible = true;
      } on ChallengeFailure catch (e) {
        if (e.status != 404) rethrow;
      }
    }
    if (!eligible) public = false;
    if (identity != null) {
      final d = await ref
          .read(challengeVaultProvider)
          .read(identity!, draftKey);
      if (d != null) {
        content.text = d['content'];
        mood.text = d['mood'];
        selected.clear();
        selected.addAll(List<String>.from(d['photoIds']));
        newUnused.addAll(List<String>.from(d['newUnused']));
        conflict = revision != d['expectedRevision'];
        revision = d['expectedRevision'];
        public = eligible && d['visibility'] == 'PUBLIC';
      }
    }
    customMood =
        mood.text.isNotEmpty &&
        !['즐거웠어요', '여유로웠어요', '조금 피곤해요'].contains(mood.text);
    pendingPhoto =
        await ref.read(photoControllerProvider).pending(widget.walkId) != null;
  }, load: true);
  Future<void> addPhoto() => run(() async {
    if (photos.length >= 4) {
      throw const ChallengeFailure('예약을 포함해 사진은 최대 4장이에요.', status: 400);
    }
    final file = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      requestFullMetadata: false,
    );
    if (file == null) return;
    if ((ref.read(apiSessionProvider).asData?.value?.authIdentity ??
            ref.read(apiSessionProvider).asData?.value?.profile?.id) !=
        identity) {
      throw const ChallengeFailure(
        '계정이 변경됐어요.',
        status: 401,
        requiresLogin: true,
      );
    }
    final png = await sanitizedPng(await file.readAsBytes());
    if (mounted) setState(() => uploading = true);
    try {
      final p = await ref
          .read(photoControllerProvider)
          .upload(widget.walkId, png);
      photos.removeWhere((v) => v['id'] == p['id']);
      photos.add(p);
      selected.add(p['id']);
      newUnused.add(p['id']);
      pendingPhoto = false;
      draft();
    } finally {
      pendingPhoto =
          await ref.read(photoControllerProvider).pending(widget.walkId) !=
          null;
      if (mounted) setState(() => uploading = false);
    }
  });
  Future<void> retryPhoto() => run(() async {
    uploading = true;
    try {
      final p = await ref.read(photoControllerProvider).retry(widget.walkId);
      photos.removeWhere((v) => v['id'] == p['id']);
      photos.add(p);
      selected.add(p['id']);
      newUnused.add(p['id']);
      pendingPhoto = false;
      draft();
    } finally {
      uploading = false;
    }
  });
  Future<void> cancel() async {
    if (!await confirm(
      '작성을 취소할까요?',
      '이번 작성에서 새로 올린 미사용 사진만 정리해요. 기존 일기와 사진은 그대로 남아요.',
      action: '작성 취소',
    )) {
      return;
    }
    await run(() async {
      await ref.read(photoControllerProvider).cancel(widget.walkId, newUnused);
      await draftTail;
      if (identity != null) {
        await ref.read(challengeVaultProvider).write(identity!, draftKey, null);
      }
      if (mounted) {
        setState(() => allowPop = true);
        context.go(
          widget.returnTo ?? challengePath(apiMode, '/walk/${widget.walkId}'),
        );
      }
    });
  }

  Future<void> save() => run(() async {
    if (uploading || pendingPhoto) {
      throw const ChallengeFailure('사진 업로드를 완료하거나 제거해 주세요.', status: 400);
    }
    if (content.text.trim().isEmpty &&
        mood.text.trim().isEmpty &&
        selected.isEmpty) {
      throw const ChallengeFailure('내용·기분·사진 중 하나 이상 입력해 주세요.', status: 400);
    }
    try {
      final saved = json(
        await api.call('saveWalkingDiary', {
          'input': {
            'walkId': widget.walkId,
            'expectedRevision': revision,
            'content': content.text.trim(),
            'mood': mood.text.trim().isEmpty ? null : mood.text.trim(),
            'photoIds': selected.toList(),
            'visibility': eligible && public ? 'PUBLIC' : 'PRIVATE',
          },
        }),
      );
      newUnused.removeAll(selected);
      await ref.read(photoControllerProvider).cancel(widget.walkId, newUnused);
      await draftTail;
      if (identity != null) {
        await ref.read(challengeVaultProvider).write(identity!, draftKey, null);
      }
      if (mounted) {
        setState(() => allowPop = true);
        context.pushReplacement(
          challengePath(
            apiMode,
            '/diary/${saved['id']}',
            returnTo: widget.returnTo,
          ),
        );
      }
    } on ChallengeFailure catch (e) {
      if (e.status == 409) {
        conflict = true;
        original =
            (await api.call('myWalkDiary', {'walkId': widget.walkId})) as Json?;
      }
      rethrow;
    }
  });
  @override
  Widget build(BuildContext context) => PopScope(
    canPop: allowPop,
    onPopInvokedWithResult: (didPop, result) {
      if (!didPop && !busy) unawaited(cancel());
    },
    child: FlowScreen(
      title: step == 0
          ? '산책 일기'
          : step == 1
          ? '공개 범위'
          : '공개 전 확인',
      backPath: widget.returnTo,
      actions: IconButton(
        tooltip: '작성 취소',
        onPressed: busy ? null : cancel,
        icon: const Icon(Icons.close),
      ),
      footer: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FlowButton(
            step == 0
                ? '일기 저장'
                : step == 1
                ? '선택한 범위로 저장'
                : '확인하고 공개',
            onPressed: busy || uploading || pendingPhoto || conflict
                ? null
                : () {
                    if (step == 0) {
                      draft();
                      setState(() => step = 1);
                    } else if (step == 1 && public) {
                      setState(() => step = 2);
                    } else {
                      save();
                    }
                  },
          ),
          if (step > 0) ...[
            const SizedBox(height: 12),
            FlowButton(
              '계속 수정',
              secondary: true,
              onPressed: busy ? null : () => setState(() => step = 0),
            ),
          ],
        ],
      ),
      child: body([
        FlowHeading(
          step == 0
              ? '오늘 산책은 어땠나요?'
              : step == 1
              ? '누가 이 일기를 볼 수 있나요?'
              : '코스 후기로 공개할까요?',
          description: step == 0
              ? '${koreaDate(walk?.value['endedAt'])} · ${walk?.pets.map((p) => p['name']).join(', ') ?? ''}와 함께'
              : step == 1
              ? '완주한 공개 코스의 후기로 공유할 수 있어요.'
              : '본문·기분·날짜·사진을 다시 확인해 주세요.',
        ),
        const SizedBox(height: 20),
        if (conflict)
          ChallengeCard(
            '일기가 다른 곳에서 바뀌었어요',
            description:
                '최신 일기: ${original?['content'] ?? ''}\n내 입력은 아래에 보존했어요.',
            child: FlowButton(
              '최신 버전 확인 후 내 입력 유지',
              secondary: true,
              onPressed: busy
                  ? null
                  : () {
                      setState(() {
                        revision = original?['revision'] ?? 0;
                        conflict = false;
                      });
                      draft();
                    },
            ),
          ),
        if (step == 0) ...[
          PhotoRow(
            photos: photos.where((p) => selected.contains(p['id'])).toList(),
            onRefresh: () => run(() async {
              photos = rows(
                await api.call('myWalkingPhotos', {'walkId': widget.walkId}),
              );
            }),
          ),
          for (final p in photos.where((p) => selected.contains(p['id'])))
            TextButton(
              onPressed: busy
                  ? null
                  : () => setState(() {
                      selected.remove(p['id']);
                      draft();
                    }),
              child: const Text('첨부에서 제외 (저장된 파일은 유지)'),
            ),
          const SizedBox(height: 12),
          FlowButton(
            '사진 추가',
            secondary: true,
            onPressed: busy || photos.length >= 4 || pendingPhoto
                ? null
                : addPhoto,
          ),
          if (uploading) const LinearProgressIndicator(),
          if (pendingPhoto)
            ChallengeCard(
              '사진 업로드를 이어가세요',
              description: '실패한 예약을 확인한 뒤 다시 올려요.',
              child: Column(
                children: [
                  FlowButton('사진 다시 올리기', onPressed: busy ? null : retryPhoto),
                  TextButton(
                    onPressed: busy
                        ? null
                        : () => run(() async {
                            await ref
                                .read(photoControllerProvider)
                                .cancel(widget.walkId, {});
                            pendingPhoto = false;
                            photos = rows(
                              await api.call('myWalkingPhotos', {
                                'walkId': widget.walkId,
                              }),
                            );
                          }),
                    child: const Text('실패한 새 사진 제거'),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 20),
          const Text('오늘의 기분', style: AppText.title),
          Wrap(
            spacing: 8,
            children: [
              for (final label in ['즐거웠어요', '여유로웠어요', '조금 피곤해요'])
                ChoiceChip(
                  label: Text(
                    label,
                    style: AppText.small.copyWith(
                      color: mood.text == label
                          ? AppColors.primary
                          : AppColors.secondary,
                    ),
                  ),
                  shape: const StadiumBorder(),
                  showCheckmark: false,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 12,
                  ),
                  backgroundColor: AppColors.subtle,
                  selectedColor: AppColors.peach,
                  side: mood.text == label
                      ? const BorderSide(color: AppColors.primary)
                      : BorderSide.none,
                  selected: mood.text == label,
                  onSelected: busy
                      ? null
                      : (_) => setState(() {
                          mood.text = label;
                          customMood = false;
                        }),
                ),
            ],
          ),
          TextButton(
            onPressed: busy
                ? null
                : () => setState(() => customMood = !customMood),
            child: const Text('기분 직접 입력'),
          ),
          if (customMood) FlowField('기분', controller: mood, maxLength: 50),
          const SizedBox(height: 16),
          const Text('산책 이야기', style: AppText.title),
          TextField(
            controller: content,
            maxLength: 5000,
            minLines: 4,
            maxLines: 8,
            textAlignVertical: TextAlignVertical.top,
            decoration: const InputDecoration(hintText: '오늘 산책 이야기를 적어 주세요.'),
          ),
          const ChallengeCard('공개 범위 · 나만 보기', description: '기본은 비공개로 저장해요.'),
        ] else if (step == 1) ...[
          RadioGroup<bool>(
            groupValue: public,
            onChanged: (v) {
              setState(() => public = v ?? false);
              draft();
            },
            child: Column(
              children: [
                const RadioListTile(value: false, title: Text('나만 보기')),
                RadioListTile(
                  value: true,
                  title: const Text('코스 공개 후기'),
                  enabled: eligible,
                ),
              ],
            ),
          ),
          ChallengeCard(
            '공개 안내',
            description: eligible
                ? '산책 날짜·기분·본문·사진만 공개해요. 정확한 위치와 시각은 공개하지 않아요.'
                : '공개 코스의 완주 기록만 후기로 공개할 수 있어요. 이 산책은 나만 보기로 저장해요.',
          ),
        ] else ...[
          ChallengeCard(
            walk?.route?['title'] ?? '내 산책',
            description:
                '${koreaDate(walk?.value['endedAt'])} · 코스 공개 후기\n${mood.text}\n${content.text}',
          ),
          PhotoRow(
            photos: photos.where((p) => selected.contains(p['id'])).toList(),
            onRefresh: () => run(() async {
              photos = rows(
                await api.call('myWalkingPhotos', {'walkId': widget.walkId}),
              );
            }),
          ),
          const SizedBox(height: 16),
          const ChallengeCard(
            '사진 공개 확인',
            description: '사진에 집 주소·차량 번호·다른 사람의 얼굴이 드러나지 않는지 확인해 주세요. 이 코스의 이전 공개 후기는 나만 보기로 바뀌어요.',
          ),
        ],
      ]),
    ),
  );
}

class DiaryDetailScreen extends ConsumerStatefulWidget {
  const DiaryDetailScreen({super.key, required this.id, this.returnTo});
  final String id;
  final String? returnTo;
  @override
  ConsumerState<DiaryDetailScreen> createState() => _DiaryDetailState();
}

class _DiaryDetailState extends ChallengeState<DiaryDetailScreen> {
  Json? diary;
  @override
  void initState() {
    super.initState();
    Future.microtask(reload);
  }

  Future<void> reload() => run(() async {
    diary = json(await api.call('myWalkingDiary', {'id': widget.id}));
  }, load: true);
  @override
  Widget build(BuildContext context) {
    final d = diary;
    return FlowScreen(
      title: '내 일기',
      backPath: widget.returnTo ?? challengePath(apiMode, '/records/diaries'),
      footer: d == null
          ? null
          : FlowButton(
              '일기 수정',
              onPressed: () => go(
                '/diary-editor/${d['walkId']}',
                returnTo: GoRouterState.of(context).uri.toString(),
              ),
            ),
      child: body([
        if (d != null) ...[
          FlowHeading(
            '산책마다 남긴 이야기',
            description:
                "${d['walkDate']} · ${d['visibility'] == 'PUBLIC' ? '코스 공개 후기' : '나만 보기'}",
          ),
          const SizedBox(height: 20),
          ChallengeCard(d['mood'] ?? '오늘의 산책', description: d['content']),
          PhotoRow(photos: rows(d['photos']), onRefresh: reload),
          for (final p in rows(d['photos']))
            TextButton(
              onPressed: busy
                  ? null
                  : () async {
                      if (await confirm(
                        '사진을 삭제할까요?',
                        '일기 버전과 챌린지 실적·보상이 달라질 수 있어요.',
                        action: '사진 삭제',
                      )) {
                        await run(() async {
                          await api.call('deleteWalkingPhoto', {'id': p['id']});
                          diary = json(
                            await api.call('myWalkingDiary', {'id': d['id']}),
                          );
                        });
                      }
                    },
              child: const Text('사진 파일 삭제'),
            ),
          ChallengeCard(
            '일기 삭제',
            description: '연결 사진과 챌린지 실적·보상에 영향을 줄 수 있어요.',
            onTap: busy
                ? null
                : () async {
                    if (await confirm(
                      '일기를 삭제할까요?',
                      '일기와 연결 사진이 삭제돼요. 완료 보상이 다시 계산될 수 있어요.',
                      action: '삭제',
                    )) {
                      await run(() async {
                        await api.call('deleteWalkingDiary', {'id': d['id']});
                        if (context.mounted) {
                          context.go(
                            challengePath(apiMode, '/records/diaries'),
                          );
                        }
                      });
                    }
                  },
          ),
        ],
        if (error != null)
          FlowButton('최신 일기 확인', onPressed: busy ? null : reload),
      ]),
    );
  }
}
