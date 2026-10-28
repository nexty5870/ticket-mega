<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { mergedInto, splitTicket, type Problem } from '#lib/kb/problems';

  // `issues`: problem → the ticket filed for it, and where that ticket stands.
  type Issue = { href: string; state: string };
  let { ticket, issues = {} }: { ticket: number; issues?: Partial<Record<Problem, Issue>> } = $props();

  const rows = $derived((reports as Report[]).filter((r) => r.mergedInto === ticket));
  const total = $derived(mergedInto(reports as Report[], ticket).length);
  const groups = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const list = (n: Record<string, number>) =>
    Object.entries(n)
      .filter(([, k]) => k > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key, k]) => `${key} ×${k}`)
      .join(' · ');
  const issueNo = (href: string) => href.match(/(\d+)\/?$/)?.[1] ?? href;
</script>

<p class="sum">
  <strong>{total}</strong> reports merged into #{ticket} ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
  {#if rows.length !== total}<span class="rows">({rows.length} rows in the export: some reports come twice)</span>{/if}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>came in by</th><th>intake tagged</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      {@const issue = issues[g.problem]}
      <tr class:unplaced={g.problem === 'unplaced'}>
        <td>
          <code>{g.problem}</code>
          {#if g.filedUnder.length}<span class="small">filed under {g.filedUnder.join(', ')}</span>{/if}
        </td>
        <td><strong>{g.reports.length}</strong></td>
        <td class="small">{g.tenants.length > 3 ? `${g.tenants.length} tenants` : g.tenants.map(([t, n]) => `${t} ×${n}`).join(' · ')}</td>
        <td class="small">{list(g.channels)}</td>
        <td class="small">{list(g.taggedAs)}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if issue}<a href={issue.href}>#{issueNo(issue.href)}</a> <span class="state">{issue.state}</span>{:else}<span class="none">no ticket yet</span>{/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .sum { font-size: 1.1rem; }
  .rows { color: var(--muted); font-size: 0.85em; }
  .small { color: var(--muted); font-size: 0.85em; }
  td > .small { display: block; }
  .state { color: var(--muted); font-size: 0.85em; white-space: nowrap; }
  .none, .unplaced td:last-child { color: var(--warn); font-weight: 600; }
  .unplaced td { background: var(--warn-bg); }
</style>
