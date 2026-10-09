import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../challenge/application/photo_controller.dart';
import '../data/profile_repository.dart';
import 'api_session.dart';

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  ref.watch(apiSessionProvider.select((s) => s.asData?.value?.authIdentity));
  final transport = PresignedPhotoTransport();
  ref.onDispose(transport.dispose);
  return ProfileRepository(
    account: ref.watch(accountRepositoryProvider),
    owner: () => ref.read(apiSessionProvider).asData?.value?.authIdentity,
    transport: transport,
    imageOrigin: ref.watch(appConfigProvider).imageStorageOrigin,
  );
});
