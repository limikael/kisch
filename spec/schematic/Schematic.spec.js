import {loadSchematic} from "../../src/schematic/Schematic.js";
import {dirnameFromImportMeta} from "../../src/utils/node-util.js";
import {Rect, Point} from "../../src/utils/cartesian-math.js";
import {sexpStringify} from "../../src/utils/sexp.js";
import fs from "fs";
import path from "path";

let __dirname=dirnameFromImportMeta(import.meta);

describe("schematic",()=>{
	it("can open a schematic",async ()=>{
		fs.rmSync(path.join(__dirname,"../kitest"),{force: true, recursive: true});
		fs.cpSync(path.join(__dirname,"../kitest.keep"),path.join(__dirname,"../kitest"),{recursive: true});

		let fn=path.join(__dirname,"../kitest/kitest.kicad_sch");
		let schematic=await loadSchematic(fn,{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		//console.log(schematic.getEntities().length);

		expect(schematic.getEntities().length).toEqual(12);
		//console.log(schematic);		
		for (let entity of schematic.getEntities()) {
			//console.log(entity.getReference());
			//console.log(entity.getType(),": ",entity.getConnectionPoints());
		}

		let j1=schematic.sym("J1");
		let j2=schematic.sym("J2");

		//console.log(j1.pin(1).isConnected(j2.pin(2)));
		expect(j1.pin(1).isConnected(j2.pin(2))).toEqual(true);

		//console.log(j1.pin(1).isConnected(j2.pin(1)));
		expect(j1.pin(1).isConnected(j2.pin(1))).toEqual(false);

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

		expect(schematic.sym("J1").pin(1).isConnected(schematic.sym("J2").pin(2))).toEqual(true);
		expect(schematic.sym("J1").pin(1).isConnected(schematic.sym("J2").pin(1))).toEqual(false);
		//console.log(cp);*/
	});

	it("can draw bounding boxes",async ()=>{
		fs.rmSync(path.join(__dirname,"../kitest"),{force: true, recursive: true});
		fs.cpSync(path.join(__dirname,"../kitest.keep"),path.join(__dirname,"../kitest"),{recursive: true});

		let fn=path.join(__dirname,"../kitest/kitest.kicad_sch");
		let schematic=await loadSchematic(fn,{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		for (let e of schematic.getEntities({type: "wire"})) {
			schematic.removeEntity(e);
		}

		for (let s of schematic.getEntities({type: "symbol"})) {
			schematic.drawWireRect(s.getBoundingRect());
			for (let p of s.getPins()) {
				schematic.drawWirePoint(p.getPoint());
				schematic.drawWirePoint(p.getLegPoint());
				schematic.drawWireLine(p.getPoint(),p.getLegPoint());
			}
		}

		await schematic.save(fn);
	});

	it("can find connected wires",async ()=>{
		fs.rmSync(path.join(__dirname,"../kitest"),{force: true, recursive: true});
		fs.cpSync(path.join(__dirname,"../kitest.keep"),path.join(__dirname,"../kitest"),{recursive: true});

		let fn=path.join(__dirname,"../kitest/kitest.kicad_sch");
		let schematic=await loadSchematic(fn,{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		let p=schematic.sym("J1").pin(1).getPoint();
		let wires=schematic.getConnectedWires(p);
		expect(wires.length).toEqual(3);

		let points=schematic.getConnectedWirePoints(p);
		for (let p of points)
			schematic.drawWirePoint(new Point(p));

		await schematic.save(fn);
	});

	it("can add a junction",async ()=>{
		fs.rmSync(path.join(__dirname,"../kitest"),{force: true, recursive: true});
		fs.cpSync(path.join(__dirname,"../kitest.keep"),path.join(__dirname,"../kitest"),{recursive: true});

		let fn=path.join(__dirname,"../kitest/kitest.kicad_sch");
		let schematic=await loadSchematic(fn,{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		schematic.drawWireLine([50.8,50.8],[50.8,50.8+2.54*5]);
		schematic.drawWireLine([50.8,50.8],[50.8,50.8-2.54*5]);
		schematic.drawWireLine([50.8,50.8],[50.8+2.54*5,50.8]);

		schematic.addJunction([50.8,50.8]);

		await schematic.save(fn);
	});

	it("can add a connection",async ()=>{
		fs.rmSync(path.join(__dirname,"../kitest"),{force: true, recursive: true});
		fs.cpSync(path.join(__dirname,"../kitest.keep"),path.join(__dirname,"../kitest"),{recursive: true});

		let fn=path.join(__dirname,"../kitest/kitest.kicad_sch");
		let schematic=await loadSchematic(fn,{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		let p1=schematic.sym("J1").pin(1).getPoint();
		let p2=schematic.sym("J3").pin(1).getPoint();

		expect(schematic.arePointsConnected(p1,p2)).toEqual(false);
		schematic.sym("J1").pin(1).connect(schematic.sym("J3").pin(1));
		expect(schematic.arePointsConnected(p1,p2)).toEqual(true);

		schematic.sym("J1").pin(1).connect(schematic.sym("J4").pin(2));
		schematic.sym("J4").pin(4).connect(schematic.sym("J3").pin(1));

		await schematic.save(fn);
	});

	it("can handle net labels",async ()=>{
		fs.rmSync(path.join(__dirname,"../kitest"),{force: true, recursive: true});
		fs.cpSync(path.join(__dirname,"../kitest.keep"),path.join(__dirname,"../kitest"),{recursive: true});

		let fn=path.join(__dirname,"../kitest/kitest.kicad_sch");
		let schematic=await loadSchematic(fn,{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		let p1=schematic.sym("J2").pin(1).getPoint();
		let entities=schematic.getEntities({connectionPoint: p1});
		//console.log(entities);

		expect(entities.length).toEqual(2);
		expect(entities.filter(e=>e.getType()=="label")[0].getLabel()).toEqual("5V");

		expect(schematic.sym("J2").pin(1).isConnected("5V")).toEqual(true);
		expect(schematic.sym("J2").pin(1).isConnected("GND")).toEqual(false);
		expect(schematic.sym("J3").pin(4).isConnected("GND")).toEqual(true);
		expect(schematic.sym("J1").pin(2).isConnected("GND")).toEqual(true);
		//console.log(p1);

		schematic.sym("J3").pin(1).connect("GND");
		expect(schematic.sym("J3").pin(1).isConnected("GND")).toEqual(true);

		await schematic.save(fn);
	});

	it("can get rectangles",async ()=>{
		fs.rmSync(path.join(__dirname,"../kitest"),{force: true, recursive: true});
		fs.cpSync(path.join(__dirname,"../kitest.keep"),path.join(__dirname,"../kitest"),{recursive: true});
		let fn=path.join(__dirname,"../kitest/kitest.kicad_sch");

		let schematic=await loadSchematic(fn,{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		let r=schematic.sym("J3").getBoundingRect();
		//console.log(r);
	});

	it("can declare symbols",async ()=>{
		fs.rmSync(path.join(__dirname,"../kitest"),{force: true, recursive: true});
		fs.cpSync(path.join(__dirname,"../kitest.keep"),path.join(__dirname,"../kitest"),{recursive: true});
		let fn=path.join(__dirname,"../kitest/kitest.kicad_sch");

		let schematic=await loadSchematic(fn,{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		schematic.declare("J5",{
			symbol: "Connector_Generic:Conn_01x08"
		});

		schematic.sym("J5").pin(1).connect("GND");
		schematic.sym("J5").pin(7).connect(schematic.sym("J3").pin(3));

		expect(schematic.sym("J5").pin(7).isConnected(schematic.sym("J3").pin(3))).toEqual(true);
		expect(schematic.sym("J5").pin(7).isConnected(schematic.sym("J3").pin(2))).toEqual(false);

		for (let i=6; i<26; i++) {
			schematic.declare("J"+i,{
				symbol: "Connector_Generic:Conn_01x02"
			});
		}

		await schematic.save(fn);
	});

	/*it("can generate source",async ()=>{
		let schematic=await loadSchematic("spec/kitest.kicad_sch",{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		let source=schematic.getSource();
		//console.log(source);

		expect(source).toContain('J1.pin(2).connect("GND")');
		expect(source).toContain('let J1=sch.declare("J1",{');
	});*/
});
