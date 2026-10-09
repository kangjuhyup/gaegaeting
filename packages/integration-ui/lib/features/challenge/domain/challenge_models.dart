import 'dart:math';

import '../../account/data/account_repository.dart';

typedef Json = Map<String, dynamic>;
Json json(Object? v) => Map<String, dynamic>.from(v as Map);
List<Json> rows(Object? v) => (v as List? ?? []).map(json).toList();
String uuid() {
  final r = Random.secure();
  final b = List.generate(16, (_) => r.nextInt(256));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  final h = b.map((v) => v.toRadixString(16).padLeft(2, '0')).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
}

class ChallengeFailure extends ApiFailure {
  const ChallengeFailure(super.message, {this.status = 0, super.requiresLogin});
  final int status;
  bool get retryable => status == 0 || status == 503;
}

String challengeTitle(String kind) => switch (kind) {
  'NEIGHBORHOOD_EXPLORER' => '동네 탐험가',
  'WALK_DIARY' => '산책 일기',
  _ => '챌린지',
};
const routeTags = {
  'DIRT_PATH': '흙길',
  'NO_STAIRS': '계단 없음',
  'SHADE': '그늘',
  'CROSSWALK': '횡단보도',
  'REST_AREA': '쉼터',
};
String statusLabel(String s) => switch (s) {
  'ACTIVE' => '참여 중',
  'VERIFYING' => '기록 확인 중',
  'COMPLETED' => '완료',
  'EXPIRED' => '기간 종료',
  'CANCELLED' => '참여 취소',
  'DRAFT' => '초안',
  'PENDING' => '검토 중',
  'PUBLISHED' => '공개',
  'REJECTED' => '수정 요청',
  'WITHDRAWN' => '공개 중단',
  _ => '상태 확인 필요',
};
String koreaDate(Object? value) {
  if (value == null) return '';
  final d = DateTime.parse(value.toString())
      .toUtc()
      .add(const Duration(hours: 9));
  return '${d.year}. ${d.month.toString().padLeft(2, '0')}. ${d.day.toString().padLeft(2, '0')}.';
}

class TrackPoint {
  const TrackPoint(
    this.latitude,
    this.longitude,
    this.recordedAt,
    this.accuracyMeters,
    this.segment,
  );
  factory TrackPoint.fromJson(Json v) => TrackPoint(
    (v['latitude'] as num).toDouble(),
    (v['longitude'] as num).toDouble(),
    DateTime.parse(v['recordedAt']),
    (v['accuracyMeters'] as num).toDouble(),
    v['segment'] as int,
  );
  final double latitude, longitude, accuracyMeters;
  final DateTime recordedAt;
  final int segment;
  Json toJson() => {
    'latitude': latitude,
    'longitude': longitude,
    'recordedAt': recordedAt.toUtc().toIso8601String(),
    'accuracyMeters': accuracyMeters,
    'segment': segment,
  };
  bool same(TrackPoint p) => toJson().toString() == p.toJson().toString();
}

class WalkRecord {
  const WalkRecord(this.value);
  final Json value;
  String get id => value['id'];
  String get state => value['state'];
  List<TrackPoint> get points =>
      rows(value['points']).map(TrackPoint.fromJson).toList();
  List<Json> get segments => rows(value['segments']);
  List<Json> get pets => rows(value['pets']);
  Json? get route => value['route'] == null ? null : json(value['route']);
  bool get completed => value['completed'] == true;
  int get distance => value['distanceMeters'] as int;
  DateTime get startedAt => DateTime.parse(value['startedAt']);
  Duration duration(DateTime now) => segments.fold(
    Duration.zero,
    (d, s) =>
        d +
        DateTime.parse(s['endedAt'] ?? now.toUtc().toIso8601String())
            .difference(DateTime.parse(s['startedAt'])),
  );
}

class PageCursor {
  int offset = 0;
  bool hasMore = true;
  static const limit = 20;
  void reset() {
    offset = 0;
    hasMore = true;
  }

  void received(int count) {
    offset += count;
    hasMore = count == limit && offset <= 10000;
  }
}
