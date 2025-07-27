#!/bin/bash

echo "📦 Instalando dependências do projeto"
echo "===================================="

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar se Homebrew está instalado
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}Homebrew não encontrado. Instalando...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo -e "${GREEN}✅ Homebrew já está instalado${NC}"
fi

# Instalar AWS CLI
echo -e "\n${YELLOW}Instalando AWS CLI...${NC}"
if ! command -v aws &> /dev/null; then
    brew install awscli
    echo -e "${GREEN}✅ AWS CLI instalado${NC}"
else
    echo -e "${GREEN}✅ AWS CLI já está instalado${NC}"
fi

# Instalar Terraform
echo -e "\n${YELLOW}Instalando Terraform...${NC}"
if ! command -v terraform &> /dev/null; then
    brew tap hashicorp/tap
    brew install hashicorp/tap/terraform
    echo -e "${GREEN}✅ Terraform instalado${NC}"
else
    echo -e "${GREEN}✅ Terraform já está instalado${NC}"
fi

# Instalar Python3 e pip
echo -e "\n${YELLOW}Verificando Python...${NC}"
if ! command -v python3 &> /dev/null; then
    brew install python@3.11
    echo -e "${GREEN}✅ Python instalado${NC}"
else
    echo -e "${GREEN}✅ Python já está instalado${NC}"
fi

# Instalar Node.js (para o MCP server)
echo -e "\n${YELLOW}Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    brew install node
    echo -e "${GREEN}✅ Node.js instalado${NC}"
else
    echo -e "${GREEN}✅ Node.js já está instalado${NC}"
fi

# Verificar instalações
echo -e "\n${YELLOW}Verificando instalações:${NC}"
echo "AWS CLI: $(aws --version 2>/dev/null || echo 'Não instalado')"
echo "Terraform: $(terraform version 2>/dev/null | head -n1 || echo 'Não instalado')"
echo "Python: $(python3 --version 2>/dev/null || echo 'Não instalado')"
echo "Node.js: $(node --version 2>/dev/null || echo 'Não instalado')"

echo -e "\n${GREEN}✅ Instalação concluída!${NC}"
echo -e "\n${YELLOW}Próximos passos:${NC}"
echo "1. Execute: aws configure"
echo "2. Insira suas credenciais AWS"
echo "3. Execute: ./test-aws-connection.sh"