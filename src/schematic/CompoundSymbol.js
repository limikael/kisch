export default class CompoundSymbol {
	constructor(...symbols) {
		this.symbols=symbols;
		this.pins=[];

		for (let symbol of symbols) {
			let pinNums=symbol.getPinNums();
			pinNums.sort();

			for (let pinNum of pinNums) {
				this.pins.push(symbol.pin(pinNum));
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