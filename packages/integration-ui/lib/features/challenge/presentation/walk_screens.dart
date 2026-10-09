import 'dart:async';

import '../../account/application/api_session.dart';
import 'challenge_common.dart';
import 'walking_map.dart';

class WalkPrepareScreen extends ConsumerStatefulWidget {
  const WalkPrepareScreen({super.key, this.routeId});
  final String? routeId;
  @override
  ConsumerState<WalkPrepareScreen> createState() => _WalkPrepareState();
}

class _WalkPrepareState extends ChallengeState<WalkPrepareScreen> {
  Json? route;
  final Set<int> selected = {};
  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => run(() async {
        if (widget.routeId != null) {
          route = json(await api.call('walkingRoute', {'id': widget.routeId}));
        }
        if (apiMode) {
          await ref.read(apiSessionProvider.notifier).reload();
          await ref.read(walkControllerProvider).recover();
        }
      }, load: true),
    );
  }

  Future<void> start() => run(() async {
    await ref
        .read(walkControllerProvider)
        .start(selected.toList(), widget.routeId);
    final w = ref.read(walkControllerProvider).walk;
    if (w != null && mounted) {
      context.pushReplacement(challengePath(apiMode, '/walk/${w.id}'));
    }
  });
  @override
  Widget build(BuildContext context) {
    final account = ref.watch(apiSessionProvider).asData?.value;
    final walk = ref.watch(walkControllerProvider);
    final prerequisite = account?.profile == null
        ? 'profile'
        : account!.pets.isEmpty
        ? 'pet'
        : null;
    return ListenableBuilder(
      listenable: walk,
      builder: (c, _) => FlowScreen(
        title: widget.routeId == null ? '자유 산책 준비' : '코스 산책 준비',
        backPath: challengePath(apiMode, ''),
        footer: FlowButton(
          walk.queue?.start != null ? '시작 다시 확인' : '선택한 강아지와 산책 시작',
          onPressed:
              !apiMode ||
                  busy ||
                  walk.busy ||
                  prerequisite != null ||
                  selected.isEmpty
              ? null
              : start,
        ),
        child: body([
          const FlowHeading(
            '누구와 함께 걸을까요?',
            description: '내 강아지 중 1~6마리를 선택해 주세요.',
          ),
          const SizedBox(height: 20),
          if (route != null) ...[
            ChallengeCard(
              route!['title'],
              description: '${route!['startPlace']} → ${route!['endPlace']}',
            ),
            WalkingMap(path: rows(route!['path'])),
            const SizedBox(height: 16),
          ],
          if (apiMode && prerequisite != null)
            ChallengeCard(
              prerequisite == 'profile'
                  ? '내 프로필을 먼저 등록해 주세요'
                  : '강아지를 먼저 등록해 주세요',
              description: '둘러보기는 계속할 수 있어요. 산책을 시작하려면 등록이 필요해요.',
              child: FlowButton(
                '등록하기',
                onPressed: () async {
                  await context.push(
                    Uri(
                      path: '/api/$prerequisite',
                      queryParameters: {
                        'returnTo': GoRouterState.of(context).uri.toString(),
                      },
                    ).toString(),
                  );
                  if (mounted) {
                    await run(() async {
                      await ref.read(apiSessionProvider.notifier).reload();
                    });
                  }
                },
              ),
            ),
          if (!apiMode)
            const ChallengeCard(
              '미리보기에서는 기록하지 않아요',
              description: 'API 모드의 로그인과 위치 권한이 필요해요.',
            ),
          for (final pet in account?.pets ?? [])
            CheckboxListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 8),
              title: Text(pet.name),
              secondary: const DesignIcon('paw', color: AppColors.primary),
              value: selected.contains(pet.id),
              onChanged: busy
                  ? null
                  : (v) => setState(() {
                      if (v == true) {
                        if (selected.length < 6) selected.add(pet.id);
                      } else {
                        selected.remove(pet.id);
                      }
                    }),
              controlAffinity: ListTileControlAffinity.leading,
            ),
          const SizedBox(height: 16),
          const ChallengeCard(
            '산책 시작 안내',
            description: '시작하면 위치를 따라 걸은 길을 기록해요. 안전한 곳에서 화면을 확인해 주세요. 일시정지·재개와 종료 저장은 연결된 곳에서 확인해요.',
          ),
          if (walk.walk != null && walk.walk!.state != 'FINISHED')
            ChallengeCard(
              '진행 중인 산책으로 돌아가기',
              onTap: () => go('/walk/${walk.walk!.id}'),
            ),
          if (walk.error != null)
            ChallengeCard(
              walk.error!,
              child: FlowButton(
                '위치 설정 열기',
                secondary: true,
                onPressed: () => ref.read(walkingGpsProvider).settings(),
              ),
            ),
        ]),
      ),
    );
  }
}

