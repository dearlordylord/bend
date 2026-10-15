# Pending template keys stay stable across opaque root models and live groups.
import Base

def apply(~f: Nat -> Nat, value: Nat) -> Nat:
  f(value)

def twice(~f: Nat -> Nat, value: Nat) -> Nat:
  apply(~f, apply(~f, value))

def tag(~A: Type, value: A) -> A:
  value

def step(value: Nat) -> Nat:
  Nat.add(value, 1n)

def application_exact(~f: Nat -> Nat, +value: Nat)
  -> {apply(~f, value) == f(value) : Nat}:
  {==}

def identity_exact(+value: Nat)
  -> {twice(~(x => x), value) == value : Nat}:
  {==}

# String.cmp's live cycle exercises regrouping and the worklist undo path.
def compare(left: String, right: String) -> Bool:
  String.eq(left, right)

def main() -> Nat:
  tag(~Nat, twice(~step, 3n))

#|5n
