import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/bottom_navigation.dart';
import '../../../core/design/app_theme.dart';
import '../../../core/design/widgets.dart';
import '../../discovery/domain/friend_profile.dart';
import '../../flow/application/flow_controller.dart';

String _name(String id) =>
    id == 'received' ? '민지와 하루' : findFriend(id)?.name ?? '산책 친구';
Widget _helper(String text) =>
    Text(text, style: AppText.small.copyWith(color: AppColors.secondary));

class InterestFriendCard extends StatelessWidget {
  const InterestFriendCard({
    super.key,
    required this.id,
    required this.status,
    this.onChat,
  });
  final String id, status;
  final VoidCallback? onChat;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppColors.subtle,
      borderRadius: BorderRadius.circular(20),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 56,
              height: 56,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.peach,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                _name(id).characters.first,
                style: AppText.title.copyWith(color: AppColors.primary),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_name(id), style: AppText.title),
                  const SizedBox(height: 4),
                  _helper('서울 마포구 · 저녁 산책'),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (onChat != null || status == '새로 받은 관심')
          FlowPill(status)
        else
          _helper(status),
        if (onChat != null) ...[
          const SizedBox(height: 16),
          FlowButton('채팅하기', onPressed: onChat),
        ],
      ],
    ),
  );
}

Future<void> showMutualChatPopup(BuildContext context, String id) async {
  final open = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 24),
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(child: Text('채팅방을 열까요?', style: AppText.title)),
                IconButton(
                  tooltip: '닫기',
                  onPressed: () => Navigator.pop(dialogContext, false),
                  icon: const DesignIcon('close', color: AppColors.primary),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.peach,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _name(id).characters.first,
                    style: AppText.title.copyWith(color: AppColors.primary),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_name(id), style: AppText.title),
                      const SizedBox(height: 4),
                      const FlowPill('서로 관심'),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _helper('서로 관심을 표현한 친구예요.\n채팅방을 열고 첫 인사를 건네 보세요.'),
            const SizedBox(height: 16),
            FlowButton(
              '채팅방 열기',
              onPressed: () => Navigator.pop(dialogContext, true),
            ),
            const SizedBox(height: 8),
            FlowButton(
              '나중에',
              secondary: true,
              onPressed: () => Navigator.pop(dialogContext, false),
            ),
          ],
        ),
      ),
    ),
  );
  if (context.mounted && open == true) context.push('/chats/$id');
}

/// Figma interaction preview. Data stays in this session and never contacts a peer.
class InterestScreen extends ConsumerStatefulWidget {
  const InterestScreen({super.key, this.initialTab = 'received'});
  final String initialTab;
  @override
  ConsumerState<InterestScreen> createState() => _InterestScreenState();
}

class _InterestScreenState extends ConsumerState<InterestScreen> {
  late String _tab = widget.initialTab;
  @override
  void didUpdateWidget(covariant InterestScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialTab != widget.initialTab) _tab = widget.initialTab;
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(flowProvider);
    final ids = switch (_tab) {
      'sent' => state.sentInterests,
      'mutual' => state.mutualInterests,
      _ => state.receivedInterests,
    };
    final mutual = _tab == 'mutual';
    final sent = _tab == 'sent';
    final heading = ids.isEmpty
        ? (sent
              ? '아직 보낸 관심이 없어요'
              : mutual
              ? '아직 서로 관심인 친구가 없어요'
              : '아직 받은 관심이 없어요')
        : mutual
        ? '서로 관심이 연결됐어요'
        : sent
        ? '관심을 보냈어요'
        : '나에게 온 관심';
    final first = ids.firstOrNull;
    return FlowScreen(
      title: '관심',
      backPath: '/main',
      navigation: const AppBottomNavigation(selected: '/likes'),
      footer: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (first != null && !mutual) ...[
            FlowButton(
              sent ? '상호 관심 후 채팅 가능' : '프로필 확인하기',
              onPressed: sent ? null : () => context.push('/interest/$first'),
            ),
            const SizedBox(height: 8),
          ],
          FlowButton(
            first != null && !sent && !mutual ? '상호 관심 후 채팅 가능' : '추천 친구 둘러보기',
            secondary: true,
            onPressed: first != null && !sent && !mutual
                ? null
                : () => context.go('/main'),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              for (final tab in [
                ('받은 관심', 'received'),
                ('보낸 관심', 'sent'),
                ('서로 관심', 'mutual'),
              ]) ...[
                if (tab.$2 != 'received') const SizedBox(width: 8),
                Expanded(
                  child: FlowChoice(
                    label: tab.$1,
                    selected: _tab == tab.$2,
                    onTap: () => setState(() => _tab = tab.$2),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),
          FlowHeading(
            heading,
            description: first == null
                ? '관심이 도착하면 이곳에서 확인할 수 있어요.'
                : mutual
                ? '${_name(first)}님도 관심을 보냈어요.'
                : sent
                ? '${_name(first)}님에게 관심 알림을 보냈어요.'
                : '${_name(first)}님이 관심을 보냈어요.',
          ),
          const SizedBox(height: 16),
          for (final id in ids) ...[
            InterestFriendCard(
              id: id,
              status: mutual
                  ? '서로 관심 · 채팅 가능'
                  : sent
                  ? '상대의 관심 기다리는 중'
                  : '새로 받은 관심',
              onChat: mutual ? () => showMutualChatPopup(context, id) : null,
            ),
            const SizedBox(height: 16),
          ],
          _helper(
            first == null
                ? '먼저 마음에 드는 산책 친구에게\n관심을 표현해 보세요.'
                : mutual
                ? '친구를 누르면 채팅방을 열 수 있어요.\n마음이 통하는 산책 이야기를 시작해 보세요.'
                : sent
                ? '서로 관심을 표현하면 채팅방을 열 수 있어요.\n상대방이 관심을 보내면 알림으로 알려드려요.'
                : '프로필을 확인하고 관심을 표현해 보세요.\n서로 관심이 되면 채팅방을 열 수 있어요.',
          ),
        ],
      ),
    );
  }
}

