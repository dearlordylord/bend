import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatBend } from "../formatter.js";

const inlineLayouts = [
  [
    "import Base",
    "def f(n: Bool) -> U32:",
    "  match n: case True{}: 0",
    "           case False{}: 1",
    "",
  ].join("\n"),
  [
    "import Base",
    "def main() -> IO(Unit):",
    "  do IO<Unit>: IO.print(\"a\")",
    "               IO.print(\"b\")",
    "",
  ].join("\n"),
  [
    "import Base",
    "def main() -> IO(Unit):",
    "  do",
    "    IO<Unit>: IO.print(\"a\")",
    "              IO.print(\"b\")",
    "",
  ].join("\n"),
  [
    "import Base",
    "def main() -> IO(Unit):",
    "  do IO<",
    "    Unit>: IO.print(\"a\")",
    "           IO.print(\"b\")",
    "",
  ].join("\n"),
  [
    "import Base",
    "def main() -> IO(Unit):",
    "  do IO<Unit>",
    "    : IO.print(\"a\")",
    "      IO.print(\"b\")",
    "",
  ].join("\n"),
  [
    "import Base",
    "def f() -> IO(@x: Unit -> Unit):",
    "  do IO<@x:",
    "    Unit -> Unit>: IO.print(\"a\")",
    "                   return x => x",
    "",
  ].join("\n"),
];

const columnRegressions = [
  [
    "import Base",
    "def f(b: Bool, a: Array<U32>) -> Array<U32>:",
    "  match b:",
    "    case True{}: a[0] <- 7",
    "                 a[1] <- 8",
    "    case False{}: a",
    "",
  ].join("\n"),
  [
    "import Base",
    "def f(a: Array<U32>) -> Array<U32>: a[0] <- 7",
    "                                    a[1] <- 8",
    "",
  ].join("\n"),
  [
    "import Base",
    "def main() -> IO(Unit):",
    "  do IO<Unit>:",
    '      IO.print(String.concat(["a",',
    '    "c"]))',
    '      IO.print("b")',
    "",
  ].join("\n"),
  [
    "import Base",
    "def main() -> IO(Unit):",
    "  do IO<Unit>:",
    '\t\tIO.print("a")',
    '  IO.print("b")',
    "",
  ].join("\n"),
];

const safeHeaderLayouts = [
  "import Base\ndef f() -> Result<&2, &2, U32, U32>:\n    do Result<&2, &2, U32, U32>:\n        return 7\n",
  "import Base\ndef f() -> IO(List<&2, U32>):\n    do IO<List<&2, U32>>:\n        IO.pure(List<&2, U32>, [1, 2])\n",
  "import Base\ntype Client<-P: Type, -S: Type> is Type:\n  MkClient{p: P, s: S}\ndef f() -> IO(Client<Unit, Unit>):\n    do IO<Client<Unit, Unit>>:\n        IO.pure(Client<Unit, Unit>, MkClient{Unit{}, Unit{}})\n",
  "import Base\ntype Box is Data:\n  Mk{v: U32}\ndef f() -> Box:\n    do Box<>:\n        Mk{3}\n",
  "import Base\ndef main() -> IO(Unit):\n    do IO<(Unit : Type)>:\n        IO.print(\"a\")\n        IO.print(\"b\")\n",
];

test("preserves ambiguous columns while normalizing parser-equivalent tabs", () => {
  for (const source of columnRegressions.slice(0, 3)) {
    for (const options of [{}, { tabSize: 4 }, { insertSpaces: false }]) {
      assert.equal(formatBend(source, options), source);
    }
  }
  const source = columnRegressions[3];
  const formatted = formatBend(source);
  assert.equal(formatted, source.replace(/\t/g, " "));
  assert.equal(formatBend(formatted), formatted);
});

test("formats valid complex do headers instead of preserving their declarations", () => {
  for (const source of safeHeaderLayouts) {
    const formatted = formatBend(source);
    assert.notEqual(formatted, source);
    assert.equal(formatBend(formatted), formatted);
  }
});

test("leaves column-sensitive inline blocks unchanged", () => {
  const sources = [
    ...inlineLayouts,
    "def f(n: Bool) -> U32: match n: case True{}: 0\n                              case False{}: 1\n",
    "def main() -> IO(Unit):\n  do IO<Unit>: match flag:\n                 case True{}: IO.print(\"a\")\n                 case False{}: IO.print(\"b\")\n",
    "def main() -> IO(Unit):\n  do IO<Unit>: value: U32 <- get()\n               return value\n",
  ];
  for (const source of sources) {
    for (const text of [source, source.replace(/\n/g, "\r\n").trimEnd()]) {
      for (const options of [{}, { tabSize: 4 }, { tabSize: 4, insertSpaces: false }]) {
        assert.equal(formatBend(text, options), text);
      }
    }
  }
});

