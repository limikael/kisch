import fs, {promises as fsp} from "fs";
import {runCommand, dirnameFromImportMeta} from "../../src/utils/node-util.js";
import {loadSchematic} from "../../src/schematic/Schematic.js";
import path from "path";

let __dirname=dirnameFromImportMeta(import.meta);

describe("kisch-cli",()=>{
	it("works",async ()=>{
		fs.rmSync(path.join(__dirname,"../kitest"),{force: true, recursive: true});
		fs.cpSync(path.join(__dirname,"../kitest.keep"),path.join(__dirname,"../kitest"),{recursive: true});

		await runCommand("src/app/kisch-cli.js",[
			"spec/kitest/kitest.kicad_sch",
			"--script","spec/kitest/kitest.js",
			"--symbol-dir","/home/micke/Repo.ext/kicad-symbols",
			"--quiet"
		]);

		let schematic=await loadSchematic("spec/kitest/kitest.kicad_sch",{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		schematic.sym("J5");
		expect(schematic.getEntities({type: "symbol"}).length).toEqual(2);
	});

	it("can do defines",async ()=>{
		fs.rmSync(path.join(__dirname,"../kitest"),{force: true, recursive: true});
		fs.cpSync(path.join(__dirname,"../kitest.keep"),path.join(__dirname,"../kitest"),{recursive: true});

		await runCommand("src/app/kisch-cli.js",[
			"spec/kitest/kitest.kicad_sch",
			"--script","spec/kitest/kitest.js",
			"--symbol-dir","/home/micke/Repo.ext/kicad-symbols",
			"-Dtest=123",
			"-Dtest2=456",
			"--quiet"
		]);

		let schematic=await loadSchematic("spec/kitest/kitest.kicad_sch",{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		expect(schematic.getEntities({type: "symbol"}).length).toEqual(3);
	});

	it("can emit",async ()=>{
		fs.rmSync(path.join(__dirname,"../kitest"),{force: true, recursive: true});
		fs.cpSync(path.join(__dirname,"../kitest.keep"),path.join(__dirname,"../kitest"),{recursive: true});

		await runCommand("src/app/kisch-cli.js",[
			"--input","spec/kitest/kitest.kicad_sch",
			"--emit","spec/kitest/kitest-emitted.js",
			"--symbol-dir","/home/micke/Repo.ext/kicad-symbols",
			"--quiet"
		]);

		expect(fs.existsSync("spec/kitest/kitest-emitted.js")).toEqual(true);
	});

	it("can work from scratch",async ()=>{
		fs.rmSync(path.join(__dirname,"../kitest"),{force: true, recursive: true});
		fs.cpSync(path.join(__dirname,"../kitest.keep"),path.join(__dirname,"../kitest"),{recursive: true});
		await fsp.rm("spec/kitest/kitest.kicad_sch",{recursive: true});

		await runCommand("src/app/kisch-cli.js",[
			"--output","spec/kitest/kitest.kicad_sch",
			"--script","spec/kitest/kitest.js",
			"--symbol-dir","/home/micke/Repo.ext/kicad-symbols",
			"--quiet"
		]);

		let schematic=await loadSchematic("spec/kitest/kitest.kicad_sch",{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		expect(schematic.getEntities({type: "symbol"}).length).toEqual(2);
	});

	it("can work with separate input",async ()=>{
		fs.rmSync(path.join(__dirname,"../kitest"),{force: true, recursive: true});
		fs.cpSync(path.join(__dirname,"../kitest.keep"),path.join(__dirname,"../kitest"),{recursive: true});

		await runCommand("src/app/kisch-cli.js",[
			"--symbol-dir","/home/micke/Repo.ext/kicad-symbols",
			"--input","spec/kitest/kitest.kicad_sch",
			"--output","spec/kitest/kitest.out.kicad_sch",
			"--quiet"
		]);

		let schematic=await loadSchematic("spec/kitest/kitest.out.kicad_sch",{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		expect(schematic.getEntities({type: "symbol"}).length).toEqual(4);
	});
});