import '../../account/data/account_repository.dart';

typedef SocialJson = Map<String, dynamic>;
const messageFields = 'id roomId senderId body clientMessageId sentAt';
const roomFields =
    'id pairId otherUserId createdAt unread lastReadMessageId otherLastReadMessageId lastMessage { $messageFields }';
const socialOperations = <String, String>{
  'myReceivedLikes': 'query Received(\$limit: Int!, \$offset: Int!) { myReceivedLikes(limit: \$limit, offset: \$offset) { id otherUserId likedAt } }',
  'mySentLikes': 'query Sent(\$limit: Int!, \$offset: Int!) { mySentLikes(limit: \$limit, offset: \$offset) { id otherUserId likedAt } }',
  'myPairs': 'query Pairs(\$limit: Int!, \$offset: Int!) { myPairs(limit: \$limit, offset: \$offset) { id otherUserId createdAt } }',
  'acceptLike': r'mutation Accept($id: Int!) { acceptLike(id: $id) }',
  'declineLike': r'mutation Decline($id: Int!) { declineLike(id: $id) }',
  'cancelPair': r'mutation Cancel($id: Int!) { cancelPair(id: $id) }',
  'reportPair': r'mutation Report($id: Int!, $reason: String!) { reportPair(id: $id, reason: $reason) }',
  'chatRooms': 'query Rooms { chatRooms { $roomFields } }',
  'syncChatRooms': 'mutation Sync { syncChatRooms { $roomFields } }',
  'chatRoom':
      'query Room(\$roomId: Int!) { chatRoom(roomId: \$roomId) { $roomFields } }',
  'chatMessages':
      'query Messages(\$roomId: Int!, \$cursor: ChatMessageCursorInput) { chatMessages(roomId: \$roomId, cursor: \$cursor) { messages { $messageFields } hasMore } }',
  'sendChatMessage':
      'mutation Send(\$input: SendChatMessageInput!) { sendChatMessage(input: \$input) { $messageFields } }',
  'markChatRead': r'mutation Read($roomId: Int!, $messageId: Int!) { markChatRead(roomId: $roomId, messageId: $messageId) }',
};

abstract class SocialApi {
  Future<dynamic> call(String operation, [SocialJson variables = const {}]);
  Future<({ServerProfile? profile, List<ServerPet> pets})> friend(String id);
}

class SocialRepository implements SocialApi {
  SocialRepository({required this.account, required this.owner});
  final AccountRepository account;
  final String? Function() owner;
  @override
  Future<dynamic> call(
    String operation, [
    SocialJson variables = const {},
  ]) async {
    final who = owner();
    if (who == null) {
      throw const ApiFailure('로그인 후 이용해 주세요.', requiresLogin: true);
    }
    final query = socialOperations[operation];
    if (query == null) throw const ApiFailure('지원하지 않는 요청이에요.');
    final result = await account.execute(
      account.gateway,
      query,
      ['myReceivedLikes', 'mySentLikes', 'myPairs'].contains(operation)
          ? {'limit': 50, 'offset': 0, ...variables}
          : variables,
      guard: () => owner() == who,
    );
    if (owner() != who) {
      throw const ApiFailure('계정이 변경됐어요.', requiresLogin: true);
    }
    final value = result[operation];
    if (value == null || value == false) {
      throw const ApiFailure('요청을 완료하지 못했어요. 다시 확인해 주세요.');
    }
    return value;
  }

  @override
  Future<({ServerProfile? profile, List<ServerPet> pets})> friend(
    String id,
  ) async {
    final who = owner();
    if (who == null) {
      throw const ApiFailure('로그인 후 이용해 주세요.', requiresLogin: true);
    }
    final d = await account.execute(
      account.gateway,
      'query SocialFriend(\$id: String!) { profile(id: \$id) { $profileFields } petsByUserId(userId: \$id) { $petFields } }',
      {'id': id},
      guard: () => owner() == who,
    );
    if (owner() != who) {
      throw const ApiFailure('계정이 변경됐어요.', requiresLogin: true);
    }
    return (
      profile: d['profile'] == null
          ? null
          : ServerProfile.fromJson(SocialJson.from(d['profile'])),
      pets: (d['petsByUserId'] as List)
          .map((e) => ServerPet.fromJson(SocialJson.from(e)))
          .toList(),
    );
  }
}
