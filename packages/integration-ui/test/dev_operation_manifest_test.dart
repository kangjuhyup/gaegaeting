import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/core/network/gateway_api.dart';
import 'package:gaegaeting/features/account/data/account_repository.dart';
import 'package:gaegaeting/features/account/data/profile_repository.dart';
import 'package:gaegaeting/features/challenge/data/challenge_repository.dart';
import 'package:gaegaeting/features/payment/data/payment_repository.dart';
import 'package:gaegaeting/features/social/data/social_repository.dart';

class _NoNetwork implements HttpClientAdapter {
  int calls = 0;
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    calls++;
    throw StateError('Contract export must never reach a network adapter');
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  test('실제 앱 요청 문서를 수집할 때 외부 전송·상태 변경·인증값 저장을 하지 않는다', () async {
    final documents = <Map<String, String>>[
      for (final entry in operations.entries)
        {
          'domain': 'challenge',
          'name': entry.key,
          'query': entry.value.query(entry.key),
        },
      for (final entry in socialOperations.entries)
        {
          'domain': entry.key.contains('Like') || entry.key.contains('Pair')
              ? 'match'
              : 'chat',
          'name': entry.key,
          'query': entry.value,
        },
      for (final entry in profileOperations.entries)
        {'domain': 'account', 'name': entry.key, 'query': entry.value},
      {
        'domain': 'chat',
        'name': 'chatEvents',
        'query': r'subscription Changes($roomId: Int) { chatEvents(roomId: $roomId) { kind roomId messageId } }',
      },
      {
        'domain': 'account',
        'name': 'friend',
        'query':
            'query Friend(\$id: String!) { profile(id: \$id) { $profileFields } petsByUserId(userId: \$id) { $petFields } }',
      },
    ];
    final adapter = _NoNetwork();
    final dio = Dio()..httpClientAdapter = adapter;
    addTearDown(dio.close);
    String? query;
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (request, handler) {
          query = (request.data as Map)['query'] as String;
          handler.reject(
            DioException(
              requestOptions: request,
              type: DioExceptionType.cancel,
            ),
          );
        },
      ),
    );
    final gateway = GatewayApi(dio, baseUrl: 'https://offline.invalid/graphql');
    final account = AccountRepository(
      account: gateway,
      gateway: gateway,
      accessToken: () async => 'offline-manifest-only',
    );
    final payment = PaymentRepository(
      gateway: gateway,
      accessToken: () async => 'offline-manifest-only',
    );
    Future<void> capture(
      String domain,
      String name,
      Future<Object?> Function() operation,
    ) async {
      query = null;
      try {
        await operation();
      } catch (_) {
        // Deliberately rejected before any transport. Keep only static query.
      }
      expect(query, isNotNull, reason: 'Repository document missing: $name');
      documents.add({'domain': domain, 'name': name, 'query': query!});
    }

    await capture('account', 'account', account.loadAccount);
    await capture('account', 'registerAccount', () => account.register({}));
    await capture('account', 'createProfile', () => account.saveProfile({}));
    await capture(
      'account',
      'updateProfile',
      () => account.saveProfile({}, id: 'offline-only'),
    );
    await capture('account', 'createPet', () => account.createPet({}));
    await capture('match', 'getDailyFeed', account.recommendations);
    await capture(
      'match',
      'setCurrentLocation',
      () => account.saveCurrentLocation(0, 0),
    );
    await capture('match', 'createDailyFeed', account.createRecommendations);
    await capture('match', 'actionFeed', () => account.like('1'));
    await capture('payment', 'snackProducts', () => payment.offers('GOOGLE'));
    await capture('payment', 'mySnackWallet', payment.wallet);
    await capture('payment', 'mySnackTransactions', payment.transactions);
    await capture(
      'payment',
      'prepareSnackPurchase',
      () => payment.prepare('GOOGLE', 'offline-only'),
    );
    await capture(
      'payment',
      'confirmSnackPurchase',
      () => payment.confirm('offline-only', 'offline-only'),
    );
    expect(adapter.calls, 0);
    expect(documents, hasLength(75));
    final report = {
      'mode': 'offline-repository-contract-inventory',
      'httpCalls': adapter.calls,
      'userApiE2E': false,
      'documents': documents,
    };
    final file = File('build/dev-api/operation-documents.json');
    await file.parent.create(recursive: true);
    await file.writeAsString(
      '${const JsonEncoder.withIndent('  ').convert(report)}\n',
    );
  });
}
