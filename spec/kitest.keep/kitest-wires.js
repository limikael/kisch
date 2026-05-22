export default async function(sch) {
    let J3=sch.declare("J3",{
        "symbol": "Connector_Generic:Conn_01x04",
        "footprint": "hello",
    });

    let J2=sch.declare("J2",{
        "symbol": "Connector_Generic:Conn_01x02",
        "footprint": "",
    });

    let J4=sch.declare("J4",{
        "symbol": "Connector_Generic:Conn_02x04_Counter_Clockwise",
        "footprint": "",
    });

    let J1=sch.declare("J1",{
        "symbol": "Connector_Generic:Conn_01x02",
        "footprint": "",
    });

    J3.pin(4).connect("GND");
    J2.pin(1).connect("5V");
    //J1.pin(1).connect(J2.pin(2));
    J1.pin(2).connect("GND");

    J4.pin(5).connect(J3.pin(1));
}
