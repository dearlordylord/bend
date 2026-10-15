import Base

# Live spines must retain the same erased arity for Data and affine payloads.
def append_data(xs: List<&2, Nat>, ys: List<&2, Nat>) -> List<&2, Nat>:
  List.append(&2, Nat, xs, ys)

def append_affine(xs: List<&1, Unit -> Nat>, ys: List<&1, Unit -> Nat>) -> List<&1, Unit -> Nat>:
  List.append(&1, Unit -> Nat, xs, ys)

def append_erased(xs: List<&0, U32>, ys: List<&0, U32>) -> List<&0, U32>:
  List.append(&0, U32, xs, ys)

def concat_affine(xs: List<&1, List<&1, Unit -> Nat>>) -> List<&1, Unit -> Nat>:
  List.concat(&1, Unit -> Nat, xs)

def concat_erased(xs: List<&0, List<&0, U32>>) -> List<&0, U32>:
  List.concat(&0, U32, xs)

# Independent original equations, never calling the optimized operations.
def reference_append(a, -A: Kind(a), xs: List<a, A>, ys: List<a, A>) -> List<a, A>:
  match xs:
    case Nil{}: ys
    case h <> t: h <> reference_append(a, A, t, ys)

def reference_concat(a, -A: Kind(a), xs: List<a, List<a, A>>) -> List<a, A>:
  match xs:
    case Nil{}: Nil{}
    case h <> t: reference_append(a, A, h, reference_concat(a, A, t))

def reference_string(xs: List<&2, String>) -> String:
  match xs:
    case Nil{}: ""
    case h <> t: String.append(h, reference_string(t))

def append_partial(xs: List<&2, Nat>, ys: List<&2, Nat>) -> List<&2, Nat>:
  f = List.append(&2, Nat, xs)
  f(ys)

def append_template(~f: List<&2, Nat> -> List<&2, Nat> -> List<&2, Nat>, xs: List<&2, Nat>, ys: List<&2, Nat>) -> List<&2, Nat>:
  f(xs, ys)

def append_indirect(f: List<&2, Nat> -> List<&2, Nat> -> List<&2, Nat>, xs: List<&2, Nat>, ys: List<&2, Nat>) -> List<&2, Nat>:
  f(xs, ys)

def append_forms(+xs: List<&2, Nat>, +ys: List<&2, Nat>) -> List<&2, List<&2, Nat>>:
  [append_data(xs, ys), append_partial(xs, ys),
    append_template(~List.append(&2, Nat), xs, ys),
    append_indirect(List.append(&2, Nat), xs, ys)]

def concat_partial(xs: List<&2, List<&2, Nat>>) -> List<&2, Nat>:
  f = List.concat(&2, Nat)
  f(xs)

def concat_template(~f: List<&2, List<&2, Nat>> -> List<&2, Nat>, xs: List<&2, List<&2, Nat>>) -> List<&2, Nat>:
  f(xs)

def concat_indirect(f: List<&2, List<&2, Nat>> -> List<&2, Nat>, xs: List<&2, List<&2, Nat>>) -> List<&2, Nat>:
  f(xs)

def concat_forms(+xs: List<&2, List<&2, Nat>>) -> List<&2, List<&2, Nat>>:
  [List.concat(&2, Nat, xs), concat_partial(xs),
    concat_template(~List.concat(&2, Nat), xs), concat_indirect(List.concat(&2, Nat), xs)]

def string_partial(xs: List<&2, String>) -> String:
  f = String.concat
  f(xs)

def string_template(~f: List<&2, String> -> String, xs: List<&2, String>) -> String:
  f(xs)

def string_indirect(f: List<&2, String> -> String, xs: List<&2, String>) -> String:
  f(xs)

def string_forms(+xs: List<&2, String>) -> List<&2, String>:
  [String.concat(xs), string_partial(xs),
    string_template(~String.concat, xs), string_indirect(String.concat, xs)]

def append_once(left: Unit -> List<&2, Nat>, right: Unit -> List<&2, Nat>) -> List<&2, Nat>:
  List.append(&2, Nat, left(Unit{}), right(Unit{}))

def concat_once(source: Unit -> List<&2, List<&2, Nat>>) -> List<&2, Nat>:
  List.concat(&2, Nat, source(Unit{}))

def string_once(source: Unit -> List<&2, String>) -> String:
  String.concat(source(Unit{}))

def check(
  append: @+xs: List<&2, Nat> -> @+ys: List<&2, Nat> -> List<&2, List<&2, Nat>>,
  concat: @+xs: List<&2, List<&2, Nat>> -> List<&2, List<&2, Nat>>,
  strings: @+xs: List<&2, String> -> List<&2, String>,
  ref_append: List<&2, Nat> -> List<&2, Nat> -> List<&2, Nat>,
  ref_concat: List<&2, List<&2, Nat>> -> List<&2, Nat>,
  ref_string: List<&2, String> -> String,
  affine_append: List<&1, Unit -> Nat> -> List<&1, Unit -> Nat> -> List<&1, Unit -> Nat>,
  affine_concat: List<&1, List<&1, Unit -> Nat>> -> List<&1, Unit -> Nat>,
  erased_append: List<&0, U32> -> List<&0, U32> -> List<&0, U32>,
  erased_concat: List<&0, List<&0, U32>> -> List<&0, U32>,
  once: (Unit -> List<&2, Nat>) -> (Unit -> List<&2, Nat>) -> List<&2, Nat>,
  concat_once: (Unit -> List<&2, List<&2, Nat>>) -> List<&2, Nat>,
  string_once: (Unit -> List<&2, String>) -> String
) -> IO(Bool):
  import "./sequence_concat_intrinsic.js"

def main() -> IO(Unit):
  do IO<Unit>:
    ok: Bool <- check(append_forms, concat_forms, string_forms,
      reference_append(&2, Nat), reference_concat(&2, Nat), reference_string,
      append_affine, concat_affine, append_erased, concat_erased, append_once, concat_once, string_once)
    IO.print(Bool.pick(String, ok, "0", "1"))

#|0
