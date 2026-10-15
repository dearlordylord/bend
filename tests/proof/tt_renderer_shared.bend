# Repeated types and levels, rewrite motives, and x/xx prefix collisions.
import Base

type Twin<-A: Type> is Type:
  Twin{first: A, second: A}

def x0(value: Nat) -> Nat:
  value

def xx0(value: Nat) -> Nat:
  value

def duplicate(+value: Nat) -> Twin<Nat>:
  Twin{value, value}

def unpack(value: Twin<Nat>) -> Nat:
  match value:
    case Twin{first, second}: Nat.add(first, second)

def identity(+value: Nat) -> {x0(value) == xx0(value) : Nat}:
  {==}

def rewrite(+left: Nat, +right: Nat, same: {left == right : Nat})
  -> {x0(left) == xx0(right) : Nat}:
  %same : {x0(left) == xx0(_) : Nat}
  {==}

def main() -> Nat:
  unpack(duplicate(3n))

#|6n
