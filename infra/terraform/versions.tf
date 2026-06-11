# DinoCloud Internal - Confidential
# Stack principal: App Runner + ECR + Secrets Manager + Cognito + IAM/OIDC +
# Route 53 + EventBridge Scheduler. State remoto en S3 (ver ./bootstrap).

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Completar con los outputs de ./bootstrap (terraform output backend_hcl).
  # Se deja comentado para permitir un primer `terraform init` local; activarlo
  # apenas exista el bucket de state.
  #
  # backend "s3" {
  #   bucket         = "msp-portal-tfstate-<ACCOUNT_ID>"
  #   key            = "msp-portal/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "msp-portal-tflock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project      = var.project_name
      Environment  = var.environment
      ManagedBy    = "terraform"
      Confidential = "DinoCloud-Internal"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
