import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../data/challenge_repository.dart';
import '../data/challenge_vault.dart';
import '../domain/challenge_models.dart';

abstract class WalkingGps {
  Future<void> permission();
  Stream<TrackPoint> points(int segment);
  Future<void> settings();
}

class DeviceWalkingGps implements WalkingGps {
  @override
  Future<void> permission() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const ChallengeFailure('위치 서비스를 켜 주세요.', status: 400);
    }
    var p = await Geolocator.checkPermission();
    if (p == LocationPermission.denied) {
      p = await Geolocator.requestPermission();
    }
    if (p == LocationPermission.denied ||
        p == LocationPermission.deniedForever) {
      throw const ChallengeFailure(
        '산책 기록에 위치 권한이 필요해요. 시스템 설정에서 허용해 주세요.',
        status: 403,
      );
    }
  }

  @override
  Stream<TrackPoint> points(int segment) =>
      Geolocator.getPositionStream(
        locationSettings: defaultTargetPlatform == TargetPlatform.android
            ? AndroidSettings(
                accuracy: LocationAccuracy.high,
                distanceFilter: 0,
                intervalDuration: const Duration(seconds: 5),
                foregroundNotificationConfig:
                    const ForegroundNotificationConfig(
                      notificationTitle: '개개팅 산책 기록 중',
                      notificationText: '산책 중 위치를 기록합니다.',
                      enableWakeLock: true,
                    ),
              )
            : AppleSettings(
                accuracy: LocationAccuracy.best,
                distanceFilter: 0,
                activityType: ActivityType.fitness,
                allowBackgroundLocationUpdates: true,
                showBackgroundLocationIndicator: true,
                pauseLocationUpdatesAutomatically: false,
              ),
      ).map(
        (p) => TrackPoint(
          p.latitude,
          p.longitude,
          p.timestamp.toUtc(),
          p.accuracy,
          segment,
        ),
      );
  @override
  Future<void> settings() async {
    await Geolocator.openAppSettings();
  }
}

class WalkQueue {
  WalkQueue({
    required this.owner,
    this.walk,
    this.start,
    this.finishAt,
    this.pausedCommand,
    this.fromIndex = 0,
    List<TrackPoint>? pending,
  }) : pending = pending ?? [];
  factory WalkQueue.fromJson(Json v) => WalkQueue(
    owner: v['owner'],
    walk: v['walk'] == null ? null : WalkRecord(json(v['walk'])),
    start: v['start'] == null ? null : json(v['start']),
    finishAt: v['finishAt'] == null ? null : DateTime.parse(v['finishAt']),
    pausedCommand: v['pausedCommand'],
    fromIndex: v['fromIndex'],
    pending: rows(v['pending']).map(TrackPoint.fromJson).toList(),
  );
  final String owner;
  WalkRecord? walk;
  Json? start;
  DateTime? finishAt;
  bool? pausedCommand;
  int fromIndex;
  final List<TrackPoint> pending;
  Json toJson() => {
    'owner': owner,
    'walk': walk?.value,
    'start': start,
    'finishAt': finishAt?.toUtc().toIso8601String(),
    'pausedCommand': pausedCommand,
    'fromIndex': fromIndex,
    'pending': pending.map((p) => p.toJson()).toList(),
  };
}

class WalkController extends ChangeNotifier {
  WalkController({
    required this.api,
    required this.vault,
    required this.gps,
    required this.owner,
    DateTime Function()? now,
  }) : now = now ?? DateTime.now;
  final ChallengeApi api;
  final ChallengeVault vault;
  final WalkingGps gps;
  final String? Function() owner;
  final DateTime Function() now;
  WalkQueue? queue;
  WalkRecord? get walk => queue?.walk;
  bool busy = false, collecting = false;
  bool _recovering = false, _controlling = false;
  DateTime? _gpsReceivedAt, _gpsStartedAt;
  bool get gpsQuiet =>
      collecting &&
      now().difference(_gpsReceivedAt ?? _gpsStartedAt ?? now()) >
          const Duration(seconds: 30);
  bool get commandPending => _controlling;
  String? error;
  StreamSubscription<TrackPoint>? _gps;
  Future<void> _network = Future.value(), _disk = Future.value();
  bool _disposed = false;
  bool _valid(WalkQueue q) =>
      !_disposed && identical(q, queue) && owner() == q.owner;
  void _notify() {
    if (!_disposed) notifyListeners();
  }

