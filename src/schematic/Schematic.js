import SymbolLibrary from "./SymbolLibrary.js";
import fs, {promises as fsp} from "fs";
import Entity from "./Entity.js";
import {Point, pointKey, Rect} from "../utils/cartesian-math.js";
import RoutingGrid from "../utils/RoutingGrid.js";
import {isSym, sym, sexpParse, sexpStringify, symName, sexpCallName} from "../utils/sexp.js";
import {placeRect} from "../utils/place-rect.js";
import {arrayUnique} from "../utils/js-util.js";

export default class Schematic {
	constructor(options) {
		if (typeof options=="string")
			throw new Error("just pass options!!!");

		this.symbolLibraryPath=options.symbolLibraryPath;
		this.symbolLibrary=new SymbolLibrary(this.symbolLibraryPath);
	}

	async init() {
		await this.symbolLibrary.loadIndex();
		this.entities=[];
		this.uuid=crypto.randomUUID();

		this.sexp=[sym("kicad_sch"),
			[sym("version"),sym("20250114")],
			[sym("generator"),"eeschema"],
			[sym("generator_version"),"9.0"],
			[sym("paper"),"A4"],
			[sym("lib_symbols")]
		];
	}

	async load(fn) {
		await this.init();

		//this.schematicFileName=fn;
		this.sexp=sexpParse(await fsp.readFile(fn,"utf8"))[0];
		this.entities=[];

		for (let o of this.sexp) {
			if (["wire","label","symbol"].includes(sexpCallName(o))) {
				let e=new Entity(o,this);
				await e.load();
				this.entities.push(e);
			}

			if (sexpCallName(o)=="uuid")
				this.uuid=o[1];
		}

		this.sexp=this.sexp.filter(o=>!["wire","label","symbol","uuid"].includes(sexpCallName(o)));
	}

	getSexp() {
		let sexp=structuredClone(this.sexp);
		sexp.push(...this.entities.map(e=>e.getSexp()));
		sexp.push([sym("uuid"),this.uuid]);
		return sexp;
	}

	async save(fn) {
		let content=sexpStringify([this.getSexp()],2);
		await fsp.writeFile(fn,content);
	}

	// filter: type connectionPoint label
	getEntities(filter={}) {
		if (filter.label)
			filter.type="label";

		return this.entities.filter(e=>{
			if (filter.type && e.getType()!=filter.type)
				return false;

			if (filter.label && e.getLabel()!=filter.label)
				return false;

			if (filter.connectionPoint) {
				let cp=Point.from(filter.connectionPoint);
				let found=false;
				for (let p of e.getConnectionPoints())
					if (cp.equals(p))
						found=true;

				if (!found)
					return false;
			}

			return true;
		});
	}

	sym(ref) {
		for (let e of this.entities)
			if (e.getType()=="symbol" && e.getReference()==ref)
				return e;

		throw new Error("Undefined symbol reference: "+ref);
	}

	getConnectionPoints() {
		let points=[];
		for (let e of this.entities)
			points.push(...e.getConnectionPoints());

		points=points.map(p=>Point.from(p));
		return points;
	}

	arePointsConnected(p, q) {
		return (!!this.getConnectionPath(p,q));
	}

	getConnectionPath(p, q) {
		const startKey = pointKey(p);
		const targetKey = pointKey(q);

		// trivial case
		if (startKey === targetKey) return [];

		const visitedPoints = new Set();
		const queue = [];

		// each item: { point, path }
		queue.push({
			point: p,
			path: []
		});

		while (queue.length > 0) {
			const { point, path } = queue.shift();
			const key = pointKey(point);

			if (visitedPoints.has(key)) continue;
			visitedPoints.add(key);

			// find all wires touching this point
			const entities=this.getEntities({type: "wire", connectionPoint: point});

			for (const entity of entities) {
				const connectionPoints = entity.getConnectionPoints();

				for (const cp of connectionPoints) {
					const cpKey = pointKey(cp);

					if (visitedPoints.has(cpKey)) continue;

					const newPath = path.concat(entity);

					// found target
					if (cpKey === targetKey) {
						return newPath;
					}

					queue.push({
						point: cp,
						path: newPath
					});
				}
			}
		}

		// no path found
		return null;
	}

