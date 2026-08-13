# Setup — Google Sheets service account (fichas técnicas)

> **DinoCloud Internal - Confidential**
> Paso a paso para conectar la matriz de skills (Google Sheets) a la ficha
> técnica de `/usuarios/[id]`. El acceso es **read-only** vía un service
> account de GCP — nunca se publica la hoja como CSV público, para no exponer
> nombres y niveles de skill individuales sin autenticación.

## Qué vas a necesitar

- Acceso de **Editor/Owner** sobre la spreadsheet de la matriz de skills.
- Permisos para crear un proyecto (o usar uno existente) en Google Cloud Console.
- Acceso a `.env` local (dev) o a AWS Secrets Manager (prod, ver RUNBOOK).

## Paso 1 — Crear el proyecto y habilitar la API

1. [Google Cloud Console](https://console.cloud.google.com/) → creá un proyecto
   nuevo (o reutilizá uno existente para herramientas internas de DinoCloud).
2. **APIs & Services → Library** → buscá **Google Sheets API** → **Enable**.

## Paso 2 — Crear el service account

1. **IAM & Admin → Service Accounts → Create Service Account**.
   - Nombre sugerido: `msp-portal-skills-reader`.
   - No hace falta asignarle roles a nivel de proyecto (el acceso a la hoja se
     da compartiéndola directamente, Paso 3).
2. Abrí el service account creado → pestaña **Keys → Add Key → Create new key
   → JSON**. Se descarga un archivo `.json` — **no lo commitees, no lo subas a
   Drive/Slack**. Vive solo en tu máquina hasta que extraigas los dos campos
   del Paso 4.

## Paso 3 — Compartir la spreadsheet con el service account

1. Abrí la [spreadsheet de la matriz de
   skills](https://docs.google.com/spreadsheets/d/1hJE0EpUAHSpNZE8rpruZ-oexIGqdtwSDk3BdaaQae38/edit).
2. **Share** → pegá el `client_email` del JSON del Paso 2 (termina en
   `.iam.gserviceaccount.com`) → rol **Viewer** → **Send** (no hace falta que
   reciba notificación por mail).
3. Confirmá que la hoja **no** esté publicada a la web (Archivo → Compartir →
   Publicar en la web) — si lo está, despublicala. El acceso debe ser
   exclusivamente vía el service account.

## Paso 4 — Extraer las credenciales

Del JSON descargado en el Paso 2, necesitás dos campos:

```json
{
  "client_email": "msp-portal-skills-reader@<project>.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

Y de la URL de la spreadsheet, el ID:

```
https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit
```

## Paso 5 — Configurar variables de entorno

### Local (`.env`, nunca commiteado)

```bash
GOOGLE_SHEETS_SPREADSHEET_ID=<SPREADSHEET_ID>
GOOGLE_SERVICE_ACCOUNT_EMAIL=msp-portal-skills-reader@<project>.iam.gserviceaccount.com
# La private key va entre comillas, con los saltos de línea escapados como \n:
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_SKILLS_RANGE=Hoja 1!A:I
```

`GOOGLE_SHEETS_SKILLS_RANGE` es el nombre de la hoja (tab) + rango A1 que
cubre las columnas `Colaborador | Type | Tecnology/skill | Subtype |
Observaciones | Nivel de dominio Autopercepcion | Validacion | Validación
2026 | Conocimiento unico`. Ajustá el nombre de la hoja si cambia.

### Producción (AWS Secrets Manager + Terraform)

Sigue el mismo patrón que `CLICKUP_TOKEN` (ver `RUNBOOK.md` Pasos 3–4):
`infra/terraform/secrets.tf` ya define el contenedor
`aws_secretsmanager_secret.google_service_account_key` (placeholder — un
humano debe cargar el valor real y aplicar el plan; no es un paso automático):

```bash
# Cargar la private key real (nunca en el repo ni en el shell history):
read -rs GOOGLE_KEY
aws secretsmanager put-secret-value \
  --secret-id msp-portal/google-service-account-key \
  --secret-string "$GOOGLE_KEY"
unset GOOGLE_KEY
```

Y completá en `terraform.tfvars` (no son secretos, son específicos del
workspace):

```hcl
google_sheets_config = {
  GOOGLE_SHEETS_SPREADSHEET_ID = "<SPREADSHEET_ID>"
  GOOGLE_SERVICE_ACCOUNT_EMAIL = "msp-portal-skills-reader@<project>.iam.gserviceaccount.com"
  GOOGLE_SHEETS_SKILLS_RANGE   = "Hoja 1!A:I"
}
```

`terraform plan`/`apply` para infra productiva sigue el gate `[APROBACIÓN]`
del RUNBOOK — no se aplica sin aprobación humana explícita.

## Paso 6 — ✅ Validar

Con las env vars seteadas localmente:

```bash
npm run dev
# Abrí /usuarios/<id-de-alguien-en-la-hoja> → tab "Ficha técnica"
```

Si falta alguna variable, la ficha técnica muestra el estado de error
correspondiente (mismo patrón que `CLICKUP_TOKEN` ausente) en vez de romper el
resto de la página.

## Rotación / baja de acceso

- **Rotar la key:** IAM & Admin → Service Accounts → el SA → Keys → generar
  una nueva y borrar la vieja → repetir Paso 5 con el nuevo valor.
- **Revocar acceso:** sacar al service account de los colaboradores de la
  spreadsheet (Share → quitar), o borrar el service account entero.

---

> **DinoCloud Internal - Confidential** · No distribuir fuera de la organización.
