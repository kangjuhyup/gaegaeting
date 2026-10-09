import 'dart:convert';
import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

Future<void> main() async {
  await integrationDriver(
    writeResponseOnFailure: true,
    responseDataCallback: (data) async {
      final file = File('build/dev-api/device-read-results.json');
      await file.parent.create(recursive: true);
      // IntegrationTest adds screenshot byte arrays to reportData. Store images
      // separately and keep this result limited to the probe's safe fields.
      final report = <String, dynamic>{
        for (final key in [
          'checkedAt',
          'mode',
          'fixtures',
          'mutationsExecuted',
          'storeSdkExecuted',
          'nativeSessionAvailable',
          'nativeIdentityVerified',
          'sessionRestore',
          'readResults',
          'writeFlows',
          'fullApiE2E',
          'authenticatedReads',
        ])
          if (data?.containsKey(key) == true) key: data![key],
      };
      await file.writeAsString(
        '${const JsonEncoder.withIndent('  ').convert(report)}\n',
      );
    },
    onScreenshot: (name, bytes, [args]) async {
      final file = File('build/dev-api/$name.png');
      await file.parent.create(recursive: true);
      await file.writeAsBytes(bytes);
      return true;
    },
  );
}
