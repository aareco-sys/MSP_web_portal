// DinoCloud Internal - Confidential
// Warm-up de caches del MSP Portal tras el resume de App Runner.
// Golpea cada ruta de WARMUP_PATHS para forzar el fetch en frio (~15-20 s) antes
// de que entre el primer usuario. No falla el schedule si una ruta da error
// (p.ej. 401 si ya hay auth): solo registra y sigue.

const BASE = process.env.TARGET_BASE_URL;
const PATHS = (process.env.WARMUP_PATHS || "/api/metrics,/api/rex")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

export const handler = async () => {
  if (!BASE) {
    console.error("TARGET_BASE_URL no definido");
    return { ok: false, reason: "missing-base-url" };
  }

  const results = [];
  for (const path of PATHS) {
    const url = `${BASE}${path}`;
    const started = Date.now();
    try {
      // El fetch en frio puede tardar; damos margen amplio (la Lambda timeout=60s).
      const res = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(55_000),
        headers: {
          "user-agent": "msp-portal-warmup",
          // El proxy de auth deja pasar el warm-up con este header.
          ...(process.env.WARMUP_TOKEN ? { "x-warmup-token": process.env.WARMUP_TOKEN } : {}),
        },
      });
      const ms = Date.now() - started;
      console.log(`warmup ${path} -> ${res.status} (${ms}ms)`);
      results.push({ path, status: res.status, ms });
    } catch (err) {
      const ms = Date.now() - started;
      console.warn(`warmup ${path} fallo (${ms}ms): ${err?.message ?? err}`);
      results.push({ path, error: String(err?.message ?? err), ms });
    }
  }

  return { ok: true, results };
};
