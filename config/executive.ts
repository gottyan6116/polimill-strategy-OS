import {presentation} from './presentation';
import {organizationTree} from './organization-tree';
/** Optional explicit classifications. Empty mappings intentionally remain unset. */
export const executiveConfig={
 primaryKpiId:'kpi-partners',
 categoryByKpi:{} as Record<string,string>,
 categoryLabels:{} as Record<string,string>,
 departmentBusinessUnits:{} as Record<string,string[]>,
 pageSizes:[5,10,20],
 statuses:['on_track','attention','missed','unset'] as const,
 colors:{actual:presentation.chart.actual,target:'var(--chart-budget)',achievement:'var(--navy)',profit:'var(--series-2)',on_track:'var(--positive)',attention:'var(--attention)',missed:'var(--danger)',unset:'var(--muted)'},
 businessColors:presentation.business,
 departmentOrder:organizationTree.departmentOrder,
};
