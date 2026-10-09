import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:gaegaeting/app/bottom_navigation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:gaegaeting/app/gaegaeting_app.dart';
import 'package:gaegaeting/core/config/app_config.dart';
import 'package:gaegaeting/core/network/gateway_api.dart';
import 'package:gaegaeting/features/account/application/api_session.dart';
import 'package:gaegaeting/features/account/application/location_sync.dart';
import 'package:gaegaeting/features/account/data/account_repository.dart';

Position position(double latitude) => Position(
  longitude: 127.02,
  latitude: latitude,
  timestamp: DateTime.now(),
  accuracy: 5,
  altitude: 0,
  altitudeAccuracy: 0,
  heading: 0,
  headingAccuracy: 0,
  speed: 0,
  speedAccuracy: 0,
);

AccountRepository locationRepository(List<RequestOptions> requests) {
  final dio = Dio();
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (request, handler) {
        requests.add(request);
        handler.resolve(
          Response(
            requestOptions: request,
            statusCode: 200,
            data: {
              'data': {
                'setCurrentLocation': true,
                'createDailyFeed': true,
                'getDailyFeed': [],
              },
            },
          ),
        );
      },
    ),
  );
  return AccountRepository(
    account: GatewayApi(dio),
    gateway: GatewayApi(dio),
    accessToken: () async => 'test-access-token',
  );
}

class SignedSession extends ApiSession {
  @override
  Future<AccountSnapshot?> build() async => const AccountSnapshot(
    profile: ServerProfile(
      id: 'local-user',
      nickname: '산책 친구',
      region: 'SEOUL',
    ),
    pets: [
      ServerPet(id: 1, name: '하루', age: 3, breed: 'POODLE', gender: 'MALE'),
    ],
  );
}

class UnsignedSession extends ApiSession {
  @override
  Future<AccountSnapshot?> build() async => null;
}

