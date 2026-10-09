import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/app/gaegaeting_app.dart';
import 'package:gaegaeting/app/router.dart';
import 'package:gaegaeting/features/flow/application/flow_controller.dart';

Future<void> tapText(WidgetTester tester, String text) async {
  final target = find.text(text);
  await tester.ensureVisible(target);
  await tester.tap(target);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('가입부터 등록·추천·열람·충전까지 실제 앱 경로가 이어진다', (tester) async {
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
    await tapText(tester, '카카오로 회원가입');
    await tapText(tester, '가입 완료하고 로그인');
    await tapText(tester, '카카오로 로그인');
    await tapText(tester, '저장하고 강아지 등록');
    await tapText(tester, '등록 완료하고 시작하기');
    expect(find.text('추천'), findsWidgets);
    await tester.tap(find.byTooltip('내 동네 친구들 추천받기'));
    await tester.pumpAndSettle();
    final firstCard = find.byKey(const ValueKey('friend-1'));
    await tester.tap(
      find.descendant(of: firstCard, matching: find.text('프로필 열기')),
    );
    await tester.pumpAndSettle();
    await tapText(tester, '나중에 보기');
    expect(container.read(flowProvider).snacks, 2);
    await tester.tap(
      find.descendant(of: firstCard, matching: find.text('프로필 열기')),
    );
    await tester.pumpAndSettle();
    await tapText(tester, '간식 2개 사용하고 열기');
    expect(find.text('열람 완료 · 추가 차감 없음'), findsOneWidget);
    await tapText(tester, '추천 목록으로 돌아가기');
    final secondCard = find.byKey(const ValueKey('friend-2'));
    await tester.tap(
      find.descendant(of: secondCard, matching: find.text('프로필 열기')),
    );
    await tester.pumpAndSettle();
    expect(find.text('간식이 부족해요'), findsOneWidget);
    await tapText(tester, '간식 구매하기');
    await tester.tap(find.byKey(const ValueKey('snack-package-50')));
    await tester.pumpAndSettle();
    await tapText(tester, '간식 50개 · 6,000원 구매');
    expect(find.text('결제 연동 준비 중'), findsOneWidget);
    expect(container.read(flowProvider).snacks, 0);
    await tapText(tester, '충전 후 흐름 미리보기');
    expect(container.read(flowProvider).snacks, 50);
    await tapText(tester, '간식 2개 사용하고 열기');
    expect(container.read(flowProvider).opened, {'1', '2'});
    expect(container.read(flowProvider).snacks, 48);
    expect(tester.takeException(), isNull);
  });
  testWidgets('알림 설정 저장 후 다시 열면 수신 선택이 보존된다', (tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const GaegaetingApp(),
      ),
    );
    await tester.pumpAndSettle();
    container.read(routerProvider).go('/settings/notifications');
    await tester.pumpAndSettle();
    await tapText(tester, '이벤트·혜택 마케팅 메시지');
    await tapText(tester, '설정 저장');
    expect(container.read(flowProvider).marketing, isTrue);
    expect(container.read(flowProvider).chatNotifications, isTrue);
    container.read(routerProvider).go('/settings/notifications');
    await tester.pumpAndSettle();
    final checks = tester.widgetList<Checkbox>(find.byType(Checkbox)).toList();
    expect(checks.map((c) => c.value), [true, true, true, true]);
    expect(tester.takeException(), isNull);
  });
  testWidgets('320px 화면과 큰 글자에서 주요 화면에 배치 오류가 없다', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
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
    for (final route in [
      '/',
      '/login',
      '/signup/agreements',
      '/onboarding/profile',
      '/onboarding/pet',
      '/main',
      '/recommendations',
      '/recommendations/1/unlock',
      '/snacks/insufficient',
      '/snacks/purchase',
      '/settings/notifications',
      '/profile',
    ]) {
      container.read(routerProvider).go(route);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: route);
    }
  });
}
