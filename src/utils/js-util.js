export class DeclaredError extends Error {
    constructor(...args) {
        super(...args);
        this.declared=true;
    }
}

export function arrayUnique(array) {
    let result=new Set();

    for (let item of array)
        result.add(item);

    return Array.from(result);
}

export function arrayGetMinIndex(array) {
    let min;
    for (let k of Object.keys(array))
        if (min===undefined || Number(k)<min)
            min=Number(k);

    return min;
}

export function arrayGetMaxIndex(array) {
    let max;
    for (let k of Object.keys(array))
        if (max===undefined || Number(k)>max)
            max=Number(k);

    return max;
}