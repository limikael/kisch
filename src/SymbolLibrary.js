import fs from "fs/promises";
import path from "path";
import LibrarySymbol from "./LibrarySymbol.js";
import {parse as sexprParse} from "../src/sexpr.js";

/**
 * SymbolLibrary represents a directory of .kicad_sym files.
 * You can load a LibrarySymbol by its qualified name like
 * "Connector_Generic:Conn_01x02".
 */
export default class SymbolLibrary {
    constructor(dirPath) {
        this.dirPath = dirPath;
        this.index = new Map(); // Maps libraryName -> filename
        this.cache = new Map(); // Maps libraryName -> parsed list of symbols
    }

    /**
     * Load the correct LibrarySymbol by full name "Lib:Symbol".
     * @param {string} qualifiedName
     * @returns {Promise<LibrarySymbol>}
     */
    async loadLibrarySymbol(qualifiedName) {
        const [libraryName, symbolName] = qualifiedName.split(":");
        if (!libraryName || !symbolName) {
            throw new Error(
                `Invalid qualified name "${qualifiedName}", expected "Library:Symbol"`
            );
        }

        await this._ensureIndex();

        const fileName = this.index.get(libraryName);
        if (!fileName) {
            throw new Error(`Library "${libraryName}" not found in ${this.dirPath}`);
        }

        //console.log(libraryName,fileName);

        const syms = await this._loadLibraryFile(libraryName, fileName);
        const sexpr = syms.find((s) => s[1] === symbolName);
        if (!sexpr) {
            throw new Error(
                `Symbol "${symbolName}" not found in library "${libraryName}"`
            );
        }

        return new LibrarySymbol(sexpr);
    }

    /**
     * Scan the directory to find all .kicad_sym files and index them
     * by base name (without extension).
     */
    async _ensureIndex() {
        if (this.index.size > 0) return;

        const entries = await fs.readdir(this.dirPath);
        for (const entry of entries) {
            if (entry.endsWith(".kicad_sym")) {
                const libName = path.basename(entry, ".kicad_sym");
                this.index.set(libName, entry);
            }
        }
    }

    /**
     * Read and parse a .kicad_sym file if not cached.
     */
    async _loadLibraryFile(libraryName, fileName) {
        if (this.cache.has(libraryName)) {
            return this.cache.get(libraryName);
        }

        const fullPath = path.join(this.dirPath, fileName);
        const raw = await fs.readFile(fullPath, "utf8");
        const sexprs = sexprParse(raw)[0]; // Your sexprParse

        // Filter only top-level (symbol ...) forms
        const symbols = sexprs.filter(
            (e) => Array.isArray(e) && e[0]?.atom === "symbol"
        );

        this.cache.set(libraryName, symbols);
        return symbols;
    }
}

