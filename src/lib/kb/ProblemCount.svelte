<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { splitTicket, type Problem } from '#lib/kb/problems';

  // One number for a sentence: the reports of one problem, all unique reports (`all`), or the export's rows (`rows`).
  let { ticket, of = 'all' }: { ticket: number; of?: Problem | 'all' | 'rows' } = $props();

  const n = $derived.by(() => {
    if (of === 'rows') return (reports as Report[]).filter((r) => r.mergedInto === ticket).length;
    const groups = splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove);
    return groups.filter((g) => of === 'all' || g.problem === of).reduce((k, g) => k + g.reports.length, 0);
  });
</script>

<strong>{n}</strong>
