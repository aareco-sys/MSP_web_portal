"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { useT } from "@/lib/i18n/context";
import type { AreaKey, FichaView, SkillBarView } from "@/lib/skills";

/**
 * Ficha técnica de un ingeniero: banner, métricas resumen, radar por área
 * técnica y el detalle de skills AWS/DevOps + certificaciones/formación.
 * Puerto del prototipo de Claude Design (Fichas Tecnicas.dc.html, variante
 * 1A) a un componente React que consume datos en vivo de la matriz de
 * skills en vez de un snapshot embebido.
 */
export function FichaTecnica({ ficha }: { ficha: FichaView }) {
  const t = useT();
  const areaLabel = (key: string) => t.fichaTecnica.areas[key as AreaKey] ?? key;

  const radarData = ficha.radar.map((a) => ({ axis: areaLabel(a.axis), value: a.value }));

  const renderSkillRow = (s: SkillBarView) => (
    <div className="ficha-skill" key={s.name}>
      <div className="ficha-skill__row">
        <span className="ficha-skill__name">{s.name}</span>
        <span className="ficha-skill__val" style={{ color: s.numColor }}>
          {s.label}
        </span>
      </div>
      <div className="ficha-skill__track">
        <span className="ficha-skill__fill" style={{ width: s.pct, background: s.fill }} />
      </div>
      <div className="ficha-skill__note">
        {s.selfDeviation != null ? t.fichaTecnica.selfPerception(String(s.selfDeviation)) : s.note}
      </div>
    </div>
  );

  return (
    <div className="ficha">
      <div className="ficha-banner">
        <div className="ficha-banner__avatar">{ficha.initials}</div>
        <div className="ficha-banner__id">
          <div className="ficha-banner__eyebrow">{t.fichaTecnica.eyebrow}</div>
          <div className="ficha-banner__name">{ficha.name}</div>
        </div>
        <div className="ficha-banner__avg">
          <div className="ficha-banner__avg-val">{ficha.avg}</div>
          <div className="ficha-banner__avg-label">{t.fichaTecnica.avgLabel}</div>
        </div>
      </div>

      <div className="ficha-metrics">
        <div className="ficha-metric">
          <div className="ficha-metric__val">
            {ficha.metrics.strongCount} / {ficha.metrics.totalSkills}
          </div>
          <div className="ficha-metric__label">{t.fichaTecnica.metricStrong}</div>
        </div>
        <div className="ficha-metric">
          <div className="ficha-metric__val">{ficha.metrics.certCount}</div>
          <div className="ficha-metric__label">{t.fichaTecnica.metricCerts}</div>
        </div>
        <div className="ficha-metric">
          <div className="ficha-metric__val">
            {ficha.metrics.weakCount} / {ficha.metrics.totalSkills}
          </div>
          <div className="ficha-metric__label">{t.fichaTecnica.metricWeak}</div>
        </div>
      </div>

      <div className="card ficha-radar-card">
        <div className="ficha-radar-row">
          <div className="chart-wrap" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="#e5e8ed" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "#565d6d" }} />
                <Radar dataKey="value" stroke="#3daa6e" fill="#3daa6e" fillOpacity={0.22} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="ficha-radar-legend">
            <div className="ficha-radar-legend__title">{t.fichaTecnica.radarTitle}</div>
            {ficha.radar.map((a) => (
              <div className="ficha-radar-legend__row" key={a.axis}>
                <span className="ficha-radar-legend__label">{areaLabel(a.axis)}</span>
                <div className="ficha-skill__track" style={{ flex: 1 }}>
                  <span
                    className="ficha-skill__fill"
                    style={{
                      width: `${(a.value / 4) * 100}%`,
                      background: a.value >= 3 ? "#093921" : "#3daa6e",
                    }}
                  />
                </div>
                <span className="ficha-radar-legend__val">{a.value.toFixed(1)}</span>
              </div>
            ))}
            <div className="ficha-radar-legend__summary">
              {t.fichaTecnica.radarSummary(
                areaLabel(ficha.radarBest.label),
                ficha.radarBest.value,
                areaLabel(ficha.radarWorst.label),
                ficha.radarWorst.value,
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="ficha-cols">
        <div className="ficha-col">
          <div className="ficha-col__heading">{t.fichaTecnica.awsHeading}</div>
          {ficha.aws.map(renderSkillRow)}
        </div>
        <div className="ficha-col">
          <div className="ficha-col__heading">{t.fichaTecnica.devHeading}</div>
          {ficha.dev.map(renderSkillRow)}

          {ficha.certs.length || ficha.form.length ? (
            <div className="ficha-certs">
              <div className="ficha-certs__heading">{t.fichaTecnica.certsHeading}</div>
              <div className="ficha-certs__list">
                {ficha.certs.map((c) => (
                  <span className="ficha-cert-badge" key={c}>
                    {c}
                  </span>
                ))}
                {ficha.form.map((f) => (
                  <span className="ficha-form-badge" key={f}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="ficha-footer">{t.fichaTecnica.footer}</div>
    </div>
  );
}
