import 'package:flutter_riverpod/flutter_riverpod.dart';

class FlowState {
  const FlowState({
    this.phone = '',
    this.nickname = '산책하는 민지',
    this.region = '서울 마포구',
    this.introduction = '하루와 함께 저녁 산책을 좋아해요.',
    this.petName = '하루',
    this.breed = '골든 리트리버',
    this.age = '3살',
    this.sex = '수컷',
    this.marketing = false,
    this.chatNotifications = true,
    this.interestNotifications = true,
    this.mutualNotifications = true,
    this.sentInterests = const {},
    this.receivedInterests = const {},
    this.messages = const {},
    this.profileSaved = false,
    this.petSaved = false,
    this.snacks = 2,
    this.opened = const {},
  });
  final String phone, nickname, region, introduction, petName, breed, age, sex;
  final bool marketing,
      chatNotifications,
      interestNotifications,
      mutualNotifications,
      profileSaved,
      petSaved;
  final Set<String> sentInterests, receivedInterests;
  final Map<String, List<String>> messages;
  Set<String> get mutualInterests =>
      sentInterests.intersection(receivedInterests);
  final int snacks;
  final Set<String> opened;
  FlowState copyWith({
    String? phone,
    String? nickname,
    String? region,
    String? introduction,
    String? petName,
    String? breed,
    String? age,
    String? sex,
    bool? marketing,
    bool? chatNotifications,
    bool? interestNotifications,
    bool? mutualNotifications,
    Set<String>? sentInterests,
    Set<String>? receivedInterests,
    Map<String, List<String>>? messages,
    bool? profileSaved,
    bool? petSaved,
    int? snacks,
    Set<String>? opened,
  }) => FlowState(
    phone: phone ?? this.phone,
    nickname: nickname ?? this.nickname,
    region: region ?? this.region,
    introduction: introduction ?? this.introduction,
    petName: petName ?? this.petName,
    breed: breed ?? this.breed,
    age: age ?? this.age,
    sex: sex ?? this.sex,
    marketing: marketing ?? this.marketing,
    chatNotifications: chatNotifications ?? this.chatNotifications,
    interestNotifications: interestNotifications ?? this.interestNotifications,
    mutualNotifications: mutualNotifications ?? this.mutualNotifications,
    sentInterests: sentInterests ?? this.sentInterests,
    receivedInterests: receivedInterests ?? this.receivedInterests,
    messages: messages ?? this.messages,
    profileSaved: profileSaved ?? this.profileSaved,
    petSaved: petSaved ?? this.petSaved,
    snacks: snacks ?? this.snacks,
    opened: opened ?? this.opened,
  );
}

final flowProvider = NotifierProvider<FlowController, FlowState>(
  FlowController.new,
);

/// Session-only UI preview data. Authentication and purchases never call APIs.
class FlowController extends Notifier<FlowState> {
  @override
  FlowState build() => const FlowState();
  void setPhone(String phone) => state = state.copyWith(phone: phone);
  void setMarketing(bool value) => state = state.copyWith(marketing: value);
  void saveNotifications({
    required bool marketing,
    required bool chat,
    bool? interest,
    bool? mutual,
  }) => state = state.copyWith(
    marketing: marketing,
    chatNotifications: chat,
    interestNotifications: interest,
    mutualNotifications: mutual,
  );
  void previewClearInterests() => state = state.copyWith(
    sentInterests: const {},
    receivedInterests: const {},
    messages: const {},
  );
  void sendInterest(String id) => state = state.copyWith(
    sentInterests: Set.unmodifiable({...state.sentInterests, id}),
  );

  /// Explicit gallery fixture only; never simulates a server reply automatically.
  void previewReceivedInterest(String id) => state = state.copyWith(
    receivedInterests: Set.unmodifiable({...state.receivedInterests, id}),
  );
  bool sendPreviewMessage(String id, String text) {
    final value = text.trim();
    if (!state.mutualInterests.contains(id) || value.isEmpty) return false;
    state = state.copyWith(
      messages: Map<String, List<String>>.unmodifiable({
        ...state.messages,
        id: List<String>.unmodifiable([...?state.messages[id], value]),
      }),
    );
    return true;
  }

  void saveProfile({
    required String nickname,
    required String region,
    required String introduction,
  }) => state = state.copyWith(
    nickname: nickname,
    region: region,
    introduction: introduction,
    profileSaved: true,
  );
  void savePet({
    required String name,
    required String breed,
    required String age,
    required String sex,
  }) => state = state.copyWith(
    petName: name,
    breed: breed,
    age: age,
    sex: sex,
    petSaved: true,
  );
  bool unlock(String id) {
    if (state.opened.contains(id)) return true;
    if (state.snacks < 2) return false;
    state = state.copyWith(
      snacks: state.snacks - 2,
      opened: Set.unmodifiable({...state.opened, id}),
    );
    return true;
  }

  void previewTopUp(int count) =>
      state = state.copyWith(snacks: state.snacks + count);
  void previewEmptyWallet() => state = state.copyWith(snacks: 0);
  void reset() => state = const FlowState();
}
