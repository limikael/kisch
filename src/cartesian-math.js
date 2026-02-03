export class Point extends Array {
	constructor(a) {
		if (a)
			super(...[a].flat(Infinity));

		else
			super();
	}

	add(p) {
		return Point.from([
			this[0]+p[0],
			this[1]+p[1]
		]);
	}

	sub(p) {
		return Point.from([
			this[0]-p[0],
			this[1]-p[1]
		]);
	}

	equals(p) {
		return (pointKey(this)==pointKey(p));
	}
}

export class Rect {
	constructor(corner, size) {
		this.corner=Point.from(corner);
		this.size=Point.from(size);
	}
}

export function pointKey(p) {
	return `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
}