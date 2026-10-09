import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/network_providers.dart';
import '../../../core/config/app_config.dart';
import '../data/preview_challenge_api.dart';
import '../../account/application/api_session.dart';
import '../data/challenge_repository.dart';
import '../data/challenge_vault.dart';
import 'photo_controller.dart';
import 'walk_controller.dart';

final challengeApiProvider = Provider<ChallengeApi>(
  (ref) => !ref.watch(appConfigProvider).apiEnabled
      ? PreviewChallengeApi()
      : ChallengeRepository(
          gateway: ref.watch(gatewayApiProvider),
          accessToken: ref.watch(authClientProvider).accessToken,
          owner: () => ref.read(apiSessionProvider).asData?.value == null
              ? null
              : ref.read(apiSessionProvider).asData?.value?.authIdentity ??
                    ref.read(apiSessionProvider).asData?.value?.profile?.id,
        ),
);
final challengeVaultProvider = Provider<ChallengeVault>(
  (ref) => const SecureChallengeVault(),
);
final walkingGpsProvider = Provider<WalkingGps>((ref) => DeviceWalkingGps());
final walkControllerProvider = Provider<WalkController>((ref) {
  final controller = WalkController(
    api: ref.watch(challengeApiProvider),
    vault: ref.watch(challengeVaultProvider),
    gps: ref.watch(walkingGpsProvider),
    owner: () =>
        ref.read(apiSessionProvider).asData?.value?.authIdentity ??
        ref.read(apiSessionProvider).asData?.value?.profile?.id,
  );
  ref.onDispose(controller.dispose);
  return controller;
});
final photoControllerProvider = Provider<PhotoUploadController>((ref) {
  final transport = PresignedPhotoTransport();
  ref.onDispose(transport.dispose);
  return PhotoUploadController(
    api: ref.watch(challengeApiProvider),
    vault: ref.watch(challengeVaultProvider),
    transport: transport,
    owner: () =>
        ref.read(apiSessionProvider).asData?.value?.authIdentity ??
        ref.read(apiSessionProvider).asData?.value?.profile?.id,
  );
});
