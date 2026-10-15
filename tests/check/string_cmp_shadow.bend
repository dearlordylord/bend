# A Base String.cmp definition cannot be replaced by user code.
import Base

def String.cmp(a: String, b: String) -> (String & String) & Cmp:
  ((a, b), GT{})

#|SOME PROOFS FAIL
#|Error:
#|- expected : a fresh name (duplicate declaration: String.cmp)
#|- observed : 'String.cmp'
#|Location:
#|3 | 
#|4>| def String.cmp(a: String, b: String) -> (String & String) & Cmp:
#|  |     ^^^^^^^^^^
#|5 |   ((a, b), GT{})
#|exit 1
