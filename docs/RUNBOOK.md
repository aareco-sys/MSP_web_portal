# RUNBOOK — Deploy a AWS (MSP Metrics Portal)

> **DinoCloud Internal - Confidential**
> Procedimiento paso a paso, **con validación por paso**, para llevar el portal a
> AWS App Runner según [`aws-deployment-plan.md`](./aws-deployment-plan.md).
> Hosting: **App Runner 1 vCPU / 2 GB**, región **us-east-1**, ventana **L–V 9–20 ART**.

## Cómo leer este runbook

Cada paso tiene **Acción** (qué ejecutar) y **✅ Validar** (cómo saber que salió bien).
Si una validación falla (**❌**), **parar** y resolver antes de continuar — no encadenar pasos.

> ⛔ **Gate de producción (política DinoCloud + plan).** Los pasos marcados
> **`[APROBACIÓN]`** tocan infraestructura productiva: **detenerse y obtener
> aprobación humana explícita** antes de ejecutarlos. Una vez aprobados, se procede
> dejando trazabilidad (CloudTrail) para auditoría/recovery.

## Prerrequisitos (Fase 0 del plan)

- [ ] Plan y presupuesto (~USD 8–10/mes) aprobados por el Director de Ingeniería.
- [ ] Cuenta AWS + región (`us-east-1`) confirmadas.
- [ ] Dominio: se sirve en **`mspportal.lab.dinocloud.co`** (subdominio de la hosted zone
      `lab.dinocloud.co`, que ya está en esta cuenta → Terraform gestiona el DNS con `route53_zone_id`).
- [ ] Lista inicial de usuarios (emails `@dinocloud.com`) para Cognito.
- [ ] `CLICKUP_TOKEN` (`pk_...`) a mano — **nunca** se commitea; va a Secrets Manager.

---

## Paso 0 — Configurar AWS CLI en tu terminal local

> No tenés el CLI configurado todavía. Esto corre en **tu máquina**, no en el repo.
> Es **solo config local**: no crea infra ni toca producción (no aplica el gate
> `[APROBACIÓN]`).
>
> 🔐 **Las access keys NUNCA se commitean ni se pegan en chats/tickets/artefactos.**
> Viven solo en `~/.aws/credentials`. El *Secret Access Key* se muestra una sola vez
> al crearlo.

### Método activo: IAM user + access keys

(La cuenta de deploy no tiene IAM Identity Center. Ver más abajo la alternativa SSO,
recomendada a futuro.)

**0.1 — Crear el IAM user y sus access keys (consola AWS):**

- IAM → Users → crear (o reutilizar) un usuario para el deploy, p.ej. `msp-portal-deploy`.
- **Habilitar MFA** en ese usuario (Security credentials → Assign MFA).
- Permisos para el setup: una política de admin acotada, o `AdministratorAccess`
  **temporal solo para el bootstrap** (a refinar a least-privilege una vez creada la infra).
- Security credentials → **Create access key → "Command Line Interface (CLI)"**.
  Guardá el *Access Key ID* y el *Secret* (este último solo se ve una vez).

**0.2 — Instalar herramientas:**

```bash
brew install awscli terraform   # macOS
aws --version                   # aws-cli/2.x.x
terraform -version              # >= 1.6
```

**0.3 — Configurar el perfil (las keys se TIPEAN en la terminal, no en el chat):**

```bash
aws configure --profile msp-portal
#   AWS Access Key ID     : <pegás en la terminal>
#   AWS Secret Access Key : <pegás en la terminal>
#   Default region name   : us-east-1
#   Default output format : json

export AWS_PROFILE=msp-portal
export AWS_REGION=us-east-1
```

**0.4 — (Opcional, recomendado) sesión temporal con MFA**, para no operar con las
keys de larga duración crudas:

```bash
aws sts get-session-token \
  --serial-number arn:aws:iam::<ACCOUNT_ID>:mfa/<tu-user> \
  --token-code <codigo-MFA-de-6-digitos>
# Exportá AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN de la salida.
```

**0.5 — ✅ Validar:**

```bash
aws sts get-caller-identity
aws configure list --profile msp-portal   # region = us-east-1
```

`get-caller-identity` devuelve `Account`, `UserId` y `Arn` (no expone secretos).
**❌** Si da error de credenciales, no sigas: revisá el perfil / `aws configure --profile msp-portal`.

### Alternativa recomendada a futuro: IAM Identity Center (SSO)

