/**
 * OnioMetrics — High-FPS Conveyor Simulator & Renderer
 * Procedural optical simulation of moving industrial grading belt with realistic
 * onions, defects (Aspergillus mold, apical sprouts, rot, cuts), and frame generator.
 */

class ConveyorSimulator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isRunning = false;
    this.beltSpeed = 2.4; // pixels per frame
    this.beltOffset = 0;
    this.defectRate = 0.25; // 25% defect injection
    this.onions = [];
    this.spawnTimer = 0;
    this.singleSpecimen = null;
    this.lastFrameTime = performance.now();
    this.fps = 60;
  }

  /**
   * Set conveyor speed (1 to 5)
   */
  setSpeed(level) {
    const speeds = [1.2, 2.0, 3.2, 4.5, 6.0];
    this.beltSpeed = speeds[level - 1] || 2.4;
  }

  setDefectRate(percent) {
    this.defectRate = Math.max(0, Math.min(0.8, percent / 100));
  }

  start() {
    this.isRunning = true;
  }

  stop() {
    this.isRunning = false;
  }

  clear() {
    this.onions = [];
    this.singleSpecimen = null;
  }

  /**
   * Place a single specimen in center for Single-Unit Mode
   */
  setSingleSpecimen(presetKey = 'gradeA') {
    const preset = PRESET_DATA[presetKey] || PRESET_DATA.gradeA;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const scale = CONFIG.CALIBRATION.pixelsPerMm || 3.20;
    const sizePx = preset.diameter_mm * scale;

    this.singleSpecimen = {
      x: cw / 2 - sizePx / 2,
      y: ch / 2 - sizePx / 2,
      width: sizePx,
      height: sizePx * (preset.aspect_ratio || 1.05),
      preset: preset,
      rotation: 0.15
    };
  }

  /**
   * Spawns a new realistic onion on the left edge of the conveyor
   */
  _spawnConveyorOnion() {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const scale = CONFIG.CALIBRATION.pixelsPerMm || 3.20;

    // Decide defect mix based on defectRate
    const isDefect = Math.random() < this.defectRate;
    let presetKey = 'gradeA';

    if (isDefect) {
      const roll = Math.random();
      if (roll < 0.25) presetKey = 'rejectMold';        // Aspergillus mold
      else if (roll < 0.50) presetKey = 'rejectRot';    // Rotten / decay soft spot
      else if (roll < 0.75) presetKey = 'rejectSprout'; // Sprouted neck
      else presetKey = 'rejectDefect';                  // Heavy skin cuts & damage
    } else {
      const roll = Math.random();
      if (roll < 0.52) presetKey = 'gradeA';            // Grade A export (>60mm)
      else if (roll < 0.82) presetKey = 'gradeB';       // Grade B medium (50-60mm)
      else if (roll < 0.93) presetKey = 'gradeC';       // Grade C small (35-50mm)
      else presetKey = 'smallBaby';                     // Grade C baby (clean 28mm)
    }

    const preset = PRESET_DATA[presetKey];
    // Add realistic diameter variance (+- 3.5mm)
    const variance = (Math.random() - 0.5) * 7.0;
    const diameter_mm = Math.max(22, Math.round((preset.diameter_mm + variance) * 10) / 10);
    const sizePx = diameter_mm * scale;

    // Random vertical lane on conveyor belt (with margins)
    const minY = 90;
    const maxY = ch - 90 - sizePx;
    const spawnY = minY + Math.random() * Math.max(10, (maxY - minY));

    this.onions.push({
      x: -sizePx - 10,
      y: spawnY,
      width: sizePx,
      height: sizePx * (preset.aspect_ratio || 1.04),
      preset: { ...preset, diameter_mm },
      rotation: Math.random() * Math.PI * 2,
      wobble: (Math.random() - 0.5) * 0.4
    });
  }

  /**
   * Update physics & positions
   */
  update() {
    const now = performance.now();
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;
    if (dt > 0) this.fps = Math.round(1000 / dt);

    if (!this.isRunning) return;

    // Belt offset animation
    this.beltOffset = (this.beltOffset + this.beltSpeed) % 40;

    // Move existing onions
    for (let i = this.onions.length - 1; i >= 0; i--) {
      const o = this.onions[i];
      o.x += this.beltSpeed;
      o.rotation += (this.beltSpeed * 0.008);

      // Remove onions that exit conveyor on right edge
      if (o.x > this.canvas.width + 120) {
        this.onions.splice(i, 1);
      }
    }

    // Spawn timer (spacing between onions on line)
    this.spawnTimer++;
    const spawnInterval = Math.round(110 / (this.beltSpeed / 2.0));
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this._spawnConveyorOnion();
    }
  }

  /**
   * Render complete conveyor belt, guidelines, and moving specimens
   */
  render() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    // 1. Draw Conveyor Belt Bed (Industrial Dark Matte Rubber)
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, cw, ch);

    // Conveyor metal side guide rails
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, cw, 24);
    ctx.fillRect(0, ch - 24, cw, 24);
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 22, cw, 2);
    ctx.fillRect(0, ch - 24, cw, 2);

    // Rubber belt moving slat texture
    ctx.strokeStyle = '#1a2234';
    ctx.lineWidth = 1;
    for (let x = -40 + this.beltOffset; x < cw + 40; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 24);
      ctx.lineTo(x, ch - 24);
      ctx.stroke();
    }

    // 2. Render Onions (Conveyor or Single)
    const specimensToRender = this.singleSpecimen ? [this.singleSpecimen] : this.onions;
    const detectedBoxes = [];

    for (const o of specimensToRender) {
      this._renderOnionSpecimen(ctx, o);
      // Collect bounding box for computer vision tracker
      detectedBoxes.push({
        x: Math.round(o.x),
        y: Math.round(o.y),
        width: Math.round(o.width),
        height: Math.round(o.height),
        areaPx: Math.round(o.width * o.height * 0.78),
        preset: o.preset
      });
    }

    return detectedBoxes;
  }

  /**
   * Renders high-fidelity anatomical onion: tunic rings, neck, roots, and defects
   */
  _renderOnionSpecimen(ctx, o) {
    const cx = o.x + o.width / 2;
    const cy = o.y + o.height / 2;
    const rx = o.width / 2;
    const ry = o.height / 2;
    const p = o.preset;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(o.rotation || 0);

    // Drop shadow
    ctx.beginPath();
    ctx.ellipse(3, 5, rx * 0.98, ry * 0.98, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();

    // Bulb Tunic Body (Concentric Tunic Gradient)
    const scheme = p.color_scheme || { base: '#991b1b', dark: '#450a0a', highlight: '#dc2626' };
    const grad = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, rx * 0.1, 0, 0, rx);
    grad.addColorStop(0, scheme.highlight);
    grad.addColorStop(0.45, scheme.base);
    grad.addColorStop(1, scheme.dark);

    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = scheme.dark;
    ctx.stroke();

    // Concentric Longitudinal Tunic Vein Stripes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.2;
    for (let a = -0.7; a <= 0.7; a += 0.35) {
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * Math.abs(a), ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Basal Root Plate (Fibrous dried roots)
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(0, ry - 3, 5, 0, Math.PI);
    ctx.fill();

    // Apical Neck (Top node)
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.arc(0, -ry + 3, 6, Math.PI, Math.PI * 2);
    ctx.fill();

    // DEFECT RENDERING 1: Vegetative Sprouting (Green Shoots emerging from neck)
    if (p.sprout_detected || p.vegetative_shoot) {
      ctx.save();
      ctx.translate(0, -ry);
      ctx.fillStyle = '#16a34a';
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2;

      // Primary Shoot
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.quadraticCurveTo(-10, -22, -4, -34);
      ctx.quadraticCurveTo(2, -22, 3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Secondary Shoot Blade
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(1, 0);
      ctx.quadraticCurveTo(8, -16, 12, -26);
      ctx.quadraticCurveTo(4, -14, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // DEFECT RENDERING 2: Aspergillus niger / flavus Mold Spores
    if (p.aspergillus_detected || p.spore_masses) {
      // Draw dense black powdery conidial spore masses along veins & neck
      const isFlavus = p.aspergillus_species && p.aspergillus_species.includes('flavus');
      const sporeColor = isFlavus ? '#84cc16' : '#0a0a0a';
      const haloColor = isFlavus ? 'rgba(132, 204, 22, 0.4)' : 'rgba(10, 10, 10, 0.6)';

      ctx.fillStyle = haloColor;
      ctx.beginPath();
      ctx.arc(-rx * 0.25, -ry * 0.2, rx * 0.35, 0, Math.PI * 2);
      ctx.arc(rx * 0.3, ry * 0.15, rx * 0.28, 0, Math.PI * 2);
      ctx.fill();

      // Individual powdery conidial dots
      ctx.fillStyle = sporeColor;
      const spots = [
        { x: -rx * 0.25, y: -ry * 0.2, r: 6 },
        { x: -rx * 0.32, y: -ry * 0.15, r: 4 },
        { x: -rx * 0.18, y: -ry * 0.25, r: 5 },
        { x: -rx * 0.22, y: -ry * 0.10, r: 4.5 },
        { x: rx * 0.3, y: ry * 0.15, r: 7 },
        { x: rx * 0.38, y: ry * 0.18, r: 4 },
        { x: rx * 0.24, y: ry * 0.22, r: 5 }
      ];
      for (const sp of spots) {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // DEFECT RENDERING 3: Rot & Decay Soft Spots
    if (p.rot_detected && !p.aspergillus_detected) {
      ctx.fillStyle = 'rgba(40, 15, 10, 0.7)';
      ctx.beginPath();
      ctx.arc(rx * 0.2, ry * 0.2, rx * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // Specular moisture glaze
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(rx * 0.22, ry * 0.18, 6, 2, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // DEFECT RENDERING 4: Mechanical Cuts & Cracks
    if (p.defect_percent > 6.0 && !p.aspergillus_detected) {
      ctx.strokeStyle = '#fee2e2';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-rx * 0.3, ry * 0.1);
      ctx.lineTo(-rx * 0.1, ry * 0.35);
      ctx.lineTo(-rx * 0.05, ry * 0.2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

if (typeof window !== 'undefined') {
  window.ConveyorSimulator = ConveyorSimulator;
}
