import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:gaegaeting/app/gaegaeting_app.dart';
import 'package:gaegaeting/app/router.dart';
import 'package:gaegaeting/features/flow/application/flow_controller.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const cycle = String.fromEnvironment('REVIEW_CYCLE', defaultValue: 'after');
  testWidgets('디자인 미리보기의 가입·프로필·추천·구매·설정을 기기에서 렌더링한다', (tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const GaegaetingApp(),
      ),
    );
    await tester.pumpAndSettle();
    await tester.runAsync(() async {
      final context = tester.element(find.byType(Scaffold).first);
      for (final path in [
        'assets/images/pet-golden.png',
        'assets/images/friend-golden.jpg',
      ]) {
        await precacheImage(AssetImage(path), context);
      }
      for (final name in [
        'heart',
        'snack',
        'filter',
        'send',
        'chat',
        'back',
        'kakao-symbol',
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
    final router = container.read(routerProvider);
    final flow = container.read(flowProvider.notifier);
    for (final page in [
      ('signup', '/'),
      ('login', '/login'),
      ('phone-signup', '/signup/phone'),
      ('agreements', '/signup/agreements'),
      ('profile-registration', '/onboarding/profile'),
      ('pet-registration', '/onboarding/pet'),
      ('recommendations', '/main'),
      ('nearby', '/recommendations'),
      ('unlock', '/recommendations/1/unlock'),
    ]) {
      router.go(page.$2);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: page.$1);
      await binding.takeScreenshot('$cycle-${page.$1}');
    }
    expect(flow.unlock('1'), isTrue);
    for (final page in [
      ('friend-profile', '/recommendations/1/profile'),
      ('insufficient', '/snacks/insufficient'),
      ('purchase', '/snacks/purchase'),
      ('own-profile', '/profile'),
      ('notifications', '/settings/notifications'),
      ('interest-empty', '/likes'),
      ('chat-empty', '/chats'),
    ]) {
      router.go(page.$2);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: page.$1);
      await binding.takeScreenshot('$cycle-${page.$1}');
    }
    router.go('/snacks/purchase');
    await tester.pumpAndSettle();
    for (final count in [50, 100]) {
      await tester.tap(find.byKey(ValueKey('snack-package-$count')));
      await tester.pumpAndSettle();
      await binding.takeScreenshot('$cycle-purchase-$count');
    }
    flow.sendInterest('1');
    router.go('/likes?tab=sent');
    await tester.pumpAndSettle();
    await binding.takeScreenshot('$cycle-interest-sent');
    flow.previewReceivedInterest('received');
    router.go('/likes');
    await tester.pumpAndSettle();
    await binding.takeScreenshot('$cycle-interest-received');
    router.go('/interest/received');
    await tester.pumpAndSettle();
    await binding.takeScreenshot('$cycle-interest-profile');
    flow.previewReceivedInterest('1');
    router.go('/likes?tab=mutual');
    await tester.pumpAndSettle();
    await binding.takeScreenshot('$cycle-interest-mutual');
    await tester.tap(find.text('채팅하기'));
    await tester.pumpAndSettle();
    await binding.takeScreenshot('$cycle-mutual-popup');
    await tester.tap(find.text('채팅방 열기'));
    await tester.pumpAndSettle();
    expect(find.text('서로 관심으로 연결된 채팅방'), findsOneWidget);
    await binding.takeScreenshot('$cycle-chat-room');
    router.go('/chats');
    await tester.pumpAndSettle();
    await binding.takeScreenshot('$cycle-chat-list');
    router.go('/notifications');
    await tester.pumpAndSettle();
    await binding.takeScreenshot('$cycle-interest-notifications');
    expect(tester.takeException(), isNull);
  });
}