> Identity Center se habilita **una vez por organización** (en la cuenta management);
> la *start URL* es **org-wide**, no por cuenta. Si DinoCloud lo habilita, migrá a SSO:

```bash
aws configure sso     # start URL + región de la org; elegir cuenta+rol; profile msp-portal
aws sso login --profile msp-portal   # renovar el token cuando caduque
```

---

## Paso 1 — Bootstrap del backend de state `[APROBACIÓN]`

Crea el bucket S3 (state) + tabla DynamoDB (lock). Una sola vez por cuenta.

**Acción:**

```bash
cd infra/terraform/bootstrap
terraform init
terraform apply \
  -var "state_bucket_name=msp-portal-tfstate-$(aws sts get-caller-identity --query Account --output text)"
```

**✅ Validar:**

```bash
terraform output state_bucket   # nombre del bucket
terraform output backend_hcl    # bloque a pegar en ../versions.tf
aws s3 ls | grep msp-portal-tfstate
```

El bucket existe y `backend_hcl` muestra el bloque `s3`. **❌** Si el nombre del
bucket ya existe (es global), elegí otro `state_bucket_name`.

**Después:** pegá `backend_hcl` en `infra/terraform/versions.tf` (descomentá el bloque
`backend "s3"`) con el `bucket` real.

---

## Paso 2 — Inicializar el stack principal

**Acción:**

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Editar terraform.tfvars: route53_zone_id, clickup_config (IDs del workspace), etc.
terraform init        # migra el state al backend S3 del Paso 1
```

**✅ Validar:**

```bash
terraform validate    # "Success! The configuration is valid."
terraform providers   # aws ~> 5.0 y archive ~> 2.4 resueltos
```

**❌** Si `init` no migra el state, confirmá que el bloque `backend "s3"` quedó bien
pegado (bucket/region correctos).

---

## Paso 3 — Crear ECR + secretos + Cognito + IAM (sin App Runner todavía) `[APROBACIÓN]`

App Runner necesita una imagen **ya publicada** en ECR para arrancar; por eso primero
creamos el registry y lo demás, cargamos secretos, publicamos la imagen, y recién
después creamos el servicio (Paso 6).

**Acción:**

```bash
# Aplicar todo MENOS el servicio App Runner y sus dependientes (scheduler/dns).
# Incluye las VERSIONES placeholder de los secretos: deben existir ANTES de cargar
# el valor real por CLI (Paso 4); con ignore_changes el valor real no se pisa luego.
terraform apply \
  -target=aws_ecr_repository.app \
  -target=aws_secretsmanager_secret.clickup_token \
  -target=aws_secretsmanager_secret_version.clickup_token \
  -target=aws_secretsmanager_secret.auth_secret \
  -target=aws_secretsmanager_secret_version.auth_secret \
  -target=aws_cognito_user_pool.main \
  -target=aws_cognito_user_pool_client.app \
  -target=aws_iam_role.apprunner_access \
  -target=aws_iam_role.apprunner_instance \
  -target=aws_iam_role.github_deploy
```

**✅ Validar:**

```bash
terraform output ecr_repository_url
aws ecr describe-repositories --repository-names msp-portal --query 'repositories[0].repositoryUri'
```

Devuelve la URI del repo ECR. **❌** Si falla por permisos IAM, revisá el rol/perfil del Paso 0.

---

## Paso 4 — Cargar secretos por CLI (nunca en el repo)

**Acción:**

```bash
# CLICKUP_TOKEN (obligatorio). El valor pk_... NO se commitea ni queda en el shell history.
read -rs CLICKUP_TOKEN
aws secretsmanager put-secret-value \
  --secret-id msp-portal/clickup-token \
  --secret-string "$CLICKUP_TOKEN"
unset CLICKUP_TOKEN

# AUTH_SECRET: firma la cookie de sesión de la auth (OIDC/Cognito). Generar aleatorio:
aws secretsmanager put-secret-value \
  --secret-id msp-portal/auth-secret \
  --secret-string "$(openssl rand -base64 32)"
```

**✅ Validar:**

```bash
# Confirma que tienen una versión activa (NO imprime el valor).
aws secretsmanager describe-secret --secret-id msp-portal/clickup-token \
  --query 'VersionIdsToStages' --output json
