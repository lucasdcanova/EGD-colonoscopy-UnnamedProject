#!/usr/bin/env python3
"""
Script para criar recursos AWS sem Terraform
Requer: pip install boto3
"""

import boto3
import json
import sys
from botocore.exceptions import ClientError

# Configurações
REGION = 'us-east-1'
PROJECT_NAME = 'egd-colonoscopy-ai'
BUCKET_NAME = 'egd-endoscopia-images'

def create_s3_bucket(s3_client):
    """Criar bucket S3 com versionamento e criptografia"""
    try:
        # Criar bucket
        if REGION == 'us-east-1':
            s3_client.create_bucket(Bucket=BUCKET_NAME)
        else:
            s3_client.create_bucket(
                Bucket=BUCKET_NAME,
                CreateBucketConfiguration={'LocationConstraint': REGION}
            )
        print(f"✅ Bucket {BUCKET_NAME} criado")
        
        # Habilitar versionamento
        s3_client.put_bucket_versioning(
            Bucket=BUCKET_NAME,
            VersioningConfiguration={'Status': 'Enabled'}
        )
        print("✅ Versionamento habilitado")
        
        # Bloquear acesso público
        s3_client.put_public_access_block(
            Bucket=BUCKET_NAME,
            PublicAccessBlockConfiguration={
                'BlockPublicAcls': True,
                'IgnorePublicAcls': True,
                'BlockPublicPolicy': True,
                'RestrictPublicBuckets': True
            }
        )
        print("✅ Acesso público bloqueado")
        
        # Configurar criptografia
        s3_client.put_bucket_encryption(
            Bucket=BUCKET_NAME,
            ServerSideEncryptionConfiguration={
                'Rules': [{
                    'ApplyServerSideEncryptionByDefault': {
                        'SSEAlgorithm': 'AES256'
                    }
                }]
            }
        )
        print("✅ Criptografia configurada")
        
        # Configurar lifecycle
        s3_client.put_bucket_lifecycle_configuration(
            Bucket=BUCKET_NAME,
            LifecycleConfiguration={
                'Rules': [
                    {
                        'ID': 'archive-old-images',
                        'Status': 'Enabled',
                        'Prefix': 'processed/',
                        'Transitions': [
                            {
                                'Days': 90,
                                'StorageClass': 'STANDARD_IA'
                            },
                            {
                                'Days': 180,
                                'StorageClass': 'GLACIER'
                            }
                        ]
                    },
                    {
                        'ID': 'delete-temp-files',
                        'Status': 'Enabled',
                        'Prefix': 'temp/',
                        'Expiration': {'Days': 7}
                    }
                ]
            }
        )
        print("✅ Lifecycle policies configuradas")
        
        # Adicionar tags
        s3_client.put_bucket_tagging(
            Bucket=BUCKET_NAME,
            Tagging={
                'TagSet': [
                    {'Key': 'Project', 'Value': PROJECT_NAME},
                    {'Key': 'Environment', 'Value': 'production'},
                    {'Key': 'Purpose', 'Value': 'Medical imaging storage'}
                ]
            }
        )
        print("✅ Tags adicionadas")
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'BucketAlreadyExists':
            print(f"❌ Bucket {BUCKET_NAME} já existe. Tente outro nome.")
        else:
            print(f"❌ Erro ao criar bucket: {e}")
        return False
    
    return True

def create_iam_policy(iam_client):
    """Criar política IAM para acesso ao S3"""
    policy_name = f"{PROJECT_NAME}-s3-access"
    
    policy_document = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:DeleteObject",
                    "s3:ListBucket"
                ],
                "Resource": [
                    f"arn:aws:s3:::{BUCKET_NAME}",
                    f"arn:aws:s3:::{BUCKET_NAME}/*"
                ]
            }
        ]
    }
    
    try:
        response = iam_client.create_policy(
            PolicyName=policy_name,
            PolicyDocument=json.dumps(policy_document),
            Description=f"S3 access policy for {PROJECT_NAME}",
            Tags=[
                {'Key': 'Project', 'Value': PROJECT_NAME},
            ]
        )
        print(f"✅ Política IAM {policy_name} criada")
        return response['Policy']['Arn']
    except ClientError as e:
        if e.response['Error']['Code'] == 'EntityAlreadyExists':
            print(f"⚠️  Política {policy_name} já existe")
            # Buscar ARN da política existente
            account_id = boto3.client('sts').get_caller_identity()['Account']
            return f"arn:aws:iam::{account_id}:policy/{policy_name}"
        else:
            print(f"❌ Erro ao criar política IAM: {e}")
            return None

