import {Rect} from "../src/cartesian-math.js";

describe("cartesian-math",()=>{
	it("works with rect",()=>{
		let r=new Rect([3,4],[1,2]);
		expect(r.getLeft()).toEqual(3);
		expect(r.getRight()).toEqual(4);
		expect(r.getTop()).toEqual(4);
		expect(r.getBottom()).toEqual(6);

		let r2=new Rect([3,4],[-1,-3]);
		expect(r2.getLeft()).toEqual(2);
		expect(r2.getRight()).toEqual(3);
		expect(r2.getTop()).toEqual(1);
		expect(r2.getBottom()).toEqual(4);
	});

	it("rect from corners",()=>{
		let r=Rect.fromCorners([3,4],[7,8]);
		let r2=Rect.fromCorners([2,2],[5,5]);
		expect(r.size).toEqual([4,4]);

		//console.log(r2.union(r));
	})
});
