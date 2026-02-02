import Point from "./Point.js";

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
		return this.entity.schematic.arePointsConnected(this.getPoint(),p.getPoint());
	}
}

export default class Entity {
	constructor(sexpr, schematic) {
		this.schematic=schematic;
		this.sexpr=sexpr;
		this.pins=[];

		for (let a of this.sexpr)
			if (Array.isArray(a) && a[0]=="$pin")
				this.pins.push(new EntityPin(a,this));
	}

	async load() {
		let id=this.getLibId();
		if (!id)
			return;

		//console.log("id: "+id);
		this.librarySymbol=await this.schematic.symbolLibrary.loadLibrarySymbol(this.getLibId())
	}

	getReference() {
		for (let a of this.sexpr)
			if (Array.isArray(a) && a[0]=="$property" && a[1]=="Reference")
				return a[2];
	}

	getLibId() {
		for (let a of this.sexpr)
			if (Array.isArray(a) && a[0]=="$lib_id")
				return a[1];
	}

	getAt() {
		for (let a of this.sexpr)
			if (Array.isArray(a) && a[0]=="$at")
				return a.slice(1).map(Number);
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
		return this.sexpr[0].slice(1);
	}

	getConnectionPoints() {
		switch (this.getType()) {
			case "wire":
				return [this.sexpr[1][1].slice(1),this.sexpr[1][2].slice(1)]
				break;

			case "label":
				return []; //implement!!!
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