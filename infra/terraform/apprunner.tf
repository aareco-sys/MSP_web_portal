# DinoCloud Internal - Confidential
# Servicio App Runner: imagen de ECR, 1 vCPU / 2 GB, min 1 instancia (cache
# tibia), healthcheck /api/health, secretos desde Secrets Manager.

resource "aws_apprunner_auto_scaling_configuration_version" "app" {
  auto_scaling_configuration_name = var.project_name
  min_size                        = var.apprunner_min_size # 1 = no scale-to-zero
  max_size                        = var.apprunner_max_size
}

resource "aws_apprunner_service" "app" {
  service_name = var.project_name

  source_configuration {
    # CI publica la imagen; App Runner auto-deploya el nuevo :latest.
    auto_deployments_enabled = true

    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port = "3000"

        runtime_environment_variables = merge(var.app_env, var.clickup_config)

        # Secretos inyectados por ARN (App Runner los resuelve en runtime).
        runtime_environment_secrets = {
          CLICKUP_TOKEN         = aws_secretsmanager_secret.clickup_token.arn
          AUTH_SECRET           = aws_secretsmanager_secret.auth_secret.arn
          COGNITO_CLIENT_SECRET = aws_secretsmanager_secret.cognito_client_secret.arn
        }
      }
    }
  }

  instance_configuration {
    cpu               = var.apprunner_cpu
    memory            = var.apprunner_memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/api/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.app.arn

  # El primer deploy requiere que exista una imagen en ECR. Si se aplica antes
  # de publicar la primera imagen, App Runner queda en CREATE_FAILED: publicar
  # la imagen (paso CI/manual) y re-aplicar. Ver RUNBOOK.
}