void main() {
  testWidgets('앱을 열면 위치 기록 후 추천을 자동 생성·조회하며 다시 열면 갱신한다', (tester) async {
    final requests = <RequestOptions>[];
    var latitude = 37.5;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            const AppConfig(
              gatewayGraphqlUrl: 'http://localhost:8080/gateway/graphql',
              apiEnabled: true,
            ),
          ),
          apiSessionProvider.overrideWith(SignedSession.new),
          accountRepositoryProvider.overrideWithValue(
            locationRepository(requests),
          ),
          currentPositionProvider.overrideWithValue(
            () async => position(latitude),
          ),
        ],
        child: const GaegaetingApp(),
      ),
    );
    await tester.pumpAndSettle();
    final writes = requests
        .where((r) => (r.data as Map)['query'].startsWith('mutation'))
        .toList();
    expect(writes, hasLength(2));
    expect(writes.first.headers['Authorization'], 'Bearer test-access-token');
    expect((writes.first.data as Map)['variables'], {
      'input': {'latitude': 37.5, 'longitude': 127.02},
    });
    expect((writes.first.data as Map)['query'], contains('setCurrentLocation'));
    expect((writes.last.data as Map)['query'], contains('createDailyFeed'));
    expect(find.text('추천'), findsWidgets);
    expect(find.textContaining('위치·추천 갱신 완료'), findsNothing);

    latitude = 37.6;
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    final allWrites = requests
        .where((r) => (r.data as Map)['query'].startsWith('mutation'))
        .toList();
    expect(allWrites, hasLength(4));
    expect((allWrites[2].data as Map)['variables']['input']['latitude'], 37.6);
    expect(
      requests.any((r) => (r.data as Map)['query'].contains('getDailyFeed')),
      true,
    );
    expect(find.text('내 위치로 추천 만들기'), findsNothing);
    for (final label in ['추천', '관심', '챌린지', '채팅', '프로필']) {
      expect(
        find.descendant(
          of: find.byType(AppBottomNavigation),
          matching: find.text(label),
        ),
        findsOneWidget,
      );
    }
    await tester.tap(find.text('프로필'));
    await tester.pumpAndSettle();
    expect(find.text('산책 친구'), findsOneWidget);
    expect(find.text('하루'), findsOneWidget);
    expect(find.text('내 프로필 수정'), findsOneWidget);
    await tester.tap(find.text('추천'));
    await tester.pumpAndSettle();
    expect(find.text('추천'), findsWidgets);
  });

  testWidgets('로그인하지 않은 앱은 위치 권한이나 서버 기록을 요청하지 않는다', (tester) async {
    var positions = 0;
    final requests = <RequestOptions>[];
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            const AppConfig(
              gatewayGraphqlUrl: 'http://localhost:8080/gateway/graphql',
              apiEnabled: true,
            ),
          ),
          apiSessionProvider.overrideWith(UnsignedSession.new),
          accountRepositoryProvider.overrideWithValue(
            locationRepository(requests),
          ),
          currentPositionProvider.overrideWithValue(() async {
            positions++;
            return position(37.5);
          }),
        ],
        child: const GaegaetingApp(),
      ),
    );
    await tester.pumpAndSettle();
    expect(positions, 0);
    expect(requests, isEmpty);
  });

  testWidgets('위치 실패는 앱 사용을 막지 않으며 재시도로 기록할 수 있다', (tester) async {
    final requests = <RequestOptions>[];
    var allowed = false;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            const AppConfig(
              gatewayGraphqlUrl: 'http://localhost:8080/gateway/graphql',
              apiEnabled: true,
            ),
          ),
          apiSessionProvider.overrideWith(SignedSession.new),
          accountRepositoryProvider.overrideWithValue(
            locationRepository(requests),
          ),
          currentPositionProvider.overrideWithValue(() async {
            if (!allowed) throw const ApiFailure('위치 권한을 허용해 주세요.');
            return position(37.5);
          }),
        ],
        child: const GaegaetingApp(),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('추천'), findsWidgets);
    expect(find.text('위치 권한을 허용해 주세요.'), findsOneWidget);
    expect(
      requests.where((r) => (r.data as Map)['query'].startsWith('mutation')),
      isEmpty,
    );
    allowed = true;
    await tester.tap(find.text('위치·추천 다시 시도'));
    await tester.pumpAndSettle();
    expect(
      requests.where((r) => (r.data as Map)['query'].startsWith('mutation')),
      hasLength(2),
    );
    expect(find.text('추천'), findsWidgets);
    expect(find.textContaining('위치·추천 갱신 완료'), findsNothing);
  });

  test('동시에 기록을 요청해도 한 번 저장하고 로그아웃 후 대기 중 위치는 전송하지 않는다', () async {
    final requests = <RequestOptions>[];
    final pending = Completer<Position>();
    final container = ProviderContainer(
      overrides: [
        accountRepositoryProvider.overrideWithValue(
          locationRepository(requests),
        ),
        currentPositionProvider.overrideWithValue(() => pending.future),
      ],
    );
    addTearDown(container.dispose);
    final sync = container.read(locationSyncProvider.notifier);
    final first = sync.sync();
    final second = sync.sync();
    pending.complete(position(37.5));
    expect(await first, true);
    expect(await second, true);
    expect(
      requests.where((r) => (r.data as Map)['query'].startsWith('mutation')),
      hasLength(2),
    );

    final pendingAfterLogout = Completer<Position>();
    final other = ProviderContainer(
      overrides: [
        accountRepositoryProvider.overrideWithValue(
          locationRepository(requests),
        ),
        currentPositionProvider.overrideWithValue(
          () => pendingAfterLogout.future,
        ),
      ],
    );
    final recording = other.read(locationSyncProvider.notifier).sync();
    other.dispose();
    pendingAfterLogout.complete(position(37.6));
    expect(await recording, false);
    expect(
      requests.where((r) => (r.data as Map)['query'].startsWith('mutation')),
      hasLength(2),
    );
  });
}
