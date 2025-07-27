# Roadmap – Sistema de Identificação de Lesões Endoscópicas

> Documento vivo: atualize ao final de cada sprint.

---
## Visão Macro
| Fase | Objetivo | Duração estimada |
|------|----------|------------------|
| 0 | Organização & Infra inicial | Semanas 0-1 |
| 1 | Coleta & Pré-processamento | Semanas 1-4 |
| 2 | Finetuning Inicial (PoC) | Semanas 5-6 |
| 3 | Avaliação & Validação Clínica | Semana 7 |
| 4 | Iteração & Segurança | Semanas 8-9 |
| 5 | Deploy MVP Cloud | Semana 10 |
| 6 | Escalonamento & Certificação | Mês 3-6 |

---
## Fase 0 • Organização & Infra (Semanas 0-1)
- [ ] Criar **conta/projeto AWS** dedicado.
- [ ] Configurar **VPC** e security groups na AWS.
- [ ] Provisionar **S3** bucket `egd-endoscopia-images` (versionamento + criptografia KMS).
- [ ] Criar **Neon PostgreSQL** + ativar backups automáticos.
- [ ] Estruturar repositório:
  ```text
  data/
    raw/
    processed/
  notebooks/
  src/
    model/
  docs/
  mcp/
    server/
    docs/
  ```
- [ ] **Implementar MCP (Model Context Protocol)**:
  - [x] Criar servidor MCP em TypeScript
  - [x] Implementar tool de validação de imagens endoscópicas
  - [x] Implementar tool de verificação de compliance LGPD/HIPAA
  - [x] Implementar tool de anonimização de dados
  - [x] Criar resources com configurações do MedGemma
  - [x] Documentar uso do MCP em `mcp/docs/MCP_USAGE.md`
- [ ] Definir política de anonimização (remover PHI / EXIF).

## Fase 1 • Coleta & Pré-processamento (Semanas 1-4)
- [ ] Coletar **≥2 000** imagens endoscópicas rotuladas.
- [ ] Normalizar para **896×896**, RGB.
- [ ] Gerar anotações COCO + mensagens Gemma (JSONL).
- [ ] Criar script `upload.ts` → envia para GCS e insere metadados no Postgres.
- [ ] Split: train 80 %, val 10 %, test 10 %.

## Fase 2 • Finetuning Inicial (Semanas 5-6)
- [ ] Configurar Colab Enterprise / Vertex Workbench (A100).
- [ ] Instalar libs `transformers>=4.51`, `bitsandbytes`, `peft`, `wandb`.
- [ ] Baixar modelo `google/medgemma-4b-it`.
- [ ] Rodar **QLoRA** (4-bit NF4, r=16, α=32, dropout=0.05).
- [ ] Logar métricas em W&B; salvar adaptadores em `gs://egd-models/medgemma-ft-v0.1`.

## Fase 3 • Avaliação (Semana 7)
- [ ] Avaliar em set de teste: AUC, F1, BLEU/ROUGE.
- [ ] Avaliação clínica dupla cega (2 endoscopistas).
- [ ] Documentar resultados em `docs/eval_v0.1.md`.

## Fase 4 • Iteração & Segurança (Semanas 8-9)
- [ ] Análise de viés (idade, sexo, colon vs. estômago).
- [ ] Red-teaming Políticas MedGemma (child, hate, etc.).
- [ ] Pós-processamento: masking PHI, siglas.
- [ ] Refino incremental (`epoch_count=1`, `lr_mult=0.8`).

## Fase 5 • Deploy MVP (Semana 10)
- [ ] Dockerizar FastAPI + MedGemma + adaptador.
- [ ] Deploy **Cloud Run (GPU)** ou **Vertex AI Endpoint**.
- [ ] Endpoint `/predict` (imagem) → JSON {label, bbox, descrição}.
- [ ] React UI: upload + overlay bounding boxes.

## Fase 6 • Escalonamento & Certificação (Mês 3-6)
- [ ] Expandir dataset a **10 000+** imagens.
- [ ] Migrar servindo para **vLLM** ou **TGI** em Vertex.
- [ ] Automatizar CI/CD (GitHub Actions → Cloud Run).
- [ ] Iniciar processo ANVISA / CE marking.

---
## Métricas-chave
| Métrica | Target MVP |
|---------|------------|
| Sensibilidade geral | ≥ 0.90 |
| Especificidade | ≥ 0.85 |
| Latência (GPU) | < 800 ms |
| Violações de conteúdo | 0 |

---
## Atualizações
* **v0.1 (YY-MM-DD)** — Criação do roadmap inicial.
* **v0.2 (2025-07-27)** — Implementação do MCP (Model Context Protocol) na Fase 0 para garantir que agentes de IA sigam os protocolos corretos do projeto. 