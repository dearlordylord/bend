import Base

# Exercise actual emitted modules: opaque state reuse and strict isolation.
law verify_opaque:
  IO(U32)

def verify_opaque():
  import "./opaque_library.js"

def main() -> IO(Unit):
  do IO<Unit>:
    answer: U32 <- verify_opaque()
    printed: Unit <- IO.print(U32.show(answer))
    return Unit{}

#|0
