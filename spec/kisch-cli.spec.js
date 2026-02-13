import fs, {promises as fsp} from "fs";
import {runCommand} from "../src/node-util.js";
import {loadSchematic} from "../src/Schematic.js";

describe("kisch-cli",()=>{
	it("works",async ()=>{
		await fsp.copyFile("spec/kitest.kicad_sch","spec/kitest-work.kicad_sch");
		await runCommand("src/kisch-cli.js",[
			"spec/kitest-work.kicad_sch",
			"--script","spec/kitest-basic.js",
			"--symbol-dir","/home/micke/Repo.ext/kicad-symbols"
		]);

		let schematic=await loadSchematic("spec/kitest-work.kicad_sch",{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		schematic.sym("J5");
	});

	it("can emit",async ()=>{
		await fsp.rm("spec/kitest-emitted.js",{force: true});
		await fsp.copyFile("spec/kitest.kicad_sch","spec/kitest-work.kicad_sch");
		await runCommand("src/kisch-cli.js",[
			"spec/kitest-work.kicad_sch",
			"--script","spec/kitest-emitted.js",
			"--symbol-dir","/home/micke/Repo.ext/kicad-symbols",
			"--emit",
			"--quiet"
		]);

		expect(fs.existsSync("spec/kitest-emitted.js")).toEqual(true);
	});

	it("can work from scratch",async ()=>{
		await fsp.rm("lab/kitest",{force: true, recursive: true});
		await fsp.cp("lab/kitest-org","lab/kitest",{recursive: true});
		await fsp.rm("lab/kitest/kitest.kicad_sch",{recursive: true});

		await runCommand("src/kisch-cli.js",[
			"lab/kitest-org/kitest.kicad_sch",
			"--script","spec/kitest-emitted.js",
			"--symbol-dir","/home/micke/Repo.ext/kicad-symbols",
			"--emit",
			"--quiet"
		]);

		await runCommand("src/kisch-cli.js",[
			"lab/kitest/kitest.kicad_sch",
			"--script","spec/kitest-emitted.js",
			"--symbol-dir","/home/micke/Repo.ext/kicad-symbols",
			"--quiet"
		]);

		let schematic=await loadSchematic("lab/kitest/kitest.kicad_sch",{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		expect(schematic.getSymbolEntities().length).toEqual(3);
	});

	it("can work with separate input",async ()=>{
		await fsp.rm("lab/kitest",{force: true, recursive: true});
		await fsp.cp("lab/kitest-org","lab/kitest",{recursive: true});
		await fsp.rm("lab/kitest/kitest.kicad_sch",{recursive: true});

		await runCommand("src/kisch-cli.js",[
			"lab/kitest/kitest.kicad_sch",
			"--symbol-dir","/home/micke/Repo.ext/kicad-symbols",
			"--input","lab/kitest-org/kitest.kicad_sch",
			"--quiet"
		]);

		let schematic=await loadSchematic("lab/kitest/kitest.kicad_sch",{
			symbolLibraryPath: "/home/micke/Repo.ext/kicad-symbols"
		});

		expect(schematic.getSymbolEntities().length).toEqual(3);
	});
});