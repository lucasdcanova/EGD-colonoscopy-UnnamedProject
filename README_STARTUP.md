# Como Iniciar os Servidores

## Pré-requisitos
1. Node.js 18+ instalado
2. Arquivo `.env` configurado (já está pronto!)

## Iniciar os Servidores

### Opção 1: Script Automático
```bash
./start-servers.sh
```

### Opção 2: Manualmente em Terminais Separados

**Terminal 1 - Backend API:**
```bash
npm run dev
```
O backend estará disponível em: http://localhost:3000

**Terminal 2 - Frontend React:**
```bash
cd frontend
npm start
```
O frontend estará disponível em: http://localhost:3001

## Verificar se está funcionando

1. **Backend Health Check**: http://localhost:3000/health
2. **Frontend**: http://localhost:3001

## Possíveis Problemas

### Erro de conexão com banco de dados
- Verifique se a DATABASE_URL no .env está correta
- O banco Neon pode estar pausado (acesse o dashboard Neon para ativar)

### Porta já em uso
```bash
# Encontrar processo usando a porta
lsof -i :3000
lsof -i :3001

# Matar processo
kill -9 <PID>
```

### Dependências faltando
```bash
# Backend
npm install

# Frontend
cd frontend && npm install
```

## Autenticação para Testes

Para testar a API, você pode gerar um token JWT temporário:

```javascript
// No console do navegador ou Node.js
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { id: 'test-user', role: 'annotator', specialty: 'gastroenterology' },
  'egd-colonoscopy-jwt-secret-dev-2025',
  { expiresIn: '7d' }
);
console.log(token);
```

Use o token no header:
```
Authorization: Bearer <token>
```