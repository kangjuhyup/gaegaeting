import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/features/challenge/application/photo_controller.dart';

Uint8List withMetadata(Uint8List png) {
  final payload = utf8.encode('Comment\x00GPS-private-fixture');
  final data = [...ascii.encode('tEXt'), ...payload];
  var crc = 0xffffffff;
  for (final byte in data) {
    crc ^= byte;
    for (var i = 0; i < 8; i++) {
      crc = (crc >> 1) ^ ((crc & 1) != 0 ? 0xedb88320 : 0);
    }
  }
  final length = ByteData(4)..setUint32(0, payload.length);
  final checksum = ByteData(4)..setUint32(0, crc ^ 0xffffffff);
  return Uint8List.fromList([
    ...png.sublist(0, png.length - 12),
    ...length.buffer.asUint8List(),
    ...data,
    ...checksum.buffer.asUint8List(),
    ...png.sublist(png.length - 12),
  ]);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('사진은 1600px 이하 PNG로 변환하고 원본 ancillary metadata를 제거한다', () async {
    final recorder = ui.PictureRecorder();
    final canvas = ui.Canvas(recorder);
    canvas.drawRect(
      const ui.Rect.fromLTWH(0, 0, 2000, 1000),
      ui.Paint()..color = const ui.Color(0xffbae1ee),
    );
    final picture = recorder.endRecording();
    final image = await picture.toImage(2000, 1000);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    final source = withMetadata(data!.buffer.asUint8List());
    final result = await sanitizedPng(source);
    expect(latin1.decode(source).contains('GPS-private-fixture'), true);
    expect(latin1.decode(result).contains('GPS-private-fixture'), false);
    expect(result.take(8), [137, 80, 78, 71, 13, 10, 26, 10]);
    expect(result.length, lessThanOrEqualTo(5 * 1024 * 1024));
    final codec = await ui.instantiateImageCodec(result);
    final frame = await codec.getNextFrame();
    expect(frame.image.width, 1600);
    expect(frame.image.height, 800);
    frame.image.dispose();
    codec.dispose();
    image.dispose();
    picture.dispose();
  });
  test('이미지로 해석할 수 없는 입력은 업로드 전에 실패한다', () async {
    await expectLater(
      sanitizedPng(Uint8List.fromList([1, 2, 3])),
      throwsA(anything),
    );
  });
}
