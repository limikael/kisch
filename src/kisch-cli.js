#!/usr/bin/env node

import {program} from "commander";
import Schematic from "./Schematic.js";
import path from "node:path";

program
	.description("Create or update KiCad schematic based on programmatic description.")
	.option("--symbol-library-path <path>","Where to find KiCad symbols.")
	.requiredOption("--script <script>","JavaScript file to transform the schematic.")
	.argument("<schematic>","KiCad Schematic file.")

await program.parseAsync();
let options={
	...program.opts(),
	schematic: program.args[0],
}

//console.log(options);

let schematic=new Schematic(options.schematic,{
	symbolLibraryPath: options.symbolLibraryPath
});

await schematic.load();

global.schematic=schematic;
let mod=await import(path.resolve(options.script));
if (typeof mod.default=="function")
	await mod.default(schematic);

schematic.removeUndeclared();
await schematic.save();