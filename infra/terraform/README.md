# Infra — MSP Metrics Portal (Terraform)

> **DinoCloud Internal - Confidential**

IaC del deploy a AWS (App Runner). Implementa la arquitectura de
[`docs/aws-deployment-plan.md`](../../docs/aws-deployment-plan.md). El procedimiento
de aplicación paso a paso, con validación por paso, está en
[`docs/RUNBOOK.md`](../../docs/RUNBOOK.md).

## Layout

| Archivo | Qué crea |
|---|---|
| `bootstrap/` | Backend de state (S3 + DynamoDB lock). Se aplica una vez, primero. |
| `versions.tf` | Terraform, providers (aws, archive) y backend S3. |
| `variables.tf` / `terraform.tfvars.example` | Parámetros (region, dominio, ClickUp IDs, schedule…). |
| `ecr.tf` | Registry privado + lifecycle (últimas 10 imágenes). |
| `secrets.tf` | Secrets Manager: `CLICKUP_TOKEN`, `AUTH_SECRET`, `COGNITO_CLIENT_SECRET`. |
| `cognito.tf` | User Pool (MFA TOTP, self sign-up off) + client + dominio. |
| `iam.tf` | Access role (ECR), instance role (Secrets), **OIDC GitHub** + deploy role. |
| `apprunner.tf` | Servicio App Runner 1vCPU/2GB, min 1, healthcheck `/api/health`. |
| `scheduler.tf` | EventBridge Scheduler (resume/pause L–V 9–20 ART) + Lambda warm-up. |
| `dns.tf` | Custom domain App Runner + validación vía Route 53. |
| `outputs.tf` | ARNs y valores para el wiring de CI/CD y DNS. |

## Reglas de seguridad (política DinoCloud)

- **Ningún secreto en el repo ni en el state innecesariamente.** `CLICKUP_TOKEN` y
  `AUTH_SECRET` se cargan por CLI (`aws secretsmanager put-secret-value`); Terraform
  solo crea el contenedor (`ignore_changes = [secret_string]`).
- `terraform.tfvars` está **gitignored**. Solo se versiona `*.example`.
- El **deploy a producción se detiene para aprobación humana explícita** antes de
  cada `terraform apply` que toque infra productiva.

## Uso rápido

```bash
# 1. backend de state (una vez)
cd bootstrap && terraform init && terraform apply

# 2. stack principal
cd .. && cp terraform.tfvars.example terraform.tfvars   # completar
terraform init
terraform plan -out tfplan          # revisar
# ── STOP: aprobación humana antes del apply productivo ──
terraform apply tfplan
```

Detalle completo y validaciones: **`docs/RUNBOOK.md`**.
