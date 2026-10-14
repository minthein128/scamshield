import { navigationRef } from '../../navigation/ref';

const REPORT_ROUTE = 'ReportScam';

/** Opens the ReportScam screen when it is registered. Does nothing until it exists. */
export function openReportScam(): boolean {
  if (!navigationRef.isReady()) return false;
  const names: string[] = navigationRef.getRootState()?.routeNames ?? [];
  if (!names.includes(REPORT_ROUTE)) return false;
  (navigationRef.navigate as (name: string) => void)(REPORT_ROUTE);
  return true;
}
