export default async function(sch) {
    let J3=sch.declare("J3",{
        "symbol": "Connector_Generic:Conn_01x04",
        "footprint": "",
    });

    let J2=sch.declare("J2",{
        "symbol": "Connector_Generic:Conn_01x02",
        "footprint": "",
    });

    let J1=sch.declare("J1",{
        "symbol": "Connector_Generic:Conn_01x02",
        "footprint": "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Horizontal",
    });

    J3.pin(4).connect("GND");
    J2.pin(1).connect("5V");
    J1.pin(1).connect(J2.pin(2));
    J1.pin(2).connect("GND");
}
