import RoutingGrid from "../src/RoutingGrid.js";

let grid=new RoutingGrid();
grid.drawLine(0,0,29,0);
grid.drawLine(0,9,29,9);
grid.drawLine(0,0,0,9);
grid.drawLine(29,0,29,9);

console.log("t: "+grid.getTop()+" b: "+grid.getBottom()+" l: "+grid.getLeft()+" r: "+grid.getRight());

console.log(grid.toGridString());
