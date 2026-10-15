async function check_opaque_module() {
  const assert = (await import("node:assert/strict")).default;
  const path = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  const Bend = await import(pathToFileURL(path.resolve("bend2/bend.ts")).href);
  const Comp = await import(pathToFileURL(path.resolve("bend2/comp.ts")).href);
  const book = Bend.book_nil();
  await Bend.book_load(book, path.resolve("tests/run/opaque_library_model.bend"), "", new Map());
  Bend.book_valid(book);
  const source = Comp.js_lib(book, true, ["State", "OtherState"]);
  const uri = "data:text/javascript;base64," + Buffer.from(source).toString("base64");
  const first = await import(uri + "#first");
  const second = await import(uri + "#second");
  const api = first.opaque;
  const initialPhase = {$: "Idle"};
  const initial = api.begin(2n, initialPhase);
  assert.deepEqual(Reflect.ownKeys(initial), []);
  assert.equal(Object.getPrototypeOf(initial), null);
  assert.equal(Object.isFrozen(initial), true);
  assert.equal(Object.isFrozen(initialPhase), false);
  initialPhase.$ = "Busy";
  assert.equal(api.busy(api.phase(initial)), false, "input enum must be detached");
  const advanced = api.add(initial, 3n);
  assert.equal(api.count(initial), 2n, "old snapshots remain reusable");
  assert.equal(api.count(advanced), 5n);
  assert.equal(api.count(api.add(initial, 1n)), 3n);
  const projected = api.phase(initial);
  projected.$ = "Busy";
  assert.equal(api.busy(api.phase(initial)), false, "output enum must be detached");
  const wrapped = api.boxed(initial);
  assert.equal(api.boxed_count(wrapped), 2n, "nested opaque argument back conversion");
  wrapped.state = advanced;
  assert.equal(api.boxed_count(wrapped), 5n);
  assert.equal(api.count(initial), 2n);
  for (const fake of [{}, null, 2n, {$: "State", count: 2n, phase: {$: "Idle"}}, api.other(2n), second.opaque.begin(2n, {$: "Idle"})]) {
    assert.throws(() => api.count(fake), TypeError, "reject forged/type/module tokens");
  }
  let reads = 0;
  const cause = {};
  const accessor = Object.defineProperty({}, "$", {get() { reads++; throw cause; }});
  assert.throws(() => first.default.busy(accessor), (error) => error === cause);
  assert.equal(reads, 1, "ordinary API preserves raw accessor errors");
  assert.throws(() => api.busy(accessor), TypeError);
  assert.equal(reads, 1, "strict API never executes an accessor");
  const configPhase = {$: "Idle"};
  const config = {$: "Config", count: 7n, phase: configPhase};
  const configured = api.from_config(config);
  config.count = 99n;
  configPhase.$ = "Busy";
  assert.equal(api.count(configured), 7n);
  assert.equal(api.busy(api.phase(configured)), false);
  assert.deepEqual(first.default.begin(4n, {$: "Busy"}), {$: "State", count: 4n, phase: {$: "Busy"}});
  assert.throws(() => Comp.js_lib(book, true, ["Nat"]), /opaque/);
  assert.throws(() => Comp.js_lib(book, true, ["NonDataState"]), /opaque/);
  assert.throws(() => Comp.js_lib(book, true, ["NotDeclared"]), /opaque/);
  return 0;
}

// The compiler owns one book context; compile in a separate process rather than
// replacing the interpreter's active compiler context from inside an IO effect.
async function verify_opaque() {
  const child = await import("node:child_process");
  const code = "(" + check_opaque_module.toString() + ")().then(() => process.stdout.write('ok'))";
  const result = child.spawnSync(process.execPath, ["--eval", code], {
    encoding: "utf8", timeout: 8000, killSignal: "SIGKILL"
  });
  if (result.status !== 0 || result.stdout !== "ok")
    throw new Error("opaque module checks failed: " + result.stderr + String(result.error ?? ""));
  return 0;
}

io_eff(CID(verify_opaque), verify_opaque);
