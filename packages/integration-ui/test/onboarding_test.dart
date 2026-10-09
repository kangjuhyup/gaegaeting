import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/core/design/app_theme.dart';
import 'package:gaegaeting/features/flow/application/flow_controller.dart';
import 'package:gaegaeting/features/onboarding/presentation/onboarding_screens.dart';
import 'package:go_router/go_router.dart';

Future<ProviderContainer> showFlow(WidgetTester tester, String initial) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final container = ProviderContainer();
  final router = GoRouter(
    initialLocation: initial,
    routes: [
      GoRoute(path: '/', builder: (_, _) => const SignupScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(
        path: '/signup/phone',
        builder: (_, _) => const PhoneSignupScreen(),
      ),
      GoRoute(
        path: '/signup/verify',
        builder: (_, _) => const PhoneVerificationScreen(),
      ),
      GoRoute(
        path: '/signup/agreements',
        builder: (_, _) => const AgreementsScreen(),
      ),
      GoRoute(
        path: '/login/phone',
        builder: (_, _) => const PhoneLoginScreen(),
      ),
      GoRoute(
        path: '/onboarding/profile',
        builder: (_, _) => const ProfileRegistrationScreen(),
      ),
      GoRoute(
        path: '/onboarding/pet',
        builder: (_, _) => const PetRegistrationScreen(),
      ),
      GoRoute(
        path: '/main',
        builder: (_, _) => const Scaffold(body: Text('등록 후 추천 화면')),
      ),
    ],
  );
  addTearDown(router.dispose);
  addTearDown(container.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(
        theme: buildAppTheme(),
        locale: const Locale('ko'),
        supportedLocales: const [Locale('ko')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        routerConfig: router,
      ),
    ),
  );
  await tester.pumpAndSettle();
  return container;
}

FilledButton button(WidgetTester tester, String label) =>
    tester.widget<FilledButton>(
      find.ancestor(of: find.text(label), matching: find.byType(FilledButton)),
    );

