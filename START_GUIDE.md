# 🚀 Guia de Inicialização - EGD/Colonoscopy AI

## Status Atual
- ✅ Backend configurado e pronto
- ✅ Frontend React configurado
- ✅ Banco de dados Neon conectado
- ⚠️  Erro de log no backend (não impede funcionamento)

## Para Iniciar os Servidores

### Terminal 1 - Backend (Modo Teste)
```bash
cd "/Users/lucascanova/Library/Mobile Documents/com~apple~CloudDocs/EGD:Colonoscopy AI project"
npx tsx src/api/test-server.ts
```

Ou para o servidor completo:
```bash
npm run dev
```

### Terminal 2 - Frontend
```bash
cd "/Users/lucascanova/Library/Mobile Documents/com~apple~CloudDocs/EGD:Colonoscopy AI project/frontend"
npm start
```

## URLs de Acesso

### Backend
- Health Check: http://localhost:3000/health
- Test API: http://localhost:3000/api/test

### Frontend
- Interface: http://localhost:3001
- Upload de Imagens: http://localhost:3001/
- Dataset Dashboard: http://localhost:3001/dataset

## Troubleshooting

### Se o frontend não iniciar:
```bash
cd frontend
rm -rf node_modules
npm install
npm start
```

### Se precisar matar processos:
```bash
# Ver processos nas portas
lsof -i :3000
lsof -i :3001

# Matar processo
kill -9 <PID>
```

### Para testar upload de imagem:
1. Acesse http://localhost:3001
2. Arraste uma imagem ou clique para selecionar
3. Preencha os campos obrigatórios:
   - Categoria
   - Sexo
   - Faixa etária
   - Localização
   - Confiança (0-1)
4. Clique em "Enviar Imagem"

## Próximos Passos
1. Corrigir o erro de logger no backend
2. Implementar autenticação no frontend
3. Começar a coletar imagens para o dataset