  Future<void> _save(WalkQueue q) {
    final snapshot = q.toJson();
    final job = _disk.then((_) => vault.write(q.owner, 'walk', snapshot));
    _disk = job.catchError((Object _) {});
    return job;
  }

  Future<T> _serial<T>(Future<T> Function() work) {
    final job = _network.then((_) => work());
    _network = job.then<void>((_) {}, onError: (Object _, StackTrace _) {});
    return job;
  }

  void detach() {
    unawaited(_gps?.cancel());
    _gps = null;
    collecting = false;
    queue = null;
    error = null;
    _notify();
  }

  Future<void> recover() async {
    final identity = owner();
    if (identity == null) return;
    final wasCollecting = collecting;
    _recovering = true;
    await stopGps();
    try {
      await _serial(() async {
        final id = identity;
        if (owner() != id) return;
        await _disk;
        if (owner() != id) return;
        final local = await vault.read(id, 'walk');
        if (owner() != id) return;
        final q = local == null
            ? WalkQueue(owner: id)
            : WalkQueue.fromJson(local);
        if (q.owner != id) {
          throw const ChallengeFailure('다른 계정의 기록은 복구할 수 없어요.', status: 403);
        }
        queue = q;
        _notify();
        await _run(q, () async {
          final current = await api.call('myCurrentWalk');
          if (!_valid(q)) return;
          if (q.walk != null) {
            final server = WalkRecord(
              json(await api.call('myWalk', {'id': q.walk!.id})),
            );
            if (!_valid(q)) return;
            // Preserve the original batch/index until the server confirms identical points.
            await _reconcile(q, server);
          } else if (current != null) {
            q.walk = WalkRecord(json(current));
            q.fromIndex = q.walk!.points.length;
          }
          await _save(q);
          if (q.finishAt != null ||
              q.start != null ||
              q.pausedCommand != null) {
            await _synchronize(q);
          }
        });
      });
    } finally {
      _recovering = false;
    }
    if (wasCollecting &&
        owner() == identity &&
        walk?.state == 'RECORDING' &&
        queue?.finishAt == null &&
        queue?.pausedCommand == null) {
      await record();
    }
  }

  Future<void> _reconcile(WalkQueue q, WalkRecord server) async {
    final points = server.points;
    var confirmed = 0;
    while (confirmed < q.pending.length &&
        q.fromIndex + confirmed < points.length &&
        q.pending[confirmed].same(points[q.fromIndex + confirmed])) {
      confirmed++;
    }
    if (points.length > q.fromIndex + confirmed &&
        q.pending.length > confirmed) {
      throw const ChallengeFailure('기록 순서가 달라졌어요. 저장된 기록을 보존했어요.', status: 409);
    }
    q.pending.removeRange(0, confirmed);
    q.fromIndex = points.length;
    q.walk = server;
  }

