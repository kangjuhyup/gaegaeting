import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/app/gaegaeting_app.dart';
import 'package:gaegaeting/app/router.dart';
import 'package:gaegaeting/features/account/application/api_session.dart';

import 'social_fixture.dart';

void main() {
  Future<void> open(
    WidgetTester tester,
    SocialAppFixture f,
    String path,
  ) async {
    await tester.runAsync(() => f.container.read(apiSessionProvider.future));
    f.container.read(routerProvider).go(path);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: f.container,
        child: const GaegaetingApp(),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('받은 관심 수락 뒤 실제 매칭을 확인하고 채팅을 전송한다', (tester) async {
    final f = SocialAppFixture();
    addTearDown(f.dispose);
    await open(tester, f, '/api/likes');
    expect(find.text('받은 관심'), findsOneWidget);
    expect(find.text('지우'), findsOneWidget);
    await tester.tap(find.text('관심 수락'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('서로 관심'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('채팅방 열기'));
    await tester.pumpAndSettle();
    expect(find.text('안녕하세요! 같이 산책해요.'), findsOneWidget);
    await tester.enterText(find.byType(TextField), '내일 같이 걸어요');
    await tester.pump();
    await tester.tap(find.byTooltip('메시지 보내기'));
    await tester.pumpAndSettle();
    expect(find.text('내일 같이 걸어요'), findsOneWidget);
    expect(
      f.api.operations,
      containsAll([
        'acceptLike',
        'syncChatRooms',
        'chatMessages',
        'markChatRead',
        'sendChatMessage',
      ]),
    );
  });
  testWidgets('서버 응답을 잃으면 입력을 유지하고 같은 메시지 재시도로 중복을 막는다', (tester) async {
    final f = SocialAppFixture();
    f.api.pairs.add({'id': 10});
    f.api.loseSend = true;
    addTearDown(f.dispose);
    await open(tester, f, '/api/chats/1');
    await tester.enterText(find.byType(TextField), '응답 확인');
    await tester.pump();
    await tester.tap(find.byTooltip('메시지 보내기'));
    await tester.pumpAndSettle();
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      '응답 확인',
    );
    await tester.tap(find.byTooltip('같은 메시지 재시도'));
    await tester.pumpAndSettle();
    expect(f.api.messages.where((m) => m['body'] == '응답 확인'), hasLength(1));
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      isEmpty,
    );
  });
  testWidgets('프로필에서 기존 강아지 수정·사진 상태 관리로 이동한다', (tester) async {
    final f = SocialAppFixture();
    addTearDown(f.dispose);
    await open(tester, f, '/api/me');
    expect(find.text('강아지 정보 수정'), findsOneWidget);
    await tester.tap(find.text('강아지 정보 수정'));
    await tester.pumpAndSettle();
    expect(find.text('강아지 프로필 수정'), findsOneWidget);
    expect(find.text('하루'), findsWidgets);
    f.container.read(routerProvider).go('/api/profile/images');
    await tester.pumpAndSettle();
    expect(find.text('등록한 사진이 없어요.'), findsOneWidget);
    expect(f.api.operations, contains('myProfileImageUploads'));
  });
  testWidgets('프로필 수정은 Retrofit 저장 뒤 다시 읽은 서버 값으로 돌아온다', (tester) async {
    final f = SocialAppFixture();
    addTearDown(f.dispose);
    await open(tester, f, '/api/profile?returnTo=%2Fapi%2Fme');
    await tester.enterText(find.byType(TextField).first, '수정한 이름');
    await tester.pump();
    await tester.tap(find.text('저장하기'));
    await tester.pumpAndSettle();
    expect(f.api.operations, contains('updateProfile'));
    expect(find.text('수정한 이름'), findsWidgets);
    expect(
      f.container.read(routerProvider).routeInformationProvider.value.uri.path,
      '/api/me',
    );
  });
  testWidgets('내 강아지가 아닌 ID로 수정·사진 예약 화면을 열지 않는다', (tester) async {
    final f = SocialAppFixture();
    addTearDown(f.dispose);
    for (final path in ['/api/pet/999', '/api/pet/999/images']) {
      await open(tester, f, path);
      expect(find.byType(TextField), findsNothing);
      expect(f.api.operations, isNot(contains('myPetImageUploads')));
    }
  });
  testWidgets('한글 조합 중 명시적 전송 버튼은 입력을 확정하고 한 번 전송한다', (tester) async {
    final f = SocialAppFixture();
    f.api.pairs.add({'id': 10});
    addTearDown(f.dispose);
    await open(tester, f, '/api/chats/1');
    await tester.tap(find.byType(TextField));
    tester.testTextInput.updateEditingValue(
      const TextEditingValue(
        text: '한글 입력',
        selection: TextSelection.collapsed(offset: 5),
        composing: TextRange(start: 3, end: 5),
      ),
    );
    await tester.pump();
    await tester.tap(find.byTooltip('메시지 보내기'));
    await tester.pumpAndSettle();
    expect(f.api.sentInputs, hasLength(1));
    expect(f.api.messages.last['body'], '한글 입력');
  });
  testWidgets('320px에서도 관심·채팅·프로필에 overflow가 없다', (tester) async {
    final f = SocialAppFixture();
    f.api.pairs.add({'id': 10});
    addTearDown(f.dispose);
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    for (final path in [
      '/api/likes',
      '/api/chats',
      '/api/chats/1',
      '/api/me',
      '/api/profile/images',
    ]) {
      await open(tester, f, path);
      expect(tester.takeException(), isNull, reason: path);
    }
  });
}
