# Configuração Inicial AWS - Projeto EGD/Colonoscopia AI

## 1. Criar Conta AWS (se ainda não tem)
1. Acesse [aws.amazon.com](https://aws.amazon.com)
2. Clique em "Create an AWS Account"
3. Siga o processo de cadastro (precisará de cartão de crédito)

## 2. Acessar o Console AWS
1. Faça login em [console.aws.amazon.com](https://console.aws.amazon.com)
2. Selecione a região **US East (N. Virginia) us-east-1** no canto superior direito

## 3. Criar Usuário IAM para o Projeto

### No Console AWS:
1. Busque por **IAM** na barra de pesquisa
2. No menu lateral, clique em **Users** → **Create user**
3. Nome do usuário: `egd-colonoscopy-deploy`
4. Marque: **Provide user access to the AWS Management Console** (opcional)
5. Clique **Next**

### Adicionar Permissões:
1. Selecione **Attach policies directly**
2. Marque as seguintes políticas:
   - `AmazonS3FullAccess`
   - `AmazonVPCFullAccess` 
   - `IAMFullAccess`
   - `AWSKeyManagementServicePowerUser`
3. Clique **Next** → **Create user**

### Criar Access Keys:
1. Clique no usuário criado
2. Aba **Security credentials**
3. Em **Access keys**, clique **Create access key**
4. Selecione **Command Line Interface (CLI)**
5. Marque a confirmação → **Next**
6. Tag (opcional): `terraform-deploy`
7. **Create access key**
8. **IMPORTANTE**: Salve as credenciais:
   - Access key ID
   - Secret access key
   - Clique **Download .csv file** para backup

## 4. Configurar AWS CLI Localmente

No terminal, execute:
```bash
aws configure
```

Insira:
- **AWS Access Key ID**: [colar do passo anterior]
- **AWS Secret Access Key**: [colar do passo anterior]
- **Default region name**: us-east-1
- **Default output format**: json

Teste a configuração:
```bash
aws sts get-caller-identity
```

Deve retornar algo como:
```json
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/egd-colonoscopy-deploy"
}
```

## 5. Verificar Limites de Serviço (Opcional)

### S3:
- Por padrão: 100 buckets por conta
- Nosso uso: 1 bucket

### VPC:
- Por padrão: 5 VPCs por região
- Nosso uso: 1 VPC

### Se precisar aumentar limites:
1. Console AWS → **Service Quotas**
2. Buscar o serviço
3. Request quota increase

## 6. Configurar Billing Alerts (Recomendado)

1. Console AWS → **Billing Dashboard**
2. **Billing preferences**
3. Marcar:
   - Receive PDF Invoice By Email
   - Receive Free Tier Usage Alerts
   - Receive Billing Alerts
4. **Save preferences**

### Criar Budget Alert:
1. **Budgets** → **Create budget**
2. **Monthly cost budget**
3. Budget amount: $50 (ajuste conforme necessário)
4. Configure alertas por email

## 7. Estimativa de Custos

### Custos Mensais Estimados:
- **S3 Storage**: 
  - Primeiros 50 TB: $0.023/GB
  - 100 GB = ~$2.30/mês
- **S3 Requests**: 
  - PUT: $0.005/1000 requests
  - GET: $0.0004/1000 requests
- **Data Transfer**: 
  - Entrada: Grátis
  - Saída: Primeiros 100 GB/mês grátis
- **VPC**: Grátis (recursos básicos)
- **KMS**: $1/mês por chave

**Total estimado**: ~$5-10/mês para uso inicial

## 8. Próximos Passos

✅ Conta AWS criada e configurada
✅ Usuário IAM com permissões necessárias
✅ AWS CLI configurado localmente
➡️ Executar o script Terraform para criar recursos

Agora você pode voltar e executar:
```bash
./infrastructure/terraform/deploy.sh
```

## Segurança - Boas Práticas

1. **Nunca compartilhe** suas credenciais AWS
2. **Rotacione** access keys regularmente (a cada 90 dias)
3. **Use MFA** (Multi-Factor Authentication) na conta root
4. **Monitore** uso e custos regularmente
5. **Delete** recursos não utilizados

## Troubleshooting

### "Invalid credentials"
- Verifique se copiou corretamente as credenciais
- Confirme a região (us-east-1)

### "Access Denied"
- Verifique se o usuário tem todas as políticas necessárias
- Aguarde alguns minutos (propagação de permissões)

### "Limit Exceeded"
- Verifique Service Quotas
- Solicite aumento se necessário