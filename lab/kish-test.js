import {openSchematic} from "../src/Schematic.js";
import fs, {promises as fsp} from "fs";

await fsp.rm("lab/kitest",{force: true, recursive: true});
await fsp.cp("lab/kitest-org","lab/kitest",{recursive: true});

let schematic=await openSchematic("lab/kitest/kitest.kicad_sch",{
	symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
});

await schematic.use(
	"Connector_Generic:Conn_01x08"
);

schematic.sym("J1").pin(1).connect(schematic.sym("J3").pin(2));
schematic.sym("J3").pin(1).connect("GND");
schematic.sym("J1").pin(1).connect(schematic.sym("J3").pin(1));

let r=schematic.sym("J3").getBoundingRect();

/*for (let i=4; i<20; i++) {
	schematic.declare("J"+i,{
		symbol: "Connector_Generic:Conn_01x08",
	});
}*/

schematic.declare("J4",{
	symbol: "Connector_Generic:Conn_01x04",
});

schematic.sym("J4").pin(1).connect("GND");
schematic.sym("J4").pin(4).connect(schematic.sym("J3").pin(3));
schematic.sym("J1").pin(1).connect(schematic.sym("J4").pin(1));

await schematic.save();
