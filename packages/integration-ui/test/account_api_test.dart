import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/core/design/widgets.dart';
import 'package:gaegaeting/core/network/gateway_api.dart';
import 'package:gaegaeting/features/account/application/api_session.dart';
import 'package:gaegaeting/features/account/data/account_repository.dart';
import 'package:gaegaeting/features/account/presentation/api_auth_screens.dart';
import 'package:gaegaeting/features/account/presentation/api_account_screens.dart';

AccountRepository repository(
  Map<String, dynamic> Function(RequestOptions) respond, {
  Future<String?> Function()? token,
}) {
  final dio = Dio();
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (request, handler) => handler.resolve(
        Response(
          requestOptions: request,
          statusCode: 200,
          data: respond(request),
        ),
      ),
    ),
  );
  return AccountRepository(
    account: GatewayApi(dio, baseUrl: 'http://localhost:2800/account/graphql'),
    gateway: GatewayApi(dio, baseUrl: 'http://localhost:8080/gateway/graphql'),
    accessToken: token ?? () async => 'test-access-token',
  );
}

void main() {
  test('가입은 Account에 인증 헤더 없이 보내며 본인확인 결과를 클라이언트가 만들지 않는다', () async {
    late RequestOptions request;
    final repo = repository((r) {
      request = r;
      return {
        'data': {
          'registerAccount': {'authSubject': 'local-subject'},
        },
      };
    }, token: () async => throw StateError('signup must not request a token'));
    final input = {
      'username': 'local-user',
      'password': 'test-password',
      'email': 'local@example.test',
      'name': '테스트',
      'phone': '01012345678',
      'birthDate': '1995-01-01',
      'gender': 'FEMALE',
      'termsVersion': '2026-09-01',
      'termsAgreed': true,
    };
    await repo.register(input);
    expect(request.uri.path, '/account/graphql');
    expect(request.headers, isNot(contains('Authorization')));
    expect((request.data as Map)['variables'], {'input': input});
  });

  test('로그인하지 않은 사용자는 서버 프로필을 요청하지 않는다', () async {
    var requests = 0;
    final repo = repository((_) {
      requests++;
      return {};
    }, token: () async => null);
    await expectLater(
      repo.loadAccount(),
      throwsA(
        isA<ApiFailure>().having((e) => e.requiresLogin, 'requiresLogin', true),
      ),
    );
    expect(requests, 0);
  });

  test('서버에 저장된 프로필과 강아지를 조회하고 현재 세션 토큰으로 Gateway에 요청한다', () async {
    late RequestOptions request;
    final repo = repository((r) {
      request = r;
      return {
        'data': {
          'myProfile': {
            'id': 'user-1',
            'nickname': '산책 친구',
            'region': 'SEOUL',
            'bio': '저녁 산책',
            'profileImages': [],
          },
          'pets': [
            {
              'id': 7,
              'name': '하루',
              'age': 3,
              'breed': 'GOLDEN_RETRIEVER',
              'gender': 'MALE',
            },
          ],
        },
      };
    });
    final result = await repo.loadAccount();
    expect(request.uri.path, '/gateway/graphql');
    expect(request.headers['Authorization'], 'Bearer test-access-token');
    expect(result.profile!.nickname, '산책 친구');
    expect(result.pets.single.name, '하루');
    expect(result.destination, '/api/main');
  });

  test('HTTP 성공이어도 GraphQL 저장 오류가 있으면 성공 처리하지 않는다', () async {
    final repo = repository(
      (_) => {
        'data': {'createPet': null},
        'errors': [
          {'message': '강아지 정보를 확인해 주세요.'},
        ],
      },
    );
    await expectLater(
      repo.createPet({'name': '하루'}),
      throwsA(
        isA<ApiFailure>().having(
          (e) => e.message,
          'message',
          '강아지 정보를 확인해 주세요.',
        ),
      ),
    );
  });

  test('로그인 만료 응답은 재로그인을 요구하며 서버 내부 오류를 노출하지 않는다', () async {
    final repo = repository(
      (_) => {
        'errors': [
          {
            'message': 'internal token details',
            'extensions': {'code': 'UNAUTHENTICATED'},
          },
        ],
      },
    );
    await expectLater(
      repo.loadAccount(),
      throwsA(
        isA<ApiFailure>()
            .having((e) => e.requiresLogin, 'requiresLogin', true)
            .having(
              (e) => e.message,
              'safe message',
              isNot(contains('internal')),
            ),
      ),
    );
  });

  test('현재 위치 저장 실패를 성공으로 처리하지 않는다', () async {
    var requests = 0;
    final repo = repository((_) {
      requests++;
      return {
        'data': {'setCurrentLocation': false},
      };
    });
    await expectLater(
      repo.saveCurrentLocation(37.5, 127),
      throwsA(isA<ApiFailure>()),
    );
    expect(requests, 1);
  });

  test('좋아요 저장이 실패하면 완료 상태로 처리하지 않는다', () async {
    final repo = repository(
      (_) => {
        'data': {'actionFeed': false},
      },
    );
    await expectLater(repo.like('12'), throwsA(isA<ApiFailure>()));
  });

  test('추천은 실제 프로필이 있는 후보만 표시하고 강아지 사진을 별도로 가져온다', () async {
    final requests = <RequestOptions>[];
    final repo = repository((r) {
      requests.add(r);
      final query = (r.data as Map)['query'] as String;
      if (query.contains('getDailyFeed')) {
        return {
          'data': {
            'getDailyFeed': [
              {
                'items': [
                  {'id': '1', 'targetUserId': 'missing-user', 'state': 'OPEN'},
                  {'id': '2', 'targetUserId': 'friend-user', 'state': 'OPEN'},
                ],
              },
            ],
          },
        };
      }
      if ((r.data as Map)['variables']['id'] == 'missing-user') {
        return {
          'data': {'profile': null, 'petsByUserId': []},
        };
      }
      return {
        'data': {
          'profile': {
            'id': 'friend-user',
            'nickname': '산책 친구',
            'region': 'SEOUL',
            'profileImages': ['https://example.test/user.jpg'],
          },
          'petsByUserId': [
            {
              'id': 1,
              'name': '보리',
              'age': 2,
              'breed': 'POODLE',
              'gender': 'FEMALE',
              'profileImages': ['https://example.test/pet.jpg'],
              'personalities': ['CALM'],
            },
          ],
        },
      };
    });
    final items = await repo.recommendations();
    expect(items, hasLength(1));
    expect(items.single.targetId, 'friend-user');
    expect(items.single.profile!.images, ['https://example.test/user.jpg']);
    expect(items.single.pets.single.images, ['https://example.test/pet.jpg']);
    expect(items.single.pets.single.traits, ['CALM']);
    expect(requests.last.data['variables'], {'id': 'friend-user'});
    expect(
      requests.last.data['query'],
      contains('profileImages personalities description'),
    );
  });

  testWidgets('가입 화면은 최신 본인확인 요청 계약으로 가입한 뒤 로그인 안내를 표시한다', (tester) async {
    late Map<String, dynamic> input;
    final repo = repository((r) {
      input = Map<String, dynamic>.from(
        (r.data as Map)['variables']['input'] as Map,
      );
      return {
        'data': {
          'registerAccount': {'authSubject': 'local-subject'},
        },
      };
    });
    await tester.pumpWidget(
      ProviderScope(
        overrides: [accountRepositoryProvider.overrideWithValue(repo)],
        child: const MaterialApp(home: ApiSignupScreen()),
      ),
    );
    Future<void> fill(String label, String value) async {
      final field = find.byWidgetPredicate(
        (w) => w is FlowField && w.label == label,
      );
      await tester.ensureVisible(field);
      await tester.enterText(
        find.descendant(of: field, matching: find.byType(TextField)),
        value,
      );
    }

    await fill('아이디', 'flutter-local');
    await fill('비밀번호', 'test-password');
    await fill('이메일', 'local@example.test');
    await fill('이름', '테스트');
    await fill('생년월일', '1995-01-01');
    await fill('휴대폰 번호', '01012345678');
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pumpAndSettle();
    final terms = find.byType(Checkbox);
    await tester.ensureVisible(terms);
    await tester.pumpAndSettle();
    await tester.tap(terms);
    await tester.pump();
    await tester.tap(find.text('회원가입 완료'));
    await tester.pumpAndSettle();
    expect(find.text('가입이 완료됐어요'), findsOneWidget);
    expect(input.keys.toSet(), {
      'username',
      'password',
      'email',
      'name',
      'phone',
      'birthDate',
      'gender',
      'termsVersion',
      'termsAgreed',
    });
    expect(find.text('로그인하기'), findsOneWidget);
  });

  testWidgets('프로필 저장 오류를 표시하고 등록 화면에 머문다', (tester) async {
    final repo = repository(
      (_) => {
        'errors': [
          {'message': '이미 사용 중인 닉네임이에요.'},
        ],
      },
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [accountRepositoryProvider.overrideWithValue(repo)],
        child: const MaterialApp(
          home: ApiProfileScreen(account: AccountSnapshot()),
        ),
      ),
    );
    await tester.enterText(find.byType(TextField).first, '산책 친구');
    await tester.tap(find.text('저장하고 강아지 등록'));
    await tester.pumpAndSettle();
    expect(find.text('이미 사용 중인 닉네임이에요.'), findsOneWidget);
    expect(find.text('저장하고 강아지 등록'), findsOneWidget);
  });

  testWidgets('로그인하지 않은 사용자는 내 프로필 화면 대신 로그인 화면을 본다', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiSessionProvider.overrideWith(_SignedOutSession.new)],
        child: MaterialApp(
          home: ApiAccountGate(builder: (_) => const Text('private profile')),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('private profile'), findsNothing);
    expect(find.text('아이디로 로그인'), findsOneWidget);
  });
}

class _SignedOutSession extends ApiSession {
  @override
  Future<AccountSnapshot?> build() async => null;
}
