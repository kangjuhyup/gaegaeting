import 'dart:convert';

import 'package:geolocator/geolocator.dart';

import '../../account/application/api_session.dart';
import 'challenge_common.dart';
import 'walking_map.dart';

class RouteEditorScreen extends ConsumerStatefulWidget {
  const RouteEditorScreen({
    super.key,
    this.walkId,
    this.routeId,
    this.returnTo,
  });
  final String? walkId, routeId, returnTo;
  @override
  ConsumerState<RouteEditorScreen> createState() => _RouteEditorState();
}

class _RouteEditorState extends ChallengeState<RouteEditorScreen> {
  final title = TextEditingController(),
      description = TextEditingController(),
      start = TextEditingController(),
      end = TextEditingController();
  Set<String> tags = {};
  WalkRecord? walk;
  Json? route;
  int step = 0, segment = 0, revision = 0, from = 0, to = 1;
  bool privacy = false, conflict = false, allowPop = false;
  String? requestId, payload, identity;
  Future<void> draftTail = Future.value();
  String get draftKey => 'route.${widget.walkId ?? widget.routeId}';
  @override
  void initState() {
    super.initState();
    for (final c in [title, description, start, end]) {
      c.addListener(draft);
    }
    Future.microtask(load);
  }

  @override
  void dispose() {
    for (final c in [title, description, start, end]) {
      c.dispose();
    }
    super.dispose();
  }

  bool get editable => !['PENDING', 'PUBLISHED'].contains(route?['status']);
  List<TrackPoint> get points => walk?.points ?? [];
  List<int> get segments => points
      .map((p) => p.segment)
      .toSet()
      .where((s) => points.where((p) => p.segment == s).length >= 2)
      .toList();
  List<int> indices(int s) => [
    for (var i = 0; i < points.length; i++)
      if (points[i].segment == s) i,
  ];
  List<Json> get path => points.isEmpty
      ? []
      : points.sublist(from, to + 1).map((p) => p.toJson()).toList();
  double get distance {
    var sum = 0.0;
    for (var i = from + 1; i <= to && i < points.length; i++) {
      sum += Geolocator.distanceBetween(
        points[i - 1].latitude,
        points[i - 1].longitude,
        points[i].latitude,
        points[i].longitude,
      );
    }
    return sum;
  }

  void draft() {
    if (identity == null || loading) return;
    final who = identity!;
    final snapshot = {
      'title': title.text,
      'description': description.text,
      'start': start.text,
      'end': end.text,
      'tags': tags.toList(),
      'from': from,
      'to': to,
      'segment': segment,
      'privacy': privacy,
      'revision': revision,
      'requestId': requestId,
      'payload': payload,
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
    if (widget.routeId != null) {
      route = json(await api.call('myWalkingRoute', {'id': widget.routeId}));
      revision = route!['revision'];
      title.text = route!['title'];
      description.text = route!['description'];
      start.text = route!['startPlace'];
      end.text = route!['endPlace'];
      tags = Set<String>.from(route!['tags']);
      step = 2;
    } else {
      walk = WalkRecord(json(await api.call('myWalk', {'id': widget.walkId})));
      if (walk!.state != 'FINISHED') {
        throw const ChallengeFailure('종료한 산책만 코스로 만들 수 있어요.', status: 400);
      }
      if (segments.isNotEmpty) {
        segment = segments.first;
        final range = indices(segment);
        from = range.first;
        to = range.last;
      }
    }
    if (identity != null) {
      final d = await ref
          .read(challengeVaultProvider)
          .read(identity!, draftKey);
      if (d != null) {
        title.text = d['title'];
        description.text = d['description'];
        start.text = d['start'];
        end.text = d['end'];
        tags = Set<String>.from(d['tags']);
        if (widget.routeId != null) {
          conflict = revision != d['revision'];
          revision = d['revision'];
        } else {
          from = d['from'];
          to = d['to'];
          segment = d['segment'];
          privacy = d['privacy'];
          if (!segments.contains(segment) ||
              from < 0 ||
              to >= points.length ||
              to <= from ||
              points[from].segment != segment ||
              points[to].segment != segment) {
            if (segments.isNotEmpty) {
              segment = segments.first;
              final range = indices(segment);
              from = range.first;
              to = range.last;
            }
            privacy = false;
          }
        }
        requestId = d['requestId'];
        payload = d['payload'];
      }
    }
  }, load: true);
  Future<void> cancel() async {
    if (await confirm(
      '코스 작성을 닫을까요?',
      '입력한 내용은 이 계정의 기기에 보존돼요. 저장한 코스는 그대로 남아요.',
      action: '닫기',
    )) {
      await draftTail;
      if (mounted) {
        setState(() => allowPop = true);
        context.go(
          widget.returnTo ?? challengePath(apiMode, '/records/routes'),
        );
      }
    }
  }

