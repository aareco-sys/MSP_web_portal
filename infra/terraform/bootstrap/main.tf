# DinoCloud Internal - Confidential
# Bootstrap del backend de estado de Terraform: bucket S3 (state) + tabla
# DynamoDB (lock). Se aplica UNA sola vez y con state LOCAL (no hay backend
# remoto todavia). Despues, el stack principal en ../ usa este bucket/tabla.
#
#   cd infra/terraform/bootstrap
#   terraform init
#   terraform apply
#
# Idempotente: si los recursos ya existen, importarlos antes de re-aplicar.

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project     = var.project_name
      ManagedBy   = "terraform"
      Component   = "tfstate-backend"
      Confidential = "DinoCloud-Internal"
    }
  }
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "msp-portal"
}

variable "state_bucket_name" {
  type        = string
  description = "Nombre global-unico del bucket de state. Ej: msp-portal-tfstate-<accountid>."
}

variable "lock_table_name" {
  type    = string
  default = "msp-portal-tflock"
}

resource "aws_s3_bucket" "tfstate" {
  bucket = var.state_bucket_name
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket                  = aws_s3_bucket.tfstate.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "tflock" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
}

output "state_bucket" {
  value = aws_s3_bucket.tfstate.id
}

output "lock_table" {
  value = aws_dynamodb_table.tflock.name
}

output "backend_hcl" {
  description = "Pegar en ../versions.tf (bloque backend \"s3\")."
  value       = <<-EOT
    bucket         = "${aws_s3_bucket.tfstate.id}"
    key            = "msp-portal/terraform.tfstate"
    region         = "${var.region}"
    dynamodb_table = "${aws_dynamodb_table.tflock.name}"
    encrypt        = true
  EOT
}