  Future<void> start(List<int> petIds, String? routeId) => _serial(() async {
    if (petIds.isEmpty || petIds.length > 6) {
      throw const ChallengeFailure('내 강아지를 1~6마리 선택해 주세요.', status: 400);
    }
    final id = owner();
    if (id == null) {
      throw const ChallengeFailure(
        '로그인해 주세요.',
        status: 401,
        requiresLogin: true,
      );
    }
    var q = queue;
    if (q != null && q.walk != null && q.walk!.state != 'FINISHED') {
      throw const ChallengeFailure('진행 중인 산책을 먼저 확인해 주세요.', status: 409);
    }
    await gps.permission();
    if (owner() != id) return;
    final current = await api.call('myCurrentWalk');
    if (owner() != id) return;
    if (current != null) {
      q = WalkQueue(owner: id, walk: WalkRecord(json(current)));
      q.fromIndex = q.walk!.points.length;
      queue = q;
      await _save(q);
      _notify();
      return;
    }
    q = queue?.start != null
        ? queue!
        : WalkQueue(
            owner: id,
            start: {'requestId': uuid(), 'petIds': petIds, 'routeId': routeId},
          );
    queue = q;
    await _save(q);
    await _run(q, () async {
      await _synchronize(q!);
      if (_valid(q!)) await record();
    });
  });
  Future<void> record() async {
    final q = queue;
    if (q == null ||
        _recovering ||
        !_valid(q) ||
        q.walk?.state != 'RECORDING' ||
        q.finishAt != null ||
        q.pausedCommand != null) {
      return;
    }
    await gps.permission();
    if (!_valid(q)) return;
    await _gps?.cancel();
    collecting = true;
    _gpsStartedAt = now();
    _gpsReceivedAt = null;
    _gps = gps
        .points(q.walk!.segments.length - 1)
        .listen(
          (p) {
            unawaited(
              capture(p).then((_) => flush()).catchError((Object e) {
                if (_valid(q)) {
                  error = e is ChallengeFailure
                      ? e.message
                      : '위치 기록을 저장하지 못했어요.';
                  _notify();
                }
              }),
            );
          },
          onError: (Object _) {
            if (_valid(q)) {
              collecting = false;
              error = 'GPS를 확인할 수 없어요. 위치 서비스를 확인하고 기록 재개를 눌러 주세요.';
              _notify();
            }
          },
        );
    _notify();
  }

  Future<void> capture(TrackPoint p) async {
    final q = queue;
    if (q == null ||
        _recovering ||
        !_valid(q) ||
        q.walk?.state != 'RECORDING' ||
        q.finishAt != null ||
        q.pausedCommand != null) {
      return;
    }
    final w = q.walk!;
    if (q.fromIndex + q.pending.length >= 10000 ||
        now().difference(w.startedAt) >= const Duration(hours: 24)) {
      await stopGps();
      error = '산책 기록 한도에 도달했어요. 산책을 종료해 주세요.';
      _notify();
      return;
    }
    if (p.segment != w.segments.length - 1 ||
        p.latitude.abs() > 85 ||
        p.longitude.abs() > 180 ||
        p.accuracyMeters < 0 ||
        p.accuracyMeters > 5000 ||
        p.recordedAt.isAfter(now().toUtc()) ||
        p.recordedAt.isBefore(w.startedAt)) {
      return;
    }
    final last = q.pending.isNotEmpty ? q.pending.last : w.points.lastOrNull;
    if (last != null && !p.recordedAt.isAfter(last.recordedAt)) return;
    _gpsReceivedAt = now();
    q.pending.add(p);
    await _save(q);
    if (p.accuracyMeters > 30) error = 'GPS 정확도가 낮아요. 연결된 곳에서 위치를 확인해 주세요.';
    _notify();
  }

  Future<void> stopGps() async {
    collecting = false;
    await _gps?.cancel();
    _gps = null;
    _notify();
  }

  Future<void> flush() => _serial(() async {
    final q = queue;
    if (q != null && _valid(q)) await _run(q, () => _synchronize(q));
  });
  Future<void> _command(Future<void> Function() fn) async {
    if (_controlling) {
      throw const ChallengeFailure(
        '이전 기록 변경을 확인 중이에요. 잠시 기다려 주세요.',
        status: 409,
      );
    }
    _controlling = true;
    _notify();
    try {
      await fn();
    } finally {
      _controlling = false;
      _notify();
    }
  }

