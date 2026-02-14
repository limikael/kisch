# KISCH(1)

## NAME

kisch — schema‑transformation tool for KiCad schematics

## SYNOPSIS

```
kisch [options] [inout.kicad_sch]
```

## DESCRIPTION

**kisch** is a command‑line tool for transforming KiCad schematic files.

Rather than treating schematics as static drawings edited exclusively through a GUI, kisch treats a `.kicad_sch` file as a *schema* that can be programmatically rewritten.

The intended workflow is to let KiCad do what it is good at (symbol placement and visual inspection), and let kisch do what GUIs are bad at: repetitive edits, precise connectivity, and large‑scale structural changes.

kisch operates directly on KiCad 9 schematic files. It does not use netlists and does not rely on KiCad’s internal APIs; it reads and rewrites `.kicad_sch` files as data.

## PHILOSOPHY

KiCad used to treat netlists as a first‑class artifact. In modern KiCad, the schematic file itself *is* the source of truth.

kisch embraces this shift.

Instead of exporting, regenerating, or synchronizing netlists, kisch transforms the schematic directly. This enables workflows where:

* Symbols are placed manually in KiCad
* Connectivity is defined programmatically
* Large schematics can be refactored safely and repeatably
* Accidental GUI‑level wiring mistakes are avoided

Think of kisch as a **schema transformation pass** over a KiCad schematic.

## COMMAND LINE INTERFACE

kisch arguments can be understood along **two axes**:

|               | Input             | Output            |
|---------------|-----------------|-----------------|
| **Schematic** | `-i` / positional | `-o` / positional |
| **JavaScript**| `-s`             | `-e`             |

- Positional argument `[inout.kicad_sch]` is a shorthand for both `-i` and `-o`.
- Flags cannot conflict; e.g., positional cannot be used together with `-i` or `-o`.
- Filling a quadrant defines the pipeline: kisch reads that representation, optionally transforms it, and emits the target representation.

### Arguments

```
[inout.kicad_sch]       Schematic to be used as input and output (shorthand for -i and -o)
```

### Options

* `-i, --input <input.kicad_sch>`  
  Input schematic.

* `-o, --output <output.kicad_sch>`  
  Output schematic.

* `-L, --symbol-dir <path>`  
  Where to find KiCad symbols.

* `-s, --script <script.js>`  
  Input JavaScript script to apply to schematic.

* `-e, --emit <script.js>`  
  Emit JavaScript script based on schematic.

* `-D, --define <key=value>`  
  Define variable for the script.

* `-q, --quiet`  
  No output except errors.

* `-h, --help`  
  Display help.

* `--version`  
  Show version.

### Examples

**Transform existing schematic in-place:**
```
$ kisch design.sch --script x.js
```

**Generate script for later use:**
```
$ kisch --input fresh.sch --emit x.js
```

**Load from one file, apply script, and save in another file:**
```
$ kisch --input template.sch --script x.js --output out.sch
```

**Dry-run: just load schematic and apply script, do not save:**
```
$ kisch --input design.sch --script x.js
```

**Generate schematic from script (no input schematic):**
```
$ kisch --script new_design.js --output new_board.sch
```

## SCRIPTING MODEL

kisch executes user-provided JavaScript to transform a schematic loaded by the CLI.  

The script is treated as the **source of truth**: any symbol or connection not present in the script will be removed.  
If the script is empty, the resulting schematic will also be empty. To generate a script that reflects an existing schematic, use the `--emit` flag.

A script typically:

* Adds or modifies symbols
* Connects pins and nets explicitly
* Returns a schematic that kisch will write back to disk (if an output is specified)

Scripts do **not** contain geometric layout information; placement is determined by KiCad or kisch heuristics.

### Example Script

```js
export default async function (sch) {
	let j1 = sch.declare("J1", {
		symbol: "Connector_Generic:Conn_01x04",
		footprint: "TerminalBlock:TerminalBlock_2P_5.08mm_Vertical"
	});

	let j2 = sch.declare("J2", {
		symbol: "Connector_Generic:Conn_01x04",
		footprint: "TerminalBlock:TerminalBlock_2P_5.08mm_Vertical"
	});

	j1.pin(1).connect("GND");
	j1.pin(2).connect("12V");
	j2.pin(1).connect("GND");
	j2.pin(2).connect("12V");
}
```

## SUPPORTED FILES

* KiCad 9 schematic files (`.kicad_sch`)

## UNSUPPORTED FILES

* PCB files (`.kicad_pcb`)
* Netlists (deprecated by design)

## LIMITATIONS

* Only schematic files are supported
* kisch targets **KiCad 9** and above only
* It ensures functional correctness, not placement aesthetics
* Graphical placement quality remains the responsibility of the user

## USE CASES

* Programmatic net and wire generation
* Repetitive schematic patterns
* Safe refactoring of large schematics
* Hybrid GUI + code-driven design workflows

## INSTALLATION

```
npm install -g kisch
```

## LICENSE

GPL v3
