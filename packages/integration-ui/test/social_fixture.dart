import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:gaegaeting/core/config/app_config.dart';
import 'package:gaegaeting/features/account/application/location_sync.dart';
import 'package:gaegaeting/features/challenge/application/challenge_providers.dart';
import 'package:gaegaeting/features/payment/application/payment_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gaegaeting/core/network/gateway_api.dart';
import 'package:gaegaeting/features/account/application/api_session.dart';
import 'package:gaegaeting/features/account/application/profile_providers.dart';
import 'package:gaegaeting/features/account/data/account_repository.dart';
import 'package:gaegaeting/features/account/data/profile_repository.dart';
import 'package:gaegaeting/features/challenge/application/photo_controller.dart';
import 'package:gaegaeting/features/social/application/social_providers.dart';
import 'package:gaegaeting/features/social/data/social_repository.dart';
import 'package:gaegaeting/features/social/data/chat_events.dart';

import 'challenge_app_fixture.dart';

class MemorySocialApi implements SocialApi {
  final ownedProfile = <String, dynamic>{
    'id': 'profile-fixture',
    'nickname': '민지',
    'region': 'SEOUL',
    'bio': '',
    'profileImages': [],
  };
  final ownedPets = <SocialJson>[
    {
      'id': 1,
      'name': '하루',
      'age': 3,
      'breed': 'POODLE',
      'gender': 'MALE',
      'size': 'SMALL',
      'personalities': <String>[],
      'description': '',
      'profileImages': <String>[],
      'isCertificated': false,
    },
  ];
  final operations = <String>[], sentInputs = <SocialJson>[];
  final messages = <SocialJson>[
    {
      'id': 1,
      'roomId': 1,
      'senderId': 'friend',
      'body': '안녕하세요! 같이 산책해요.',
      'sentAt': '2026-10-06T00:00:00Z',
    },
  ];
  final received = <SocialJson>[
    {'id': 1, 'otherUserId': 'friend', 'likedAt': '2026-10-06T00:00:00Z'},
  ];
  final sent = <SocialJson>[
    {'id': 2, 'otherUserId': 'friend', 'likedAt': '2026-10-06T00:00:00Z'},
  ];
  final pairs = <SocialJson>[];
  final photos = <SocialJson>[];
  bool loseSend = false, failRead = false;
  int unread = 1, readId = 0;
  SocialJson get room => {
    'id': 1,
    'pairId': 10,
    'otherUserId': 'friend',
    'createdAt': '2026-10-06T00:00:00Z',
    'unread': unread,
    'lastReadMessageId': readId,
    'otherLastReadMessageId': 1,
    'lastMessage': messages.last,
  };
  @override
  Future<dynamic> call(String op, [SocialJson v = const {}]) async {
    operations.add(op);
    switch (op) {
      case 'myReceivedLikes':
        return received.skip(v['offset'] ?? 0).take(v['limit'] ?? 50).toList();
      case 'mySentLikes':
        return sent.skip(v['offset'] ?? 0).take(v['limit'] ?? 50).toList();
      case 'myPairs':
        return pairs.skip(v['offset'] ?? 0).take(v['limit'] ?? 50).toList();
      case 'acceptLike':
        if (pairs.isEmpty) {
          pairs.add({
            'id': 10,
            'otherUserId': 'friend',
            'createdAt': '2026-10-06T00:00:00Z',
          });
        }
        received.clear();
        return true;
      case 'declineLike':
        received.removeWhere((r) => r['id'] == v['id']);
        return true;
      case 'cancelPair':
      case 'reportPair':
        pairs.clear();
        return true;
      case 'syncChatRooms':
      case 'chatRooms':
        return pairs.isEmpty ? <SocialJson>[] : [room];
      case 'chatRoom':
        return room;
      case 'chatMessages':
        final c = v['cursor'] as Map? ?? {};
        final values = messages
            .where(
              (m) =>
                  (c['before'] == null || m['id'] < c['before']) &&
                  (c['after'] == null || m['id'] > c['after']),
            )
            .toList();
        final limit = (c['limit'] ?? 50) as int;
        return {
          'messages': c['after'] == null
              ? values
                    .skip((values.length - limit).clamp(0, values.length))
                    .toList()
              : values.take(limit).toList(),
          'hasMore': values.length > limit,
        };
      case 'sendChatMessage':
        if (pairs.isEmpty) throw const ApiFailure('매칭이 취소됐어요.');
        final input = SocialJson.from(v['input']);
        sentInputs.add(input);
        final existing = messages
            .where((m) => m['clientMessageId'] == input['clientMessageId'])
            .firstOrNull;
        if (existing != null) {
          if (existing['body'] != input['body']) {
            throw const ApiFailure('같은 UUID의 본문이 달라요.');
          }
          return existing;
        }
        final m = <String, dynamic>{
          'id': messages.last['id'] + 1,
          'roomId': 1,
          'senderId': 'profile-fixture',
          'body': input['body'],
          'clientMessageId': input['clientMessageId'],
          'sentAt': DateTime.now().toUtc().toIso8601String(),
        };
        messages.add(m);
        if (loseSend) {
          loseSend = false;
          throw const ApiFailure('전송 응답을 받지 못했어요.');
        }
        return m;
      case 'markChatRead':
        if (failRead) throw const ApiFailure('읽음 실패');
        readId = v['messageId'];
        unread = 0;
        return true;
      case 'myProfileImageUploads':
      case 'myPetImageUploads':
        return photos;
      case 'generatePresignedUrl':
      case 'generatePetPresignedUrl':
        photos.add({
          'imageNo': v['imageNo'],
          'status': 'UPLOADING',
          'kind': 'USER',
          'targetId': 'profile-fixture',
          'updatedAt': '2026-10-06T00:00:00Z',
        });
        return {'url': 'https://images.example.test/upload', 'expiresIn': 300};
      case 'completeProfileImage':
      case 'completePetImage':
        final photo = photos.firstWhere((p) => p['imageNo'] == v['imageNo']);
        photo['status'] = 'PENDING';
        return photo;
      case 'deleteProfileImage':
      case 'deletePetImage':
        photos.removeWhere((p) => p['imageNo'] == v['imageNo']);
        return true;
      case 'deletePet':
        ownedPets.removeWhere((p) => p['id'] == v['id']);
        return true;
      case 'updatePet':
        final pet = ownedPets.firstWhere((p) => p['id'] == v['id']);
        pet.addAll(SocialJson.from(v['input']));
        return pet;
      case 'certifyPet':
        final pet = ownedPets.firstWhere((p) => p['id'] == v['id']);
        pet['isCertificated'] = true;
        return pet;
      case 'updateProfile':
      case 'createProfile':
        ownedProfile.addAll(SocialJson.from(v['input']));
        return ownedProfile;
    }
    throw StateError('Unsupported fixture operation: $op');
  }

