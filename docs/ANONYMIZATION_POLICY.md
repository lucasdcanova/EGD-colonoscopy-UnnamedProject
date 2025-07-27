# Política de Anonimização de Dados - Projeto EGD/Colonoscopia AI

## Objetivo
Estabelecer diretrizes para proteção de dados pessoais e informações de saúde protegidas (PHI) em conformidade com LGPD e HIPAA.

## Escopo
Esta política aplica-se a todas as imagens endoscópicas, metadados e informações clínicas processadas pelo sistema.

## Dados a Serem Removidos/Mascarados

### 1. Metadados DICOM/EXIF
- **Nome do paciente**
- **ID do paciente** 
- **Data de nascimento**
- **CPF/RG**
- **Número do prontuário**
- **Nome do médico**
- **Instituição/Hospital**
- **Datas específicas** (manter apenas ano quando necessário para análise)
- **Número de série do equipamento**
- **Localização GPS**

### 2. Informações nas Imagens
- **Textos sobrepostos** com nome/ID do paciente
- **Marcações manuais** com informações identificáveis
- **Carimbos de tempo** com data/hora específica

### 3. Dados Estruturados (JSON/Database)
- **Identificadores diretos**: Nome, CPF, RG, endereço, telefone, email
- **Identificadores indiretos**: Idade exata → faixas etárias (ex: 50-60 anos)
- **Datas**: Manter apenas intervalos quando necessário
- **Números únicos**: Substituir por hashes SHA-256

## Processo de Anonimização

### Etapa 1: Validação Pré-Anonimização
```bash
# Usar ferramenta MCP para verificar compliance
mcp-tool check-compliance --type=image --path=<caminho_imagem>
```

### Etapa 2: Anonimização Automática
```bash
# Usar ferramenta MCP para anonimizar
mcp-tool anonymize-data --level=moderate --input=<entrada> --output=<saida>
```

### Etapa 3: Validação Pós-Anonimização
- Revisão manual por amostragem (5% dos dados)
- Verificação automática de metadados removidos
- Teste de re-identificação

## Níveis de Anonimização

### Básico
- Remove identificadores diretos
- Mantém dados demográficos gerais

### Moderado (Padrão)
- Remove identificadores diretos e indiretos
- Generaliza dados demográficos
- Remove metadados EXIF/DICOM

### Estrito
- Remove todos os identificadores possíveis
- Aplica ruído estatístico quando aplicável
- Remove qualquer texto das imagens

## Armazenamento e Acesso

### Dados Originais
- Armazenar em bucket GCS separado com acesso restrito
- Criptografia CMEK obrigatória
- Logs de acesso auditados

### Dados Anonimizados
- Bucket GCS principal para processamento
- Acesso baseado em IAM roles
- Backup automático diário

## Retenção de Dados
- **Dados originais**: 6 meses após anonimização
- **Dados anonimizados**: 5 anos
- **Logs de acesso**: 1 ano

## Responsabilidades
- **DPO (Data Protection Officer)**: Supervisão geral
- **Equipe de Engenharia**: Implementação técnica
- **Equipe Médica**: Validação de anonimização clínica

## Auditoria
- Revisão trimestral da política
- Teste de penetração anual
- Relatório de conformidade mensal

## Ferramentas Utilizadas
1. **MCP Server Tools**:
   - `check-compliance`: Verificação de PHI/PII
   - `anonymize-data`: Anonimização automática
   - `validate-image`: Validação de formato

2. **Bibliotecas Python**:
   - `pydicom`: Manipulação de metadados DICOM
   - `Pillow`: Processamento de imagens
   - `hashlib`: Geração de identificadores únicos

## Contato
Em caso de dúvidas ou incidentes de segurança:
- Email: privacy@egd-colonoscopy-ai.com
- Hotline: Disponível 24/7

---
*Última atualização: 2025-07-27*
*Versão: 1.0*