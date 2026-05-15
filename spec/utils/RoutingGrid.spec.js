import RoutingGrid from "../../src/utils/RoutingGrid.js";

describe("RoutingGrid",()=>{
	it("can route",()=>{
		let grid=new RoutingGrid();
		grid.drawLine(0,0,29,0);
		grid.drawLine(0,9,29,9);
		grid.drawLine(0,0,0,9);
		grid.drawLine(29,0,29,9);
		grid.drawRect(2,2,5,5);

		let stats={};
		let p=grid.findPath(2,1,3,7,stats);
		grid.drawLines(p);

		//console.log("t: "+grid.getTop()+" b: "+grid.getBottom()+" l: "+grid.getLeft()+" r: "+grid.getRight());
		//console.log(grid.toGridString());
		//console.log("steps: "+stats.steps);
		//console.log(p);

		expect(p).toEqual([ { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 7 }, { x: 3, y: 7 } ]);
	});

	it("can snap",()=>{
		let grid=new RoutingGrid({spacing: 2.54});
		grid.drawLine(0,0,29*2.54,0);
		grid.drawLine(0,9*2.54,29*2.54,9*2.54);
		grid.drawLine(0,0,0,9*2.54);
		grid.drawLine(29*2.54,0,29*2.54,9*2.54);
		grid.drawRect(2*2.54,2*2.54,5*2.54,5*2.54);

		let stats={};
		let p=grid.findPath(2*2.54,1*2.54,3*2.54,7*2.54,stats);
		grid.drawLines(p);
		//console.log(grid.toGridString());

		//console.log("t: "+grid.getTop()+" b: "+grid.getBottom()+" l: "+grid.getLeft()+" r: "+grid.getRight());
		//console.log(grid.toGridString());
		//console.log("steps: "+stats.steps);
		//console.log(p);

		expect(p).toEqual([
			{ x: 5.08, y: 2.54 },
			{ x: 2.54, y: 2.54 },
			{ x: 2.54, y: 17.78 },
			{ x: 7.62, y: 17.78 }
		]);
	});
});