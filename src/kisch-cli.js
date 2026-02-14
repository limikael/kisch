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
    $ kisch --input fresh.sch --emit x.js

  Load from one file, apply script, and save in another file:
    $ kisch --input template.sch --script x.js --output out.sch

  Dry-run, just load schematic and apply script, but don't save:
    $ kisch --input design.sch --script x.js
`;

program
    .name("kisch")
    .description(
        "Schematic transformation tool for KiCad.\n\n" +
        "Reads a schematic, applies a JavaScript transformation script,\n" +
        "and writes the resulting schematic."
    )
    .version(pkg.version, "--version", "Show version")
    .argument("[inout.kicad_sch]", "Schematic to be used as input and output.")

    // Core options
    .option("-i, --input <input.kicad_sch>", "Input schematic.")
    .option("-o, --output <output.kicad_sch>","Output schematic.")
    .option("-L, --symbol-dir <path>","Where to find KiCad symbols.")
    .option("-s, --script <script.js>", "Input script to apply to schematic.")
    .option("-e, --emit <script.js>", "Emit script based on schematic.")
    .option("-q, --quiet", "No output, except for errors.")
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

await program.parseAsync();

try {
    let options=program.opts();
    if (program.args[0]) {
        if (options.input || options.output)
            throw new DeclaredError("Can't use both positional arg together with -i or -o.");

        options.input=program.args[0];
        options.output=program.args[0];
    }

    if (!options.input && !options.output)
        program.help();

    if (!options.define)
        options.define=[];

    if (!options.symbolDir)
        options.symbolDir=
            process.env.KISCH_SYMBOL_DIR ||
            process.env.KICAD9_SYMBOL_DIR ||
            process.env.KICAD_SYMBOL_DIR;

    let cons=global.console;
    if (options.quiet)
        cons={info: ()=>{}, log: ()=>{}};

    if (!options.symbolDir)
        throw new DeclaredError("Symbol path missing, pass -L, or set KISCH_SYMBOL_DIR, KICAD9_SYMBOL_DIR or KICAD_SYMBOL_DIR");

    let schematic;
    if (options.input) {
        cons.info("Loading: "+options.input);
        schematic=await loadSchematic(options.input,{
            symbolLibraryPath: options.symbolDir
        });
    }

    else {
        cons.info("Starting with empty schematic");
        schematic=await createSchematic({
            symbolLibraryPath: options.symbolDir
        });
    }

    if (options.script) {
        cons.info("Applying script: "+options.script);
        global.schematic=schematic;
        let defines=Object.fromEntries(options.define.map(e=>
            ([e.slice(0,e.indexOf("=")),e.slice(e.indexOf("=")+1)])
        ));

        let mod=await import(path.resolve(options.script));
        if (typeof mod.default=="function")
            await mod.default(schematic,defines);

        schematic.removeUndeclared();
    }

    if (options.emit) {
        cons.info("Emitting script: "+options.emit);
        await fsp.writeFile(options.emit,schematic.getSource());
    }

    if (options.output) {
        cons.info("Saving: "+options.output);
        await schematic.save(options.output);
    }
}

catch (e) {
    if (e.declared) {
        console.log("Error: "+e.message);
        process.exit(1);
    }

    throw e;
}