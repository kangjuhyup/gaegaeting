import '../../../app/bottom_navigation.dart';
import 'challenge_common.dart';

class ChallengeRecordsScreen extends ConsumerWidget {
  const ChallengeRecordsScreen({
    super.key,
    required this.apiMode,
    this.returnTo,
  });
  final bool apiMode;
  final String? returnTo;
  @override
  Widget build(BuildContext context, WidgetRef ref) => FlowScreen(
    title: '내 산책 기록',
    backPath: returnTo ?? challengePath(apiMode, ''),
    navigation: AppBottomNavigation(
      selected: returnTo?.contains('/me') == true || returnTo == '/profile'
          ? '/profile'
          : '/challenge',
      apiMode: apiMode,
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const FlowHeading('함께 쌓은 산책', description: '공유한 길과 우리만의 일기를 모았어요.'),
        const SizedBox(height: 20),
        for (final item in [
          ('내 코스', 'routes', '초안 · 검토 중 · 수정 요청 · 공개'),
          ('저장 코스', 'bookmarks', '다음에 걷고 싶은 산책길'),
          ('내 산책 일기', 'diaries', '산책마다 남긴 이야기'),
          ('내 산책', 'walks', '기록한 산책'),
          ('산책 여권', 'passport', '완주한 공개 코스 기록'),
          ('챌린지 참여 기록', 'challenges', '최신 최대 50개 참여 기록'),
        ])
          ChallengeCard(
            item.$1,
            description: item.$3,
            onTap: () => context.push(
              challengePath(
                apiMode,
                '/records/${item.$2}',
                returnTo: GoRouterState.of(context).uri.toString(),
              ),
            ),
          ),
      ],
    ),
  );
}

class ChallengeRecordListScreen extends ConsumerStatefulWidget {
  const ChallengeRecordListScreen({
    super.key,
    required this.kind,
    this.returnTo,
  });
  final String kind;
  final String? returnTo;
  @override
  ConsumerState<ChallengeRecordListScreen> createState() => _RecordListState();
}

class _RecordListState extends ChallengeState<ChallengeRecordListScreen> {
  List<Json> items = [];
  final cursor = PageCursor();
  static const configs = {
    'routes': ('내 코스', 'myWalkingRoutes'),
    'bookmarks': ('저장 코스', 'myBookmarkedWalkingRoutes'),
    'walks': ('내 산책', 'myWalks'),
    'diaries': ('내 일기', 'myWalkingDiaries'),
    'passport': ('산책 여권', 'myWalkingPassport'),
    'challenges': ('챌린지 참여 기록', 'myChallenges'),
  };
  @override
  void initState() {
    super.initState();
    Future.microtask(() => reload(true));
  }

  Future<void> reload(bool reset) => run(() async {
    if (reset) {
      items = [];
      cursor.reset();
    }
    final vars = widget.kind == 'passport'
        ? <String, dynamic>{}
        : widget.kind == 'challenges'
        ? {'limit': 50}
        : {'limit': 20, 'offset': cursor.offset};
    final result = rows(await api.call(configs[widget.kind]!.$2, vars));
    items.addAll(result);
    cursor.received(result.length);
    if (['passport', 'challenges'].contains(widget.kind)) {
      cursor.hasMore = false;
    }
  }, load: reset);
  @override
  Widget build(BuildContext context) => FlowScreen(
    title: configs[widget.kind]!.$1,
    backPath: widget.returnTo ?? challengePath(apiMode, '/records'),
    actions: IconButton(
      tooltip: '새로고침',
      onPressed: busy ? null : () => reload(true),
      icon: const Icon(Icons.refresh),
    ),
    child: body([
      FlowHeading(
        switch (widget.kind) {
          'diaries' => '산책마다 남긴 이야기',
          'passport' => '완주한 산책길',
          _ => configs[widget.kind]!.$1,
        },
        description: widget.kind == 'passport'
            ? '서로 다른 ${items.length}개 코스 · 최신 최대 100개 기록'
            : widget.kind == 'challenges'
            ? '최신 최대 50개 참여 기록'
            : '기록을 선택해 자세히 확인해요.',
      ),
      const SizedBox(height: 20),
      if (!loading && items.isEmpty)
        const ChallengeEmpty('아직 기록이 없어요. 새로운 산책을 시작해 보세요.'),
      for (final item in items)
        ChallengeCard(
          switch (widget.kind) {
            'walks' =>
              '${koreaDate(item['endedAt'] ?? item['startedAt'])} · ${rows(item['pets']).map((p) => p['name']).join(', ')}',
            'diaries' => "${item['walkDate']} · ${item['mood'] ?? '산책 일기'}",
            'challenges' => challengeTitle(item['kind']),
            _ => item['title'],
          },
          description: switch (widget.kind) {
            'walks' =>
              '${(item['distanceMeters'] as num) / 1000}km · ${item['state'] == 'FINISHED'
                  ? '저장됨'
                  : item['state'] == 'PAUSED'
                  ? '일시정지'
                  : '기록 중'}',
            'diaries' =>
              "사진 ${rows(item['photos']).length}장 · ${item['visibility'] == 'PUBLIC' ? '코스 공개 후기' : '나만 보기'}",
            'routes' => statusLabel(item['status']),
            'passport' => "완주 ${item['completedCount']}회",
            'challenges' =>
              "${item['progressCount']} / ${item['targetCount']} · ${statusLabel(item['status'])}",
            _ => item['startPlace'],
          },
          onTap: widget.kind == 'passport'
              ? null
              : () => go(switch (widget.kind) {
                  'walks' => "/walk/${item['id']}",
                  'diaries' => "/diary/${item['id']}",
                  'routes' => "/own-course/${item['id']}",
                  'challenges' => "/participation/${item['id']}",
                  _ => "/course/${item['id']}",
                }, returnTo: GoRouterState.of(context).uri.toString()),
        ),
      if (cursor.hasMore && !loading && items.isNotEmpty)
        FlowButton(
          '더 보기',
          secondary: true,
          onPressed: busy ? null : () => reload(false),
        ),
      if (error != null)
        FlowButton('다시 불러오기', onPressed: busy ? null : () => reload(true)),
    ]),
  );
}
