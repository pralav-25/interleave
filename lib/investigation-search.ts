import { experiments } from './experiments.ts';
import type { Investigation } from './investigations.ts';

export type InvestigationSort = 'recent' | 'oldest' | 'title';
export type InvestigationFilters = {
  query?: string;
  experimentId?: string;
  mode?: '' | Investigation['mode'];
  sort?: InvestigationSort;
};

/** Search the authenticated workspace snapshot without modifying saved records. */
export function filterInvestigations(
  items: readonly Investigation[],
  {
    query = '',
    experimentId = '',
    mode = '',
    sort = 'recent',
  }: InvestigationFilters = {},
): Investigation[] {
  const term = query.trim().toLocaleLowerCase();
  const titles = new Map(
    experiments.map((experiment) => [experiment.id, experiment.title]),
  );
  return items
    .filter(
      (item) =>
        (!experimentId || item.experimentId === experimentId) &&
        (!mode || item.mode === mode) &&
        (!term ||
          [
            item.title,
            item.notes,
            titles.get(item.experimentId) ?? item.experimentId,
          ].some((text) => text.toLocaleLowerCase().includes(term))),
    )
    .sort((a, b) => {
      const order =
        sort === 'title'
          ? a.title.localeCompare(b.title, undefined, {
              sensitivity: 'base',
              numeric: true,
            })
          : sort === 'oldest'
            ? a.updatedAt - b.updatedAt
            : b.updatedAt - a.updatedAt;
      return order || a.id.localeCompare(b.id);
    });
}
