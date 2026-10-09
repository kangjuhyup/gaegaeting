import '../../../app/bottom_navigation.dart';
import '../../account/application/api_session.dart';
import '../../flow/application/flow_controller.dart';
import 'challenge_common.dart';

class ChallengeHomeScreen extends ConsumerStatefulWidget {
  const ChallengeHomeScreen({super.key});
  @override
  ConsumerState<ChallengeHomeScreen> createState() => _ChallengeHomeState();
}

class _ChallengeHomeState extends ChallengeState<ChallengeHomeScreen> {
  List<Json> definitions = [], participations = [];
  @override
  void initState() {
    super.initState();
    Future.microtask(reload);
  }

  Future<void> reload() => run(() async {
    definitions = rows(await api.call('challenges'));
    participations = rows(await api.call('myChallenges', {'limit': 50}));
  }, load: true);
  @override
  Widget build(BuildContext context) {
    final walk = ref.watch(walkControllerProvider);
    final petName = apiMode
        ? ref.watch(apiSessionProvider).asData?.value?.pets.firstOrNull?.name
        : ref.watch(flowProvider).petName;
    return ListenableBuilder(
      listenable: walk,
      builder: (c, _) => FlowScreen(
        title: '챌린지',
        backPath: apiMode ? '/api/main' : '/main',
        navigation: AppBottomNavigation(
          selected: '/challenge',
          apiMode: apiMode,
        ),
        actions: IconButton(
          tooltip: '새로고침',
          onPressed: busy ? null : reload,
          icon: const Icon(Icons.refresh),
        ),
        child: body([
          FlowHeading(
            petName == null ? '함께, 한 걸음 더' : '$petName와 함께, 한 걸음 더',
            description: '익숙한 산책길에서 새로운 즐거움을 찾아요.',
          ),
          const SizedBox(height: 20),
          if (!apiMode)
            const ChallengeCard(
              '디자인 미리보기',
              description: '실제 기록·가입은 API 모드와 로그인 후 사용할 수 있어요.',
            ),
          if (apiMode && walk.walk != null && walk.walk!.state != 'FINISHED')
            ChallengeCard(
              '진행 중인 산책이 있어요',
              description: '기록을 확인하고 이어서 걸어요.',
              onTap: () => go('/walk/${walk.walk!.id}'),
            ),
          ChallengeCard(
            '오늘은 어디로 걸을까요?',
            description: '함께 걷는 코스도, 우리만의 산책도.',
            peach: true,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const DesignIcon('paw', size: 20),
                const SizedBox(height: 8),
                FlowButton('자유 산책 시작', onPressed: () => go('/prepare')),
              ],
            ),
          ),
          ChallengeCard(
            '산책 코스',
            description: '주변 공개 코스 둘러보기',
            onTap: () => go('/courses'),
          ),
          for (final d in definitions)
            ChallengeCard(
              challengeTitle(d['kind']),
              description: "${d['durationDays']}일 · ${d['description']}",
              onTap: () => go('/catalogue/${d['kind']}'),
              child: const Row(
                children: [
                  DesignIcon('trophy', size: 24),
                  SizedBox(width: 8),
                  Text('자세히 보기 →', style: AppText.small),
                ],
              ),
            ),
          for (final p in participations.where(
            (p) => ['ACTIVE', 'VERIFYING'].contains(p['status']),
          ))
            ChallengeCard(
              '${challengeTitle(p['kind'])} · ${statusLabel(p['status'])}',
              description: "${p['progressCount']} / ${p['targetCount']}",
              onTap: () => go('/participation/${p['id']}'),
            ),
          ChallengeCard(
            '내 산책 기록',
            description: '내 코스 · 일기 · 산책 여권',
            onTap: () => go('/records', returnTo: challengePath(apiMode, '')),
          ),
          if (error != null)
            FlowButton('다시 불러오기', onPressed: busy ? null : reload),
        ]),
      ),
    );
  }
}

class ChallengeDetailScreen extends ConsumerStatefulWidget {
  const ChallengeDetailScreen({super.key, this.kind, this.id});
  final String? kind, id;
  @override
  ConsumerState<ChallengeDetailScreen> createState() => _ChallengeDetailState();
}

class _ChallengeDetailState extends ChallengeState<ChallengeDetailScreen> {
  Json? definition, participation;
  List<Json> history = [];
  String? requestId;
  @override
  void initState() {
    super.initState();
    Future.microtask(reload);
  }

