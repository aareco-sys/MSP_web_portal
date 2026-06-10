/**
 * pm2 — corre el build de producción (next start) de forma estable mientras
 * no se deploya a AWS. Auto-reinicio ante crash y reinicio por límite de
 * memoria (evita el OOM del `next dev`).
 *
 * Inyecta las variables del .env explícitamente: el loader de Next (dotenv) no
 * sobrescribe vars ya presentes en el proceso, así que un token viejo heredado
 * en el entorno de pm2 taparía el del .env. Cargándolo acá garantizamos el valor
 * correcto. El .env está gitignored — no se commitea ningún secreto.
 *
 *   npm run serve         # build + arranca/recarga
 *   npm run serve:status  # estado
 *   npm run serve:logs    # logs
 *   npm run serve:stop    # frenar
 */
const fs = require("fs");
const path = require("path");

function loadDotenv() {
  const out = {};
  try {
    const txt = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
    for (const line of txt.split("\n")) {
      const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (!m) continue; // saltea comentarios (#...) y líneas vacías
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  } catch {
    // sin .env (p.ej. en prod los secretos vienen de Secrets Manager)
  }
  return out;
}

module.exports = {
  apps: [
    {
      name: "msp-portal",
      script: "npm",
      args: "run start",
      cwd: __dirname,
      autorestart: true,
      max_memory_restart: "1500M",
      env: {
        PORT: "3000",
        NODE_OPTIONS: "--max-old-space-size=2048",
        ...loadDotenv(),
      },
    },
  ],
};
