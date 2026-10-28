// One ticket per problem. causes.ts tells which bug a report's tenant and channel point to; the desk's
// notes (desk-notes.json) mark the reports that describe something else. This file splits a merged
// ticket on both, so each problem can carry its own count.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

// `shift`: the date moved by one day, the month did not flip. Neither cause in causes.ts makes that.
export type Problem = Cause | 'shift' | 'unplaced';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'shift', 'unplaced'];

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // tenant handle → count, most reports first.
  tenants: [string, number][];
  channels: Record<Report['channel'], number>;
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'shift';
  return causeOf(r, t) ?? 'unplaced';
}

const count = <T extends string>(keys: T[]) =>
  keys.reduce<Record<string, number>>((n, k) => ({ ...n, [k]: (n[k] ?? 0) + 1 }), {});

// Every unique report merged into `ticket`, grouped by problem, biggest first. Empty problems are left out.
export function splitTicket(
  reports: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const merged = uniqueById(reports).filter((r) => r.mergedInto === ticket);
  return PROBLEMS.map((problem) => {
    const rs = merged.filter((r) => problemOf(r, tenantOf(r), oneDayMove) === problem);
    const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
    return {
      problem,
      reports: rs,
      tenants: Object.entries(count(rs.map((r) => r.tenant))).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
      channels: { app: 0, email: 0, form: 0, ...count(rs.map((r) => r.channel)) },
      taggedAs: count(rs.map((r) => r.meta.intakeTag)),
      firstSeen: days[0],
      lastSeen: days[days.length - 1],
    };
  })
    .filter((g) => g.reports.length > 0)
    .sort((a, b) => b.reports.length - a.reports.length);
}
