# DinoCloud Internal - Confidential
# Ventana de servicio L-V 9-20 ART: EventBridge Scheduler pausa/reanuda App
# Runner (cuando esta pausado no factura compute) + Lambda de warm-up que
# precalienta las dos caches en memoria tras el resume.
#
# Todo gobernado por var.enable_service_schedule (toggle on/off).

locals {
  schedule_count = var.enable_service_schedule ? 1 : 0
}

# Token compartido entre App Runner (env WARMUP_TOKEN) y la Lambda de warm-up,
# para que el proxy de auth deje pasar el precalentamiento de /api/metrics y /api/rex.
resource "random_password" "warmup" {
  length  = 32
  special = false
}

# ── Role para que Scheduler llame a la API de App Runner ─────────────────────────
data "aws_iam_policy_document" "scheduler_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "scheduler" {
  count              = local.schedule_count
  name               = "${var.project_name}-scheduler"
  assume_role_policy = data.aws_iam_policy_document.scheduler_assume.json
}

data "aws_iam_policy_document" "scheduler" {
  count = local.schedule_count
  statement {
    sid       = "PauseResume"
    actions   = ["apprunner:PauseService", "apprunner:ResumeService"]
    resources = [aws_apprunner_service.app.arn]
  }
  statement {
    sid       = "InvokeWarmup"
    actions   = ["lambda:InvokeFunction"]
    resources = [aws_lambda_function.warmup[0].arn]
  }
}

resource "aws_iam_role_policy" "scheduler" {
  count  = local.schedule_count
  name   = "pause-resume-warmup"
  role   = aws_iam_role.scheduler[0].id
  policy = data.aws_iam_policy_document.scheduler[0].json
}

# ── Schedules: resume 08:50 / warmup 08:55 / pause 20:00 (tz ART) ────────────────
resource "aws_scheduler_schedule" "resume" {
  count                        = local.schedule_count
  name                         = "${var.project_name}-resume"
  schedule_expression          = var.schedule_resume_cron
  schedule_expression_timezone = var.schedule_timezone
  flexible_time_window { mode = "OFF" }

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:apprunner:resumeService"
    role_arn = aws_iam_role.scheduler[0].arn
    input    = jsonencode({ ServiceArn = aws_apprunner_service.app.arn })
  }
}

resource "aws_scheduler_schedule" "pause" {
  count                        = local.schedule_count
  name                         = "${var.project_name}-pause"
  schedule_expression          = var.schedule_pause_cron
  schedule_expression_timezone = var.schedule_timezone
  flexible_time_window { mode = "OFF" }

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:apprunner:pauseService"
    role_arn = aws_iam_role.scheduler[0].arn
    input    = jsonencode({ ServiceArn = aws_apprunner_service.app.arn })
  }
}

resource "aws_scheduler_schedule" "warmup" {
  count                        = local.schedule_count
  name                         = "${var.project_name}-warmup"
  schedule_expression          = var.schedule_warmup_cron
  schedule_expression_timezone = var.schedule_timezone
  flexible_time_window { mode = "OFF" }

  target {
    arn      = aws_lambda_function.warmup[0].arn
    role_arn = aws_iam_role.scheduler[0].arn
  }
}

# ── Lambda de warm-up ────────────────────────────────────────────────────────────
data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "warmup" {
  count              = local.schedule_count
  name               = "${var.project_name}-warmup"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "warmup_logs" {
  count      = local.schedule_count
  role       = aws_iam_role.warmup[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "archive_file" "warmup" {
  count       = local.schedule_count
  type        = "zip"
  source_file = "${path.module}/../lambda/scheduler/index.mjs"
  output_path = "${path.module}/.build/warmup.zip"
}

resource "aws_lambda_function" "warmup" {
  count            = local.schedule_count
  function_name    = "${var.project_name}-warmup"
  role             = aws_iam_role.warmup[0].arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.warmup[0].output_path
  source_code_hash = data.archive_file.warmup[0].output_base64sha256
  timeout          = 60

  environment {
    variables = {
      TARGET_BASE_URL = "https://${aws_apprunner_service.app.service_url}"
      WARMUP_PATHS    = join(",", var.warmup_paths)
      WARMUP_TOKEN    = random_password.warmup.result
    }
  }
}
