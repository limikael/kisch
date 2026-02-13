import fs, {promises as fsp} from "fs";
import {runCommand} from "../src/node-util.js";
import {openSchematic} from "../src/Schematic.js";

describe("kisch-cli",()=>{
	it("works",async ()=>{
		await fsp.copyFile("spec/kitest.kicad_sch","spec/kitest-work.kicad_sch");
		await runCommand("src/kisch-cli.js",[
			"spec/kitest-work.kicad_sch",
			"--script","spec/kitest-basic.js",
			"--symbol-dir","/home/micke/Repo.ext/kicad-symbols"
		]);

		let schematic=await openSchematic("spec/kitest-work.kicad_sch",{
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
});