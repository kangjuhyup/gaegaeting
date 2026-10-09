import 'package:dio/dio.dart';

import '../../../core/network/gateway_api.dart';
import '../../../core/network/graphql_models.dart';

class ApiFailure implements Exception {
  const ApiFailure(this.message, {this.requiresLogin = false});
  final String message;
  final bool requiresLogin;
}

String apiErrorMessage(Object error) =>
    error is ApiFailure ? error.message : '요청을 완료하지 못했어요. 연결을 확인하고 다시 시도해 주세요.';

class ServerProfile {
  const ServerProfile({
    required this.id,
    required this.nickname,
    required this.region,
    this.bio = '',
    this.images = const [],
  });
  factory ServerProfile.fromJson(Map<String, dynamic> value) => ServerProfile(
    id: value['id'] as String,
    nickname: value['nickname'] as String,
    region: value['region'] as String,
    bio: value['bio'] as String? ?? '',
    images: List<String>.from(value['profileImages'] as List? ?? const []),
  );
  final String id, nickname, region, bio;
  final List<String> images;
}

class ServerPet {
  const ServerPet({
    required this.id,
    required this.name,
    required this.age,
    required this.breed,
    required this.gender,
    this.images = const [],
    this.traits = const [],
    this.description = '',
    this.size = 'SMALL',
    this.certified = false,
  });
  factory ServerPet.fromJson(Map<String, dynamic> value) => ServerPet(
    id: value['id'] as int,
    name: value['name'] as String,
    age: value['age'] as int,
    size: value['size'] as String? ?? 'SMALL',
    certified: value['isCertificated'] == true,
    breed: value['breed'] as String,
    gender: value['gender'] as String,
    images: List<String>.from(value['profileImages'] as List? ?? const []),
    traits: List<String>.from(value['personalities'] as List? ?? const []),
    description: value['description'] as String? ?? '',
  );
  final int id, age;
  final String name, breed, gender, description, size;
  final bool certified;
  final List<String> images, traits;
}

class AccountSnapshot {
  const AccountSnapshot({
    this.profile,
    this.pets = const [],
    this.authIdentity,
  });
  final String? authIdentity;
  final ServerProfile? profile;
  final List<ServerPet> pets;
  String get destination => profile == null
      ? '/api/profile'
      : pets.isEmpty
      ? '/api/pet'
      : '/api/main';
}

class Recommendation {
  const Recommendation({
    required this.itemId,
    required this.targetId,
    required this.state,
    this.profile,
    this.pets = const [],
  });
  final String itemId, targetId, state;
  final ServerProfile? profile;
  final List<ServerPet> pets;
}

const profileFields = 'id nickname region bio profileImages';
const petFields =
    'id name age breed gender size isCertificated profileImages personalities description';
const regions = {
  'SEOUL': '서울',
  'GYEONGGI': '경기',
  'INCHEON': '인천',
  'GANGWON': '강원',
  'CHUNGCHEONG': '충청',
  'JEOLLA': '전라',
  'GYEONGSANG': '경상',
  'JEJU': '제주',
};
const breeds = {
  'MALTESE': '말티즈',
  'POODLE': '푸들',
  'CHIHUAHUA': '치와와',
  'POMERANIAN': '포메라니안',
  'SHIH_TZU': '시츄',
  'YORKSHIRE': '요크셔 테리어',
  'BEAGLE': '비글',
  'GOLDEN_RETRIEVER': '골든 리트리버',
  'LABRADOR': '래브라도',
  'HUSKY': '허스키',
  'SAMOYED': '사모예드',
  'WELSH_CORGI': '웰시 코기',
  'JINDO': '진돗개',
  'MIXED': '믹스',
  'OTHER': '기타',
};
const personalities = {
  'FRIENDLY': '친화적',
  'SHY': '낯가림',
  'ACTIVE': '활발함',
  'CALM': '차분함',
  'PLAYFUL': '장난기',
  'PROTECTIVE': '보호적',
  'CURIOUS': '호기심',
  'INDEPENDENT': '독립적',
};

class AccountRepository {
  AccountRepository({
    required this.account,
    required this.gateway,
    required this.accessToken,
    this.owner,
  });
  final GatewayApi account, gateway;
  final Future<String?> Function() accessToken;
  final String? Function()? owner;

