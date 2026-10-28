// One ticket per problem. Counts follow the desk's own view (causes.ts): every report is filed under
// the cause its tenant and channel point to. The desk's notes (desk-notes.json) mark the reports that
// describe something else; they stay filed where they are and also make a problem of their own.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

// `shift`: the date moved by one day, the month did not flip. Neither cause in causes.ts makes that.
export type Problem = Cause | 'shift' | 'unplaced';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'unplaced', 'shift'];

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // Set on `shift`: the causes its reports are filed and counted under.
  filedUnder: (Cause | 'unplaced')[];
  // tenant handle → count, most reports first.
  tenants: [string, number][];
  channels: Record<Report['channel'], number>;
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

const count = <T extends string>(keys: T[]) =>
  keys.reduce<Record<string, number>>((n, k) => ({ ...n, [k]: (n[k] ?? 0) + 1 }), {});

// Every unique report merged into `ticket`. The export's pages overlap: one id, one report.
export function mergedInto(reports: Report[], ticket: number): Report[] {
  return uniqueById(reports).filter((r) => r.mergedInto === ticket);
}

// The problems in `ticket`, biggest first, then `shift`. Empty problems are left out.
export function splitTicket(
  reports: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const merged = mergedInto(reports, ticket);
  const filed = (r: Report) => causeOf(r, tenantOf(r)) ?? 'unplaced';
  return PROBLEMS.map((problem) => {
    const rs = merged.filter((r) => (problem === 'shift' ? oneDayMove.includes(r.id) : filed(r) === problem));
    const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
    return {
      problem,
      reports: rs,
      filedUnder: problem === 'shift' ? [...new Set(rs.map(filed))] : [],
      tenants: Object.entries(count(rs.map((r) => r.tenant))).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
      channels: { app: 0, email: 0, form: 0, ...count(rs.map((r) => r.channel)) },
      taggedAs: count(rs.map((r) => r.meta.intakeTag)),
      firstSeen: days[0],
      lastSeen: days[days.length - 1],
    };
  })
    .filter((g) => g.reports.length > 0)
    .sort((a, b) => Number(a.problem === 'shift') - Number(b.problem === 'shift') || b.reports.length - a.reports.length);
}
