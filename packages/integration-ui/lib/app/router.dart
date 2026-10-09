import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/onboarding/presentation/onboarding_screens.dart';
import '../features/discovery/presentation/discovery_screens.dart';
import '../features/flow/presentation/flow_gallery_screen.dart';
import '../features/settings/presentation/settings_screens.dart';
import '../core/config/app_config.dart';
import '../features/account/presentation/api_auth_screens.dart';
import '../features/account/presentation/api_account_screens.dart';
import '../features/account/application/api_session.dart';
import '../features/payment/presentation/snack_purchase_screen.dart';
import 'bottom_navigation.dart';
import '../features/social/presentation/social_screens.dart';
import '../features/account/presentation/profile_images_screen.dart';
import '../features/challenge/presentation/challenge_screens.dart';
import '../features/challenge/presentation/course_screens.dart';
import '../features/challenge/presentation/walk_screens.dart';
import '../features/challenge/presentation/diary_screens.dart';
import '../features/challenge/presentation/route_editor_screen.dart';
import '../features/challenge/presentation/record_screens.dart';
import '../features/interest/presentation/interest_screens.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier(0);
  if (ref.read(appConfigProvider).apiEnabled) {
    ref.listen(apiSessionProvider, (previous, next) => refresh.value++);
  }
  final router = GoRouter(
    refreshListenable: refresh,
    redirect: (context, state) {
      if (!ref.read(appConfigProvider).apiEnabled) return null;
      if (state.uri.path == '/') return '/api/login';
      final account = ref.read(apiSessionProvider).asData?.value;
      if (state.uri.path == '/api/login' && account != null) {
        final returnTo = state.uri.queryParameters['returnTo'];
        if (returnTo != null &&
            returnTo.startsWith('/api/') &&
            !returnTo.contains('://')) {
          return returnTo;
        }
        return account.destination;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/api/snacks',
        builder: (context, state) => ApiAccountGate(
          builder: (account) => const ApiSnackPurchaseScreen(),
        ),
      ),
      GoRoute(
        path: '/api/login',
        builder: (context, state) => const ApiLoginScreen(),
      ),
      GoRoute(
        path: '/api/signup',
        builder: (context, state) => const ApiSignupScreen(),
      ),
      GoRoute(
        path: '/api/profile',
        builder: (context, state) => ApiAccountGate(
          builder: (account) => ApiProfileScreen(
            key: ValueKey(account.authIdentity),
            account: account,
          ),
        ),
      ),
      GoRoute(
        path: '/api/pet',
        builder: (context, state) => ApiAccountGate(
          builder: (account) => ApiPetScreen(
            key: ValueKey(account.authIdentity),
            account: account,
          ),
        ),
      ),
      GoRoute(
        path: '/api/main',
        builder: (context, state) => ApiAccountGate(
          builder: (account) => ApiMainScreen(account: account),
        ),
      ),
      GoRoute(
        path: '/api/me',
        builder: (context, state) => ApiAccountGate(
          builder: (account) => ApiOwnProfileScreen(
            key: ValueKey(account.authIdentity),
            account: account,
          ),
        ),
      ),
      GoRoute(
        path: '/api/likes',
        builder: (context, state) => ApiAccountGate(
          builder: (account) => ApiInterestScreen(
            key: ValueKey(account.authIdentity),
            initialTab: state.uri.queryParameters['tab'] ?? 'received',
          ),
        ),
      ),
      GoRoute(
        path: '/api/chats',
        builder: (context, state) => ApiAccountGate(
          builder: (account) =>
              ApiChatListScreen(key: ValueKey(account.authIdentity)),
        ),
      ),
      GoRoute(
        path: '/api/chats/:id',
        builder: (context, state) => ApiAccountGate(
          builder: (account) => ApiChatRoomScreen(
            key: ValueKey(
              '${account.authIdentity}/${state.pathParameters['id']}',
            ),
            roomId: int.tryParse(state.pathParameters['id']!) ?? 0,
          ),
        ),
      ),
      GoRoute(
        path: '/api/friend/:id',
        builder: (context, state) => ApiAccountGate(
          builder: (_) => ApiFriendScreen(id: state.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/api/profile/images',
        builder: (context, state) => ApiAccountGate(
          builder: (account) =>
              ProfileImagesScreen(key: ValueKey(account.authIdentity)),
        ),
      ),
      GoRoute(
        path: '/api/pet/:id/images',
        builder: (context, state) => ApiAccountGate(
          builder: (account) =>
              !account.pets.any(
                (p) => p.id.toString() == state.pathParameters['id'],
              )
              ? const ApiMissingPetScreen()
              : ProfileImagesScreen(
                  key: ValueKey(
                    '${account.authIdentity}/${state.pathParameters['id']}',
                  ),
                  petId: int.tryParse(state.pathParameters['id']!) ?? 0,
                ),
        ),
      ),
      GoRoute(
        path: '/api/pet/:id',
        builder: (context, state) => ApiAccountGate(
          builder: (account) => ApiPetScreen(
            key: ValueKey(
              '${account.authIdentity}/${state.pathParameters['id']}',
            ),
            account: account,
            expectedPetId: int.tryParse(state.pathParameters['id']!) ?? 0,
            pet: account.pets
                .where((p) => p.id.toString() == state.pathParameters['id'])
                .firstOrNull,
          ),
        ),
      ),
      GoRoute(path: '/', builder: (context, state) => const SignupScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/signup/phone',
        builder: (context, state) => const PhoneSignupScreen(),
      ),
      GoRoute(
        path: '/signup/verify',
        builder: (context, state) => const PhoneVerificationScreen(),
      ),
      GoRoute(
        path: '/signup/agreements',
        builder: (context, state) => const AgreementsScreen(),
      ),
      GoRoute(
        path: '/login/phone',
        builder: (context, state) => const PhoneLoginScreen(),
      ),
      GoRoute(
        path: '/onboarding/profile',
        builder: (context, state) => const ProfileRegistrationScreen(),
      ),
      GoRoute(
        path: '/onboarding/pet',
        builder: (context, state) => const PetRegistrationScreen(),
      ),
      GoRoute(
        path: '/main',
        builder: (context, state) => const MainScreen(
          navigation: AppBottomNavigation(selected: '/main'),
        ),
      ),
      GoRoute(
        path: '/recommendations',
        builder: (context, state) => const NeighborhoodScreen(),
      ),
      GoRoute(
        path: '/recommendations/:id/unlock',
        builder: (context, state) =>
            UnlockConfirmationScreen(profileId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/recommendations/:id/profile',
        builder: (context, state) =>
            FriendProfileScreen(profileId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/snacks/insufficient',
        builder: (context, state) => InsufficientSnacksScreen(
          profileId: state.uri.queryParameters['profile'] ?? '1',
        ),
      ),
      GoRoute(
        path: '/snacks/purchase',
        builder: (context, state) => ref.read(appConfigProvider).apiEnabled
            ? ApiAccountGate(
                builder: (account) => const ApiSnackPurchaseScreen(),
              )
            : SnackPurchaseScreen(
                profileId: state.uri.queryParameters['profile'],
              ),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const OwnProfileScreen(
          navigation: AppBottomNavigation(selected: '/profile'),
        ),
      ),
      GoRoute(
        path: '/settings/notifications',
        builder: (context, state) => const NotificationSettingsScreen(),
      ),
      GoRoute(
        path: '/flows',
        builder: (context, state) => const FlowGalleryScreen(),
      ),
      GoRoute(
        path: '/likes',
        builder: (context, state) => InterestScreen(
          initialTab: state.uri.queryParameters['tab'] ?? 'received',
        ),
      ),
      GoRoute(
        path: '/interest/:id',
        builder: (context, state) =>
            ReceivedInterestProfileScreen(id: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/chats',
        builder: (context, state) => const ChatListScreen(),
      ),
      GoRoute(
        path: '/chats/:id',
        builder: (context, state) =>
            ChatRoomScreen(id: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const InterestNotificationsScreen(),
      ),
      for (final prefix in ['', '/api']) ...[
        GoRoute(
          path: '$prefix/challenge',
          builder: (context, state) => const ChallengeHomeScreen(),
        ),
        GoRoute(
          path: '$prefix/challenge/courses',
          builder: (context, state) => const CourseListScreen(),
        ),
        GoRoute(
          path: '$prefix/challenge/course/:id',
          builder: (context, state) =>
              CourseDetailScreen(id: state.pathParameters['id']!),
        ),
        GoRoute(
          path: '$prefix/challenge/own-course/:id',
          builder: (context, state) =>
              CourseDetailScreen(id: state.pathParameters['id']!, owned: true),
        ),
        GoRoute(
          path: '$prefix/challenge/catalogue/:kind',
          builder: (context, state) =>
              ChallengeDetailScreen(kind: state.pathParameters['kind']!),
        ),
        GoRoute(
          path: '$prefix/challenge/participation/:id',
          builder: (context, state) =>
              ChallengeDetailScreen(id: state.pathParameters['id']!),
        ),
        GoRoute(
          path: '$prefix/challenge/prepare',
          builder: (context, state) => const WalkPrepareScreen(),
        ),
        GoRoute(
          path: '$prefix/challenge/prepare/:id',
          builder: (context, state) =>
              WalkPrepareScreen(routeId: state.pathParameters['id']!),
        ),
        GoRoute(
          path: '$prefix/challenge/walk/:id',
          builder: (context, state) =>
              WalkScreen(id: state.pathParameters['id']!),
        ),
        GoRoute(
          path: '$prefix/challenge/diary/:id',
          builder: (context, state) => DiaryDetailScreen(
            id: state.pathParameters['id']!,
            returnTo: state.uri.queryParameters['returnTo'],
          ),
        ),
        GoRoute(
          path: '$prefix/challenge/diary-editor/:id',
          builder: (context, state) => DiaryEditorScreen(
            walkId: state.pathParameters['id']!,
            returnTo: state.uri.queryParameters['returnTo'],
          ),
        ),
        GoRoute(
          path: '$prefix/challenge/route-create/:id',
          builder: (context, state) => RouteEditorScreen(
            walkId: state.pathParameters['id']!,
            returnTo: state.uri.queryParameters['returnTo'],
          ),
        ),
        GoRoute(
          path: '$prefix/challenge/route-editor/:id',
          builder: (context, state) => RouteEditorScreen(
            routeId: state.pathParameters['id']!,
            returnTo: state.uri.queryParameters['returnTo'],
          ),
        ),
        GoRoute(
          path: '$prefix/challenge/records',
          builder: (context, state) => ChallengeRecordsScreen(
            apiMode: prefix.isNotEmpty,
            returnTo: state.uri.queryParameters['returnTo'],
          ),
        ),
        GoRoute(
          path: '$prefix/challenge/records/:kind',
          builder: (context, state) => ChallengeRecordListScreen(
            kind: state.pathParameters['kind']!,
            returnTo: state.uri.queryParameters['returnTo'],
          ),
        ),
      ],
    ],
    errorBuilder: (context, state) => Scaffold(
      appBar: AppBar(title: const Text('개개팅')),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('페이지를 찾을 수 없어요.'),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () => context.go('/'),
              child: const Text('처음으로 돌아가기'),
            ),
          ],
        ),
      ),
    ),
  );
  ref.onDispose(() {
    router.dispose();
    refresh.dispose();
  });
  return router;
});
