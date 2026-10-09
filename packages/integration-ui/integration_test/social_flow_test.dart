import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:gaegaeting/app/gaegaeting_app.dart';
import 'package:gaegaeting/app/router.dart';
import 'package:gaegaeting/core/design/widgets.dart';
import 'package:gaegaeting/features/account/application/api_session.dart';

import '../test/social_fixture.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('관심 수락 → 실제 매칭 채팅 → 프로필·강아지 저장과 사진 상태', (tester) async {
    final f = SocialAppFixture();
    addTearDown(f.dispose);
    await tester.runAsync(() => f.container.read(apiSessionProvider.future));
    final router = f.container.read(routerProvider);
    router.go('/api/likes');
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: f.container,
        child: const Directionality(
          textDirection: TextDirection.ltr,
          child: Banner(
            message: '테스트 데이터',
            location: BannerLocation.topEnd,
            child: GaegaetingApp(),
          ),
        ),
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
    Future<void> settle() async {
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pump(const Duration(milliseconds: 500));
    }

    Future<void> capture(String name) async {
      await settle();
      expect(tester.takeException(), isNull, reason: name);
      await binding.takeScreenshot('social-$name');
    }

    Future<void> tap(String text) async {
      await tester.ensureVisible(find.text(text).first);
      await tester.tap(find.text(text).first);
      await settle();
    }

    Future<void> open(String path) async {
      router.go(path);
      await tester.pumpAndSettle();
    }

    Future<void> enter(String label, String value) async {
      final field = find.descendant(
        of: find.widgetWithText(FlowField, label),
        matching: find.byType(TextField),
      );
      await tester.ensureVisible(field);
      await tester.enterText(field, value);
      await tester.pump();
      await SystemChannels.textInput.invokeMethod<void>('TextInput.hide');
      await settle();
    }

    await capture('01-received');
    await tap('보낸 관심');
    await capture('02-sent');
    await tap('받은 관심');
    await tap('지우');
    await capture('03-friend');
    await open('/api/likes');
    await tap('관심 수락');
    expect(f.api.pairs, hasLength(1));
    await tap('서로 관심');
    await capture('04-mutual');
    await tap('채팅방 열기');
    await tester.enterText(find.byType(TextField), '내일 같이 걸어요');
    await tester.pumpAndSettle();
    await SystemChannels.textInput.invokeMethod<void>('TextInput.hide');
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<IconButton>(
            find.byWidgetPredicate(
              (w) => w is IconButton && w.tooltip == '메시지 보내기',
            ),
          )
          .onPressed,
      isNotNull,
    );
    await tester.tap(find.byTooltip('메시지 보내기'));
    await settle();
    await SystemChannels.textInput.invokeMethod<void>('TextInput.hide');
    await settle();
    expect(f.api.messages, hasLength(2));
    expect(find.text('내일 같이 걸어요'), findsOneWidget);
    await capture('05-room-sent');
    await open('/api/chats');
    await capture('06-chat-list');
    await open('/api/me');
    await capture('07-my-profile');
    await open('/api/profile?returnTo=%2Fapi%2Fme');
    await enter('닉네임', '산책하는 민지');
    await capture('08-profile-edit');
    await tap('저장하기');
    expect(f.api.ownedProfile['nickname'], '산책하는 민지');
    expect(router.routeInformationProvider.value.uri.path, '/api/me');
    await tap('강아지 정보 수정');
    await enter('강아지 이름', '하루');
    await tap('추가 정보');
    await tap('친화적');
    await enter('소개 (선택)', '함께 걷는 것을 좋아해요.');
    await capture('09-pet-edit');
    await tap('수정 저장');
    expect(f.api.operations, contains('updatePet'));
    await open('/api/profile/images');
    await capture('10-images-empty');
    f.api.photos.add({
      'imageNo': 0,
      'status': 'UPLOADING',
      'kind': 'USER',
      'targetId': 'profile-fixture',
      'updatedAt': '2026-10-06T00:00:00Z',
    });
    await open('/api/me');
    await open('/api/profile/images');
    await capture('11-images-recover');
    await tap('제출 결과 확인·재시도');
    expect(f.api.photos.single['status'], 'PENDING');
    await capture('12-images-pending');
    await open('/api/me');
    await capture('13-profile-saved');
    binding.reportData = {
      ...?binding.reportData,
      'mode': 'real Flutter app / Retrofit+Dio contract fixture; no authenticated live Gateway',
      'operations': f.api.operations.toSet().toList()..sort(),
      'messageCount': f.api.messages.length,
      'uuidRetryCoveredByUnitTests': true,
      'profileSaved': f.api.operations.contains('updateProfile'),
      'petSaved': f.api.operations.contains('updatePet'),
      'photoCompletionStatus': f.api.photos.single['status'],
      'photoBinaryPUT': 'separate repository tests; no live object storage',
    };
  });
}
