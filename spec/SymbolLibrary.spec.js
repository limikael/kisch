import SymbolLibrary from "../src/SymbolLibrary.js";

describe("SymbolLibrary",()=>{
	it("can load a symbl library",async ()=>{
		let lib=new SymbolLibrary("/home/micke/Repo.ext/kicad-symbols");
		let sym=await lib.loadLibrarySymbol("Connector_Generic:Conn_01x04");

		//console.log(sym);
		//console.log(sym.pins);

		expect(sym.pins.length).toEqual(4);
		//console.log(sym.getPin(1));
		expect(sym.pins[1].at).toEqual([ -5.08, 0, 0 ]);

		//console.log(JSON.stringify(sym.pins[0].sexpr,null,2));
	});
});