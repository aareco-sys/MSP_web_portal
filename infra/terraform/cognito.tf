# DinoCloud Internal - Confidential
# User Pool para auth de la app (Fase 2 integra Auth.js + este pool).
# MFA obligatorio (TOTP), self sign-up OFF (alta/baja por admin).

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-users"

  # Solo el admin da de alta usuarios.
  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # MFA obligatorio via TOTP (sin SMS, sin costo).
  mfa_configuration = "ON"
  software_token_mfa_configuration {
    enabled = true
  }

  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

# Dominio hosted UI de Cognito (para el flujo OAuth de Auth.js).
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${data.aws_caller_identity.current.account_id}"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "aws_cognito_user_pool_client" "app" {
  name         = "${var.project_name}-web"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret                      = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers         = ["COGNITO"]

  # Incluye la URL default de App Runner (var.app_base_url) y el dominio custom.
  # distinct() evita duplicados cuando app_base_url == dominio custom (post-cutover).
  callback_urls = distinct(compact([
    var.app_base_url != "" ? "${var.app_base_url}/api/auth/callback" : "",
    "https://${var.domain_name}/api/auth/callback",
  ]))
  logout_urls = distinct(compact([
    var.app_base_url != "" ? var.app_base_url : "",
    "https://${var.domain_name}",
  ]))

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}
