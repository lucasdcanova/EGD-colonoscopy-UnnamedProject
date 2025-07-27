import { z } from "@modelcontextprotocol/sdk/types.js";
import exifr from "exifr";

interface ComplianceCheck {
  field: string;
  status: "pass" | "fail" | "warning";
  message: string;
  regulation: "LGPD" | "HIPAA" | "Both";
}

export const checkComplianceTool = {
  name: "check_compliance",
  description: "Checks data compliance with LGPD and HIPAA regulations for medical imaging",
  inputSchema: z.object({
    imagePath: z.string().optional().describe("Path to image file to check for PHI/metadata"),
    jsonData: z.object({}).optional().describe("JSON data to check for sensitive information"),
    checkType: z.enum(["image", "data", "both"]).default("both").describe("Type of compliance check to perform")
  }),
  handler: async (args: { imagePath?: string; jsonData?: any; checkType?: string }) => {
    const checks: ComplianceCheck[] = [];
    let overallCompliant = true;

    // Image compliance checks
    if ((args.checkType === "image" || args.checkType === "both") && args.imagePath) {
      const imageChecks = await checkImageCompliance(args.imagePath);
      checks.push(...imageChecks);
    }

    // Data compliance checks
    if ((args.checkType === "data" || args.checkType === "both") && args.jsonData) {
      const dataChecks = checkDataCompliance(args.jsonData);
      checks.push(...dataChecks);
    }

    // Determine overall compliance
    overallCompliant = !checks.some(check => check.status === "fail");
    const hasWarnings = checks.some(check => check.status === "warning");

    return {
      compliant: overallCompliant,
      hasWarnings,
      checks,
      summary: {
        totalChecks: checks.length,
        passed: checks.filter(c => c.status === "pass").length,
        failed: checks.filter(c => c.status === "fail").length,
        warnings: checks.filter(c => c.status === "warning").length
      },
      recommendations: generateRecommendations(checks),
      requiredActions: checks
        .filter(c => c.status === "fail")
        .map(c => c.message)
    };
  }
};

async function checkImageCompliance(imagePath: string): Promise<ComplianceCheck[]> {
  const checks: ComplianceCheck[] = [];

  try {
    // Extract EXIF data
    const exifData = await exifr.parse(imagePath, {
      // Include all possible tags that might contain PHI
      pick: ["all"]
    });

    // Check for GPS data (HIPAA/LGPD violation)
    if (exifData?.GPS || exifData?.GPSLatitude || exifData?.GPSLongitude) {
      checks.push({
        field: "GPS Data",
        status: "fail",
        message: "Image contains GPS location data that must be removed",
        regulation: "Both"
      });
    } else {
      checks.push({
        field: "GPS Data",
        status: "pass",
        message: "No GPS data found",
        regulation: "Both"
      });
    }

    // Check for camera/device identifiers
    const deviceFields = ["Make", "Model", "SerialNumber", "LensSerialNumber", "BodySerialNumber"];
    const foundDeviceInfo = deviceFields.filter(field => exifData?.[field]);
    
    if (foundDeviceInfo.length > 0) {
      checks.push({
        field: "Device Information",
        status: "warning",
        message: `Found device identifiers: ${foundDeviceInfo.join(", ")}. Consider removing for enhanced privacy.`,
        regulation: "Both"
      });
    }

    // Check for timestamps
    const dateFields = ["DateTimeOriginal", "CreateDate", "ModifyDate"];
    const foundDates = dateFields.filter(field => exifData?.[field]);
    
    if (foundDates.length > 0) {
      checks.push({
        field: "Timestamps",
        status: "warning",
        message: "Image contains timestamps. Ensure they don't compromise patient privacy when combined with other data.",
        regulation: "HIPAA"
      });
    }

    // Check for custom EXIF fields that might contain PHI
    const suspiciousFields = Object.keys(exifData || {}).filter(key => {
      const suspicious = ["patient", "name", "id", "birth", "ssn", "cpf", "rg", "medical", "record"];
      return suspicious.some(term => key.toLowerCase().includes(term));
    });

    if (suspiciousFields.length > 0) {
      checks.push({
        field: "Suspicious EXIF Fields",
        status: "fail",
        message: `Found potentially sensitive EXIF fields: ${suspiciousFields.join(", ")}`,
        regulation: "Both"
      });
    }

    // Check for comments/descriptions
    const commentFields = ["Comment", "UserComment", "ImageDescription", "Description"];
    const foundComments = commentFields.filter(field => exifData?.[field]);
    
    if (foundComments.length > 0) {
      checks.push({
        field: "Comments/Descriptions",
        status: "warning",
        message: "Image contains comments/descriptions. Review to ensure no PHI is included.",
        regulation: "Both"
      });
    }

  } catch (error) {
    checks.push({
      field: "EXIF Processing",
      status: "warning",
      message: `Could not fully analyze EXIF data: ${error instanceof Error ? error.message : String(error)}`,
      regulation: "Both"
    });
  }

  return checks;
}

