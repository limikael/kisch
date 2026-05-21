const valuePrefixes = [
    ["G", 1e9],
    ["M", 1e6],
    ["k", 1e3],
    ["", 1],
    ["m", 1e-3],
    ["u", 1e-6],
    ["n", 1e-9],
    ["p", 1e-12]
];

export function valueParse(str) {
    str = str.trim();

    let match = str.match(/^([0-9.]+)\s*([GMkmunp]?)$/);

    if (!match)
        throw new Error("Invalid value: " + str);

    let number = parseFloat(match[1]);
    let suffix = match[2];
    let factor = 1;

    for (let [prefix, multiplier] of valuePrefixes) {
        if (prefix === suffix) {
            factor = multiplier;
            break;
        }
    }

    return number * factor;
}

export function valueStringify(value) {
    for (let [prefix, multiplier] of valuePrefixes) {
        let scaled = value / multiplier;

        if (scaled >= 1 && scaled < 1000) {
            return parseFloat(scaled.toPrecision(3)) + prefix;
        }
    }

    return value.toString();
}