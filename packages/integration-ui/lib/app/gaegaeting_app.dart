import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router.dart';
import '../core/design/app_theme.dart';
import '../core/config/app_config.dart';
import '../features/account/application/api_session.dart';
import '../features/account/application/location_sync.dart';
import '../features/payment/application/payment_providers.dart';
import '../features/challenge/application/challenge_providers.dart';

class GaegaetingApp extends ConsumerStatefulWidget {
  const GaegaetingApp({super.key});

  @override
  ConsumerState<GaegaetingApp> createState() => _GaegaetingAppState();
}

class _GaegaetingAppState extends ConsumerState<GaegaetingApp> {
  late final AppLifecycleListener _lifecycle;

  @override
  void initState() {
    super.initState();
    _lifecycle = AppLifecycleListener(
      onResume: () {
        if (ref.read(appConfigProvider).apiEnabled &&
            ref.read(apiSessionProvider).asData?.value != null) {
          unawaited(ref.read(locationSyncProvider.notifier).sync());
          unawaited(ref.read(paymentControllerProvider).synchronize());
          unawaited(
            ref.read(walkControllerProvider).flush().catchError((Object _) {}),
          );
        }
      },
    );
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (ref.watch(appConfigProvider).apiEnabled) {
      ref.watch(paymentControllerProvider);
      ref.listen(apiSessionProvider, (previous, next) {
        if (previous?.asData?.value == null && next.asData?.value != null) {
          unawaited(ref.read(locationSyncProvider.notifier).sync());
        } else if (previous?.asData?.value != null &&
            next.asData?.value == null) {
          ref.invalidate(locationSyncProvider);
        }
        final previousOwner =
            previous?.asData?.value?.authIdentity ??
            previous?.asData?.value?.profile?.id;
        final nextOwner =
            next.asData?.value?.authIdentity ?? next.asData?.value?.profile?.id;
        if (previousOwner != nextOwner) {
          ref.read(paymentControllerProvider).clearSessionView();
          ref.read(walkControllerProvider).detach();
          if (nextOwner != null) {
            unawaited(
              ref
                  .read(walkControllerProvider)
                  .recover()
                  .catchError((Object _) {}),
            );
          }
          if (nextOwner != null) {
            unawaited(ref.read(paymentControllerProvider).synchronize());
          }
        }
      });
    }
    return MaterialApp.router(
      title: '개개팅',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      locale: const Locale('ko'),
      supportedLocales: const [Locale('ko')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      routerConfig: ref.watch(routerProvider),
    );
  }
}
