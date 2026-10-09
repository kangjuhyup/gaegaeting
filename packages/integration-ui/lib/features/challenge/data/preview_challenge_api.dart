import '../domain/challenge_models.dart';
import 'challenge_repository.dart';

// Explicit design preview. No location, upload, purchase or server mutation occurs.
class PreviewChallengeApi implements ChallengeApi {
  @override
  Future<Object?> call(String name, [Json variables = const {}]) async {
    if (name == 'challenges') {
      return [
        {
          'kind': 'NEIGHBORHOOD_EXPLORER',
          'title': '동네 탐험가',
          'description': '다른 보호자가 공유한 코스 3개 완주',
          'durationDays': 14,
          'targetCount': 3,
        },
        {
          'kind': 'WALK_DIARY',
          'title': '산책 일기',
          'description': '사진과 기분을 담은 일기 3일',
          'durationDays': 7,
          'targetCount': 3,
        },
      ];
    }
    if (operations[name]!.mutation) {
      throw const ChallengeFailure('미리보기에서는 서버 기록을 변경하지 않아요.', status: 400);
    }
    if (['myCurrentWalk', 'myWalkDiary'].contains(name)) return null;
    if ([
      'walkingRoute',
      'myWalk',
      'myWalkingDiary',
      'myChallenge',
      'myWalkingRoute',
    ].contains(name)) {
      throw const ChallengeFailure('실제 기록은 API 모드에서 확인해 주세요.', status: 404);
    }
    return [];
  }
}
