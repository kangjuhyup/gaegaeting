import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/app/gaegaeting_app.dart';
import 'package:gaegaeting/app/router.dart';
import 'package:gaegaeting/features/flow/application/flow_controller.dart';

void main() {
  test('한쪽 관심과 빈 메시지는 채팅을 허용하지 않고 중복 관심은 간식을 쓰지 않는다', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final flow = container.read(flowProvider.notifier);
    flow.sendInterest('1');
    flow.sendInterest('1');
    expect(container.read(flowProvider).sentInterests, {'1'});
    expect(container.read(flowProvider).snacks, 2);
    expect(flow.sendPreviewMessage('1', '안녕하세요'), isFalse);
    flow.previewReceivedInterest('1');
    expect(flow.sendPreviewMessage('1', '  '), isFalse);
    expect(flow.sendPreviewMessage('1', '같이 산책해요'), isTrue);
    expect(container.read(flowProvider).messages['1'], ['같이 산책해요']);
    flow.reset();
    expect(container.read(flowProvider).messages, isEmpty);
    expect(container.read(flowProvider).mutualInterests, isEmpty);
  });
  test('서비스 알림별 선택은 마케팅 수신과 독립적으로 보존된다', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final flow = container.read(flowProvider.notifier);
    flow.saveNotifications(
      marketing: true,
      chat: true,
      interest: false,
      mutual: false,
    );
    flow.setMarketing(false);
    expect(container.read(flowProvider).interestNotifications, isFalse);
    expect(container.read(flowProvider).mutualNotifications, isFalse);
    expect(container.read(flowProvider).chatNotifications, isTrue);
  });
  testWidgets('받은 관심 → 상호 관심 → 팝업 취소·재진입 → 선택한 채팅방과 메시지', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final container = ProviderContainer();
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const GaegaetingApp(),
      ),
    );
    await tester.pumpAndSettle();
    final router = container.read(routerProvider);
    final flow = container.read(flowProvider.notifier);
    router.go('/chats/received');
    await tester.pumpAndSettle();
    expect(find.text('메시지를 입력해 주세요'), findsNothing);
    expect(find.text('아직 열린 채팅방이 없어요'), findsOneWidget);
    flow.previewReceivedInterest('received');
    router.go('/likes');
    await tester.pumpAndSettle();
    await tester.tap(find.text('프로필 확인하기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('나도 관심 표현하기'));
    await tester.pumpAndSettle();
    expect(find.text('서로 관심이 연결됐어요'), findsOneWidget);
    await tester.tap(find.text('채팅하기'));
    await tester.pumpAndSettle();
    expect(find.text('채팅방을 열까요?'), findsOneWidget);
    await tester.tap(find.text('나중에'));
    await tester.pumpAndSettle();
    expect(router.routeInformationProvider.value.uri.path, '/likes');
    await tester.tap(find.text('채팅하기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('채팅방 열기'));
    await tester.pumpAndSettle();
    expect(find.text('서로 관심으로 연결된 채팅방'), findsOneWidget);
    expect(find.text('민지와 하루'), findsNWidgets(2));
    await tester.enterText(find.byType(TextField), '안녕하세요');
    await tester.pump();
    await tester.tap(find.byTooltip('메시지 보내기'));
    await tester.pumpAndSettle();
    expect(container.read(flowProvider).messages['received'], ['안녕하세요']);
    expect(find.text('안녕하세요'), findsOneWidget);
    router.go('/chats');
    await tester.pumpAndSettle();
    expect(find.text('안녕하세요'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('관심·채팅 화면은 320px 및 큰 글자에서도 배치가 깨지지 않는다', (tester) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 1.3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final container = ProviderContainer();
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const GaegaetingApp(),
      ),
    );
    await tester.pumpAndSettle();
    container.read(flowProvider.notifier).sendInterest('1');
    container.read(flowProvider.notifier).previewReceivedInterest('1');
    for (final route in [
      '/likes',
      '/likes?tab=sent',
      '/likes?tab=mutual',
      '/chats',
      '/chats/1',
      '/notifications',
    ]) {
      container.read(routerProvider).go(route);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: route);
    }
  });
}
