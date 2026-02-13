import fs, {promises as fsp} from "fs";
import path from "path";
import LibrarySymbol from "./LibrarySymbol.js";
import {sexpParse, sym, isSym, symEq} from "../src/sexp.js";

/**
 * SymbolLibrary represents a directory of .kicad_sym files.
 * You can load a LibrarySymbol by its qualified name like
 * "Connector_Generic:Conn_01x02".
 */
export default class SymbolLibrary {
    constructor(dirPath) {
        this.dirPath = dirPath;
        this.index = null; // lazy create index
        this.cache = new Map(); // Maps libraryName -> parsed list of symbols
        this.librarySymbols={};
    }

    getLibrarySymbol(qualifiedName) {
        if (!this.librarySymbols[qualifiedName])
            throw new Error("Symbol not loaded: "+qualifiedName);

        return this.librarySymbols[qualifiedName];
    }

    loadLibrarySymbolSync(qualifiedName) {
        if (this.librarySymbols[qualifiedName])
            return this.librarySymbols[qualifiedName];

        const [libraryName, symbolName] = qualifiedName.split(":");
        if (!libraryName || !symbolName) {
            throw new Error(
                `Invalid qualified name "${qualifiedName}", expected "Library:Symbol"`
            );
        }

        this._assertIndex();

        const fileName = this.index.get(libraryName);
        if (!fileName) {
            throw new Error(`Library "${libraryName}" not found in ${this.dirPath}`);
        }

        //console.log(libraryName,fileName);

        const syms = this._loadLibraryFileSync(libraryName, fileName);
        const sexpr = syms.find((s) => s[1] === symbolName);
        if (!sexpr) {
            throw new Error(
                `Symbol "${symbolName}" not found in library "${libraryName}"`
            );
        }

        this.librarySymbols[qualifiedName]=new LibrarySymbol(sexpr,qualifiedName);

        return this.librarySymbols[qualifiedName];
    }

    async loadLibrarySymbol(qualifiedName) {
        if (this.librarySymbols[qualifiedName])
            return this.librarySymbols[qualifiedName];

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

        this.librarySymbols[qualifiedName]=new LibrarySymbol(sexpr,qualifiedName);

        return this.librarySymbols[qualifiedName];
    }

    async loadIndex() {
        await this._ensureIndex();
    }

    _assertIndex() {
        if (!this.index)
            throw new Error("Symbol index not loaded");
    }

    /**
     * Scan the directory to find all .kicad_sym files and index them
     * by base name (without extension).
     */
    async _ensureIndex() {
        if (this.index) return;

        this.index = new Map();

        const entries = await fsp.readdir(this.dirPath);
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
        const raw = await fsp.readFile(fullPath, "utf8");
        const sexprs = sexpParse(raw)[0]; // Your sexprParse

        // Filter only top-level (symbol ...) forms
        const symbols = sexprs.filter(
            (e) => Array.isArray(e) && symEq(e[0],"symbol")
        );

        this.cache.set(libraryName, symbols);
        return symbols;
    }

    /**
     * Read and parse a .kicad_sym file if not cached.
     */
    _loadLibraryFileSync(libraryName, fileName) {
        if (this.cache.has(libraryName)) {
            return this.cache.get(libraryName);
        }

        const fullPath = path.join(this.dirPath, fileName);
        const raw = fs.readFileSync(fullPath, "utf8");
        const sexprs = sexpParse(raw)[0]; // Your sexprParse

        // Filter only top-level (symbol ...) forms
        const symbols = sexprs.filter(
            (e) => Array.isArray(e) && symEq(e[0],"symbol")
        );

        this.cache.set(libraryName, symbols);
        return symbols;
    }
}

