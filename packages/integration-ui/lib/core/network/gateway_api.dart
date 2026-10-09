import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

import 'graphql_models.dart';

part 'gateway_api.g.dart';

@RestApi()
abstract class GatewayApi {
  factory GatewayApi(Dio dio, {String? baseUrl}) = _GatewayApi;

  // The configured base URL is the complete Gateway GraphQL endpoint.
  @POST('')
  Future<GraphqlResponse> execute(
    @Body() GraphqlRequest request,
    @Header('Authorization') String? authorization,
  );
}
