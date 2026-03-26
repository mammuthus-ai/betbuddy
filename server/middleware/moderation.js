import vision from '@google-cloud/vision';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = join(__dirname, '..', 'google-vision-key.json');

let client;
try {
  client = new vision.ImageAnnotatorClient({ keyFilename: keyPath });
} catch (err) {
  console.warn('Google Vision not configured — avatar moderation disabled:', err.message);
}

// SafeSearch likelihood levels (higher = more likely inappropriate)
const LIKELIHOOD = {
  UNKNOWN: 0,
  VERY_UNLIKELY: 1,
  UNLIKELY: 2,
  POSSIBLE: 3,
  LIKELY: 4,
  VERY_LIKELY: 5,
};

/**
 * Check if an image URL contains inappropriate content.
 * Returns { safe: boolean, reason?: string }
 */
export async function moderateImage(imageUrl) {
  if (!client) {
    // If Vision isn't configured, allow by default (dev mode)
    return { safe: true };
  }

  try {
    const [result] = await client.safeSearchDetection(imageUrl);
    const detection = result.safeSearchAnnotation;

    if (!detection) {
      return { safe: true };
    }

    const checks = [
      { category: 'adult', level: detection.adult, threshold: 3 },
      { category: 'violence', level: detection.violence, threshold: 4 },
      { category: 'racy', level: detection.racy, threshold: 4 },
    ];

    for (const check of checks) {
      const score = LIKELIHOOD[check.level] || 0;
      if (score >= check.threshold) {
        return {
          safe: false,
          reason: `Image flagged as ${check.category} (${check.level})`,
        };
      }
    }

    return { safe: true };
  } catch (err) {
    console.error('Vision API error:', err.message);
    // On API error, allow the image (fail open for now)
    return { safe: true };
  }
}

/**
 * Check a local file for inappropriate content.
 */
export async function moderateFile(filePath) {
  if (!client) {
    return { safe: true };
  }

  try {
    const [result] = await client.safeSearchDetection(filePath);
    const detection = result.safeSearchAnnotation;

    if (!detection) {
      return { safe: true };
    }

    const checks = [
      { category: 'adult', level: detection.adult, threshold: 3 },
      { category: 'violence', level: detection.violence, threshold: 4 },
      { category: 'racy', level: detection.racy, threshold: 4 },
    ];

    for (const check of checks) {
      const score = LIKELIHOOD[check.level] || 0;
      if (score >= check.threshold) {
        return {
          safe: false,
          reason: `Image flagged as ${check.category} (${check.level})`,
        };
      }
    }

    return { safe: true };
  } catch (err) {
    console.error('Vision API error:', err.message);
    return { safe: true };
  }
}
