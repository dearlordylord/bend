# Native inputs keep comparison live. Reference never calls String.cmp/order.
import Base

def count() -> IO(Nat):
  import "./string_cmp_intrinsic.js"

def left(index: Nat) -> IO(String):
  import "./string_cmp_intrinsic.js"

def right(index: Nat) -> IO(String):
  import "./string_cmp_intrinsic.js"

def once_check(compare: (Unit -> String) -> (Unit -> String) -> (String & String) & Cmp) -> IO(Bool):
  import "./string_cmp_intrinsic.js"

def compare_once(left: Unit -> String, right: Unit -> String) -> (String & String) & Cmp:
  String.cmp(left(Unit{}), right(Unit{}))

def reference_choice(first: Cmp, rest: Unit -> Cmp) -> Cmp:
  match first:
    case LT{}: LT{}
    case GT{}: GT{}
    case EQ{}: rest(Unit{})

def reference(a: String, b: String) -> Cmp:
  match a b:
    case SNil{} SNil{}: EQ{}
    case SNil{} SCon{_, _}: LT{}
    case SCon{_, _} SNil{}: GT{}
    case SCon{x, xt} SCon{y, yt}:
      reference_choice(Pair.snd(Char & Char, Cmp, Char.cmp(x, y)), _ => reference(xt, yt))

def code(value: Cmp) -> Nat:
  match value:
    case LT{}: 0n
    case EQ{}: 1n
    case GT{}: 2n

def same_result(a: String, b: String, expected: Nat, actual: (String & String) & Cmp) -> Bool:
  ((got_a, got_b), order) = actual
  Bool.and(String.eq(a, got_a), Bool.and(String.eq(b, got_b), Nat.is_eq(expected, code(order))))

def partial(a: String, b: String) -> (String & String) & Cmp:
  compare = String.cmp(a)
  compare(b)

def templated(~compare: String -> String -> (String & String) & Cmp, a: String, b: String) -> (String & String) & Cmp:
  compare(a, b)

def indirect(compare: String -> String -> (String & String) & Cmp, a: String, b: String) -> (String & String) & Cmp:
  compare(a, b)

def get_matches(expected: Nat, result: Map<&2, Nat> & Nat) -> Bool:
  (map, value) = result
  Nat.is_eq(expected, value)

def get_preserved(+a: String, +b: String, +expected_a: Nat, expected: Nat,
  result: Map<&2, Nat> & Nat) -> Bool:
  (+map, value) = result
  Bool.and(Nat.is_eq(expected, value),
    Bool.and(get_matches(expected_a, Map.get(Nat, 99n, map, a)),
      get_matches(22n, Map.get(Nat, 99n, map, b))))

def has_preserved(a: String, b: String, expected_a: Nat, expected: Bool,
  result: Map<&2, Nat> & Bool) -> Bool:
  (+map, value) = result
  Bool.and(Bool.not(Bool.xor(expected, value)),
    Bool.and(get_matches(expected_a, Map.get(Nat, 99n, map, a)),
      get_matches(22n, Map.get(Nat, 99n, map, b))))

def check_map(+a: String, +b: String, +expected_a: Nat, +missing: String,
  +map: Map<&2, Nat>) -> Bool:
  Bool.and(get_preserved(a, b, expected_a, expected_a, Map.get(Nat, 99n, map, a)),
    Bool.and(get_preserved(a, b, expected_a, 22n, Map.get(Nat, 99n, map, b)),
      Bool.and(get_preserved(a, b, expected_a, 99n, Map.get(Nat, 99n, map, missing)),
        Bool.and(has_preserved(a, b, expected_a, True{}, Map.has(&2, Nat, map, a)),
          Bool.and(has_preserved(a, b, expected_a, True{}, Map.has(&2, Nat, map, b)),
            has_preserved(a, b, expected_a, False{}, Map.has(&2, Nat, map, missing)))))))

def maps(+a: String, +b: String) -> Bool:
  check_map(a, b, Bool.pick(Nat, String.eq(a, b), 22n, 11n), String.append(a, "\0missing"),
    Map.set(&2, Nat, Map.set(&2, Nat, MTip{}, a, 11n), b, 22n))

def agrees(+a: String, +b: String) -> Bool:
  +expected = code(reference(a, b))
  Bool.and(same_result(a, b, expected, String.cmp(a, b)),
    Bool.and(same_result(a, b, expected, partial(a, b)),
      Bool.and(same_result(a, b, expected, templated(~String.cmp, a, b)),
        Bool.and(same_result(a, b, expected, indirect(String.cmp, a, b)), maps(a, b)))))

def score(value: Bool) -> Nat:
  match value:
    case True{}: 0n
    case False{}: 1n

def run(remaining: Nat, +index: Nat) -> IO(Nat):
  match remaining:
    case 0n: IO.pure(Nat, 0n)
    case 1n++remaining:
      do IO<Nat>:
        a: String <- left(index)
        b: String <- right(index)
        rest: Nat <- run(remaining, (index + 1n : Nat))
        return (score(agrees(a, b)) + rest : Nat)

def main() -> IO(Unit):
  do IO<Unit>:
    n: Nat <- count()
    failures: Nat <- run(n, 0n)
    once: Bool <- once_check(compare_once)
    IO.print(Nat.show((failures + score(once) : Nat)))

#|0
