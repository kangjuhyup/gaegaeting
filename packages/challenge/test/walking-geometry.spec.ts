import {
  assessWalk,
  distance,
  publicPath,
  trackDistance,
  type Coordinate,
  type TrackPoint,
} from "../src/walk/domain/geometry.js";
const epoch = Date.parse("2026-10-05T00:00:00Z");
function track(path: Coordinate[], seconds = 10): TrackPoint[] {
  return path.map((point, index) => ({
    ...point,
    recordedAt: new Date(epoch + index * seconds * 1000).toISOString(),
    accuracyMeters: 5,
    segment: 0,
  }));
}
const line = Array.from({ length: 31 }, (_, i) => ({
  latitude: 37 + i * 0.0001,
  longitude: 127,
}));
const circle = Array.from({ length: 101 }, (_, i) => ({
  latitude: 37 + Math.sin((i / 100) * 2 * Math.PI) * 0.001,
  longitude: 127 + Math.cos((i / 100) * 2 * Math.PI) * 0.001,
}));

describe("GPS 산책 완주 정책", () => {
  it.each(
    [line, circle].map((path, i) => ({
      path,
      name: i ? "순환 코스" : "편도 코스",
    })),
  )("$name 를 순서대로 걸으면 완주한다", ({ path }) => {
    const result = assessWalk(track(path), path);
    expect(result.completed).toBe(true);
    expect(result.coverage).toBe(1);
  });
  it.each(
    [line, circle].map((path, i) => ({
      path,
      name: i ? "순환 코스" : "편도 코스",
    })),
  )("$name 를 거꾸로 돌면 완주하지 않는다", ({ path }) => {
    expect(assessWalk(track([...path].reverse()), path).completed).toBe(false);
  });
  it("앞부분을 여러 번 왕복해도 나머지 코스의 실적을 얻지 못한다", () => {
    const first = line.slice(0, 8);
    const repeated = Array.from({ length: 8 }, (_, i) =>
      i % 2 ? [...first].reverse() : first,
    ).flat();
    expect(assessWalk(track(repeated), line).completed).toBe(false);
  });
  it("위치 오차, GPS 단절, 과속과 일시정지 구간의 이동을 거리에서 제외한다", () => {
    expect(
      trackDistance(track(line).map((p) => ({ ...p, accuracyMeters: 100 }))),
    ).toBe(0);
    expect(trackDistance(track(line, 61))).toBe(0);
    expect(trackDistance(track(line, 0.1))).toBe(0);
    expect(
      trackDistance(track(line).map((p, segment) => ({ ...p, segment }))),
    ).toBe(0);
  });
  it("GPS 단절 전후의 직선 연결만으로 완주하지 않는다", () => {
    const points = track(line).map((p, i) => ({ ...p, segment: i }));
    expect(assessWalk(points, line).completed).toBe(false);
  });
  it("출발과 도착 위치를 각각 확인한다", () => {
    const points = track(line);
    const extra = { latitude: 37.01, longitude: 127 };
    expect(assessWalk(track([extra, ...line]), line).completed).toBe(false);
    expect(assessWalk(track([...line, extra]), line).completed).toBe(false);
    expect(assessWalk(points, null).completed).toBe(false);
  });
  it("밀집 좌표를 추가해도 일부 구간만 걸은 것을 완주로 인정하지 않는다", () => {
    const dense = [...Array.from({ length: 1000 }, () => line[0]), ...line];
    expect(assessWalk(track(line.slice(0, 8)), dense).completed).toBe(false);
  });
  it("공개 구간에는 선택한 좌표만 포함하고 수집 시간과 정확도를 제거한다", () => {
    const output = publicPath(track(line), 5, 20);
    expect(output).toEqual(line.slice(5, 21));
    expect(Object.keys(output[0])).toEqual(["latitude", "longitude"]);
    expect(() => publicPath(track(line), 0, 3)).toThrow();
    expect(() => publicPath(track(line, 61), 0, 30)).toThrow();
    expect(() => publicPath(track(line), -1, 30)).toThrow();
  });
  it("날짜 변경선을 가로지르는 좌표의 거리를 짧은 방향으로 계산한다", () => {
    expect(
      distance(
        { latitude: 0, longitude: 179.999 },
        { latitude: 0, longitude: -179.999 },
      ),
    ).toBeCloseTo(222.39, 1);
  });
  it("1초마다 수집한 작은 걸음을 누적하여 정상 산책을 완주로 인정한다", () => {
    const dense = Array.from({ length: 601 }, (_, i) => ({
      latitude: 37 + i * 0.000005,
      longitude: 127,
    }));
    expect(assessWalk(track(dense, 1), line).completed).toBe(true);
    expect(trackDistance(track(dense, 1))).toBeGreaterThan(330);
  });
  it("제자리에서 1m 안으로 흔들리는 GPS는 이동이나 공유 코스가 되지 않는다", () => {
    const jitter = Array.from({ length: 1000 }, (_, i) => ({
      latitude: 37 + (i % 2) * 0.000005,
      longitude: 127,
    }));
    expect(trackDistance(track(jitter, 1))).toBe(0);
    expect(() => publicPath(track(jitter, 1), 0, jitter.length - 1)).toThrow();
  });
});
