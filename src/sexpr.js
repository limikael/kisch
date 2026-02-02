// sexpr.js
// ES module: npm install this file as ./sexpr.js

/**
 * Parse a string into s-expressions.
 * Atoms become {atom: "value"}, strings and numbers stay as strings.
 * Returns an array representing the s-expression tree.
 */
export function parse(input) {
    let i = 0;

    const skipWhitespace = () => {
        while (i < input.length && /\s/.test(input[i])) i++;
    };

    const parseString = () => {
        let str = '';
        i++; // skip opening "
        while (i < input.length) {
            if (input[i] === '"') {
                i++;
                break;
            } else if (input[i] === '\\') {
                i++;
                str += input[i] || '';
            } else {
                str += input[i];
            }
            i++;
        }
        return str;
    };

    const parseAtomOrNumber = () => {
        let start = i;
        while (i < input.length && /[^\s()]/.test(input[i])) i++;
        const token = input.slice(start, i);
        // if it looks like a number, keep as string
        if (!isNaN(token)) return token;
        return { atom: token };
    };

    const parseList = () => {
        const list = [];
        i++; // skip '('
        while (i < input.length) {
            skipWhitespace();
            if (i >= input.length) break;
            if (input[i] === ')') {
                i++;
                break;
            } else if (input[i] === '(') {
                list.push(parseList());
            } else if (input[i] === '"') {
                list.push(parseString());
            } else {
                list.push(parseAtomOrNumber());
            }
        }
        return list;
    };

    const result = [];
    while (i < input.length) {
        skipWhitespace();
        if (i >= input.length) break;
        if (input[i] === '(') {
            result.push(parseList());
        } else if (input[i] === '"') {
            result.push(parseString());
        } else {
            result.push(parseAtomOrNumber());
        }
    }
    return result;
}

/**
 * Convert s-expression arrays back to a string
 */
export function stringify(sexpr, indent = 0) {
    const space = (n) => '  '.repeat(n); // 2-space indent

    const serialize = (node, level) => {
        if (Array.isArray(node)) {
            if (node.length === 0) return '()';
            let first = node[0];
            // inline small lists with only atoms/strings
            const isSimple = node.every(
                n => !Array.isArray(n) && (typeof n === 'string' || (n.atom))
            );
            if (isSimple) {
                return '(' + node.map(serializeNode).join(' ') + ')';
            }
            let lines = node.map(n => serialize(n, level + 1));
            return '(\n' + lines.map(l => space(level + 1) + l).join('\n') + '\n' + space(level) + ')';
        } else {
            return serializeNode(node);
        }
    };

    const serializeNode = (node) => {
        if (typeof node === 'object' && node.atom) {
            return node.atom;
        } else {
            // string or number
            if (/[\s()"]/.test(node)) {
                return `"${node.replace(/(["\\])/g, '\\$1')}"`;
            }
            return node;
        }
    };

    return sexpr.map(node => serialize(node, indent)).join('\n');
}
