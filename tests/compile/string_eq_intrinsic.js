// Native JS String inputs, including representations unavailable as literals.
const prefix = "x".repeat(4096);
const samples = ["", "a", "\0", "a\0b", "é", "e\u0301", "\uD7FF", "\uE000",
  "\u{1F600}", "\u{10FFFF}", "\uD800", "\uDC00", "a\uD800", "\uD800a",
  "\uD800\uDC00", "\uDC00\uD800", prefix, prefix + "a", prefix + "b"];
const pairs = samples.flatMap((value, index) => [
  [value, (" " + value).slice(1)],
  [value, samples[(index + 1) % samples.length]],
  [value + "a", value + "b"]
]);
function count() { return pairs.length; }
function left(index) { return pairs[index][0]; }
function right(index) { return pairs[index][1]; }
io_eff(CID(count), count);
io_eff(CID(left), left);
io_eff(CID(right), right);
