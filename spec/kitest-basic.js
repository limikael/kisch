export default async function(sch, defines) {
    let J1=sch.declare("J1",{
        "symbol": "Connector_Generic:Conn_01x02",
        "footprint": "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Horizontal",
    });

    J1.pin(2).connect("GND");

	sch.declare("J5", {symbol: "Connector_Generic:Conn_01x04"});

	//console.log(defines);

	if (defines.test=="123") {
		sch.declare("J6", {symbol: "Connector_Generic:Conn_01x04"});
	}
}