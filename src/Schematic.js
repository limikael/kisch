import SymbolLibrary from "./SymbolLibrary.js";
import fs, {promises as fsp} from "fs";
import {parse as sexprParse, stringify as sexprStringify} from "./sexpr.js";
import Entity from "./Entity.js";
import {Point, pointKey, Rect} from "./cartesian-math.js";
import {findGridPath} from "../src/manhattan-router.js";

export default class Schematic {
	constructor(fn, options) {
		this.schematicFileName=fn;
		this.symbolLibraryPath=options.symbolLibraryPath;
		this.symbolLibrary=new SymbolLibrary(this.symbolLibraryPath);
	}

	async load() {
		this.sexpr=sexprParse(await fsp.readFile(this.schematicFileName,"utf8"))[0];
		this.entities=[];

		for (let o of this.sexpr) {
			if (Array.isArray(o) && ["$wire","$label","$symbol"].includes(o[0])) {
				let e=new Entity(o,this);
				await e.load();
				this.entities.push(e);
			}
		}
	}

	getUuid() {
		for (let o of this.sexpr) {
			//console.log(o);
			if (Array.isArray(o) && o[0]=="$uuid")
				return o[1];
		}
	}

	getStrippedSexpr() {
		let sexpr=structuredClone(this.sexpr);

		sexpr=sexpr.filter(el=>{
			if (!Array.isArray(el))
				return true;

			if (["$wire","$label","$symbol"].includes(el[0]))
				return false;

			return true;
		});

		return sexpr;
	}

	getSexpr() {
		let sexpr=this.getStrippedSexpr();
		sexpr.push(...this.entities.map(e=>e.getSexpr()));
		return sexpr;
	}

	async save() {
		let content=sexprStringify([this.getSexpr()]);
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
			let expr=["$wire",
				["$pts", ["$xy",p1[0],p1[1]], ["$xy",p2[0],p2[1]]],
				["$stroke", ["$width",0], ["$type", "$default"]],
				["$uuid",crypto.randomUUID()]
			];

			let e=new Entity(expr,this);
			this.entities.push(e);
		}
	}

	addLabel(point, label) {
		let expr=["$label",label,
			["$at",point[0],point[1],180],
			["$effects",
				["$font",["$size",1.27,1.27]],
				["$justify","$right","$bottom"]
			],
			["$uuid",crypto.randomUUID()]
		]

		let e=new Entity(expr,this);
		this.entities.push(e);
	}

	getLibSymbolsExpr() {
		for (let expr of this.sexpr)
			if (Array.isArray(expr) && expr[0]=="$lib_symbols")
				return expr;
	}

	async ensureLibSymbol(symbol) {
		let libSymbolsExpr=this.getLibSymbolsExpr();
		for (let e of libSymbolsExpr)
			if (Array.isArray(e) && e[0]=="$symbol" && e[1]==symbol)
				return;

		let librarySymbol=await this.symbolLibrary.loadLibrarySymbol(symbol);
		//console.log("adding: "+symbol);
		libSymbolsExpr.push(librarySymbol.getQualifiedSexpr());
	}

	async addSymbol(reference, {symbol}) {
		let librarySymbol=await this.symbolLibrary.loadLibrarySymbol(symbol);
		let point=[78.74,78.74];

		let expr=["$symbol",
			["$lib_id",symbol],
			["$at",point[0],point[1],0],
			["$unit",1],
			["$exclude_from_sim","$no"],
			["$in_bom","$yes"],
			["$on_board","$yes"],
			["$dnp","$no"],
			["$fields_autoplaced","$yes"],
			["$uuid",crypto.randomUUID()]
		];

		expr.push(["$property","Reference",reference,
			["$at",point[0],point[1],0],
			["$effects",
				["$font",["$size",1.27,1.27]],
				["$justify","$left"],
			]
		]);

		for (let i=1; i<=librarySymbol.pins.length; i++)
			expr.push(["$pin",String(i),["$uuid",crypto.randomUUID()]]);

		expr.push(["$instances",
			["$project","",
				["$path","/"+this.getUuid(),
					["$reference",reference],
					["$unit",1]
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