# KISCH(1)

## NAME

kisch - schema‑transformation tool for KiCad schematics

## SYNOPSIS

```
kisch <schema.kicad_sch> [options]
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

Think of kisch as a schema transformation pass over a KiCad schematic.

## COMMAND LINE INTERFACE

The schematic file is the only positional argument.

```
kisch schema.kicad_sch --script=<file> [options]
```

### Options

* `--script=<file>`

  JavaScript file that defines the transformation logic applied to the schematic.

* `--symbol-library-path=<path>`

  Path to a KiCad symbol library used when adding or resolving symbols.

(Additional options may be added over time.)

## SCRIPTING MODEL

kisch is implemented as a Node.js CLI and executes user‑provided JavaScript to perform transformations.

A script typically:

* Loads the schematic structure
* Adds or modifies symbols
* Connects pins and nets explicitly
* Writes the transformed schematic back to disk

The exact scripting API is intentionally minimal and focused on structural operations, not rendering or layout aesthetics.

### Example

The following example hooks up an ESP32-C3 supermini with a CAN transceiver.

```js
export default async function (sch) {
	await sch.use([
		"Connector_Generic:Conn_01x04",
		"Connector_Generic:Conn_02x02_Counter_Clockwise",
		"Connector_Generic:Conn_02x08_Counter_Clockwise",
		"Connector_Generic:Conn_02x04_Counter_Clockwise"
	]);

	let screw1 = sch.declare("J1", {
		symbol: "Connector_Generic:Conn_01x04",
		footprint: "Peabrain:ScrewTerminals_4P",
	});

	let screw2 = sch.declare("J2", {
		symbol: "Connector_Generic:Conn_01x04",
		footprint: "Peabrain:ScrewTerminals_4P",
	});

	let vreg = sch.declare("U1", {
		symbol: "Connector_Generic:Conn_02x02_Counter_Clockwise",
		footprint: "Peabrain:VoltageRegulator",
	});

	let esp32 = sch.declare("U2", {
		symbol: "Connector_Generic:Conn_02x08_Counter_Clockwise",
		footprint: "Peabrain:ESP32",
	});

	let tja1050 = sch.declare("U3", {
		symbol: "Connector_Generic:Conn_02x04_Counter_Clockwise",
		footprint: "Peabrain:TJA1050",
	});

	screw1.pin(1).connect("GND");
	screw1.pin(2).connect("12V");
	screw1.pin(3).connect("CANH");
	screw1.pin(4).connect("CANL");

	screw2.pin(1).connect("GND");
	screw2.pin(2).connect("12V");
	screw2.pin(3).connect("CANH");
	screw2.pin(4).connect("CANL");

	tja1050.pin(1).connect("5V");
	tja1050.pin(2).connect(esp32.pin(1)); // TX
	tja1050.pin(3).connect(esp32.pin(13)); // RX
	tja1050.pin(4).connect("GND");
	tja1050.pin(6).connect("CANL");
	tja1050.pin(7).connect("CANH");

	esp32.pin(16).connect("5V");
	esp32.pin(15).connect("GND");

	vreg.pin(1).connect("12V");
	vreg.pin(2).connect("GND");
	vreg.pin(3).connect("GND");
	vreg.pin(4).connect("5V");
}
```

## SUPPORTED FILES

* KiCad 9 schematic files (`.kicad_sch`)

## UNSUPPORTED FILES

* PCB files (`.kicad_pcb`)
* Netlists (deprecated by design)

## LIMITATIONS

* kisch targets **KiCad 9 only**
* Only schematic files are supported
* kisch cares about schematic geometry just enough to be correct, but not enough to be pretty
* It can place new symbols so that they function correctly (e.g. without overlapping other symbols), but it does not attempt to find the best or most readable placement
* Graphical placement quality remains the responsibility of the user

## USE CASES

* Programmatic net and wire generation
* Repetitive schematic patterns
* Safe refactoring of large schematics
* Hybrid GUI + code‑driven design workflows

## INSTALLATION

kisch is a Node.js‑based CLI. Install with:

```
npm install -g kisch
```

## LICENSE

GPL v3 for now... Haven't thought about it... :)