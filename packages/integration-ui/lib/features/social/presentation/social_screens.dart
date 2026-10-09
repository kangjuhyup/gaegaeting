import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/bottom_navigation.dart';
import '../../../core/design/app_theme.dart';
import '../../../core/design/widgets.dart';
import '../../account/application/api_session.dart';
import '../../challenge/application/challenge_providers.dart';
import '../../account/data/account_repository.dart';
import '../application/social_providers.dart';
import '../application/chat_controller.dart';
import '../data/chat_events.dart';
import '../data/social_repository.dart';

Widget socialError(BuildContext context, String text, VoidCallback retry) =>
    Column(
      children: [
        Text(text, style: AppText.body),
        const SizedBox(height: 12),
        FlowButton('다시 시도', secondary: true, onPressed: retry),
        Consumer(
          builder: (context, ref, _) => TextButton(
            onPressed: () async {
              final returnTo = GoRouterState.of(context).uri.toString();
              try {
                await ref.read(apiSessionProvider.notifier).signOut();
              } catch (_) {
                /* Local session was cleared. */
              }
              if (context.mounted) {
                context.go(
                  '/api/login?returnTo=${Uri.encodeComponent(returnTo)}',
                );
              }
            },
            child: const Text('다시 로그인'),
          ),
        ),
      ],
    );

class SocialFriendCard extends ConsumerWidget {
  const SocialFriendCard({
    super.key,
    required this.id,
    this.subtitle,
    this.onTap,
  });
  final String id;
  final String? subtitle;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context, WidgetRef ref) => ref
      .watch(socialFriendProvider(id))
      .when(
        loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: LinearProgressIndicator(),
        ),
        error: (e, _) => ListTile(
          title: const Text('친구 정보를 불러오지 못했어요'),
          trailing: IconButton(
            tooltip: '친구 정보 재시도',
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(socialFriendProvider(id)),
          ),
        ),
        data: (friend) {
          final pet = friend.pets.firstOrNull;
          final images = pet?.images ?? friend.profile?.images ?? <String>[];
          return Material(
            type: MaterialType.transparency,
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(
                backgroundColor: AppColors.subtle,
                child: images.isEmpty
                    ? const DesignIcon('paw')
                    : ClipOval(
                        child: Image.network(
                          images.first,
                          width: 48,
                          height: 48,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const DesignIcon('paw'),
                        ),
                      ),
              ),
              title: Text(
                friend.profile?.nickname ?? '프로필을 확인할 수 없어요',
                style: AppText.body,
              ),
              subtitle: Text(
                [
                  if (pet != null)
                    '${pet.name} · ${breeds[pet.breed] ?? pet.breed}',
                  ?subtitle,
                ].join('\n'),
                style: AppText.caption,
              ),
              onTap: onTap,
            ),
          );
        },
      );
}

class ApiInterestScreen extends ConsumerStatefulWidget {
  const ApiInterestScreen({super.key, this.initialTab = 'received'});
  final String initialTab;
  @override
  ConsumerState<ApiInterestScreen> createState() => _ApiInterestScreenState();
}

class _ApiInterestScreenState extends ConsumerState<ApiInterestScreen> {
  late String tab = widget.initialTab;
  List<SocialJson> rows = [];
  bool loading = true, more = false, busy = false;
  String? error;
  var generation = 0;
  String get operation =>
      {
        'received': 'myReceivedLikes',
        'sent': 'mySentLikes',
        'mutual': 'myPairs',
      }[tab] ??
      'myReceivedLikes';
  @override
  void initState() {
    super.initState();
    Future.microtask(() => load());
  }

