import 'package:auth_platform_flutter/auth_platform_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/network_providers.dart';
import '../data/account_repository.dart';
import '../data/auth_identity_repository.dart';
import '../data/verified_appauth_driver.dart';

final verifiedIdentityStoreProvider = Provider<VerifiedIdentityStore>((ref) {
  final app = ref.watch(appConfigProvider);
  return SecureVerifiedIdentityStore('${app.oidcIssuer}|${app.oidcClientId}');
});

final authClientProvider = Provider<AuthClient>((ref) {
  final app = ref.watch(appConfigProvider);
  final config = AuthClientConfig(
    issuer: Uri.parse(app.oidcIssuer),
    clientId: app.oidcClientId,
    redirectUri: Uri.parse(app.oidcRedirectUri),
    postLogoutRedirectUri: Uri.parse(app.oidcLogoutUri),
    resource: Uri.parse(app.apiAudience),
    scopes: const [
      'openid',
      'profile',
      'email',
      'offline_access',
      'account:read',
      'account:write',
      'match:read',
      'match:write',
      'payment:read',
      'payment:write',
      'challenge:read',
      'challenge:write',
    ],
  );
  return AuthClient(
    config: config,
    authorizationGateway: AppAuthAuthorizationGateway(
      driver: VerifiedAppAuthDriver(
        validator: IdTokenValidator(
          dio: ref.watch(dioProvider),
          config: config,
          store: ref.watch(verifiedIdentityStoreProvider),
        ),
      ),
    ),
    sessionStore: VerifiedAuthSessionStore(
      SecureAuthSessionStore(storageKey: config.storageKey),
      ref.watch(verifiedIdentityStoreProvider),
    ),
    tokenRevoker: HttpTokenRevoker(),
  );
});

final authIdentityRepositoryProvider = Provider<AuthIdentityRepository>(
  (ref) => AuthIdentityRepository(
    session: ref.watch(authClientProvider).session,
    store: ref.watch(verifiedIdentityStoreProvider),
    issuer: ref.watch(appConfigProvider).oidcIssuer,
    clientId: ref.watch(appConfigProvider).oidcClientId,
  ),
);

final accountRepositoryProvider = Provider<AccountRepository>(
  (ref) => AccountRepository(
    account: ref.watch(accountApiProvider),
    gateway: ref.watch(gatewayApiProvider),
    accessToken: ref.watch(authClientProvider).accessToken,
    owner: () => ref.read(apiSessionProvider).asData?.value?.authIdentity,
  ),
);

final apiSessionProvider = AsyncNotifierProvider<ApiSession, AccountSnapshot?>(
  ApiSession.new,
);

final recommendationsProvider = FutureProvider<List<Recommendation>>((ref) {
  ref.watch(apiSessionProvider);
  return ref.watch(accountRepositoryProvider).recommendations();
});

class ApiSession extends AsyncNotifier<AccountSnapshot?> {
  int _generation = 0;
  bool _signingIn = false, _signingOut = false;
  @override
  Future<AccountSnapshot?> build() async {
    if (!ref.watch(appConfigProvider).apiEnabled) return null;
    if (await ref.watch(authClientProvider).accessToken() == null) return null;
    return _load();
  }

  Future<AccountSnapshot> signIn() async {
    if (_signingIn || _signingOut) {
      throw const ApiFailure('로그인 처리 중이에요. 잠시 기다려 주세요.');
    }
    _signingIn = true;
    final generation = ++_generation;
    state = const AsyncData(null);
    try {
      await ref.read(authClientProvider).signIn();
      if (generation != _generation) {
        throw const ApiFailure('로그인 계정이 변경됐어요.', requiresLogin: true);
      }
      return await reload();
    } finally {
      _signingIn = false;
    }
  }

  Future<AccountSnapshot> reload() async {
    final generation = _generation;
    final account = await _load();
    if (generation != _generation) {
      throw const ApiFailure('로그인 계정이 변경됐어요.', requiresLogin: true);
    }
    state = AsyncData(account);
    return account;
  }

  Future<AccountSnapshot> _load() async {
    if (_signingOut) {
      throw const ApiFailure('로그아웃 처리 중이에요.', requiresLogin: true);
    }
    final generation = _generation;
    final identity = await ref.read(authIdentityRepositoryProvider).identity();
    if (generation != _generation || _signingOut) {
      throw const ApiFailure('로그인 계정이 변경됐어요.', requiresLogin: true);
    }
    final account = await ref.read(accountRepositoryProvider).loadAccount();
    if (generation != _generation || _signingOut) {
      throw const ApiFailure('로그인 계정이 변경됐어요.', requiresLogin: true);
    }
    return AccountSnapshot(
      profile: account.profile,
      pets: account.pets,
      authIdentity: identity,
    );
  }

  Future<void> signOut() async {
    if (_signingOut) return;
    _signingOut = true;
    ref.read(verifiedIdentityStoreProvider).invalidate();
    _generation++;
    state = const AsyncData(null);
    try {
      await ref.read(authClientProvider).signOut();
    } finally {
      _signingOut = false;
      state = const AsyncData(null);
    }
  }
}
