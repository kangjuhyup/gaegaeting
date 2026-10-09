import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:gaegaeting/app/gaegaeting_app.dart';
import 'package:gaegaeting/app/router.dart';
import 'package:gaegaeting/core/design/widgets.dart';
import 'package:gaegaeting/features/account/application/api_session.dart';
import 'package:gaegaeting/features/challenge/application/challenge_providers.dart';
import 'package:gaegaeting/features/challenge/application/walk_controller.dart';
import 'package:gaegaeting/features/challenge/domain/challenge_models.dart';

import '../test/challenge_app_fixture.dart';
import '../test/challenge_fixtures.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('실제 앱 챌린지 탭의 코스·참여·산책·일기·코스 검토 흐름을 Retrofit 계약으로 조작한다', (
    tester,
  ) async {
    final f = ChallengeAppFixture();
    addTearDown(f.dispose);
    f.api.routes.add({...sampleRoute});
    f.api.clock = DateTime.now().toUtc();
    await f.container.read(apiSessionProvider.future);
    final router = f.container.read(routerProvider);
    router.go('/api/challenge');
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: f.container,
        child: const GaegaetingApp(),
      ),
    );
    await tester.pumpAndSettle();
    await tester.runAsync(() async {
      final context = tester.element(find.byType(Scaffold).first);
      for (final name in [
        'heart',
        'snack',
        'filter',
        'send',
        'chat',
        'back',
        'close',
        'check',
        'trophy',
        'bell',
        'lock',
        'paw',
        'user',
      ]) {
        await SvgAssetLoader('assets/icons/$name.svg').loadBytes(context);
      }
    });
    await tester.pumpAndSettle();
    await binding.convertFlutterSurfaceToImage();
    Future<void> capture(String name) async {
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pump(const Duration(milliseconds: 400));
      expect(tester.takeException(), isNull, reason: name);
      await binding.takeScreenshot('challenge-$name');
    }

    Future<void> tap(String text) async {
      f.api.clock = DateTime.now().toUtc();
      await tester.ensureVisible(find.text(text).first);
      await tester.tap(find.text(text).first);
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));
    }

    await capture('C00-home');
    await tap('산책 코스');
    await capture('C01-courses');
    await tap('지도');
    await tester.pump(const Duration(seconds: 3));
    await capture('C02-map');
    await tap('나무 그늘 따라 한 바퀴');
    await tester.pump(const Duration(seconds: 3));
    await capture('C04-course');
    await tap('저장하기');
    expect(f.api.routes.first['bookmarked'], true);
    await tap('이 코스 걷기');
    await capture('W05-prepare');
    await tester.tap(find.byType(CheckboxListTile).first);
    await tester.pump();
    await tap('선택한 강아지와 산책 시작');
    final walk = f.container.read(walkControllerProvider);
    await tester.pump(const Duration(seconds: 1));
    await walk.stopGps();
    final start = DateTime.parse(f.api.walk!['startedAt']);
    for (var i = 0; i < samplePath.length; i++) {
      await walk.capture(
        TrackPoint(
          (samplePath[i]['latitude'] as num).toDouble(),
          (samplePath[i]['longitude'] as num).toDouble(),
          start.add(Duration(milliseconds: i + 1)),
          5,
          0,
        ),
      );
    }
    await walk.flush();
    await walk.record();
    await tester.pump(const Duration(seconds: 2));
    await capture('W07-recording');
    await tap('일시정지');
    expect(walk.walk!.state, 'PAUSED');
    await capture('W08-paused');
    await tap('산책 재개');
    await tap('산책 종료');
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.widgetWithText(FilledButton, '산책 종료'),
      ),
    );
    await tester.pump(const Duration(seconds: 1));
    await capture('W11-complete');
    expect(walk.walk!.state, 'FINISHED');
    expect(walk.walk!.completed, true);
    await tap('오늘의 일기 쓰기');
    await tester.enterText(find.byType(TextField).last, '그늘 아래에서 쉬었어요.');
    await tap('즐거웠어요');
    await capture('D01-editor');
    await tap('일기 저장');
    await capture('D02-visibility');
    await tap('코스 공개 후기');
    await tap('선택한 범위로 저장');
    await capture('D03-public-confirm');
    await tap('확인하고 공개');
    expect(f.api.diary!['visibility'], 'PUBLIC');
    await capture('M04-diary');
    router.go('/api/challenge/route-create/walk-1');
    await tester.pumpAndSettle();
    await capture('R01-trim');
    await tap('공개 미리보기');
    await capture('R02U-preview');
    await tap('집 등 사적인 위치를 제외했어요');
    await tap('코스 정보 입력');
    for (final entry in [
      ('코스 제목', '나무 그늘 산책'),
      ('출발 장소', '출입구'),
      ('도착 장소', '출입구'),
    ]) {
      final field = find.descendant(
        of: find.widgetWithText(FlowField, entry.$1),
        matching: find.byType(TextField),
      );
      await tester.ensureVisible(field);
      await tester.enterText(field, entry.$2);
    }
    await tap('초안 저장');
    await capture('R04-draft');
    await tap('공개 검토 요청');
    await tester.tap(find.widgetWithText(FilledButton, '검토 요청'));
    await tester.pump(const Duration(seconds: 1));
    expect(f.api.routes.last['status'], 'PENDING');
    await capture('R06-pending');
    router.go('/api/challenge/catalogue/NEIGHBORHOOD_EXPLORER');
    await tester.pumpAndSettle();
    await capture('H01-definition');
    await tap('챌린지 참여');
    await tester.tap(find.widgetWithText(FilledButton, '참여'));
    await tester.pumpAndSettle();
    await capture('H04Z-active');
    expect(f.api.participations.single['progressCount'], 0);
    router.go('/api/challenge/records');
    await tester.pumpAndSettle();
    await capture('M00-records');
    final names = f.api.calls.map((e) => e.$1).toSet().toList()..sort();
    binding.reportData = {
      ...?binding.reportData,
      'mode': 'real Flutter app / Retrofit+Dio contract fixture; not authenticated live Gateway',
      'operations': names,
      'appendBatches': f.api.calls
          .where((e) => e.$1 == 'appendWalkPoints')
          .length,
      'finishResult': 'FINISHED',
      'diaryVisibility': f.api.diary!['visibility'],
      'courseStatus': f.api.routes.last['status'],
      'joinProgress': 0,
      'rawGpsLogged': false,
    };
  });
  testWidgets('Android 에뮬레이터의 네이티브 위치 권한과 GPS 스트림을 확인한다', (tester) async {
    final gps = DeviceWalkingGps();
    await tester.runAsync(() async {
      await gps.permission().timeout(const Duration(seconds: 40));
      final point = await gps
          .points(0)
          .first
          .timeout(const Duration(seconds: 25));
      expect(point.latitude.abs(), lessThanOrEqualTo(85));
      expect(point.longitude.abs(), lessThanOrEqualTo(180));
    });
  });
}