  Future<Map<String, dynamic>> execute(
    GatewayApi api,
    String query,
    Map<String, dynamic> variables, {
    bool authenticated = true,
    bool Function()? guard,
  }) async {
    final who = authenticated ? owner?.call() : null;
    void check() {
      if (authenticated && owner != null && owner!() != who) {
        throw const ApiFailure("계정이 변경됐어요.", requiresLogin: true);
      }
      if (guard != null && !guard()) {
        throw const ApiFailure('계정이 변경됐어요.', requiresLogin: true);
      }
    }

    check();
    final token = authenticated ? await accessToken() : null;
    check();
    if (authenticated && token == null) {
      throw const ApiFailure('로그인 후 이용해 주세요.', requiresLogin: true);
    }
    try {
      final result = await api.execute(
        GraphqlRequest(query: query, variables: variables),
        token == null ? null : 'Bearer $token',
      );
      check();
      if (result.errors?.isNotEmpty == true) {
        final code = result.errors!.first.extensions?['code'];
        if (code == 'UNAUTHENTICATED' ||
            result.errors!.first.extensions?['originalError']?['statusCode'] ==
                401) {
          throw const ApiFailure(
            '로그인이 만료됐어요. 다시 로그인해 주세요.',
            requiresLogin: true,
          );
        }
        if (code == 'GRAPHQL_VALIDATION_FAILED') {
          throw const ApiFailure('서버에 이 기능의 API가 아직 활성화되지 않았어요.');
        }
        if (code == 'FORBIDDEN') throw const ApiFailure('이 기능을 사용할 권한이 없어요.');
        // Display business errors, never server stack traces or transport details.
        final message = result.errors!.first.message;
        throw ApiFailure(
          RegExp(r'[가-힣]').hasMatch(message)
              ? message
              : '서버가 요청을 처리하지 못했어요. 입력한 정보를 확인해 주세요.',
        );
      }
      if (result.data == null) {
        throw const ApiFailure('서버 응답을 확인할 수 없어요. 다시 시도해 주세요.');
      }
      return result.data!;
    } on DioException catch (error) {
      final response = error.response?.data;
      if (response is Map &&
          (response['errors'] as List?)?.any(
                (e) =>
                    e is Map &&
                    e['extensions']?['code'] == 'GRAPHQL_VALIDATION_FAILED',
              ) ==
              true) {
        throw const ApiFailure('서버에 이 기능의 API가 아직 활성화되지 않았어요.');
      }
      if (error.response?.statusCode == 401) {
        throw const ApiFailure('로그인이 만료됐어요. 다시 로그인해 주세요.', requiresLogin: true);
      }
      if (error.response?.statusCode == 403) {
        throw const ApiFailure('이 기능을 사용할 권한이 없어요.');
      }
      throw const ApiFailure('API에 연결할 수 없어요. 연결을 확인하고 다시 시도해 주세요.');
    }
  }

  Future<void> register(Map<String, dynamic> input) async {
    final data = await execute(
      account,
      r'mutation Register($input: RegisterAccountInput!) { registerAccount(input: $input) { authSubject } }',
      {'input': input},
      authenticated: false,
    );
    if (data['registerAccount'] == null) {
      throw const ApiFailure('가입을 완료하지 못했어요. 다시 시도해 주세요.');
    }
  }

  Future<AccountSnapshot> loadAccount() async {
    final data = await execute(
      gateway,
      'query Account { myProfile { $profileFields } pets { $petFields } }',
      {},
    );
    return AccountSnapshot(
      profile: data['myProfile'] == null
          ? null
          : ServerProfile.fromJson(data['myProfile'] as Map<String, dynamic>),
      pets: (data['pets'] as List)
          .map((value) => ServerPet.fromJson(value as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<void> saveProfile(Map<String, dynamic> input, {String? id}) async {
    await execute(
      gateway,
      id == null
          ? r'mutation Save($input: CreateUserProfileInput!) { createProfile(input: $input) { id } }'
          : r'mutation Save($id: String!, $input: UpdateUserProfileInput!) { updateProfile(id: $id, input: $input) { id } }',
      {'input': input, 'id': ?id},
    );
  }

  Future<void> createPet(Map<String, dynamic> input) async {
    await execute(
      gateway,
      r'mutation Save($input: CreatePetInput!) { createPet(input: $input) { id } }',
      {'input': input},
    );
  }

  Future<List<Recommendation>> recommendations() async {
    final data = await execute(
      gateway,
      'query Feed { getDailyFeed { items { id targetUserId state } } }',
      {},
    );
    final items = (data['getDailyFeed'] as List)
        .expand((feed) => (feed as Map<String, dynamic>)['items'] as List)
        .cast<Map<String, dynamic>>();
    final result = <Recommendation>[];
    for (final item in items) {
      final detail = await execute(
        gateway,
        'query Friend(\$id: String!) { profile(id: \$id) { $profileFields } petsByUserId(userId: \$id) { $petFields } }',
        {'id': item['targetUserId']},
      );
      // A location candidate can outlive its account profile.
      if (detail['profile'] == null) continue;
      result.add(
        Recommendation(
          itemId: item['id'] as String,
          targetId: item['targetUserId'] as String,
          state: item['state'] as String,
          profile: detail['profile'] == null
              ? null
              : ServerProfile.fromJson(
                  detail['profile'] as Map<String, dynamic>,
                ),
          pets: (detail['petsByUserId'] as List)
              .map((v) => ServerPet.fromJson(v as Map<String, dynamic>))
              .toList(),
        ),
      );
    }
    return result;
  }

  Future<void> saveCurrentLocation(double latitude, double longitude) async {
    final location = await execute(
      gateway,
      r'mutation Location($input: SetLocationInput!) { setCurrentLocation(input: $input) }',
      {
        'input': {'latitude': latitude, 'longitude': longitude},
      },
    );
    if (location['setCurrentLocation'] != true) {
      throw const ApiFailure('현재 위치를 저장하지 못했어요.');
    }
  }

  Future<void> createRecommendations() async {
    final result = await execute(
      gateway,
      'mutation Generate { createDailyFeed }',
      {},
    );
    if (result['createDailyFeed'] != true) {
      throw const ApiFailure('오늘의 추천을 만들지 못했어요.');
    }
  }

  Future<void> like(String id) async {
    final numericId = int.tryParse(id);
    if (numericId == null) {
      throw const ApiFailure('추천 정보를 확인할 수 없어요. 목록을 다시 불러와 주세요.');
    }
    final result = await execute(
      gateway,
      r'mutation Like($input: ActionFeedInput!) { actionFeed(input: $input) }',
      {
        'input': {'id': numericId, 'state': 'LIKE'},
      },
    );
    if (result['actionFeed'] != true) {
      throw const ApiFailure('관심 상태를 저장하지 못했어요. 다시 시도해 주세요.');
    }
  }
}
