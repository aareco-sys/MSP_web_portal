# DinoCloud Internal - Confidential
# Secretos de runtime. IMPORTANTE: los VALORES no viven en el repo ni se setean
# desde Terraform. Se crean los contenedores vacios y se cargan por CLI:
#
#   aws secretsmanager put-secret-value --secret-id msp-portal/clickup-token \
#     --secret-string "pk_..."   # nunca commitear este valor
#
# `ignore_changes = [secret_string]` evita que un apply pise el valor cargado a mano.

locals {
  secret_prefix = "${var.project_name}/"
}

# CLICKUP_TOKEN — token server-side de ClickUp (pk_...). Obligatorio.
resource "aws_secretsmanager_secret" "clickup_token" {
  name        = "${local.secret_prefix}clickup-token"
  description = "ClickUp API token (server-side). DinoCloud Internal - Confidential."
}

resource "aws_secretsmanager_secret_version" "clickup_token" {
  secret_id     = aws_secretsmanager_secret.clickup_token.id
  secret_string = "PLACEHOLDER_SET_VIA_CLI" # se reemplaza por CLI; ver ignore_changes
  lifecycle {
    ignore_changes = [secret_string]
  }
}

# AUTH_SECRET — secreto de Auth.js/NextAuth (Fase 2). Generar con: openssl rand -base64 32
resource "aws_secretsmanager_secret" "auth_secret" {
  name        = "${local.secret_prefix}auth-secret"
  description = "Auth.js secret (Fase 2). DinoCloud Internal - Confidential."
}

resource "aws_secretsmanager_secret_version" "auth_secret" {
  secret_id     = aws_secretsmanager_secret.auth_secret.id
  secret_string = "PLACEHOLDER_SET_VIA_CLI"
  lifecycle {
    ignore_changes = [secret_string]
  }
}

# COGNITO_CLIENT_SECRET — viene del app client de Cognito (ver cognito.tf).
# Se sincroniza automaticamente: este SI lo conoce Terraform.
resource "aws_secretsmanager_secret" "cognito_client_secret" {
  name        = "${local.secret_prefix}cognito-client-secret"
  description = "Cognito app client secret (Fase 2). DinoCloud Internal - Confidential."
}

resource "aws_secretsmanager_secret_version" "cognito_client_secret" {
  secret_id     = aws_secretsmanager_secret.cognito_client_secret.id
  secret_string = aws_cognito_user_pool_client.app.client_secret
}
