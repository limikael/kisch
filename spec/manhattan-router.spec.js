import {Point} from "../src/cartesian-math.js";
import {findGridPath, segmentBlocked} from "../src/manhattan-router.js";

describe("manhattan-router", () => {
	const P = (x, y) => new Point([x, y]);
	const R = (x, y, w, h) => ({
		corner: P(x, y),
		size: P(w, h)
	});

	it("connects two points directly", () => {
		const path = findGridPath({
			from: P(0, 0),
			to: P(10, 0),
			gridSize: 5,
			avoidRects: []
		});

		expect(path.map(p => p.join(",")))
			.toEqual(["0,0", "10,0"]);
	});

	it("creates an L-shaped path", () => {
		const path = findGridPath({
			from: P(0, 0),
			to: P(10, 10),
			gridSize: 5,
			avoidRects: []
		});

		expect(path.length).toBe(3);
		expect(path[0].equals(P(0, 0))).toBeTrue();
		expect(path[2].equals(P(10, 10))).toBeTrue();
	});

	it("routes around a small obstacle", () => {
		const path = findGridPath({
			from: P(0, 0),
			to: P(10, 0),
			gridSize: 5,
			avoidRects: [
				R(4, -1, 2, 2) // blocks (5,0)
			]
		});

		const keys = path.map(p => p.join(","));
		expect(keys).not.toContain("5,0");
		expect(keys[0]).toBe("0,0");
		expect(keys[keys.length - 1]).toBe("10,0");
	});

	it("avoids a rectangular keep-out area", () => {
		const path = findGridPath({
			from: P(0, 0),
			to: P(20, 0),
			gridSize: 5,
			avoidRects: [
				R(5, -5, 10, 10)
			]
		});

		for (let i = 0; i < path.length - 1; i++) {
			expect(
				segmentBlocked(path[i], path[i + 1], [
					R(5, -5, 10, 10)
				])
			).toBeFalse();
		}
	});

	it("is deterministic", () => {
		const opts = {
			from: P(0, 0),
			to: P(10, 10),
			gridSize: 5,
			avoidRects: [R(5, 0, 2, 2)]
		};

		const a = findGridPath(opts).map(p => p.join(","));
		const b = findGridPath(opts).map(p => p.join(","));

		expect(a).toEqual(b);
	});
});

describe("findGridPath – avoidLines", () => {

	it("avoids drawing collinear overlapping horizontal lines", () => {
		const path = findGridPath({
			from: new Point([0, 0]),
			to: new Point([10, 0]),
			gridSize: 5,
			avoidRects: [],
			avoidLines: [
				{ a: new Point([0, 0]), b: new Point([10, 0]) }
			]
		});

		// must detour
		expect(path.length).toBeGreaterThan(2);

		// should not contain straight horizontal segment at y=0
		for (let i = 0; i < path.length - 1; i++) {
			const a = path[i];
			const b = path[i + 1];
			if (a[1] === 0 && b[1] === 0) {
				fail("Path contains forbidden collinear segment");
			}
		}
	});

	it("allows orthogonal crossing of avoidLines", () => {
		const path = findGridPath({
			from: new Point([5, -5]),
			to: new Point([5, 5]),
			gridSize: 5,
			avoidRects: [],
			avoidLines: [
				{ a: new Point([0, 0]), b: new Point([10, 0]) }
			]
		});

		// straight vertical path is allowed
		expect(path).toEqual([
			new Point([5, -5]),
			new Point([5, 5])
		]);
	});

	it("avoids vertical collinear overlap as well", () => {
		const path = findGridPath({
			from: new Point([0, 0]),
			to: new Point([0, 10]),
			gridSize: 5,
			avoidRects: [],
			avoidLines: [
				{ a: new Point([0, 0]), b: new Point([0, 10]) }
			]
		});

		expect(path.length).toBeGreaterThan(2);

		for (let i = 0; i < path.length - 1; i++) {
			const a = path[i];
			const b = path[i + 1];
			if (a[0] === 0 && b[0] === 0) {
				fail("Vertical collinear overlap detected");
			}
		}
	});

});
