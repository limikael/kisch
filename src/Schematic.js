import SymbolLibrary from "./SymbolLibrary.js";
import fs, {promises as fsp} from "fs";
import {parse as sexprParse} from "./sexpr.js";
import Entity from "./Entity.js";
import Point, {pointKey} from "./Point.js";

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

	getEntities() {
		return this.entities;
	}

	getEntity(ref) {
		for (let e of this.entities)
			if (e.getReference()==ref)
				return e;
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
}

export async function openSchematic(fn, options) {
	let schematic=new Schematic(fn, options);
	await schematic.load();

	return schematic;
}