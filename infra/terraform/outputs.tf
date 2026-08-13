# DinoCloud Internal - Confidential

output "ecr_repository_url" {
  description = "Repo ECR (push de imagenes desde CI o manual)."
  value       = aws_ecr_repository.app.repository_url
}

output "apprunner_service_arn" {
  value = aws_apprunner_service.app.arn
}

output "apprunner_default_url" {
  description = "URL por defecto de App Runner (antes del dominio custom)."
  value       = "https://${aws_apprunner_service.app.service_url}"
}

output "github_deploy_role_arn" {
  description = "Rol que asume GitHub Actions via OIDC (setear como secret/var en el repo: AWS_DEPLOY_ROLE_ARN)."
  value       = aws_iam_role.github_deploy.arn
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.app.id
}

output "cognito_domain" {
  value = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.region}.amazoncognito.com"
}

output "custom_domain_dns_target" {
  description = "Si no se gestiona Route 53, apuntar manualmente portal.dinocloud.com (CNAME) aca."
  value       = aws_apprunner_custom_domain_association.portal.dns_target
}

output "custom_domain_validation_records" {
  description = "Registros de validacion del certificado (crear a mano si no hay zone_id)."
  value       = aws_apprunner_custom_domain_association.portal.certificate_validation_records
}

output "secret_arns" {
  description = "ARNs de los secretos a cargar por CLI (CLICKUP_TOKEN, AUTH_SECRET, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)."
  value = {
    clickup_token               = aws_secretsmanager_secret.clickup_token.arn
    auth_secret                 = aws_secretsmanager_secret.auth_secret.arn
    google_service_account_key = aws_secretsmanager_secret.google_service_account_key.arn
  }
}
