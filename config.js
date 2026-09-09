/**
 * OnioMetrics — System Configuration & Grading Rules
 * Diameter-based A/B/C grading with strictly defect-driven rejection
 * (Rotten, Sprouted, Aspergillus, and Surface Damage trigger Rejection, NOT diameter).
 */

const CONFIG = {
  // Application Version & Environment
  APP_NAME: 'OnioMetrics',
  VERSION: '2.4.0-edge',
  OFFLINE_MODE: true,

  // Camera & Spatial Calibration
  CALIBRATION: {
    pixelsPerMm: 3.20,             // Default px/mm ratio (3.20 px = 1.0 mm)
    focalHeightMm: 300,            // Standard nadir lens mount height
    referenceCoinMm: 25.0,         // Indian 5-rupee / 10-rupee standard reference coin
    referenceCardMm: 85.6,         // ISO 7810 ID card reference width
    conveyorFocalZoneRatio: 0.60,  // Assessment line at 60% of frame width
    minOnionAreaPx: 1200,          // Filter out minor debris / dirt specs
    maxOnionAreaPx: 180000         // Filter out oversized table boundaries
  },

  // Sizing & Grading Standards
  // Diameter determines Grade A, B, or C.
  // Rejection is strictly defect-driven: Rotten, Sprouted, Aspergillus, or Surface Damage.
  GRADING: {
    GRADE_A: {
      code: 'A',
      name: 'Grade A',
      category: 'Large / Super',
      minDiameterMm: 60.0,         // > 60 mm
      marketUse: 'Export markets, premium domestic buyers',
      maxDefectPercent: 5.0,
      maxSproutPercent: 0.0,       // Zero tolerance for export
      maxRotPercent: 0.0,
      minQualityScore: 85,
      colorToken: 'grade-a',
      hexColor: '#10b981'
    },
    GRADE_B: {
      code: 'B',
      name: 'Grade B',
      category: 'Medium',
      minDiameterMm: 50.0,         // 50–60 mm
      maxDiameterMm: 60.0,
      marketUse: 'Standard household/general market trade',
      maxDefectPercent: 12.0,
      maxSproutPercent: 0.0,
      maxRotPercent: 0.0,
      minQualityScore: 65,
      colorToken: 'grade-b',
      hexColor: '#f59e0b'
    },
    GRADE_C: {
      code: 'C',
      name: 'Grade C',
      category: 'Small / Baby',
      maxDiameterMm: 50.0,         // <= 50 mm (Small / Baby / Processing)
      marketUse: 'Regional culinary use, select export niches, processing',
      maxDefectPercent: 18.0,
      maxSproutPercent: 0.0,
      maxRotPercent: 0.0,
      minQualityScore: 50,
      colorToken: 'grade-c',
      hexColor: '#f97316'
    },
    REJECT: {
      code: 'Reject',
      name: 'Reject',
      category: 'Defective (Rot / Sprout / Mold / Damage)',
      description: 'Triggered strictly by defects (Rotten, Sprouted, Aspergillus mold, or excessive surface damage), regardless of diameter.',
      marketUse: 'Cull discard / processing',
      colorToken: 'grade-reject',
      hexColor: '#ef4444'
    }
  },

  // Defect Rejection Thresholds (Defect-driven, diameter independent)
  DEFECT_REJECTION_RULES: {
    ROT: {
      rejectOnDetection: true,     // Any confirmed soft rot/decay causes rejection
      maxRotPercent: 1.5
    },
    SPROUT: {
      rejectOnDetection: true,     // Any vegetative apical sprout causes rejection
      maxSproutPercent: 0.8
    },
    ASPERGILLUS: {
      rejectOnDetection: true,     // Mandatory food safety veto
      maxSporePercent: 0.8
    },
    SURFACE_DEFECTS: {
      maxTolerablePercent: 18.0    // Surface cuts, cracks, bruises > 18% causes rejection
    }
  },

  // Food Safety Pathology Rules (Aspergillus Species Detector)
  FOOD_SAFETY: {
    ASPERGILLUS: {
      SPECIES: {
        NIGER: 'Aspergillus niger (Black Mold)',
        FLAVUS: 'Aspergillus flavus (Yellow Mold)',
        VISIBLE_FUNGAL: 'Visible Fungal Necrosis'
      },
      minDetectionAreaPct: 0.8,     // Any colony >= 0.8% triggers immediate veto
      confidenceThreshold: 0.70,   // AI model confidence threshold
      mandatoryVeto: true,         // Force status to "Rejected - Food Safety Alert"
      alertColor: '#dc2626'
    }
  },

  // Onion Varieties & Reference HSV Colour Bands
  VARIETIES: {
    'Red Nasik': {
      id: 'red-nasik',
      name: 'Red Nasik / Garwa',
      description: 'Rich dark red/purple dry tunic, white flesh with red rings',
      hsvBaseline: {
        hueRange: [330, 25],       // Wraps 330° to 25°
        satMin: 0.25,
        valMin: 0.15,
        valMax: 0.85
      },
      indicativePricePerKg: {
        A: 34.50,
        B: 26.00,
        C: 18.00,
        Reject: 5.00
      }
    },
    'White Onion': {
      id: 'white-onion',
      name: 'White Processing Onion',
      description: 'Silvery white scales, high TSS, used for flake dehydration',
      hsvBaseline: {
        hueRange: [35, 75],
        satMax: 0.35,
        valMin: 0.60
      },
      indicativePricePerKg: {
        A: 38.00,
        B: 29.00,
        C: 19.50,
        Reject: 6.00
      }
    },
    'Yellow Spanish': {
      id: 'yellow-spanish',
      name: 'Yellow / Brown Spanish Hybrid',
      description: 'Straw-yellow to bronze outer skins, pungent flavor profile',
      hsvBaseline: {
        hueRange: [22, 48],
        satMin: 0.30,
        valMin: 0.35
      },
      indicativePricePerKg: {
        A: 31.00,
        B: 23.50,
        C: 16.00,
        Reject: 4.50
      }
    }
  },

  // Conveyor Object Tracker Calibration
  TRACKER: {
    maxDisplacementPx: 75,         // Max centroid distance between frames
    maxDisappearedFrames: 12,      // Frames to keep missing object alive
    minConsecutiveDetections: 3,   // Must be seen in 3 frames to be validated
    assessmentCooldownMs: 1200     // Prevent double registration
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
