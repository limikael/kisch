import Entity from "../src/Entity.js";
import {openSchematic} from "../src/Schematic.js";

describe("Entity",()=>{
	it("can get and set existing footprint",async ()=>{
		let schematic=await openSchematic("spec/kitest.kicad_sch",{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		/*for (let e of schematic.entities.filter(e=>e.getType()=="symbol")) {
			console.log(e.getReference()+": "+e.getFootprint());
		}*/

		expect(schematic.sym("J3").getFootprint()).toEqual("hello");
		schematic.sym("J3").setFootprint("hello again");
		expect(schematic.sym("J3").getFootprint()).toEqual("hello again");
	});

	it("can get and set footprints for new entities",async ()=>{
		let schematic=await openSchematic("spec/kitest.kicad_sch",{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		schematic.addSymbol("J5", {symbol: "Connector_Generic:Conn_01x04"});

		let e=schematic.sym("J5");
		expect(e.getFootprint()).toEqual("");
		e.setFootprint("testing");
		expect(e.getFootprint()).toEqual("testing");
	});
});
