import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/core/network/gateway_api.dart';
import 'package:gaegaeting/features/challenge/data/challenge_repository.dart';
import 'package:gaegaeting/features/challenge/domain/challenge_models.dart';
import 'package:gaegaeting/features/challenge/application/photo_controller.dart';

void main() {
  group('Gateway 계약과 인증', () {
    test('JWT가 아닌 opaque Bearer도 해석 없이 Retrofit 요청에 전달한다', () async {
      final dio = Dio();
      String? header;
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (o, h) {
            header = o.headers['Authorization'];
            h.resolve(
              Response(
                requestOptions: o,
                data: {
                  'data': {'challenges': []},
                },
              ),
            );
          },
        ),
      );
      final repo = ChallengeRepository(
        gateway: GatewayApi(
          dio,
          baseUrl: 'https://gateway.example.test/graphql',
        ),
        accessToken: () async => 'opaque-fixture',
        owner: () => 'a',
      );
      expect(await repo.call('challenges'), []);
      expect(header, 'Bearer opaque-fixture');
      dio.close();
    });
    for (final status in [400, 401, 403, 404, 409, 503]) {
      test('HTTP200 부분 데이터에 GraphQL 오류 $status가 있으면 성공으로 표시하지 않는다', () async {
        final dio = Dio();
        dio.interceptors.add(
          InterceptorsWrapper(
            onRequest: (o, h) => h.resolve(
              Response(
                requestOptions: o,
                data: {
                  'data': {'challenges': []},
                  'errors': [
                    {
                      'message': 'internal sensitive detail must be hidden',
                      'extensions': {
                        'originalError': {'statusCode': status},
                      },
                    },
                  ],
                },
              ),
            ),
          ),
        );
        final repo = ChallengeRepository(
          gateway: GatewayApi(
            dio,
            baseUrl: 'https://gateway.example.test/graphql',
          ),
          accessToken: () async => 'fixture',
          owner: () => 'a',
        );
        await expectLater(
          repo.call('challenges'),
          throwsA(
            isA<ChallengeFailure>()
                .having((e) => e.status, 'status', status)
                .having((e) => e.requiresLogin, 'login', status == 401)
                .having(
                  (e) => e.message.contains('sensitive'),
                  'privacy',
                  false,
                ),
          ),
        );
        dio.close();
      });
    }
    test('토큰 갱신 중 계정이 바뀌면 HTTP 요청을 보내지 않는다', () async {
      String? owner = 'a';
      final dio = Dio();
      int requests = 0;
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (o, h) {
            requests++;
            h.resolve(Response(requestOptions: o, data: {}));
          },
        ),
      );
      final repo = ChallengeRepository(
        gateway: GatewayApi(
          dio,
          baseUrl: 'https://gateway.example.test/graphql',
        ),
        accessToken: () async {
          owner = 'b';
          return 'fixture';
        },
        owner: () => owner,
      );
      await expectLater(
        repo.call('challenges'),
        throwsA(isA<ChallengeFailure>()),
      );
      expect(requests, 0);
      dio.close();
    });
    test('스토리지 PNG PUT에는 Bearer나 Gateway 인터셉터를 전달하지 않는다', () async {
      final dio = Dio();
      RequestOptions? options;
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (o, h) {
            options = o;
            h.resolve(Response(requestOptions: o, statusCode: 200));
          },
        ),
      );
      final transport = PresignedPhotoTransport(dio: dio);
      await transport.put(
        'https://storage.example.test/presigned',
        Uint8List.fromList([1, 2]),
      );
      expect(options!.headers.containsKey('Authorization'), false);
      expect(options!.headers['content-type'], 'image/png');
      expect(options!.headers['content-length'], 2);
      expect(options!.followRedirects, false);
      transport.dispose();
    });
    test(
      '사용자 operation은 최신 schema의 35개 root를 모두 지원하고 admin root를 노출하지 않는다',
      () {
        expect(operations.length, 35);
        expect(
          operations.keys,
          containsAll([
            'myCurrentWalk',
            'appendWalkPoints',
            'finishWalk',
            'beginWalkingPhotoUpload',
            'completeWalkingPhotoUpload',
            'saveWalkingDiary',
            'createWalkingRoute',
            'withdrawWalkingRoute',
            'joinChallenge',
          ]),
        );
        expect(operations.keys, isNot(contains('reviewWalkingRoute')));
        expect(operations['myChallenges']!.args, {'limit': 'Int!'});
        expect(operations['myWalkingPassport']!.args, isEmpty);
        expect(operations['myWalks']!.selection, isNot(contains('points {')));
      },
    );
    test('한국 날짜와 서버 진행률을 사용하고 챌린지 kind만 승인 문구에 매핑한다', () {
      expect(koreaDate('2026-10-05T15:00:00Z'), '2026. 10. 06.');
      expect(challengeTitle('NEIGHBORHOOD_EXPLORER'), '동네 탐험가');
      expect(challengeTitle('WALK_DIARY'), '산책 일기');
    });
  });
}
