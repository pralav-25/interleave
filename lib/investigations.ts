import { z } from 'zod';
import { experiments } from './experiments.ts';
import { replay, type Actor, type Mode } from './engine.ts';
export const MAX_INVESTIGATIONS = 50;
export const createInvestigationSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    experimentId: z.enum(experiments.map((e) => e.id) as [string, ...string[]]),
    mode: z.enum(['buggy', 'fixed']),
    trace: z
      .string()
      .max(64)
      .regex(/^[AB]*$/),
    notes: z.string().max(10000).default(''),
  })
  .strict()
  .superRefine((value, ctx) => {
    const e = experiments.find((e) => e.id === value.experimentId);
    try {
      if (!e) throw new Error();
      replay(e.make(value.mode), decodeTrace(value.trace));
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'The schedule is not valid for this experiment.',
        path: ['trace'],
      });
    }
  });
export const updateInvestigationSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    notes: z.string().max(10000),
    version: z.number().int().positive(),
  })
  .strict();
export type CreateInvestigation = z.infer<typeof createInvestigationSchema>;
export interface Investigation {
  id: string;
  title: string;
  experimentId: string;
  mode: Mode;
  trace: string;
  notes: string;
  version: number;
  createdAt: number;
  updatedAt: number;
}
export function decodeTrace(trace: string): Actor[] {
  return Array.from(trace, (c) => (c === 'A' ? 0 : 1));
}
