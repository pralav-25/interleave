import { defaultExperiment, experiments } from './experiments.ts';
import { advance, replay, type Actor, type Mode } from './engine.ts';
export interface Session {
  id: string;
  mode: Mode;
  trace: Actor[];
  cursor: number;
}
export const initialSession: Session = {
  id: defaultExperiment.id,
  mode: 'buggy',
  trace: [],
  cursor: 0,
};
export type Action =
  | { type: 'select'; id: string }
  | { type: 'mode'; mode: Mode }
  | { type: 'reset' }
  | { type: 'seek'; cursor: number }
  | { type: 'step'; actor: Actor }
  | { type: 'load'; session: Session };
export function sessionReducer(state: Session, action: Action): Session {
  const experiment = experiments.find((e) => e.id === state.id)!;
  switch (action.type) {
    case 'select':
      return experiments.some((e) => e.id === action.id)
        ? { ...initialSession, id: action.id }
        : state;
    case 'mode':
      return { ...state, mode: action.mode, trace: [], cursor: 0 };
    case 'reset':
      return { ...state, trace: [], cursor: 0 };
    case 'seek':
      return {
        ...state,
        cursor: Math.max(
          0,
          Math.min(state.trace.length, Math.trunc(action.cursor)),
        ),
      };
    case 'step': {
      const program = experiment.make(state.mode);
      try {
        const run = advance(
          program,
          replay(program, state.trace.slice(0, state.cursor)),
          action.actor,
        );
        return { ...state, trace: run.schedule, cursor: run.schedule.length };
      } catch {
        return state;
      }
    }
    case 'load': {
      const incoming = action.session;
      const e = experiments.find((e) => e.id === incoming.id);
      if (!e || (incoming.mode !== 'fixed' && incoming.mode !== 'buggy'))
        return state;
      try {
        replay(e.make(incoming.mode), incoming.trace);
        if (
          !Number.isInteger(incoming.cursor) ||
          incoming.cursor < 0 ||
          incoming.cursor > incoming.trace.length
        )
          return state;
        return { ...incoming, trace: [...incoming.trace] };
      } catch {
        return state;
      }
    }
  }
}
