# Kisch Schematic Script Reference

## Overview

A Kisch schematic is defined as a JavaScript module exporting a default async function:

```js
export default async function (sch, defines) {
    // schematic definition here
}
```

The function receives:

- `sch` — the schematic builder API
- `defines` — an object containing CLI-defined parameters

The script declares symbols (components) and connects their pins using wires or net labels.

# Core Concepts

## 1. Declaring a Component

Use:

```js
sch.declare(reference, options)
```

### Parameters

- `reference` (string)  
  The component reference (e.g., `"R1"`, `"J1"`).

- `options` (object)
  - `symbol` (string, required) — KiCad symbol library identifier  
  - `footprint` (string, optional) — KiCad footprint library identifier  

### Example

```js
let J1 = sch.declare("J1", {
    symbol: "Connector_Generic:Conn_01x02",
    footprint: "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Horizontal"
});
```

`declare()` returns a symbol object.

## 2. Accessing an Existing Symbol

If you did not store the return value from `declare`, you can retrieve it later:

```js
sch.sym("J1")
```

Returns the symbol instance with reference `"J1"`.

## 3. Working with Pins

Access a pin using:

```js
symbol.pin(pinNumber)
```

Example:

```js
J1.pin(2)
```

Returns a pin object.

## 4. Connecting Pins

`connect()` must always be called on a pin object.

It accepts exactly **two argument types**:

- A string → connect to a named net (via net label)
- A pin object → connect directly to another pin (via wire)

No other argument types are supported.

### A) Connecting to a Net (String Argument)

```js
J1.pin(2).connect("GND");
```

Behavior:

- A net label with the given name is created next to the pin (if not already present at that location).
- The pin is connected to that net label.
- The connection is implemented as a 0-length wire between the pin and the label.
- Multiple pins using the same string connect electrically through that net name.

Important:

- This explicitly creates or uses a net label in the schematic.
- This does not implicitly merge abstract nets.
- If you want a named signal, use a string.

### B) Connecting to Another Pin (Pin Object Argument)

```js
J2.pin(1).connect(J1.pin(2));
```

Behavior:

- A wire is created directly between the two pins.
- No net label is created automatically.
- This represents a physical wire in the schematic.

Important:

- Connecting pin-to-pin does NOT create a named net.
- If you want a named net, you must connect using a string.

## 5. Conditional Configuration via `defines`

Scripts can adapt based on CLI-defined values.

### Passing Defines from CLI

```
kisch schema.kicad_sch -s script.js -Dtest=123 --define test2=456
```

Both forms are equivalent:

- `-Dkey=value`
- `--define key=value`

Inside the script:

```js
defines.test   // "123"
defines.test2  // "456"
```

All define values are strings.

### Example Usage

```js
if (defines.test === "123") {
    sch.declare("J6", {
        symbol: "Connector_Generic:Conn_01x04"
    });
}
```

This enables variant-based schematic generation.

# Minimal Complete Example

```js
export default async function (sch, defines) {

    let J1 = sch.declare("J1", {
        symbol: "Connector_Generic:Conn_01x02",
        footprint: "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Horizontal"
    });

    J1.pin(2).connect("GND");

    let J5 = sch.declare("J5", {
        symbol: "Connector_Generic:Conn_01x04"
    });

    J5.pin(1).connect(J1.pin(1));

    if (defines.test === "123") {
        sch.declare("J6", {
            symbol: "Connector_Generic:Conn_01x04"
        });
    }
}
```

# Design Constraints (Important for AI Generation)

When generating Kisch scripts:

- Always export a default async function.
- Always use `sch.declare()` to create components.
- Always access pins using `.pin(n)`.
- Only use `.connect()` with:
  - a string (net name), or
  - a pin object.
- Do not assume additional API methods unless explicitly documented.
- All `defines` values are strings.
- Connecting to a string creates a net label.
- Connecting to a pin creates a direct wire.

# Philosophy

Kisch treats schematics as deterministic, programmable structures.

- Wires are explicit.
- Net labels are explicit.
- There is no hidden net merging.
- Behavior depends strictly on argument type.

This makes schematic generation reproducible, scriptable, and suitable for AI-assisted workflows.
