# Independent original Base equations; runtime inputs prevent constant folding.
import Base

def count() -> IO(Nat):
  import "./map_keys_intrinsic.js"

def left(index: Nat) -> IO(String):
  import "./map_keys_intrinsic.js"

def right(index: Nat) -> IO(String):
  import "./map_keys_intrinsic.js"

def position(index: Nat) -> IO(Nat):
  import "./map_keys_intrinsic.js"

def once_check(bit: (Unit -> String) -> (Unit -> Nat) -> String & Bool,
  diff: (Unit -> String) -> (Unit -> String) -> Nat) -> IO(Bool):
  import "./map_keys_intrinsic.js"

def bit_once(key: Unit -> String, pos: Unit -> Nat) -> String & Bool:
  Map.bit(key(Unit{}), pos(Unit{}))

def diff_once(a: Unit -> String, b: Unit -> String) -> Nat:
  Map.diff(a(Unit{}), b(Unit{}))

def ref_bit.u(x: U32, k: Nat) -> Bool:
  U32.is_ne(U32.and(U32.shrn(x, k), 1), 0)

def ref_bit.chr(c: Char, off: Nat) -> Char & Bool:
  match c off:
    case Chr{x} 0n:
      (Chr{x}, True{})
    case Chr{+x} 1n+b:
      (Chr{x}, ref_bit.u(x, Nat.sub(31n, b)))

def ref_bit.go.chr(t: String, r: Char & Bool) -> String & Bool:
  (c2, b) = r
  (SCon{c2, t}, b)

def ref_bit.go.rec(c: Char, r: String & Bool) -> String & Bool:
  (t2, b) = r
  (SCon{c, t2}, b)

def ref_bit.go(key: String, ci: Nat, off: Nat) -> String & Bool:
  match key:
    case SNil{}:
      (SNil{}, False{})
    case SCon{c, t}:
      match ci:
        case 0n:
          ref_bit.go.chr(t, ref_bit.chr(c, off))
        case 1n+j:
          ref_bit.go.rec(c, ref_bit.go(t, j, off))

def ref_bit.at(key: String, co: Nat & Nat) -> String & Bool:
  (ci, off) = co
  ref_bit.go(key, ci, off)

def ref_bit(key: String, pos: Nat) -> String & Bool:
  ref_bit.at(key, Nat.divmod(pos, 33n))

def ref_msb_choice(z: Bool, rest: Unit -> Nat) -> Nat:
  match z:
    case True{}: 0n
    case False{}: Nat.add(1n, rest(Unit{}))

def ref_msb.u(n: Nat, +x: U32) -> Nat:
  match n:
    case 0n: 0n
    case 1n+p:
      ref_msb_choice(U32.is_zero(x), _ => ref_msb.u(p, U32.shr(x)))

def ref_diff.chr(x: U32) -> Nat:
  Nat.sub(33n, ref_msb.u(32n, x))

def ref_diff.step(x: Char, y: Char) -> Nat & Bool:
  match x y:
    case Chr{+cx} Chr{+cy}:
      (ref_diff.chr(U32.xor(cx, cy)), U32.is_eq(cx, cy))

def ref_diff_choice(rc: Nat & Bool, rest: Unit -> Nat) -> Nat:
  (r, c) = rc
  match c:
    case True{}: Nat.add(33n, rest(Unit{}))
    case False{}: r

def ref_diff(a: String, b: String) -> Nat:
  match a b:
    case SNil{} _: 0n
    case SCon{_, _} SNil{}: 0n
    case SCon{x, xt} SCon{y, yt}:
      ref_diff_choice(ref_diff.step(x, y), _ => ref_diff(xt, yt))

def same_bit(expected: String & Bool, actual: String & Bool) -> Bool:
  (key, bit) = expected
  (got_key, got_bit) = actual
  Bool.and(String.eq(key, got_key), Bool.not(Bool.xor(bit, got_bit)))

def partial_bit(key: String, pos: Nat) -> String & Bool:
  f = Map.bit(key)
  f(pos)

def template_bit(~f: String -> Nat -> String & Bool, key: String, pos: Nat) -> String & Bool:
  f(key, pos)

def indirect_bit(f: String -> Nat -> String & Bool, key: String, pos: Nat) -> String & Bool:
  f(key, pos)

def partial_diff(a: String, b: String) -> Nat:
  f = Map.diff(a)
  f(b)

def template_diff(~f: String -> String -> Nat, a: String, b: String) -> Nat:
  f(a, b)

def indirect_diff(f: String -> String -> Nat, a: String, b: String) -> Nat:
  f(a, b)

def same_map(a: Map<&2, Nat>, b: Map<&2, Nat>) -> Bool:
  match a b:
    case MTip{} MTip{}: True{}
    case MLeaf{k, v} MLeaf{j, w}:
      Bool.and(String.eq(k, j), Nat.is_eq(v, w))
    case MNode{p, lo, hi} MNode{q, low, high}:
      Bool.and(Nat.is_eq(p, q), Bool.and(same_map(lo, low), same_map(hi, high)))
    case _ _: False{}

