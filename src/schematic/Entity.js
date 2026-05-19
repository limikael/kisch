import {Point, Rect} from "../utils/cartesian-math.js";
import {sym, symName, sexpCallName} from "../utils/sexp.js";

class EntityPin {
	constructor(sexpr, entity) {
		this.sexpr=sexpr;
		this.entity=entity;

		//console.log("ctor pin num: "+this.sexpr[1]);
	}

	getNum() {
		//console.log("pin num: "+this.sexpr[1]);

		return this.sexpr[1];
	}

	initPoint() {
		let librarySymbol=this.entity.getLibrarySymbol();
		let librarySymbolPin;
		if (isNaN(this.getNum()))
			librarySymbolPin=librarySymbol.getPin(this.getNum());

		else
			librarySymbolPin=librarySymbol.getPin(Number(this.getNum()));

		let pinAt=Point.from(librarySymbolPin.at);
		let symbolAt=this.entity.getAt();
		let symbolRot=this.entity.getRotation();
		pinAt[1]=-pinAt[1];

		//this.point=Point.from(symbolAt).add(pinAt.rotateDegrees(-symbolAt[2]));
		//this.point=Point.from(symbolAt).add(pinAt.rotateDegrees(-this.entity.getRotation()));
		this.point=Point.from(symbolAt).add(pinAt.rotateDegrees(-symbolRot));

		let leg=new Point(librarySymbolPin.length,0);
		leg=leg.rotateDegrees(-(librarySymbolPin.rotation+symbolRot));
		this.legPoint=this.point.add(leg);
	}

	getLegPoint() {
		if (!this.legPoint)
			this.initPoint();

		return this.legPoint;
	}

	getPoint() {
		if (!this.point)
			this.initPoint();

		return this.point;
	}

	isConnected(p) {
		if (typeof p=="string") {
			for (let e of this.entity.schematic.getEntities({label: p})) {
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
		if (!p)
			return;

		if (this.isConnected(p)) {
			if (typeof p=="string") {
				for (let e of this.entity.schematic.getEntities({label: p})) {
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
			//console.log("connecting wire",this.toString(),"->",p.toString());
			this.entity.schematic.addConnectionWire(this.getPoint(),p.getPoint());
			this.entity.schematic.markConnectionDeclared(this.getPoint(),p.getPoint());
		}
	}

	toString() {
		return this.entity.getReference()+":"+this.getNum();
	}

	getConnections() {
		let connections=[];

		for (let net of this.entity.schematic.getNets()) {
			if (this.isConnected(net))
				connections.push(net);
		}

		for (let e of this.entity.schematic.getEntities({type: "symbol"})) {
			if (e==this.entity)
				continue;

			for (let p of e.pins)
				if (this.isConnected(p))
					connections.push(p);
		}

		return connections;
	}
}

export default class Entity {
	constructor(sexpr, schematic) {
		this.schematic=schematic;
		this.sexpr=sexpr;
		this.pins=[];

		this.type=symName(this.sexpr[0]);
		if (!["symbol","wire","label","junction"].includes(this.type))
			throw new Error("Unknown entity: "+this.type);

		for (let a of this.sexpr)
			if (sexpCallName(a)=="pin")
				this.pins.push(new EntityPin(a,this));
	}

	getRotation() {
		return this.getAt()[2];
	}

	getPins() {
		return this.pins;
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

	getFootprint() {
		if (this.getType()!="symbol")
			throw new Error("Only symbols have footprints");

		let el=this.sexpr.find(a=>sexpCallName(a)=="property" && a[1]=="Footprint");
		if (!el)
			return "";

		return el[2];
	}

	setFootprint(footprint) {
		if (this.getType()!="symbol")
			throw new Error("Only symbols have footprints");

		if (!footprint)
			footprint="";

		let el=this.sexpr.find(a=>sexpCallName(a)=="property" && a[1]=="Footprint");
		if (!el) {
			let exp=[sym("property"),"Footprint","",
				[sym("effects"),
					[sym("hide"),sym("yes")]
				]
			];

			this.sexpr.push(exp);
			el=exp;
		}

		el[2]=footprint;
	}

	removeProp(name) {
		if (this.getType()!="symbol")
			throw new Error("Only symbols have props");

		let index=this.sexpr.findIndex(a=>sexpCallName(a)=="property" && a[1]==name);
		if (index<0)
			return;

		this.sexpr.splice(index,1);
	}

	setProp(name, value) {
		if (this.getType()!="symbol")
			throw new Error("Only symbols have props");

		let el=this.sexpr.find(a=>sexpCallName(a)=="property" && a[1]==name);
		if (!el) {
			let exp=[sym("property"),name,"",
				[sym("effects"),
					[sym("hide"),sym("yes")]
				]
			];

			this.sexpr.push(exp);
			el=exp;
		}

		el[2]=value;
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
		if (!this.librarySymbol)
			throw new Error("Can't get bounding rect, no library symbol");

		//console.log(this.librarySymbol);
		let r=this.librarySymbol.getBoundingRect();
		let corner=r.corner.rotateDegrees(-this.getRotation());
		let size=r.size.rotateDegrees(-this.getRotation());

		//console.log(r);
		let p=Point.from(this.getAt());

		return new Rect(p.add(corner),size);
	}

	getLibrarySymbol() {
		return this.librarySymbol;
	}

	pin(num) {
		if (!num)
			throw new Error("Pin numbers start at 1");

		for (let p of this.pins) {
			//console.log("pin num: "+p.getNum());

			if (p.getNum()==num)
				return p;
		}

		throw new Error("Can't find pin: "+num);
	}

	getType() {
		return this.type;
	}

	getPinNums() {
		let nums=[];
		for (let p of this.pins)
			nums.push(p.getNum())

		return nums;
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
				for (let num of this.getPinNums())
					p.push(this.pin(num).getPoint());

				/*for (let i=1; i<=this.pins.length; i++)
					p.push(this.pin(i).getPoint());*/

				return p;
				break;

			default:
				throw new Error("Unknown entity type: "+this.getType());
		}
	}

	connect(...pins) {
		if (this.getType()!="symbol")
			throw new Error("can only connect symbols");

		if (pins.length!=this.pins.length)
			throw new Error("pin count mismatch");

		for (let i=0; i<this.pins.length; i++)
			this.pins[i].connect(pins[i]);
	}

	containsPoint(p) {
		function isNumberInRangeInclusive(num, a, b) {
		    return ((num >= Math.min(a, b)) && (num <= Math.max(a, b)));
		}

		if (this.getType()!="wire")
			throw new Error("Only a wire can contain points");

		p=Point.from(p);
		let cp=this.getConnectionPoints();
		if (cp[0][0]==cp[1][0]) { // vertical
			if (p[0]!=cp[0][0])
				return false;

			return isNumberInRangeInclusive(p[1],cp[0][1],cp[1][1]);
		}

		else if (cp[0][1]==cp[1][1]) { // horizontal
			if (p[1]!=cp[0][1])
				return false;

			return isNumberInRangeInclusive(p[0],cp[0][0],cp[1][0]);
		}

		else 
			throw new Error("wire is not horizontal or vertical");
	}
}