class ReceivedInterestProfileScreen extends ConsumerWidget {
  const ReceivedInterestProfileScreen({super.key, required this.id});
  final String id;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final received = ref.watch(flowProvider).receivedInterests.contains(id);
    return FlowScreen(
      title: '프로필',
      backPath: '/likes',
      footer: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FlowButton(
            '나도 관심 표현하기',
            onPressed: received
                ? () {
                    ref.read(flowProvider.notifier).sendInterest(id);
                    context.go('/likes?tab=mutual');
                  }
                : null,
          ),
          const SizedBox(height: 8),
          FlowButton(
            '나중에 보기',
            secondary: true,
            onPressed: () => context.go('/likes'),
          ),
        ],
      ),
      child: !received
          ? const FlowHeading('받은 관심을 찾을 수 없어요')
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const FlowPill('나에게 관심을 보낸 친구'),
                const SizedBox(height: 16),
                const ClipRRect(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                  child: PetPhoto(radius: 0),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_name(id), style: AppText.title),
                      const SizedBox(height: 8),
                      _helper('서울 마포구 · 1.2km'),
                      const SizedBox(height: 8),
                      const FlowPill('프로필 인증', success: true),
                      const SizedBox(height: 16),
                      const Text('말티푸 · 2살 · 저녁 산책을 좋아해요', style: AppText.body),
                      const SizedBox(height: 16),
                      const Text('함께 좋아하는 것', style: AppText.small),
                      const SizedBox(height: 8),
                      const Wrap(
                        spacing: 8,
                        children: [
                          FlowPill('저녁 산책', neutral: true),
                          FlowPill('한강 산책', neutral: true),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _helper('${_name(id)}님이 먼저 관심을 보냈어요.\n관심을 표현하면 서로 연결돼요.'),
              ],
            ),
    );
  }
}

