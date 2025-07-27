#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Carregar variáveis de ambiente
dotenv.config({ path: '../.env' });

const { Client } = pg;

// SQL para criar as tabelas
const createTablesSql = `
-- Tabela de imagens endoscópicas
CREATE TABLE IF NOT EXISTS endoscopy_images (
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
CREATE TABLE IF NOT EXISTS annotations (
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
CREATE TABLE IF NOT EXISTS model_predictions (
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
CREATE TABLE IF NOT EXISTS processing_logs (
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
CREATE INDEX IF NOT EXISTS idx_images_hash ON endoscopy_images(image_hash);
CREATE INDEX IF NOT EXISTS idx_images_type ON endoscopy_images(image_type);
CREATE INDEX IF NOT EXISTS idx_images_processed ON endoscopy_images(processed_date);
CREATE INDEX IF NOT EXISTS idx_annotations_image ON annotations(image_id);
CREATE INDEX IF NOT EXISTS idx_predictions_image ON model_predictions(image_id);
CREATE INDEX IF NOT EXISTS idx_logs_image ON processing_logs(image_id);
CREATE INDEX IF NOT EXISTS idx_logs_status ON processing_logs(status);

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
`;

async function createTables() {
  // Extrair connection string limpa
  let connectionString = process.env.DATABASE_URL;
  if (connectionString.startsWith('psql ')) {
    connectionString = connectionString.replace('psql ', '').replace(/'/g, '');
  }
  
  const client = new Client({
    connectionString: connectionString
  });
  
  try {
    console.log('🔗 Conectando ao Neon PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado com sucesso!\n');
    
    console.log('📊 Criando tabelas...');
    await client.query(createTablesSql);
    console.log('✅ Tabelas criadas com sucesso!\n');
    
    // Verificar tabelas criadas
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tabelas criadas:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Verificar índices
    const indexesResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname NOT LIKE '%_pkey'
      ORDER BY indexname;
    `);
    
    console.log('\n🔍 Índices criados:');
    indexesResult.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });
    
    console.log('\n🎉 Banco de dados configurado com sucesso!');
    console.log('\nPróximos passos:');
    console.log('1. Implementar API de upload de imagens');
    console.log('2. Configurar processamento com MedGemma');
    console.log('3. Criar interface de visualização');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Executar
createTables().catch(console.error);