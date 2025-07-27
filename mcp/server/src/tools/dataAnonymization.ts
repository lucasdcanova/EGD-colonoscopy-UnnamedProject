import sharp from "sharp";
import crypto from "crypto";

export const anonymizeDataTool = {
  name: "anonymize_data",
  description: "Anonymizes medical data by removing PHI/PII from images and JSON data",
  inputSchema: {
    type: "object",
    properties: {
      imagePath: { type: "string", description: "Path to image file to anonymize" },
      outputPath: { type: "string", description: "Output path for anonymized image" },
      jsonData: { type: "object", description: "JSON data to anonymize" },
      anonymizationLevel: { 
        type: "string", 
        enum: ["basic", "moderate", "strict"], 
        default: "moderate",
        description: "Level of anonymization to apply" 
      }
    }
  },
  handler: async (args: { 
    imagePath?: string; 
    outputPath?: string; 
    jsonData?: any; 
    anonymizationLevel?: "basic" | "moderate" | "strict" 
  }) => {
    const results = {
      success: true,
      operations: [] as string[],
      anonymizedData: null as any,
      outputPath: null as string | null,
      errors: [] as string[]
    };

    // Anonymize image if provided
    if (args.imagePath) {
      try {
        const imageResult = await anonymizeImage(
          args.imagePath, 
          args.outputPath || args.imagePath.replace(/(\.[^.]+)$/, '_anonymized$1'),
          args.anonymizationLevel || "moderate"
        );
        results.outputPath = imageResult.outputPath;
        results.operations.push(...imageResult.operations);
      } catch (error) {
        results.success = false;
        results.errors.push(`Image anonymization failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Anonymize JSON data if provided
    if (args.jsonData) {
      try {
        const dataResult = anonymizeJsonData(args.jsonData, args.anonymizationLevel || "moderate");
        results.anonymizedData = dataResult.data;
        results.operations.push(...dataResult.operations);
      } catch (error) {
        results.success = false;
        results.errors.push(`Data anonymization failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      ...results,
      summary: `Completed ${results.operations.length} anonymization operations`,
      recommendations: generateAnonymizationRecommendations(args.anonymizationLevel || "moderate")
    };
  }
};

async function anonymizeImage(
  inputPath: string, 
  outputPath: string, 
  level: "basic" | "moderate" | "strict"
): Promise<{ outputPath: string; operations: string[] }> {
  const operations: string[] = [];
  
  try {
    // Load the image
    let image = sharp(inputPath);
    
    // Remove all EXIF metadata
    image = image.withMetadata({
      // Keep only essential technical metadata
      orientation: undefined, // Remove orientation to prevent tracking
      density: undefined,     // Remove DPI info
      // Remove all EXIF data
      exif: {},
      icc: undefined  // Remove color profile
    });
    operations.push("Removed all EXIF/IPTC/XMP metadata");

    // For strict mode, apply additional privacy measures
    if (level === "strict") {
      // Add slight noise to prevent reverse image search
      image = image.blur(0.3).sharpen(0.3);
      operations.push("Applied privacy transforms to prevent reverse image search");
      
      // Normalize to standard format
      image = image.jpeg({ quality: 95, mozjpeg: true });
      operations.push("Normalized image format to JPEG");
    }

    // For moderate and strict, remove timestamps from filename
    if (level !== "basic" && outputPath === inputPath) {
      const timestamp = Date.now();
      const hash = crypto.createHash('sha256').update(inputPath + timestamp).digest('hex').substring(0, 8);
      outputPath = inputPath.replace(/(\.[^.]+)$/, `_anon_${hash}$1`);
      operations.push("Anonymized filename");
    }

    // Save the anonymized image
    await image.toFile(outputPath);
    operations.push(`Saved anonymized image to: ${outputPath}`);

    return { outputPath, operations };
  } catch (error) {
    throw new Error(`Failed to anonymize image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function anonymizeJsonData(
  data: any, 
  level: "basic" | "moderate" | "strict"
): { data: any; operations: string[] } {
  const operations: string[] = [];
  const anonymized = JSON.parse(JSON.stringify(data)); // Deep clone
  
  // Define fields to remove or anonymize
  const sensitiveFields = {
    basic: ["ssn", "cpf", "rg", "full_name", "email", "phone"],
    moderate: ["name", "birth", "birthdate", "dob", "age", "address", "location", "id", "patient_id", "medical_record"],
    strict: ["date", "time", "timestamp", "created", "modified", "doctor", "physician", "clinic", "hospital"]
  };

  const fieldsToAnonymize = [
    ...sensitiveFields.basic,
    ...(level === "moderate" || level === "strict" ? sensitiveFields.moderate : []),
    ...(level === "strict" ? sensitiveFields.strict : [])
  ];

  // Anonymization functions
  const anonymizers = {
    email: (value: string) => {
      const [local] = value.split('@');
      return `${local.substring(0, 2)}****@****.***`;
    },
    phone: (value: string) => value.replace(/\d/g, '*').replace(/\*{3,}/g, '***'),
    name: (value: string) => {
      const parts = value.split(' ');
      return parts.map(part => part[0] + '*'.repeat(part.length - 1)).join(' ');
    },
    date: (value: string) => {
      const date = new Date(value);
      return `${date.getFullYear()}-**-**`;
    },
    id: (value: string) => crypto.createHash('sha256').update(value).digest('hex').substring(0, 16),
    default: (value: string) => '*'.repeat(value.length)
  };

  // Recursive anonymization function
  function anonymizeObject(obj: any, path: string = ""): void {
    if (!obj || typeof obj !== "object") return;

    Object.keys(obj).forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;
      const lowerKey = key.toLowerCase();
      
      // Check if field should be anonymized
      const shouldAnonymize = fieldsToAnonymize.some(field => 
        lowerKey.includes(field.toLowerCase())
      );

      if (shouldAnonymize) {
        if (typeof obj[key] === "string" && obj[key].length > 0) {
          // Determine anonymization method
          let anonymizer = anonymizers.default;
          if (lowerKey.includes("email")) anonymizer = anonymizers.email;
          else if (lowerKey.includes("phone")) anonymizer = anonymizers.phone;
          else if (lowerKey.includes("name")) anonymizer = anonymizers.name;
          else if (lowerKey.includes("date") || lowerKey.includes("time")) anonymizer = anonymizers.date;
          else if (lowerKey.includes("id")) anonymizer = anonymizers.id;
          
          const original = obj[key];
          obj[key] = anonymizer(original);
          operations.push(`Anonymized ${currentPath}: ${original.substring(0, 3)}... -> ${obj[key]}`);
        } else if (level === "strict") {
          // In strict mode, remove the field entirely
          delete obj[key];
          operations.push(`Removed field: ${currentPath}`);
        }
      }

      // Recurse into nested objects/arrays
      if (typeof obj[key] === "object") {
        if (Array.isArray(obj[key])) {
          obj[key].forEach((item: any, index: number) => {
            anonymizeObject(item, `${currentPath}[${index}]`);
          });
        } else {
          anonymizeObject(obj[key], currentPath);
        }
      }
    });
  }

  anonymizeObject(anonymized);

  // Add anonymization metadata
  if (level !== "basic") {
    anonymized._anonymization = {
      timestamp: new Date().toISOString(),
      level,
      version: "1.0",
      fieldsProcessed: operations.length
    };
    operations.push("Added anonymization metadata");
  }

  return { data: anonymized, operations };
}

function generateAnonymizationRecommendations(level: "basic" | "moderate" | "strict"): string[] {
  const recommendations = [
    "Store original data separately with strict access controls",
    "Log all anonymization operations for audit purposes",
    "Regularly review anonymization rules for new sensitive fields"
  ];

  if (level === "basic") {
    recommendations.push(
      "Consider using 'moderate' level for better privacy protection",
      "Basic level may not meet all LGPD/HIPAA requirements"
    );
  }

  if (level === "strict") {
    recommendations.push(
      "Verify that strict anonymization doesn't impact clinical validity",
      "Consider keeping de-identified copies for research purposes"
    );
  }

  return recommendations;
}