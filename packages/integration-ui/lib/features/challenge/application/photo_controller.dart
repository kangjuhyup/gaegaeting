import 'dart:convert';
import 'dart:typed_data';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:dio/dio.dart';

import '../domain/challenge_models.dart';
import '../data/challenge_repository.dart';
import '../data/challenge_vault.dart';

Future<Uint8List> sanitizedPng(Uint8List bytes) async {
  final buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
  final descriptor = await ui.ImageDescriptor.encoded(buffer);
  final scale =
      1600 /
      ([descriptor.width, descriptor.height].reduce((a, b) => a > b ? a : b));
  final codec = await descriptor.instantiateCodec(
    targetWidth: scale < 1
        ? math.max(1, (descriptor.width * scale).round())
        : descriptor.width,
    targetHeight: scale < 1
        ? math.max(1, (descriptor.height * scale).round())
        : descriptor.height,
  );
  try {
    final frame = await codec.getNextFrame();
    try {
      final data = await frame.image.toByteData(format: ui.ImageByteFormat.png);
      final png = data!.buffer.asUint8List(
        data.offsetInBytes,
        data.lengthInBytes,
      );
      if (png.length > 5 * 1024 * 1024) {
        throw const ChallengeFailure('사진은 PNG 변환 후 5MiB 이하여야 해요.', status: 400);
      }
      return png;
    } finally {
      frame.image.dispose();
    }
  } finally {
    codec.dispose();
    descriptor.dispose();
    buffer.dispose();
  }
}

abstract class PhotoTransport {
  Future<void> put(String url, Uint8List bytes);
}

class PresignedPhotoTransport implements PhotoTransport {
  // Independent client: never shares Gateway authentication, cookies or interceptors.
  PresignedPhotoTransport({Dio? dio})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              connectTimeout: const Duration(seconds: 15),
              sendTimeout: const Duration(seconds: 60),
              receiveTimeout: const Duration(seconds: 30),
              followRedirects: false,
            ),
          );
  final Dio _dio;
  @override
  Future<void> put(String url, Uint8List bytes) async {
    if (Uri.parse(url).scheme != 'https') {
      throw const ChallengeFailure('안전한 사진 업로드 주소를 확인할 수 없어요.', status: 503);
    }
    try {
      await _dio.put<void>(
        url,
        data: Stream.value(bytes),
        options: Options(
          followRedirects: false,
          headers: {
            Headers.contentTypeHeader: 'image/png',
            Headers.contentLengthHeader: bytes.length,
          },
        ),
      );
    } catch (_) {
      throw const ChallengeFailure('사진을 올리지 못했어요. 다시 시도하거나 제거해 주세요.');
    }
  }

  void dispose() => _dio.close();
}

class PhotoUploadController {
  PhotoUploadController({
    required this.api,
    required this.vault,
    required this.transport,
    required this.owner,
  });
  final ChallengeApi api;
  final ChallengeVault vault;
  final PhotoTransport transport;
  final String? Function() owner;
  Future<void> _tail = Future.value();
  Future<T> _serial<T>(Future<T> Function() fn) {
    final f = _tail.then((_) => fn());
    _tail = f.then<void>((_) {}, onError: (Object _, StackTrace _) {});
    return f;
  }

  void _check(String who) {
    if (owner() != who) {
      throw const ChallengeFailure(
        '계정이 변경됐어요. 이전 계정의 사진은 전송하지 않아요.',
        status: 401,
        requiresLogin: true,
      );
    }
  }

  Future<Json?> pending(String walkId) async {
    final who = owner();
    if (who == null) return null;
    return vault.read(who, 'photo.$walkId');
  }

