export const medgemmaConfigResource = {
  uri: "medgemma://config",
  name: "MedGemma Configuration",
  description: "Official MedGemma 4B model configuration and requirements for endoscopy project",
  mimeType: "application/json",
  handler: async () => {
    return {
      model: {
        name: "google/medgemma-4b-it",
        version: "4B",
        architecture: {
          type: "decoder-only Transformer",
          vision_encoder: "SigLIP",
          context_window: {
            input_tokens: 128000,
            output_tokens: 8000
          }
        },
        requirements: {
          vram: {
            inference_fp16: "16-20 GB",
            inference_int8: "8-10 GB",
            inference_int4: "4-6 GB",
            finetuning_qlora: "24-32 GB"
          },
          compute: {
            recommended_gpu: ["A100", "A6000", "RTX 4090", "RTX 3090"],
            minimum_gpu: "RTX 3080 (12GB)",
            tpu_support: "v3-8 or higher"
          }
        }
      },
      image_preprocessing: {
        target_size: {
          width: 896,
          height: 896
        },
        color_space: "RGB",
        normalization: "ImageNet standard",
        token_encoding: {
          tokens_per_image: 256,
          patch_size: 14
        },
        supported_formats: ["JPEG", "PNG", "BMP"],
        preprocessing_steps: [
          "Resize to 896x896 with padding if needed",
          "Convert to RGB if grayscale",
          "Apply ImageNet normalization",
          "Encode to 256 visual tokens"
        ]
      },
      inference_config: {
        temperature: 1.0,
        top_k: 64,
        top_p: 0.95,
        min_p: 0.0,
        repetition_penalty: 1.0,
        max_new_tokens: 8000,
        do_sample: true,
        seed: null
      },
      finetuning_config: {
        method: "QLoRA",
        quantization: {
          load_in_4bit: true,
          bnb_4bit_compute_dtype: "bfloat16",
          bnb_4bit_use_double_quant: true,
          bnb_4bit_quant_type: "nf4"
        },
        lora_config: {
          r: 16,
          lora_alpha: 32,
          lora_dropout: 0.05,
          target_modules: ["q_proj", "v_proj", "k_proj", "o_proj"],
          bias: "none",
          task_type: "CAUSAL_LM"
        },
        training_args: {
          learning_rate: 2e-4,
          lr_scheduler_type: "cosine",
          warmup_ratio: 0.1,
          num_train_epochs: 3,
          per_device_train_batch_size: 1,
          gradient_accumulation_steps: 16,
          gradient_checkpointing: true,
          fp16: false,
          bf16: true,
          optim: "paged_adamw_32bit",
          logging_steps: 10,
          save_strategy: "steps",
          save_steps: 100,
          evaluation_strategy: "steps",
          eval_steps: 100
        }
      },
      prompt_template: {
        format: "Gemma instruction format",
        structure: "<start_of_turn>user\\n{image}\\n{instruction}<end_of_turn>\\n<start_of_turn>model\\n",
        special_tokens: {
          bos_token: "<bos>",
          eos_token: "<eos>",
          pad_token: "<pad>",
          image_token: "<image>"
        },
        endoscopy_specific_instructions: [
          "Analyze this endoscopic image and identify any lesions or abnormalities.",
          "Describe the location, appearance, and potential clinical significance.",
          "Provide classification according to standard endoscopic criteria.",
          "Suggest any recommended follow-up or intervention."
        ]
      },
      safety_config: {
        content_filtering: {
          enabled: true,
          categories: ["child", "hate", "sexual", "violence", "dangerous", "medical_misuse"]
        },
        output_validation: {
          check_medical_accuracy: true,
          require_confidence_scores: true,
          flag_uncertain_predictions: true
        },
        bias_mitigation: {
          monitor_demographic_bias: true,
          balance_training_data: true,
          regular_fairness_audits: true
        }
      },
      deployment_options: {
        cloud_providers: {
          vertex_ai: {
            endpoint_type: "Custom Container",
            machine_type: "n1-standard-8",
            accelerator: "nvidia-tesla-a100",
            min_replicas: 1,
            max_replicas: 10
          },
          gcp_compute: {
            instance_type: "a2-highgpu-1g",
            boot_disk_size: "200GB",
            preemptible: false
          }
        },
        containerization: {
          base_image: "pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime",
          serving_framework: ["vLLM", "TGI", "FastAPI"],
          health_check_endpoint: "/health",
          prediction_endpoint: "/predict"
        }
      },
      compliance_requirements: {
        medical_device_classification: "Class II (FDA), Class IIa (CE)",
        data_requirements: {
          minimum_training_samples: 2000,
          validation_split: 0.1,
          test_split: 0.1,
          annotation_guidelines: "COCO format with medical metadata"
        },
        quality_metrics: {
          minimum_sensitivity: 0.90,
          minimum_specificity: 0.85,
          maximum_inference_time: "800ms",
          confidence_threshold: 0.7
        }
      },
      integration_notes: {
        api_format: "REST/gRPC",
        input_format: "Base64 encoded image + JSON metadata",
        output_format: {
          predictions: "Array of lesion objects",
          confidence_scores: "Float 0-1",
          bounding_boxes: "XYXY format",
          clinical_description: "Text string",
          recommended_action: "Enum: monitor/biopsy/urgent"
        }
      }
    };
  }
};