class WalkScreen extends ConsumerStatefulWidget {
  const WalkScreen({super.key, required this.id});
  final String id;
  @override
  ConsumerState<WalkScreen> createState() => _WalkState();
}

class _WalkState extends ChallengeState<WalkScreen> {
  WalkRecord? loaded;
  Timer? timer;
  @override
  void initState() {
    super.initState();
    timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
    Future.microtask(reload);
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  Future<void> reload() => run(() async {
    loaded = WalkRecord(json(await api.call('myWalk', {'id': widget.id})));
    if (loaded!.state != 'FINISHED') {
      final controller = ref.read(walkControllerProvider);
      if (controller.walk?.id == widget.id) {
        await controller.refresh();
      } else {
        await controller.recover();
      }
    }
  }, load: true);
  Future<void> finish() async {
    if (await confirm(
      '산책을 종료할까요?',
      '걸은 길을 모두 저장한 뒤 완주 결과를 확인해요.',
      action: '산책 종료',
    )) {
      await run(() => ref.read(walkControllerProvider).finish());
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = ref.watch(walkControllerProvider);
    return ListenableBuilder(
      listenable: controller,
      builder: (c, _) {
        final w = controller.walk?.id == widget.id ? controller.walk : loaded;
        final finished = w?.state == 'FINISHED';
        final waiting =
            controller.queue?.walk?.id == widget.id &&
            controller.queue?.finishAt != null;
        final paused = w?.state == 'PAUSED';
        final active = controller.walk?.id == widget.id && !finished;
        final title = waiting
            ? '산책 저장 대기'
            : finished
            ? (w!.completed ? '산책 완료' : '산책 저장 완료')
            : paused
            ? '일시정지'
            : '산책 중';
        final points = w == null
            ? <Json>[]
            : w.points.map((p) => p.toJson()).toList();
        if (active) {
          points.addAll(controller.queue!.pending.map((p) => p.toJson()));
        }
        final pets = w?.pets.map((p) => p['name']).join(', ') ?? '';
        final duration =
            w?.duration(controller.queue?.finishAt ?? DateTime.now()) ??
            Duration.zero;
        final canAct = !busy && !controller.busy && !controller.commandPending;
        return FlowScreen(
          title: title,
          backPath: challengePath(apiMode, ''),
          actions: IconButton(
            tooltip: '기록 새로고침',
            onPressed: canAct ? reload : null,
            icon: const Icon(Icons.refresh),
          ),
          footer: w == null
              ? null
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (finished) ...[
                      FlowButton(
                        w.completed ? '오늘의 일기 쓰기' : '비공개 일기 쓰기',
                        onPressed: () => go(
                          '/diary-editor/${w.id}',
                          returnTo: GoRouterState.of(context).uri.toString(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      FlowButton(
                        '내 산책 기록',
                        secondary: true,
                        onPressed: () => go('/records'),
                      ),
                    ] else if (waiting) ...[
                      FlowButton(
                        '다시 저장',
                        onPressed: canAct ? () => run(controller.flush) : null,
                      ),
                      const SizedBox(height: 12),
                      FlowButton(
                        '내 기록으로 이동',
                        secondary: true,
                        onPressed: () => go('/records'),
                      ),
                    ] else if (active) ...[
                      FlowButton(
                        paused
                            ? '산책 재개'
                            : controller.collecting
                            ? '일시정지'
                            : '기록 재개',
                        onPressed: canAct
                            ? () => run(() async {
                                if (paused) {
                                  await controller.pause(false);
                                } else if (controller.collecting) {
                                  await controller.pause(true);
                                } else if (controller.queue?.pausedCommand !=
                                    null) {
                                  await controller.flush();
                                  if (controller.walk?.state == 'RECORDING') {
                                    await controller.record();
                                  }
                                } else {
                                  await controller.record();
                                }
                              })
                            : null,
                      ),
                      const SizedBox(height: 12),
                      FlowButton(
                        '산책 종료',
                        secondary: true,
                        onPressed: canAct ? finish : null,
                      ),
                    ],
                  ],
                ),
          child: body([
            if (w != null) ...[
              FlowHeading(
                waiting
                    ? '연결된 곳에서 저장을 이어가요'
                    : finished
                    ? (w.route == null
                          ? '오늘의 산책을 저장했어요'
                          : w.completed
                          ? '코스를 완주했어요!'
                          : '오늘의 산책을 저장했어요')
                    : paused
                    ? '잠시 쉬어 가요'
                    : '$pets와 걷는 중',
                description: waiting
                    ? '미전송 기록과 처음 종료 시각을 보존하고 있어요.'
                    : w.route?['title'] ?? '우리만의 산책길을 기록해요.',
              ),
              const SizedBox(height: 20),
              WalkingMap(path: points, selected: rows(w.route?['path'])),
              const SizedBox(height: 12),
              if (w.route != null && !finished)
                const Text('점선: 선택 코스 · 실선: 걸은 길', style: AppText.caption),
              const SizedBox(height: 16),
              ChallengeCard(
                finished
                    ? '${w.distance / 1000}km · ${duration.inMinutes}분'
                    : '${duration.inMinutes}:${(duration.inSeconds % 60).toString().padLeft(2, '0')} · $pets',
                description: finished
                    ? '산책 거리 · 산책 시간'
                    : '기록한 산책 시간 · 함께 걷는 강아지',
              ),
              if (active && controller.gpsQuiet)
                ChallengeCard(
                  '위치를 기다리고 있어요',
                  description: '위치 수신이 끊겼어요. 위치 서비스와 권한을 확인해 주세요. 누락된 이동은 완주 판정에서 제외될 수 있어요.',
                  child: FlowButton(
                    '위치 기록 다시 연결',
                    secondary: true,
                    onPressed: canAct ? () => run(controller.record) : null,
                  ),
                ),
              if (controller.error != null && active)
                ChallengeCard(
                  controller.error!,
                  description: '기록은 계정별로 보존돼요. 연결을 확인한 뒤 다시 저장해 주세요.',
                  child: FlowButton(
                    '기록 다시 전송',
                    secondary: true,
                    onPressed: canAct ? () => run(controller.flush) : null,
                  ),
                ),
              if (!finished && !controller.collecting && !paused && !waiting)
                const ChallengeCard(
                  '기록 복구',
                  description: '저장된 산책을 불러왔어요. 위치 권한을 확인한 뒤 기록 재개를 눌러 주세요.',
                ),
              if (finished) ...[
                ChallengeCard(
                  w.route != null
                      ? (w.completed ? '완주 확인' : '미완주 기록')
                      : '자유 산책',
                  description: w.route == null
                      ? '자유 산책에는 코스 완주 여부를 표시하지 않아요.'
                      : w.completed
                      ? '코스 완주를 확인했어요.'
                      : '시작점·도착점·이동 거리·GPS 정확도에 따라 완주가 인정되지 않을 수 있어요. 비공개 일기와 코스 작성은 가능해요.',
                ),
                ChallengeCard(
                  '이 산책으로 코스 공유',
                  description: '공개할 연속 구간을 골라요.',
                  onTap: () => go(
                    '/route-create/${w.id}',
                    returnTo: GoRouterState.of(context).uri.toString(),
                  ),
                ),
                ChallengeCard(
                  '산책 삭제',
                  description: '원본 GPS, 연결 일기·사진·내 코스와 여권·챌린지 결과에 영향을 줘요.',
                  onTap: busy
                      ? null
                      : () async {
                          if (await confirm(
                            '산책을 삭제할까요?',
                            '연결된 일기·사진·이 산책에서 만든 코스가 삭제돼요. 완료 보상과 여권이 달라질 수 있어요.',
                            action: '삭제',
                          )) {
                            await run(() async {
                              await api.call('deleteWalk', {'id': w.id});
                              if (controller.walk?.id == w.id) {
                                await controller.clearDeletedWalk(w.id);
                              }
                              if (context.mounted) {
                                context.go(challengePath(apiMode, '/records'));
                              }
                            });
                          }
                        },
                ),
              ] else
                ChallengeCard(
                  '안전한 산책 안내',
                  description: paused
                      ? '위치 기록을 잠시 멈췄어요. 산책 재개를 누르면 다시 기록해요.'
                      : waiting
                      ? '위치 수집을 멈추고 저장을 기다리고 있어요. 연결된 곳에서 저장을 이어가세요.'
                      : !controller.collecting
                      ? '저장된 산책을 확인하고 기록 재개를 눌러 주세요. 지금은 위치를 수집하지 않아요.'
                      : '지금까지 걸은 길을 기록하고 있어요. 화면을 나가도 산책을 종료하지 않아요. 산책 중 화면을 잠가도 위치 권한이 허용된 동안 기록해요. 안전한 곳에서 화면을 확인해 주세요.',
                ),
            ],
            if (error != null)
              FlowButton('최신 산책 확인', onPressed: canAct ? reload : null),
          ]),
        );
      },
    );
  }
}