  Future<void> load({bool next = false}) async {
    final serial = ++generation, name = operation;
    final api = ref.read(socialApiProvider);
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = await api.call(name, {
        'offset': next ? rows.length : 0,
        'limit': 50,
      }) as List;
      if (!mounted || serial != generation) return;
      setState(() {
        if (!next) rows.clear();
        rows.addAll(data.map((e) => SocialJson.from(e)));
        more = data.length == 50 && rows.length < 10000;
      });
    } catch (e) {
      if (mounted && serial == generation) {
        setState(() => error = apiErrorMessage(e));
      }
    } finally {
      if (mounted && serial == generation) setState(() => loading = false);
    }
  }

  Future<void> act(String op, int id) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      await ref.read(socialApiProvider).call(op, {'id': id});
      if (mounted) {
        await load();
        if (mounted && op == 'acceptLike') {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('관심을 수락했어요. 서로 관심 목록에서 연결 상태를 확인해 주세요.'),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) setState(() => error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> chat(int pairId) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      final rooms =
          await ref.read(socialApiProvider).call('syncChatRooms') as List;
      final room = rooms.where((r) => r['pairId'] == pairId).firstOrNull;
      if (mounted) {
        if (room == null) {
          setState(() => error = '채팅방을 연결하고 있어요. 잠시 후 다시 확인해 주세요.');
        } else {
          context.push('/api/chats/${room['id']}');
        }
      }
    } catch (e) {
      if (mounted) setState(() => error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => FlowScreen(
    title: '관심',
    canGoBack: false,
    navigation: const AppBottomNavigation(selected: '/likes', apiMode: true),
    actions: IconButton(
      tooltip: '관심 새로고침',
      onPressed: loading ? null : () => load(),
      icon: const Icon(Icons.refresh),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const FlowHeading('산책 친구의 관심', description: '받은 관심과 서로 연결된 친구를 확인해요.'),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          children: [
            for (final t in [
              ('received', '받은 관심'),
              ('sent', '보낸 관심'),
              ('mutual', '서로 관심'),
            ])
              ChoiceChip(
                label: Text(t.$2),
                selected: tab == t.$1,
                onSelected: busy
                    ? null
                    : (_) {
                        setState(() {
                          tab = t.$1;
                          rows = [];
                        });
                        load();
                      },
              ),
          ],
        ),
        const SizedBox(height: 16),
        if (error != null) socialError(context, error!, () => load()),
        if (loading) const LinearProgressIndicator(),
        if (!loading && error == null && rows.isEmpty)
          const SoftCard(child: Text('아직 관심이 없어요. 추천에서 산책 친구를 만나 보세요.')),
        for (final row in rows)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: SoftCard(
              child: Column(
                children: [
                  SocialFriendCard(
                    id: row['otherUserId'],
                    subtitle: tab == 'sent'
                        ? '관심 보냄'
                        : tab == 'mutual'
                        ? '서로 관심 · 대화 가능'
                        : '관심을 보냈어요',
                    onTap: () => context.push(
                      '/api/friend/${Uri.encodeComponent(row['otherUserId'])}',
                    ),
                  ),
                  Text(
                    _date(row['likedAt'] ?? row['createdAt']),
                    style: AppText.caption,
                  ),
                  if (tab == 'received')
                    Wrap(
                      spacing: 12,
                      children: [
                        TextButton(
                          onPressed: busy
                              ? null
                              : () => act('acceptLike', row['id']),
                          child: const Text('관심 수락'),
                        ),
                        TextButton(
                          onPressed: busy
                              ? null
                              : () => act('declineLike', row['id']),
                          child: const Text('거절'),
                        ),
                      ],
                    ),
                  if (tab == 'mutual')
                    SocialPairActions(pairId: row['id'], onDone: () => load()),
                  if (tab == 'mutual')
                    TextButton(
                      onPressed: busy ? null : () => chat(row['id']),
                      child: const Text('채팅방 열기'),
                    ),
                ],
              ),
            ),
          ),
        if (more)
          FlowButton(
            '관심 더 보기',
            secondary: true,
            onPressed: loading ? null : () => load(next: true),
          ),
      ],
    ),
  );
}

String _date(dynamic value) {
  final t = DateTime.tryParse('$value')?.toLocal();
  return t == null
      ? ''
      : '${t.year}.${t.month}.${t.day} ${t.hour}:${t.minute.toString().padLeft(2, '0')}';
}

