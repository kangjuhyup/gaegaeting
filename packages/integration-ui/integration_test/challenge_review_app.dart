// Local review entry point only: reuses the production app and Retrofit adapter.
// This file is not imported by lib/main.dart or included in production builds.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gaegaeting/app/gaegaeting_app.dart';
import 'package:gaegaeting/app/router.dart';
import 'package:gaegaeting/features/account/application/api_session.dart';

import '../test/challenge_app_fixture.dart';
import '../test/challenge_fixtures.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final fixture = ChallengeAppFixture();
  fixture.api.routes.add({...sampleRoute});
  fixture.api.clock = DateTime.now().toUtc();
  await fixture.container.read(apiSessionProvider.future);
  fixture.container.read(routerProvider).go('/api/challenge');
  runApp(
    UncontrolledProviderScope(
      container: fixture.container,
      child: const Directionality(
        textDirection: TextDirection.ltr,
        child: Banner(
          message: '테스트 데이터',
          location: BannerLocation.topEnd,
          child: GaegaetingApp(),
        ),
      ),
    ),
  );
}
