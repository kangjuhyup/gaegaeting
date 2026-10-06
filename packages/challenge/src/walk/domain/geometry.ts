export interface Coordinate {
  latitude: number;
  longitude: number;
}
export interface TrackPoint extends Coordinate {
  recordedAt: string;
  accuracyMeters: number;
  segment: number;
}
export const WALK_POLICY_VERSION = 1;
export const MAX_TRACK_POINTS = 10_000;
export const MAX_WALK_MS = 24 * 60 * 60 * 1000;
const RAD = Math.PI / 180;
const EARTH = 6_371_000;
const longitudeDelta = (a: number, b: number) => ((b - a + 540) % 360) - 180;

export function validCoordinate(p: Coordinate): boolean {
  return (
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 85 &&
    Math.abs(p.longitude) <= 180
  );
}
export function distance(a: Coordinate, b: Coordinate): number {
  const lat = (b.latitude - a.latitude) * RAD;
  const lon = longitudeDelta(a.longitude, b.longitude) * RAD;
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a.latitude * RAD) *
      Math.cos(b.latitude * RAD) *
      Math.sin(lon / 2) ** 2;
  return 2 * EARTH * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}
export function validEdge(a: TrackPoint, b: TrackPoint): boolean {
  const seconds = (Date.parse(b.recordedAt) - Date.parse(a.recordedAt)) / 1000;
  return (
    a.segment === b.segment &&
    a.accuracyMeters <= 30 &&
    b.accuracyMeters <= 30 &&
    seconds > 0 &&
    seconds <= 60 &&
    distance(a, b) / seconds <= 12
  );
}
/** Accumulate small steps so frequent GPS sampling still records real movement. */
function travelEdges(
  points: readonly TrackPoint[],
): { a: TrackPoint; b: TrackPoint }[] {
  if (!points.length) return [];
  const edges: { a: TrackPoint; b: TrackPoint }[] = [];
  let anchor = points[0];
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1],
      current = points[i];
    if (!validEdge(previous, current)) {
      anchor = current;
      continue;
    }
    if (Date.parse(current.recordedAt) - Date.parse(anchor.recordedAt) > 60_000)
      anchor = previous;
    if (distance(anchor, current) >= 3) {
      edges.push({ a: anchor, b: current });
      anchor = current;
    }
  }
  return edges;
}
export function trackDistance(points: readonly TrackPoint[]): number {
  return travelEdges(points).reduce((sum, { a, b }) => sum + distance(a, b), 0);
}
export function pathDistance(points: readonly Coordinate[]): number {
  return points
    .slice(1)
    .reduce((total, point, index) => total + distance(points[index], point), 0);
}
export function publicPath(
  points: readonly TrackPoint[],
  from: number,
  to: number,
): Coordinate[] {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to >= points.length ||
    to <= from ||
    to - from > 3999
  ) {
    throw new Error("공개할 연속 구간을 2~4000개 좌표로 선택해 주세요.");
  }
  const selected = points.slice(from, to + 1);
  if (
    selected.some(
      (p, i) =>
        !validCoordinate(p) ||
        p.accuracyMeters > 30 ||
        (i > 0 && !validEdge(selected[i - 1], p)),
    )
  ) {
    throw new Error(
      "위치 기록이 끊기거나 정확도가 낮은 구간은 코스로 게시할 수 없습니다.",
    );
  }
  const length = pathDistance(selected);
  if (length < 100 || length > 50_000 || trackDistance(selected) < 100)
    throw new Error("코스는 100m~50km의 연속 산책 구간이어야 합니다.");
  return selected.map(({ latitude, longitude }) => ({ latitude, longitude }));
}

function projection(
  p: Coordinate,
  a: Coordinate,
  b: Coordinate,
): { gap: number; t: number } {
  const scale = Math.cos(a.latitude * RAD) * EARTH * RAD;
  const bx = longitudeDelta(a.longitude, b.longitude) * scale;
  const by = (b.latitude - a.latitude) * EARTH * RAD;
  const px = longitudeDelta(a.longitude, p.longitude) * scale;
  const py = (p.latitude - a.latitude) * EARTH * RAD;
  const square = bx * bx + by * by;
  const t = square ? Math.max(0, Math.min(1, (px * bx + py * by) / square)) : 0;
  return { gap: Math.hypot(px - t * bx, py - t * by), t };
}

/** Uniform samples prevent a dense cluster of source points from inflating coverage. */
function samples(path: readonly Coordinate[]): Coordinate[] {
  const result: Coordinate[] = [path[0]];
  let untilNext = 20;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i];
    const length = distance(a, b);
    let offset = untilNext;
    while (offset <= length) {
      const t = offset / length;
      result.push({
        latitude: a.latitude + (b.latitude - a.latitude) * t,
        longitude:
          ((a.longitude + longitudeDelta(a.longitude, b.longitude) * t + 540) %
            360) -
          180,
      });
      offset += 20;
    }
    untilNext = offset - length;
  }
  result.push(path[path.length - 1]);
  return result;
}

export function assessWalk(
  points: readonly TrackPoint[],
  path: readonly Coordinate[] | null,
) {
  const edges = travelEdges(points);
  const distanceMeters = Math.round(
    edges.reduce((sum, { a, b }) => sum + distance(a, b), 0),
  );
  if (!path || path.length < 2 || points.length < 2)
    return { distanceMeters, coverage: 0, completed: false };
  const targets = samples(path);
  let cursor = 0,
    previousT = 0,
    seen = 0;
  // Match route samples to the earliest remaining track position. Iterating the
  // route first prevents a loop's end (near its start) from skipping the loop.
  for (const target of targets) {
    for (let index = cursor; index < edges.length; index++) {
      const { a, b } = edges[index],
        match = projection(target, a, b);
      if (match.gap <= 30 && (index > cursor || match.t >= previousT)) {
        seen++;
        cursor = index;
        previousT = match.t;
        break;
      }
    }
  }
  const coverage = Math.min(1, seen / targets.length);
  const start = points[0],
    end = points[points.length - 1];
  const completed =
    start.accuracyMeters <= 30 &&
    end.accuracyMeters <= 30 &&
    distance(start, path[0]) <= 50 &&
    distance(end, path[path.length - 1]) <= 50 &&
    coverage >= 0.8 &&
    distanceMeters >= pathDistance(path) * 0.8;
  return { distanceMeters, coverage, completed };
}
