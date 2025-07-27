#!/bin/bash

# Configurar PATH para incluir npm
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Diretório do projeto
PROJECT_DIR="/Users/lucascanova/Library/Mobile Documents/com~apple~CloudDocs/EGD:Colonoscopy AI project"

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${BLUE}🚀 Iniciando EGD/Colonoscopy AI Project${NC}"
echo "=================================="

# Matar processos anteriores
echo -e "${BLUE}Limpando processos anteriores...${NC}"
pkill -f "npm run dev" 2>/dev/null
pkill -f "tsx watch" 2>/dev/null
pkill -f "react-scripts" 2>/dev/null
sleep 2

# Iniciar Backend
echo -e "${GREEN}📦 Iniciando Backend API...${NC}"
cd "$PROJECT_DIR"
osascript -e "tell app \"Terminal\" to do script \"cd '$PROJECT_DIR' && npm run dev\""

# Aguardar backend iniciar
echo -e "${BLUE}⏳ Aguardando backend iniciar...${NC}"
sleep 5

# Testar backend
echo -e "${BLUE}🔍 Testando backend...${NC}"
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✅ Backend rodando em http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Backend não respondeu${NC}"
fi

# Iniciar Frontend
echo -e "${GREEN}🎨 Iniciando Frontend React...${NC}"
cd "$PROJECT_DIR/frontend"
osascript -e "tell app \"Terminal\" to do script \"cd '$PROJECT_DIR/frontend' && PORT=3001 npm start\""

echo ""
echo -e "${BLUE}=================================="
echo -e "🎉 Servidores iniciados!"
echo -e "=================================="
echo -e "${NC}"
echo "Backend API: http://localhost:3000/health"
echo "Frontend UI: http://localhost:3001"
echo ""
echo "Duas novas janelas do Terminal foram abertas."
echo "Para parar os servidores, feche as janelas ou use Ctrl+C"