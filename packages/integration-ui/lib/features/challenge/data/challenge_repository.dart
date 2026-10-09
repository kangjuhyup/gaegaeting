import 'package:dio/dio.dart';

import '../../../core/network/gateway_api.dart';
import '../../../core/network/graphql_models.dart';
import '../domain/challenge_models.dart';

const photoFields = 'id status url expiresIn';
const reviewFields =
    'id authorName content mood walkDate photos { $photoFields }';
const diaryFields =
    '$reviewFields walkId routeId visibility revision savedAt updatedAt';
const coordinateFields = 'latitude longitude';
const walkSummaryFields =
    'id requestId state pets { id name } route { id title path { $coordinateFields } } segments { startedAt endedAt } startedAt endedAt finishedAt distanceMeters coverage completed revision policyVersion';
const walkFields =
    '$walkSummaryFields points { $coordinateFields recordedAt accuracyMeters segment }';
const routeFields =
    'id title description startPlace endPlace authorName petNames path { $coordinateFields } tags distanceMeters durationSeconds isLoop nearbyMeters isMine bookmarked walkerCount';
const myRouteFields = '$routeFields sourceWalkId status reviewReason revision';
const definitionFields =
    'kind title description durationDays targetCount rewardCode policyVersion';
const participationFields =
    'id kind title targetCount progressCount status joinedAt endsAt settlesAt cancelledAt earnedRewardCode policyVersion';

class Operation {
  const Operation(this.args, this.selection, {this.mutation = false});
  final Map<String, String> args;
  final String selection;
  final bool mutation;
  String query(String name) {
    final vars = args.entries.map((e) => '\$${e.key}: ${e.value}').join(', ');
    final inputs = args.keys.map((k) => '$k: \$$k').join(', ');
    return '${mutation ? 'mutation' : 'query'} ${name}Operation${args.isEmpty ? '' : '($vars)'} { $name${args.isEmpty ? '' : '($inputs)'}${selection.isEmpty ? '' : ' { $selection }'} }';
  }
}

// User operations only. Admin moderation roots intentionally have no adapter.
const operations = <String, Operation>{
  'challenges': Operation({}, definitionFields),
  'myChallenges': Operation({'limit': 'Int!'}, participationFields),
  'myChallenge': Operation({'id': 'ID!'}, participationFields),
  'walkingRoutes': Operation({
    'input': 'WalkingRouteSearchInput!',
  }, routeFields),
  'walkingRoute': Operation({'id': 'ID!'}, routeFields),
  'myWalkingRoute': Operation({'id': 'ID!'}, myRouteFields),
  'myWalkingRoutes': Operation({
    'limit': 'Int!',
    'offset': 'Int!',
  }, myRouteFields),
  'myBookmarkedWalkingRoutes': Operation({
    'limit': 'Int!',
    'offset': 'Int!',
  }, routeFields),
  'myWalkingPassport': Operation({}, 'routeId title completedCount'),
  'myWalk': Operation({'id': 'ID!'}, walkFields),
  'myCurrentWalk': Operation({}, walkFields),
  'myWalks': Operation({'limit': 'Int!', 'offset': 'Int!'}, walkSummaryFields),
  'myWalkingDiary': Operation({'id': 'ID!'}, diaryFields),
  'myWalkDiary': Operation({'walkId': 'ID!'}, diaryFields),
  'myWalkingDiaries': Operation({
    'limit': 'Int!',
    'offset': 'Int!',
  }, diaryFields),
  'walkingRouteReviews': Operation({
    'routeId': 'ID!',
    'limit': 'Int!',
    'offset': 'Int!',
  }, reviewFields),
  'myWalkingPhotos': Operation({'walkId': 'ID!'}, photoFields),
  'startWalk': Operation(
    {'input': 'StartWalkInput!'},
    walkFields,
    mutation: true,
  ),
  'appendWalkPoints': Operation(
    {'input': 'AppendWalkPointsInput!'},
    walkFields,
    mutation: true,
  ),
  'setWalkPaused': Operation(
    {'id': 'ID!', 'paused': 'Boolean!'},
    walkFields,
    mutation: true,
  ),
  'finishWalk': Operation(
    {'id': 'ID!', 'endedAt': 'DateTime!'},
    walkFields,
    mutation: true,
  ),
  'deleteWalk': Operation({'id': 'ID!'}, '', mutation: true),
  'saveWalkingDiary': Operation(
    {'input': 'SaveWalkingDiaryInput!'},
    diaryFields,
    mutation: true,
  ),
  'deleteWalkingDiary': Operation({'id': 'ID!'}, '', mutation: true),
  'beginWalkingPhotoUpload': Operation(
    {'walkId': 'ID!'},
    'id uploadUrl expiresIn maxBytes maxDimension',
    mutation: true,
  ),
  'completeWalkingPhotoUpload': Operation(
    {'id': 'ID!'},
    photoFields,
    mutation: true,
  ),
  'deleteWalkingPhoto': Operation({'id': 'ID!'}, '', mutation: true),
  'createWalkingRoute': Operation(
    {'input': 'CreateWalkingRouteInput!'},
    myRouteFields,
    mutation: true,
  ),
  'updateWalkingRoute': Operation(
    {'id': 'ID!', 'revision': 'Int!', 'input': 'WalkingRouteDetailsInput!'},
    myRouteFields,
    mutation: true,
  ),
  'submitWalkingRoute': Operation({'id': 'ID!'}, myRouteFields, mutation: true),
  'withdrawWalkingRoute': Operation(
    {'id': 'ID!'},
    myRouteFields,
    mutation: true,
  ),
  'bookmarkWalkingRoute': Operation(
    {'id': 'ID!', 'saved': 'Boolean!'},
    '',
    mutation: true,
  ),
  'reportWalkingRoute': Operation(
    {'id': 'ID!', 'reason': 'String!', 'detail': 'String!'},
    '',
    mutation: true,
  ),
  'joinChallenge': Operation(
    {'input': 'JoinChallengeInput!'},
    participationFields,
    mutation: true,
  ),
  'cancelChallenge': Operation({'id': 'ID!'}, '', mutation: true),
};

