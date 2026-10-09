import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../data/account_repository.dart';
import 'api_session.dart';

final currentPositionProvider = Provider<Future<Position> Function()>((ref) {
  return () async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const ApiFailure('기기의 위치 서비스를 켜 주세요.');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw const ApiFailure('현재 위치를 기록하려면 위치 권한이 필요해요. 기기 설정에서 허용해 주세요.');
    }
    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 20),
        ),
      );
    } on TimeoutException {
      throw const ApiFailure('현재 위치를 찾지 못했어요. 위치 서비스를 확인하고 다시 시도해 주세요.');
    }
  };
});

final locationSyncProvider = AsyncNotifierProvider<LocationSync, DateTime?>(
  LocationSync.new,
);

class LocationSync extends AsyncNotifier<DateTime?> {
  Future<bool>? _pending;

  @override
  DateTime? build() => null;

  Future<bool> sync() =>
      _pending ??= _sync().whenComplete(() => _pending = null);

  Future<bool> _sync() async {
    state = const AsyncLoading();
    try {
      final position = await ref.read(currentPositionProvider)();
      if (!ref.mounted) return false;
      await ref
          .read(accountRepositoryProvider)
          .saveCurrentLocation(position.latitude, position.longitude);
      if (!ref.mounted) return false;
      await ref.read(accountRepositoryProvider).createRecommendations();
      if (!ref.mounted) return false;
      ref.invalidate(recommendationsProvider);
      state = AsyncData(DateTime.now());
      return true;
    } catch (error, stack) {
      if (ref.mounted) state = AsyncError(error, stack);
      return false;
    }
  }
}
