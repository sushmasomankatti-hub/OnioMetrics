/**
 * OnioVision Edge — AI Vision Module 2: Rot & Decay Detection
 * Detects bacterial soft rot, watery scale breakdown, and necrotic decay patches.
 */

class RotDetectorModule {
  /**
   * Scans bulb surface for soft spots, water soaking, and necrotic decay
   * @param {ImageData} roiImageData
   */
  static detect(roiImageData) {
    if (!roiImageData || !roiImageData.data) {
      return { rot_detected: false, rot_percent: 0.0, severity: 'None', moisture_leakage: false };
    }

    const data = roiImageData.data;
    const rw = roiImageData.width;
    const rh = roiImageData.height;
    let bulbPixels = 0;
    let rotPixels = 0;
    let highMoistureGlares = 0;

    for (let y = 0; y < rh; y += 2) {
      for (let x = 0; x < rw; x += 2) {
        const idx = (y * rw + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < 15 || lum > 250) continue;
        bulbPixels++;

        // Water-soaked or necrotic rot signature:
        // Dark brown / greyish water-soaked tissue (low sat, low lum)
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;

        // Bacterial soft rot: mushy brown-grey translucent scales
        if (lum < 55 && sat < 0.35 && r > 20) {
          rotPixels++;
        }
        // Specular moisture sheen (watery leakage on tunic)
        else if (lum > 220 && sat < 0.15) {
          highMoistureGlares++;
        }
      }
    }

    if (bulbPixels === 0) {
      return { rot_detected: false, rot_percent: 0.0, severity: 'None', moisture_leakage: false };
    }

    const rotPercent = Math.round(((rotPixels * 1.0) / bulbPixels) * 100 * 10) / 10;
    const moistureLeakage = highMoistureGlares > 25 && rotPercent > 1.5;

    let rotDetected = false;
    let severity = 'None';

    if (rotPercent >= 5.0 || (rotPercent >= 2.5 && moistureLeakage)) {
      rotDetected = true;
      severity = rotPercent > 12.0 ? 'Severe (Discard)' : 'Moderate';
    } else if (rotPercent >= 1.5) {
      rotDetected = true;
      severity = 'Mild (Superficial)';
    }

    return {
      rot_detected: rotDetected,
      rot_percent: rotPercent,
      severity,
      moisture_leakage: moistureLeakage,
      status: rotDetected ? `Soft Rot Detected (${severity})` : 'Clean'
    };
  }
}

if (typeof window !== 'undefined') {
  window.RotDetectorModule = RotDetectorModule;
}
