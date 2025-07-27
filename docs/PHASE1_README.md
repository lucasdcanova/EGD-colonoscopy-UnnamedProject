# Fase 1: Coleta & Pré-processamento de Dados

## Visão Geral

A Fase 1 implementa o sistema de coleta e pré-processamento de imagens endoscópicas, incluindo:
- API de upload com validação via MCP
- Anonimização automática (LGPD/HIPAA)
- Classificações médicas especializadas
- Pipeline de processamento para MedGemma

## Arquitetura

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   API Node   │────▶│   AWS S3     │
│    React     │     │   Express    │     │   Bucket     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐     ┌──────────────┐
                     │     MCP      │     │     Neon     │
                     │   Server     │     │  PostgreSQL  │
                     └──────────────┘     └──────────────┘
```

## Campos de Anotação

### Obrigatórios
- **Categoria básica**: polyp, ulcer, erosion, bleeding, tumor, inflammation, normal
- **Sexo**: M/F
- **Idade**: Faixas etárias (0-20, 21-40, 41-60, 61-80, >80)
- **Localização**: Órgão e segmento específico
- **Bounding box**: Coordenadas da lesão
- **Confidence**: Score 0-1

### Opcionais - Classificações Especializadas

#### Paris Classification (lesões superficiais)
- **0-I (polipoides)**: Ip (pediculado), Is (séssil), Isp (sub-pediculado)
- **0-II (não-polipoides)**: IIa (elevado), IIb (plano), IIc (deprimido)
- **0-III**: Escavado

#### JNET Classification (padrão vascular NBI)
- **Type 1**: Hiperplásico
- **Type 2A**: Adenoma baixo grau
- **Type 2B**: Adenoma alto grau/carcinoma superficial
- **Type 3**: Carcinoma invasivo

#### Kudo Pit Pattern (padrão de criptas)
- **I**: Normal
- **II**: Estrelado/papilar
- **IIIS**: Tubular pequeno
- **IIIL**: Tubular grande
- **IV**: Ramificado/giriforme
- **V**: Irregular (Vi: irregular, Vn: amorfo)

#### NICE Classification
- **Type 1**: Hiperplásico
- **Type 2**: Adenoma
- **Type 3**: Carcinoma invasivo

#### Forrest Classification (úlceras hemorrágicas)
- **Ia**: Sangramento arterial ativo
- **Ib**: Sangramento venoso ativo
- **IIa**: Vaso visível não sangrante
- **IIb**: Coágulo aderente
- **IIc**: Hematina na base
- **III**: Base limpa

## Setup

### 1. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Editar .env com suas credenciais AWS e Neon
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Executar migração do banco
```bash
npm run db:migrate
```

### 4. Iniciar servidor de desenvolvimento
```bash
npm run dev
```

## API Endpoints

### Upload de Imagem
```
POST /api/upload/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields:
- image: arquivo de imagem (JPEG/PNG)
- category: string (obrigatório)
- sex: M/F (obrigatório)
- ageRange: string (obrigatório)
- location: string (obrigatório)
- boundingBox: JSON (obrigatório)
- confidence: number 0-1 (obrigatório)
- parisClassification: string (opcional)
- jnetClassification: string (opcional)
- kudoPitPattern: string (opcional)
- niceClassification: string (opcional)
- forrestClassification: string (opcional)
```

### Validar Imagem (sem upload)
```
POST /api/upload/validate
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Status do Upload
```
GET /api/upload/status/:imageId
Authorization: Bearer <token>
```

## Pipeline de Processamento

1. **Validação MCP**: Verifica formato e qualidade da imagem
2. **Compliance Check**: Garante conformidade LGPD/HIPAA
3. **Anonimização**: Remove metadados sensíveis
4. **Redimensionamento**: 896x896 pixels (requisito MedGemma)
5. **Upload S3**: Armazenamento seguro com criptografia
6. **Registro DB**: Metadados no Neon PostgreSQL
7. **Dataset Split**: Atribuição automática train/val/test

## Segurança

- Autenticação JWT obrigatória
- Rate limiting por IP
- Validação rigorosa de entrada
- Anonimização automática via MCP
- Criptografia em repouso (S3) e trânsito (TLS)
- Logs de auditoria completos

## Próximos Passos

- [ ] Interface React de anotação
- [ ] Scripts de conversão para formato MedGemma JSONL
- [ ] Dashboard de estatísticas do dataset
- [ ] Sistema de revisão por pares