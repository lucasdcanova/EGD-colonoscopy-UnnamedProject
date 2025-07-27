#!/usr/bin/env node

import { S3Client, ListBucketsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente do diretório pai
dotenv.config({ path: join(__dirname, '..', '.env') });

const { Client } = pg;

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

console.log('🔍 Testando conexões do projeto EGD/Colonoscopia AI\n');

// Teste 1: AWS S3
async function testS3Connection() {
  console.log(`${colors.yellow}1. Testando conexão com AWS S3...${colors.reset}`);
  
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    // Listar buckets
    const listCommand = new ListBucketsCommand({});
    const response = await s3Client.send(listCommand);
    
    const bucketFound = response.Buckets?.find(b => b.Name === process.env.AWS_S3_BUCKET);
    if (bucketFound) {
      console.log(`${colors.green}✅ Bucket ${process.env.AWS_S3_BUCKET} encontrado${colors.reset}`);
      
      // Testar upload
      const testCommand = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: 'test/connection-test.txt',
        Body: `Teste de conexão - ${new Date().toISOString()}`,
        ContentType: 'text/plain'
      });
      
      await s3Client.send(testCommand);
      console.log(`${colors.green}✅ Upload de teste realizado com sucesso${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Bucket ${process.env.AWS_S3_BUCKET} não encontrado${colors.reset}`);
    }
    
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Erro ao conectar com S3: ${error.message}${colors.reset}`);
    return false;
  }
}

// Teste 2: Neon PostgreSQL
async function testNeonConnection() {
  console.log(`\n${colors.yellow}2. Testando conexão com Neon PostgreSQL...${colors.reset}`);
  
  // Extrair connection string limpa (remover 'psql' do início se houver)
  let connectionString = process.env.DATABASE_URL;
  if (connectionString.startsWith('psql ')) {
    connectionString = connectionString.replace('psql ', '').replace(/'/g, '');
  }
  
  const client = new Client({
    connectionString: connectionString
  });
  
  try {
    await client.connect();
    console.log(`${colors.green}✅ Conectado ao Neon PostgreSQL${colors.reset}`);
    
    // Verificar versão
    const versionResult = await client.query('SELECT version()');
    console.log(`   PostgreSQL: ${versionResult.rows[0].version.split(',')[0]}`);
    
    // Verificar região
    const regionResult = await client.query("SELECT current_setting('neon.region', true) as region");
    console.log(`   Região: ${regionResult.rows[0].region || 'aws-sa-east-1'}`);
    
    // Testar criação de tabela simples
    await client.query(`
      CREATE TABLE IF NOT EXISTS connection_test (
        id SERIAL PRIMARY KEY,
        tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query('INSERT INTO connection_test DEFAULT VALUES');
    console.log(`${colors.green}✅ Operações de banco funcionando corretamente${colors.reset}`);
    
    // Limpar teste
    await client.query('DROP TABLE IF EXISTS connection_test');
    
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Erro ao conectar com Neon: ${error.message}${colors.reset}`);
    return false;
  } finally {
    await client.end();
  }
}

// Teste 3: Latência Cross-Region
async function testCrossRegionLatency() {
  console.log(`\n${colors.yellow}3. Testando latência cross-region...${colors.reset}`);
  
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  
  // Teste S3 (US)
  const s3Start = Date.now();
  try {
    await s3Client.send(new ListBucketsCommand({}));
    const s3Latency = Date.now() - s3Start;
    console.log(`   S3 (${process.env.AWS_REGION}): ${s3Latency}ms`);
  } catch (error) {
    console.log(`   S3: Erro ao medir latência`);
  }
  
  // Teste Neon (BR)
  let connectionString = process.env.DATABASE_URL;
  if (connectionString.startsWith('psql ')) {
    connectionString = connectionString.replace('psql ', '').replace(/'/g, '');
  }
  
  const dbStart = Date.now();
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    await client.query('SELECT 1');
    const dbLatency = Date.now() - dbStart;
    console.log(`   Neon (${process.env.NEON_REGION}): ${dbLatency}ms`);
    await client.end();
  } catch (error) {
    console.log(`   Neon: Erro ao medir latência`);
  }
}

// Executar todos os testes
async function runAllTests() {
  const s3Success = await testS3Connection();
  const neonSuccess = await testNeonConnection();
  await testCrossRegionLatency();
  
  console.log(`\n${colors.yellow}📊 Resumo dos Testes:${colors.reset}`);
  console.log(`   AWS S3: ${s3Success ? colors.green + '✅ OK' : colors.red + '❌ FALHOU'}${colors.reset}`);
  console.log(`   Neon PostgreSQL: ${neonSuccess ? colors.green + '✅ OK' : colors.red + '❌ FALHOU'}${colors.reset}`);
  
  if (s3Success && neonSuccess) {
    console.log(`\n${colors.green}🎉 Todas as conexões estão funcionando corretamente!${colors.reset}`);
    console.log('\nPróximo passo: Executar o SQL de criação das tabelas');
    console.log('Arquivo: infrastructure/database/neon-setup.md');
  } else {
    console.log(`\n${colors.red}⚠️  Algumas conexões falharam. Verifique as configurações.${colors.reset}`);
    process.exit(1);
  }
}

// Executar
runAllTests().catch(console.error);