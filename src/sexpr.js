// sexpr.js
// ES module: npm install this file as ./sexpr.js

/**
 * Parse a string into s-expressions.
 * Atoms become $-prefixed strings.
 * Strings stay as JS strings, numbers stay as numbers.
 * Escapes $ in strings using $$.
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
    // escape $ at start to distinguish from atoms
    if (str.startsWith('$')) str = '$$' + str.slice(1);
    return str;
  };

  const parseAtomOrNumber = () => {
    let start = i;
    while (i < input.length && /[^\s()]/.test(input[i])) i++;
    const token = input.slice(start, i);
    if (!isNaN(token)) return Number(token);
    // atom → $-prefixed string
    return '$' + token;
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
 * Atoms ($...) are unquoted, strings are quoted
 * Escaped $$ → $
 */
export function stringify(sexpr, indent = 0) {
  const space = (n) => '  '.repeat(n);

  const serializeNode = (node) => {
    if (typeof node === 'string') {
      if (node.startsWith('$$')) {
        // escaped $, treat as literal string
        return `"${node.slice(1).replace(/(["\\])/g, '\\$1')}"`;
      } else if (node.startsWith('$')) {
        // atom → unquoted
        return node.slice(1);
      } else {
        // regular string
        return `"${node.replace(/(["\\])/g, '\\$1')}"`;
      }
    } else {
      // number
      return String(node);
    }
  };

  const serialize = (node, level) => {
    if (Array.isArray(node)) {
      if (node.length === 0) return '()';
      // inline small lists
      const isSimple = node.every(
        n => !Array.isArray(n)
      );
      if (isSimple) {
        return '(' + node.map(serializeNode).join(' ') + ')';
      }
      const lines = node.map(n => serialize(n, level + 1));
      return '(\n' + lines.map(l => space(level + 1) + l).join('\n') + '\n' + space(level) + ')';
    } else {
      return serializeNode(node);
    }
  };

  return sexpr.map(node => serialize(node, indent)).join('\n');
}
