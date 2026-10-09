import 'dart:async';
import 'dart:convert';

import 'package:gaegaeting/features/challenge/application/walk_controller.dart';
import 'package:gaegaeting/features/challenge/application/photo_controller.dart';
import 'package:gaegaeting/features/challenge/data/challenge_repository.dart';
import 'package:gaegaeting/features/challenge/data/challenge_vault.dart';
import 'package:gaegaeting/features/challenge/domain/challenge_models.dart';

import 'dart:typed_data';

class MemoryVault implements ChallengeVault {
  final Map<String, String> data = {};
  @override
  Future<Json?> read(String owner, String key) async =>
      data['$owner/$key'] == null
      ? null
      : json(jsonDecode(data['$owner/$key']!));
  @override
  Future<void> write(String owner, String key, Json? value) async {
    if (value == null) {
      data.remove('$owner/$key');
    } else {
      data['$owner/$key'] = jsonEncode(value);
    }
  }
}

class FakeGps implements WalkingGps {
  final controller = StreamController<TrackPoint>.broadcast();
  int permissionCalls = 0;
  @override
  Future<void> permission() async {
    permissionCalls++;
  }

  @override
  Stream<TrackPoint> points(int segment) => controller.stream;
  @override
  Future<void> settings() async {}
}

class MemoryChallengeApi implements ChallengeApi {
  final List<(String, Json)> calls = [];
  Json? walk;
  bool offline = false;
  String? loseResponse;
  DateTime clock = DateTime.utc(2026, 10, 5, 9);
  final List<Json> photos = [];
  Json? diary;
  final List<Json> routes = [];
  final List<Json> participations = [];
  Json copy(Json v) => json(jsonDecode(jsonEncode(v)));
  void check(String name) {
    if (offline) throw const ChallengeFailure('연결 없음');
  }

