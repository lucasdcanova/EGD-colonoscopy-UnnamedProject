# Configuração Multi-Região - AWS (US) + Neon (Brasil)

## Arquitetura

- **AWS S3**: `us-east-1` (Virginia)
- **Neon PostgreSQL**: `aws-sa-east-1` (São Paulo)

## Vantagens desta Configuração

1. **Compliance LGPD**: Dados de pacientes armazenados no Brasil
2. **Separação de Concerns**: 
   - Imagens (menos sensíveis) nos EUA
   - Dados estruturados (mais sensíveis) no Brasil
3. **Performance para usuários brasileiros**: Queries ao banco mais rápidas

## Considerações de Custo

### Transferência de Dados
- **S3 → Internet**: Primeiros 100 GB/mês grátis
- **Cross-region (US → BR)**: ~$0.02/GB
- **Estimativa mensal**: $2-10 dependendo do volume

### Otimizações Recomendadas

1. **Cache Local**:
   ```javascript
   // Implementar cache Redis no Brasil
   const redis = new Redis({
     host: 'redis-sa-east-1.example.com'
   });
   ```

2. **Batch Processing**:
   ```javascript
   // Processar imagens em lote para reduzir transferências
   async function batchProcessImages(imageIds) {
     const images = await s3.getObjects(imageIds);
     const results = await processInBatch(images);
     await neon.insertBatch(results);
   }
   ```

3. **CDN para Imagens**:
   - Configurar CloudFront com origem no S3
   - Edge locations no Brasil para cache

## Configuração de Rede

### Latência Esperada
- **Aplicação (BR) → S3 (US)**: ~120-150ms
- **Aplicação (BR) → Neon (BR)**: ~10-30ms
- **Total round-trip**: ~150-200ms

### Timeouts Recomendados
```javascript
// config/aws.js
export const s3Config = {
  region: 'us-east-1',
  httpOptions: {
    timeout: 5000, // 5 segundos para operações S3
    connectTimeout: 3000
  }
};

// config/database.js
export const neonConfig = {
  connectionTimeoutMillis: 2000, // 2 segundos para Neon
  query_timeout: 10000
};
```

## Segurança Cross-Region

### 1. Criptografia em Trânsito
- Todas as comunicações via HTTPS/TLS
- Certificados SSL para ambas regiões

### 2. VPN ou Direct Connect (Opcional)
Para ambientes de produção críticos:
```bash
# AWS Direct Connect ou VPN Site-to-Site
# Conectar rede brasileira com VPC us-east-1
```

### 3. Controle de Acesso
```javascript
// Separar credenciais por região
const s3Credentials = {
  region: 'us-east-1',
  credentials: fromEnv('AWS_US_')
};

const dbCredentials = {
  region: 'sa-east-1',
  connectionString: process.env.NEON_BR_URL
};
```

## Monitoramento Multi-Região

### Métricas Importantes
1. **Latência cross-region**
2. **Custos de transferência**
3. **Disponibilidade por região**

### Dashboard Sugerido
```javascript
// monitoring/metrics.js
export const metrics = {
  s3_latency: new Histogram('s3_operation_duration_ms'),
  db_latency: new Histogram('neon_query_duration_ms'),
  cross_region_transfers: new Counter('data_transfer_bytes'),
  region_errors: new Counter('errors_by_region')
};
```

## Disaster Recovery

### Estratégia de Backup
1. **S3**: Replicação para `sa-east-1` (opcional)
2. **Neon**: Backups automáticos + export diário

### Failover Plan
```yaml
# disaster-recovery.yaml
primary:
  s3: us-east-1
  db: sa-east-1

fallback:
  s3: sa-east-1  # Bucket de réplica
  db: us-east-1  # Neon standby (se configurado)
```

## Scripts de Teste

### Teste de Latência
```bash
#!/bin/bash
# test-latency.sh

echo "Testando latência S3 (US)..."
time aws s3 ls s3://egd-endoscopia-images/ --region us-east-1

echo "Testando latência Neon (BR)..."
time psql $NEON_BR_URL -c "SELECT 1"
```

### Teste de Transferência
```javascript
// test-transfer.js
async function testCrossRegionTransfer() {
  const start = Date.now();
  
  // Download do S3 (US)
  const image = await s3.getObject({
    Bucket: 'egd-endoscopia-images',
    Key: 'test/sample.jpg'
  });
  
  // Upload metadata para Neon (BR)
  await neon.query(
    'INSERT INTO test_transfers (size, duration) VALUES ($1, $2)',
    [image.ContentLength, Date.now() - start]
  );
  
  console.log(`Transferência completa em ${Date.now() - start}ms`);
}
```

## Checklist de Implementação

- [ ] Configurar Neon em São Paulo
- [ ] Testar conectividade cross-region
- [ ] Implementar retry logic para operações S3
- [ ] Configurar monitoramento de latência
- [ ] Estabelecer alertas de custo
- [ ] Documentar SLAs esperados
- [ ] Criar runbook para troubleshooting

## Conclusão

A arquitetura multi-região oferece benefícios de compliance e performance para usuários brasileiros, com custos adicionais gerenciáveis através de otimizações adequadas.