  Future<Json> upload(String walkId, Uint8List png) => _serial(() async {
    final who = owner();
    if (who == null) {
      throw const ChallengeFailure(
        '로그인해 주세요.',
        requiresLogin: true,
        status: 401,
      );
    }
    final previous = await vault.read(who, 'photo.$walkId');
    _check(who);
    if (previous != null) return _resume(who, walkId, previous);
    final existing = rows(
      await api.call('myWalkingPhotos', {'walkId': walkId}),
    );
    _check(who);
    if (existing.length >= 4) {
      throw const ChallengeFailure('예약을 포함해 사진은 최대 4장이에요.', status: 400);
    }
    final job = <String, dynamic>{
      'bytes': base64Encode(png),
      'baseline': existing.map((p) => p['id']).toList(),
      'id': null,
      'createdAt': DateTime.now().toUtc().toIso8601String(),
    };
    await vault.write(who, 'photo.$walkId', job);
    _check(who);
    return _resume(who, walkId, job);
  });
  Future<Json> retry(String walkId) => _serial(() async {
    final who = owner();
    if (who == null) {
      throw const ChallengeFailure(
        '로그인해 주세요.',
        requiresLogin: true,
        status: 401,
      );
    }
    final job = await vault.read(who, 'photo.$walkId');
    _check(who);
    if (job == null) throw const ChallengeFailure('재시도할 사진이 없어요.', status: 404);
    return _resume(who, walkId, job);
  });
  Future<Json> _resume(String who, String walkId, Json job) async {
    _check(who);
    final photos = rows(await api.call('myWalkingPhotos', {'walkId': walkId}));
    _check(who);
    final baseline = List<String>.from(job['baseline']);
    if (job['id'] == null && photos.any((p) => !baseline.contains(p['id']))) {
      throw const ChallengeFailure(
        '사진 예약의 응답을 확인하지 못했어요. 다른 기기의 사진은 유지해요. 작성 취소 후 다시 추가하거나 예약 만료 뒤 다시 시도해 주세요.',
        status: 409,
      );
    }
    final photo = photos.where((p) => p['id'] == job['id']).firstOrNull;
    if (photo != null) {
      job['id'] = photo['id'];
      await vault.write(who, 'photo.$walkId', job);
      _check(who);
      if (photo['status'] == 'READY') {
        await vault.write(who, 'photo.$walkId', null);
        return photo;
      }
      try {
        final ready = json(
          await api.call('completeWalkingPhotoUpload', {'id': photo['id']}),
        );
        _check(who);
        await vault.write(who, 'photo.$walkId', null);
        return ready;
      } on ChallengeFailure catch (e) {
        if (e.status != 400) rethrow;
      }
      // No signed URL is persisted. Remove only this new unused reservation before renewing.
      _check(who);
      await api.call('deleteWalkingPhoto', {'id': photo['id']});
      _check(who);
    }
    final reservation = json(
      await api.call('beginWalkingPhotoUpload', {'walkId': walkId}),
    );
    _check(who);
    job['id'] = reservation['id'];
    await vault.write(who, 'photo.$walkId', job);
    _check(who);
    final bytes = base64Decode(job['bytes']);
    if (bytes.length > (reservation['maxBytes'] as int)) {
      throw const ChallengeFailure('서버 사진 용량 제한을 넘었어요.', status: 400);
    }
    await transport.put(reservation['uploadUrl'], bytes);
    _check(who);
    final ready = json(
      await api.call('completeWalkingPhotoUpload', {'id': reservation['id']}),
    );
    _check(who);
    await vault.write(who, 'photo.$walkId', null);
    return ready;
  }

  Future<void> cancel(String walkId, Set<String> newUnusedIds) =>
      _serial(() async {
        final who = owner();
        if (who == null) return;
        final job = await vault.read(who, 'photo.$walkId');
        _check(who);
        final photos = rows(
          await api.call('myWalkingPhotos', {'walkId': walkId}),
        );
        _check(who);
        final savedDiary = await api.call('myWalkDiary', {'walkId': walkId});
        _check(who);
        final protected = savedDiary == null
            ? <String>{}
            : rows(json(savedDiary)['photos'])
                  .map((p) => p['id'] as String)
                  .toSet();
        final ids = {...newUnusedIds};
        if (job?['id'] != null) ids.add(job!['id']);
        ids.removeAll(protected);
        ids.removeWhere((id) => !photos.any((p) => p['id'] == id));
        for (final id in ids) {
          _check(who);
          await api.call('deleteWalkingPhoto', {'id': id});
        }
        _check(who);
        await vault.write(who, 'photo.$walkId', null);
      });
}
