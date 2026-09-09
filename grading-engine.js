/**
 * OnioMetrics — Core Grading & Arbitration Engine
 * 
 * Rules:
 * 1. Diameter determines Grade A (>60mm), Grade B (50-60mm), and Grade C (<=50mm).
 *    Diameter ALONE DOES NOT cause rejection (small/baby onions are Grade C).
 * 2. REJECTION is strictly defect-driven:
 *    - Rotten: rot_detected === true or rot_percent >= 1.5%
 *    - Sprouted: sprout_detected === true or sprout_percent >= 0.8%
 *    - Aspergillus: aspergillus_detected === true (Food Safety Veto)
 *    - Excessive Defect: defect_percent > 18.0% (severe cuts/bruises/cracks)
 *
 * Produces exact structured JSON:
 * {
 *   "onion_id": "B003-00187",
 *   "diameter_mm": 64.2,
 *   "grade": "A",
 *   "shape": "Round",
 *   "colour": "Good",
 *   "sprout_detected": false,
 *   "rot_detected": false,
 *   "aspergillus_detected": false,
 *   "aspergillus_species": null,
 *   "defect_percent": 2.1,
 *   "final_status": "Accepted - Grade A"
 * }
 */

class GradingEngine {
  /**
   * Assesses an onion specimen by combining all 7 vision sub-module outputs
   * @param {Object} rawInputs - Outputs from the 7 sub-modules
   * @param {string} onionId - Unique specimen ID
   */
  static assess(rawInputs, onionId = null) {
    const id = onionId || `B003-${Math.floor(10000 + Math.random() * 90000)}`;

    const diameter = typeof rawInputs.diameter_mm === 'number'
      ? rawInputs.diameter_mm
      : 55.0;

    const shape = rawInputs.shape || 'Round';
    const colour = rawInputs.colour || 'Good';

    const sproutDetected = Boolean(rawInputs.sprout_detected);
    const sproutPercent = rawInputs.sprout_percent || 0.0;

    const rotDetected = Boolean(rawInputs.rot_detected);
    const rotPercent = rawInputs.rot_percent || 0.0;

    const aspergillusDetected = Boolean(rawInputs.aspergillus_detected);
    const aspergillusSpecies = rawInputs.aspergillus_species || null;
    const aspergillusConf = rawInputs.aspergillus_confidence || (aspergillusDetected ? 0.96 : 0.99);

    const defectPercent = typeof rawInputs.defect_percent === 'number'
      ? rawInputs.defect_percent
      : 0.0;

    // ============================================================
    // STEP 1: BASELINE TIER BY DIAMETER (A / B / C)
    // Small onions are classified as Grade C, NOT rejected by diameter.
    // ============================================================
    let baseGrade = 'C';
    let baseReason = '';

    if (diameter > 60.0) {
      baseGrade = 'A';
      baseReason = 'Large / Super (>60mm)';
    } else if (diameter >= 50.0 && diameter <= 60.0) {
      baseGrade = 'B';
      baseReason = 'Medium (50–60mm)';
    } else {
      // <= 50.0 mm (Small / Baby / Regional / Processing)
      baseGrade = 'C';
      baseReason = 'Small / Baby (<=50mm)';
    }

    // ============================================================
    // STEP 2: DEFECT-DRIVEN REJECTION & DOWNGRADE ARBITRATION
    // Rejection is strictly determined by: Rotten, Sprouted, Aspergillus, or Excessive Defects.
    // Diameter is NOT used for rejection.
    // ============================================================
    let finalGrade = baseGrade;
    let finalStatus = '';
    let downgradeNotes = [];

    // 1. REJECT DEFECT: ASPERGILLUS SPECIES (CRITICAL FOOD SAFETY VETO)
    if (aspergillusDetected) {
      finalGrade = 'Reject';
      const spName = aspergillusSpecies || 'Aspergillus species';
      finalStatus = `Rejected - Food Safety Alert (${spName})`;
      downgradeNotes.push(`Critical Food Safety Alert: ${spName} fungal colony detected (${Math.round(aspergillusConf * 100)}% conf).`);
    }
    // 2. REJECT DEFECT: ROTTEN / DECAY
    else if (rotDetected || rotPercent >= 1.5) {
      finalGrade = 'Reject';
      finalStatus = 'Rejected - Rotten / Soft Decay';
      downgradeNotes.push(`Rotten / soft decay detected (${rotPercent}% affected area).`);
    }
    // 3. REJECT DEFECT: SPROUTED
    else if (sproutDetected || sproutPercent >= 0.8) {
      finalGrade = 'Reject';
      finalStatus = 'Rejected - Sprouted Neck';
      downgradeNotes.push(`Vegetative sprouting detected (${sproutPercent}% shoot emergence).`);
    }
    // 4. REJECT DEFECT: EXCESSIVE SURFACE DAMAGE / DEFECTS
    else if (defectPercent > 18.0) {
      finalGrade = 'Reject';
      finalStatus = 'Rejected - Excessive Surface Defects';
      downgradeNotes.push(`Surface damage (${defectPercent}%) exceeds maximum marketable threshold (18%).`);
    }
    // ACCEPTED TIERS (A / B / C) WITH MINOR DEFECT DOWNGRADES
    else {
      // Grade A checks
      if (baseGrade === 'A') {
        if (defectPercent > 5.0 || colour === 'Discoloured') {
          if (defectPercent > 12.0) {
            finalGrade = 'C';
            downgradeNotes.push('Downgraded from Grade A to Grade C due to elevated surface defects.');
          } else {
            finalGrade = 'B';
            downgradeNotes.push('Downgraded from Grade A to Grade B due to minor surface defects.');
          }
        } else {
          finalGrade = 'A';
        }
      }
      // Grade B checks
      else if (baseGrade === 'B') {
        if (defectPercent > 12.0) {
          finalGrade = 'C';
          downgradeNotes.push('Downgraded from Grade B to Grade C due to surface defects.');
        } else {
          finalGrade = 'B';
        }
      }
      // Grade C remains C
      else {
        finalGrade = 'C';
      }

      finalStatus = `Accepted - Grade ${finalGrade}`;
    }

    // Compute Overall Quality Score (0 - 100)
    let score = 100;
    score -= defectPercent * 1.5;
    score -= sproutPercent * 4.0;
    score -= rotPercent * 5.0;
    if (shape === 'Oval') score -= 3;
    if (shape === 'Irregular') score -= 8;
    if (colour === 'Faded') score -= 5;
    if (colour === 'Discoloured') score -= 12;
    if (aspergillusDetected) score = Math.min(score, 15);
    if (rotDetected) score = Math.min(score, 30);
    if (sproutDetected) score = Math.min(score, 35);
    const qualityScore = Math.max(0, Math.min(100, Math.round(score)));

    // Return exact structured JSON schema
    return {
      onion_id: id,
      diameter_mm: diameter,
      grade: finalGrade,
      shape: shape,
      colour: colour,
      sprout_detected: sproutDetected,
      rot_detected: rotDetected,
      aspergillus_detected: aspergillusDetected,
      aspergillus_species: aspergillusSpecies,
      defect_percent: defectPercent,
      final_status: finalStatus,
      
      // Extended telemetry for dashboard & certificates
      quality_score: qualityScore,
      base_grade: baseGrade,
      downgrade_notes: downgradeNotes,
      timestamp: new Date().toISOString()
    };
  }
}

if (typeof window !== 'undefined') {
  window.GradingEngine = GradingEngine;
}
