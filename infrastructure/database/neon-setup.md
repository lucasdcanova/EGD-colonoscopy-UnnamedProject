# Configuração do Neon PostgreSQL

## Passos para Configurar o Neon

### 1. Criar Conta e Projeto
1. Acesse [console.neon.tech](https://console.neon.tech)
2. Criar novo projeto: `egd-colonoscopy-ai`
3. Selecionar região: `aws-sa-east-1` (São Paulo) ou `aws-us-east-1` (Virginia)
   - **Recomendado**: Usar mesma região da AWS (us-east-1) para menor latência
   - **Alternativa**: São Paulo (sa-east-1) se preferir dados no Brasil
4. Versão PostgreSQL: `17` (ou a mais recente disponível)

### 2. Configurações do Projeto
- **Compute size**: Autoscaling (0.25 - 4 vCPUs)
- **Storage**: 10 GB inicial
- **Branches**: 
  - `main` (produção)
  - `dev` (desenvolvimento)
- **Backups**: Point-in-time recovery (7 dias)

### 3. Schema do Banco de Dados

```sql
-- Tabela de imagens endoscópicas
CREATE TABLE endoscopy_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_hash VARCHAR(64) UNIQUE NOT NULL,
    s3_path VARCHAR(500) NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP WITH TIME ZONE,
    image_type VARCHAR(50) CHECK (image_type IN ('EGD', 'Colonoscopy')),
    original_size INTEGER,
    processed_size INTEGER,
    width INTEGER,
    height INTEGER,
    anonymized BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de anotações
CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id UUID REFERENCES endoscopy_images(id) ON DELETE CASCADE,
    annotation_type VARCHAR(50) NOT NULL,
    bbox JSONB,
    label VARCHAR(100),
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    annotator_type VARCHAR(50) CHECK (annotator_type IN ('human', 'ai', 'hybrid')),
    annotation_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de resultados do modelo
CREATE TABLE model_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id UUID REFERENCES endoscopy_images(id) ON DELETE CASCADE,
    model_version VARCHAR(50) NOT NULL,
    prediction_type VARCHAR(50),
    predictions JSONB NOT NULL,
    inference_time_ms INTEGER,
    confidence_scores JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de logs de processamento
CREATE TABLE processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id UUID REFERENCES endoscopy_images(id),
    step VARCHAR(100) NOT NULL,
    status VARCHAR(50) CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
    error_message TEXT,
    duration_ms INTEGER,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_images_hash ON endoscopy_images(image_hash);
CREATE INDEX idx_images_type ON endoscopy_images(image_type);
CREATE INDEX idx_images_processed ON endoscopy_images(processed_date);
CREATE INDEX idx_annotations_image ON annotations(image_id);
CREATE INDEX idx_predictions_image ON model_predictions(image_id);
CREATE INDEX idx_logs_image ON processing_logs(image_id);
CREATE INDEX idx_logs_status ON processing_logs(status);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_endoscopy_images_updated_at BEFORE UPDATE
    ON endoscopy_images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE
    ON annotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4. Configuração de Conexão

```javascript
// Exemplo de configuração para Node.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Para TypeORM
const config = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  entities: ['dist/entities/*.js'],
  synchronize: false, // Use migrations em produção
  logging: process.env.NODE_ENV !== 'production'
};
```

### 5. Variáveis de Ambiente

```bash
# .env.example
DATABASE_URL=postgresql://[user]:[password]@[endpoint].neon.tech/[database]?sslmode=require
NEON_API_KEY=your-api-key
NEON_PROJECT_ID=your-project-id
```

### 6. Backup e Recuperação

- **Backups automáticos**: Configurados para 7 dias de retenção
- **Branches**: Criar branches para testes sem afetar produção
- **Point-in-time recovery**: Disponível nas últimas 7 dias

### 7. Monitoramento

- Dashboard Neon para métricas de performance
- Configurar alertas para:
  - Uso de compute > 80%
  - Storage > 8GB
  - Queries lentas > 1s

### 8. Segurança

- Rotação de credenciais a cada 90 dias
- IP allowlist para produção
- Usar connection pooling para aplicações
- Habilitar log de queries em desenvolvimento