void main() {
  group('휴대폰 가입과 인증', () {
    testWidgets('010으로 시작하는 11자리 번호를 입력한 경우에만 인증번호를 받을 수 있다', (tester) async {
      final container = await showFlow(tester, '/signup/phone');
      expect(button(tester, '인증번호 받기').onPressed, isNull);
      await tester.enterText(find.byType(TextField), '01112345678');
      await tester.pump();
      expect(button(tester, '인증번호 받기').onPressed, isNull);
      await tester.enterText(find.byType(TextField), '01012345678');
      await tester.pump();
      await tester.tap(find.text('인증번호 받기'));
      await tester.pumpAndSettle();
      expect(find.text('인증번호를 입력해 주세요'), findsOneWidget);
      expect(find.text('01012345678로 보냈어요.'), findsOneWidget);
      expect(container.read(flowProvider).phone, '01012345678');
    });

    testWidgets('잘못된 인증번호는 가입 동의로 이동할 수 없고 미리보기 번호는 이동한다', (tester) async {
      await showFlow(tester, '/signup/verify');
      await tester.enterText(find.byType(TextField), '654321');
      await tester.pump();
      await tester.tap(find.text('인증하고 계속하기'));
      await tester.pumpAndSettle();
      expect(find.text('인증번호가 맞지 않아요. 다시 확인해 주세요.'), findsOneWidget);
      await tester.enterText(find.byType(TextField), '123456');
      await tester.pump();
      await tester.tap(find.text('인증하고 계속하기'));
      await tester.pumpAndSettle();
      expect(find.text('개개팅 이용에 동의해 주세요'), findsOneWidget);
    });

    testWidgets('3분이 지나면 인증번호가 만료되고 재발급으로 다시 입력할 수 있다', (tester) async {
      await showFlow(tester, '/signup/verify');
      await tester.enterText(find.byType(TextField), '123456');
      await tester.pump(const Duration(minutes: 3));
      expect(find.text('인증번호가 만료됐어요. 다시 받아 주세요.'), findsOneWidget);
      expect(button(tester, '인증하고 계속하기').onPressed, isNull);
      await tester.tap(find.text('인증번호 다시 받기'));
      await tester.pump();
      expect(find.text('인증번호 유효시간 03:00'), findsOneWidget);
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        isEmpty,
      );
      await tester.enterText(find.byType(TextField), '123456');
      await tester.pump();
      expect(button(tester, '인증하고 계속하기').onPressed, isNotNull);
    });
  });

  group('가입 동의', () {
    testWidgets('필수 동의가 빠지면 가입할 수 없고 마케팅 동의는 선택 사항이다', (tester) async {
      final container = await showFlow(tester, '/signup/agreements');
      expect(
        tester.widget<Checkbox>(find.byType(Checkbox).at(2)).value,
        isFalse,
      );
      expect(button(tester, '가입 완료하고 로그인').onPressed, isNotNull);
      await tester.tap(find.text('서비스 이용약관 동의 (필수)'));
      await tester.pump();
      expect(button(tester, '가입 완료하고 로그인').onPressed, isNull);
      await tester.tap(find.text('서비스 이용약관 동의 (필수)'));
      await tester.pump();
      await tester.tap(find.text('가입 완료하고 로그인'));
      await tester.pumpAndSettle();
      expect(find.text('다시 만나 반가워요'), findsOneWidget);
      expect(container.read(flowProvider).marketing, isFalse);
    });

    testWidgets('선택한 마케팅 동의가 로그인 이후의 설정에 전달된다', (tester) async {
      final container = await showFlow(tester, '/signup/agreements');
      await tester.tap(find.text('마케팅 메시지 수신 동의 (선택)'));
      await tester.pump();
      await tester.tap(find.text('가입 완료하고 로그인'));
      await tester.pumpAndSettle();
      expect(container.read(flowProvider).marketing, isTrue);
    });
  });

  testWidgets('휴대폰 로그인은 번호 발급 이후 같은 번호의 인증번호로 진행한다', (tester) async {
    await showFlow(tester, '/login/phone');
    await tester.enterText(find.byType(TextField).at(0), '01012345678');
    await tester.enterText(find.byType(TextField).at(1), '123456');
    await tester.pump();
    expect(button(tester, '인증하고 로그인').onPressed, isNull);
    await tester.tap(find.text('인증번호 받기'));
    await tester.pump();
    await tester.enterText(find.byType(TextField).at(1), '123456');
    await tester.pump();
    expect(button(tester, '인증하고 로그인').onPressed, isNotNull);
    await tester.enterText(find.byType(TextField).at(0), '01087654321');
    await tester.pump();
    expect(button(tester, '인증하고 로그인').onPressed, isNull);
    await tester.enterText(find.byType(TextField).at(0), '01012345678');
    await tester.pump();
    await tester.tap(find.text('인증하고 로그인'));
    await tester.pumpAndSettle();
    expect(find.text('나를 소개해 주세요'), findsOneWidget);
  });

  testWidgets('닉네임과 동네를 등록하고 강아지 정보를 저장하면 추천 화면으로 이동한다', (tester) async {
    final container = await showFlow(tester, '/onboarding/profile');
    await tester.enterText(find.byType(TextField).at(0), ' ');
    await tester.pump();
    expect(button(tester, '저장하고 강아지 등록').onPressed, isNull);
    await tester.enterText(find.byType(TextField).at(0), '함께 걷는 지수');
    await tester.enterText(find.byType(TextField).at(1), '서울 성동구');
    await tester.enterText(find.byType(TextField).at(2), '');
    await tester.pump();
    await tester.tap(find.text('저장하고 강아지 등록'));
    await tester.pumpAndSettle();
    expect(find.text('우리 강아지도 소개해 주세요'), findsOneWidget);
    expect(container.read(flowProvider).nickname, '함께 걷는 지수');
    expect(container.read(flowProvider).introduction, isEmpty);
    await tester.enterText(find.byType(TextField).at(0), '보리');
    await tester.enterText(find.byType(TextField).at(2), '두 살');
    await tester.pump();
    expect(button(tester, '등록 완료하고 시작하기').onPressed, isNull);
    await tester.enterText(find.byType(TextField).at(2), '2');
    await tester.tap(find.text('암컷'));
    await tester.pump();
    await tester.tap(find.text('등록 완료하고 시작하기'));
    await tester.pumpAndSettle();
    expect(find.text('등록 후 추천 화면'), findsOneWidget);
    final state = container.read(flowProvider);
    expect(state.profileSaved && state.petSaved, isTrue);
    expect(state.petName, '보리');
    expect(state.age, '2살');
    expect(state.sex, '암컷');
  });
}
