import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/features/flow/application/flow_controller.dart';

void main() {
  late ProviderContainer container;
  setUp(() => container = ProviderContainer());
  tearDown(() => container.dispose());
  test('프로필 한 명만 열리고 간식 2개가 차감된다', () {
    expect(container.read(flowProvider.notifier).unlock('1'), isTrue);
    expect(container.read(flowProvider).snacks, 0);
    expect(container.read(flowProvider).opened, {'1'});
  });
  test('이미 열람한 프로필을 다시 열어도 간식이 차감되지 않는다', () {
    final flow = container.read(flowProvider.notifier);
    flow.unlock('1');
    expect(flow.unlock('1'), isTrue);
    expect(container.read(flowProvider).snacks, 0);
  });
  test('간식이 부족하면 다른 프로필이 열리지 않는다', () {
    final flow = container.read(flowProvider.notifier);
    flow.unlock('1');
    expect(flow.unlock('2'), isFalse);
    expect(container.read(flowProvider).opened, {'1'});
    expect(container.read(flowProvider).snacks, 0);
  });
  test('마케팅 수신 선택이 채팅 알림 선택에 영향을 주지 않는다', () {
    final flow = container.read(flowProvider.notifier);
    flow.setMarketing(true);
    expect(container.read(flowProvider).chatNotifications, isTrue);
    flow.saveNotifications(marketing: false, chat: true);
    expect(container.read(flowProvider).marketing, isFalse);
    expect(container.read(flowProvider).chatNotifications, isTrue);
  });
  test('미리보기 초기화는 입력과 열람 상태를 새 세션으로 되돌린다', () {
    final flow = container.read(flowProvider.notifier);
    flow.setPhone('01012345678');
    flow.unlock('1');
    flow.setMarketing(true);
    flow.reset();
    final state = container.read(flowProvider);
    expect(state.phone, isEmpty);
    expect(state.opened, isEmpty);
    expect(state.marketing, isFalse);
    expect(state.snacks, 2);
  });
}
