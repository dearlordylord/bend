function check(append, concat, strings, ref_append, ref_concat, ref_string,
  affine_append, affine_concat, erased_append, erased_concat, once, concat_once, string_once) {
  const nil = () => Object.freeze({$: CID(Nil)});
  const list = values => values.reduceRight((tail, head) => Object.freeze({$: CID(Con), head, tail}), nil());
  const array = xs => { const out = []; while (xs.$ !== CID(Nil)) { out.push(xs.head); xs = xs.tail; } return out; };
  const equal = (a, b) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const require = (ok, label) => { if (!ok) throw new Error(label); };
  const suffix = (xs, n) => { while (n-- > 0) xs = xs.tail; return xs; };
  const nodes = xs => { const out = []; while (xs.$ !== CID(Nil)) { out.push(xs); xs = xs.tail; } return out; };
  const samples = [[], [0], [1, 2], [0, 7, 99, 1]];
  for (const left of samples) for (const right of samples) {
    const a = list(left), b = list(right), expected = array(ref_append(a)(b));
    for (const result of array(append(a)(b))) {
      require(equal(array(result), expected), 'append equations');
      require(suffix(result, left.length) === b, 'append right tail identity');
      for (let i = 0; i < left.length; i++) require(suffix(result, i) !== suffix(a, i), 'append copies left spine');
    }
  }
  for (const parts of [[], [[]], [[1]], [[], [1, 2], [], [7], []], [[1], [2], [3]]]) {
    const inputs = parts.map(list), xs = list(inputs), expected = array(ref_concat(xs));
    const original = new Set(inputs.flatMap(nodes));
    for (const result of array(concat(xs))) {
      require(equal(array(result), expected), 'concat equations');
      require(nodes(result).every(node => !original.has(node)), 'concat copies every inner spine');
    }
  }
  const texts = [[], [''], ['', 'a', ''], ['a', '\0', 'é', '\u{10000}'], ['\uD800', '\uDC00', '\uDC00', '\uD800']];
  for (const parts of texts) {
    const xs = list(parts), expected = ref_string(xs);
    require(array(strings(xs)).every(value => value === expected), 'string equations and UTF16');
  }
  const large = Array.from({length: 25000}, (_, i) => i);
  const a = list(large), b = list([42]);
  for (const result of array(append(a)(b))) {
    require(equal(array(result), [...large, 42]), 'deep append');
    require(suffix(result, large.length) === b, 'deep append right tail');
  }
  const chunks = list(large.map(x => list([x])));
  require(array(concat(chunks)).every(result => equal(array(result), large)), 'deep concat');
  const segments = list(large.map(() => 'x'));
  require(array(strings(segments)).every(value => value === 'x'.repeat(large.length)), 'deep string concat');
  let invoked = 0;
  const f = () => { invoked++; return 1; }, g = () => { invoked++; return 2; };
  const fa = list([f]), fb = list([g]);
  const affine = affine_append(fa)(fb);
  require(equal(array(affine), [f, g]) && suffix(affine, 1) === fb, 'affine append payloads');
  require(equal(array(affine_concat(list([fa, fb]))), [f, g]), 'affine concat payloads');
  require(invoked === 0, 'affine payloads must never be invoked');
  require(equal(array(erased_append(list([7]))(list([9]))), [7, 9]), 'erased append arity');
  require(equal(array(erased_concat(list([list([7]), list([9])]))), [7, 9]), 'erased concat arity');
  const trace = [];
  const result = once(() => { trace.push('left'); return list([1]); })(() => { trace.push('right'); return b; });
  require(trace.join(',') === 'left,right' && suffix(result, 1) === b, 'single evaluation left-to-right');
  const concatenated = concat_once(() => { trace.push('concat'); return list([list([1]), b]); });
  const combined = string_once(() => { trace.push('string'); return list(['a', 'b']); });
  require(trace.join(',') === 'left,right,concat,string' && equal(array(concatenated), [1, 42]) && combined === 'ab', 'single evaluation unary operations');
  const spineReads = fn => {
    const trace = [];
    const cell = (name, head, tail) => Object.freeze({$: CID(Con),
      get head() { trace.push(name + ':head'); return head; },
      get tail() { trace.push(name + ':tail'); return tail; }});
    const xs = cell('outer-left', cell('inner-left', 1, nil()),
      cell('outer-right', cell('inner-right', 2, nil()), nil()));
    fn(xs);
    return trace;
  };
  require(equal(spineReads(concat), Array(4).fill(spineReads(ref_concat)).flat()), 'concat spine evaluation order');
  // Actual raw primitive tokens retain right-to-left default-hint coercion.
  for (const token of [undefined, null, false, 0, -0, NaN, 4n, 'x', Symbol('raw')]) {
    const run = fn => { try { return {value: fn(list(['a', token, 'b']))}; } catch (error) { return {error}; } };
    const expected = run(ref_string), actual = run(xs => array(strings(xs)));
    if ('error' in expected) require(actual.error instanceof expected.error.constructor, 'raw token refusal');
    else require(actual.value.every(value => Object.is(value, expected.value)), 'raw token conversion');
  }
  const coercions = fn => {
    const trace = [], failure = {raw: true};
    const value = name => ({[Symbol.toPrimitive](hint) { trace.push(name + ':' + hint); return name; }});
    const ok = fn(list([value('left'), value('middle'), value('right')]));
    return {trace, ok, failure};
  };
  const expectedCoercions = coercions(ref_string), actualCoercions = coercions(xs => array(strings(xs)));
  require(equal(actualCoercions.trace, Array(4).fill(expectedCoercions.trace).flat()), 'coercion chronology/default hint');
  require(actualCoercions.ok.every(value => value === expectedCoercions.ok), 'coercion values');
  for (const original of [undefined, null, false, 0, '', {raw: 'error'}]) {
    const run = fn => {
      const trace = [];
      const value = (name, fail) => ({[Symbol.toPrimitive](hint) { trace.push(name + ':' + hint); if (fail) throw original; return name; }});
      try { fn(list([value('left', false), value('middle', true), value('right', false)])); return {raised: false}; }
      catch (error) { return {raised: true, error, trace}; }
    };
    const expected = run(ref_string), actual = run(strings);
    require(actual.raised && Object.is(actual.error, original) && equal(actual.trace, expected.trace), 'raw failure identity/order');
  }
  return true;
}
io_eff(CID(check), check);
