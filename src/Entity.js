import {Point} from "./cartesian-math.js";
import {Sym} from "./sexpr.js";

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
		if (this.isConnected(p))
			return;

		if (typeof p=="string") {
			this.entity.schematic.addLabel(this.getPoint(),p);
		}

		else {
			this.entity.schematic.addConnectionWire(this.getPoint(),p.getPoint());
		}
	}
}

export default class Entity {
	constructor(sexpr, schematic) {
		this.schematic=schematic;
		this.sexpr=sexpr;
		this.pins=[];

		this.getType();

		for (let a of this.sexpr)
			if (Array.isArray(a) && Sym("pin").equals(a[0]))
				this.pins.push(new EntityPin(a,this));
	}

	getSexpr() {
		return this.sexpr;
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
		for (let a of this.sexpr)
			if (Array.isArray(a) && Sym("property").equals(a[0]) && a[1]=="Reference")
				return a[2];
	}

	getLibId() {
		for (let a of this.sexpr)
			if (Array.isArray(a) && Sym("lib_id").equals(a[0]))
				return a[1];
	}

	getAt() {
		for (let a of this.sexpr)
			if (Array.isArray(a) && Sym("at").equals(a[0]))
				return a.slice(1).map(Number);
	}

	getLabel() {
		return this.sexpr[1];
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
		let t=this.sexpr[0].name; //slice(1);

		if (!["symbol","wire","label"].includes(t))
			throw new Error("Unknown entity: "+t);

		return t;
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