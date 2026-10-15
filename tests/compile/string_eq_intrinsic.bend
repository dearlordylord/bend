# JS String.eq agrees with the independent source ordering semantics.
# Inputs cross IO so equality is tested at runtime, never constant-folded.
import Base

def count() -> IO(Nat):
  import "./string_eq_intrinsic.js"

def left(index: Nat) -> IO(String):
  import "./string_eq_intrinsic.js"

def right(index: Nat) -> IO(String):
  import "./string_eq_intrinsic.js"

def reference(a: String, b: String) -> Bool:
  Cmp.is_eq(String.order(a, b))

def partial(a: String, b: String) -> Bool:
  compare = String.eq(a)
  compare(b)

def templated(~compare: String -> String -> Bool, a: String, b: String) -> Bool:
  compare(a, b)

def indirect(compare: String -> String -> Bool, a: String, b: String) -> Bool:
  compare(a, b)

def agrees(+a: String, +b: String) -> Bool:
  +expected = reference(a, b)
  Bool.and(
    Bool.not(Bool.xor(String.eq(a, b), expected)),
    Bool.and(Bool.not(Bool.xor(partial(a, b), expected)),
      Bool.and(Bool.not(Bool.xor(templated(~String.eq, a, b), expected)),
        Bool.not(Bool.xor(indirect(String.eq, a, b), expected)))))

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
    IO.print(Nat.show(failures))

#|0
