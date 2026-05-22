import {arrayGetMinIndex, arrayGetMaxIndex} from "./js-util.js";
import {collapsePath, manhattanDist} from "./grid-util.js";
import {astar} from "./astar.js";

export default class RoutingGrid {
	constructor({spacing}={spacing: 1}) {
		this.grid=[];
		this.spacing=spacing;
	}

	snap(v) {
		return Math.round(v/this.spacing);
	}

	unsnap(v) {
		return v*this.spacing;
	}

	getGrid(x, y) {
		if (!this.grid[y] || !this.grid[y][x])
			return {};

		return this.grid[y][x];
	}

	updateGrid(x, y, update) {
		//console.log(x+","+y);
		if (!this.grid[y])
			this.grid[y]=[];

		if (!this.grid[y][x])
			this.grid[y][x]={};

		this.grid[y][x]={...this.grid[y][x], ...update};
	}

	drawPoint(x, y) {
		x=this.snap(x);
		y=this.snap(y);
		this.updateGrid(x,y,{b: true});
	}

	clearPoint(x, y) {
		x=this.snap(x);
		y=this.snap(y);
		this.updateGrid(x,y,{b: false});
	}

	drawHorizontalLine(x, y, x2) {
		x=this.snap(x);
		y=this.snap(y);
		x2=this.snap(x2);

		if (x2<x) { let v=x; x=x2; x2=v; }
		for (let i=x; i<x2; i++)
			this.updateGrid(i,y,{h: true});
	}

	drawVerticalLine(x, y, y2) {
		x=this.snap(x);
		y=this.snap(y);
		y2=this.snap(y2);

		if (y2<y) { let v=y; y=y2; y2=v; }
		for (let i=y; i<y2; i++)
			this.updateGrid(x,i,{v: true});
	}

	drawLine(x1, y1, x2, y2) {
		if (this.snap(y1)==this.snap(y2))
			this.drawHorizontalLine(x1,y2,x2);

		else if (this.snap(x1)==this.snap(x2))
			this.drawVerticalLine(x1,y1,y2);

		else
			throw new Error("can only draw h/v, not: "+[x1,y1,x2,y2].toString());

		this.drawPoint(x1,y1);
		this.drawPoint(x2,y2);
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
		x1=this.snap(x1);
		y1=this.snap(y1);
		x2=this.snap(x2);
		y2=this.snap(y2);

		if (x2<x1) { let v=x1; x1=x2; x2=v; }
		if (y2<y1) { let v=y1; y1=y2; y2=v; }
		for (let y=y1; y<=y2; y++) {
			for (let x=x1; x<=x2; x++) {
				this.updateGrid(x,y,{b: true});

				if (x!=x2)
					this.updateGrid(x,y,{h: true});

				if (y!=y2)
					this.updateGrid(x,y,{v: true});
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
				s+=((this.getGrid(x,y).b?"*":"+")+(this.getGrid(x,y).h?"-":" "));

			s+="\n";

			for (let x=this.getLeft(); x<=this.getRight(); x++)
				s+=(this.getGrid(x,y).v?"|":" ")+" ";

			s+="\n";
		}

		return s;
	}

	findPath({start, goal, stats}) {
		start=start.map(p=>({x: this.snap(p.x), y: this.snap(p.y)}));
		goal=goal.map(p=>({x: this.snap(p.x), y: this.snap(p.y)}));

		let neighbours=(g)=>{
			let n=[];

			if (g=="start")
				return start;

			if (!this.getGrid(g.x,g.y).h &&
					!this.getGrid(g.x+1,g.y).b)
				n.push({x: g.x+1, y: g.y, from: "w"});

			if (!this.getGrid(g.x-1,g.y).h &&
					!this.getGrid(g.x-1,g.y).b)
				n.push({x: g.x-1, y: g.y, from: "e"});

			if (!this.getGrid(g.x,g.y).v &&
					!this.getGrid(g.x,g.y+1).b)
				n.push({x: g.x, y: g.y+1, from: "n"});

			if (!this.getGrid(g.x,g.y-1).v &&
					!this.getGrid(g.x,g.y-1).b)
				n.push({x: g.x, y: g.y-1, from: "s"});

			return n;
		}

		let cost=(g1, g2)=>{
			if (g1.from==g2.from)
				return 1;

			return 20;
		}

		let heuristic=(node)=>{
			if (node=="start")
				return 0;

			let closest;
			for (let g of goal) {
				let d=manhattanDist(node.x,node.y,g.x,g.y);
				if (closest===undefined || d<closest)
					closest=d;
			}

			return closest;
		}

		let key=(g)=>{
			if (g=="start")
				return "start";

			return `${g.x}|${g.y}|${g.from??""}`;
		}

		let isGoal=g=>{
			for (let p of goal)
				if (p.x==g.x && p.y==g.y)
					return true;
		}

		let steps=astar({
			start: "start",
			neighbours,
			isGoal, //: g=>(g.x==goal.x && g.y==goal.y),
			cost,
			heuristic,
			key,
			stats
		});

		steps=steps.filter(i=>i!="start");

		return collapsePath(steps).map(p=>({x: this.unsnap(p.x), y: this.unsnap(p.y)}));
	}

	getPoints() {
		let points=[];

		for (let y=arrayGetMinIndex(this.grid); y<=arrayGetMaxIndex(this.grid); y++) {
			let row=this.grid[y];
			if (row) {
				for (let x=arrayGetMinIndex(row); x<=arrayGetMaxIndex(row); x++) {
					let g=this.getGrid(x,y)
					if (g.b || g.h || g.v)
						points.push({x,y});
				}
			}
		}

		return points.map(p=>({x: this.unsnap(p.x), y: this.unsnap(p.y)}));
	}
}
