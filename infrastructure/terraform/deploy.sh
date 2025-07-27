#!/bin/bash

# Script de deploy da infraestrutura AWS
# Projeto EGD/Colonoscopia AI

set -e  # Parar em caso de erro

echo "🚀 Deploy da Infraestrutura - EGD/Colonoscopia AI"
echo "================================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar comando
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 não está instalado${NC}"
        echo "Por favor, instale $1 primeiro:"
        echo "  brew install $2"
        exit 1
    else
        echo -e "${GREEN}✅ $1 está instalado${NC}"
    fi
}

# Verificar pré-requisitos
echo -e "\n${YELLOW}1. Verificando pré-requisitos...${NC}"
check_command "aws" "awscli"

# Usar terraform local se existir
if [ -f "../bin/terraform" ]; then
    echo -e "${GREEN}✅ Usando Terraform local${NC}"
    TERRAFORM="../bin/terraform"
else
    check_command "terraform" "hashicorp/tap/terraform"
    TERRAFORM="terraform"
fi

# Verificar credenciais AWS
echo -e "\n${YELLOW}2. Verificando credenciais AWS...${NC}"
if aws sts get-caller-identity &> /dev/null; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✅ AWS configurado - Conta: $ACCOUNT_ID${NC}"
else
    echo -e "${RED}❌ AWS CLI não está configurado${NC}"
    echo "Execute: aws configure"
    exit 1
fi

# Navegar para o diretório correto
cd "$(dirname "$0")"
echo -e "\n${YELLOW}3. Diretório de trabalho: $(pwd)${NC}"

# Criar arquivo tfvars se não existir
if [ ! -f "terraform.tfvars" ]; then
    echo -e "\n${YELLOW}4. Criando arquivo terraform.tfvars...${NC}"
    cp terraform.tfvars.example terraform.tfvars
    echo -e "${GREEN}✅ Arquivo criado. Edite se necessário.${NC}"
else
    echo -e "\n${YELLOW}4. Arquivo terraform.tfvars já existe${NC}"
fi

# Inicializar Terraform
echo -e "\n${YELLOW}5. Inicializando Terraform...${NC}"
$TERRAFORM init

# Validar configuração
echo -e "\n${YELLOW}6. Validando configuração...${NC}"
if $TERRAFORM validate; then
    echo -e "${GREEN}✅ Configuração válida${NC}"
else
    echo -e "${RED}❌ Erro na configuração${NC}"
    exit 1
fi

# Planejar infraestrutura
echo -e "\n${YELLOW}7. Planejando infraestrutura...${NC}"
$TERRAFORM plan -out=tfplan

# Perguntar se deseja aplicar
echo -e "\n${YELLOW}8. Revisar o plano acima.${NC}"
read -p "Deseja aplicar estas mudanças? (s/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo -e "\n${YELLOW}9. Aplicando infraestrutura...${NC}"
    $TERRAFORM apply tfplan
    
    # Salvar outputs
    echo -e "\n${YELLOW}10. Salvando outputs...${NC}"
    $TERRAFORM output -json > ../aws-outputs.json
    echo -e "${GREEN}✅ Outputs salvos em infrastructure/aws-outputs.json${NC}"
    
    # Mostrar próximos passos
    echo -e "\n${GREEN}🎉 Infraestrutura AWS criada com sucesso!${NC}"
    echo -e "\n${YELLOW}Próximos passos:${NC}"
    echo "1. Acessar console.neon.tech"
    echo "2. Criar projeto 'egd-colonoscopy-ai'"
    echo "3. Copiar connection string"
    echo "4. Executar SQL de infrastructure/database/neon-setup.md"
    echo "5. Criar arquivo .env na raiz do projeto"
    
    # Mostrar recursos criados
    echo -e "\n${YELLOW}Recursos criados:${NC}"
    echo "- VPC: $($TERRAFORM output -raw vpc_id 2>/dev/null || echo 'Ver aws-outputs.json')"
    echo "- S3 Bucket: $($TERRAFORM output -raw s3_bucket_name 2>/dev/null || echo 'Ver aws-outputs.json')"
    echo "- Security Group: $($TERRAFORM output -raw api_security_group_id 2>/dev/null || echo 'Ver aws-outputs.json')"
else
    echo -e "${YELLOW}Deploy cancelado${NC}"
    rm tfplan
fi