function checkDataCompliance(data: any): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  
  // Define sensitive field patterns
  const sensitivePatterns = [
    { pattern: /\b\d{3}-?\d{2}-?\d{4}\b/, name: "SSN", regulation: "HIPAA" as const },
    { pattern: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, name: "CPF", regulation: "LGPD" as const },
    { pattern: /\b\d{2}\.\d{3}\.\d{3}-[0-9X]\b/, name: "RG", regulation: "LGPD" as const },
    { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, name: "Email", regulation: "Both" as const },
    { pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/, name: "Phone", regulation: "Both" as const }
  ];

  // Recursively check object for sensitive data
  function checkObject(obj: any, path: string = ""): void {
    if (!obj || typeof obj !== "object") return;

    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check field names
      const suspiciousFieldNames = ["patient", "name", "birth", "ssn", "cpf", "rg", "id", "identification"];
      if (suspiciousFieldNames.some(term => key.toLowerCase().includes(term))) {
        checks.push({
          field: currentPath,
          status: "warning",
          message: `Field name suggests it may contain sensitive data: ${key}`,
          regulation: "Both"
        });
      }

      // Check string values for patterns
      if (typeof value === "string") {
        sensitivePatterns.forEach(({ pattern, name, regulation }) => {
          if (pattern.test(value)) {
            checks.push({
              field: currentPath,
              status: "fail",
              message: `Found potential ${name} in field ${currentPath}`,
              regulation
            });
          }
        });

        // Check for names (simple heuristic)
        if (value.length > 3 && /^[A-Z][a-z]+ [A-Z][a-z]+/.test(value)) {
          checks.push({
            field: currentPath,
            status: "warning",
            message: `Field may contain a person's name: ${currentPath}`,
            regulation: "Both"
          });
        }
      }

      // Recurse into nested objects/arrays
      if (typeof value === "object") {
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            checkObject(item, `${currentPath}[${index}]`);
          });
        } else {
          checkObject(value, currentPath);
        }
      }
    });
  }

  checkObject(data);

  // Add general data structure checks
  if (!data.consentDate && !data.consentVersion) {
    checks.push({
      field: "Consent Tracking",
      status: "warning",
      message: "No consent tracking fields found. Consider adding consentDate and consentVersion.",
      regulation: "LGPD"
    });
  }

  if (!data.dataRetentionPolicy) {
    checks.push({
      field: "Data Retention",
      status: "warning",
      message: "No data retention policy specified. LGPD requires clear retention policies.",
      regulation: "LGPD"
    });
  }

  return checks;
}

function generateRecommendations(checks: ComplianceCheck[]): string[] {
  const recommendations: string[] = [];
  
  const hasImageFailures = checks.some(c => c.status === "fail" && ["GPS Data", "Suspicious EXIF Fields"].includes(c.field));
  if (hasImageFailures) {
    recommendations.push("Use the anonymize_data tool to remove all EXIF metadata from images");
  }

  const hasDataFailures = checks.some(c => c.status === "fail" && !["GPS Data", "Suspicious EXIF Fields"].includes(c.field));
  if (hasDataFailures) {
    recommendations.push("Review and remove or encrypt all identified PHI/sensitive data fields");
  }

  const needsConsent = checks.some(c => c.field === "Consent Tracking" && c.status === "warning");
  if (needsConsent) {
    recommendations.push("Implement consent tracking with version control and timestamps");
  }

  if (recommendations.length === 0 && checks.every(c => c.status === "pass")) {
    recommendations.push("Data appears to be compliant. Continue with regular security audits.");
  }

  return recommendations;
}