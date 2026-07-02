# DinoCloud Internal - Confidential
# Dominio custom para App Runner (portal.dinocloud.com) + validacion DNS via
# Route 53. Solo se crea si var.route53_zone_id esta seteado; si no, se asocia
# el dominio igual y la validacion se hace a mano (ver outputs / RUNBOOK).

resource "aws_apprunner_custom_domain_association" "portal" {
  domain_name = var.domain_name
  service_arn = aws_apprunner_service.app.arn
}

# Registros de validacion del certificado (App Runner los emite) + CNAME al
# endpoint. Se crean automaticamente si tenemos la hosted zone.
resource "aws_route53_record" "cert_validation" {
  for_each = var.route53_zone_id == "" ? {} : {
    for r in aws_apprunner_custom_domain_association.portal.certificate_validation_records :
    r.name => r
  }

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.value]
}

resource "aws_route53_record" "portal" {
  count   = var.route53_zone_id == "" ? 0 : 1
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "CNAME"
  ttl     = 300
  records = [aws_apprunner_custom_domain_association.portal.dns_target]
}
