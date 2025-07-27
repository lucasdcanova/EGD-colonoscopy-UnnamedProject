#!/bin/bash

echo "🔍 Testando conexão AWS..."
echo "=========================="

# Testar identidade
echo -e "\n1. Verificando identidade AWS:"
aws sts get-caller-identity

# Testar S3
echo -e "\n2. Listando buckets S3 (se houver):"
aws s3 ls

# Verificar região
echo -e "\n3. Região configurada:"
aws configure get region

echo -e "\n✅ Se você viu sua conta e região acima, AWS está configurado corretamente!"
echo "🚀 Próximo passo: executar ./infrastructure/terraform/deploy.sh"