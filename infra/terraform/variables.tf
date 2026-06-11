# DinoCloud Internal - Confidential

variable "region" {
  type        = string
  default     = "us-east-1"
  description = "Region AWS (plan: us-east-1)."
}

variable "project_name" {
  type    = string
  default = "msp-portal"
}

variable "environment" {
  type    = string
  default = "production"
}

# ── App Runner ────────────────────────────────────────────────────────────────
variable "apprunner_cpu" {
  type        = string
  default     = "1024" # 1 vCPU
  description = "vCPU en unidades App Runner (256/512/1024/2048/4096)."
}

variable "apprunner_memory" {
  type        = string
  default     = "2048" # 2 GB
  description = "Memoria en MB. 2 GB cubre el pico del fetch en frio."
}

variable "apprunner_min_size" {
  type        = number
  default     = 1
  description = "Min instancias. 1 = cache en memoria siempre tibia (no scale-to-zero)."
}

variable "apprunner_max_size" {
  type    = number
  default = 2
}

variable "image_tag" {
  type        = string
  default     = "latest"
  description = "Tag de la imagen en ECR que sirve App Runner (CI publica :latest + :<sha>)."
}

# ── Config NO secreta de la app (todas con default en el codigo) ────────────────
variable "app_env" {
  type        = map(string)
  description = "Env vars no secretas inyectadas en runtime."
  default = {
    NODE_ENV               = "production"
    NEXT_TELEMETRY_DISABLED = "1"
    NODE_OPTIONS           = "--max-old-space-size=1536"
    MSP_CACHE_TTL          = "30"
    MSP_LOOKBACK_DAYS      = "90"
    # Los IDs de ClickUp se cargan via terraform.tfvars (no son secretos pero
    # son especificos del workspace). Ej:
    # CLICKUP_TEAM_ID, CLICKUP_SPACE_ID, CLICKUP_ACTIVE_FOLDER_IDS, CLICKUP_REX_LIST_ID
  }
}

variable "clickup_config" {
  type        = map(string)
  description = "IDs del workspace ClickUp (no secretos). Cargar en terraform.tfvars."
  default     = {}
}

# ── DNS / dominio ───────────────────────────────────────────────────────────────
variable "domain_name" {
  type        = string
  default     = "portal.dinocloud.com"
  description = "FQDN del portal."
}

variable "route53_zone_id" {
  type        = string
  default     = ""
  description = "Zone ID de la hosted zone de dinocloud.com. Vacio = no se gestiona DNS (validar a mano)."
}

# ── CI/CD (OIDC GitHub) ─────────────────────────────────────────────────────────
variable "github_owner" {
  type    = string
  default = "aareco-sys"
}

variable "github_repo" {
  type    = string
  default = "MSP_web_portal"
}

variable "github_deploy_branch" {
  type        = string
  default     = "main"
  description = "Branch desde el que CI puede deployar a prod."
}

# ── Ventana de servicio (schedule L-V 9-20 ART) ─────────────────────────────────
variable "enable_service_schedule" {
  type        = bool
  default     = true
  description = "Activa pause/resume automatico por horario."
}

variable "schedule_timezone" {
  type    = string
  default = "America/Argentina/Buenos_Aires"
}

variable "schedule_resume_cron" {
  type        = string
  default     = "cron(50 8 ? * MON-FRI *)" # 08:50 L-V
  description = "Resume del servicio (margen para arrancar antes de las 9)."
}

variable "schedule_warmup_cron" {
  type        = string
  default     = "cron(55 8 ? * MON-FRI *)" # 08:55 L-V
  description = "Warm-up de caches post-resume."
}

variable "schedule_pause_cron" {
  type        = string
  default     = "cron(0 20 ? * MON-FRI *)" # 20:00 L-V
  description = "Pause del servicio (fin de ventana)."
}

variable "warmup_paths" {
  type        = list(string)
  default     = ["/api/metrics", "/api/rex"]
  description = "Rutas que la Lambda de warm-up golpea para precalentar ambas caches."
}
