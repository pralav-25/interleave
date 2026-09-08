/** A finite, sequentially consistent teaching model. No user code is evaluated. */
export type Actor = 0 | 1;
export type Value = number | string | boolean | null;
export type Mode = 'buggy' | 'fixed';
export interface Frame {
  shared: Record<string, Value>;
  locals: [Record<string, Value>, Record<string, Value>];
  locks: Record<string, Actor | null>;
  pc: [number, number];
}
export interface Operation {
  code: string;
  run: (frame: Frame, actor: Actor) => string;
  enabled?: (frame: Frame, actor: Actor) => boolean;
}
export interface Program {
  initial: Record<string, Value>;
  actors: [string, string];
  steps: [Operation[], Operation[]];
  invariant: (frame: Frame) => boolean;
  expected: string;
}
export interface Experiment {
  id: string;
  title: string;
  subtitle: string;
  headline: string;
  description: string;
  category: string;
  explanation: string;
  fix: string;
  assumption: string;
  source: { label: string; url: string };
  make: (mode: Mode) => Program;
}
export interface Event {
  actor: Actor;
  index: number;
  code: string;
  message: string;
}
export interface Run {
  frame: Frame;
  events: Event[];
  schedule: Actor[];
}
export type Outcome = 'running' | 'pass' | 'fail' | 'deadlock';
export interface ScheduleResult {
  schedule: Actor[];
  outcome: Exclude<Outcome, 'running'>;
}
export function initialRun(program: Program): Run {
  return {
    frame: {
      shared: { ...program.initial },
      locals: [{}, {}],
      locks: {},
      pc: [0, 0],
    },
    events: [],
    schedule: [],
  };
}
export function enabledActors(program: Program, frame: Frame): Actor[] {
  return ([0, 1] as Actor[]).filter((actor) => {
    const op = program.steps[actor][frame.pc[actor]];
    return Boolean(op && (!op.enabled || op.enabled(frame, actor)));
  });
}
export function outcome(program: Program, frame: Frame): Outcome {
  if (frame.pc.every((pc, a) => pc === program.steps[a].length))
    return program.invariant(frame) ? 'pass' : 'fail';
  return enabledActors(program, frame).length ? 'running' : 'deadlock';
}
export function advance(program: Program, run: Run, actor: Actor): Run {
  if (!enabledActors(program, run.frame).includes(actor))
    throw new Error(
      `Worker ${actor === 0 ? 'A' : 'B'} cannot run at this step.`,
    );
  const frame: Frame = {
    shared: { ...run.frame.shared },
    locals: [{ ...run.frame.locals[0] }, { ...run.frame.locals[1] }],
    locks: { ...run.frame.locks },
    pc: [...run.frame.pc],
  };
  const index = frame.pc[actor];
  const op = program.steps[actor][index];
  const message = op.run(frame, actor);
  frame.pc[actor]++;
  return {
    frame,
    events: [...run.events, { actor, index, code: op.code, message }],
    schedule: [...run.schedule, actor],
  };
}
export function replay(program: Program, schedule: readonly Actor[]): Run {
  if (schedule.length > 64) throw new Error('Schedule is too long.');
  return schedule.reduce((run, actor) => {
    if (actor !== 0 && actor !== 1) throw new Error('Invalid worker.');
    return advance(program, run, actor);
  }, initialRun(program));
}
/** Explore terminal schedules, not deduplicated states. Counts are not probabilities. */
export function explore(
  program: Program,
  maxNodes = 50000,
): { results: ScheduleResult[]; complete: boolean; visited: number } {
  const results: ScheduleResult[] = [];
  let visited = 0;
  let complete = true;
  function visit(run: Run) {
    if (visited >= maxNodes) {
      complete = false;
      return;
    }
    visited++;
    const status = outcome(program, run.frame);
    if (status !== 'running') {
      results.push({ schedule: run.schedule, outcome: status });
      return;
    }
    for (const actor of enabledActors(program, run.frame))
      visit(advance(program, run, actor));
  }
  visit(initialRun(program));
  return { results, complete, visited };
}
export function encodeReplay(
  id: string,
  mode: Mode,
  schedule: readonly Actor[],
): string {
  return new URLSearchParams({
    v: '1',
    lab: id,
    mode,
    trace: schedule.map((a) => (a === 0 ? 'A' : 'B')).join(''),
  }).toString();
}
export function decodeReplay(
  hash: string,
  experiments: readonly Experiment[],
): { id: string; mode: Mode; schedule: Actor[] } | null {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  if (!p.has('lab')) return null;
  const id = p.get('lab') ?? '';
  const mode = p.get('mode');
  const trace = p.get('trace') ?? '';
  if (
    p.get('v') !== '1' ||
    !experiments.some((e) => e.id === id) ||
    (mode !== 'buggy' && mode !== 'fixed') ||
    !/^[AB]{0,64}$/.test(trace)
  )
    throw new Error(
      'This replay link is invalid or uses an unsupported version.',
    );
  const schedule = Array.from(trace, (c) => (c === 'A' ? 0 : 1)) as Actor[];
  const experiment = experiments.find((e) => e.id === id)!;
  replay(experiment.make(mode), schedule);
  return { id, mode, schedule };
}
export function traceMarkdown(
  experiment: Experiment,
  mode: Mode,
  run: Run,
  url: string,
): string {
  const program = experiment.make(mode);
  const lines = run.events
    .map(
      (e, i) =>
        `| ${i + 1} | ${e.actor === 0 ? 'A' : 'B'} | \`${e.code}\` | ${e.message} |`,
    )
    .join('\n');
  return `# Interleave: ${experiment.title}\n\nMode: **${mode}** · Result: **${outcome(program, run.frame)}**\n\n[Replay this schedule](${url})\n\n| Step | Worker | Operation | Result |\n| --- | --- | --- | --- |\n${lines}\n\n## Final shared state\n\n\`\`\`json\n${JSON.stringify(run.frame.shared, null, 2)}\n\`\`\`\n\nInvariant: ${program.expected}\n\nModel: ${experiment.assumption}\n\nCreated with [Interleave](https://github.com/pralav-25/interleave) by [Pralav Singh](https://github.com/pralav-25).\n`;
}
