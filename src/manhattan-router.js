import {Point, pointKey} from "../src/cartesian-math.js";

function manhattan(a, b) {
	return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function rangeOverlap(a1, a2, b1, b2) {
	const minA = Math.min(a1, a2);
	const maxA = Math.max(a1, a2);
	return maxA >= b1 && minA <= b2;
}

export function segmentBlocked(a, b, rects) {
	const ax = a[0], ay = a[1];
	const bx = b[0], by = b[1];

	for (const r of rects) {
		const rx = r.corner[0];
		const ry = r.corner[1];
		const rw = r.size[0];
		const rh = r.size[1];

		// horizontal segment
		if (ay === by) {
			if (
				ay >= ry && ay <= ry + rh &&
				rangeOverlap(ax, bx, rx, rx + rw)
			) return true;
		}

		// vertical segment
		if (ax === bx) {
			if (
				ax >= rx && ax <= rx + rw &&
				rangeOverlap(ay, by, ry, ry + rh)
			) return true;
		}
	}

	return false;
}

function compressPath(points) {
	if (points.length <= 2) return points;

	const out = [points[0]];

	for (let i = 1; i < points.length - 1; i++) {
		const a = out[out.length - 1];
		const b = points[i];
		const c = points[i + 1];

		const abx = b[0] - a[0];
		const aby = b[1] - a[1];
		const bcx = c[0] - b[0];
		const bcy = c[1] - b[1];

		// same direction → skip
		if (
			(abx === 0 && bcx === 0) ||
			(aby === 0 && bcy === 0)
		) continue;

		out.push(b);
	}

	out.push(points[points.length - 1]);
	return out;
}

export function findGridPath({
	from,
	to,
	avoidRects = [],
	gridSize
}) {
	const start = from;
	const goal = to;

	const open = new Map();
	const closed = new Set();

	open.set(pointKey(start), {
		point: start,
		g: 0,
		f: manhattan(start, goal),
		parent: null
	});

	const steps = [
		new Point([ gridSize, 0 ]),
		new Point([ -gridSize, 0 ]),
		new Point([ 0, gridSize ]),
		new Point([ 0, -gridSize ])
	];

	while (open.size) {
		// pick node with lowest f
		let current = null;
		for (const n of open.values()) {
			if (!current || n.f < current.f) current = n;
		}

		if (current.point.equals(goal)) {
			const path = [];
			let c = current;
			while (c) {
				path.push(c.point);
				c = c.parent;
			}
			return compressPath(path.reverse());
		}

		open.delete(pointKey(current.point));
		closed.add(pointKey(current.point));

		for (const step of steps) {
			const next = current.point.add(step);
			const key = pointKey(next);

			if (closed.has(key)) continue;
			if (segmentBlocked(current.point, next, avoidRects)) continue;

			const g = current.g + gridSize;
			const f = g + manhattan(next, goal);

			const existing = open.get(key);
			if (!existing || g < existing.g) {
				open.set(key, {
					point: next,
					g,
					f,
					parent: current
				});
			}
		}
	}

	throw new Error("No path found");
}
