import assert from 'node:assert/strict';
import test from 'node:test';
import { filterInvestigations } from '../lib/investigation-search.ts';
import type { Investigation } from '../lib/investigations.ts';

const items: Investigation[] = [
  {
    id: 'a',
    title: 'Retry analysis',
    notes: 'A second payment must wait.',
    experimentId: 'double-payment',
    mode: 'buggy',
    trace: '',
    version: 1,
    createdAt: 1,
    updatedAt: 30,
  },
  {
    id: 'b',
    title: 'Atomic fix',
    notes: 'Counter increments safely.',
    experimentId: 'lost-update',
    mode: 'fixed',
    trace: '',
    version: 1,
    createdAt: 2,
    updatedAt: 10,
  },
  {
    id: 'c',
    title: 'Counter race',
    notes: 'Both workers read zero.',
    experimentId: 'lost-update',
    mode: 'buggy',
    trace: '',
    version: 1,
    createdAt: 3,
    updatedAt: 20,
  },
];
const ids = (rows: Investigation[]) => rows.map((row) => row.id);

void test('searches titles, private notes, and experiment names with trimmed case-insensitive text', () => {
  assert.deepEqual(ids(filterInvestigations(items, { query: ' RETRY ' })), [
    'a',
  ]);
  assert.deepEqual(ids(filterInvestigations(items, { query: 'read zero' })), [
    'c',
  ]);
  assert.deepEqual(ids(filterInvestigations(items, { query: 'lost update' })), [
    'c',
    'b',
  ]);
});

void test('combines search, experiment and implementation filters', () => {
  assert.deepEqual(
    ids(
      filterInvestigations(items, {
        query: 'counter',
        experimentId: 'lost-update',
        mode: 'fixed',
      }),
    ),
    ['b'],
  );
  assert.deepEqual(
    filterInvestigations(items, {
      experimentId: 'double-payment',
      mode: 'fixed',
    }),
    [],
  );
  assert.deepEqual(filterInvestigations(items, { query: 'no match' }), []);
  assert.deepEqual(filterInvestigations([], { query: 'anything' }), []);
});

void test('sorts by updated time or title without changing the source snapshot', () => {
  const snapshot = structuredClone(items);
  assert.deepEqual(ids(filterInvestigations(items)), ['a', 'c', 'b']);
  assert.deepEqual(ids(filterInvestigations(items, { sort: 'oldest' })), [
    'b',
    'c',
    'a',
  ]);
  assert.deepEqual(ids(filterInvestigations(items, { sort: 'title' })), [
    'b',
    'c',
    'a',
  ]);
  assert.deepEqual(items, snapshot);
  const tied = [{ ...items[0], updatedAt: 20 }, items[2]];
  assert.deepEqual(ids(filterInvestigations(tied.toReversed())), ['a', 'c']);
});
