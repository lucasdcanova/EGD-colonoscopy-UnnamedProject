# Infraestrutura - Projeto EGD/Colonoscopia AI

## Arquitetura

- **Cloud Provider**: AWS
- **Database**: Neon PostgreSQL (Serverless)
- **Storage**: AWS S3 com criptografia KMS
- **Network**: VPC com subnets públicas e privadas

## Pré-requisitos

1. **AWS CLI** configurado com credenciais
2. **Terraform** >= 1.5.0
3. **Conta Neon** para PostgreSQL

## Deploy da Infraestrutura AWS

### 1. Configurar AWS CLI
```bash
aws configure
# Inserir: AWS Access Key ID, Secret Access Key, Region (us-east-1)
```

### 2. Inicializar Terraform
```bash
cd infrastructure/terraform
terraform init
```

### 3. Criar arquivo de variáveis
```bash
cp terraform.tfvars.example terraform.tfvars
# Editar conforme necessário
```

### 4. Planejar deploy
```bash
terraform plan
```

### 5. Aplicar infraestrutura
```bash
terraform apply
```

### 6. Salvar outputs
```bash
terraform output > ../outputs.txt
```

## Configuração do Neon PostgreSQL

1. Seguir instruções em `database/neon-setup.md`
2. Criar projeto no [console.neon.tech](https://console.neon.tech)
3. Executar scripts SQL para criar tabelas
4. Salvar connection string no arquivo `.env`

## Estrutura de Pastas

```
infrastructure/
├── terraform/          # Configurações Terraform AWS
│   ├── main.tf        # Recursos principais
│   └── terraform.tfvars.example
├── database/          # Configurações do banco
│   └── neon-setup.md  # Setup do Neon
└── README.md          # Este arquivo
```

## Recursos Criados

### AWS
- VPC com CIDR 10.0.0.0/16
- Subnet pública (10.0.1.0/24)
- Subnet privada (10.0.2.0/24)
- Internet Gateway
- Security Groups
- S3 Bucket `egd-endoscopia-images` com:
  - Versionamento habilitado
  - Criptografia KMS
  - Lifecycle policies
  - Bloqueio de acesso público
- KMS Key para criptografia

### Neon
- Database PostgreSQL 15
- Autoscaling compute (0.25-4 vCPUs)
- Backups automáticos (7 dias)
- Point-in-time recovery

## Custos Estimados

### AWS (mensal)
- VPC: $0 (recursos básicos)
- S3: ~$23/TB armazenado + $0.09/GB transferência
- KMS: $1/mês por chave + $0.03/10k requisições

### Neon (mensal)
- Plano Pro: $19/mês base
- Compute: $0.10/hora por vCPU
- Storage: $0.15/GB

## Segurança

- Todas as comunicações criptografadas (TLS)
- S3 com criptografia KMS em repouso
- Neon com SSL obrigatório
- VPC isolada com security groups restritivos
- Sem acesso público aos buckets S3

## Monitoramento

- AWS CloudWatch para métricas S3
- Neon Dashboard para métricas do banco
- Configurar alertas para:
  - Uso excessivo de storage
  - Falhas de upload
  - Performance do banco

## Troubleshooting

### Erro de permissões AWS
```bash
# Verificar credenciais
aws sts get-caller-identity

# Verificar permissões necessárias
# IAM Policy: AmazonS3FullAccess, AmazonVPCFullAccess, AWSKeyManagementServicePowerUser
```

### Erro de conexão Neon
```bash
# Testar conexão
psql $DATABASE_URL -c "SELECT version();"

# Verificar SSL
psql $DATABASE_URL -c "SHOW ssl;"
```

## Próximos Passos

1. ✅ Deploy da infraestrutura AWS
2. ✅ Configurar Neon PostgreSQL
3. Implementar scripts de upload para S3
4. Configurar CI/CD
5. Implementar monitoramento