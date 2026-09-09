/**
 * OnioVision Edge — AI Vision Module 3: Size Measurement (Digital Caliper)
 * Measures equatorial diameter in mm using pixel-to-mm optical calibration.
 */

class SizeCaliperModule {
  /**
   * Calculates equatorial diameter from blob contour bounding parameters
   * @param {Object} bbox - { width, height, areaPx }
   * @param {number} pixelsPerMm - scale factor
   * @returns {Object} { diameter_mm, polar_height_mm, pixels_per_mm }
   */
  static measure(bbox, pixelsPerMm = null) {
    const scale = pixelsPerMm || CONFIG.CALIBRATION.pixelsPerMm || 3.20;
    
    // Equatorial diameter is the maximum transverse diameter perpendicular to the root-neck axis.
    // In top-down conveyor imaging, it corresponds to the major equatorial dimension.
    const equatorialPx = Math.max(bbox.width, bbox.height);
    const polarPx = Math.min(bbox.width, bbox.height);

    // Minor optical edge erosion factor for fuzzy outer tunics (0.97)
    const calibratedEquatorialPx = equatorialPx * 0.98;
    const diameter_mm = Math.round((calibratedEquatorialPx / scale) * 10) / 10;
    const polar_height_mm = Math.round(((polarPx * 0.98) / scale) * 10) / 10;

    return {
      diameter_mm,
      polar_height_mm,
      diameter_px: Math.round(equatorialPx),
      pixels_per_mm: scale
    };
  }

  /**
   * Calibrates scale from a detected reference coin (e.g. 25.0 mm standard coin)
   */
  static calibrateFromReferenceCoin(coinPixelDiameter, coinKnownMm = 25.0) {
    if (coinPixelDiameter > 10) {
      const newScale = coinPixelDiameter / coinKnownMm;
      CONFIG.CALIBRATION.pixelsPerMm = Math.round(newScale * 100) / 100;
      return CONFIG.CALIBRATION.pixelsPerMm;
    }
    return CONFIG.CALIBRATION.pixelsPerMm;
  }
}

if (typeof window !== 'undefined') {
  window.SizeCaliperModule = SizeCaliperModule;
}
