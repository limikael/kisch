#!/usr/bin/env node

import {program} from "commander";
import Schematic, {loadSchematic, createSchematic} from "./Schematic.js";
import path from "node:path";
import pkg from "../package.json" with { type: "json" };
import {DeclaredError} from "./js-util.js";
import fs, {promises as fsp} from "fs";

/*todo...

defines
wires*/

let HELP_TEXT=`
Examples:

  Transform existng schema by applying script:
    $ kisch design.sch --script x.js

  Generate script for later use:
    $ kisch fresh.sch --script x.js --emit

  Transform from separate file:
    $ kisch out.sch --input template.sch --script x.js
`;

/*  Check what would change (dry-run):
    $ kisch board.sch --script tidy.js --check*/

program
    .name("kisch")
    .description(
        "Schematic transformation tool for KiCad.\n\n" +
        "Reads a schematic, applies a JavaScript transformation script,\n" +
        "and writes the resulting schematic."
    )
    .version(pkg.version, "--version", "Show version")
    .argument("<output.kicad_sch>", "Path to the generated schematic file")

    // Core options
    .option("-i, --input <input.kicad_sch>", "Input schematic, defaults to output file if it exists.")
    .option("-L, --symbol-dir <path>","Where to find KiCad symbols.")
    .option("-s, --script <script.js>", "Transformation script JavaScript module.")
    .option("-e, --emit", "Emit script based on schematic.")
    .option("-q, --quiet", "No output, except for errors.")
    //.option("-c, --check", "Validate and report changes without writing output")
    //.option("-v, --verbose", "Print detailed execution info")
    .option(
        "-D, --define <key=value>", 
        "Define variable for the script.",
        (value, previous = []) => {
            previous.push(value);
            return previous;
        }
    )

    // Custom help formatting
    .addHelpText("after",HELP_TEXT);

if (process.argv.length <= 2)
    program.help();

await program.parseAsync();

let options={
    ...program.opts(),
    schematic: program.args[0],
}

if (!options.define)
    options.define=[];

if (!options.symbolDir)
    options.symbolDir=
        process.env.KISCH_SYMBOL_DIR ||
        process.env.KICAD9_SYMBOL_DIR ||
        process.env.KICAD_SYMBOL_DIR;

try {
    let cons=global.console;
    if (options.quiet)
        cons={info: ()=>{}, log: ()=>{}};

    if (!options.symbolDir)
        throw new DeclaredError("Symbol path missing, pass -L, or set KISCH_SYMBOL_DIR, KICAD9_SYMBOL_DIR or KICAD_SYMBOL_DIR");

    //console.log(options);

    let schematic;
    let inputFileName=options.input;
    if (!inputFileName)
        inputFileName=options.schematic;

    //console.log("input: "+inputFileName);
    if (fs.existsSync(inputFileName))
        schematic=await loadSchematic(inputFileName,{
            symbolLibraryPath: options.symbolDir
        });

    else 
        schematic=await createSchematic({
            symbolLibraryPath: options.symbolDir
        });

    if (options.emit) {
        await fsp.writeFile(options.script,schematic.getSource());
        cons.info("Emitting "+options.script);
    }

    else {
        if (options.script) {
            global.schematic=schematic;
            let defines=Object.fromEntries(options.define.map(e=>
                ([e.slice(0,e.indexOf("=")),e.slice(e.indexOf("=")+1)])
            ));

            let mod=await import(path.resolve(options.script));
            if (typeof mod.default=="function")
                await mod.default(schematic,defines);

            schematic.removeUndeclared();
        }

        await schematic.save(options.schematic);
    }
}

catch (e) {
    if (e.declared) {
        console.log("Error: "+e.message);
        process.exit(1);
    }

    throw e;
}