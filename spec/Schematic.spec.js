import {openSchematic} from "../src/Schematic.js";

describe("schematic",()=>{
	it("can open a schematic",async ()=>{
		let schematic=await openSchematic("spec/kitest.kicad_sch",{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		//console.log(schematic);		
		for (let entity of schematic.getEntities()) {
			//console.log(entity.getReference());
			//console.log(entity.getType(),": ",entity.getConnectionPoints());
		}

		let j1=schematic.getEntity("J1");
		let j2=schematic.getEntity("J2");

		//console.log(j1.pin(1).isConnected(j2.pin(2)));

		let p1=j1.pin(1).getPoint();
		expect(p1).toEqual([ 81.28, 71.12 ]);

		let entities=schematic.getEntitiesByConnectionPoint(p1);
		expect(entities.length).toEqual(2);
		//console.log(entities);
		//expect().toEqual();

		let p2=j2.pin(2).getPoint();
		//console.log(p1,p2);

		let cp=schematic.getConnectionPath(p1,p2);
		expect(cp.length).toEqual(3);

		//expect(p1.isConnected(p2)).toEqual(true);

		expect(schematic.entity("J1").pin(1).isConnected(schematic.entity("J2").pin(2))).toEqual(true);
		expect(schematic.entity("J1").pin(1).isConnected(schematic.entity("J2").pin(1))).toEqual(false);
		//console.log(cp);
	});

	it("can add a connection",async ()=>{
		let schematic=await openSchematic("spec/kitest.kicad_sch",{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		let p1=schematic.entity("J1").pin(1).getPoint();
		let p2=schematic.entity("J3").pin(1).getPoint();

		expect(schematic.arePointsConnected(p1,p2)).toEqual(false);

		//schematic.addConnectionWire(p1,p2);
		//p1.connect(p2);
		schematic.entity("J1").pin(1).connect(schematic.entity("J3").pin(1));

		expect(schematic.arePointsConnected(p1,p2)).toEqual(true);
	});

	it("can handle net labels",async ()=>{
		let schematic=await openSchematic("spec/kitest.kicad_sch",{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		let p1=schematic.entity("J2").pin(1).getPoint();
		let entities=schematic.getEntitiesByConnectionPoint(p1);
		//console.log(entities);

		expect(entities.length).toEqual(2);
		expect(entities.filter(e=>e.getType()=="label")[0].getLabel()).toEqual("5V");

		expect(schematic.entity("J2").pin(1).isConnected("5V")).toEqual(true);
		expect(schematic.entity("J2").pin(1).isConnected("GND")).toEqual(false);
		expect(schematic.entity("J3").pin(4).isConnected("GND")).toEqual(true);
		expect(schematic.entity("J1").pin(2).isConnected("GND")).toEqual(true);
		//console.log(p1);

		schematic.entity("J3").pin(1).connect("GND");
		//expect(schematic.entity("J3").pin(1).isConnected("GND")).toEqual(false);
	});
});
