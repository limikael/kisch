export function collapsePath(path) {
    if (!path || path.length < 2) return path;

    const result = [path[0]];

    let prevDir = null;

    for (let i = 1; i < path.length - 1; i++) {
        const prev = path[i - 1];
        const cur = path[i];
        const next = path[i + 1];

        const dir1 = {
            x: cur.x - prev.x,
            y: cur.y - prev.y,
        };

        const dir2 = {
            x: next.x - cur.x,
            y: next.y - cur.y,
        };

        const sameDirection =
            dir1.x === dir2.x && dir1.y === dir2.y;

        // keep only if direction changes
        if (!sameDirection) {
            result.push(cur);
        }
    }

    result.push(path[path.length - 1]);

    return result;
}

export function manhattanDist(x1, y1, x2, y2) {
    return (Math.abs(x2-x1)+Math.abs(y2-y1));
}