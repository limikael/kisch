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