/**
 * OnioMetrics — Curated Specimen Presets
 * Pre-calibrated optical specimens for instant field demonstration & edge testing.
 * Rejection is strictly defect-driven (Rot, Sprout, Aspergillus, Defects).
 */

const PRESET_DATA = {
  gradeA: {
    name: 'Grade A Super Export (68mm)',
    diameter_mm: 68.4,
    polar_height_mm: 65.2,
    shape: 'Round',
    aspect_ratio: 1.05,
    colour: 'Good',
    variety: 'Red Nasik',
    sprout_detected: false,
    sprout_percent: 0.0,
    shoot_length_mm: 0.0,
    rot_detected: false,
    rot_percent: 0.0,
    aspergillus_detected: false,
    aspergillus_species: null,
    aspergillus_confidence: 0.99,
    defect_percent: 1.8,
    cuts_detected: false,
    color_scheme: { base: '#991b1b', dark: '#450a0a', highlight: '#dc2626' }
  },

  gradeB: {
    name: 'Grade B Standard Medium (54mm)',
    diameter_mm: 54.2,
    polar_height_mm: 51.0,
    shape: 'Round',
    aspect_ratio: 1.06,
    colour: 'Good',
    variety: 'Red Nasik',
    sprout_detected: false,
    sprout_percent: 0.0,
    shoot_length_mm: 0.0,
    rot_detected: false,
    rot_percent: 0.0,
    aspergillus_detected: false,
    aspergillus_species: null,
    aspergillus_confidence: 0.99,
    defect_percent: 3.4,
    cuts_detected: false,
    color_scheme: { base: '#b91c1c', dark: '#5b1010', highlight: '#ef4444' }
  },

  gradeC: {
    name: 'Grade C Baby / Small (42mm)',
    diameter_mm: 42.6,
    polar_height_mm: 38.4,
    shape: 'Oval',
    aspect_ratio: 1.18,
    colour: 'Good',
    variety: 'Red Nasik',
    sprout_detected: false,
    sprout_percent: 0.0,
    shoot_length_mm: 0.0,
    rot_detected: false,
    rot_percent: 0.0,
    aspergillus_detected: false,
    aspergillus_species: null,
    aspergillus_confidence: 0.98,
    defect_percent: 4.2,
    cuts_detected: false,
    color_scheme: { base: '#7f1d1d', dark: '#3b0d0d', highlight: '#b91c1c' }
  },

  smallBaby: {
    name: 'Grade C Mini / Baby (28mm Clean - Accepted)',
    diameter_mm: 28.5, // Small diameter is Grade C, NOT rejected because clean!
    polar_height_mm: 27.0,
    shape: 'Round',
    aspect_ratio: 1.05,
    colour: 'Good',
    variety: 'Red Nasik',
    sprout_detected: false,
    sprout_percent: 0.0,
    shoot_length_mm: 0.0,
    rot_detected: false,
    rot_percent: 0.0,
    aspergillus_detected: false,
    aspergillus_species: null,
    aspergillus_confidence: 0.99,
    defect_percent: 2.1,
    cuts_detected: false,
    color_scheme: { base: '#991b1b', dark: '#450a0a', highlight: '#dc2626' }
  },

  rejectRot: {
    name: 'Reject: Rotten / Decay Soft Spot',
    diameter_mm: 58.0,
    polar_height_mm: 56.0,
    shape: 'Round',
    aspect_ratio: 1.04,
    colour: 'Discoloured',
    variety: 'Red Nasik',
    sprout_detected: false,
    sprout_percent: 0.0,
    shoot_length_mm: 0.0,
    rot_detected: true,
    rot_percent: 5.5,
    aspergillus_detected: false,
    aspergillus_species: null,
    aspergillus_confidence: 0.98,
    defect_percent: 6.0,
    cuts_detected: false,
    color_scheme: { base: '#450a0a', dark: '#1e0505', highlight: '#7f1d1d' }
  },

  rejectSprout: {
    name: 'Reject: Sprouted Apical Neck',
    diameter_mm: 56.4,
    polar_height_mm: 68.0,
    shape: 'Oval',
    aspect_ratio: 1.25,
    colour: 'Good',
    variety: 'Red Nasik',
    sprout_detected: true,
    sprout_percent: 8.4,
    shoot_length_mm: 12.5,
    rot_detected: false,
    rot_percent: 0.0,
    aspergillus_detected: false,
    aspergillus_species: null,
    aspergillus_confidence: 0.98,
    defect_percent: 4.0,
    cuts_detected: false,
    vegetative_shoot: true,
    color_scheme: { base: '#991b1b', dark: '#450a0a', highlight: '#dc2626' }
  },

  rejectMold: {
    name: 'Reject: Aspergillus niger Mold (Food Safety Veto)',
    diameter_mm: 72.8,
    polar_height_mm: 70.1,
    shape: 'Round',
    aspect_ratio: 1.04,
    colour: 'Discoloured',
    variety: 'Red Nasik',
    sprout_detected: false,
    sprout_percent: 0.0,
    shoot_length_mm: 0.0,
    rot_detected: false,
    rot_percent: 0.0,
    aspergillus_detected: true,
    aspergillus_species: 'Aspergillus niger (Black Mold)',
    aspergillus_confidence: 0.97,
    defect_percent: 7.5,
    cuts_detected: false,
    spore_masses: true,
    color_scheme: { base: '#581c1c', dark: '#1e0505', highlight: '#7f1d1d' }
  },

  rejectDefect: {
    name: 'Reject: Severe Skin Cuts & Surface Cracks',
    diameter_mm: 64.0,
    polar_height_mm: 61.5,
    shape: 'Irregular',
    aspect_ratio: 1.08,
    colour: 'Faded',
    variety: 'Red Nasik',
    sprout_detected: false,
    sprout_percent: 0.0,
    shoot_length_mm: 0.0,
    rot_detected: false,
    rot_percent: 0.0,
    aspergillus_detected: false,
    aspergillus_species: null,
    aspergillus_confidence: 0.98,
    defect_percent: 22.4, // Exceeds 18% limit -> Rejection
    cuts_detected: true,
    color_scheme: { base: '#7f1d1d', dark: '#3b0d0d', highlight: '#b91c1c' }
  }
};

if (typeof window !== 'undefined') {
  window.PRESET_DATA = PRESET_DATA;
}
