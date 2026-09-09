/**
 * OnioMetrics — Grading Criteria Reference Controller
 * Manages static standard tables and interactive caliper simulator gauge.
 * Demonstrates diameter-based A/B/C classification and defect-driven rejection.
 */

class GradingReferenceUI {
  constructor() {
    this.gaugeSlider = document.getElementById('gaugeSlider');
    this.gaugeValDisplay = document.getElementById('gaugeDiameterVal');
    this.gaugeCircle = document.getElementById('gaugeCircle');
    this.gaugeCaliperText = document.getElementById('gaugeCaliperText');
    this.gaugeResultBadge = document.getElementById('gaugeResultBadge');

    this.chkSimRot = document.getElementById('chkSimRot');
    this.chkSimSprout = document.getElementById('chkSimSprout');
    this.chkSimMold = document.getElementById('chkSimMold');
    this.chkSimDamage = document.getElementById('chkSimDamage');

    this.bindEvents();
    this.updateGauge(64.5);
  }

  bindEvents() {
    this.gaugeSlider?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.updateGauge(val);
    });

    // Defect simulation checkboxes
    [this.chkSimRot, this.chkSimSprout, this.chkSimMold, this.chkSimDamage].forEach(chk => {
      chk?.addEventListener('change', () => {
        const val = parseFloat(this.gaugeSlider?.value || 64.5);
        this.updateGauge(val);
      });
    });
  }

  updateGauge(diameterMm) {
    if (this.gaugeValDisplay) {
      this.gaugeValDisplay.textContent = `${diameterMm.toFixed(1)} mm`;
    }
    if (this.gaugeCaliperText) {
      this.gaugeCaliperText.textContent = `${diameterMm.toFixed(1)} mm`;
    }

    // Scale visual circle (20mm -> 60px, 95mm -> 220px)
    const pxSize = 50 + ((diameterMm - 20) / 75) * 170;
    if (this.gaugeCircle) {
      this.gaugeCircle.style.width = `${pxSize}px`;
      this.gaugeCircle.style.height = `${pxSize}px`;
    }

    // Check simulated defects (Rejection is strictly defect-driven)
    const isRot = this.chkSimRot?.checked;
    const isSprout = this.chkSimSprout?.checked;
    const isMold = this.chkSimMold?.checked;
    const isDamage = this.chkSimDamage?.checked;

    let gradeText = '';
    let badgeClass = '';

    if (isMold) {
      gradeText = 'REJECT — Food Safety Alert (Aspergillus Mold)';
      badgeClass = 'badge-grade grade-reject';
    } else if (isRot) {
      gradeText = 'REJECT — Rotten / Soft Decay';
      badgeClass = 'badge-grade grade-reject';
    } else if (isSprout) {
      gradeText = 'REJECT — Vegetative Sprouting';
      badgeClass = 'badge-grade grade-reject';
    } else if (isDamage) {
      gradeText = 'REJECT — Excessive Surface Damage (>18%)';
      badgeClass = 'badge-grade grade-reject';
    } else {
      // Diameter A / B / C Sizing (Diameter ALONE does not cause rejection)
      if (diameterMm > 60.0) {
        gradeText = 'Grade A (Large / Super — >60mm)';
        badgeClass = 'badge-grade grade-a';
      } else if (diameterMm >= 50.0 && diameterMm <= 60.0) {
        gradeText = 'Grade B (Medium — 50–60mm)';
        badgeClass = 'badge-grade grade-b';
      } else {
        gradeText = 'Grade C (Small / Baby / Processing — <=50mm)';
        badgeClass = 'badge-grade grade-c';
      }
    }

    if (this.gaugeResultBadge) {
      this.gaugeResultBadge.className = badgeClass;
      this.gaugeResultBadge.textContent = gradeText;
    }
  }
}

if (typeof window !== 'undefined') {
  window.GradingReferenceUI = new GradingReferenceUI();
}