  @override
  Future<({ServerProfile? profile, List<ServerPet> pets})> friend(
    String id,
  ) async => (
    profile: const ServerProfile(
      id: 'friend',
      nickname: '지우',
      region: 'SEOUL',
      bio: '저녁 산책을 좋아해요.',
    ),
    pets: const [
      ServerPet(id: 2, name: '콩이', age: 2, breed: 'POODLE', gender: 'FEMALE'),
    ],
  );
}

class SocialGatewayAdapter implements HttpClientAdapter {
  SocialGatewayAdapter(this.api);
  final MemorySocialApi api;
  final headers = <Map<String, dynamic>>[];
  @override
  void close({bool force = false}) {}
  @override
  Future<ResponseBody> fetch(
    RequestOptions o,
    Stream<Uint8List>? body,
    Future<void>? cancel,
  ) async {
    headers.add(Map.from(o.headers));
    final b = o.data as Map;
    final q = b['query'] as String;
    final op = RegExp(r'(?:query|mutation) \w+(?:\([^)]*\))?\s*\{\s*(\w+)')
        .firstMatch(q)!
        .group(1)!;
    dynamic data;
    if (op == 'myProfile') {
      data = {'myProfile': api.ownedProfile, 'pets': api.ownedPets};
    } else if (op == 'profile') {
      final f = await api.friend('friend');
      data = {
        'profile': {
          'id': f.profile!.id,
          'nickname': f.profile!.nickname,
          'region': 'SEOUL',
          'bio': f.profile!.bio,
          'profileImages': [],
        },
        'petsByUserId': [
          {
            'id': 2,
            'name': '콩이',
            'age': 2,
            'breed': 'POODLE',
            'gender': 'FEMALE',
            'size': 'SMALL',
            'profileImages': [],
            'personalities': [],
            'description': '',
          },
        ],
      };
    } else {
      try {
        data = {op: await api.call(op, SocialJson.from(b['variables'] ?? {}))};
      } catch (_) {
        return ResponseBody.fromString(
          jsonEncode({
            'data': null,
            'errors': [
              {
                'message': '요청을 완료하지 못했어요.',
                'extensions': {'code': 'INTERNAL_SERVER_ERROR'},
              },
            ],
          }),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      }
    }
    return ResponseBody.fromString(
      jsonEncode({'data': data}),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}

class QuietEvents implements ChatEvents {
  @override
  Stream<ChatConnection> watch({int? roomId}) => const Stream.empty();
}

class MemoryPhotoTransport implements PhotoTransport {
  int calls = 0;
  @override
  Future<void> put(String url, Uint8List png) async {
    calls++;
  }
}

class SocialAppFixture {
  final base = ChallengeAppFixture(),
      api = MemorySocialApi(),
      photoTransport = MemoryPhotoTransport();
  late final adapter = SocialGatewayAdapter(api);
  late final dio = Dio()..httpClientAdapter = adapter;
  late final account = AccountRepository(
    account: GatewayApi(dio, baseUrl: 'https://fixture.example.test/graphql'),
    gateway: GatewayApi(dio, baseUrl: 'https://fixture.example.test/graphql'),
    accessToken: () async => 'opaque-fixture-only',
  );
  late final container = ProviderContainer(
    overrides: [
      appConfigProvider.overrideWithValue(
        const AppConfig(
          gatewayGraphqlUrl: 'https://fixture.example.test/graphql',
          apiEnabled: true,
        ),
      ),
      apiSessionProvider.overrideWith(() => SocialTestSession(account)),
      accountRepositoryProvider.overrideWithValue(account),
      paymentControllerProvider.overrideWithValue(base.payment),
      challengeVaultProvider.overrideWithValue(base.vault),
      walkingGpsProvider.overrideWithValue(base.gps),
      currentPositionProvider.overrideWithValue(
        () async => throw const ApiFailure('fixture GPS disabled'),
      ),
      socialApiProvider.overrideWith(
        (ref) => SocialRepository(
          account: account,
          owner: () => ref.read(apiSessionProvider).asData?.value?.authIdentity,
        ),
      ),
      chatEventsProvider.overrideWithValue(QuietEvents()),
      profileRepositoryProvider.overrideWith(
        (ref) => ProfileRepository(
          account: account,
          owner: () => ref.read(apiSessionProvider).asData?.value?.authIdentity,
          transport: photoTransport,
          imageOrigin: 'https://images.example.test',
        ),
      ),
    ],
  );
  Future<void> dispose() async {
    container.dispose();
    dio.close();
    await base.dispose();
  }
}

class SocialTestSession extends ApiSession {
  SocialTestSession(this.account);
  final AccountRepository account;
  @override
  Future<AccountSnapshot?> build() async => load();
  @override
  Future<AccountSnapshot> reload() async {
    final next = await load();
    state = AsyncData(next);
    return next;
  }

  Future<AccountSnapshot> load() async {
    final loaded = await account.loadAccount();
    final next = AccountSnapshot(
      authIdentity: 'https://issuer.example.test|fixture-subject',
      profile: loaded.profile,
      pets: loaded.pets,
    );
    return next;
  }
}
