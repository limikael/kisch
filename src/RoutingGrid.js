import {arrayGetMinIndex, arrayGetMaxIndex} from "../src/js-util.js";
import {collapsePath} from "./grid-util.js";
import {astar} from "./astar.js";

export default class RoutingGrid {
	constructor() {
		this.grid=[];
	}

	getGrid(x, y) {
		//console.log(x+","+y);
		if (!this.grid[y])
			this.grid[y]=[];

		if (!this.grid[y][x])
			this.grid[y][x]={};

		return this.grid[y][x];
	}

	drawHorizontalLine(x, y, x2) {
		if (x2<x) { let v=x; x=x2; x2=v; }
		for (let i=x; i<x2; i++)
			this.getGrid(i,y).h=true;
	}

	drawVerticalLine(x, y, y2) {
		if (y2<y) { let v=y; y=y2; y2=v; }
		for (let i=y; i<y2; i++)
			this.getGrid(x,i).v=true;
	}

	drawLine(x1, y1, x2, y2) {
		if (y1==y2)
			this.drawHorizontalLine(x1,y2,x2);

		else if (x1==x2)
			this.drawVerticalLine(x1,y1,y2);

		else
			throw new Error("can only draw h/v");
	}

	drawLines(points) {
		for (let i=0; i<points.length-1; i++) {
			this.drawLine(
				points[i].x,
				points[i].y,
				points[i+1].x,
				points[i+1].y,
			)
		}
	}

	drawRect(x1, y1, x2, y2) {
		if (x2<x1) { let v=x1; x1=x2; x2=v; }
		if (y2<y1) { let v=y1; y1=y2; y2=v; }
		for (let y=y1; y<=y2; y++) {
			for (let x=x1; x<=x2; x++) {
				if (x!=x2)
					this.getGrid(x,y).h=true;

				if (y!=y2)
					this.getGrid(x,y).v=true;
			}
		}
	}

	getTop() {
		return arrayGetMinIndex(this.grid);
	}

	getBottom() {
		return arrayGetMaxIndex(this.grid);
	}

	getLeft() {
		let min;
		for (let y=arrayGetMinIndex(this.grid); y<=arrayGetMaxIndex(this.grid); y++) {
			if (this.grid[y]) {
				if (min===undefined || arrayGetMinIndex(this.grid[y])<min)
					min=arrayGetMinIndex(this.grid[y]);
			}
		}

		return min;
	}

	getRight() {
		let max;
		for (let y=arrayGetMinIndex(this.grid); y<=arrayGetMaxIndex(this.grid); y++) {
			if (this.grid[y]) {
				//console.log(y+" "+arrayGetMaxIndex(this.grid[y]),this.grid[y],Object.keys(this.grid[y]));
				if (max===undefined || arrayGetMaxIndex(this.grid[y])>max)
					max=arrayGetMaxIndex(this.grid[y]);
			}
		}

		return max;
	}

	toGridString() {
		let s="";

		for (let y=this.getTop(); y<=this.getBottom(); y++) {
			for (let x=this.getLeft(); x<=this.getRight(); x++)
				s+=("+"+(this.getGrid(x,y).h?"-":" "));

			s+="\n";

			for (let x=this.getLeft(); x<=this.getRight(); x++)
				s+=(this.getGrid(x,y).v?"|":" ")+" ";

			s+="\n";
		}

		return s;
	}

	findPath(x1, y1, x2, y2) {
		let neighbours=(g)=>{
			let n=[];

			if (!this.getGrid(g.x,g.y).h)
				n.push({x: g.x+1, y: g.y});

			if (!this.getGrid(g.x-1,g.y).h)
				n.push({x: g.x-1, y: g.y});

			if (!this.getGrid(g.x,g.y).v)
				n.push({x: g.x, y: g.y+1});

			if (!this.getGrid(g.x,g.y-1).v)
				n.push({x: g.x, y: g.y-1});

			return n;
		}

		let steps=astar({
			start: {x: x1, y: y1},
			neighbours,
			isGoal: g=>(g.x==x2 && g.y==y2),
			cost: ()=>1,
			key: g=>String(g.x)+"|"+String(g.y)
		});

		return collapsePath(steps);
	}
}