abstract class ChallengeApi {
  Future<Object?> call(String name, [Json variables = const {}]);
}

class ChallengeRepository implements ChallengeApi {
  ChallengeRepository({
    required this.gateway,
    required this.accessToken,
    required this.owner,
  });
  final GatewayApi gateway;
  final Future<String?> Function() accessToken;
  final String? Function() owner;
  @override
  Future<Object?> call(String name, [Json variables = const {}]) async {
    final identity = owner();
    if (identity == null) {
      throw const ChallengeFailure(
        '로그인 후 이용해 주세요.',
        status: 401,
        requiresLogin: true,
      );
    }
    final token = await accessToken();
    if (token == null || owner() != identity) {
      throw const ChallengeFailure(
        '로그인을 다시 확인해 주세요.',
        status: 401,
        requiresLogin: true,
      );
    }
    try {
      final result = await gateway.execute(
        GraphqlRequest(
          query: operations[name]!.query(name),
          variables: variables,
        ),
        'Bearer $token',
      );
      if (owner() != identity) {
        throw const ChallengeFailure(
          '계정이 변경됐어요. 다시 로그인해 주세요.',
          status: 401,
          requiresLogin: true,
        );
      }
      if (result.errors?.isNotEmpty == true) {
        final e = result.errors!.first.extensions ?? {};
        final original = e['originalError'];
        final status =
            e['status'] ?? (original is Map ? original['statusCode'] : null);
        final code = e['code'];
        throw failure(
          code == 'UNAUTHENTICATED'
              ? 401
              : code == 'FORBIDDEN'
              ? 403
              : status is num
              ? status.toInt()
              : 400,
        );
      }
      if (result.data == null || !result.data!.containsKey(name)) {
        throw const ChallengeFailure('응답을 확인할 수 없어요. 다시 시도해 주세요.');
      }
      final value = result.data![name];
      if (operations[name]!.selection.isEmpty && value != true) {
        throw const ChallengeFailure('변경을 저장하지 못했어요.', status: 400);
      }
      return value;
    } on DioException catch (e) {
      throw failure(e.response?.statusCode ?? 0);
    }
  }

  static ChallengeFailure failure(int status) => ChallengeFailure(
    switch (status) {
      401 => '로그인이 만료됐어요. 입력은 보존했어요. 다시 로그인해 주세요.',
      403 => '산책 기능을 사용할 권한이 없어요. 계정 권한을 확인해 주세요.',
      404 => '이 기록을 찾을 수 없어요. 목록을 다시 확인해 주세요.',
      409 => '다른 곳에서 기록이 바뀌었어요. 최신 내용을 확인해 주세요.',
      400 => '입력이나 기록 조건을 확인해 주세요.',
      503 => '일시적으로 연결할 수 없어요. 잠시 후 다시 시도해 주세요.',
      _ => '연결을 확인하고 다시 시도해 주세요.',
    },
    status: status,
    requiresLogin: status == 401,
  );
}
