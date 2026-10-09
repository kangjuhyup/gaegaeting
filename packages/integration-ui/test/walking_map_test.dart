import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gaegaeting/features/challenge/presentation/walking_map.dart';

void main() {
  for (final delta in [0.0, 0.000000001]) {
    testWidgets(
      'stationary or tiny GPS track keeps a finite, usable map ($delta)',
      (tester) async {
        var tapped = false;
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Column(
                children: [
                  WalkingMap(
                    path: [
                      for (var i = 0; i < 22; i++)
                        {
                          'latitude': 37.5665 + i * delta,
                          'longitude': 126.978,
                          'segment': 0,
                        },
                    ],
                  ),
                  TextButton(
                    onPressed: () => tapped = true,
                    child: const Text('Resume'),
                  ),
                ],
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        final map = tester.widget<FlutterMap>(find.byType(FlutterMap));
        final camera = map.mapController!.camera;
        expect(camera.zoom.isFinite, isTrue);
        expect(camera.zoom, lessThanOrEqualTo(15));
        expect(camera.center.latitude.isFinite, isTrue);
        expect(camera.center.longitude.isFinite, isTrue);
        await tester.tap(find.text('Resume'));
        await tester.pump();
        expect(tapped, isTrue);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
      },
    );
  }
}
