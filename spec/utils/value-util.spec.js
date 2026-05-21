import {valueParse, valueStringify} from "../../src/utils/value-util.js";

describe("value-util",()=>{
	it("can parse and stringify values",()=>{
		expect(valueStringify(4700)).toEqual("4.7k");
		expect(valueStringify(0.01)).toEqual("10m");

		expect(valueParse("4.7k")).toEqual(4700);
	});
});
