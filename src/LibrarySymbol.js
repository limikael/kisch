export default class LibrarySymbol {
  constructor(sexpr) {
    this.sexpr = sexpr;
    this._pins = null; // lazy parse
  }

  /**
   * Return all pins as LibrarySymbolPin instances.
   */
  get pins() {
    if (!this._pins) {
      // 1. Find the first nested symbol
      const nestedSymbol = this.sexpr.find(
        (e) => Array.isArray(e) && e[0]?.atom === "symbol" && e !== this.sexpr[0]
      );

      if (!nestedSymbol) {
        this._pins = [];
      } else {
        // 2. Collect all (pin ...) inside nested symbol
        this._pins = nestedSymbol
          .filter((e) => Array.isArray(e) && e[0]?.atom === "pin")
          .map((pinSexpr) => new LibrarySymbolPin(pinSexpr));
      }
    }
    return this._pins;
  }

  /**
   * Get pin by index (0-based) or by pin name.
   */
  getPin(indexOrName) {
    if (typeof indexOrName === "number") {
      return this.pins[indexOrName];
    } else {
      return this.pins.find((p) => p.name === indexOrName);
    }
  }
}

export class LibrarySymbolPin {
  constructor(sexpr) {
    this.sexpr = sexpr;
    this.type = sexpr[1]; // e.g., "passive"
    this.shape = sexpr[2]; // e.g., "line"

    // parse attributes
    this.at = [0, 0, 0];
    this.length = 0;
    this.name = null;
    this.number = null;

    for (const e of sexpr.slice(3)) {
      if (!Array.isArray(e) || !e[0]?.atom) continue;

      switch (e[0].atom) {
        case "at":
          this.at = e.slice(1).map(Number); // [x, y, rotation]
          break;
        case "length":
          this.length = Number(e[1]);
          break;
        case "name":
          this.name = e[1];
          break;
        case "number":
          this.number = e[1];
          break;
      }
    }
  }
}
