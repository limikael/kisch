export function placeRect({ rect, start, step, avoid, maxRadius = 1000 }) {
    // test a candidate anchor point
    function fitsAt(p) {
        const placed = rect.translate(p);
        return !avoid.some(r => placed.overlaps(r));
    }

    // try start position first
    if (fitsAt(start)) {
        return start;
    }

    let x = 0;
    let y = 0;
    let dir = 0;
    let leg = 1;

    const dirs = [
        [ 1,  0], // right
        [ 0,  1], // down
        [-1,  0], // left
        [ 0, -1], // up
    ];

    while (leg <= maxRadius) {
        for (let repeat = 0; repeat < 2; repeat++) {
            const [dx, dy] = dirs[dir & 3];

            for (let i = 0; i < leg; i++) {
                x += dx;
                y += dy;

                const p = start.add([x * step, y * step]);
                if (fitsAt(p)) {
                    return p;
                }
            }

            dir++;
        }
        leg++;
    }

    return null;
}
