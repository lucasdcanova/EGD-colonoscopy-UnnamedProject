export const projectGuidelinesResource = {
  uri: "project://guidelines",
  name: "Project Guidelines",
  description: "Development guidelines and best practices for the EGD/Colonoscopy AI project",
  mimeType: "application/json",
  handler: async () => {
    return {
      project_overview: {
        name: "Sistema de Identificação de Lesões em Endoscopia Digestiva",
        description: "Full-stack AI medical project using MedGemma 4B for lesion detection in endoscopy images",
        phases: {
          "0": "Organization & Initial Infrastructure",
          "1": "Data Collection & Preprocessing",
          "2": "Initial Finetuning (PoC)",
          "3": "Evaluation & Clinical Validation",
          "4": "Iteration & Security",
          "5": "MVP Cloud Deployment",
          "6": "Scaling & Certification"
        },
        current_phase: 0
      },
      
      development_standards: {
        code_style: {
          backend: {
            language: "TypeScript",
            framework: "Express",
            orm: "Drizzle ORM",
            database: "PostgreSQL 15",
            style_guide: "ESLint + Prettier",
            naming_convention: "camelCase for variables, PascalCase for types/classes"
          },
          frontend: {
            framework: "React + TypeScript",
            state_management: "Context API or Zustand",
            styling: "CSS Modules or Styled Components",
            component_structure: "Functional components with hooks"
          },
          ai_pipeline: {
            framework: "PyTorch / Hugging Face Transformers",
            finetuning: "LoRA/QLoRA",
            deployment: "FastAPI or vLLM",
            monitoring: "Weights & Biases"
          }
        },
        
        git_workflow: {
          branch_strategy: "GitFlow",
          main_branch: "main",
          development_branch: "develop",
          feature_prefix: "feature/",
          bugfix_prefix: "bugfix/",
          release_prefix: "release/",
          commit_format: "conventional commits (type: description)"
        }
      },
      
      data_guidelines: {
        image_requirements: {
          format: "JPEG or PNG",
          dimensions: "896x896 pixels",
          color_space: "RGB",
          quality: "High quality, minimal compression artifacts",
          metadata: "Must be anonymized (no EXIF with PHI)"
        },
        
        annotation_format: {
          type: "COCO format with medical extensions",
          required_fields: [
            "image_id",
            "category_id (lesion type)",
            "bbox (x, y, width, height)",
            "segmentation (optional polygon)",
            "attributes.severity",
            "attributes.confidence",
            "attributes.location"
          ],
          lesion_categories: [
            "polyp",
            "ulcer",
            "erosion",
            "bleeding",
            "tumor",
            "inflammation",
            "normal"
          ]
        },
        
        data_split: {
          training: 0.8,
          validation: 0.1,
          test: 0.1,
          stratification: "By lesion type and severity"
        }
      },
      
      security_privacy: {
        compliance: {
          regulations: ["LGPD (Brazil)", "HIPAA (USA)"],
          certifications_target: ["ANVISA", "CE Mark", "FDA 510(k)"]
        },
        
        data_handling: {
          phi_removal: "All images must be anonymized before storage",
          encryption: "AES-256 for data at rest, TLS 1.3 for data in transit",
          access_control: "Role-based with audit logging",
          retention_policy: "7 years for medical data, 30 days for logs"
        },
        
        model_security: {
          input_validation: "Sanitize all inputs before inference",
          output_filtering: "Check for PHI leakage in predictions",
          adversarial_testing: "Regular testing against adversarial inputs",
          model_versioning: "Immutable model artifacts with checksums"
        }
      },
      
      infrastructure: {
        gcp_resources: {
          project_id: "egd-colonscopy-ai",
          region: "us-central1",
          services: [
            "Cloud Storage (images)",
            "Cloud SQL (PostgreSQL)",
            "Vertex AI (training/serving)",
            "Cloud Run (API)",
            "Secret Manager",
            "Cloud Logging"
          ]
        },
        
        naming_conventions: {
          buckets: "egd-{environment}-{purpose}",
          databases: "egd-{environment}-db",
          services: "egd-{service}-{environment}",
          environments: ["dev", "staging", "prod"]
        },
        
        monitoring: {
          metrics: [
            "Inference latency (p50, p95, p99)",
            "Model accuracy metrics",
            "API error rates",
            "Resource utilization"
          ],
          alerting: {
            latency_threshold: "800ms (p95)",
            error_rate_threshold: "1%",
            accuracy_degradation: "5% drop from baseline"
          }
        }
      },
      
      quality_assurance: {
        testing_requirements: {
          unit_tests: "Minimum 80% coverage",
          integration_tests: "All API endpoints",
          model_tests: "Validation on holdout test set",
          clinical_validation: "Double-blind review by 2+ specialists"
        },
        
        ci_cd_pipeline: {
          stages: [
            "Lint and type check",
            "Unit tests",
            "Build artifacts",
            "Integration tests",
            "Security scan",
            "Deploy to staging",
            "Smoke tests",
            "Deploy to production"
          ],
          deployment_strategy: "Blue-green with automatic rollback"
        },
        
        documentation: {
          required: [
            "API documentation (OpenAPI)",
            "Model card with performance metrics",
            "Clinical validation report",
            "User manual",
            "Deployment guide"
          ],
          format: "Markdown with diagrams",
          location: "docs/ directory in repository"
        }
      },
      
      clinical_guidelines: {
        validation_protocol: {
          reviewers: "Minimum 2 board-certified gastroenterologists",
          review_type: "Blinded comparison with ground truth",
          metrics: [
            "Sensitivity by lesion type",
            "Specificity",
            "Inter-rater agreement (Cohen's kappa)",
            "Clinical relevance of predictions"
          ]
        },
        
        safety_protocols: {
          disclaimer: "AI assistance only - final diagnosis by physician",
          confidence_display: "Always show confidence scores",
          uncertain_cases: "Flag predictions below 70% confidence",
          edge_cases: "Maintain log for physician review"
        },
        
        continuous_improvement: {
          feedback_loop: "Physician corrections fed back to training",
          performance_monitoring: "Monthly accuracy reports",
          dataset_expansion: "Quarterly data collection campaigns",
          model_updates: "Retraining every 6 months or 10k new images"
        }
      },
      
      communication_protocols: {
        stakeholder_updates: {
          frequency: "Bi-weekly sprint reviews",
          format: "Demo + metrics dashboard",
          attendees: ["Development team", "Clinical advisors", "Product owner"]
        },
        
        issue_escalation: {
          severity_levels: ["Critical", "High", "Medium", "Low"],
          critical_response_time: "1 hour",
          high_response_time: "4 hours",
          escalation_path: "Developer -> Tech Lead -> Product Owner -> Medical Director"
        },
        
        documentation_updates: {
          trigger: "Any architectural change or new feature",
          review_required: "Tech lead approval",
          distribution: "All team members via version control"
        }
      }
    };
  }
};