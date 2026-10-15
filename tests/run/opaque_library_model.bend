import Base

# Pure state fixture for the opt-in JavaScript library boundary.
type Phase is Data:
  Idle{}
  Busy{}
type State is Data:
  State{count: Nat, phase: Phase}
type OtherState is Data:
  OtherState{count: Nat}
type Config is Data:
  Config{count: Nat, phase: Phase}
type Boxed is Data:
  Boxed{state: State}
type NonDataState is Type:
  NonDataState{callback: U32 -> U32}

def begin(count: Nat, phase: Phase) -> State:
  State{count, phase}

def other(count: Nat) -> OtherState:
  OtherState{count}

def from_config(config: Config) -> State:
  match config:
    case Config{count, phase}: State{count, phase}

def add(state: State, amount: Nat) -> State:
  match state:
    case State{count, phase}: State{Nat.add(count, amount), phase}

def count(state: State) -> Nat:
  match state:
    case State{count, _}: count

def phase(state: State) -> Phase:
  match state:
    case State{_, phase}: phase

def busy(phase: Phase) -> Bool:
  match phase:
    case Idle{}: False{}
    case Busy{}: True{}

def boxed(state: State) -> Boxed:
  Boxed{state}

def boxed_count(boxed: Boxed) -> Nat:
  match boxed:
    case Boxed{State{count, _}}: count

def main() -> Nat:
  0n

#|0n
