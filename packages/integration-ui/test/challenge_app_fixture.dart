import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gaegaeting/core/config/app_config.dart';
import 'package:gaegaeting/core/network/gateway_api.dart';
import 'package:gaegaeting/features/account/application/api_session.dart';
import 'package:gaegaeting/features/account/application/location_sync.dart';
import 'package:gaegaeting/features/account/data/account_repository.dart';
import 'package:gaegaeting/features/payment/application/payment_controller.dart';
import 'package:gaegaeting/features/payment/application/payment_providers.dart';
import 'package:gaegaeting/features/challenge/application/challenge_providers.dart';
import 'package:gaegaeting/features/challenge/data/challenge_repository.dart';

import 'challenge_fixtures.dart';

import 'package:gaegaeting/features/challenge/domain/challenge_models.dart';

import 'payment_fixtures.dart';

class ChallengeTestSession extends ApiSession {
  @override
  Future<AccountSnapshot?> build() async => const AccountSnapshot(
    authIdentity: 'https://issuer.example.test|fixture-subject',
    profile: ServerProfile(
      id: 'profile-fixture',
      nickname: '민지',
      region: 'SEOUL',
    ),
    pets: [
      ServerPet(id: 1, name: '하루', age: 3, breed: 'POODLE', gender: 'MALE'),
    ],
  );
  @override
  Future<AccountSnapshot> reload() async => state.asData!.value!;
}

class FixtureGatewayAdapter implements HttpClientAdapter {
  FixtureGatewayAdapter(this.api);
  final MemoryChallengeApi api;
  @override
  void close({bool force = false}) {}
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final body = options.data as Map;
    final name = RegExp(r'(?:query|mutation) (\w+)Operation')
        .firstMatch(body['query'])!
        .group(1)!;
    try {
      final value = await api.call(
        name,
        Map<String, dynamic>.from(body['variables']),
      );
      return ResponseBody.fromString(
        jsonEncode({
          'data': {name: value},
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );
    } on Object catch (e) {
      final failure = e is ChallengeFailure
          ? e
          : const ChallengeFailure('fixture failure');
      return ResponseBody.fromString(
        jsonEncode({
          'data': null,
          'errors': [
            {
              'message': 'fixture business error',
              'extensions': {
                'originalError': {
                  'statusCode': failure.status == 0 ? 503 : failure.status,
                },
              },
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
}

// This harness exercises the app's real Retrofit + Dio pipeline against a local
// in-process contract fixture. It never authorizes itself against a live server.
class ChallengeAppFixture {
  final api = MemoryChallengeApi(),
      vault = MemoryVault(),
      gps = FakeGps(),
      billing = TestBilling();
  late final payment = PaymentController(
    api: TestPaymentApi(),
    billing: billing,
    journal: TestJournal(),
    ownerId: () => 'profile-fixture',
    storeEnabled: false,
  );
  late final dio = Dio()..httpClientAdapter = FixtureGatewayAdapter(api);
  late final container = ProviderContainer(
    overrides: [
      appConfigProvider.overrideWithValue(
        const AppConfig(
          gatewayGraphqlUrl: 'https://fixture.example.test/graphql',
          apiEnabled: true,
        ),
      ),
      apiSessionProvider.overrideWith(ChallengeTestSession.new),
      paymentControllerProvider.overrideWithValue(payment),
      currentPositionProvider.overrideWithValue(
        () async =>
            throw const ApiFailure('fixture location synchronization disabled'),
      ),
      challengeVaultProvider.overrideWithValue(vault),
      walkingGpsProvider.overrideWithValue(gps),
      challengeApiProvider.overrideWith(
        (ref) => ChallengeRepository(
          gateway: GatewayApi(
            dio,
            baseUrl: 'https://fixture.example.test/graphql',
          ),
          accessToken: () async => 'opaque-fixture-only',
          owner: () => ref.read(apiSessionProvider).asData?.value?.authIdentity,
        ),
      ),
    ],
  );
  Future<void> dispose() async {
    container.dispose();
    payment.dispose();
    dio.close();
    await gps.controller.close();
    await billing.events.close();
  }
}
