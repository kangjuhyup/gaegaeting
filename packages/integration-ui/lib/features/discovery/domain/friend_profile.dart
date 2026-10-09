class FriendProfile {
  const FriendProfile(this.id, this.name, this.petName);

  final String id;
  final String name;
  final String petName;
  String get region => '서울 마포구';
}

const recommendedFriends = [
  FriendProfile('1', '지훈과 코코', '코코'),
  FriendProfile('2', '수아와 루루', '루루'),
  FriendProfile('3', '민서와 보리', '보리'),
  FriendProfile('4', '준호와 모카', '모카'),
  FriendProfile('5', '유진과 콩이', '콩이'),
  FriendProfile('6', '도현과 두부', '두부'),
  FriendProfile('7', '서연과 밤이', '밤이'),
  FriendProfile('8', '태민과 로이', '로이'),
  FriendProfile('9', '지수와 쿠키', '쿠키'),
  FriendProfile('10', '현우와 초코', '초코'),
];

FriendProfile? findFriend(String id) {
  for (final friend in recommendedFriends) {
    if (friend.id == id) return friend;
  }
  return null;
}
