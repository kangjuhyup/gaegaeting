import 'package:flutter_riverpod/flutter_riverpod.dart';

class AppConfig {
  const AppConfig({
    required this.gatewayGraphqlUrl,
    this.accountGraphqlUrl = 'http://localhost:2800/account/graphql',
    this.apiEnabled = false,
    this.storePurchasesEnabled = false,
    this.oidcIssuer = 'http://localhost:3002/t/gaegaeting/oidc',
    this.oidcClientId = 'gaegaeting-mobile',
    this.oidcRedirectUri = 'app.gaegaeting:/oauth/callback',
    this.oidcLogoutUri = 'app.gaegaeting:/oauth/logout',
    this.imageStorageOrigin = '',
    this.apiAudience = 'https://api.gaegaeting.app',
  });

  const AppConfig.fromEnvironment()
    : gatewayGraphqlUrl = const String.fromEnvironment(
        'GATEWAY_GRAPHQL_URL',
        defaultValue: 'http://localhost:8080/gateway/graphql',
      ),
      accountGraphqlUrl = const String.fromEnvironment(
        'ACCOUNT_GRAPHQL_URL',
        defaultValue: 'http://localhost:2800/account/graphql',
      ),
      apiEnabled = const bool.fromEnvironment('API_ENABLED'),
      storePurchasesEnabled = const bool.fromEnvironment(
        'STORE_PURCHASES_ENABLED',
      ),
      oidcIssuer = const String.fromEnvironment(
        'OIDC_ISSUER',
        defaultValue: 'http://localhost:3002/t/gaegaeting/oidc',
      ),
      oidcClientId = const String.fromEnvironment(
        'OIDC_CLIENT_ID',
        defaultValue: 'gaegaeting-mobile',
      ),
      oidcRedirectUri = const String.fromEnvironment(
        'OIDC_REDIRECT_URI',
        defaultValue: 'app.gaegaeting:/oauth/callback',
      ),
      oidcLogoutUri = const String.fromEnvironment(
        'OIDC_LOGOUT_URI',
        defaultValue: 'app.gaegaeting:/oauth/logout',
      ),
      imageStorageOrigin = const String.fromEnvironment('IMAGE_STORAGE_ORIGIN'),
      apiAudience = const String.fromEnvironment(
        'API_AUDIENCE',
        defaultValue: 'https://api.gaegaeting.app',
      );

  final String gatewayGraphqlUrl, imageStorageOrigin;
  final String accountGraphqlUrl,
      oidcIssuer,
      oidcClientId,
      oidcRedirectUri,
      oidcLogoutUri,
      apiAudience;
  final bool apiEnabled, storePurchasesEnabled;
}

final appConfigProvider = Provider<AppConfig>(
  (ref) => const AppConfig.fromEnvironment(),
);