test("inline layout guards ignore comments and literal contents", () => {
  const source = "# do IO<Unit>: action; match x: case y\ndef text()->String:\n    \"do IO<Unit>: action; match x: case y\"";
  assert.equal(formatBend(source), "# do IO<Unit>: action; match x: case y\ndef text() -> String:\n  \"do IO<Unit>: action; match x: case y\"");
});

test("continues formatting do blocks whose first statement is on a new line", () => {
  for (const header of ["IO<Unit>", "IO<U32>", "Effect.IO<Base.Unit>", "Result<&2, &2, U32, U32>", "IO<List<&2, U32>>", "IO<Client<P, S>>", "Box<>", "IO<(Unit : Type)>", "IO<@x: Unit -> Unit>"]) {
    const source = `def main()->IO(Unit):\n    do ${header}: # first statement follows\n        IO.print("a")\n        IO.print("b")`;
    assert.equal(formatBend(source), `def main() -> IO(Unit):\n  do ${header}:  # first statement follows\n    IO.print("a")\n    IO.print("b")`);
  }
});

const bun = process.env.BEND_FMT_TEST_BUN
  ?? ["bun", join(homedir(), ".bun/bin/bun")].find((candidate) =>
    spawnSync(candidate, ["--version"]).status === 0);
const compiler = process.env.BEND_FMT_TEST_COMPILER
  ?? fileURLToPath(new URL("../../../../bend2/main.ts", import.meta.url));