```

Muestra una versión en `AWSCURRENT`. **❌** Si no, repetí el `put-secret-value`.

> 🔐 El `COGNITO_CLIENT_SECRET` lo gestiona Terraform automáticamente (sale del app
> client). No hay que cargarlo a mano.

---

## Paso 5 — Publicar la primera imagen en ECR

Antes de existir el servicio, subimos una imagen manualmente (después lo hace CI).

**Acción:**

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGISTRY="$ACCOUNT.dkr.ecr.us-east-1.amazonaws.com"
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "$REGISTRY"

# Desde la raíz del repo:
docker build -t "$REGISTRY/msp-portal:bootstrap" -t "$REGISTRY/msp-portal:latest" .
docker push "$REGISTRY/msp-portal:bootstrap"
docker push "$REGISTRY/msp-portal:latest"
```

**✅ Validar:**

```bash
aws ecr list-images --repository-name msp-portal --query 'imageIds[].imageTag'
```

Aparecen `latest` y `bootstrap`. **❌** Si el push da `denied`, re-hacé `ecr get-login-password`.

---

## Paso 6 — Crear el servicio App Runner + schedule + DNS `[APROBACIÓN]`

Ahora sí, el apply completo (toca infra productiva → **gate de aprobación**).

**Acción:**

```bash
terraform plan -out tfplan      # revisar el diff con el aprobador
# ── STOP: aprobación humana explícita antes de continuar ──
terraform apply tfplan
```

**✅ Validar:**

```bash
SVC=$(terraform output -raw apprunner_service_arn)
aws apprunner describe-service --service-arn "$SVC" --query 'Service.Status'   # "RUNNING"
URL=$(terraform output -raw apprunner_default_url)
curl -s "$URL/api/health"      # {"status":"ok"}
```

Status `RUNNING` y `/api/health` responde `{"status":"ok"}`. **❌** Si queda
`CREATE_FAILED`, revisá CloudWatch logs del servicio (suele ser imagen ausente —
confirmá el Paso 5 — o falta de permiso del instance role a Secrets Manager).

---

## Paso 7 — Dominio `mspportal.lab.dinocloud.co` `[APROBACIÓN]`

Con `route53_zone_id` seteado (zona `lab.dinocloud.co`, en esta cuenta), el Paso 6 crea
solo los registros de validación ACM + el CNAME de tráfico → el cert valida solo.

> ⚠️ Gotcha: la custom domain association emite los registros de validación **después**
> de crearse, así que el `for_each` de `dns.tf` no los conoce en el primer `plan`. Si el
> apply falla con *"Invalid for_each argument"*, aplicá en 2 pasos:
> `terraform apply -target=aws_apprunner_custom_domain_association.portal` y luego `terraform apply`.

**✅ Validar:**

```bash
SVC=$(terraform output -raw apprunner_service_arn)
aws apprunner describe-custom-domains --service-arn "$SVC" \
  --query 'CustomDomains[].Status'      # "active" cuando valida el cert (puede tardar)
dig +short mspportal.lab.dinocloud.co
curl -s https://mspportal.lab.dinocloud.co/api/health
```

`active` + el dominio resuelve + `/api/health` OK por HTTPS.

**Cutover:** setear `app_base_url = "https://mspportal.lab.dinocloud.co"` en `terraform.tfvars`
+ `terraform apply` (actualiza `AUTH_URL` y las callback de Cognito; redeploy sin rebuild).

**DNS en otra cuenta** (si la zona no estuviera en esta cuenta, `route53_zone_id=""`):
tomá `terraform output custom_domain_validation_records` + `custom_domain_dns_target` y
cargálos a mano donde viva el DNS.

---

## Paso 8 — Validar la ventana de servicio (schedule L–V 9–20 ART)

**✅ Validar:**

```bash
aws scheduler list-schedules --query "Schedules[?starts_with(Name, 'msp-portal')].Name"
# msp-portal-resume / msp-portal-pause / msp-portal-warmup

# Prueba en seco del pause/resume (fuera de horario, con aprobación):
aws apprunner pause-service  --service-arn "$SVC"   # -> OPERATION_IN_PROGRESS -> PAUSED
aws apprunner resume-service --service-arn "$SVC"   # -> RUNNING
```

Existen las 3 reglas y el pause/resume manual funciona. El primer acceso tras el
resume hace el fetch en frío (~15–20 s); la Lambda `msp-portal-warmup` (08:55) lo
mitiga. **❌** Si la Lambda falla, mirá sus logs en CloudWatch
(`/aws/lambda/msp-portal-warmup`).

