# Sistema de Identificação de Lesões em Endoscopia Digestiva

## Visão Geral
Projeto full-stack de IA médica que emprega o modelo **MedGemma 4B** (multimodal texto-imagem) para detecção e classificação de lesões em imagens de endoscopia digestiva alta (EDA) e baixa (colonoscopia).

O repositório será evoluído seguindo as boas práticas recomendadas pela Google DeepMind para modelos Gemma/MedGemma e documentação oficial do projeto.

---
## Objetivos
1. **Finetuning** do MedGemma 4B usando imagens endoscópicas proprietárias.
2. Construir pipeline de inferência que:
   * Receba vídeo ou frames em tempo real.
   * Gere descrição clínica, localização, severidade e recomendações.
3. Garantir compliance com LGPD/HIPAA, viés mínimo e validação clínica.

---
## Stack Tecnológica
* **Backend**: TypeScript, Express, Drizzle ORM, PostgreSQL.
* **Frontend**: React + TypeScript.
* **Infra IA**: PyTorch / Hugging Face Transformers, LoRA/QLoRA para ajuste fino; opção JAX/TPU via Colab Enterprise ou Vertex AI.
* **Deploy**: Docker + Kubernetes (opcional); suporte GPU.

---
## Premissas do MedGemma 4B
* Arquitetura: decoder-only Transformer + encoder SigLIP.
* Contexto: 128 k tokens de entrada, 8 k tokens de saída.
* Imagens: redimensionar para **896×896** e codificar em 256 tokens.
* Requer ~16-20 GB VRAM para inferência BF16 / FP16.
* Configuração oficial de inferência:
  ```
  temperature = 1.0
  top_k       = 64
  top_p       = 0.95
  min_p       = 0.0
  repetition_penalty = 1.0
  ```

---
## Roadmap Resumido
Consulte o arquivo `ROADMAP.md` para a versão completa.

---
## Licença
Projeto distribuído sob licença MIT. Ver arquivo `LICENSE` (a ser criado).
