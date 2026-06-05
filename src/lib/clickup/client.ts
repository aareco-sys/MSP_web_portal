/**
 * Cliente HTTP de bajo nivel para la API de ClickUp.
 * Porta el patrón de Automations/MSP_app/clickup/data_sources.py:
 * header de auth, reintentos ante 429 (respetando Retry-After) y pool acotado.
 */
import { CLICKUP_API, type ClickUpConfig } from "./config";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GetOptions {
  /** params de query; los arrays se repiten (?k=a&k=b). */
  params?: Record<string, string | number | boolean | string[] | undefined>;
  maxRetries?: number;
  timeoutMs?: number;
}

function buildUrl(
  path: string,
  params?: GetOptions["params"],
): string {
  const url = new URL(`${CLICKUP_API}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, String(v));
      } else {
        url.searchParams.append(key, String(value));
      }
    }
  }
  return url.toString();
}

/** GET autenticado con reintentos. Devuelve el JSON parseado. */
export async function clickupGet<T = unknown>(
  cfg: ClickUpConfig,
  path: string,
  opts: GetOptions = {},
): Promise<T> {
  const { params, maxRetries = 4, timeoutMs = 60_000 } = opts;
  const url = buildUrl(path, params);

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { Authorization: cfg.token, "Content-Type": "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("Retry-After") ?? "5");
        await sleep(Math.max(1, retryAfter) * 1000);
        continue;
      }
      if (res.status >= 500) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`ClickUp ${res.status} en ${path}: ${body.slice(0, 200)}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      // backoff y reintento ante errores de red / timeout
      await sleep(1000 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(
    `ClickUp: excedidos reintentos en ${path}: ${String(lastErr ?? "desconocido")}`,
  );
}

/**
 * Ejecuta `fn` sobre cada item con un límite de concurrencia.
 * Reemplaza al ThreadPoolExecutor del cliente Python.
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Parte un array en chunks de tamaño `size`. */
export function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