> ℹ️ **Warm-up con auth (resuelto):** con la auth activa, `/api/metrics` y `/api/rex`
> están protegidas, así que la Lambda de warm-up manda un header `x-warmup-token`
> (secreto compartido, `random_password.warmup`) que el `proxy.ts` deja pasar. Ya funciona
> con la auth puesta.

---

## Paso 9 — Conectar CI/CD (GitHub Actions → AWS por OIDC)

El workflow [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) hace
build → push ECR → (auto-deploy de App Runner) → espera RUNNING → healthcheck, con
**gate de aprobación** del environment `production`.

> Como App Runner tiene `auto_deployments_enabled=true`, el push de `:latest` YA dispara
> el deploy. El workflow **no** llama `start-deployment` (chocaría con el auto-deploy:
> *"isn't in RUNNING state"*); solo espera a que quede RUNNING.

**Acción (en GitHub, repo `aareco-sys/MSP_web_portal`):**

1. **Settings → Environments → `production`**: agregar **Required reviewers**
   (gate de aprobación manual de cada deploy).
2. **Settings → Secrets and variables → Actions → Variables** (repo-level):
   ```
   AWS_REGION            = us-east-1
   AWS_DEPLOY_ROLE_ARN   = (terraform output github_deploy_role_arn)
   ECR_REPOSITORY        = msp-portal
   APPRUNNER_SERVICE_ARN = (terraform output apprunner_service_arn)
   ```
3. **Branch protection** en `main` (require PR + checks de CI).

**✅ Validar:**

- Hacé un push a `main` (o `workflow_dispatch`). El job `quality` corre; `deploy`
  queda **esperando aprobación** (gate). Al aprobar, debe terminar con el
  healthcheck en verde.
- `aws apprunner list-operations --service-arn "$SVC"` muestra el deployment disparado por CI.

**❌** Si `configure-aws-credentials` falla con `Not authorized to perform sts:AssumeRoleWithWebIdentity`:
el job de deploy corre en el environment `production`, así que GitHub emite el `sub` OIDC como
`repo:aareco-sys/MSP_web_portal:environment:production` (NO el de branch). La trust del rol
(`iam.tf`) acepta **ambos** (`:environment:production` y `:ref:refs/heads/main`); si tocás el
nombre del environment o del repo, actualizá esos `sub`.

---

## Paso 10 — Operación

### Rollback (sin migraciones — app stateless)

```bash
# Redeploy del SHA anterior: re-tagear esa imagen como :latest y pushear.
# Con auto_deployments_enabled=true, el push de :latest dispara el deploy solo.
docker pull "$REGISTRY/msp-portal:<sha-anterior>"
docker tag  "$REGISTRY/msp-portal:<sha-anterior>" "$REGISTRY/msp-portal:latest"
docker push "$REGISTRY/msp-portal:latest"
```

### Rotar `CLICKUP_TOKEN`

```bash
read -rs NEW; aws secretsmanager put-secret-value --secret-id msp-portal/clickup-token --secret-string "$NEW"; unset NEW
aws apprunner start-deployment --service-arn "$SVC"   # recarga el secreto
```

### Alta / baja de usuarios (Cognito)

```bash
POOL=$(terraform output -raw cognito_user_pool_id)
aws cognito-idp admin-create-user --user-pool-id "$POOL" --username persona@dinocloud.com
aws cognito-idp admin-disable-user --user-pool-id "$POOL" --username persona@dinocloud.com  # baja
```

### Acceso puntual fuera de la ventana

```bash
aws apprunner resume-service --service-arn "$SVC"   # <2 min; se vuelve a pausar a las 20:00
```

---

## Estado de las fases (ver plan §8)

- [x] **Fase 1 — Infra base (IaC):** Pasos 1–8.
- [x] **Fase 2 — Auth en la app:** OIDC propio contra Cognito Hosted UI (PKCE + sesión
      firmada) + `src/proxy.ts` que protege todas las rutas + MFA. Warm-up resuelto con
      `x-warmup-token`. (Ver `src/lib/auth/`.)
- [x] **Fase 3 — CI/CD:** `deploy.yml` (Paso 9); deploy por push/PR a `main` + gate `production`.
- [ ] **Fase 4 — Observabilidad + handoff:** CloudWatch dashboard + alarmas (5xx, health,
      memoria) + SNS. **Pendiente.**

> **DinoCloud Internal - Confidential** · No distribuir fuera de la organización.
