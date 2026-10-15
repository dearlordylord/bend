const short = ["", "\0", "a", "é", "\u{10000}", "\u{10FFFF}", "\uD800", "\uDC00", "a\uD800", "\uDC00\uD800"];
const cases = short.flatMap((a, i) => Array.from({length: 33 * ([...a].length + 1) + 1}, (_, pos) => [a, short[(i + pos) % short.length], pos]));
const prefix = "x".repeat(4096);
for (const a of [...short, prefix, prefix + "a", prefix + "\u{10000}"]) {
  for (const b of [a, a + "b", prefix + "b"]) {
    for (const pos of [0, 32, 33, 33 * [...a].length - 1, 33 * [...a].length, 33 * [...a].length + 1, Number.MAX_SAFE_INTEGER, 2 ** 53]) {
      if (pos >= 0) cases.push([a, b, pos]);
    }
  }
}
function count() { return cases.length; }
function left(i) { return cases[i][0]; }
function right(i) { return cases[i][1]; }
function position(i) { return cases[i][2]; }
io_eff(CID(count), count);
io_eff(CID(left), left);
io_eff(CID(right), right);
io_eff(CID(position), position);

function once_check(bit, diff) {
  const trace = [];
  const key = () => { trace.push("key"); return "\u{10000}"; };
  const pos = () => { trace.push("pos"); return 16; };
  const a = () => { trace.push("left"); return "\u{10000}"; };
  const b = () => { trace.push("right"); return "\uE000"; };
  const result = bit(key)(pos);
  const distance = diff(a)(b);
  return trace.join(",") === "key,pos,left,right"
    && result.fst === "\u{10000}" && result.snd === true && distance === 16;
}
io_eff(CID(once_check), once_check);