  Future<void> reload() => run(() async {
    if (widget.id != null) {
      participation = json(await api.call('myChallenge', {'id': widget.id}));
    }
    final kind = widget.kind ?? participation?['kind'];
    final ds = rows(await api.call('challenges'));
    definition = ds.where((d) => d['kind'] == kind).firstOrNull;
    history = rows(await api.call('myChallenges', {'limit': 50}));
  }, load: true);
  bool get blocked => history.any(
    (p) =>
        p['kind'] == widget.kind &&
        ['ACTIVE', 'VERIFYING', 'COMPLETED'].contains(p['status']) &&
        DateTime.parse(p['settlesAt']).isAfter(DateTime.now()),
  );
  Future<void> join() async {
    if (!await confirm(
      '챌린지를 시작할까요?',
      '참여 후 시작한 산책부터 조건에 맞는 기록을 인정해요.',
      action: '참여',
    )) {
      return;
    }
    await run(() async {
      requestId ??= uuid();
      final p = json(
        await api.call('joinChallenge', {
          'input': {'kind': widget.kind, 'requestId': requestId},
        }),
      );
      if (mounted) {
        context.pushReplacement(
          challengePath(apiMode, '/participation/${p['id']}'),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final kind = widget.kind ?? participation?['kind'] ?? '';
    final p = participation;
    final d = definition;
    final explorer = kind == 'NEIGHBORHOOD_EXPLORER';
    return FlowScreen(
      title: p?['status'] == 'VERIFYING' ? '기록 확인 중' : challengeTitle(kind),
      backPath: challengePath(apiMode, ''),
      footer: d == null
          ? null
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (p == null)
                  FlowButton(
                    blocked ? '현재 참여 기록이 있어요' : '챌린지 참여',
                    onPressed: busy || blocked || !apiMode ? null : join,
                  )
                else if (p['status'] == 'ACTIVE')
                  FlowButton(
                    explorer
                        ? ((p['progressCount'] as num) > 0
                              ? '다음 코스 찾기'
                              : '첫 코스 찾기')
                        : '산책 시작',
                    onPressed: () => go(explorer ? '/courses' : '/prepare'),
                  )
                else if (p['status'] == 'VERIFYING')
                  FlowButton('저장 중인 산책 확인', onPressed: () => go('/records')),
                const SizedBox(height: 12),
                FlowButton(
                  '내 산책 기록',
                  secondary: true,
                  onPressed: () => go('/records'),
                ),
              ],
            ),
      child: body([
        FlowHeading(
          p == null
              ? (explorer
                    ? '새로운 산책길 ${d?['targetCount'] ?? ''}개를 만나요'
                    : '사진과 기분으로 ${d?['targetCount'] ?? ''}일을 담아요')
              : switch (p['status']) {
                  'ACTIVE' => '챌린지를 시작했어요',
                  'VERIFYING' => '마지막 기록을 확인하고 있어요',
                  'COMPLETED' => '챌린지를 완료했어요',
                  'EXPIRED' => '챌린지 기간이 끝났어요',
                  'CANCELLED' => '참여를 취소했어요',
                  _ => '참여 기록을 확인해요',
                },
          description: p == null
              ? '참여일 포함 ${d?['durationDays'] ?? ''}일 · ${d?['description'] ?? ''}'
              : '${koreaDate(p['joinedAt'])} 참여 · ${koreaDate(DateTime.parse(p['endsAt']).subtract(const Duration(seconds: 1)).toIso8601String())}까지',
        ),
        const SizedBox(height: 20),
        if (p == null)
          ChallengeCard(
            explorer ? '동네 탐험가 배지' : '산책 일기 카드',
            peach: true,
            description: '목표를 달성하고 완료 보상을 받아요.',
            child: const DesignIcon('trophy', size: 48),
          ),
        if (p != null) ...[
          ChallengeCard(
            "${p['progressCount']} / ${p['targetCount']}",
            description: statusLabel(p['status']),
            child: LinearProgressIndicator(
              value: (p['progressCount'] as num) / (p['targetCount'] as num),
            ),
          ),
          if (p['status'] == 'VERIFYING')
            ChallengeCard(
              '${koreaDate(p['settlesAt'])} 마지막 기록 확인',
              description: '기간 내 발생한 기록의 전송을 기다리고 있어요. 새 산책은 이번 참여에 인정되지 않아요.',
            ),
          if (p['earnedRewardCode'] != null)
            ChallengeCard(
              p['earnedRewardCode'] == 'NEIGHBORHOOD_EXPLORER_BADGE'
                  ? '동네 탐험가 배지'
                  : '산책 일기 카드',
              peach: true,
              description: '챌린지 완료 보상',
              child: const DesignIcon('trophy', size: 48),
            ),
          if (['ACTIVE', 'VERIFYING'].contains(p['status']))
            ChallengeCard(
              '참여 취소',
              onTap: busy
                  ? null
                  : () async {
                      if (await confirm(
                        '참여를 취소할까요?',
                        '참여 기록은 취소 상태로 남아요.',
                        action: '참여 취소',
                      )) {
                        await run(() async {
                          await api.call('cancelChallenge', {'id': p['id']});
                          participation = json(
                            await api.call('myChallenge', {'id': p['id']}),
                          );
                        });
                      }
                    },
            ),
        ],
        Text(d?['description'] ?? '', style: AppText.body),
        const SizedBox(height: 16),
        Text(
          explorer
              ? '참여 후 시작하고 기간 안에 종료한 서로 다른 타인 코스의 완주를 인정해요. 같은 코스 반복과 내 코스는 제외돼요.'
              : '서로 다른 한국 날짜에 이동한 산책을 종료하고 당일 사진과 기분을 담은 일기를 저장해 주세요. 나만 보기 일기도 인정돼요.',
          style: AppText.small,
        ),
        const SizedBox(height: 16),
        const ChallengeCard(
          '기록 인정 안내',
          description:
              '기간 종료 후에는 이미 발생한 기록 전송만 기다려요. 조건에 맞는 산책 기록이 도착하면 진행률에 반영돼요.',
        ),
        if (error != null) FlowButton('다시 확인', onPressed: busy ? null : reload),
      ]),
    );
  }
}
