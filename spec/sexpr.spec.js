import * as sexpr from "../src/sexpr.js";

describe("sexpr",()=>{
	it("can parse and stringify s-expressions",()=>{
		let input=`(symbol "R1" (value "10k") (footprint "Resistor_SMD:R_0805"))`;
		let exp=sexpr.parse(input);
		//console.log(JSON.stringify(exp));
		expect(exp).toEqual([[{"atom":"symbol"},"R1",[{"atom":"value"},"10k"],[{"atom":"footprint"},"Resistor_SMD:R_0805"]]]);
		let output=sexpr.stringify(exp);
		//console.log(output);
	});
});
