import RoutingGrid from "../src/utils/RoutingGrid.js";

let grid=new RoutingGrid();
grid.drawLine(0,0,29,0);
grid.drawLine(0,9,29,9);
grid.drawLine(0,0,0,9);
grid.drawLine(29,0,29,9);
grid.drawRect(2,2,5,5);

//let p=grid.findPath(2,1,10,5);
let stats={};
let p=grid.findPath(2,1,3,7,stats);
grid.drawLines(p);

console.log("t: "+grid.getTop()+" b: "+grid.getBottom()+" l: "+grid.getLeft()+" r: "+grid.getRight());
console.log(grid.toGridString());
console.log("steps: "+stats.steps);
