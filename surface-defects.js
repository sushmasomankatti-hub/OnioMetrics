/**
 * OnioVision Edge — AI Vision Module 7: Surface / External Defects
 * Quantifies mechanical bruises, cuts, tunic cracks, and skin peeling as % of surface area.
 */

class SurfaceDefectsModule {
  /**
   * Scans bulb surface for textural discontinuities, cuts, cracks, and blemishes
   * @param {ImageData} roiImageData
   */
  static analyze(roiImageData) {
    if (!roiImageData || !roiImageData.data) {
      return { defect_percent: 0.0, cuts_detected: false, blemish_count: 0 };
    }

    const data = roiImageData.data;
    const rw = roiImageData.width;
    const rh = roiImageData.height;
    let bulbPixels = 0;
    let defectPixels = 0;
    let highGradientCuts = 0;

    // Edge gradient laplacian check for sharp knife cuts / cracks
    for (let y = 2; y < rh - 2; y += 2) {
      for (let x = 2; x < rw - 2; x += 2) {
        const idx = (y * rw + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < 20 || lum > 245) continue;
        bulbPixels++;

        // Neighborhood luminance gradient (detects fissures and peeling seams)
        const idxRight = (y * rw + (x + 2)) * 4;
        const lumRight = 0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2];
        const gradX = Math.abs(lum - lumRight);

        const idxDown = ((y + 2) * rw + x) * 4;
        const lumDown = 0.299 * data[idxDown] + 0.587 * data[idxDown + 1] + 0.114 * data[idxDown + 2];
        const gradY = Math.abs(lum - lumDown);

        // High contrast fissure/crack line
        if (gradX > 45 || gradY > 45) {
          defectPixels++;
          if (gradX > 65 || gradY > 65) highGradientCuts++;
        }
        // Sunscald or bruised dark blemish patches
        else if (lum < 48 && (r > 60 || g > 40)) {
          defectPixels++;
        }
      }
    }

    if (bulbPixels === 0) {
      return { defect_percent: 0.0, cuts_detected: false, blemish_count: 0 };
    }

    // Normal baseline natural skin texture noise subtraction (~1.2%)
    const rawDefectRatio = (defectPixels / bulbPixels) * 100;
    const defectPercent = Math.max(0, Math.round((rawDefectRatio - 1.0) * 10) / 10);
    const cutsDetected = highGradientCuts > 15;

    return {
      defect_percent: defectPercent,
      cuts_detected: cutsDetected,
      blemish_intensity: defectPercent > 10.0 ? 'High' : (defectPercent > 4.0 ? 'Moderate' : 'Low')
    };
  }
}

if (typeof window !== 'undefined') {
  window.SurfaceDefectsModule = SurfaceDefectsModule;
}