  Future<void> save() => run(() async {
    if (title.text.trim().isEmpty ||
        start.text.trim().isEmpty ||
        end.text.trim().isEmpty) {
      throw const ChallengeFailure('제목·출발 장소·도착 장소를 입력해 주세요.', status: 400);
    }
    final details = {
      'title': title.text.trim(),
      'description': description.text.trim(),
      'startPlace': start.text.trim(),
      'endPlace': end.text.trim(),
      'tags': tags.toList(),
    };
    try {
      Json saved;
      if (widget.routeId != null) {
        saved = json(
          await api.call('updateWalkingRoute', {
            'id': widget.routeId,
            'revision': revision,
            'input': details,
          }),
        );
      } else {
        final input = {
          'walkId': widget.walkId,
          'fromIndex': from,
          'toIndex': to,
          'details': details,
        };
        final fingerprint = jsonEncode(input);
        if (payload != fingerprint) {
          requestId = uuid();
          payload = fingerprint;
        }
        draft();
        await draftTail;
        saved = json(
          await api.call('createWalkingRoute', {
            'input': {...input, 'requestId': requestId},
          }),
        );
      }
      await draftTail;
      if (identity != null) {
        await ref.read(challengeVaultProvider).write(identity!, draftKey, null);
      }
      if (mounted) {
        setState(() => allowPop = true);
        context.pushReplacement(
          challengePath(apiMode, '/own-course/${saved['id']}'),
        );
      }
    } on ChallengeFailure catch (e) {
      if (e.status == 409 && widget.routeId != null) {
        conflict = true;
        route = json(await api.call('myWalkingRoute', {'id': widget.routeId}));
      }
      rethrow;
    }
  });
  @override
  Widget build(BuildContext context) {
    final valid =
        widget.routeId != null ||
        (points.isNotEmpty &&
            to > from &&
            to - from + 1 <= 4000 &&
            distance >= 100 &&
            distance <= 50000);
    return PopScope(
      canPop: allowPop,
      onPopInvokedWithResult: (p, r) {
        if (!p && !busy) cancel();
      },
      child: FlowScreen(
        title: step == 0
            ? '공개 구간 선택'
            : step == 1
            ? '공개 미리보기'
            : '코스 정보',
        actions: IconButton(
          tooltip: '작성 닫기',
          onPressed: busy ? null : cancel,
          icon: const Icon(Icons.close),
        ),
        footer: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            FlowButton(
              step == 0
                  ? '공개 미리보기'
                  : step == 1
                  ? '코스 정보 입력'
                  : '초안 저장',
              onPressed:
                  busy ||
                      !editable ||
                      conflict ||
                      !valid ||
                      (step == 1 && !privacy)
                  ? null
                  : () {
                      if (step < 2) {
                        setState(() => step++);
                      } else {
                        save();
                      }
                    },
            ),
            if (step > 0 && widget.routeId == null) ...[
              const SizedBox(height: 12),
              FlowButton(
                '구간 다시 선택',
                secondary: true,
                onPressed: busy ? null : () => setState(() => step = 0),
              ),
            ],
          ],
        ),
        child: body([
          FlowHeading(
            step == 0
                ? '공유할 길만 골라 주세요'
                : step == 1
                ? '이 구간만 공개돼요'
                : '산책길을 소개해 주세요',
            description: step == 0
                ? '집이나 자주 머무는 곳은 구간에서 빼 주세요.'
                : step == 1
                ? '집 등 사적인 위치가 보이면 구간을 다시 선택해 주세요.'
                : '승인 전에는 나만 볼 수 있어요.',
          ),
          const SizedBox(height: 20),
          if (conflict)
            ChallengeCard(
              '코스가 다른 곳에서 바뀌었어요',
              description:
                  '최신 상태: ${statusLabel(route?['status'] ?? '')} · ${route?['title'] ?? ''}\n내 입력은 그대로 보존했어요.',
              child: FlowButton(
                '최신 상태 확인 후 내 입력 유지',
                secondary: true,
                onPressed: busy
                    ? null
                    : () => setState(() {
                        revision = route!['revision'];
                        conflict = false;
                        draft();
                      }),
              ),
            ),
          if (!editable)
            ChallengeCard(
              '먼저 검토 요청 / 공개를 중단해 주세요',
              description: '중단한 뒤 정보만 수정할 수 있어요. 경로 변경은 새 코스로 만들어요.',
              child: FlowButton(
                '중단하기',
                onPressed: busy
                    ? null
                    : () async {
                        if (await confirm(
                          '검토 요청 / 공개를 중단할까요?',
                          '코스 정보 수정이 가능해져요.',
                          action: '중단',
                        )) {
                          await run(() async {
                            route = json(
                              await api.call('withdrawWalkingRoute', {
                                'id': widget.routeId,
                              }),
                            );
                            revision = route!['revision'];
                            draft();
                          });
                        }
                      },
              ),
            ),
          if (widget.routeId == null && segments.isEmpty)
            const ChallengeEmpty('공유할 연속 구간이 없어요. 위치가 기록된 다른 산책을 선택해 주세요.'),
          if (widget.routeId != null)
            WalkingMap(path: rows(route?['path']))
          else if (points.isNotEmpty && segments.isNotEmpty) ...[
            WalkingMap(
              path: path,
              excluded: step == 0
                  ? [
                      ...points
                          .take(from)
                          .map((p) => {...p.toJson(), 'segment': -1}),
                      ...points
                          .skip(to + 1)
                          .map((p) => {...p.toJson(), 'segment': -2}),
                    ]
                  : [],
            ),
            const SizedBox(height: 16),
            if (step == 0) ...[
              DropdownButtonFormField<int>(
                initialValue: segment,
                decoration: const InputDecoration(labelText: '연속 산책 구간'),
                items: [
                  for (final s in segments)
                    DropdownMenuItem(value: s, child: Text('구간 ${s + 1}')),
                ],
                onChanged: busy
                    ? null
                    : (v) => setState(() {
                        segment = v!;
                        final range = indices(v);
                        from = range.first;
                        to = range.last;
                        privacy = false;
                        draft();
                      }),
              ),
              RangeSlider(
                min: indices(segment).first.toDouble(),
                max: indices(segment).last.toDouble(),
                divisions: indices(segment).length - 1,
                values: RangeValues(from.toDouble(), to.toDouble()),
                labels: RangeLabels('시작 ${from + 1}', '끝 ${to + 1}'),
                onChanged: busy
                    ? null
                    : (v) => setState(() {
                        from = v.start.round();
                        to = v.end.round();
                        privacy = false;
                        draft();
                      }),
              ),
              Row(
                children: [
                  Expanded(
                    child: Text('시작 지점 ${from + 1}', style: AppText.small),
                  ),
                  Expanded(child: Text('끝 지점 ${to + 1}', style: AppText.small)),
                ],
              ),
              const SizedBox(height: 16),
              ChallengeCard(
                '공개할 구간 ${(distance / 1000).toStringAsFixed(2)}km',
                description: '집 등 사적인 위치를 제외한 한 구간을 선택해요.',
              ),
              if (!valid)
                const ChallengeCard(
                  '공유 조건을 확인해 주세요',
                  description: '한 연속 구간에서 2~4,000점, 100m~50km를 선택해 주세요.',
                ),
            ],
            if (step == 1) ...[
              FlowCheck(
                '집 등 사적인 위치를 제외했어요',
                value: privacy,
                onChanged: (v) => setState(() {
                  privacy = v;
                  draft();
                }),
              ),
              const ChallengeCard(
                '공개 안내',
                description: '공개 경로에는 선택한 구간의 좌표만 포함돼요. 기록 시각과 정확도는 공개하지 않아요.',
              ),
            ],
          ],
          if (step == 2) ...[
            FlowField('코스 제목', controller: title, maxLength: 100),
            const SizedBox(height: 16),
            FlowField('출발 장소', controller: start, maxLength: 100),
            const SizedBox(height: 16),
            FlowField('도착 장소', controller: end, maxLength: 100),
            const SizedBox(height: 16),
            TextField(
              controller: description,
              minLines: 3,
              maxLines: 6,
              maxLength: 2000,
              readOnly: !editable,
              decoration: const InputDecoration(labelText: '코스 소개'),
            ),
            Wrap(
              spacing: 8,
              children: [
                for (final e in routeTags.entries)
                  FilterChip(
                    label: Text(e.value),
                    selected: tags.contains(e.key),
                    onSelected: busy || !editable
                        ? null
                        : (v) => setState(() {
                            v ? tags.add(e.key) : tags.remove(e.key);
                            draft();
                          }),
                  ),
              ],
            ),
          ],
        ]),
      ),
    );
  }
}