def create_vpc_resources(ec2_client):
    """Criar VPC e recursos de rede"""
    try:
        # Criar VPC
        vpc_response = ec2_client.create_vpc(
            CidrBlock='10.0.0.0/16',
            TagSpecifications=[{
                'ResourceType': 'vpc',
                'Tags': [
                    {'Key': 'Name', 'Value': f"{PROJECT_NAME}-vpc"},
                    {'Key': 'Project', 'Value': PROJECT_NAME}
                ]
            }]
        )
        vpc_id = vpc_response['Vpc']['VpcId']
        print(f"✅ VPC criada: {vpc_id}")
        
        # Habilitar DNS
        ec2_client.modify_vpc_attribute(VpcId=vpc_id, EnableDnsSupport={'Value': True})
        ec2_client.modify_vpc_attribute(VpcId=vpc_id, EnableDnsHostnames={'Value': True})
        
        # Criar Internet Gateway
        igw_response = ec2_client.create_internet_gateway(
            TagSpecifications=[{
                'ResourceType': 'internet-gateway',
                'Tags': [
                    {'Key': 'Name', 'Value': f"{PROJECT_NAME}-igw"},
                    {'Key': 'Project', 'Value': PROJECT_NAME}
                ]
            }]
        )
        igw_id = igw_response['InternetGateway']['InternetGatewayId']
        ec2_client.attach_internet_gateway(InternetGatewayId=igw_id, VpcId=vpc_id)
        print(f"✅ Internet Gateway criado: {igw_id}")
        
        # Criar subnet pública
        public_subnet = ec2_client.create_subnet(
            VpcId=vpc_id,
            CidrBlock='10.0.1.0/24',
            AvailabilityZone=f"{REGION}a",
            TagSpecifications=[{
                'ResourceType': 'subnet',
                'Tags': [
                    {'Key': 'Name', 'Value': f"{PROJECT_NAME}-public-subnet"},
                    {'Key': 'Project', 'Value': PROJECT_NAME}
                ]
            }]
        )
        public_subnet_id = public_subnet['Subnet']['SubnetId']
        print(f"✅ Subnet pública criada: {public_subnet_id}")
        
        # Criar Security Group
        sg_response = ec2_client.create_security_group(
            GroupName=f"{PROJECT_NAME}-sg",
            Description='Security group for EGD Colonoscopy AI',
            VpcId=vpc_id,
            TagSpecifications=[{
                'ResourceType': 'security-group',
                'Tags': [
                    {'Key': 'Name', 'Value': f"{PROJECT_NAME}-sg"},
                    {'Key': 'Project', 'Value': PROJECT_NAME}
                ]
            }]
        )
        sg_id = sg_response['GroupId']
        
        # Adicionar regras ao Security Group
        ec2_client.authorize_security_group_ingress(
            GroupId=sg_id,
            IpPermissions=[
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 443,
                    'ToPort': 443,
                    'IpRanges': [{'CidrIp': '0.0.0.0/0', 'Description': 'HTTPS'}]
                },
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 80,
                    'ToPort': 80,
                    'IpRanges': [{'CidrIp': '0.0.0.0/0', 'Description': 'HTTP'}]
                }
            ]
        )
        print(f"✅ Security Group criado: {sg_id}")
        
        return {
            'vpc_id': vpc_id,
            'igw_id': igw_id,
            'public_subnet_id': public_subnet_id,
            'security_group_id': sg_id
        }
        
    except ClientError as e:
        print(f"❌ Erro ao criar recursos VPC: {e}")
        return None

def main():
    """Função principal"""
    print(f"🚀 Iniciando criação de recursos AWS para {PROJECT_NAME}")
    print(f"📍 Região: {REGION}")
    
    # Verificar credenciais
    try:
        sts = boto3.client('sts')
        account = sts.get_caller_identity()
        print(f"✅ Usando conta AWS: {account['Account']}")
    except Exception as e:
        print("❌ Erro: AWS CLI não configurado.")
        print("Execute 'aws configure' primeiro.")
        sys.exit(1)
    
    # Criar clientes
    s3_client = boto3.client('s3', region_name=REGION)
    iam_client = boto3.client('iam', region_name=REGION)
    ec2_client = boto3.client('ec2', region_name=REGION)
    
    # Criar recursos
    print("\n📦 Criando bucket S3...")
    if not create_s3_bucket(s3_client):
        print("⚠️  Continuando sem S3...")
    
    print("\n🔐 Criando política IAM...")
    policy_arn = create_iam_policy(iam_client)
    
    print("\n🌐 Criando recursos VPC...")
    vpc_resources = create_vpc_resources(ec2_client)
    
    # Salvar outputs
    outputs = {
        'region': REGION,
        'bucket_name': BUCKET_NAME,
        'iam_policy_arn': policy_arn,
        'vpc_resources': vpc_resources
    }
    
    with open('infrastructure/aws-outputs.json', 'w') as f:
        json.dump(outputs, f, indent=2)
    
    print("\n✅ Recursos AWS criados com sucesso!")
    print(f"📄 Outputs salvos em: infrastructure/aws-outputs.json")
    print("\n🎯 Próximos passos:")
    print("1. Configurar Neon PostgreSQL em console.neon.tech")
    print("2. Criar arquivo .env com as variáveis de ambiente")
    print("3. Testar conexões com S3 e Neon")

if __name__ == "__main__":
    main()