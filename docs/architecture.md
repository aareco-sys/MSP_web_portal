# Arquitectura — MSP Metrics Portal

> **DinoCloud Internal - Confidential**

Arquitectura **desplegada** en AWS (App Runner + Cognito + CI/CD). El diagrama es Mermaid,
se renderiza directo en GitHub. Estado operativo: ver [`../README.md`](../README.md) y
[`RUNBOOK.md`](./RUNBOOK.md).

```mermaid
flowchart TB
  user(["Usuario<br/>(navegador)"])
  clickup["api.clickup.com<br/>(única dependencia externa)"]

  subgraph gh["GitHub"]
    repo["Repo · push/PR a main"]
    ga["GitHub Actions · deploy.yml<br/>OIDC · gate environment 'production'"]
    repo --> ga
  end

  subgraph aws["AWS · us-east-1"]
    r53["Route 53<br/>mspportal.lab.dinocloud.co"]
    acm["ACM · cert TLS"]
    ecr[("ECR<br/>imagen Next.js")]
    sm[["Secrets Manager<br/>CLICKUP_TOKEN · AUTH_SECRET · COGNITO_CLIENT_SECRET"]]
    cw["CloudWatch<br/>logs + métricas"]

    subgraph ar["App Runner · 1 vCPU / 2 GB · min 1"]
      app["Next.js 16 standalone<br/>proxy.ts (auth) · cachés en memoria"]
    end

    subgraph cog["Cognito"]
      hui["Hosted UI (OIDC/PKCE)"]
      pool["User Pool · MFA TOTP"]
      hui --- pool
    end

    subgraph sch["Ventana de servicio · L–V 9–20 ART"]
      ev["EventBridge Scheduler<br/>resume 08:50 · pause 20:00"]
      warm["Lambda warm-up · 08:55<br/>header x-warmup-token"]
    end
  end

  %% Tráfico de usuario
  user -- "HTTPS" --> r53 --> app
  acm -. "cert" .- r53
  user -- "login" --> hui
  app -- "valida id_token / PKCE" --> pool
  app -- "lee secretos (instance role)" --> sm
  app -- "fetch server-side" --> clickup
  app -- "logs / métricas" --> cw

  %% CI/CD
  ga -- "assume role (OIDC)" --> ecr
  ga -- "docker push :latest" --> ecr
  ecr -- "auto-deploy" --> ar

  %% Schedule + warm-up
  ev -- "pause / resume" --> ar
  ev --> warm
  warm -- "GET /api/metrics · /api/rex" --> app

  classDef ext fill:#eef1f5,stroke:#9aa0ad,color:#0b1220;
  classDef aws fill:#eaf6ef,stroke:#3daa6e,color:#0b1220;
  class user,clickup,repo,ga ext;
  class r53,acm,ecr,sm,cw,app,hui,pool,ev,warm aws;
```

## Puntos clave

- **Auth:** todo el tráfico pasa por `proxy.ts`; sin sesión válida redirige al Hosted UI de
  Cognito (OIDC + PKCE, MFA TOTP). Excepciones públicas: `/api/health`, `/api/auth/*` y el
  warm-up (con `x-warmup-token`).
- **Secretos:** `CLICKUP_TOKEN`, `AUTH_SECRET` y `COGNITO_CLIENT_SECRET` viven en Secrets
  Manager y se inyectan en runtime (instance role). Nunca en el repo ni en la imagen.
- **Ventana de servicio:** EventBridge Scheduler pausa (20:00) y reanuda (08:50) L–V; la
  Lambda de warm-up (08:55) precalienta las cachés (`/api/metrics` + `/api/rex`).
- **CI/CD:** GitHub Actions asume el rol vía OIDC (sin access keys), pushea a ECR y App
  Runner **auto-deploya** el `:latest`. Gate de aprobación del environment `production`.
- **Datos:** la app es *stateless*; el único dato persistente vive en ClickUp. El estado de
  Terraform (provisioning) vive en S3 + lock DynamoDB.
