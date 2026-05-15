export default class CompoundSymbol {
	constructor(...symbols) {
		this.symbols=symbols;
		this.pins=[];

		for (let symbol of symbols) {
			for (let pin of symbol.pins) {
				//console.log(pin.getNum());

				this.pins.push(pin);
			}
		}
	}

	pin(num) {
		if (!num)
			throw new Error("Pins start at 1");

		return this.pins[num-1];
	}

	namePins(names) {
		if (names.length!=this.pins.length)
			throw new Error("pin count mismatch");

		for (let i=0; i<this.pins.length; i++)
			this[names[i]]=this.pins[i];

		return this;
	}
}

export function compoundSymbol(...args) {
	return new CompoundSymbol(...args);
}