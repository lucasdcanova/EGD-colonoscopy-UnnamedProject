# Guia de Setup - Infraestrutura EGD/Colonoscopia AI

## 1. Instalar Ferramentas (se necessário)

### AWS CLI
```bash
# macOS
brew install awscli

# Ou baixar de: https://aws.amazon.com/cli/
```

### Terraform
```bash
# macOS
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Ou baixar de: https://www.terraform.io/downloads
```

## 2. Configurar AWS CLI

```bash
aws configure
```

Inserir:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: us-east-1
- Default output format: json

## 3. Deploy da Infraestrutura AWS

```bash
# Navegar para o diretório terraform
cd infrastructure/terraform

# Inicializar Terraform
terraform init

# Criar arquivo de variáveis
cp terraform.tfvars.example terraform.tfvars

# Visualizar o que será criado
terraform plan

# Aplicar a infraestrutura
terraform apply
# Digite 'yes' quando solicitado

# Salvar outputs importantes
terraform output > ../aws-outputs.txt
```

## 4. Configurar Neon PostgreSQL

### No Console Neon (console.neon.tech):

1. **Criar novo projeto**:
   - Nome: `egd-colonoscopy-ai`
   - Região: `AWS us-east-1`
   - Postgres version: `15`

2. **Configurar o projeto**:
   - Compute: Autoscaling (0.25-4 vCPUs)
   - Ativar Point-in-time recovery

3. **Copiar connection string**:
   - Formato: `postgresql://user:password@endpoint.neon.tech/database?sslmode=require`

4. **Criar as tabelas**:
   - Abrir SQL Editor no console Neon
   - Copiar e executar o SQL de `infrastructure/database/neon-setup.md`

## 5. Criar arquivo .env

```bash
# Na raiz do projeto
cat > .env << EOF
# AWS
AWS_REGION=us-east-1
AWS_S3_BUCKET=egd-endoscopia-images

# Neon Database
DATABASE_URL=postgresql://[seu-usuario]:[sua-senha]@[seu-endpoint].neon.tech/[seu-database]?sslmode=require

# Aplicação
NODE_ENV=development
PORT=3000
EOF
```

## 6. Testar Conexões

### Testar S3
```bash
# Listar buckets
aws s3 ls

# Testar upload
echo "test" > test.txt
aws s3 cp test.txt s3://egd-endoscopia-images/test/
aws s3 ls s3://egd-endoscopia-images/test/
rm test.txt
```

### Testar Neon
```bash
# Se tiver psql instalado
psql "$DATABASE_URL" -c "SELECT version();"

# Ou criar um script Node.js de teste
node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query('SELECT NOW()'))
  .then(res => console.log('Conectado ao Neon:', res.rows[0]))
  .catch(err => console.error('Erro:', err))
  .finally(() => client.end());
"
```

## 7. Verificar Recursos Criados

### AWS Console
1. VPC: Verificar em VPC Dashboard
2. S3: Verificar bucket `egd-endoscopia-images`
3. KMS: Verificar chave de criptografia
4. IAM: Verificar política `egd-colonoscopy-ai-s3-access`

### Neon Console
1. Database criado e online
2. Tabelas criadas corretamente
3. Backups configurados

## Próximos Passos

✅ Infraestrutura AWS provisionada
✅ Neon PostgreSQL configurado
➡️ Implementar script de upload para S3
➡️ Criar API para processar imagens
➡️ Integrar com MedGemma

## Troubleshooting

### Erro: "The bucket name 'egd-endoscopia-images' is already taken"
O nome do bucket S3 deve ser único globalmente. Edite `terraform.tfvars` e adicione um sufixo único:
```hcl
bucket_suffix = "seu-identificador-unico"
```

### Erro de permissões AWS
Verifique se sua conta AWS tem as permissões necessárias:
- AmazonS3FullAccess
- AmazonVPCFullAccess
- AWSKeyManagementServicePowerUser

### Erro de conexão Neon
- Verifique se copiou a connection string corretamente
- Certifique-se de que SSL está habilitado
- Verifique se o IP está na allowlist (se configurado)