export type FormatOptions = {
  tabSize?: number;
  insertSpaces?: boolean;
};

type Token = {
  text: string;
  kind: "word" | "number" | "literal" | "symbol";
  gap: boolean;
};

type Line = {
  indent: string;
  code: string;
  comment: string;
  tokens: Token[];
};

const MULTI = ["<&>", ".|.", ".^.", ".&.", "==", "!=", "->", "<-", "=>", "&&", "||", "++", "<>", "<=", ">=", "<<", ">>"];
const WORD = /[A-Za-z0-9_.]/;
const HEAD = /[A-Za-z_]/;
const DIGIT = /[0-9]/;
const BINARY = new Set(["=", "==", "!=", "->", "<-", "=>", "+", "-", "*", "/", "%", "&&", "||", "++", "<>", "<&>", "<=", ">=", "<<", ">>", ".|.", ".^.", ".&.", "&", "|"]);
const PREFIX_CONTEXT = new Set(["(", "{", "[", "<", ",", ":", "=", "for", "case", "~"]);
const ANGLES = new Set(["<", ">", "<<", ">>", "<>"]);
const KEYWORDS = new Set(["return", "match", "case", "do", "for", "exs", "where", "is", "import", "def", "type", "law"]);
const DELIMITERS = [["(", ")"], ["[", "]"], ["{", "}"]] as const;
const DELIMITER_PAIRS = new Map<string, string>(DELIMITERS);
const CLOSING_DELIMITERS = new Set<string>(DELIMITERS.map(([, closing]) => closing));

function splitLine(text: string): Line {
  const indent = text.match(/^[\t ]*/)?.[0] ?? "";
  const code = text.slice(indent.length);
  const tokens: Token[] = [];
  let i = 0;
  let hadGap = false;
  while (i < code.length) {
    if (/\s/.test(code[i])) {
      hadGap = tokens.length > 0;
      i++;
      continue;
    }
    if (code[i] === "#") break;
    const start = i;
    const char = code[i];
    let kind: Token["kind"] = "symbol";
    if (char === "\"" || char === "'") {
      kind = "literal";
      const quote = char;
      i++;
      let escaped = false;
      let closed = false;
      while (i < code.length) {
        const next = code[i++];
        if (escaped) escaped = false;
        else if (next === "\\") escaped = true;
        else if (next === quote) {
          closed = true;
          break;
        }
      }
      if (!closed) throw new Error("unterminated literal");
    } else if (HEAD.test(char)) {
      kind = "word";
      i++;
      while (i < code.length && WORD.test(code[i])) i++;
    } else if (DIGIT.test(char)) {
      kind = "number";
      i++;
      while (i < code.length && DIGIT.test(code[i])) i++;
      if (code[i] === "." && DIGIT.test(code[i + 1] ?? "")) {
        i++;
        while (i < code.length && DIGIT.test(code[i])) i++;
      }
      if (/[eE]/.test(code[i] ?? "") && DIGIT.test(code[i + 1] ?? "") || /[eE]/.test(code[i] ?? "") && /[+-]/.test(code[i + 1] ?? "") && DIGIT.test(code[i + 2] ?? "")) {
        i++;
        if (/[+-]/.test(code[i] ?? "")) i++;
        while (i < code.length && DIGIT.test(code[i])) i++;
      }
      if (code[i] === "n") i++;
    } else {
      const multi = MULTI.find((value) => code.startsWith(value, i));
      i += multi?.length ?? 1;
    }
    tokens.push({ text: code.slice(start, i), kind, gap: hadGap });
    hadGap = false;
  }
  return { indent, code: code.slice(0, i).trim(), comment: code.slice(i), tokens };
}

function unary(tokens: Token[], index: number): boolean {
  const token = tokens[index].text;
  if (!["+", "-", "~", "?", "@", "&", "%"].includes(token)) return false;
  const previous = tokens[index - 1]?.text;
  const next = tokens[index + 1];
  if (!next) return false;
  const atPrefix = index === 0 || PREFIX_CONTEXT.has(previous) || BINARY.has(previous);
  if (token === "~" || token === "%") return atPrefix;
  if (token === "+" || token === "-") return next.kind === "word" && (!next.gap || (index > 0 && atPrefix));
  return next.kind === "word" || next.kind === "number" ? atPrefix : false;
}

