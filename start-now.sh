#!/bin/bash

# Inicia o backend em background
echo "🚀 Iniciando Backend..."
cd "/Users/lucascanova/Library/Mobile Documents/com~apple~CloudDocs/EGD:Colonoscopy AI project"
npm run dev &
BACKEND_PID=$!
echo "✅ Backend iniciado (PID: $BACKEND_PID)"

# Aguarda 3 segundos
sleep 3

# Inicia o frontend
echo "🚀 Iniciando Frontend..."
cd "/Users/lucascanova/Library/Mobile Documents/com~apple~CloudDocs/EGD:Colonoscopy AI project/frontend"
npm start &
FRONTEND_PID=$!
echo "✅ Frontend iniciado (PID: $FRONTEND_PID)"

echo ""
echo "🎉 Servidores iniciados!"
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:3001"
echo ""
echo "Para parar: kill $BACKEND_PID $FRONTEND_PID"
echo "Ou use: pkill -f 'npm run dev' && pkill -f 'npm start'"

# Mantém o script rodando
wait