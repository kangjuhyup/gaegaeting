import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../data/chat_events.dart';
import '../../account/data/account_repository.dart';
import '../../account/application/api_session.dart';
import '../data/social_repository.dart';

final socialApiProvider = Provider<SocialApi>((ref) {
  ref.watch(apiSessionProvider.select((s) => s.asData?.value?.authIdentity));
  return SocialRepository(
    account: ref.watch(accountRepositoryProvider),
    owner: () => ref.read(apiSessionProvider).asData?.value?.authIdentity,
  );
});
final socialFriendProvider = FutureProvider.autoDispose
    .family<({ServerProfile? profile, List<ServerPet> pets}), String>(
      (ref, id) async => ref.watch(socialApiProvider).friend(id),
      dependencies: [socialApiProvider],
    );

final chatEventsProvider = Provider<ChatEvents>(
  (ref) => GatewayChatEvents(
    url: ref.watch(appConfigProvider).gatewayGraphqlUrl,
    accessToken: ref.watch(authClientProvider).accessToken,
    owner: () => ref.read(apiSessionProvider).asData?.value?.authIdentity,
  ),
);
