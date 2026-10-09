import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import 'challenge_common.dart';
import 'walking_map.dart';

class CourseListScreen extends ConsumerStatefulWidget {
  const CourseListScreen({super.key});
  @override
  ConsumerState<CourseListScreen> createState() => _CourseListState();
}

class _CourseListState extends ChallengeState<CourseListScreen> {
  final cursor = PageCursor();
  List<Json> courses = [];
  LatLng center = const LatLng(37.5665, 126.9780);
  int radius = 3000;
  Set<String> tags = {};
  bool? loop;
  int? minDistance, maxDistance;
  bool map = false;
  @override
  void initState() {
    super.initState();
    Future.microtask(() => reload(true));
  }

  Future<void> reload(bool reset) => run(() async {
    if (reset) {
      cursor.reset();
      courses = [];
    }
    final result = rows(
      await api.call('walkingRoutes', {
        'input': {
          'latitude': center.latitude,
          'longitude': center.longitude,
          'radiusMeters': radius,
          'tags': tags.toList(),
          'isLoop': loop,
          'minDistanceMeters': minDistance,
          'maxDistanceMeters': maxDistance,
          'limit': PageCursor.limit,
          'offset': cursor.offset,
        },
      }),
    );
    courses.addAll(result);
    cursor.received(result.length);
  }, load: reset);
  Future<void> locate() => run(() async {
    await ref.read(walkingGpsProvider).permission();
    final p = await Geolocator.getCurrentPosition();
    center = LatLng(p.latitude, p.longitude);
    cursor.reset();
    courses = rows(
      await api.call('walkingRoutes', {
        'input': {
          'latitude': center.latitude,
          'longitude': center.longitude,
          'radiusMeters': radius,
          'tags': tags.toList(),
          'isLoop': loop,
          'minDistanceMeters': minDistance,
          'maxDistanceMeters': maxDistance,
          'limit': 20,
          'offset': 0,
        },
      }),
    );
    cursor.received(courses.length);
  });
  Future<void> filters() async {
    var selected = {...tags};
    var distance = radius.toDouble();
    var round = loop;
    final min = TextEditingController(text: minDistance?.toString() ?? ''),
        max = TextEditingController(text: maxDistance?.toString() ?? '');
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => StatefulBuilder(
        builder: (c, update) => AlertDialog(
          title: const Text('코스 필터'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('시작 지점까지 ${distance.round()}m'),
                Slider(
                  min: 100,
                  max: 20000,
                  value: distance,
                  onChanged: (v) => update(() => distance = v),
                ),
                Wrap(
                  spacing: 8,
                  children: [
                    for (final e in routeTags.entries)
                      FilterChip(
                        label: Text(e.value),
                        selected: selected.contains(e.key),
                        onSelected: (v) => update(() {
                          v ? selected.add(e.key) : selected.remove(e.key);
                        }),
                      ),
                  ],
                ),
                DropdownButton<bool?>(
                  value: round,
                  items: const [
                    DropdownMenuItem(value: null, child: Text('모든 코스')),
                    DropdownMenuItem(value: true, child: Text('순환 코스')),
                    DropdownMenuItem(value: false, child: Text('편도 코스')),
                  ],
                  onChanged: (v) => update(() => round = v),
                ),
                FlowField(
                  '최소 코스 길이(m)',
                  controller: min,
                  keyboardType: TextInputType.number,
                ),
                FlowField(
                  '최대 코스 길이(m)',
                  controller: max,
                  keyboardType: TextInputType.number,
                ),
                const Text('여러 태그는 모두 포함한 코스를 찾아요.', style: AppText.caption),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(c, false),
              child: const Text('취소'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(c, true),
              child: const Text('적용'),
            ),
          ],
        ),
      ),
    );
    if (ok == true && mounted) {
      tags = selected;
      radius = distance.round();
      loop = round;
      minDistance = int.tryParse(min.text);
      maxDistance = int.tryParse(max.text);
      await reload(true);
    }
    min.dispose();
    max.dispose();
  }

  @override
  Widget build(BuildContext context) => FlowScreen(
    title: '산책 코스',
    backPath: challengePath(apiMode, ''),
    actions: IconButton(
      tooltip: '코스 필터',
      onPressed: filters,
      icon: const DesignIcon('filter'),
    ),
    child: body([
      const FlowHeading('함께 걷기 좋은 코스', description: '공개된 코스를 지도 중심에서 찾아요.'),
      const SizedBox(height: 16),
      Row(
        children: [
          Expanded(child: Text('검색 반경 ${radius}m', style: AppText.small)),
          TextButton(
            onPressed: busy ? null : locate,
            child: const Text('내 위치'),
          ),
          TextButton(
            onPressed: () => setState(() => map = !map),
            child: Text(map ? '목록' : '지도'),
          ),
        ],
      ),
      if (map) ...[
        WalkingMap(
          key: ValueKey('${center.latitude}:${center.longitude}'),
          center: center,
          onCenter: (v) => center = v,
          path: courses.isEmpty ? [] : rows(courses.first['path']),
        ),
        const SizedBox(height: 12),
        FlowButton(
          '이 지도 중심에서 검색',
          secondary: true,
          onPressed: busy ? null : () => reload(true),
        ),
        const SizedBox(height: 16),
      ],
      if (!loading && courses.isEmpty)
        const ChallengeEmpty('주변 공개 코스가 아직 없어요. 지도 중심이나 필터를 바꿔 보세요.'),
      for (final r in courses)
        ChallengeCard(
          r['title'],
          description:
              "${(r['distanceMeters'] as num) / 1000}km · 코스 시작 지점까지 ${r['nearbyMeters'] ?? '-'}m\n${r['startPlace']} → ${r['endPlace']}",
          onTap: () => go('/course/${r['id']}'),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final t in r['tags'])
                FlowPill(routeTags[t] ?? t, neutral: true),
            ],
          ),
        ),
      if (cursor.hasMore && !loading && courses.isNotEmpty)
        FlowButton(
          '코스 더 보기',
          secondary: true,
          onPressed: busy ? null : () => reload(false),
        ),
      if (error != null)
        FlowButton('다시 검색', onPressed: busy ? null : () => reload(true)),
    ]),
  );
}