test("formatted layouts still check with the real Bend compiler", {
  skip: !bun || !existsSync(compiler) ? "Bun or the Bend compiler is unavailable" : false,
}, () => {
  const directory = mkdtempSync(join(tmpdir(), "bend-fmt-inline-"));
  try {
    for (const [index, source] of [...inlineLayouts, ...columnRegressions, ...safeHeaderLayouts].entries()) {
      const surrounded = source.replace("import Base\n", "import Base\ndef before()->U32:\n    0\n")
        + "\ndef after()->U32:\n    1\n";
      for (const [variant, text] of [source, formatBend(source), surrounded, formatBend(surrounded)].entries()) {
        const file = join(directory, `${index}-${variant}.bend`);
        writeFileSync(file, text);
        const result = spawnSync(bun!, [compiler!, file, "--check-only"], {
          cwd: directory, encoding: "utf8", timeout: 30_000,
        });
        assert.equal(result.error, undefined);
        assert.equal(result.status, 0, `fixture ${index}, variant ${variant}:\n` + result.stdout + result.stderr);
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("preserves unsupported declarations while formatting their neighbours", () => {
  for (const layout of [...inlineLayouts, ...columnRegressions.slice(0, 3)]) {
    for (const eol of ["\n", "\r\n"]) {
      const source = "def before()->U32:\n    0\n" + layout + "\ndef after()->U32:\n    1\n";
      const expected = "def before() -> U32:\n  0\n" + layout + "\ndef after() -> U32:\n  1\n";
      const formatted = formatBend(source.replace(/\n/g, eol));
      assert.equal(formatted, expected.replace(/\n/g, eol));
      assert.equal(formatBend(formatted), formatted);
    }
  }
});

test("keeps attributes and uncertain boundaries with unsupported layouts", () => {
  const attributed = "@unsafe\ndef f() -> IO<Unit>:\n  do IO<Unit>: return Unit{}\n";
  assert.equal(formatBend(attributed + "def g()->U32:\n    0"),
    attributed + "def g() -> U32:\n  0");
  const uncertain = "def f() -> IO<Unit>:\n  do IO<(Unit:\ndef g()->U32:\n    0";
  assert.equal(formatBend(uncertain), uncertain);
});

test("formats Bend 2 declarations and nested blocks", () => {
  const source = [
    "import   Base",
    "",
    "def  area ( x : Shape )-> U32:",
    "     match   x:",
    "          case  Circle{ +r }:",
    "             ( 3*r*r : U32 )",
    "",
  ].join("\n");
  assert.equal(formatBend(source), [
    "import Base",
    "",
    "def area(x : Shape) -> U32:",
    "  match x:",
    "    case Circle{+r}:",
    "      (3 * r * r : U32)",
    "",
  ].join("\n"));
});

test("preserves comments, literals, line endings, and final newline state", () => {
  const source = "def main()->String:\r\n\t\"a # b\\n\"   # exact comment";
  assert.equal(formatBend(source), "def main() -> String:\r\n  \"a # b\\n\"  # exact comment");
});

test("preserves escaped quotes and hashes inside literals", () => {
  for (const literal of [String.raw`"a \" # b"`, String.raw`'a \' # b'`]) {
    assert.equal(formatBend(literal + "# exact"), literal + "  # exact");
  }
});

test("preserves angle spacing because Bend uses it to disambiguate syntax", () => {
  const source = "def f(x:U32)->U32:\n    y=x < 2\n    List<List<U32>>{}";
  assert.equal(formatBend(source), "def f(x: U32) -> U32:\n  y = x < 2\n  List<List<U32>>{}");
});

test("uses tabs when requested and is idempotent", () => {
  const source = "def main() -> U32:\n    match x:\n      case 0 n:\n        0";
  const once = formatBend(source, { tabSize: 4, insertSpaces: false });
  assert.equal(once, "def main() -> U32:\n\tmatch x:\n\t\tcase 0 n:\n\t\t\t0");
  assert.equal(formatBend(once, { tabSize: 4, insertSpaces: false }), once);
});

test("keeps Bend prefix forms glued without changing infix operators", () => {
  const source = "law use:\n    for + value: U32\n    List< & 2,U32>\n    & item:U32 -> { item==item:U32}\n    \\ {}\n    % proof : {==}";
  assert.equal(formatBend(source), "law use:\n  for +value: U32\n  List<&2, U32>\n  &item: U32 -> {item == item: U32}\n  \\{}\n  %proof : {==}");
});

test("keeps floating point exponents intact", () => {
  assert.equal(formatBend("def x()->F32:\n  1.25e-4"), "def x() -> F32:\n  1.25e-4");
});

test("preserves adjacency in natural-number successor patterns", () => {
  assert.equal(formatBend("case 1n+p:\n  p"), "case 1n+p:\n  p");
  assert.equal(formatBend("case 1n++p:\n  p"), "case 1n++p:\n  p");
  assert.equal(formatBend("value=1n + p"), "value = 1n + p");
});

test("keeps adjacent parallel binders and template quantities", () => {
  assert.equal(formatBend("+a +b=x y"), "+a +b = x y");
  assert.equal(formatBend("f(~ & 2,~T,[1,2])"), "f(~&2, ~T, [1, 2])");
});

test("formats dot operators and keeps continuation operators infix", () => {
  assert.equal(formatBend("x=(6 .&. 3 .|. 8 : U32)\n  + value"), "x = (6 .&. 3 .|. 8 : U32)\n  + value");
});

test("keeps parallel execution call suffixes glued", () => {
  assert.equal(formatBend("result = run ! (20n)"), "result = run!(20n)");
});

test("keeps unsafe declaration suffixes adjacent to names", () => {
  assert.equal(formatBend("def value?()->U32:\n  1"), "def value?() -> U32:\n  1");
  assert.equal(formatBend("def value? ()->U32:\n  1"), "def value?() -> U32:\n  1");
  assert.equal(formatBend("def\n  value?()->U32:\n  1"), "def\n  value?() -> U32:\n  1");
  assert.equal(formatBend("def # declaration\n  value? ()->U32:\n  1"), "def  # declaration\n  value?() -> U32:\n  1");
});

test("keeps unsafe suffixes on dotted declarations with inline attributes", () => {
  assert.equal(formatBend("@unsafe def Value.get? ()->U32:\n  1"), "@unsafe def Value.get?() -> U32:\n  1");
});

test("preserves invalid gaps before unsafe declaration suffixes", () => {
  assert.equal(formatBend("def value ?()->U32:\n  1"), "def value ?() -> U32:\n  1");
});

test("keeps prefix holes glued", () => {
  assert.equal(formatBend("def value()->U32:\n  ?TODO\n  result=?help"), "def value() -> U32:\n  ?TODO\n  result = ?help");
  assert.equal(formatBend("case?help:"), "case ?help:");
});

test("leaves unterminated literals unchanged", () => {
  for (const literal of [
    "\"", "'", "\"unfinished", "'unfinished", "\"unfinished\\", "'unfinished\\",
  ]) {
    const source = "def main() -> String:\n  " + literal;
    assert.equal(formatBend(source), source);
  }
});