function keepAngleGap(left: Token, right: Token): boolean | null {
  if (!ANGLES.has(left.text) && !ANGLES.has(right.text)) return null;
  return right.gap;
}

function needsSpace(tokens: Token[], index: number): boolean {
  const left = tokens[index - 1];
  const right = tokens[index];
  if (!left) return false;
  if ([")", "]", "}", ",", ";"].includes(right.text)) return false;
  if (right.text === ":") return right.gap;
  if (["(", "[", "{"].includes(left.text)) return false;
  if (left.text === ",") return true;
  if (right.text === "!" && (left.kind === "word" || [")", "]", "}"].includes(left.text))) return false;
  if (left.text === "!" && right.text === "(") return false;
  if (right.text === "?" && left.kind === "word" && (!tokens[index + 1] || tokens[index + 1].text === "(")) return right.gap;
  if (left.text === "?" && right.text === "(" && tokens[index - 2]?.kind === "word") return false;
  if (left.text === "<" && right.text === "(") return right.gap;
  if (right.text === "(" || right.text === "[") {
    const suffix = (left.kind === "word" && !KEYWORDS.has(left.text)) || left.kind === "number" || left.kind === "literal" || [")", "]", "}", ">", ">>"].includes(left.text);
    return !suffix;
  }
  if (right.text === "{" && ((left.kind === "word" && !["return", "case"].includes(left.text)) || [">", ">>", "}"].includes(left.text))) return false;
  if (left.text === "\\" && right.text === "{") return false;
  if (left.text === "." || right.text === ".") return false;
  if (left.kind === "number" && left.text.endsWith("n") && (right.text === "+" || right.text === "++")) return right.gap;
  if ((left.text === "+" || left.text === "++") && tokens[index - 2]?.kind === "number" && tokens[index - 2].text.endsWith("n")) return right.gap;
  if (unary(tokens, index - 1)) return false;
  if (unary(tokens, index)) return !["(", "[", "{", "<"].includes(left.text);
  const angle = keepAngleGap(left, right);
  if (angle !== null) return angle;
  if (BINARY.has(left.text) || BINARY.has(right.text)) return true;
  if (left.text === ":") return true;
  return true;
}

function formatTokens(tokens: Token[]): string {
  let output = "";
  for (let i = 0; i < tokens.length; i++) {
    if (needsSpace(tokens, i)) output += " ";
    output += tokens[i].text;
  }
  return output;
}

function indentDepths(lines: Line[], unsupported?: boolean[]): number[] {
  const depths: number[] = [];
  const stack = [0];
  for (const [index, line] of lines.entries()) {
    if (line.code === "" && line.comment === "") {
      depths.push(-1);
      continue;
    }
    // Bend's parse_col counts characters, including one column per tab.
    const width = line.indent.length;
    const dedenting = width < stack[stack.length - 1];
    while (stack.length > 1 && width < stack[stack.length - 1]) stack.pop();
    if (width > stack[stack.length - 1]) {
      // An intermediate dedent may belong to an expression continuation.
      // Do not turn it into a new block and shift later statements.
      if (dedenting && unsupported) unsupported[index] = true;
      stack.push(width);
    }
    else if (width !== stack[stack.length - 1]) stack[stack.length - 1] = width;
    depths.push(stack.length - 1);
  }
  return depths;
}

function fingerprint(lines: Line[]): string {
  const depths = indentDepths(lines);
  return lines.map((line, index) => line.tokens.length === 0 ? "" : depths[index] + ":" + line.tokens.map((token) => token.text).join("\u0000")).join("\n");
}