class CourseDetailScreen extends ConsumerStatefulWidget {
  const CourseDetailScreen({super.key, required this.id, this.owned = false});
  final String id;
  final bool owned;
  @override
  ConsumerState<CourseDetailScreen> createState() => _CourseDetailState();
}

class _CourseDetailState extends ChallengeState<CourseDetailScreen> {
  Json? course;
  List<Json> reviews = [];
  final cursor = PageCursor();
  @override
  void initState() {
    super.initState();
    Future.microtask(reload);
  }

  Future<void> reload() => run(() async {
    course = json(
      await api.call(widget.owned ? 'myWalkingRoute' : 'walkingRoute', {
        'id': widget.id,
      }),
    );
    if (!widget.owned) {
      cursor.reset();
      reviews = rows(
        await api.call('walkingRouteReviews', {
          'routeId': widget.id,
          'limit': 20,
          'offset': 0,
        }),
      );
      cursor.received(reviews.length);
    }
  }, load: true);
  Future<void> report() async {
    var reason = 'UNSAFE';
    final detail = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => StatefulBuilder(
        builder: (c, u) => AlertDialog(
          title: const Text('코스 신고'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButton<String>(
                  isExpanded: true,
                  value: reason,
                  items: const [
                    DropdownMenuItem(value: 'UNSAFE', child: Text('안전하지 않아요')),
                    DropdownMenuItem(
                      value: 'PET_RESTRICTED',
                      child: Text('반려견 출입 제한'),
                    ),
                    DropdownMenuItem(
                      value: 'PRIVACY',
                      child: Text('사적인 위치 노출'),
                    ),
                    DropdownMenuItem(
                      value: 'INACCURATE',
                      child: Text('정보가 정확하지 않아요'),
                    ),
                    DropdownMenuItem(value: 'OTHER', child: Text('기타')),
                  ],
                  onChanged: (v) => u(() => reason = v!),
                ),
                TextField(
                  controller: detail,
                  maxLength: 500,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: '추가 설명 (기타 사유는 필수)',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(c, false),
              child: const Text('취소'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(c, true),
              child: const Text('신고'),
            ),
          ],
        ),
      ),
    );
    if (ok == true) {
      await run(() async {
        if (reason == 'OTHER' && detail.text.trim().isEmpty) {
          throw const ChallengeFailure('기타 신고 사유를 설명해 주세요.', status: 400);
        }
        await api.call('reportWalkingRoute', {
          'id': widget.id,
          'reason': reason,
          'detail': detail.text.trim(),
        });
        if (mounted) {
          ScaffoldMessenger.of(context)
              .showSnackBar(const SnackBar(content: Text('신고를 접수했어요.')));
        }
      });
    }
    detail.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final r = course;
    return FlowScreen(
      title: widget.owned ? '내 코스' : '코스 상세',
      backPath: backTo('/courses'),
      actions: IconButton(
        tooltip: '새로고침',
        onPressed: busy ? null : reload,
        icon: const Icon(Icons.refresh),
      ),
      footer: r == null
          ? null
          : FlowButton(
              widget.owned ? '내 코스 편집' : '이 코스 걷기',
              onPressed: busy
                  ? null
                  : () => go(
                      widget.owned
                          ? '/route-editor/${r['id']}'
                          : '/prepare/${r['id']}',
                    ),
            ),
      child: body([
        if (r != null) ...[
          FlowHeading(
            r['title'],
            description: widget.owned
                ? statusLabel(r['status'])
                : '반려견과 함께 걷는 코스예요.',
          ),
          const SizedBox(height: 20),
          WalkingMap(path: rows(r['path'])),
          const SizedBox(height: 16),
          ChallengeCard(
            '${(r['distanceMeters'] as num) / 1000}km · 약 ${(r['durationSeconds'] as num) ~/ 60}분',
            description: '코스 길이 · 작성자 산책 시간\n완주한 보호자 ${r['walkerCount']}명',
          ),
          Text('${r['startPlace']} → ${r['endPlace']}', style: AppText.body),
          const SizedBox(height: 12),
          Text(r['description'], style: AppText.body),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final tag in r['tags'])
                FlowPill(routeTags[tag] ?? tag, neutral: true),
            ],
          ),
          const SizedBox(height: 16),
          if (widget.owned) ...[
            if (r['reviewReason'] != null)
              ChallengeCard('수정 요청 내용', description: r['reviewReason']),
            if (['PENDING', 'PUBLISHED'].contains(r['status']))
              ChallengeCard(
                '검토 요청 / 공개 중단',
                description: '중단한 뒤 정보를 수정할 수 있어요.',
                onTap: busy
                    ? null
                    : () async {
                        if (await confirm(
                          '검토 요청 또는 공개를 중단할까요?',
                          '기존 산책 기록은 그대로 남아요.',
                          action: '중단',
                        )) {
                          await run(() async {
                            course = json(
                              await api.call('withdrawWalkingRoute', {
                                'id': r['id'],
                              }),
                            );
                          });
                        }
                      },
              ),
            if (['DRAFT', 'REJECTED', 'WITHDRAWN'].contains(r['status']))
              ChallengeCard(
                '공개 검토 요청',
                description: '승인 전까지 비공개로 유지돼요.',
                onTap: busy
                    ? null
                    : () async {
                        if (await confirm(
                          '공개 검토를 요청할까요?',
                          '집 등 사적인 위치가 제외됐는지 확인해 주세요.',
                          action: '검토 요청',
                        )) {
                          await run(() async {
                            course = json(
                              await api.call('submitWalkingRoute', {
                                'id': r['id'],
                              }),
                            );
                          });
                        }
                      },
              ),
          ] else ...[
            ChallengeCard(
              r['bookmarked'] == true ? '저장됨' : '저장하기',
              description: '나중에 걷고 싶은 코스',
              onTap: busy
                  ? null
                  : () => run(() async {
                      await api.call('bookmarkWalkingRoute', {
                        'id': r['id'],
                        'saved': r['bookmarked'] != true,
                      });
                      course = json(
                        await api.call('walkingRoute', {'id': r['id']}),
                      );
                    }),
            ),
            ChallengeCard('코스 신고', onTap: busy ? null : report),
            const Text('공개 후기', style: AppText.title),
            const SizedBox(height: 16),
            if (reviews.isEmpty) const ChallengeEmpty('아직 공개 후기가 없어요.'),
            for (final review in reviews)
              ChallengeCard(
                review['authorName'],
                description:
                    "${review['walkDate']} · ${review['mood'] ?? ''}\n${review['content']}",
                child: PhotoRow(
                  photos: rows(review['photos']),
                  onRefresh: reload,
                ),
              ),
            if (cursor.hasMore && reviews.isNotEmpty)
              FlowButton(
                '후기 더 보기',
                secondary: true,
                onPressed: busy
                    ? null
                    : () => run(() async {
                        final result = rows(
                          await api.call('walkingRouteReviews', {
                            'routeId': r['id'],
                            'limit': 20,
                            'offset': cursor.offset,
                          }),
                        );
                        reviews.addAll(result);
                        cursor.received(result.length);
                      }),
              ),
          ],
        ],
        if (error != null)
          FlowButton('최신 코스 확인', onPressed: busy ? null : reload),
      ]),
    );
  }
}

class PhotoRow extends StatelessWidget {
  const PhotoRow({super.key, required this.photos, required this.onRefresh});
  final List<Json> photos;
  final VoidCallback onRefresh;
  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 8,
    runSpacing: 8,
    children: [
      for (final p in photos)
        if (p['status'] == 'READY' && p['url'] != null)
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.network(
              p['url'],
              width: 140,
              height: 100,
              fit: BoxFit.cover,
              errorBuilder: (c, e, s) => SizedBox(
                width: 140,
                height: 100,
                child: TextButton(
                  onPressed: onRefresh,
                  child: const Text('사진 다시 불러오기'),
                ),
              ),
            ),
          ),
    ],
  );
}
