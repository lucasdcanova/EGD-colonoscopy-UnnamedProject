export const infrastructureConfigResource = {
  uri: "infrastructure://config",
  name: "Infrastructure Configuration",
  description: "AWS and Neon database configuration for the EGD/Colonoscopy AI project",
  mimeType: "application/json",
  handler: async () => {
    return {
      aws: {
        region: "us-east-1",
        s3: {
          bucket: "egd-endoscopia-images",
          arn: "arn:aws:s3:::egd-endoscopia-images",
          versioning: true,
          encryption: "AES256",
          lifecycle_policies: {
            archive_old_images: {
              prefix: "processed/",
              transitions: [
                { days: 90, storage_class: "STANDARD_IA" },
                { days: 180, storage_class: "GLACIER" }
              ]
            },
            delete_temp_files: {
              prefix: "temp/",
              expiration_days: 7
            }
          }
        },
        vpc: {
          id: "vpc-0b7b42c02cbb31cf8",
          cidr: "10.0.0.0/16",
          subnets: {
            public: {
              id: "subnet-094ffa5ff8c97e03f",
              cidr: "10.0.1.0/24",
              availability_zone: "us-east-1a"
            },
            private: {
              id: "subnet-0bd581b3dd5df6f7b",
              cidr: "10.0.2.0/24",
              availability_zone: "us-east-1b"
            }
          }
        },
        security_group: {
          id: "sg-042fea1cf4a78ad82",
          name: "egd-colonoscopy-ai-api-sg",
          ingress_rules: [
            { port: 443, protocol: "tcp", description: "HTTPS" },
            { port: 80, protocol: "tcp", description: "HTTP" }
          ]
        },
        iam: {
          policy_arn: "arn:aws:iam::623677485906:policy/egd-colonoscopy-ai-s3-access",
          permissions: [
            "s3:GetObject",
            "s3:PutObject",
            "s3:DeleteObject",
            "s3:ListBucket"
          ]
        }
      },
      neon: {
        region: "aws-sa-east-1",
        location: "São Paulo, Brazil",
        database: {
          engine: "PostgreSQL",
          version: "17",
          compute: {
            min_size: "0.25 vCPU",
            max_size: "4 vCPU",
            autoscaling: true
          },
          storage: {
            initial_size: "10 GB",
            autoscaling: true
          },
          backup: {
            point_in_time_recovery: "7 days",
            automatic_backups: true
          }
        },
        tables: [
          {
            name: "endoscopy_images",
            description: "Main table for storing endoscopic image metadata",
            indexes: ["image_hash", "image_type", "processed_date"]
          },
          {
            name: "annotations",
            description: "Stores human and AI annotations for images",
            indexes: ["image_id"]
          },
          {
            name: "model_predictions",
            description: "Stores AI model predictions and confidence scores",
            indexes: ["image_id"]
          },
          {
            name: "processing_logs",
            description: "Logs for tracking image processing pipeline",
            indexes: ["image_id", "status"]
          }
        ]
      },
      cross_region_architecture: {
        description: "Multi-region setup for compliance and performance",
        data_flow: {
          images: "Stored in AWS S3 (US)",
          metadata: "Stored in Neon PostgreSQL (Brazil)",
          rationale: "LGPD compliance - sensitive patient data in Brazil"
        },
        expected_latency: {
          s3_from_brazil: "120-150ms",
          neon_from_brazil: "10-30ms",
          cross_region_transfer: "~200ms round-trip"
        },
        cost_optimization: {
          strategies: [
            "Use S3 lifecycle policies for archival",
            "Batch process images to reduce API calls",
            "Cache frequently accessed data locally",
            "Use CloudFront CDN for image delivery"
          ]
        }
      },
      anonymization_policy: {
        compliance: ["LGPD", "HIPAA"],
        data_to_remove: [
          "Patient names and IDs",
          "Birth dates (keep only age ranges)",
          "DICOM/EXIF metadata",
          "GPS locations",
          "Equipment serial numbers"
        ],
        anonymization_levels: {
          basic: "Remove direct identifiers only",
          moderate: "Remove direct and indirect identifiers (default)",
          strict: "Remove all possible identifiers + apply noise"
        },
        implementation: {
          mcp_tools: [
            "check-compliance",
            "anonymize-data"
          ],
          retention_policy: {
            original_data: "6 months after anonymization",
            anonymized_data: "5 years",
            access_logs: "1 year"
          }
        }
      },
      deployment_readiness: {
        infrastructure: {
          aws: "✅ Deployed",
          neon: "✅ Configured",
          mcp: "✅ Implemented"
        },
        next_steps: [
          "Implement image upload API",
          "Create preprocessing pipeline",
          "Integrate MedGemma model",
          "Build visualization interface"
        ]
      }
    };
  }
};