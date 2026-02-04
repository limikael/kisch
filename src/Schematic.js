import SymbolLibrary from "./SymbolLibrary.js";
import fs, {promises as fsp} from "fs";
import Entity from "./Entity.js";
import {Point, pointKey, Rect} from "./cartesian-math.js";
import {findGridPath} from "../src/manhattan-router.js";
import {isSym, sym, sexpParse, sexpStringify, symName, sexpCallName} from "./sexp.js";

export default class Schematic {
	constructor(fn, options) {
		this.schematicFileName=fn;
		this.symbolLibraryPath=options.symbolLibraryPath;
		this.symbolLibrary=new SymbolLibrary(this.symbolLibraryPath);
	}

	async load() {
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

	getEntity(ref) {
		for (let e of this.entities)
			if (e.getReference()==ref)
				return e;
	}

	getLabelEntities(label) {
		let entities=[];

		for (let e of this.entities)
			if (e.getLabel()==label)
				entities.push(e);

		return entities;
	}

	entity(ref) {
		return this.getEntity(ref);
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
		//console.log(points);

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
		let points=findGridPath({
			from: fromPoint,
			to: toPoint,
			gridSize: 1.27,
			avoidRects: avoidRects
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

	async addSymbol(reference, {symbol}) {
		let librarySymbol=await this.symbolLibrary.loadLibrarySymbol(symbol);
		let point=[78.74,78.74];

		let expr=[sym("symbol"),
			[sym("lib_id"),symbol],
			[sym("at"),point[0],point[1],0],
			[sym("unit"),1],
			[sym("exclude_from_sim"),sym("no")],
			[sym("in_bom"),sym("yes")],
			[sym("on_board"),sym("yes")],
			[sym("dnp"),sym("no")],
			[sym("fields_autoplaced"),sym("yes")],
			[sym("uuid"),crypto.randomUUID()]
		];

		expr.push([sym("property"),"Reference",reference,
			[sym("at"),point[0],point[1],0],
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
		await e.load();
		this.entities.push(e);

		await this.ensureLibSymbol(symbol);
	}
}

export async function openSchematic(fn, options) {
	let schematic=new Schematic(fn, options);
	await schematic.load();

	return schematic;
}