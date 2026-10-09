import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/core/config/app_config.dart';
import 'package:gaegaeting/core/network/graphql_models.dart';
import 'package:gaegaeting/core/network/network_providers.dart';

void main() {
  test('Retrofit은 설정된 GraphQL 주소에 본문과 요청별 인증 헤더를 보낸다', () async {
    final container = ProviderContainer(
      overrides: [
        appConfigProvider.overrideWithValue(
          const AppConfig(
            gatewayGraphqlUrl: 'https://api.example.test/gateway/graphql',
          ),
        ),
      ],
    );
    addTearDown(container.dispose);
    final requests = <RequestOptions>[];
    container
        .read(dioProvider)
        .interceptors
        .add(
          InterceptorsWrapper(
            onRequest: (options, handler) {
              requests.add(options);
              handler.resolve(
                Response(
                  requestOptions: options,
                  statusCode: 200,
                  data: {
                    'data': {'pets': []},
                  },
                ),
              );
            },
          ),
        );

    const request = GraphqlRequest(
      query: r'query Pets($limit: Int!) { pets(limit: $limit) { id } }',
      variables: {'limit': 10},
      operationName: 'Pets',
    );
    final api = container.read(gatewayApiProvider);
    final response = await api.execute(request, 'Bearer first-session');
    await api.execute(request, 'Bearer second-session');

    expect(
      requests.first.uri.toString(),
      'https://api.example.test/gateway/graphql',
    );
    expect(requests.first.method, 'POST');
    expect(requests.first.contentType, Headers.jsonContentType);
    expect(requests.first.data, {
      'query': request.query,
      'variables': {'limit': 10},
      'operationName': 'Pets',
    });
    expect(requests.first.headers['Authorization'], 'Bearer first-session');
    expect(requests.last.headers['Authorization'], 'Bearer second-session');
    expect(
      container.read(dioProvider).options.headers,
      isNot(contains('Authorization')),
    );
    expect(response.data, {'pets': []});
  });

  test('HTTP 200에 포함된 GraphQL 오류와 부분 응답을 호출자에게 전달한다', () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    container
        .read(dioProvider)
        .interceptors
        .add(
          InterceptorsWrapper(
            onRequest: (options, handler) => handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {
                  'data': {'myProfile': null},
                  'errors': [
                    {
                      'message': '로그인이 필요합니다.',
                      'extensions': {'code': 'UNAUTHENTICATED'},
                    },
                  ],
                },
              ),
            ),
          ),
        );

    final response = await container
        .read(gatewayApiProvider)
        .execute(
          const GraphqlRequest(query: 'query { myProfile { id } }'),
          'Bearer expired-session',
        );

    expect(response.data, {'myProfile': null});
    expect(response.errors!.single.message, '로그인이 필요합니다.');
    expect(response.errors!.single.extensions!['code'], 'UNAUTHENTICATED');
  });
}
