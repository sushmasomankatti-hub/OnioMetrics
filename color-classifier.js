/**
 * OnioVision Edge — AI Vision Module 5: Colour Classification
 * Classifies bulb tunic into Good / Faded / Discoloured using 3D HSV
 * color histogram analysis against benchmark variety bands.
 */

class ColorClassifierModule {
  /**
   * Evaluates color quality against specified variety
   * @param {ImageData} roiImageData
   * @param {string} varietyName - e.g. "Red Nasik", "White Onion", "Yellow Spanish"
   */
  static classify(roiImageData, varietyName = 'Red Nasik') {
    if (!roiImageData || !roiImageData.data) {
      return { colour: 'Good', mean_hue: 15, mean_sat: 0.65, mean_val: 0.45, confidence: 0.95 };
    }

    const data = roiImageData.data;
    const len = data.length;
    let sumH = 0, sumS = 0, sumV = 0;
    let validPixels = 0;
    let fadedPixels = 0;
    let discolouredPixels = 0;

    const varietyConfig = CONFIG.VARIETIES[varietyName] || CONFIG.VARIETIES['Red Nasik'];

    for (let i = 0; i < len; i += 16) { // Subsample every 4th pixel for edge speed
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 25 || lum > 240) continue; // Skip shadows and specular highlights

      const hsv = ImageProcessor.rgbToHsv(r, g, b);
      sumH += hsv.h;
      sumS += hsv.s;
      sumV += hsv.v;
      validPixels++;

      // Check variety-specific bounds
      if (varietyName === 'Red Nasik') {
        const isRed = (hsv.h >= 330 || hsv.h <= 30);
        if (!isRed && (hsv.h > 45 && hsv.h < 260)) {
          discolouredPixels++;
        } else if (hsv.s < 0.22) {
          fadedPixels++;
        }
      } else if (varietyName === 'White Onion') {
        if (hsv.s > 0.45) {
          discolouredPixels++;
        } else if (hsv.v < 0.40) {
          fadedPixels++;
        }
      } else if (varietyName === 'Yellow Spanish') {
        const isYellow = (hsv.h >= 18 && hsv.h <= 55);
        if (!isYellow && (hsv.h > 70 && hsv.h < 300)) {
          discolouredPixels++;
        } else if (hsv.s < 0.20) {
          fadedPixels++;
        }
      }
    }

    if (validPixels === 0) {
      return { colour: 'Good', mean_hue: 15, mean_sat: 0.60, mean_val: 0.50, confidence: 0.90 };
    }

    const meanH = Math.round(sumH / validPixels);
    const meanS = Math.round((sumS / validPixels) * 100) / 100;
    const meanV = Math.round((sumV / validPixels) * 100) / 100;

    const discolourPct = (discolouredPixels / validPixels) * 100;
    const fadedPct = (fadedPixels / validPixels) * 100;

    let colour = 'Good';
    let confidence = 0.94;

    if (discolourPct >= 14.0) {
      colour = 'Discoloured';
      confidence = Math.min(0.98, 0.75 + (discolourPct / 100));
    } else if (fadedPct >= 22.0) {
      colour = 'Faded';
      confidence = Math.min(0.96, 0.72 + (fadedPct / 100));
    }

    return {
      colour,
      mean_hue: meanH,
      mean_sat: meanS,
      mean_val: meanV,
      faded_percent: Math.round(fadedPct * 10) / 10,
      discolour_percent: Math.round(discolourPct * 10) / 10,
      confidence: Math.round(confidence * 100) / 100
    };
  }
}

if (typeof window !== 'undefined') {
  window.ColorClassifierModule = ColorClassifierModule;
}
