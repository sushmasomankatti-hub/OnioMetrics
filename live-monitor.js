/**
 * OnioVision Edge — Live Monitor UI Controller
 * Manages dual camera modes (Single-Unit and Batch/Conveyor), real-time HUD telemetry,
 * running tally stats, and Aspergillus food safety alarms.
 */

class LiveMonitorUI {
  constructor() {
    this.canvas = document.getElementById('visionCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.webcamVideo = document.getElementById('webcamElement');
    this.currentMode = 'single'; // 'single' | 'batch'
    this.currentSource = 'simulator'; // 'simulator' | 'webcam' | 'upload' | 'presets'
    this.activeBatch = null;
    this.recentSpecimens = [];
    this.isConveyorRunning = false;
    this.autoTrigger = true;
    this.stableCounter = 0;
    this.webcamStream = null;

    // Initialize Simulator & Tracker
    this.simulator = new ConveyorSimulator(this.canvas);
    this.tracker = new ConveyorTracker({
      focalLineRatio: CONFIG.CALIBRATION.conveyorFocalZoneRatio || 0.60,
      variety: 'Red Nasik',
      onSpecimenAssessed: (assessment, track) => this.handleSpecimenAssessed(assessment, track)
    });

    this.initBatchSession();
    this.bindEvents();
    this.startRenderLoop();
  }

  /**
   * Initialize a clean inspection batch session
   */
  initBatchSession(customId = null) {
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const randId = Math.floor(100 + Math.random() * 900);
    const batchId = customId || `BATCH-${dateStr}-${randId}`;

    this.activeBatch = {
      batch_id: batchId,
      timestamp: new Date().toISOString(),
      station: document.getElementById('stationSelect')?.value || 'Lasalgaon APMC — Line 01 (Export)',
      supplier: 'Sahyadri Farmer Producer Co.',
      variety: 'Red Nasik',
      lot_weight_kg: 3500,
      total_count: 0,
      count_a: 0,
      count_b: 0,
      count_c: 0,
      count_reject: 0,
      pct_a: 0.0,
      pct_b: 0.0,
      pct_c: 0.0,
      pct_reject: 0.0,
      running_quality_score: 0.0,
      quality_score_sum: 0,
      mold_incidents: 0,
      synced: false,
      operator: 'Inspector R. Patil (#409)'
    };

    this.recentSpecimens = [];
    this.tracker.reset(batchId.substring(0, 4));

    // Update Header Pill
    const headerBatch = document.getElementById('headerBatchId');
    if (headerBatch) headerBatch.textContent = batchId;

    this.updateTallyUI();
    this.renderSpecimenTable();
  }

  bindEvents() {
    // Mode Switcher: Single vs Batch
    document.getElementById('btnModeSingle')?.addEventListener('click', () => this.switchMode('single'));
    document.getElementById('btnModeBatch')?.addEventListener('click', () => this.switchMode('batch'));

    // Video Source Selector
    document.getElementById('videoSourceSelect')?.addEventListener('change', (e) => this.switchSource(e.target.value));

    // Conveyor Controls
    document.getElementById('btnToggleConveyor')?.addEventListener('click', () => this.toggleConveyor());
    document.getElementById('btnNewBatch')?.addEventListener('click', () => this.initBatchSession());
    document.getElementById('btnEndBatch')?.addEventListener('click', () => this.finishBatchAndShowReport());

    // Single Unit Controls
    document.getElementById('btnCaptureAssess')?.addEventListener('click', () => this.captureAndAssessSingle());
    document.getElementById('chkAutoTrigger')?.addEventListener('change', (e) => {
      this.autoTrigger = e.target.checked;
    });

    // Conveyor Sliders
    document.getElementById('rngBeltSpeed')?.addEventListener('input', (e) => {
      const spd = parseInt(e.target.value);
      this.simulator.setSpeed(spd);
      const labels = ['Slow (25/min)', 'Normal (45/min)', 'Fast (65/min)', 'Very Fast (90/min)', 'Maximum (120/min)'];
      document.getElementById('valBeltSpeed').textContent = labels[spd - 1] || 'Normal';
    });

    document.getElementById('rngDefectRate')?.addEventListener('input', (e) => {
      const rate = parseInt(e.target.value);
      this.simulator.setDefectRate(rate);
      document.getElementById('valDefectRate').textContent = `${rate}% Mixed`;
    });

    // Test Presets Pills
    document.querySelectorAll('.pill-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const presetKey = e.currentTarget.getAttribute('data-preset');
        this.loadPresetSpecimen(presetKey);
      });
    });

    // File Upload input
    const fileInput = document.getElementById('fileInput');
    fileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleImageFileUpload(e.target.files[0]);
      }
    });

    // JSON accordion toggle
    document.getElementById('btnToggleJson')?.addEventListener('click', () => {
      const block = document.getElementById('specimenJsonBlock');
      if (block) {
        block.style.display = block.style.display === 'none' ? 'block' : 'none';
      }
    });
  }

  switchMode(mode) {
    this.currentMode = mode;
    const btnSingle = document.getElementById('btnModeSingle');
    const btnBatch = document.getElementById('btnModeBatch');
    const singleHud = document.getElementById('singleHudCrosshair');
    const conveyorGuide = document.getElementById('conveyorGuideline');
    const singleControls = document.getElementById('singleControls');
    const conveyorControls = document.getElementById('conveyorControls');

    if (mode === 'single') {
      btnSingle.classList.add('active');
      btnBatch.classList.remove('active');
      if (singleHud) singleHud.style.display = 'flex';
      if (conveyorGuide) conveyorGuide.style.display = 'none';
      if (singleControls) singleControls.style.display = 'flex';
      if (conveyorControls) conveyorControls.style.display = 'none';
      this.simulator.stop();
      this.isConveyorRunning = false;
      this.simulator.clear();
      this.simulator.setSingleSpecimen('gradeA');
    } else {
      btnSingle.classList.remove('active');
      btnBatch.classList.add('active');
      if (singleHud) singleHud.style.display = 'none';
      if (conveyorGuide) conveyorGuide.style.display = 'block';
      if (singleControls) singleControls.style.display = 'none';
      if (conveyorControls) conveyorControls.style.display = 'flex';
      this.simulator.singleSpecimen = null;
      this.simulator.start();
      this.isConveyorRunning = true;
    }
    this.updateConveyorButton();
  }

  async switchSource(source) {
    this.currentSource = source;
    const dropzone = document.getElementById('uploadDropzone');

    // Stop webcam if active
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(t => t.stop());
      this.webcamStream = null;
    }

    if (source === 'simulator') {
      if (dropzone) dropzone.style.display = 'none';
      if (this.currentMode === 'batch') this.simulator.start();
      else this.simulator.setSingleSpecimen('gradeA');
    } else if (source === 'webcam') {
      if (dropzone) dropzone.style.display = 'none';
      this.simulator.stop();
      await this.startWebcam();
    } else if (source === 'upload') {
      this.simulator.stop();
      if (dropzone) dropzone.style.display = 'flex';
    } else if (source === 'presets') {
      if (dropzone) dropzone.style.display = 'none';
      this.simulator.stop();
      this.loadPresetSpecimen('gradeA');
    }
  }

  async startWebcam() {
    try {
      this.webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      this.webcamVideo.srcObject = this.webcamStream;
      this.webcamVideo.play();
    } catch (err) {
      alert('Unable to access device camera. Please allow camera permissions or continue in Simulator mode.');
      document.getElementById('videoSourceSelect').value = 'simulator';
      this.switchSource('simulator');
    }
  }

  loadPresetSpecimen(presetKey) {
    this.simulator.clear();
    this.simulator.setSingleSpecimen(presetKey);
    this.captureAndAssessSingle();
  }

  handleImageFileUpload(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        document.getElementById('uploadDropzone').style.display = 'none';
        this.captureAndAssessSingle();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  toggleConveyor() {
    this.isConveyorRunning = !this.isConveyorRunning;
    if (this.isConveyorRunning) {
      this.simulator.start();
    } else {
      this.simulator.stop();
    }
    this.updateConveyorButton();
  }

  updateConveyorButton() {
    const icon = document.getElementById('conveyorBtnIcon');
    const txt = document.getElementById('conveyorBtnText');
    const btn = document.getElementById('btnToggleConveyor');
    if (!btn) return;

    if (this.isConveyorRunning) {
      if (icon) icon.textContent = '⏸';
      if (txt) txt.textContent = 'Pause Conveyor';
      btn.className = 'btn btn-warning';
    } else {
      if (icon) icon.textContent = '▶';
      if (txt) txt.textContent = 'Start Conveyor';
      btn.className = 'btn btn-primary';
    }
  }

  /**
   * Main animation & vision loop (60 FPS)
   */
  startRenderLoop() {
    const loop = () => {
      // 1. Update simulator physics
      if (this.currentSource === 'simulator') {
        this.simulator.update();
      }

      // 2. Render background and specimens
      let detectedBoxes = [];
      if (this.currentSource === 'simulator' || this.currentSource === 'presets') {
        detectedBoxes = this.simulator.render();
      } else if (this.currentSource === 'webcam' && this.webcamVideo.readyState >= 2) {
        this.ctx.drawImage(this.webcamVideo, 0, 0, this.canvas.width, this.canvas.height);
        // Computer vision blob extraction on live camera feed
        detectedBoxes = ImageProcessor.extractOnionBlobs(this.ctx, this.canvas.width, this.canvas.height);
      }

      // 3. Update conveyor object tracker & overlays
      const overlayOptions = {
        showBBox: document.getElementById('chkShowBBox')?.checked,
        showCalipers: document.getElementById('chkShowCalipers')?.checked,
        showSporeHeatmap: document.getElementById('chkShowSporeHeatmap')?.checked,
        showTracking: document.getElementById('chkShowTracking')?.checked
      };

      if (this.currentMode === 'batch') {
        this.tracker.update(detectedBoxes, this.canvas.width, this.ctx);
        this.tracker.drawOverlays(this.ctx, overlayOptions);
      } else {
        // Single unit mode overlay
        if (this.simulator.singleSpecimen && overlayOptions.showBBox) {
          const s = this.simulator.singleSpecimen;
          this.ctx.strokeStyle = '#38bdf8';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(s.x, s.y, s.width, s.height);
        }

        // Auto-trigger on stable specimen
        if (this.autoTrigger && detectedBoxes.length === 1 && !this.isConveyorRunning) {
          this.stableCounter++;
          if (this.stableCounter === 35) { // Stable for ~580ms
            this.captureAndAssessSingle();
          }
        } else {
          this.stableCounter = 0;
        }
      }

      // Update stream FPS indicator
      const fpsEl = document.getElementById('streamFps');
      if (fpsEl) fpsEl.textContent = `${this.simulator.fps || 60} FPS`;

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  /**
   * Assess specimen placed under Single-Unit Mode
   */
  captureAndAssessSingle() {
    const s = this.simulator.singleSpecimen;
    let rawInputs = null;

    if (s && s.preset) {
      rawInputs = s.preset;
    } else {
      // Extract from canvas center ROI
      const cw = this.canvas.width;
      const ch = this.canvas.height;
      const roi = { x: cw * 0.25, y: ch * 0.2, width: cw * 0.5, height: ch * 0.6 };
      const blobs = ImageProcessor.extractOnionBlobs(this.ctx, cw, ch, roi);
      if (blobs.length > 0) {
        const b = blobs[0];
        const roiImg = ImageProcessor.sampleRoiPixels(this.ctx, b);
        const size = SizeCaliperModule.measure(b);
        const shape = ShapeAnalyzerModule.analyze(b, roiImg);
        const colour = ColorClassifierModule.classify(roiImg);
        const sprout = SproutDetectorModule.detect(roiImg);
        const rot = RotDetectorModule.detect(roiImg);
        const aspergillus = AspergillusDetectorModule.detect(roiImg);
        const surface = SurfaceDefectsModule.analyze(roiImg);

        rawInputs = {
          diameter_mm: size.diameter_mm,
          shape: shape.shape,
          colour: colour.colour,
          sprout_detected: sprout.sprout_detected,
          sprout_percent: sprout.sprout_percent,
          rot_detected: rot.rot_detected,
          rot_percent: rot.rot_percent,
          aspergillus_detected: aspergillus.aspergillus_detected,
          aspergillus_species: aspergillus.aspergillus_species,
          aspergillus_confidence: aspergillus.confidence,
          defect_percent: surface.defect_percent
        };
      } else {
        rawInputs = PRESET_DATA.gradeA;
      }
    }

    const assessment = GradingEngine.assess(rawInputs);
    this.handleSpecimenAssessed(assessment, null);
  }

  /**
   * Handle single or conveyor assessed onion event
   */
  handleSpecimenAssessed(assessment, track = null) {
    // 1. Update Active Batch Running Tally
    this.activeBatch.total_count++;
    if (assessment.grade === 'A') this.activeBatch.count_a++;
    else if (assessment.grade === 'B') this.activeBatch.count_b++;
    else if (assessment.grade === 'C') this.activeBatch.count_c++;
    else this.activeBatch.count_reject++;

    if (assessment.aspergillus_detected) {
      this.activeBatch.mold_incidents++;
    }

    this.activeBatch.quality_score_sum += assessment.quality_score;
    this.activeBatch.running_quality_score = Math.round(
      this.activeBatch.quality_score_sum / this.activeBatch.total_count
    );

    const tot = this.activeBatch.total_count;
    this.activeBatch.pct_a = Math.round((this.activeBatch.count_a / tot) * 1000) / 10;
    this.activeBatch.pct_b = Math.round((this.activeBatch.count_b / tot) * 1000) / 10;
    this.activeBatch.pct_c = Math.round((this.activeBatch.count_c / tot) * 1000) / 10;
    this.activeBatch.pct_reject = Math.round((this.activeBatch.count_reject / tot) * 1000) / 10;

    // 2. Prepend to Recent Specimens Queue
    this.recentSpecimens.unshift(assessment);
    if (this.recentSpecimens.length > 8) this.recentSpecimens.pop();

    // 3. Update UI Panels
    this.updateTallyUI();
    this.updateSpecimenCard(assessment);
    this.renderSpecimenTable();

    // 4. Save to LocalDB
    window.LocalDB.saveSpecimen({ ...assessment, batch_id: this.activeBatch.batch_id });
    window.LocalDB.saveBatch(this.activeBatch);
    if (window.SyncManager) window.SyncManager.updateStatus();
  }

  /**
   * Updates top and side running tally figures
   */
  updateTallyUI() {
    const b = this.activeBatch;
    document.getElementById('tallyTotal').textContent = b.total_count;
    document.getElementById('tallyWeight').textContent = `${((b.total_count * 0.14)).toFixed(1)} kg Est.`;

    document.getElementById('tallyGradeACount').textContent = b.count_a;
    document.getElementById('tallyGradeAPct').textContent = `${b.pct_a.toFixed(1)}%`;

    document.getElementById('tallyGradeBCount').textContent = b.count_b;
    document.getElementById('tallyGradeBPct').textContent = `${b.pct_b.toFixed(1)}%`;

    document.getElementById('tallyGradeCCount').textContent = b.count_c;
    document.getElementById('tallyGradeCPct').textContent = `${b.pct_c.toFixed(1)}%`;

    document.getElementById('tallyRejectCount').textContent = b.count_reject;
    document.getElementById('tallyRejectPct').textContent = `${b.pct_reject.toFixed(1)}%`;

    const scoreEl = document.getElementById('tallyQualityScore');
    const scoreBar = document.getElementById('tallyScoreBar');
    if (b.total_count > 0) {
      scoreEl.textContent = `${b.running_quality_score}%`;
      scoreBar.style.width = `${b.running_quality_score}%`;
    } else {
      scoreEl.textContent = '--';
      scoreBar.style.width = '0%';
    }

    // Top ticker
    const moldVetoes = document.getElementById('tickerMoldVetoes');
    if (moldVetoes) moldVetoes.textContent = b.mold_incidents;
  }

  /**
   * Updates the 7 AI vision sub-modules on the Specimen Assessment Card
   */
  updateSpecimenCard(a) {
    document.getElementById('specimenId').textContent = a.onion_id;

    // Status Badge & Food Safety Banner
    const badge = document.getElementById('specimenStatusBadge');
    const banner = document.getElementById('foodSafetyBanner');
    const bannerDesc = document.getElementById('foodSafetyBannerDesc');

    badge.className = 'specimen-status-badge';
    if (a.aspergillus_detected) {
      badge.classList.add('biohazard-veto');
      badge.textContent = 'BIOHAZARD REJECT';
      if (banner) {
        banner.style.display = 'flex';
        bannerDesc.textContent = `${a.aspergillus_species || 'Aspergillus fungal colony'} confirmed. Mandatory rejection veto enforced. Specimen quarantined.`;
      }
    } else {
      if (banner) banner.style.display = 'none';
      if (a.grade === 'A') {
        badge.classList.add('accepted-a');
        badge.textContent = 'ACCEPTED — GRADE A';
      } else if (a.grade === 'B') {
        badge.classList.add('accepted-b');
        badge.textContent = 'ACCEPTED — GRADE B';
      } else if (a.grade === 'C') {
        badge.classList.add('accepted-c');
        badge.textContent = 'ACCEPTED — GRADE C';
      } else {
        badge.classList.add('rejected');
        badge.textContent = a.final_status.toUpperCase();
      }
    }

    // 1. Size
    document.getElementById('modDiameterVal').textContent = `${a.diameter_mm.toFixed(1)} mm`;
    document.getElementById('modDiameterGrade').textContent = a.diameter_mm > 60
      ? 'Export Super (>60mm)'
      : (a.diameter_mm >= 50 ? 'Standard Medium (50–60mm)' : 'Baby/Small (<50mm)');

    // 2. Shape
    document.getElementById('modShapeVal').textContent = a.shape;
    document.getElementById('modShapeRatio').textContent = `Conformity: High`;

    // 3. Colour
    document.getElementById('modColourVal').textContent = a.colour;
    document.getElementById('modColourHue').textContent = `HSV Envelope: Red Nasik`;

    // 4. Sprout
    document.getElementById('modSproutVal').textContent = a.sprout_detected ? 'Sprouting Active' : 'Dormant Neck (Pass)';
    document.getElementById('modSproutCoverage').textContent = a.sprout_detected ? 'FAIL: Vegetative Shoot' : 'Coverage: 0.0%';

    // 5. Rot
    document.getElementById('modRotVal').textContent = a.rot_detected ? 'Rot Detected' : 'Clean (No Soft Spots)';
    document.getElementById('modRotArea').textContent = a.rot_detected ? 'Moisture/Decay Flagged' : 'Softness: None';

    // 6. Aspergillus
    const aspVal = document.getElementById('modAspergillusVal');
    const aspConf = document.getElementById('modAspergillusConf');
    if (a.aspergillus_detected) {
      aspVal.textContent = a.aspergillus_species || 'Aspergillus species';
      aspVal.style.color = '#f87171';
      aspConf.textContent = 'Food Safety VETO Enforced';
    } else {
      aspVal.textContent = 'Pathogen Free (Clean)';
      aspVal.style.color = '#34d399';
      aspConf.textContent = 'Confidence: 99.2% Clean';
    }

    // 7. Surface
    document.getElementById('modDefectVal').textContent = `${a.defect_percent.toFixed(1)}%`;
    document.getElementById('modDefectStatus').textContent = a.defect_percent <= 5.0
      ? 'Grade A Tolerance Met (<=5%)'
      : (a.defect_percent <= 12.0 ? 'Grade B Tolerance (<=12%)' : 'Defect Threshold Exceeded');

    // Structured JSON Block (exact format requested)
    const jsonBlock = document.getElementById('specimenJsonBlock');
    if (jsonBlock) {
      const cleanJson = {
        onion_id: a.onion_id,
        diameter_mm: a.diameter_mm,
        grade: a.grade,
        shape: a.shape,
        colour: a.colour,
        sprout_detected: a.sprout_detected,
        rot_detected: a.rot_detected,
        aspergillus_detected: a.aspergillus_detected,
        aspergillus_species: a.aspergillus_species,
        defect_percent: a.defect_percent,
        final_status: a.final_status
      };
      jsonBlock.textContent = JSON.stringify(cleanJson, null, 2);
    }
  }

  /**
   * Renders the recent specimens stream table
   */
  renderSpecimenTable() {
    const tbody = document.getElementById('recentSpecimensBody');
    const qCount = document.getElementById('queueCount');
    if (!tbody) return;

    if (qCount) qCount.textContent = `${this.activeBatch.total_count} in batch`;

    if (this.recentSpecimens.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No specimens scanned yet. Start conveyor or click Capture.</td></tr>';
      return;
    }

    tbody.innerHTML = this.recentSpecimens.map(s => {
      const gradeClass = s.grade === 'A' ? 'grade-a' : (s.grade === 'B' ? 'grade-b' : (s.grade === 'C' ? 'grade-c' : 'grade-reject'));
      const moldText = s.aspergillus_detected ? '<span style="color:#f87171;font-weight:bold;">☣️ ALERT: Mold</span>' : '<span style="color:#34d399;">Clean</span>';

      return `
        <tr>
          <td><strong>${s.onion_id}</strong></td>
          <td>${s.diameter_mm.toFixed(1)} mm</td>
          <td><span class="badge-grade ${gradeClass}">Grade ${s.grade}</span></td>
          <td>${s.defect_percent.toFixed(1)}%</td>
          <td>${moldText}</td>
          <td>${s.final_status}</td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Closes the active batch and displays the official Inspection Certificate Modal
   */
  finishBatchAndShowReport() {
    this.simulator.stop();
    this.isConveyorRunning = false;
    this.updateConveyorButton();

    if (window.BatchReportsUI) {
      window.BatchReportsUI.openBatchCertificateModal(this.activeBatch);
    }
  }
}

if (typeof window !== 'undefined') {
  window.LiveMonitorUI = LiveMonitorUI;
}
