import * as sexpr from "../src/sexpr.js";

describe("sexpr",()=>{
	it("can parse and stringify s-expressions",()=>{
		let input=`(symbol "R1" (value "10k") (footprint "Resistor_SMD:R_0805"))`;
		let exp=sexpr.parse(input);
		//console.log(exp);

		let output=sexpr.stringify(exp);
		//console.log(output);

		expect(output).toEqual(`(symbol "R1" (value "10k") (footprint "Resistor_SMD:R_0805"))`);
	});
});