	addConnectionWire(fromPoint, toPoint) {
		let grid=new RoutingGrid({spacing: 1.27});
		for (let sym of this.getEntities({type: "symbol"})) {
			let r=sym.getBoundingRect();
			grid.drawRect(r.getLeft(),r.getTop(),r.getRight(),r.getBottom());

			for (let pin of sym.getPins()) {
				let point=pin.getPoint();
				let legPoint=pin.getLegPoint();
				grid.drawLine(point[0],point[1],legPoint[0],legPoint[1]);
			}
		}

		for (let wire of this.getEntities({type: "wire"})) {
			let [p1,p2]=wire.getConnectionPoints();
			grid.drawLine(p1[0],p1[1],p2[0],p2[1]);
		}

		let startPoints=[fromPoint,...this.getConnectedWirePoints(fromPoint)];
		let goalPoints=[toPoint,...this.getConnectedWirePoints(toPoint)];

		for (let p of [...startPoints,...goalPoints])
			grid.clearPoint(p[0],p[1]);

		let points=grid.findPath({
			start: startPoints.map(p=>({x: p[0], y: p[1]})),
			goal: goalPoints.map(p=>({x: p[0], y: p[1]})),
		});

		this.addJunctionIfNeeded(new Point(points[0]));
		this.addJunctionIfNeeded(new Point(points[points.length-1]));

		for (let i=0; i<points.length-1; i++) {
			let p1=new Point(points[i]), p2=new Point(points[i+1]);
			let expr=[sym("wire"),
				[sym("pts"), [sym("xy"),p1[0],p1[1]], [sym("xy"),p2[0],p2[1]]],
				[sym("stroke"), [sym("width"),0], [sym("type"), sym("default")]],
				[sym("uuid"),crypto.randomUUID()]
			];

			let e=new Entity(expr,this);
			this.entities.push(e);
		}
	}

	addJunctionIfNeeded(p) {
		p=new Point(p);
		if (this.getEntities({connectionPoint: p, type: "symbol"}).length)
			return;

		this.splitWire(p);
		this.addJunction(p);
	}

	splitWire(p) {
		for (let e of this.getEntities({type: "wire"})) {
			if (e.containsPoint(p)) {
				let cp=e.getConnectionPoints();
				this.drawWireLine(cp[0],p);
				this.drawWireLine(p,cp[1]);
				this.removeEntity(e);
				//console.log("found it!!");
				return;
			}
		}

		throw new Error("No wire to split");
	}

	addJunction(p) {
		let expr=[sym("junction"),
			[sym("at"),p[0],p[1]],
			[sym("diameter"),0],
			[sym("color"),0,0,0,0],
			[sym("uuid"),crypto.randomUUID()]
		];

		let e=new Entity(expr,this);
		this.entities.push(e);
	}

	getConnectedWires(connectionPoint) {
		let points=[Point.from(connectionPoint)];
		let entities=[];

		while (points.length) {
			let p=Point.from(points.pop());
			//console.log(p);
			for (let e of this.getEntities({type: "wire", connectionPoint: p})) {
				if (!entities.includes(e)) {
					entities.push(e);
					points.push(...e.getConnectionPoints());
				}
			}
		}

		return entities;
	}

	getConnectedWirePoints(connectionPoint) {
		let wires=this.getConnectedWires(connectionPoint);
		let grid=new RoutingGrid({spacing: 1.27});
		for (let w of wires) {
			let p=w.getConnectionPoints();
			grid.drawLine(p[0][0],p[0][1],p[1][0],p[1][1]);
		}

		return grid.getPoints().map(p=>[p.x,p.y]);
	}

	drawWireLine(p1, p2) {
		let expr=[sym("wire"),
			[sym("pts"), [sym("xy"),p1[0],p1[1]], [sym("xy"),p2[0],p2[1]]],
			[sym("stroke"), [sym("width"),0], [sym("type"), sym("default")]],
			[sym("uuid"),crypto.randomUUID()]
		];

		this.entities.push(new Entity(expr,this));
	}

	drawWireRect(r) {
		this.drawWireLine([r.getLeft(),r.getTop()], [r.getRight(),r.getTop()]);
		this.drawWireLine([r.getRight(),r.getTop()], [r.getRight(),r.getBottom()]);
		this.drawWireLine([r.getRight(),r.getBottom()], [r.getLeft(),r.getBottom()]);
		this.drawWireLine([r.getLeft(),r.getBottom()], [r.getLeft(),r.getTop()]);
	}

	drawWirePoint(p) {
		p=new Point(p);
		this.drawWireRect(new Rect(p.sub([0.25,0.25]),[0.5,0.5]));
	}

	addLabel(point, label) {
		let expr=[sym("label"),label,
			[sym("at"),point[0],point[1],180],
			[sym("effects"),
				[sym("font"),[sym("size"),1.27,1.27]],
				[sym("justify"),sym("right"),sym("bottom")]
			],
			[sym("uuid"),crypto.randomUUID()]
		]

		let e=new Entity(expr,this);
		this.entities.push(e);
		return e;
	}

	getLibSymbolsExp() {
		for (let exp of this.sexp)
			if (sexpCallName(exp)=="lib_symbols")
				return exp;
	}

	async ensureLibSymbol(symbol) {
		let libSymbolsExpr=this.getLibSymbolsExp();
		for (let e of libSymbolsExpr)
			if (sexpCallName(e)=="symbol" && e[1]==symbol)
				return;

		let librarySymbol=await this.symbolLibrary.loadLibrarySymbol(symbol);
		//console.log("adding: "+symbol);
		libSymbolsExpr.push(librarySymbol.getQualifiedSexpr());
	}

	ensureLibSymbolSync(symbol) {
		let libSymbolsExpr=this.getLibSymbolsExp();
		for (let e of libSymbolsExpr)
			if (sexpCallName(e)=="symbol" && e[1]==symbol)
				return;

		let librarySymbol=this.symbolLibrary.loadLibrarySymbolSync(symbol);
		//console.log("adding: "+symbol);
		libSymbolsExpr.push(librarySymbol.getQualifiedSexpr());
	}