function unsupportedLayouts(lines: Line[]): boolean[] {
  const unsupported = lines.map(() => false);
  let header: { line: number; keyword: string; closing: string[]; angles: number } | null = null;
  for (const [index, line] of lines.entries()) {
    for (let at = 0; at < line.tokens.length; at++) {
      const token = line.tokens[at];
      if (!header) {
        if (token.kind !== "word" || !["case", "def", "do", "match"].includes(token.text)) continue;
        // Inline case rows are anchored even when their body starts below.
        if (token.text === "case" && at > 0) unsupported[index] = true;
        header = { line: index, keyword: token.text, closing: [], angles: 0 };
        continue;
      }
      if (token.kind !== "symbol") continue;
      const expected = DELIMITER_PAIRS.get(token.text);
      if (expected) header.closing.push(expected);
      else if (CLOSING_DELIMITERS.has(token.text)) {
        if (header.closing.pop() !== token.text) {
          unsupported[header.line] = true;
          header = null;
        }
      } else if (header.closing.length === 0) {
        // Type arguments in do headers may contain binder colons.
        if (header.keyword === "do") {
          if (token.text === "<") header.angles++;
          else if (token.text === ">") header.angles--;
          else if (token.text === ">>") header.angles -= 2;
        }
        if (token.text === ":" && header.angles === 0) {
          // Inline bodies anchor following statements to their physical column.
          // Keep multiline do headers until their type layout can be normalized.
          if (at < line.tokens.length - 1 || header.keyword === "do" && header.line !== index) {
            unsupported[header.line] = true;
          }
          header = null;
        }
      }
    }
  }
  if (header) unsupported[header.line] = true;
  return unsupported;
}

function declarationRanges(lines: Line[]): number[] | null {
  const starts = [0];
  const closing: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    // Only column-zero declaration keywords outside delimiters are boundaries.
    // Keep preceding @unsafe attributes with their declaration.
    if (index > 0 && line.indent === "" && closing.length === 0
      && ["def", "type", "law", "import"].includes(line.tokens[0]?.text)) {
      let start = index;
      while (start > starts[starts.length - 1] && lines[start - 1].tokens.length === 0) start--;
      const previous = lines[start - 1]?.tokens;
      if (previous?.length === 2 && previous[0].text === "@" && previous[1].text === "unsafe") start--;
      if (start > starts[starts.length - 1]) starts.push(start);
    }
    for (const token of line.tokens) {
      if (token.kind !== "symbol") continue;
      const expected = DELIMITER_PAIRS.get(token.text);
      if (expected) closing.push(expected);
      else if (CLOSING_DELIMITERS.has(token.text) && closing.pop() !== token.text) return null;
    }
  }
  return closing.length === 0 ? [...starts, lines.length] : null;
}

export function formatBend(source: string, options: FormatOptions = {}): string {
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const finalEol = source.endsWith("\n");
  const rawLines = source.split(/\r?\n/);
  if (finalEol) rawLines.pop();
  let lines: Line[];
  try {
    lines = rawLines.map(splitLine);
  } catch {
    return source;
  }
  const unsupported = unsupportedLayouts(lines);
  const depths = indentDepths(lines, unsupported);
  const preserved = new Set<number>();
  if (unsupported.some(Boolean)) {
    const ranges = declarationRanges(lines);
    // Uncertain boundaries must not allow edits into an unsupported block.
    if (!ranges || /(?<!\r)\n/.test(source) && source.includes("\r\n")) return source;
    for (let range = 0; range < ranges.length - 1; range++) {
      const start = ranges[range];
      const end = ranges[range + 1];
      let unsafe = false;
      for (let index = start; index < end && !unsafe; index++) unsafe = unsupported[index];
      if (unsafe) {
        // Preserve the whole declaration, including its header and columns.
        for (let index = start; index < end; index++) preserved.add(index);
      }
    }
  }
  const size = Math.max(1, options.tabSize ?? 2);
  const spaces = options.insertSpaces !== false;
  const formatted = lines.map((line, index) => {
    if (preserved.has(index)) return rawLines[index];
    if (line.code === "" && line.comment === "") return "";
    const prefix = spaces ? " ".repeat(depths[index] * size) : "\t".repeat(depths[index]);
    const code = formatTokens(line.tokens);
    if (code === "") return prefix + line.comment;
    return prefix + code + (line.comment === "" ? "" : "  " + line.comment);
  }).join(eol) + (finalEol ? eol : "");
  try {
    if (fingerprint(lines) !== fingerprint(formatted.replace(/\r\n/g, "\n").split("\n").slice(0, finalEol ? -1 : undefined).map(splitLine))) return source;
  } catch {
    return source;
  }
  return formatted;
}
