import {openSchematic} from "../src/Schematic.js";
import fs, {promises as fsp} from "fs";

await fsp.rm("lab/kitest",{force: true, recursive: true});
await fsp.cp("lab/kitest-org","lab/kitest",{recursive: true});

let schematic=await openSchematic("lab/kitest/kitest.kicad_sch",{
	symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
});

/*let p1=schematic.entity("J1").pin(1).getPoint();
let p2=schematic.entity("J3").pin(2).getPoint();
schematic.addConnectionWire(p1,p2);*/

schematic.entity("J1").pin(1).connect(schematic.entity("J3").pin(2));
schematic.entity("J3").pin(1).connect("GND");

await schematic.save();
