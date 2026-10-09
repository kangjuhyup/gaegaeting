import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import 'gateway_api.dart';

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 10),
      sendTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
      contentType: Headers.jsonContentType,
    ),
  );
  ref.onDispose(dio.close);
  return dio;
});

final gatewayApiProvider = Provider<GatewayApi>((ref) {
  return GatewayApi(
    ref.watch(dioProvider),
    baseUrl: ref.watch(appConfigProvider).gatewayGraphqlUrl,
  );
});

final accountApiProvider = Provider<GatewayApi>(
  (ref) => GatewayApi(
    ref.watch(dioProvider),
    baseUrl: ref.watch(appConfigProvider).accountGraphqlUrl,
  ),
);
