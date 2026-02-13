import SymbolLibrary from "./SymbolLibrary.js";
import fs, {promises as fsp} from "fs";
import Entity from "./Entity.js";
import {Point, pointKey, Rect} from "./cartesian-math.js";
import {findGridPath} from "../src/manhattan-router.js";
import {isSym, sym, sexpParse, sexpStringify, symName, sexpCallName} from "./sexp.js";
import {placeRect} from "./place-rect.js";
import {arrayUnique} from "./js-util.js";

export default class Schematic {
	constructor(fn, options) {
		this.schematicFileName=fn;
		this.symbolLibraryPath=options.symbolLibraryPath;
		this.symbolLibrary=new SymbolLibrary(this.symbolLibraryPath);
	}

	async load() {
		await this.symbolLibrary.loadIndex();
		this.sexp=sexpParse(await fsp.readFile(this.schematicFileName,"utf8"))[0];
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

	async save() {
		let content=sexpStringify([this.getSexp()],2);
		await fsp.writeFile(this.schematicFileName,content);
	}

	getEntities() {
		return this.entities;
	}

	sym(ref) {
		for (let e of this.entities)
			if (e.getType()=="symbol" && e.getReference()==ref)
				return e;

		throw new Error("Undefined symbol reference: "+ref);
	}

	getSymbolEntities() {
		let entities=[];

		for (let e of this.entities)
			if (e.getType()=="symbol")
				entities.push(e);

		return entities;
	}

	getLabelEntities(label) {
		let entities=[];

		for (let e of this.entities)
			if (e.getType()=="label" && e.getLabel()==label)
				entities.push(e);

		return entities;
	}

	getNets() {
		let nets=this.getEntities()
			.filter(e=>e.getType()=="label")
			.map(e=>e.getLabel());

		nets=arrayUnique(nets);

		return nets;
	}

	getEntitiesByConnectionPoint(connectonPoint) {
		connectonPoint=Point.from(connectonPoint);
		let entities=[];

		for (let e of this.entities) {
			for (let p of e.getConnectionPoints())
				if (connectonPoint.equals(p))
					entities.push(e)
		}

		return entities;
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

			// find all entities touching this point
			const entities = this.getEntitiesByConnectionPoint(point).filter(e=>e.getType()=="wire");

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
		let connectionPoints=this.getConnectionPoints();
		connectionPoints=connectionPoints.filter(p=>!p.equals(fromPoint) && !p.equals(toPoint));
		let avoidRects=connectionPoints.map(p=>new Rect(p.sub([0.635,0.635]),[1.27,1.27]));

		let avoidLines=this.entities.filter(e=>e.getType()=="wire").map(e=>{
			return ({
				a: e.getConnectionPoints()[0],
				b: e.getConnectionPoints()[1],
			})
		});

		//console.log(avoidLines);

		let points=findGridPath({
			from: fromPoint,
			to: toPoint,
			gridSize: 1.27,
			avoidRects: avoidRects,
			avoidLines: avoidLines
		});

		for (let i=0; i<points.length-1; i++) {
			let p1=points[i], p2=points[i+1];
			let expr=[sym("wire"),
				[sym("pts"), [sym("xy"),p1[0],p1[1]], [sym("xy"),p2[0],p2[1]]],
				[sym("stroke"), [sym("width"),0], [sym("type"), sym("default")]],
				[sym("uuid"),crypto.randomUUID()]
			];

			let e=new Entity(expr,this);
			this.entities.push(e);
		}
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
		//return sexpFirst(this.sexpr,x=>sexpCallName(x)=="lib_symbols")

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

	async use(...symbols) {
		symbols=symbols.flat(Infinity);
		for (let symbol of symbols)
			await this.ensureLibSymbol(symbol);
	}

	declare(ref, options) {
		let entity=this.entities.find(e=>e.getType()=="symbol" && e.getReference()==ref);
		if (!entity)
			entity=this.addSymbol(ref,options);

		if (entity.getLibId()!=options.symbol)
			throw new Error("Symbol declaration mismatch, code: "+options.symbol+" existing in schema: "+entity.getLibId()+" ref: "+ref);

		entity.setFootprint(options.footprint);
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
		let rects=this.getSymbolEntities().map(e=>e.getBoundingRect().pad(2.54*4));

		let center=new Point(101.6,101.6);
		if (rects.length)
			center=rects.reduce((r,q)=>r.union(q)).getCenter().snap(2.54);

		if (!at) {
			at=placeRect({
				start: center,
				rect: librarySymbol.getBoundingRect(),
				avoid: rects,
				step: 2.54,
			});
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
		for (let e of this.getSymbolEntities()) {
			src+=`    let ${e.getReference()}=sch.declare("${e.getReference()}",{\n`;
			src+=`        "symbol": "${e.getLibId()}",\n`
			src+=`        "footprint": "${e.getFootprint()}",\n`
			src+=`    });\n\n`;
		}

		let allConnectionPoints=this.getConnectionPoints();
		for (let e of this.getSymbolEntities()) {
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
}

export async function openSchematic(fn, options) {
	let schematic=new Schematic(fn, options);
	await schematic.load();

	return schematic;
}