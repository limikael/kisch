import {arrayGetMinIndex, arrayGetMaxIndex} from "../src/js-util.js";

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
}