  @override
  Future<Object?> call(String name, [Json vars = const {}]) async {
    calls.add((name, copy(vars)));
    check(name);
    Object? result;
    switch (name) {
      case 'myCurrentWalk':
        result = walk?['state'] == 'FINISHED' ? null : walk;
      case 'myWalk':
        result = walk;
      case 'startWalk':
        final input = json(vars['input']);
        walk ??= {
          'id': 'walk-1',
          'requestId': input['requestId'],
          'state': 'RECORDING',
          'pets': [
            {'id': 1, 'name': '하루'},
          ],
          'route': input['routeId'] == null
              ? null
              : {
                  'id': input['routeId'],
                  'title': '나무 그늘 따라 한 바퀴',
                  'path': samplePath,
                },
          'points': <Json>[],
          'segments': [
            {'startedAt': clock.toIso8601String(), 'endedAt': null},
          ],
          'startedAt': clock.toIso8601String(),
          'endedAt': null,
          'finishedAt': null,
          'distanceMeters': 0,
          'coverage': 0.0,
          'completed': false,
          'revision': 1,
          'policyVersion': 1,
        };
        result = walk;
      case 'appendWalkPoints':
        final input = json(vars['input']);
        final index = input['fromIndex'] as int;
        final pts = rows(input['points']);
        final saved = walk!['points'] as List;
        if (index == saved.length) {
          saved.addAll(pts);
        } else if (index + pts.length > saved.length ||
            jsonEncode(saved.sublist(index, index + pts.length)) !=
                jsonEncode(pts)) {
          throw const ChallengeFailure('충돌', status: 409);
        }
        result = walk;
      case 'setWalkPaused':
        final paused = vars['paused'] as bool;
        if (paused && walk!['state'] != 'PAUSED') {
          walk!['state'] = 'PAUSED';
          (walk!['segments'] as List).last['endedAt'] = clock.toIso8601String();
        }
        if (!paused && walk!['state'] != 'RECORDING') {
          walk!['state'] = 'RECORDING';
          (walk!['segments'] as List).add({
            'startedAt': clock.toIso8601String(),
            'endedAt': null,
          });
        }
        result = walk;
      case 'finishWalk':
        if (walk!['state'] != 'FINISHED') {
          walk!['state'] = 'FINISHED';
          walk!['endedAt'] = vars['endedAt'];
          walk!['finishedAt'] = clock.toIso8601String();
          final seg = (walk!['segments'] as List).last;
          if (seg['endedAt'] == null) seg['endedAt'] = vars['endedAt'];
          walk!['distanceMeters'] = 1234;
          walk!['completed'] = walk!['route'] != null;
        }
        result = walk;
      case 'myWalkingPhotos':
        result = photos;
      case 'beginWalkingPhotoUpload':
        final id = 'photo-${photos.length + 1}';
        photos.add({
          'id': id,
          'status': 'UPLOADING',
          'url': null,
          'expiresIn': 300,
        });
        result = {
          'id': id,
          'uploadUrl': 'https://storage.example.test/$id',
          'expiresIn': 300,
          'maxBytes': 5242880,
          'maxDimension': 1600,
        };
      case 'completeWalkingPhotoUpload':
        final p = photos.firstWhere((p) => p['id'] == vars['id']);
        if (p['uploaded'] != true) {
          throw const ChallengeFailure('사진 없음', status: 400);
        }
        p['status'] = 'READY';
        p['url'] = 'https://storage.example.test/view/${p['id']}';
        result = p;
      case 'deleteWalkingPhoto':
        photos.removeWhere((p) => p['id'] == vars['id']);
        result = true;
      case 'myWalkDiary':
      case 'myWalkingDiary':
        result = diary;
      case 'saveWalkingDiary':
        final input = json(vars['input']);
        if (input['expectedRevision'] != (diary?['revision'] ?? 0)) {
          throw const ChallengeFailure('일기 버전 충돌', status: 409);
        }
        diary = {
          'id': 'diary-1',
          'walkId': input['walkId'],
          'routeId': walk?['route']?['id'],
          'authorName': '민지',
          'walkDate': '2026-10-05',
          'content': input['content'],
          'mood': input['mood'],
          'photos': photos
              .where((p) => (input['photoIds'] as List).contains(p['id']))
              .toList(),
          'visibility': input['visibility'],
          'revision': (diary?['revision'] ?? 0) + 1,
          'savedAt': clock.toIso8601String(),
          'updatedAt': clock.toIso8601String(),
        };
        result = diary;
      case 'challenges':
        result = [
          {
            'kind': 'NEIGHBORHOOD_EXPLORER',
            'title': '우리 동네 탐험대',
            'description': '다른 보호자가 공유한 코스 3개 완주',
            'durationDays': 14,
            'targetCount': 3,
            'rewardCode': 'NEIGHBORHOOD_EXPLORER_BADGE',
            'policyVersion': 1,
          },
          {
            'kind': 'WALK_DIARY',
            'title': '우리 강아지 산책일기',
            'description': '사진과 기분을 담은 일기 3일',
            'durationDays': 7,
            'targetCount': 3,
            'rewardCode': 'WALK_DIARY_CARD',
            'policyVersion': 1,
          },
        ];
      case 'myChallenges':
        result = participations;
      case 'myChallenge':
        result = participations.firstWhere((p) => p['id'] == vars['id']);
      case 'joinChallenge':
        final p = {
          'id': 'participation-1',
          'kind': vars['input']['kind'],
          'title': '우리 동네 탐험대',
          'targetCount': 3,
          'progressCount': 0,
          'status': 'ACTIVE',
          'joinedAt': clock.toIso8601String(),
          'endsAt': clock.add(const Duration(days: 14)).toIso8601String(),
          'settlesAt': clock.add(const Duration(days: 15)).toIso8601String(),
          'earnedRewardCode': null,
          'policyVersion': 1,
        };
        participations.add(p);
        result = p;
      case 'cancelChallenge':
        participations.firstWhere((p) => p['id'] == vars['id'])['status'] =
            'CANCELLED';
        result = true;
      case 'walkingRoute':
      case 'myWalkingRoute':
        result = routes.firstWhere((p) => p['id'] == vars['id']);
      case 'walkingRoutes':
      case 'myWalkingRoutes':
      case 'myBookmarkedWalkingRoutes':
        result = routes;
      case 'myWalks':
        result = walk == null ? [] : [walk];
      case 'myWalkingDiaries':
        result = diary == null ? [] : [diary];
      case 'walkingRouteReviews':
      case 'myWalkingPassport':
        result = [];
      case 'createWalkingRoute':
        final input = json(vars['input']);
        final r = {
          ...sampleRoute,
          'id': 'route-new',
          'title': input['details']['title'],
          'description': input['details']['description'],
          'startPlace': input['details']['startPlace'],
          'endPlace': input['details']['endPlace'],
          'tags': input['details']['tags'],
          'sourceWalkId': input['walkId'],
          'status': 'DRAFT',
          'reviewReason': null,
          'revision': 1,
        };
        routes.add(r);
        result = r;
      case 'submitWalkingRoute':
        final r = routes.firstWhere((p) => p['id'] == vars['id']);
        r['status'] = 'PENDING';
        r['revision']++;
        result = r;
      case 'withdrawWalkingRoute':
        final r = routes.firstWhere((p) => p['id'] == vars['id']);
        r['status'] = 'WITHDRAWN';
        r['revision']++;
        result = r;
      case 'bookmarkWalkingRoute':
        routes.firstWhere((p) => p['id'] == vars['id'])['bookmarked'] =
            vars['saved'];
        result = true;
      case 'reportWalkingRoute':
      case 'deleteWalk':
      case 'deleteWalkingDiary':
        result = true;
      default:
        throw UnimplementedError(name);
    }
    if (loseResponse == name) {
      loseResponse = null;
      throw const ChallengeFailure('응답 유실');
    }
    if (result is Map) return copy(json(result));
    if (result is List) {
      final page = name == 'walkingRoutes' ? json(vars['input']) : vars;
      final limit = page['limit'];
      if (limit is int) {
        result = result.skip(page['offset'] as int? ?? 0).take(limit).toList();
      }
      return jsonDecode(jsonEncode(result));
    }
    return result;
  }
}

const samplePath = [
  {'latitude': 37.5665, 'longitude': 126.9780},
  {'latitude': 37.568, 'longitude': 126.9780},
  {'latitude': 37.57, 'longitude': 126.98},
  {'latitude': 37.5665, 'longitude': 126.9780},
];
const sampleRoute = {
  'id': 'route-1',
  'title': '나무 그늘 따라 한 바퀴',
  'description': '그늘이 이어져 걷기 좋아요.',
  'startPlace': '출입구',
  'endPlace': '출입구',
  'authorName': '민지',
  'petNames': ['하루'],
  'path': samplePath,
  'tags': ['SHADE'],
  'distanceMeters': 1800,
  'durationSeconds': 1920,
  'isLoop': true,
  'nearbyMeters': 100,
  'isMine': false,
  'bookmarked': false,
  'walkerCount': 12,
};

class MemoryPhotoTransport implements PhotoTransport {
  MemoryPhotoTransport(this.api);
  final MemoryChallengeApi api;
  bool offline = false;
  @override
  Future<void> put(String url, Uint8List bytes) async {
    if (offline) throw const ChallengeFailure('사진 연결 없음');
    api.photos.firstWhere(
      (p) => p['id'] == Uri.parse(url).pathSegments.last,
    )['uploaded'] = true;
  }
}