  Future<void> pause(bool paused) => _command(() async {
    final q = queue;
    if (q == null || !_valid(q)) return;
    await stopGps();
    q.pausedCommand = paused;
    await _save(q);
    await _serial(
      () => _run(q, () async {
        await _synchronize(q);
        if (!paused && _valid(q)) await record();
      }),
    );
  });

  Future<void> finish() => _command(() async {
    final q = queue;
    if (q == null || !_valid(q)) return;
    await stopGps();
    q.pausedCommand = null;
    q.finishAt ??= now().toUtc();
    await _save(q);
    await _serial(() => _run(q, () => _synchronize(q)));
  });
  Future<void> _synchronize(WalkQueue q) async {
    if (!_valid(q)) return;
    await _disk;
    if (!_valid(q)) return;
    if (q.start != null) {
      final w = await api.call('startWalk', {'input': q.start!});
      if (!_valid(q)) return;
      q.walk = WalkRecord(json(w));
      q.fromIndex = q.walk!.points.length;
      q.start = null;
      await _save(q);
    }
    while (q.pending.isNotEmpty && _valid(q)) {
      final batch = q.pending.take(200).toList();
      final response = await api.call('appendWalkPoints', {
        'input': {
          'walkId': q.walk!.id,
          'fromIndex': q.fromIndex,
          'points': batch.map((p) => p.toJson()).toList(),
        },
      });
      if (!_valid(q)) return;
      final w = WalkRecord(json(response));
      await _reconcile(q, w);
      await _save(q);
      _notify();
    }
    if (!_valid(q) || q.walk == null) return;
    if (q.pausedCommand != null &&
        q.finishAt == null &&
        q.walk!.state != 'FINISHED') {
      // Re-query resolves a lost pause/resume response without making a new segment.
      final latest = WalkRecord(
        json(await api.call('myWalk', {'id': q.walk!.id})),
      );
      if (!_valid(q)) return;
      if ((latest.state == 'PAUSED') == q.pausedCommand) {
        q.walk = latest;
      } else {
        q.walk = WalkRecord(
          json(
            await api.call('setWalkPaused', {
              'id': q.walk!.id,
              'paused': q.pausedCommand,
            }),
          ),
        );
      }
      if (!_valid(q)) return;
      q.pausedCommand = null;
      await _save(q);
    }
    if (!_valid(q)) return;
    if (q.finishAt != null) {
      q.walk = WalkRecord(
        json(
          await api.call('finishWalk', {
            'id': q.walk!.id,
            'endedAt': q.finishAt!.toIso8601String(),
          }),
        ),
      );
      if (!_valid(q)) return;
      q.finishAt = null;
      q.pausedCommand = null;
      await _save(q);
    }
  }

  Future<void> refresh() => _serial(() async {
    final q = queue;
    if (q == null || !_valid(q) || q.walk == null) return;
    await _run(q, () async {
      final server = WalkRecord(
        json(await api.call('myWalk', {'id': q.walk!.id})),
      );
      if (!_valid(q)) return;
      await _reconcile(q, server);
      await _save(q);
      if (server.state != 'RECORDING') await stopGps();
    });
  });
  Future<void> clearDeletedWalk(String id) async {
    final identity = owner();
    if (identity == null || queue?.walk?.id != id) return;
    final q = queue!;
    detach();
    await _disk;
    await vault.write(q.owner, 'walk', null);
  }

  Future<void> _run(WalkQueue q, Future<void> Function() work) async {
    if (!_valid(q)) return;
    busy = true;
    error = null;
    _notify();
    try {
      await work();
    } catch (e) {
      if (_valid(q)) {
        error = e is ChallengeFailure ? e.message : '연결된 곳에서 다시 저장해 주세요.';
      }
      rethrow;
    } finally {
      busy = false;
      _notify();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    unawaited(_gps?.cancel());
    super.dispose();
  }
}
