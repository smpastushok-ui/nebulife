export interface Point2D { x: number; y: number }

interface Triangle {
  a: number; // index into working array (0..n-1 are real, n..n+2 are super-triangle)
  b: number;
  c: number;
}

/** Squared distance between two points */
function dist2(p: Point2D, q: Point2D): number {
  const dx = p.x - q.x;
  const dy = p.y - q.y;
  return dx * dx + dy * dy;
}

/**
 * Check whether point p lies strictly inside the circumcircle of triangle (a, b, c).
 * Uses the standard determinant test.
 */
function inCircumcircle(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
  px: number, py: number,
): boolean {
  const ax_ = ax - px;
  const ay_ = ay - py;
  const bx_ = bx - px;
  const by_ = by - py;
  const cx_ = cx - px;
  const cy_ = cy - py;

  const det =
    ax_ * (by_ * (cx_ * cx_ + cy_ * cy_) - cy_ * (bx_ * bx_ + by_ * by_)) -
    ay_ * (bx_ * (cx_ * cx_ + cy_ * cy_) - cx_ * (bx_ * bx_ + by_ * by_)) +
    (ax_ * ax_ + ay_ * ay_) * (bx_ * cy_ - cx_ * by_);

  return det > 0;
}

/**
 * Compute Delaunay triangulation and return unique edges.
 * Uses Bowyer-Watson incremental algorithm.
 *
 * @param points Array of 2D points
 * @returns Array of [indexA, indexB] pairs (indices into input array)
 */
export function delaunayEdges(points: Point2D[]): [number, number][] {
  const n = points.length;
  if (n < 2) return [];
  if (n === 2) return [[0, 1]];

  // Build working point list: real points + 3 super-triangle vertices
  const pts: Point2D[] = [...points];

  // Bounding box
  let minX = pts[0].x, maxX = pts[0].x;
  let minY = pts[0].y, maxY = pts[0].y;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const dx = maxX - minX;
  const dy = maxY - minY;
  const dmax = Math.max(dx, dy) || 1;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  // Super-triangle vertices (indices n, n+1, n+2)
  pts.push({ x: midX - 20 * dmax, y: midY - dmax });
  pts.push({ x: midX,              y: midY + 20 * dmax });
  pts.push({ x: midX + 20 * dmax, y: midY - dmax });

  let triangles: Triangle[] = [{ a: n, b: n + 1, c: n + 2 }];

  // Insert each real point one at a time
  for (let i = 0; i < n; i++) {
    const px = pts[i].x;
    const py = pts[i].y;

    // Find all triangles whose circumcircle contains point i
    const bad: Triangle[] = [];
    const good: Triangle[] = [];
    for (const tri of triangles) {
      if (
        inCircumcircle(
          pts[tri.a].x, pts[tri.a].y,
          pts[tri.b].x, pts[tri.b].y,
          pts[tri.c].x, pts[tri.c].y,
          px, py,
        )
      ) {
        bad.push(tri);
      } else {
        good.push(tri);
      }
    }

    // Find boundary edges of the hole (edges shared by exactly 1 bad triangle)
    // An edge [u,v] is a boundary edge if it appears exactly once across all bad triangles
    const edgeCount = new Map<string, [number, number]>();
    for (const tri of bad) {
      const edges: [number, number][] = [
        [tri.a, tri.b],
        [tri.b, tri.c],
        [tri.c, tri.a],
      ];
      for (const [u, v] of edges) {
        const key = u < v ? `${u},${v}` : `${v},${u}`;
        edgeCount.set(key, [u, v]);
      }
    }

    // Count occurrences
    const rawEdgeCounts = new Map<string, number>();
    for (const tri of bad) {
      const edges: [number, number][] = [
        [tri.a, tri.b],
        [tri.b, tri.c],
        [tri.c, tri.a],
      ];
      for (const [u, v] of edges) {
        const key = u < v ? `${u},${v}` : `${v},${u}`;
        rawEdgeCounts.set(key, (rawEdgeCounts.get(key) ?? 0) + 1);
      }
    }

    // Boundary = edges that appear exactly once
    const boundary: [number, number][] = [];
    for (const [key, count] of rawEdgeCounts) {
      if (count === 1) {
        const edge = edgeCount.get(key)!;
        boundary.push(edge);
      }
    }

    // Create new triangles from boundary edges to point i
    triangles = good;
    for (const [u, v] of boundary) {
      triangles.push({ a: u, b: v, c: i });
    }
  }

  // Remove triangles that reference super-triangle vertices (index >= n)
  const finalTriangles = triangles.filter(
    (tri) => tri.a < n && tri.b < n && tri.c < n,
  );

  // Extract unique edges
  const seen = new Set<string>();
  const result: [number, number][] = [];

  for (const tri of finalTriangles) {
    const edges: [number, number][] = [
      [tri.a, tri.b],
      [tri.b, tri.c],
      [tri.c, tri.a],
    ];
    for (const [u, v] of edges) {
      const key = u < v ? `${u},${v}` : `${v},${u}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(u < v ? [u, v] : [v, u]);
      }
    }
  }

  return result;
}
