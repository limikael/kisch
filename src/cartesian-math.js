export class Point extends Array {
	constructor(...a) {
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

	snap(gridSize) {
		return new Point([
			Math.round(this[0]/gridSize)*gridSize,
			Math.round(this[1]/gridSize)*gridSize,
		]);
	}
}

export class Rect {
	constructor(corner, size) {
		this.corner=Point.from(corner);
		this.size=Point.from(size);
	}

	static fromCorners(p1, p2) {
		p1=new Point(p1);
		p2=new Point(p2);

		return new Rect(p1,p2.sub(p1));
	}

	getLeft() {
		if (this.size[0]<0)
			return this.corner[0]+this.size[0];

		return this.corner[0]
	}

	getRight() {
		if (this.size[0]<0)
			return this.corner[0];

		return this.corner[0]+this.size[0];
	}

	getTop() {
		if (this.size[1]<0)
			return this.corner[1]+this.size[1];

		return this.corner[1]
	}

	getBottom() {
		if (this.size[1]<0)
			return this.corner[1];

		return this.corner[1]+this.size[1];
	}

	getTopLeft() {
		return new Point(this.getLeft(),this.getTop());
	}

	getBottomRight() {
		return new Point(this.getRight(),this.getBottom());
	}

	union(r) {
		let left=Math.min(this.getLeft(),r.getLeft());
		let top=Math.min(this.getTop(),r.getTop());
		let right=Math.max(this.getRight(),r.getRight());
		let bottom=Math.max(this.getBottom(),r.getBottom());

		return Rect.fromCorners([left,top],[right,bottom]);
	}

	overlaps(other) {
	    return !(
			this.getRight()  <= other.getLeft()  ||
			this.getLeft()   >= other.getRight() ||
			this.getBottom() <= other.getTop()   ||
			this.getTop()    >= other.getBottom()
	    );
	}

	translate(p) {
	    return new Rect(
			this.corner.add(p),
			this.size
	    );
	}

	pad(border) {
		return Rect.fromCorners(
			this.getTopLeft().sub([border,border]),
			this.getBottomRight().add([border,border])
		);
	}

	getCenter() {
		return new Point(
			(this.getLeft()+this.getRight())/2,
			(this.getTop()+this.getBottom())/2
		);
	}
}

export function pointKey(p) {
	return `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
}