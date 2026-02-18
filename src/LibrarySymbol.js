import {sym, isSym, symEq, symName, sexpStringify, sexpCallName} from "./sexp.js";
import {Rect} from "./cartesian-math.js";

export default class LibrarySymbol {
    constructor(sexpr, qualifiedName) {
        this.sexpr = sexpr;
        this._pins = null; // lazy parse
        this.qualifiedName=qualifiedName;
    }

    /**
     * Return all pins as LibrarySymbolPin instances.
     */
    get pins() {
        if (!this._pins) {
            this._pins = [];

            // 1. Find the first nested symbol
            const nestedSymbols = this.sexpr.filter(
                (e) => Array.isArray(e) && symEq(e[0],"symbol") && e !== this.sexpr[0]
            );

            for (let nestedSymbol of nestedSymbols) {
                this._pins.push(...nestedSymbol
                    .filter((e) => Array.isArray(e) && symEq(e[0],"pin"))
                    .map((pinSexpr) => new LibrarySymbolPin(pinSexpr))
                );

            }

            /*if (!nestedSymbol) {
                this._pins = [];
            } else {
                // 2. Collect all (pin ...) inside nested symbol
                this._pins = nestedSymbol
                    .filter((e) => Array.isArray(e) && symEq(e[0],"pin"))
                    .map((pinSexpr) => new LibrarySymbolPin(pinSexpr));
            }*/
        }
        return this._pins;
    }

    /**
     * Get pin by index (0-based) or by pin name.
     */
    getPin(numberOrName) {
        return this.pins.find((p) => p.name === numberOrName || p.number==numberOrName);
    }

    getQualifiedSexpr() {
        let expr=structuredClone(this.sexpr);
        expr[1]=this.qualifiedName;
        return expr;
    }

    getBoundingRect() {
        let rect;

        let symbolExp=this.sexpr.find(x=>sexpCallName(x)=="symbol")
        for (let x of symbolExp) {
            if (sexpCallName(x)=="rectangle") {
                let start=x.find(x=>sexpCallName(x)=="start").slice(1);
                let end=x.find(x=>sexpCallName(x)=="end").slice(1);

                /*console.log(start);
                console.log(end);*/

                let r=Rect.fromCorners(start,end);

                if (!rect)
                    rect=r;

                rect=rect.union(r);
            }

            if (sexpCallName(x)=="polyline") {
                //console.log("poly line...");
                for (let sub of x) {
                    if (sexpCallName(sub)=="pts") {
                        for (let p of sub) {
                            if (sexpCallName(p)=="xy") {
                                let point=[p[1],p[2]];

                                if (!rect)
                                    rect=new Rect(point,[0,0]);

                                console.log("rect",rect);
                                console.log("point",point);

                                rect=rect.includePoint(point);
                            }
                        }
                    }
                }
            }
        }

        if (!rect) {
            //console.log(symbolExp);
            throw new Error("Symbol doesn't have any rect!");
        }

        //console.log(sexpStringify(symbolExp));

        return rect;
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
            if (!Array.isArray(e) || !isSym(e[0])) continue;

            switch (symName(e[0])) {
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
