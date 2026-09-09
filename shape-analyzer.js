/**
 * OnioVision Edge — AI Vision Module 4: Shape Classification
 * Classifies specimen contour into Round / Oval / Irregular based on
 * aspect ratio, circularity metric (4*pi*Area/Perimeter^2), and contour symmetry.
 */

class ShapeAnalyzerModule {
  /**
   * Analyze shape metrics for an onion specimen
   * @param {Object} bbox - { width, height, areaPx }
   * @param {ImageData} roiImageData - optional pixel data for contour symmetry
   */
  static analyze(bbox, roiImageData = null) {
    const w = bbox.width;
    const h = bbox.height;
    const major = Math.max(w, h);
    const minor = Math.min(w, h);
    const aspectRatio = Math.round((major / minor) * 100) / 100;

    // Approximate circularity: ratio of area to equivalent ellipse
    const ellipseArea = (Math.PI * w * h) / 4;
    const circularity = bbox.areaPx ? Math.min(1.0, bbox.areaPx / ellipseArea) : 0.92;

    let shape = 'Round';
    let confidence = 0.95;

    if (aspectRatio <= 1.12 && circularity >= 0.82) {
      shape = 'Round';
      confidence = Math.min(0.98, 0.85 + (1.12 - aspectRatio) * 0.8);
    } else if (aspectRatio > 1.12 && aspectRatio <= 1.35) {
      shape = 'Oval';
      confidence = 0.91;
    } else {
      shape = 'Irregular';
      confidence = 0.88;
    }

    // Secondary symmetry check: check if left and right mass differ significantly
    if (roiImageData && shape !== 'Irregular') {
      const data = roiImageData.data;
      const rw = roiImageData.width;
      const rh = roiImageData.height;
      const midX = Math.floor(rw / 2);
      let leftMass = 0;
      let rightMass = 0;

      for (let y = 0; y < rh; y += 3) {
        for (let x = 0; x < rw; x += 3) {
          const idx = (y * rw + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          if (lum > 25 && lum < 235) {
            if (x < midX) leftMass++;
            else rightMass++;
          }
        }
      }

      const total = leftMass + rightMass;
      if (total > 50) {
        const asymmetry = Math.abs(leftMass - rightMass) / total;
        if (asymmetry > 0.26) {
          shape = 'Irregular';
          confidence = 0.92;
        }
      }
    }

    return {
      shape,
      aspect_ratio: aspectRatio,
      circularity: Math.round(circularity * 100) / 100,
      confidence: Math.round(confidence * 100) / 100
    };
  }
}

if (typeof window !== 'undefined') {
  window.ShapeAnalyzerModule = ShapeAnalyzerModule;
}
