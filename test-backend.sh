#!/bin/bash

echo "🔍 Testando Backend..."
echo ""

echo "1. Health Check:"
curl -s http://localhost:3000/health | python3 -m json.tool || echo "❌ Falhou"

echo ""
echo "2. Estrutura da API:"
curl -s http://localhost:3000/ || echo "❌ Sem resposta"

echo ""
echo "✅ Backend está rodando em: http://localhost:3000"