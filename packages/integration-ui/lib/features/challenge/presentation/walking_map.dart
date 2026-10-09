import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import 'challenge_common.dart';

class WalkingMap extends StatefulWidget {
  const WalkingMap({
    super.key,
    this.path = const [],
    this.selected = const [],
    this.excluded = const [],
    this.center,
    this.onCenter,
    this.height = 280,
  });
  final List<Json> path, selected, excluded;
  final LatLng? center;
  final ValueChanged<LatLng>? onCenter;
  final double height;
  @override
  State<WalkingMap> createState() => _WalkingMapState();
}

class _WalkingMapState extends State<WalkingMap> {
  final controller = MapController();
  static const tile = String.fromEnvironment('MAP_TILE_URL');
  bool tileFailed = false;
  int tileRetry = 0;
  void failedTile() {
    if (tileFailed) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !tileFailed) setState(() => tileFailed = true);
    });
  }

  static const attribution = String.fromEnvironment(
    'MAP_ATTRIBUTION',
    defaultValue: '© OpenStreetMap contributors',
  );
  List<LatLng> points(List<Json> p) => p
      .map(
        (v) => LatLng(
          (v['latitude'] as num).toDouble(),
          (v['longitude'] as num).toDouble(),
        ),
      )
      .toList();
  List<List<LatLng>> split(List<Json> values) {
    final groups = <List<LatLng>>[];
    Object? previous;
    DateTime? previousTime;
    for (final value in values) {
      final segment = value['segment'] ?? 0;
      final time = value['recordedAt'] == null
          ? null
          : DateTime.parse(value['recordedAt']);
      final gap =
          time != null &&
          previousTime != null &&
          time.difference(previousTime) > const Duration(seconds: 60);
      if (groups.isEmpty || segment != previous || gap) groups.add([]);
      groups.last.add(
        LatLng(
          (value['latitude'] as num).toDouble(),
          (value['longitude'] as num).toDouble(),
        ),
      );
      previous = segment;
      previousTime = time;
    }
    return groups;
  }

  @override
  void didUpdateWidget(covariant WalkingMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.path.isEmpty && widget.path.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          final point = widget.path.first;
          controller.move(
            LatLng(
              (point['latitude'] as num).toDouble(),
              (point['longitude'] as num).toDouble(),
            ),
            15,
          );
        }
      });
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final path = points(widget.path),
        selected = points(widget.selected),
        excluded = split(widget.excluded);
    final all = [...path, ...selected];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(
            height: widget.height,
            child: FlutterMap(
              mapController: controller,
              options: MapOptions(
                initialCenter:
                    widget.center ??
                    all.firstOrNull ??
                    const LatLng(37.5665, 126.9780),
                initialZoom: 15,
                minZoom: 0,
                maxZoom: 19,
                initialCameraFit: all.length < 2
                    ? null
                    : CameraFit.bounds(
                        bounds: LatLngBounds.fromPoints(all),
                        padding: const EdgeInsets.all(30),
                        // Stationary GPS samples can have zero-area bounds.
                        // Bound the fit before projection to avoid an infinite zoom.
                        maxZoom: 15,
                      ),
                onPositionChanged: (camera, gesture) {
                  if (gesture) widget.onCenter?.call(camera.center);
                },
              ),
              children: [
                if (tile.isNotEmpty)
                  TileLayer(
                    key: ValueKey(tileRetry),
                    urlTemplate: tile,
                    userAgentPackageName: 'app.gaegaeting',
                    errorTileCallback: (_, _, _) => failedTile(),
                    tileBuilder: (context, tileWidget, tile) => tileWidget,
                  ),
                PolylineLayer(
                  polylines: [
                    for (final section in excluded)
                      if (section.length > 1)
                        Polyline(
                          points: section,
                          color: AppColors.secondary,
                          strokeWidth: 3,
                          pattern: const StrokePattern.dotted(),
                        ),
                    if (selected.length > 1)
                      Polyline(
                        points: selected,
                        color: AppColors.secondary,
                        strokeWidth: 3,
                        pattern: StrokePattern.dashed(segments: [8, 6]),
                      ),
                    for (final section in split(widget.path))
                      if (section.length > 1)
                        Polyline(
                          points: section,
                          color: AppColors.primary,
                          strokeWidth: 4,
                        ),
                  ],
                ),
                if (all.isNotEmpty)
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: all.first,
                        width: 28,
                        height: 28,
                        child: const Icon(
                          Icons.location_on,
                          color: AppColors.primary,
                        ),
                      ),
                      Marker(
                        point: all.last,
                        width: 20,
                        height: 20,
                        child: const Icon(
                          Icons.circle,
                          color: AppColors.primary,
                          size: 14,
                        ),
                      ),
                    ],
                  ),
                Align(
                  alignment: Alignment.bottomRight,
                  child: Container(
                    color: Colors.white,
                    padding: const EdgeInsets.all(4),
                    child: Text(
                      attribution,
                      style: const TextStyle(fontSize: 10, color: Colors.black),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (tile.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text(
              '지도를 불러올 수 없어요. 연결을 확인하고 다시 시도해 주세요.',
              style: AppText.caption,
            ),
          ),
        if (tileFailed)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '지도를 불러오지 못했어요. 저장된 경로는 유지돼요.',
                  style: AppText.caption,
                ),
                TextButton(
                  onPressed: () => setState(() {
                    tileFailed = false;
                    tileRetry++;
                  }),
                  child: const Text('지도 다시 불러오기'),
                ),
              ],
            ),
          ),
        if (widget.onCenter != null)
          const Text('지도를 움직여 검색 중심을 선택해 주세요.', style: AppText.caption),
      ],
    );
  }
}
