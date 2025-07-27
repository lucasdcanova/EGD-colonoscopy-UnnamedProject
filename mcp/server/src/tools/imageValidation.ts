import sharp from "sharp";

const EXPECTED_WIDTH = 896;
const EXPECTED_HEIGHT = 896;
const EXPECTED_CHANNELS = 3; // RGB

export const validateEndoscopyImageTool = {
  name: "validate_endoscopy_image",
  description: "Validates that an image meets the requirements for MedGemma processing (896x896 RGB format)",
  inputSchema: {
    type: "object",
    properties: {
      imagePath: { type: "string", description: "Path to the image file to validate" },
      checkContent: { type: "boolean", description: "Also check if image appears to be endoscopic (optional)" }
    },
    required: ["imagePath"]
  },
  handler: async (args: { imagePath: string; checkContent?: boolean }) => {
    try {
      // Load image metadata
      const metadata = await sharp(args.imagePath).metadata();
      
      const validation = {
        isValid: true,
        errors: [] as string[],
        warnings: [] as string[],
        metadata: {
          width: metadata.width,
          height: metadata.height,
          channels: metadata.channels,
          format: metadata.format,
          space: metadata.space,
          hasAlpha: metadata.hasAlpha,
          density: metadata.density
        }
      };

      // Check dimensions
      if (metadata.width !== EXPECTED_WIDTH || metadata.height !== EXPECTED_HEIGHT) {
        validation.isValid = false;
        validation.errors.push(
          `Invalid dimensions: ${metadata.width}x${metadata.height}. Expected: ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}`
        );
      }

      // Check color channels
      if (metadata.channels !== EXPECTED_CHANNELS) {
        validation.isValid = false;
        validation.errors.push(
          `Invalid number of channels: ${metadata.channels}. Expected: ${EXPECTED_CHANNELS} (RGB)`
        );
      }

      // Check color space
      if (metadata.space && metadata.space !== "srgb") {
        validation.warnings.push(
          `Color space is ${metadata.space}. Consider converting to sRGB for consistency.`
        );
      }

      // Check format warnings
      const recommendedFormats = ["jpeg", "jpg", "png"];
      if (metadata.format && !recommendedFormats.includes(metadata.format)) {
        validation.warnings.push(
          `Format ${metadata.format} is not recommended. Consider using JPEG or PNG.`
        );
      }

      // Optional content check
      if (args.checkContent) {
        // Basic heuristic: endoscopic images tend to have circular/oval regions
        // and specific color characteristics (pinkish/reddish tones)
        const stats = await sharp(args.imagePath)
          .stats();
        
        // Check if the image has typical endoscopic color distribution
        const redDominance = stats.channels[0].mean > stats.channels[1].mean && 
                           stats.channels[0].mean > stats.channels[2].mean;
        
        if (!redDominance) {
          validation.warnings.push(
            "Image color profile doesn't match typical endoscopic images (expected red channel dominance)"
          );
        }

        // Check for very dark borders (typical in endoscopic images)
        const borderCheck = await checkDarkBorders(args.imagePath);
        if (!borderCheck) {
          validation.warnings.push(
            "Image doesn't appear to have the dark circular borders typical of endoscopic images"
          );
        }
      }

      return {
        ...validation,
        recommendation: validation.isValid 
          ? "Image is ready for MedGemma processing"
          : "Image needs preprocessing before MedGemma processing",
        preprocessingSteps: validation.isValid ? [] : [
          "Resize to 896x896 maintaining aspect ratio with padding if needed",
          "Convert to RGB color space",
          "Save in JPEG or PNG format"
        ]
      };

    } catch (error) {
      return {
        isValid: false,
        error: `Failed to validate image: ${error instanceof Error ? error.message : String(error)}`,
        errors: [`Image validation failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }
};

async function checkDarkBorders(imagePath: string, borderThickness = 50, darkThreshold = 30): Promise<boolean> {
  try {
    const image = sharp(imagePath);
    const { width = 0, height = 0 } = await image.metadata();
    
    // Extract border regions
    const borders = await Promise.all([
      // Top border
      image.clone().extract({ left: 0, top: 0, width, height: borderThickness }).stats(),
      // Bottom border  
      image.clone().extract({ left: 0, top: height - borderThickness, width, height: borderThickness }).stats(),
      // Left border
      image.clone().extract({ left: 0, top: 0, width: borderThickness, height }).stats(),
      // Right border
      image.clone().extract({ left: width - borderThickness, top: 0, width: borderThickness, height }).stats()
    ]);

    // Check if all borders are dark
    const darkBorders = borders.filter(border => {
      const avgBrightness = border.channels.reduce((sum, ch) => sum + ch.mean, 0) / border.channels.length;
      return avgBrightness < darkThreshold;
    });

    // At least 3 out of 4 borders should be dark
    return darkBorders.length >= 3;
  } catch {
    return false;
  }
}