import {Point} from "./cartesian-math.js";
import {sym, symName, sexpCallName} from "./sexp.js";
import {Rect} from "./cartesian-math.js";

class EntityPin {
	constructor(sexpr, entity) {
		this.sexpr=sexpr;
		this.entity=entity;

		//console.log(this.sexpr);
	}

	getNum() {
		return this.sexpr[1];
	}

	getPoint() {
		let librarySymbol=this.entity.getLibrarySymbol();
		let librarySymbolPin=librarySymbol.getPin(Number(this.getNum()));
		let pinAt=Point.from(librarySymbolPin.at);
		pinAt[1]=-pinAt[1];

		return Point.from(this.entity.getAt()).add(pinAt);
	}

	isConnected(p) {
		if (typeof p=="string") {
			for (let e of this.entity.schematic.getLabelEntities(p)) {
				let p=e.getConnectionPoints()[0];
				if (this.entity.schematic.arePointsConnected(this.getPoint(),p))
					return true;
			}

			return false;
		}

		else {
			return this.entity.schematic.arePointsConnected(this.getPoint(),p.getPoint());
		}
	}

	connect(p) {
		if (this.isConnected(p)) {
			if (typeof p=="string") {
				for (let e of this.entity.schematic.getLabelEntities(p)) {
					let p=e.getConnectionPoints()[0];
					if (this.entity.schematic.arePointsConnected(this.getPoint(),p)) {
						e.declared=true;
						this.entity.schematic.markConnectionDeclared(this.getPoint(),p);
					}
				}
			}

			else {
				this.entity.schematic.markConnectionDeclared(this.getPoint(),p.getPoint());
			}

			return;
		}

		if (typeof p=="string") {
			let l=this.entity.schematic.addLabel(this.getPoint(),p);
			l.declared=true;
		}

		else {
			this.entity.schematic.addConnectionWire(this.getPoint(),p.getPoint());
			this.entity.schematic.markConnectionDeclared(this.getPoint(),p.getPoint());
		}
	}
}

export default class Entity {
	constructor(sexpr, schematic) {
		this.schematic=schematic;
		this.sexpr=sexpr;
		this.pins=[];

		this.type=symName(this.sexpr[0]);
		if (!["symbol","wire","label"].includes(this.type))
			throw new Error("Unknown entity: "+this.type);

		for (let a of this.sexpr)
			if (sexpCallName(a)=="pin")
				this.pins.push(new EntityPin(a,this));
	}

	getSexp() {
		return this.sexpr;
	}

	init() {
		if (this.getType()!="symbol")
			return;

		let id=this.getLibId();
		if (!id)
			throw new Error("Unable to load symbol");

		//console.log("id: "+id);
		this.librarySymbol=this.schematic.symbolLibrary.getLibrarySymbol(this.getLibId())
		if (!this.librarySymbol)
			throw new Error("Unable to load symbol");
	}

	async load() {
		if (this.getType()!="symbol")
			return;

		let id=this.getLibId();
		if (!id)
			throw new Error("Unable to load symbol");

		//console.log("id: "+id);
		this.librarySymbol=await this.schematic.symbolLibrary.loadLibrarySymbol(this.getLibId())
		if (!this.librarySymbol)
			throw new Error("Unable to load symbol");
	}

	getReference() {
		if (this.getType()!="symbol")
			return;

		let el=this.sexpr.find(a=>sexpCallName(a)=="property" && a[1]=="Reference");
		return el[2];
	}

	getLibId() {
		return this.sexpr.find(x=>sexpCallName(x)=="lib_id")[1];
	}

	getAt() {
		for (let a of this.sexpr)
			if (sexpCallName(a)=="at")
				return a.slice(1).map(Number);
	}

	getLabel() {
		if (this.getType()!="label")
			throw new Error("Not a label");

		return this.sexpr[1];
	}

	getBoundingRect() {
		//console.log(this.librarySymbol);
		let r=this.librarySymbol.getBoundingRect();
		//console.log(r);
		let p=Point.from(this.getAt());

		return new Rect(p.add(r.corner),r.size);
	}

	getLibrarySymbol() {
		return this.librarySymbol;
	}

	pin(num) {
		if (!num)
			throw new Error("Pin numbers start at 1");

		for (let p of this.pins)
			if (p.getNum()==num)
				return p;
	}

	getType() {
		return this.type;
		/*let t=symName(this.sexpr[0]);

		if (!["symbol","wire","label"].includes(t))
			throw new Error("Unknown entity: "+t);

		return t;*/
	}

	getConnectionPoints() {
		switch (this.getType()) {
			case "wire":
				return [this.sexpr[1][1].slice(1),this.sexpr[1][2].slice(1)]
				break;

			case "label":
				return [this.sexpr[2].slice(1)];
				break;

			case "symbol":
				let p=[];
				for (let i=1; i<=this.pins.length; i++)
					p.push(this.pin(i).getPoint());

				return p;
				break;

			default:
				throw new Error("Unknown entity type: "+this.getType());
		}
	}
}