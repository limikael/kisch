import { Point, pointKey } from "../src/cartesian-math.js";

function manhattan(a, b) {
	return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function rangeOverlap(a1, a2, b1, b2) {
	const minA = Math.min(a1, a2);
	const maxA = Math.max(a1, a2);
	const minB = Math.min(b1, b2);
	const maxB = Math.max(b1, b2);
	return maxA > minB && maxB > minA;
}

/* ───────────────────────── Rect blocking (unchanged) ───────────────────────── */

export function segmentBlocked(a, b, rects) {
	const ax = a[0], ay = a[1];
	const bx = b[0], by = b[1];

	for (const r of rects) {
		const rx = r.corner[0];
		const ry = r.corner[1];
		const rw = r.size[0];
		const rh = r.size[1];

		// horizontal
		if (ay === by) {
			if (
				ay >= ry && ay <= ry + rh &&
				rangeOverlap(ax, bx, rx, rx + rw)
			) return true;
		}

		// vertical
		if (ax === bx) {
			if (
				ax >= rx && ax <= rx + rw &&
				rangeOverlap(ay, by, ry, ry + rh)
			) return true;
		}
	}

	return false;
}

/* ───────────────────────── Line blocking (NEW) ───────────────────────── */

function similar(a,b) {
	return Math.abs(a-b)<0.0000001
}

function segmentOverlapsLine(a1, a2, b1, b2) {
	// horizontal
//	if (a1[1] === a2[1] && b1[1] === b2[1] && a1[1] === b1[1]) {
	if (similar(a1[1],a2[1]) && similar(b1[1],b2[1]) && similar(a1[1],b1[1])) {
		return rangeOverlap(a1[0], a2[0], b1[0], b2[0]);
	}

	// vertical
//	if (a1[0] === a2[0] && b1[0] === b2[0] && a1[0] === b1[0]) {
	if (similar(a1[0],a2[0]) && similar(b1[0],b2[0]) && similar(a1[0],b1[0])) {
		return rangeOverlap(a1[1], a2[1], b1[1], b2[1]);
	}

	return false;
}

export function segmentBlockedByLines(a, b, lines) {
	for (const { a: l1, b: l2 } of lines) {
		if (segmentOverlapsLine(a, b, l1, l2)) {
			return true;
		}
	}
	return false;
}

/* ───────────────────────── Path compression (unchanged) ───────────────────────── */

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

		if (
			(abx === 0 && bcx === 0) ||
			(aby === 0 && bcy === 0)
		) continue;

		out.push(b);
	}

	out.push(points[points.length - 1]);
	return out; //.map(p=>p.snap(2.54));
}

/* ───────────────────────── Main router ───────────────────────── */

export function findGridPath({
	from,
	to,
	gridSize,
	avoidRects = [],
	avoidLines = []
}) {
	const open = new Map();
	const closed = new Set();

	open.set(pointKey(from), {
		point: from,
		g: 0,
		f: manhattan(from, to),
		parent: null
	});

	const steps = [
		new Point([ gridSize, 0 ]),
		new Point([ -gridSize, 0 ]),
		new Point([ 0, gridSize ]),
		new Point([ 0, -gridSize ])
	];

	let smallest=1000;
	let maxIter=10000;
	let iter=0;

	while (open.size && iter<maxIter) {
		iter++;

		let current = null;
		for (const n of open.values()) {
			if (!current || n.f < current.f) current = n;
		}

		let dist=current.point.sub(to).len();
		if (dist<smallest) {
			//console.log("dist=",dist);
			smallest=dist;
		}

		//console.log("cp ",current.point," to ",to);

		if (current.point.equals(to)) {
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
			const next = current.point.add(step).snap(gridSize);
			const key = pointKey(next);

			if (closed.has(key)) continue;
			if (segmentBlocked(current.point, next, avoidRects)) continue;
			if (segmentBlockedByLines(current.point, next, avoidLines)) continue;

			let g = current.g + gridSize;
			let f = g + manhattan(next, to);

			g=Number(g.toFixed(2));
			f=Number(f.toFixed(2));

			//console.log("next=",next," key="+key+" g="+g+" f="+f);

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
