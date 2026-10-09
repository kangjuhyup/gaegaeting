import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/app/gaegaeting_app.dart';
import 'package:gaegaeting/app/router.dart';

void main() {
  testWidgets('한국어 앱이 시작되고 없는 주소에서 처음 화면으로 복귀한다', (tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const GaegaetingApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('함께 걷는 친구를 만나요'), findsOneWidget);
    final context = tester.element(find.byType(Scaffold));
    expect(Localizations.localeOf(context), const Locale('ko'));

    container.read(routerProvider).go('/missing');
    await tester.pumpAndSettle();
    expect(find.text('페이지를 찾을 수 없어요.'), findsOneWidget);

    await tester.tap(find.text('처음으로 돌아가기'));
    await tester.pumpAndSettle();
    expect(find.text('함께 걷는 친구를 만나요'), findsOneWidget);
  });
}