class ApiChatListScreen extends ConsumerStatefulWidget {
  const ApiChatListScreen({super.key});
  @override
  ConsumerState<ApiChatListScreen> createState() => _ApiChatListScreenState();
}

class _ApiChatListScreenState extends ConsumerState<ApiChatListScreen> {
  StreamSubscription? events;
  Future<List<SocialJson>>? rooms;
  String? liveError;
  bool refreshing = false;
  @override
  void initState() {
    super.initState();
    refresh();
    events = ref
        .read(chatEventsProvider)
        .watch()
        .listen(
          (_) {
            refresh(sync: false);
          },
          onError: (Object e) {
            if (mounted) setState(() => liveError = apiErrorMessage(e));
          },
        );
  }

  Future<void> refresh({bool sync = true}) async {
    if (refreshing) return;
    refreshing = true;
    final api = ref.read(socialApiProvider);
    setState(() {
      rooms = () async {
        try {
          if (sync) await api.call('syncChatRooms');
          return (await api.call('chatRooms') as List)
              .map((e) => SocialJson.from(e))
              .toList();
        } finally {
          refreshing = false;
        }
      }();
    });
  }

  @override
  void dispose() {
    events?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FlowScreen(
    title: '채팅',
    canGoBack: false,
    navigation: const AppBottomNavigation(selected: '/chats', apiMode: true),
    actions: IconButton(
      tooltip: '채팅 새로고침',
      onPressed: refresh,
      icon: const Icon(Icons.refresh),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const FlowHeading('산책 친구와 대화해요', description: '서로 관심을 표현한 친구와 연결돼요.'),
        const SizedBox(height: 16),
        if (liveError != null) Text(liveError!, style: AppText.caption),
        FutureBuilder<List<SocialJson>>(
          future: rooms,
          builder: (context, s) {
            if (s.hasError) {
              return socialError(context, apiErrorMessage(s.error!), refresh);
            }
            if (!s.hasData) return const LinearProgressIndicator();
            if (s.data!.isEmpty) {
              return const SoftCard(
                child: Text('아직 열린 채팅방이 없어요. 서로 관심이 연결되면 대화할 수 있어요.'),
              );
            }
            return Column(
              children: [
                for (final room in s.data!)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: SoftCard(
                      child: Column(
                        children: [
                          SocialFriendCard(
                            id: room['otherUserId'],
                            subtitle:
                                room['lastMessage']?['body'] ?? '첫 인사를 건네보세요.',
                            onTap: () =>
                                context.push('/api/chats/${room['id']}'),
                          ),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              Text(
                                _date(
                                  room['lastMessage']?['sentAt'] ??
                                      room['createdAt'],
                                ),
                                style: AppText.caption,
                              ),
                              if (room['unread'] > 0)
                                FlowPill('${room['unread']} 안 읽음'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    ),
  );
}

class ApiChatRoomScreen extends ConsumerStatefulWidget {
  const ApiChatRoomScreen({super.key, required this.roomId});
  final int roomId;
  @override
  ConsumerState<ApiChatRoomScreen> createState() => _ApiChatRoomScreenState();
}

class _ApiChatRoomScreenState extends ConsumerState<ApiChatRoomScreen> {
  late final ChatController chat;
  StreamSubscription? events;
  final text = TextEditingController();
  final scroll = ScrollController();
  int count = 0;
  late final AppLifecycleListener lifecycle;
  String? liveError;
  @override
  void initState() {
    super.initState();
    chat = ChatController(
      api: ref.read(socialApiProvider),
      roomId: widget.roomId,
      vault: ref.read(challengeVaultProvider),
      owner: () => ref.read(apiSessionProvider).asData?.value?.authIdentity,
    )..addListener(update);
    unawaited(() async {
      await chat.restore();
      if (mounted && chat.pendingBody != null) text.text = chat.pendingBody!;
      await chat.refresh();
    }());
    connect();
    lifecycle = AppLifecycleListener(
      onResume: () {
        events?.cancel();
        connect();
        unawaited(chat.refresh());
      },
      onPause: () {
        events?.cancel();
        events = null;
      },
    );
  }

  void update() {
    if (!mounted) return;
    final follow =
        !scroll.hasClients ||
        scroll.position.maxScrollExtent - scroll.offset < 120;
    final changed = chat.messages.length != count;
    count = chat.messages.length;
    setState(() {});
    if (follow && changed) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && scroll.hasClients) {
          scroll.jumpTo(scroll.position.maxScrollExtent);
        }
      });
    }
  }

  void connect() {
    events = ref
        .read(chatEventsProvider)
        .watch(roomId: widget.roomId)
        .listen(
          (state) {
            if (mounted) {
              setState(
                () => liveError = state == ChatConnection.reconnecting
                    ? '연결을 복구하고 있어요. 메시지 입력은 보존돼요.'
                    : null,
              );
            }
            if (state == ChatConnection.connected) unawaited(chat.refresh());
          },
          onError: (Object e) {
            if (mounted) setState(() => liveError = apiErrorMessage(e));
          },
        );
  }

  @override
  void dispose() {
    lifecycle.dispose();
    events?.cancel();
    chat.dispose();
    scroll.dispose();
    text.dispose();
    super.dispose();
  }

  Future<void> send() async {
    // The explicit send button commits an IME composition. Keyboard composing
    // events themselves never submit a message.
    text.clearComposing();
    final sent = await chat.send(text.text);
    if (mounted && sent) text.clear();
  }

  @override
  Widget build(BuildContext context) {
    final own = ref.watch(apiSessionProvider).asData?.value?.profile?.id;
    return FlowScreen(
      title: '채팅',
      scrollController: scroll,
      backPath: '/api/chats',
      actions: IconButton(
        tooltip: '대화 새로고침',
        onPressed: () => chat.refresh(),
        icon: const Icon(Icons.refresh),
      ),
      footer: !chat.active
          ? const Text('매칭이 취소되어 새 메시지를 보낼 수 없어요.')
          : Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: text,
                    readOnly: chat.sending || chat.pendingBody != null,
                    maxLength: 2000,
                    minLines: 1,
                    maxLines: 4,
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(hintText: '메시지를 입력해 주세요'),
                  ),
                ),
                IconButton(
                  tooltip: chat.pendingBody == null ? '메시지 보내기' : '같은 메시지 재시도',
                  onPressed:
                      chat.loading || chat.sending || text.text.trim().isEmpty
                      ? null
                      : send,
                  icon: const DesignIcon('send'),
                ),
              ],
            ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (chat.room != null)
            SocialFriendCard(id: chat.room!['otherUserId']),
          if (chat.room?['pairId'] != null && chat.active)
            SocialPairActions(
              pairId: chat.room!['pairId'],
              onDone: () => chat.refresh(),
            ),
          if (liveError != null) Text(liveError!, style: AppText.caption),
          if (chat.error != null)
            socialError(context, chat.error!, () => chat.refresh()),
          if (chat.loading) const LinearProgressIndicator(),
          if (chat.hasMore)
            TextButton(
              onPressed: () => chat.refresh(older: true),
              child: const Text('이전 메시지 보기'),
            ),
          if (!chat.loading && chat.messages.isEmpty)
            const SoftCard(child: Text('아직 메시지가 없어요. 첫 인사를 건네보세요.')),
          for (final m in chat.messages)
            Align(
              alignment: m['senderId'] == own
                  ? Alignment.centerRight
                  : Alignment.centerLeft,
              child: Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 310),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: m['senderId'] == own
                        ? AppColors.peach
                        : AppColors.subtle,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(m['body'], style: AppText.body),
                      Text(_date(m['sentAt']), style: AppText.caption),
                      if (m['senderId'] == own &&
                          m['id'] <=
                              (chat.room?['otherLastReadMessageId'] ?? 0))
                        const Text('읽음', style: AppText.caption),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class ApiFriendScreen extends ConsumerWidget {
  const ApiFriendScreen({super.key, required this.id});
  final String id;
  @override
  Widget build(BuildContext context, WidgetRef ref) => FlowScreen(
    title: '친구 프로필',
    backPath: '/api/likes',
    child: ref
        .watch(socialFriendProvider(id))
        .when(
          loading: () => const LinearProgressIndicator(),
          error: (e, _) => socialError(
            context,
            apiErrorMessage(e),
            () => ref.invalidate(socialFriendProvider(id)),
          ),
          data: (f) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FlowHeading(
                f.profile?.nickname ?? '프로필을 확인할 수 없어요',
                description: regions[f.profile?.region] ?? '',
              ),
              const SizedBox(height: 16),
              Text(f.profile?.bio ?? '', style: AppText.body),
              for (final pet in f.pets)
                Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: SoftCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${pet.name} · ${breeds[pet.breed] ?? pet.breed} · ${pet.age}살',
                          style: AppText.title,
                        ),
                        Text(pet.description, style: AppText.body),
                        Wrap(
                          spacing: 8,
                          children: [
                            for (final t in pet.traits)
                              FlowPill(personalities[t] ?? t),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
  );
}

class SocialPairActions extends ConsumerStatefulWidget {
  const SocialPairActions({
    super.key,
    required this.pairId,
    required this.onDone,
  });
  final int pairId;
  final VoidCallback onDone;
  @override
  ConsumerState<SocialPairActions> createState() => _SocialPairActionsState();
}

class _SocialPairActionsState extends ConsumerState<SocialPairActions> {
  bool busy = false;
  Future<void> action(String op) async {
    if (busy) return;
    final who = ref.read(apiSessionProvider).asData?.value?.authIdentity;
    String? reason;
    if (op == 'reportPair') {
      reason = await showDialog<String>(
        context: context,
        builder: (_) => const SocialReportDialog(),
      );
      if (reason == null) return;
    } else {
      final yes = await showDialog<bool>(
        context: context,
        builder: (c) => AlertDialog(
          title: const Text('매칭을 취소할까요?'),
          content: const Text('대화 기록은 남지만 새 메시지를 보낼 수 없어요.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(c, false),
              child: const Text('유지'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(c, true),
              child: const Text('매칭 취소'),
            ),
          ],
        ),
      );
      if (yes != true) return;
    }
    if (!mounted ||
        ref.read(apiSessionProvider).asData?.value?.authIdentity != who) {
      return;
    }
    setState(() => busy = true);
    try {
      await ref.read(socialApiProvider).call(op, {
        'id': widget.pairId,
        'reason': ?reason,
      });
      if (mounted) {
        widget.onDone();
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('서버가 요청을 처리했어요.')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 8,
    children: [
      TextButton(
        onPressed: busy ? null : () => action('cancelPair'),
        child: const Text('매칭 취소'),
      ),
      TextButton(
        onPressed: busy ? null : () => action('reportPair'),
        child: const Text('신고'),
      ),
    ],
  );
}

class SocialReportDialog extends StatefulWidget {
  const SocialReportDialog({super.key});
  @override
  State<SocialReportDialog> createState() => _SocialReportDialogState();
}

class _SocialReportDialogState extends State<SocialReportDialog> {
  final reason = TextEditingController();
  @override
  void dispose() {
    reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('매칭 신고'),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text('서버 정책에 따라 신고 후 매칭이 취소돼요.'),
        TextField(
          controller: reason,
          maxLength: 1000,
          decoration: const InputDecoration(labelText: '신고 사유'),
          onChanged: (_) => setState(() {}),
        ),
      ],
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('취소'),
      ),
      TextButton(
        onPressed: reason.text.trim().isEmpty
            ? null
            : () => Navigator.pop(context, reason.text.trim()),
        child: const Text('신고'),
      ),
    ],
  );
}