class ChatListScreen extends ConsumerWidget {
  const ChatListScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(flowProvider);
    final ids = state.mutualInterests;
    return FlowScreen(
      title: '채팅',
      backPath: '/main',
      navigation: const AppBottomNavigation(selected: '/chats'),
      footer: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FlowButton(
            ids.isEmpty ? '상호 관심 후 채팅 가능' : '채팅방 열기',
            onPressed: ids.isEmpty
                ? null
                : () => context.push('/chats/${ids.first}'),
          ),
          if (ids.isEmpty) ...[
            const SizedBox(height: 8),
            FlowButton(
              '보낸 관심 보기',
              secondary: true,
              onPressed: () => context.go('/likes?tab=sent'),
            ),
          ],
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FlowHeading(
            ids.isEmpty ? '아직 열린 채팅방이 없어요' : '산책 친구와 대화해요',
            description: ids.isEmpty
                ? '서로 관심을 표현한 친구와 대화할 수 있어요.'
                : '서로 관심을 표현한 친구와 연결됐어요.',
          ),
          const SizedBox(height: 16),
          if (ids.isEmpty) ...[
            if (state.sentInterests.isNotEmpty)
              InterestFriendCard(
                id: state.sentInterests.first,
                status: '관심 보냄 · 상대 응답 대기',
              ),
            const SizedBox(height: 16),
            _helper('한쪽만 관심을 보낸 상태에서는\n채팅방을 열 수 없어요.'),
          ] else ...[
            const FlowPill('서로 관심 · 대화 가능'),
            const SizedBox(height: 16),
            for (final id in ids)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: ClipOval(
                  child: SizedBox(
                    width: 56,
                    height: 56,
                    child: const PetPhoto(height: 56, radius: 0),
                  ),
                ),
                title: Text(_name(id), style: AppText.body),
                subtitle: Text(
                  state.messages[id]?.lastOrNull ?? '아직 메시지가 없어요. 첫 인사를 건네보세요.',
                  style: AppText.caption,
                ),
                trailing: const Text('지금', style: AppText.caption),
                onTap: () => showMutualChatPopup(context, id),
              ),
          ],
        ],
      ),
    );
  }
}

class ChatRoomScreen extends ConsumerStatefulWidget {
  const ChatRoomScreen({super.key, required this.id});
  final String id;
  @override
  ConsumerState<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends ConsumerState<ChatRoomScreen> {
  final _message = TextEditingController();
  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(flowProvider);
    final allowed = state.mutualInterests.contains(widget.id);
    return FlowScreen(
      title: _name(widget.id),
      backPath: '/chats',
      footer: allowed
          ? Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _message,
                    decoration: const InputDecoration(hintText: '메시지를 입력해 주세요'),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  tooltip: '메시지 보내기',
                  style: IconButton.styleFrom(
                    backgroundColor: AppColors.peach,
                    foregroundColor: AppColors.primary,
                  ),
                  onPressed: _message.text.trim().isEmpty
                      ? null
                      : () {
                          if (ref
                              .read(flowProvider.notifier)
                              .sendPreviewMessage(widget.id, _message.text)) {
                            _message.clear();
                            setState(() {});
                          }
                        },
                  icon: const DesignIcon('send', color: AppColors.primary),
                ),
              ],
            )
          : FlowButton(
              '보낸 관심 보기',
              onPressed: () => context.go('/likes?tab=sent'),
            ),
      child: !allowed
          ? const FlowHeading(
              '아직 열린 채팅방이 없어요',
              description: '서로 관심을 표현한 친구와 대화할 수 있어요.',
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const FlowPill('서로 관심으로 연결된 채팅방'),
                const SizedBox(height: 16),
                InterestFriendCard(id: widget.id, status: '첫 인사를 기다리고 있어요.'),
                const SizedBox(height: 16),
                _helper('서로 관심을 표현해 대화가 열렸어요.\n편하게 산책 이야기를 시작해 보세요.'),
                for (final message in state.messages[widget.id] ?? <String>[])
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.peach,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(message, style: AppText.body),
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}

class InterestNotificationsScreen extends ConsumerWidget {
  const InterestNotificationsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(flowProvider);
    final mutual = state.mutualInterests.isNotEmpty;
    final ids = mutual ? state.mutualInterests : state.receivedInterests;
    return FlowScreen(
      title: '알림',
      backPath: '/likes',
      footer: FlowButton(
        mutual ? '서로 관심 확인하기' : '받은 관심 확인하기',
        onPressed: () => context.go(mutual ? '/likes?tab=mutual' : '/likes'),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const FlowHeading('새로운 소식', description: '나와 강아지에 관한 소식을 확인해 보세요.'),
          const SizedBox(height: 16),
          if (ids.isEmpty) _helper('아직 새로운 소식이 없어요.'),
          for (final id in ids)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.subtle,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const DesignIcon('heart'),
                      const SizedBox(width: 8),
                      _helper('개개팅 · 지금'),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    mutual ? '서로 관심이 연결됐어요' : '새로운 관심이 도착했어요',
                    style: AppText.title,
                  ),
                  const SizedBox(height: 8),
                  _helper(
                    mutual
                        ? '${_name(id)}님도 관심을 보냈어요.\n이제 채팅으로 산책 이야기를 시작할 수 있어요.'
                        : '${_name(id)}님이 관심을 보냈어요.\n어떤 친구인지 확인해 보세요.',
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
