/**
 * Sanity check de la capa de datos contra la API real de ClickUp.
 * Uso: CLICKUP_TOKEN=... npm run clickup:check
 *
 * Imprime totales por lista y un ejemplo de MTTD/MTTR para validar contra lo
 * que muestra ClickUp. No escribe nada; solo lee.
 */
import { getClickUpConfig } from "../src/lib/clickup/config";
import { loadDataset } from "../src/lib/clickup/fetch";
import type { StatusHistoryEntry } from "../src/lib/clickup/types";

function firstNonOpen(hist: StatusHistoryEntry[]): StatusHistoryEntry | null {
  return hist.find((e) => e.type !== "open") ?? null;
}
function firstResolved(hist: StatusHistoryEntry[]): StatusHistoryEntry | null {
  return hist.find((e) => e.type === "done" || e.type === "closed") ?? null;
}
const days = (ms: number) => (ms / 86_400_000).toFixed(2);

async function main() {
  const cfg = getClickUpConfig();
  console.log("Trayendo dataset (esto puede tardar en frío)...");
  const t0 = Date.now();
  const ds = await loadDataset(cfg, { includeStatusHistory: true });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  const totalMs = ds.tasks.reduce((s, t) => s + t.timeSpentMs, 0);
  const withHours = ds.tasks.filter((t) => t.timeSpentMs > 0).length;
  console.log(`\n✓ Dataset traído en ${secs}s`);
  console.log(`  listas:           ${ds.lists.length}`);
  console.log(`  tareas:           ${ds.tasks.length}`);
  console.log(`  con time_spent:   ${withHours}`);
  console.log(`  horas totales:    ${(totalMs / 3_600_000).toFixed(1)} h`);
  console.log(`  con historial:    ${Object.keys(ds.statusHistory).length}`);

  // Conteo por lista
  const byList = new Map<string, number>();
  for (const t of ds.tasks) byList.set(t.listName, (byList.get(t.listName) ?? 0) + 1);
  console.log("\nTareas por lista (top 15):");
  [...byList.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([name, n]) => console.log(`  ${String(n).padStart(5)}  ${name}`));

  // Ejemplo de MTTD/MTTR sobre las primeras tareas resueltas con historial
  console.log("\nEjemplos MTTD/MTTR (tareas resueltas):");
  let shown = 0;
  for (const t of ds.tasks) {
    const hist = ds.statusHistory[t.id];
    if (!hist?.length || t.dateCreated == null) continue;
    const resolved = firstResolved(hist);
    if (!resolved) continue;
    const detected = firstNonOpen(hist);
    const mttd = detected ? detected.since - t.dateCreated : null;
    const mttr = resolved.since - t.dateCreated;
    console.log(
      `  [${t.listName}] "${t.name.slice(0, 40)}" ` +
        `MTTD=${mttd != null ? days(mttd) + "d" : "n/a"} MTTR=${days(mttr)}d`,
    );
    if (++shown >= 8) break;
  }
  console.log("\nOK.");
}

main().catch((err) => {
  console.error("\n✗ Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
