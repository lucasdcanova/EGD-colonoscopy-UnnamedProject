# MCP (Model Context Protocol) - Guia de Uso

## Visão Geral

O servidor MCP do projeto EGD/Colonoscopy AI foi desenvolvido para garantir que agentes de IA sigam os protocolos corretos durante o desenvolvimento. Ele fornece tools específicos para validação de imagens médicas, verificação de compliance e acesso às configurações do projeto.

## Instalação

### 1. Instalar dependências

```bash
cd mcp/server
npm install
```

### 2. Compilar o servidor

```bash
npm run build
```

### 3. Configurar Claude Code

Adicione ao seu arquivo de configuração do Claude Code (normalmente em `~/.config/claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "egd-colonoscopy": {
      "command": "node",
      "args": ["/caminho/completo/para/mcp/server/dist/index.js"]
    }
  }
}
```

## Tools Disponíveis

### 1. `validate_endoscopy_image`

Valida se uma imagem atende aos requisitos do MedGemma (896x896 RGB).

**Parâmetros:**
- `imagePath` (string): Caminho para a imagem
- `checkContent` (boolean, opcional): Verifica se a imagem parece ser endoscópica

**Exemplo de uso:**
```typescript
{
  "tool": "validate_endoscopy_image",
  "arguments": {
    "imagePath": "/path/to/image.jpg",
    "checkContent": true
  }
}
```

**Retorno:**
- `isValid`: Se a imagem está pronta para processamento
- `errors`: Lista de erros encontrados
- `warnings`: Avisos sobre possíveis melhorias
- `metadata`: Informações técnicas da imagem
- `recommendation`: Recomendação de ação

### 2. `check_compliance`

Verifica conformidade com LGPD e HIPAA em imagens e dados JSON.

**Parâmetros:**
- `imagePath` (string, opcional): Caminho para imagem a verificar
- `jsonData` (object, opcional): Dados JSON para verificar
- `checkType` (enum): "image", "data" ou "both"

**Exemplo de uso:**
```typescript
{
  "tool": "check_compliance",
  "arguments": {
    "imagePath": "/path/to/image.jpg",
    "checkType": "image"
  }
}
```

**Retorno:**
- `compliant`: Se os dados estão em conformidade
- `checks`: Lista detalhada de verificações
- `recommendations`: Ações recomendadas
- `requiredActions`: Ações obrigatórias para conformidade

### 3. `anonymize_data`

Remove informações sensíveis (PHI/PII) de imagens e dados JSON.

**Parâmetros:**
- `imagePath` (string, opcional): Imagem para anonimizar
- `outputPath` (string, opcional): Caminho de saída
- `jsonData` (object, opcional): Dados para anonimizar
- `anonymizationLevel` (enum): "basic", "moderate" ou "strict"

**Exemplo de uso:**
```typescript
{
  "tool": "anonymize_data",
  "arguments": {
    "imagePath": "/path/to/image.jpg",
    "anonymizationLevel": "moderate"
  }
}
```

**Retorno:**
- `success`: Se a anonimização foi bem-sucedida
- `operations`: Lista de operações realizadas
- `outputPath`: Caminho da imagem anonimizada
- `anonymizedData`: Dados JSON anonimizados

### 4. `validate_config`

Valida configurações do projeto contra requisitos do MedGemma.

**Parâmetros:**
- `configType` (enum): "model", "training", "deployment" ou "data"
- `config` (object): Objeto de configuração a validar

**Exemplo de uso:**
```typescript
{
  "tool": "validate_config",
  "arguments": {
    "configType": "training",
    "config": {
      "lora_config": {
        "r": 16,
        "lora_alpha": 32
      },
      "training_args": {
        "learning_rate": 2e-4,
        "bf16": true
      }
    }
  }
}
```

**Retorno:**
- `isValid`: Se a configuração é válida
- `errors`: Erros que impedem o uso
- `warnings`: Avisos sobre configurações subótimas
- `suggestions`: Sugestões de melhoria

## Resources Disponíveis

### 1. `medgemma://config`

Fornece a configuração completa do MedGemma 4B incluindo:
- Requisitos de hardware
- Parâmetros de inferência
- Configurações de fine-tuning
- Templates de prompts
- Requisitos de compliance

### 2. `project://guidelines`

Contém todas as diretrizes do projeto:
- Padrões de desenvolvimento
- Requisitos de segurança
- Protocolos clínicos
- Fluxo de trabalho Git
- Convenções de nomenclatura

## Casos de Uso Comuns

### 1. Preparar imagens para treinamento

```bash
# Validar formato da imagem
mcp call validate_endoscopy_image '{"imagePath": "image.jpg"}'

# Verificar compliance
mcp call check_compliance '{"imagePath": "image.jpg", "checkType": "image"}'

# Anonimizar se necessário
mcp call anonymize_data '{"imagePath": "image.jpg", "anonymizationLevel": "moderate"}'
```

### 2. Validar configuração antes do treinamento

```bash
# Ler configuração do MedGemma
mcp read medgemma://config

# Validar sua configuração customizada
mcp call validate_config '{"configType": "training", "config": {...}}'
```

### 3. Garantir compliance em dados JSON

```bash
# Verificar dados de anotação
mcp call check_compliance '{
  "jsonData": {
    "patient_name": "João Silva",
    "exam_date": "2024-01-01",
    "findings": "Pólipo no cólon ascendente"
  },
  "checkType": "data"
}'

# Anonimizar dados sensíveis
mcp call anonymize_data '{
  "jsonData": {...},
  "anonymizationLevel": "strict"
}'
```

## Integração com Agentes de IA

Ao usar Claude Code ou outros agentes de IA compatíveis com MCP:

1. **Início do desenvolvimento**: O agente pode consultar `project://guidelines` para entender os padrões do projeto.

2. **Processamento de imagens**: Antes de processar imagens, o agente deve usar `validate_endoscopy_image` e `check_compliance`.

3. **Configuração de modelos**: Ao configurar treinamento ou deployment, use `validate_config` para garantir compatibilidade.

4. **Proteção de dados**: Sempre use `anonymize_data` antes de armazenar ou transmitir dados médicos.

## Troubleshooting

### Erro: "Tool not found"
- Verifique se o servidor MCP está rodando
- Confirme o caminho no arquivo de configuração

### Erro: "Image validation failed"
- Verifique se a imagem existe no caminho especificado
- Confirme que o formato é suportado (JPEG/PNG)

### Aviso: "Configuration suboptimal"
- Revise as sugestões fornecidas
- Consulte `medgemma://config` para valores recomendados

## Desenvolvimento

Para adicionar novos tools ou resources:

1. Crie o arquivo em `src/tools/` ou `src/resources/`
2. Importe e registre no `src/index.ts`
3. Recompile com `npm run build`
4. Atualize esta documentação

## Segurança

- Nunca desabilite verificações de compliance
- Sempre anonimize dados antes de compartilhar
- Mantenha logs de todas as operações sensíveis
- Revise regularmente as políticas de segurança