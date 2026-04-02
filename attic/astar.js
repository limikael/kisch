export function astar({
    start,
    goal,
    isGoal,
    neighbours,
    cost,
    heuristic = () => 0,
    key,
}) {
    if (!key) throw new Error("key(n) is required");

    // Goal resolution
    const goalKey = goal !== undefined ? key(goal) : null;
    const isGoalFn =
        isGoal ||
        ((n) => {
            if (goalKey === null) throw new Error("Provide goal or isGoal");
            return key(n) === goalKey;
        });

    // Open set (priority queue via simple array for clarity)
    const open = [];
    const push = (node, f) => {
        open.push({ node, f });
    };
    const pop = () => {
        // naive priority queue (can replace with binary heap later)
        let bestIdx = 0;
        for (let i = 1; i < open.length; i++) {
            if (open[i].f < open[bestIdx].f) bestIdx = i;
        }
        const item = open[bestIdx];
        open.splice(bestIdx, 1);
        return item.node;
    };

    // Caches
    const gScore = new Map();       // key(n) -> best cost
    const cameFrom = new Map();     // key(n) -> previous key
    const nodeCache = new Map();    // key(n) -> node (for reconstruction)

    // Optional memoization (cheap + safe)
    const heuristicCache = new Map();     // key(n) -> h(n)
    const costCache = new Map();          // "k1|k2" -> cost

    const getHeuristic = (n) => {
        const k = key(n);
        if (heuristicCache.has(k)) return heuristicCache.get(k);
        const h = heuristic(n);
        heuristicCache.set(k, h);
        return h;
    };

    const getCost = (a, b) => {
        const ka = key(a);
        const kb = key(b);
        const ck = ka + "|" + kb;
        if (costCache.has(ck)) return costCache.get(ck);
        const c = cost(a, b);
        costCache.set(ck, c);
        return c;
    };

    const startKey = key(start);
    gScore.set(startKey, 0);
    nodeCache.set(startKey, start);

    push(start, getHeuristic(start));

    while (open.length > 0) {
        const current = pop();
        const ck = key(current);

        if (isGoalFn(current)) {
            return reconstructPath(cameFrom, nodeCache, ck);
        }

        for (const next of neighbours(current)) {
            const nk = key(next);
            nodeCache.set(nk, next);

            const tentative =
                gScore.get(ck) + getCost(current, next);

            if (!gScore.has(nk) || tentative < gScore.get(nk)) {
                cameFrom.set(nk, ck);
                gScore.set(nk, tentative);

                const f = tentative + getHeuristic(next);
                push(next, f);
            }
        }
    }

    return null; // no path
}

// Helper
function reconstructPath(cameFrom, nodeCache, currentKey) {
    const path = [];
    while (currentKey) {
        path.push(nodeCache.get(currentKey));
        currentKey = cameFrom.get(currentKey);
    }
    path.reverse();
    return path;
}