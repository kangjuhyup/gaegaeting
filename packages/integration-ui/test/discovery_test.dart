import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/core/design/app_theme.dart';
import 'package:gaegaeting/core/design/widgets.dart';
import 'package:gaegaeting/features/discovery/presentation/discovery_screens.dart';
import 'package:gaegaeting/features/flow/application/flow_controller.dart';
import 'package:go_router/go_router.dart';

Future<(ProviderContainer, GoRouter)> mountDiscovery(
  WidgetTester tester, {
  String initialLocation = '/recommendations',
}) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final container = ProviderContainer();
  addTearDown(container.dispose);
  final router = GoRouter(
    initialLocation: initialLocation,
    routes: [
      GoRoute(path: '/main', builder: (_, _) => const MainScreen()),
      GoRoute(
        path: '/recommendations',
        builder: (_, _) => const NeighborhoodScreen(),
      ),
      GoRoute(
        path: '/recommendations/:id/unlock',
        builder: (_, state) =>
            UnlockConfirmationScreen(profileId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/recommendations/:id/profile',
        builder: (_, state) =>
            FriendProfileScreen(profileId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/snacks/insufficient',
        builder: (_, state) => InsufficientSnacksScreen(
          profileId: state.uri.queryParameters['profile']!,
        ),
      ),
      GoRoute(
        path: '/snacks/purchase',
        builder: (_, state) => SnackPurchaseScreen(
          profileId: state.uri.queryParameters['profile'],
        ),
      ),
      GoRoute(
        path: '/settings/notifications',
        builder: (_, _) => const Scaffold(body: Text('알림 설정')),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(theme: buildAppTheme(), routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  return (container, router);
}

void main() {
  testWidgets(
    'confirmation cancellation preserves snacks and every profile stays locked',
    (tester) async {
      final (container, _) = await mountDiscovery(tester);
      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey('friend-1')),
          matching: find.text('프로필 열기'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('이 친구의 프로필을 열까요?'), findsOneWidget);
      expect(container.read(flowProvider).snacks, 2);
      await tester.tap(find.text('나중에 보기'));
      await tester.pumpAndSettle();
      expect(container.read(flowProvider).snacks, 2);
      expect(container.read(flowProvider).opened, isEmpty);
      expect(find.text('내 동네 친구 10명'), findsOneWidget);
    },
  );

  testWidgets(
    'only selected profile opens, costs two once, and another profile requires snacks',
    (tester) async {
      final (container, router) = await mountDiscovery(tester);
      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey('friend-1')),
          matching: find.text('프로필 열기'),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('간식 2개 사용하고 열기'));
      await tester.pumpAndSettle();
      expect(container.read(flowProvider).snacks, 0);
      expect(container.read(flowProvider).opened, {'1'});
      expect(find.text('열람 완료 · 추가 차감 없음'), findsOneWidget);
      await tester.tap(find.text('추천 목록으로 돌아가기'));
      await tester.pumpAndSettle();
      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey('friend-1')),
          matching: find.text('다시 보기'),
        ),
      );
      await tester.pumpAndSettle();
      expect(container.read(flowProvider).snacks, 0);
      await tester.tap(find.text('추천 목록으로 돌아가기'));
      await tester.pumpAndSettle();
      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey('friend-2')),
          matching: find.text('프로필 열기'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('간식이 부족해요'), findsOneWidget);
      await tester.tap(find.text('간식 구매하기'));
      await tester.pumpAndSettle();
      expect(
        router.routeInformationProvider.value.uri.queryParameters['profile'],
        '2',
      );
      expect(container.read(flowProvider).opened, {'1'});
    },
  );

  testWidgets(
    'locked direct profile route exposes no photo or profile introduction',
    (tester) async {
      final (container, _) = await mountDiscovery(
        tester,
        initialLocation: '/recommendations/3/profile',
      );
      expect(find.text('아직 열지 않은 프로필이에요'), findsOneWidget);
      expect(find.byType(PetPhoto), findsNothing);
      expect(find.text('같이 산책해요'), findsNothing);
      expect(container.read(flowProvider).opened, isEmpty);
      await tester.tap(find.text('프로필 열기'));
      await tester.pumpAndSettle();
      expect(find.text('민서와 보리'), findsOneWidget);
      expect(find.text('이 친구의 프로필을 열까요?'), findsOneWidget);
    },
  );

  testWidgets('invalid friend never falls through to another profile', (
    tester,
  ) async {
    await mountDiscovery(
      tester,
      initialLocation: '/recommendations/unknown/profile',
    );
    expect(find.text('프로필을 찾을 수 없어요'), findsOneWidget);
    expect(find.text('지훈과 코코'), findsNothing);
    expect(find.byType(PetPhoto), findsNothing);
  });

  testWidgets(
    'selected package changes purchase label and only explicit preview adds snacks',
    (tester) async {
      final (container, router) = await mountDiscovery(
        tester,
        initialLocation: '/snacks/purchase?profile=2',
      );
      await tester.tap(find.byKey(const ValueKey('snack-package-50')));
      await tester.pumpAndSettle();
      expect(find.text('간식 50개 · 6,000원 구매'), findsOneWidget);
      await tester.tap(find.text('간식 50개 · 6,000원 구매'));
      await tester.pumpAndSettle();
      expect(find.text('결제 연동 준비 중'), findsOneWidget);
      expect(container.read(flowProvider).snacks, 2);
      await tester.tap(find.text('닫기'));
      await tester.pumpAndSettle();
      expect(container.read(flowProvider).snacks, 2);
      await tester.tap(find.text('간식 50개 · 6,000원 구매'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('충전 후 흐름 미리보기'));
      await tester.pumpAndSettle();
      expect(container.read(flowProvider).snacks, 52);
      expect(container.read(flowProvider).opened, isEmpty);
      expect(
        router.routeInformationProvider.value.uri.path,
        '/recommendations/2/unlock',
      );
      await tester.tap(find.text('간식 2개 사용하고 열기'));
      await tester.pumpAndSettle();
      expect(container.read(flowProvider).snacks, 50);
      expect(container.read(flowProvider).opened, {'2'});
    },
  );

  testWidgets(
    'discovery content fits a narrow phone without layout exceptions',
    (tester) async {
      final (_, router) = await mountDiscovery(tester);
      tester.view.physicalSize = const Size(320, 640);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      for (final route in [
        '/main',
        '/recommendations/1/unlock',
        '/snacks/purchase?profile=1',
      ]) {
        router.go(route);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: route);
      }
    },
  );
}
