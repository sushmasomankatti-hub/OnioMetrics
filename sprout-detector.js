/**
 * OnioVision Edge — AI Vision Module 1: Sprouting Detection
 * Identifies green vegetative shoots emerging from the apical neck node.
 * Outputs sprout% coverage and pass/fail flag.
 */

class SproutDetectorModule {
  /**
   * Scans apical neck zone for chlorophyll vegetative emergence
   * @param {ImageData} roiImageData
   * @param {number} pixelsPerMm
   */
  static detect(roiImageData, pixelsPerMm = 3.20) {
    if (!roiImageData || !roiImageData.data) {
      return { sprout_detected: false, sprout_percent: 0.0, shoot_length_mm: 0.0, pass: true };
    }

    const data = roiImageData.data;
    const rw = roiImageData.width;
    const rh = roiImageData.height;
    
    // The apical neck is primarily localized in the top 35% or periphery of the bulb
    const apicalMaxY = Math.floor(rh * 0.40);
    let bulbPixels = 0;
    let sproutPixels = 0;
    let maxShootY = rh;
    let minShootY = 0;

    for (let y = 0; y < rh; y += 2) {
      for (let x = 0; x < rw; x += 2) {
        const idx = (y * rw + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < 20 || lum > 245) continue;
        bulbPixels++;

        // Chlorophyll green detection: Green is dominant, Hue between 35° and 95°
        if (g > r * 1.15 && g > b * 1.15 && g > 40) {
          const hsv = ImageProcessor.rgbToHsv(r, g, b);
          if (hsv.h >= 35 && hsv.h <= 95 && hsv.s >= 0.25) {
            sproutPixels++;
            if (y < minShootY || minShootY === 0) minShootY = y;
            if (y > maxShootY) maxShootY = y;
          }
        }
      }
    }

    if (bulbPixels === 0) {
      return { sprout_detected: false, sprout_percent: 0.0, shoot_length_mm: 0.0, pass: true };
    }

    const sproutPercent = Math.round(((sproutPixels * 1.0) / bulbPixels) * 100 * 10) / 10;
    const shootLengthPx = Math.max(0, maxShootY - minShootY);
    const shootLengthMm = Math.round((shootLengthPx / pixelsPerMm) * 10) / 10;

    // Threshold: > 0.8% sprout coverage or shoot length > 3.0mm flags vegetative sprouting
    const sproutDetected = sproutPercent >= 0.8 || shootLengthMm >= 3.0;
    const pass = !sproutDetected;

    return {
      sprout_detected: sproutDetected,
      sprout_percent: sproutPercent,
      shoot_length_mm: shootLengthMm,
      pass,
      status: sproutDetected ? 'FAIL (Vegetative Sprouting)' : 'PASS (Dormant Neck)'
    };
  }
}

if (typeof window !== 'undefined') {
  window.SproutDetectorModule = SproutDetectorModule;
}