def expected_branch(+a: String, b: String, va: Nat, vb: Nat, p: Nat, bit: String & Bool) -> Map<&2, Nat>:
  (_, high) = bit
  match high:
    case True{}: MNode{p, MLeaf{b, vb}, MLeaf{a, va}}
    case False{}: MNode{p, MLeaf{a, va}, MLeaf{b, vb}}

def expected_pair(same: Bool, +a: String, +b: String, va: Nat, +vb: Nat) -> Map<&2, Nat>:
  match same:
    case True{}: MLeaf{b, vb}
    case False{}:
      +p = ref_diff(a, b)
      expected_branch(a, b, va, vb, p, ref_bit(a, p))

def get_exact(expected: Map<&2, Nat>, value: Nat, actual: Map<&2, Nat> & Nat) -> Bool:
  (map, got) = actual
  Bool.and(same_map(expected, map), Nat.is_eq(value, got))

def has_exact(expected: Map<&2, Nat>, value: Bool, actual: Map<&2, Nat> & Bool) -> Bool:
  (map, got) = actual
  Bool.and(same_map(expected, map), Bool.not(Bool.xor(value, got)))

def maybe_exact(value: Nat, actual: Maybe<&2, Nat>) -> Bool:
  match actual:
    case Some{got}: Nat.is_eq(value, got)
    case None{}: False{}

def pop_exact(expected: Map<&2, Nat>, value: Nat, actual: Map<&2, Nat> & Maybe<&2, Nat>) -> Bool:
  (map, got) = actual
  Bool.and(same_map(expected, map), maybe_exact(value, got))

def pop_miss(expected: Map<&2, Nat>, actual: Map<&2, Nat> & Maybe<&2, Nat>) -> Bool:
  (map, got) = actual
  match got:
    case None{}: same_map(expected, map)
    case Some{_}: False{}

def maps(+a: String, +b: String) -> Bool:
  +same = String.eq(a, b)
  +value_a = Bool.pick(Nat, same, 22n, 11n)
  +expected = expected_pair(same, a, b, 11n, 22n)
  +map = Map.set(&2, Nat, Map.set(&2, Nat, MTip{}, a, 11n), b, 22n)
  +missing = String.append(String.append(a, b), "\0missing")
  +reversed = Map.set(&2, Nat, Map.set(&2, Nat, MTip{}, b, 22n), a, value_a)
  Bool.and(same_map(expected, map),
    Bool.and(same_map(expected, reversed),
      Bool.and(same_map(expected_pair(same, a, b, 77n, 77n),
          Map.set(&2, Nat, Map.set(&2, Nat, map, a, 77n), b, 77n)),
        Bool.and(get_exact(expected, value_a, Map.get(Nat, 99n, map, a)),
          Bool.and(get_exact(expected, 99n, Map.get(Nat, 99n, map, missing)),
            Bool.and(has_exact(expected, True{}, Map.has(&2, Nat, map, b)),
              Bool.and(has_exact(expected, False{}, Map.has(&2, Nat, map, missing)),
                Bool.and(pop_exact(Bool.pick(Map<&2, Nat>, same, MTip{}, MLeaf{b, 22n}),
                    value_a, Map.pop(&2, Nat, map, a)),
                  pop_miss(expected, Map.pop(&2, Nat, map, missing))))))))))

def agrees(+a: String, +b: String, +pos: Nat) -> Bool:
  +expected = ref_diff(a, b)
  Bool.and(same_bit(ref_bit(a, pos), Map.bit(a, pos)),
    Bool.and(same_bit(ref_bit(a, pos), partial_bit(a, pos)),
      Bool.and(same_bit(ref_bit(a, pos), template_bit(~Map.bit, a, pos)),
        Bool.and(same_bit(ref_bit(a, pos), indirect_bit(Map.bit, a, pos)),
          Bool.and(Nat.is_eq(expected, Map.diff(a, b)),
            Bool.and(Nat.is_eq(expected, partial_diff(a, b)),
              Bool.and(Nat.is_eq(expected, template_diff(~Map.diff, a, b)),
                Nat.is_eq(expected, indirect_diff(Map.diff, a, b)))))))))

def score(value: Bool) -> Nat:
  match value:
    case True{}: 0n
    case False{}: 1n

def run(remaining: Nat, +index: Nat) -> IO(Nat):
  match remaining:
    case 0n: IO.pure(Nat, 0n)
    case 1n++remaining:
      do IO<Nat>:
        +a: String <- left(index)
        +b: String <- right(index)
        pos: Nat <- position(index)
        rest: Nat <- run(remaining, (index + 1n : Nat))
        return (score(Bool.and(agrees(a, b, pos), maps(a, b))) + rest : Nat)

def main() -> IO(Unit):
  do IO<Unit>:
    n: Nat <- count()
    failures: Nat <- run(n, 0n)
    once: Bool <- once_check(bit_once, diff_once)
    IO.print(Nat.show((failures + score(once) : Nat)))

#|0