	declare(ref, options) {
		let entity=this.entities.find(e=>e.getType()=="symbol" && e.getReference()==ref);
		if (!entity)
			entity=this.addSymbol(ref,options);

		if (entity.getLibId()!=options.symbol)
			throw new Error("Symbol declaration mismatch, code: "+options.symbol+" existing in schema: "+entity.getLibId()+" ref: "+ref);

		this.ensureLibSymbolSync(options.symbol);

		entity.setFootprint(options.footprint);

		if (options.name)
			entity.setName(options.name);

		if (options.lcsc)
			entity.setProp("lcsc",options.lcsc);

		else
			entity.removeProp("lcsc");

		if (options.lcscRot)
			entity.setProp("lcscRot",String(options.lcscRot));

		else
			entity.removeProp("lcscRot");

		entity.declared=true;

		return entity;
	}

	addSymbol(reference, {symbol, at}) {
		let entity=this.entities.find(e=>e.getType()=="symbol" && e.getReference()==reference);
		if (entity)
			throw new Error("Reference already exists: "+reference);

		//let librarySymbol=this.symbolLibrary.getLibrarySymbol(symbol);
		let librarySymbol=this.symbolLibrary.loadLibrarySymbolSync(symbol);

		//let librarySymbol=await this.symbolLibrary.loadLibrarySymbol(symbol);
		let rects=this.getEntities({type: "symbol"}).map(e=>e.getBoundingRect().pad(2.54*4));

		let center=new Point(101.6,101.6);
		if (rects.length)
			center=rects.reduce((r,q)=>r.union(q)).getCenter().snap(2.54);

		if (!at) {
			//console.log("place: ",librarySymbol.getBoundingRect());
			//console.log(rects);
			at=placeRect({
				start: center,
				rect: librarySymbol.getBoundingRect(),
				avoid: rects,
				step: 2.54,
			});
			//console.log("placed!");
		}

		let expr=[sym("symbol"),
			[sym("lib_id"),symbol],
			[sym("at"),at[0],at[1],0],
			[sym("unit"),1],
			[sym("exclude_from_sim"),sym("no")],
			[sym("in_bom"),sym("yes")],
			[sym("on_board"),sym("yes")],
			[sym("dnp"),sym("no")],
			[sym("fields_autoplaced"),sym("yes")],
			[sym("uuid"),crypto.randomUUID()]
		];

		expr.push([sym("property"),"Reference",reference,
			[sym("at"),at[0],at[1],0],
			[sym("effects"),
				[sym("font"),[sym("size"),1.27,1.27]],
				[sym("justify"),sym("left")],
			]
		]);

		for (let i=1; i<=librarySymbol.pins.length; i++)
			expr.push([sym("pin"),String(i),[sym("uuid"),crypto.randomUUID()]]);

		expr.push([sym("instances"),
			[sym("project"),"",
				[sym("path"),"/"+this.uuid,
					[sym("reference"),reference],
					[sym("unit"),1]
				]
			]
		]);

		let e=new Entity(expr,this);
		e.init();
		this.entities.push(e);

		return e;
	}

	markConnectionDeclared(from, to) {
		let wires=this.getConnectionPath(from,to);
		if (!wires) {
			console.log("wires?");
			console.log(wires);
			return;
		}

		for (let wire of wires) {
			if (wire.getType()!="wire")
				throw new Error("Sanity check... Wire is not a wire...");

			wire.declared=true;
		}
	}

	removeUndeclared() {
		this.entities=this.entities.filter(entity=>{
			return entity.declared;
		});
	}

	getSource() {
		let src="";
		src+=`export default async function(sch) {\n`;
		for (let e of this.getEntities({type: "symbol"})) {
			src+=`    let ${e.getReference()}=sch.declare("${e.getReference()}",{\n`;
			src+=`        "symbol": "${e.getLibId()}",\n`
			src+=`        "footprint": "${e.getFootprint()}",\n`
			src+=`    });\n\n`;
		}

		let allConnectionPoints=this.getConnectionPoints();
		for (let e of this.getEntities({type: "symbol"})) {
			for (let pin of e.pins) {
				for (let c of pin.getConnections()) {
					if (typeof c=="string") {
						src+=`    ${e.getReference()}.pin(${pin.getNum()}).connect("${c}");\n`;
					}

					else {
						if (e.getReference()<c.entity.getReference()) {
							src+=`    ${e.getReference()}.pin(${pin.getNum()}).connect(`;
							src+=`${c.entity.getReference()}.pin(${c.getNum()})`;
							src+=`);\n`;
						}
					}
				}
			}
		}

		src+=`}\n`;

		return src;
	}

	removeEntity(removable) {
		this.entities=this.entities.filter(e=>e!=removable);
	}
}

export async function loadSchematic(fn, options) {
	let schematic=new Schematic(options);
	await schematic.load(fn);

	return schematic;
}

export async function createSchematic(options) {
	let schematic=new Schematic(options);
	await schematic.init();

	return schematic;
}
