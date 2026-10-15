// Native JS String inputs, including representations unavailable as literals.
const prefix = "x".repeat(4096);
const samples = ["", "a", "\0", "a\0b", "é", "e\u0301", "\uD7FF", "\uE000", "\u{10000}",
  "\u{1F600}", "\u{10FFFF}", "\uD800", "\uDC00", "a\uD800", "\uD800a",
  "\uD800\uDC00", "\uDC00\uD800", prefix, prefix + "a", prefix + "b"];
const pairs = samples.flatMap((value, index) => [
  [value, (" " + value).slice(1)],
  [value, samples[(index + 1) % samples.length]],
  [value + "a", value + "b"]
]);
pairs.push(["\u{10000}", "\uE000"], ["\uE000", "\u{10000}"],
  ["\uD800", "\uD800\uDC00"], ["\uD800\uDC00", "\uD800"],
  ["\uDC00\uD800", "\uD800\uDC00"]);
function count() { return pairs.length; }
function left(index) { return pairs[index][0]; }
function right(index) { return pairs[index][1]; }
io_eff(CID(count), count);
io_eff(CID(left), left);
io_eff(CID(right), right);

function once_check(compare) {
  const trace = [];
  const a = () => { trace.push("left"); return "\u{10000}"; };
  const b = () => { trace.push("right"); return "\uE000"; };
  const result = compare(a)(b);
  return trace.join(",") === "left,right"
    && result.fst.fst === "\u{10000}" && result.fst.snd === "\uE000"
    && result.snd.$ === CID(GT);
}
io_eff(CID(once_check), once_check);
