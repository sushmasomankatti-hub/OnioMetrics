/**
 * OnioVision Edge — Conveyor Multi-Object Centroid Tracker
 * Frame-to-frame Euclidean distance tracking with virtual focal-line assessment
 * to eliminate duplicate counts on moving industrial conveyors.
 */

class ConveyorTracker {
  constructor(options = {}) {
    this.nextObjectId = 1;
    this.tracks = new Map(); // id -> Track object
    this.maxDisplacementPx = options.maxDisplacementPx || 80;
    this.maxDisappearedFrames = options.maxDisappearedFrames || 12;
    this.focalLineRatio = options.focalLineRatio || 0.60;
    this.onSpecimenAssessed = options.onSpecimenAssessed || null;
    this.variety = options.variety || 'Red Nasik';
    this.prefix = options.prefix || 'B003';
  }

  /**
   * Reset tracker for a new batch
   */
  reset(batchPrefix = 'B003') {
    this.tracks.clear();
    this.nextObjectId = 1;
    this.prefix = batchPrefix;
  }

  /**
   * Update tracks with detected blob bounding boxes in the current frame
   * @param {Array} detections - Array of { x, y, width, height, areaPx, ... }
   * @param {number} canvasWidth - Canvas width for focal line calculation
   * @param {CanvasRenderingContext2D} ctx - Optional context to sample ROI pixels
   */
  update(detections, canvasWidth, ctx = null) {
    const focalX = canvasWidth * this.focalLineRatio;

    // If no detections in frame, mark all active tracks as disappeared
    if (!detections || detections.length === 0) {
      for (const [id, track] of this.tracks.entries()) {
        track.disappeared++;
        if (track.disappeared > this.maxDisappearedFrames) {
          this.tracks.delete(id);
        }
      }
      return Array.from(this.tracks.values());
    }

    // Existing tracks list
    const existingIds = Array.from(this.tracks.keys());
    const existingCentroids = existingIds.map(id => this.tracks.get(id).centroid);

    // Detections centroids
    const detCentroids = detections.map(d => ({
      x: d.x + d.width / 2,
      y: d.y + d.height / 2
    }));

    const matchedTracks = new Set();
    const matchedDetections = new Set();

    // Match each existing track to nearest detection if within gating distance
    if (existingCentroids.length > 0) {
      for (let t = 0; t < existingIds.length; t++) {
        const tid = existingIds[t];
        const tc = existingCentroids[t];
        let minDist = Infinity;
        let bestDetIdx = -1;

        for (let d = 0; d < detCentroids.length; d++) {
          if (matchedDetections.has(d)) continue;
          const dc = detCentroids[d];
          const dist = Math.hypot(tc.x - dc.x, tc.y - dc.y);
          if (dist < minDist) {
            minDist = dist;
            bestDetIdx = d;
          }
        }

        if (minDist <= this.maxDisplacementPx && bestDetIdx !== -1) {
          // Successful track association
          matchedTracks.add(tid);
          matchedDetections.add(bestDetIdx);

          const track = this.tracks.get(tid);
          const prevX = track.centroid.x;
          const newCentroid = detCentroids[bestDetIdx];
          const detection = detections[bestDetIdx];

          track.disappeared = 0;
          track.history.push({ ...track.centroid });
          if (track.history.length > 15) track.history.shift();

          track.centroid = newCentroid;
          track.bbox = detection;

          // Check focal assessment line crossing:
          // Conveyor moves left-to-right (prevX < focalX && newCentroid.x >= focalX)
          // or right-to-left. We trigger when crossing within +- 35px of focal line.
          const inFocalZone = Math.abs(newCentroid.x - focalX) <= 35;
          const crossedFocal = (prevX < focalX && newCentroid.x >= focalX);

          if (!track.assessed && (crossedFocal || inFocalZone)) {
            this._assessTrack(track, detection, ctx);
          }
        }
      }
    }

    // Handle unmatched existing tracks
    for (const [id, track] of this.tracks.entries()) {
      if (!matchedTracks.has(id)) {
        track.disappeared++;
        if (track.disappeared > this.maxDisappearedFrames) {
          this.tracks.delete(id);
        }
      }
    }

    // Register new tracks for unmatched detections
    for (let d = 0; d < detections.length; d++) {
      if (!matchedDetections.has(d)) {
        const det = detections[d];
        const centroid = detCentroids[d];

        // Format Onion ID: e.g. B003-00187
        const numStr = String(this.nextObjectId++).padStart(5, '0');
        const onionId = `${this.prefix}-${numStr}`;

        const newTrack = {
          id: onionId,
          bbox: det,
          centroid: centroid,
          disappeared: 0,
          history: [],
          assessed: false,
          assessment: null,
          color: '#38bdf8'
        };

        // If specimen happens to appear already past the focal line (e.g. at frame spawn)
        if (centroid.x >= focalX) {
          this._assessTrack(newTrack, det, ctx);
        }

        this.tracks.set(onionId, newTrack);
      }
    }

    return Array.from(this.tracks.values());
  }

  /**
   * Internal routine to execute 7 AI vision modules when crossing assessment zone
   */
  _assessTrack(track, detection, ctx) {
    track.assessed = true;

    let roiImageData = null;
    if (ctx && detection) {
      roiImageData = ImageProcessor.sampleRoiPixels(ctx, detection);
    }

    // 1. Equatorial diameter via calibrated caliper
    const size = SizeCaliperModule.measure(detection, CONFIG.CALIBRATION.pixelsPerMm);
    // 2. Shape classification
    const shape = ShapeAnalyzerModule.analyze(detection, roiImageData);
    // 3. Colour classification
    const colour = ColorClassifierModule.classify(roiImageData, this.variety);
    // 4. Sprouting detection
    const sprout = SproutDetectorModule.detect(roiImageData, CONFIG.CALIBRATION.pixelsPerMm);
    // 5. Rot & decay detection
    const rot = RotDetectorModule.detect(roiImageData);
    // 6. Aspergillus mold species detector (Food Safety)
    const aspergillus = AspergillusDetectorModule.detect(roiImageData);
    // 7. Surface defects
    const surface = SurfaceDefectsModule.analyze(roiImageData);

    // Feed to GradingEngine for arbitration
    const assessment = GradingEngine.assess({
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
    }, track.id);

    track.assessment = assessment;
    track.grade = assessment.grade;

    // Set bounding box color token
    if (assessment.aspergillus_detected) {
      track.color = '#dc2626'; // Biohazard
    } else if (assessment.grade === 'A') {
      track.color = '#10b981';
    } else if (assessment.grade === 'B') {
      track.color = '#f59e0b';
    } else if (assessment.grade === 'C') {
      track.color = '#f97316';
    } else {
      track.color = '#ef4444';
    }

    // Emit event callback to update running tally & UI
    if (typeof this.onSpecimenAssessed === 'function') {
      this.onSpecimenAssessed(assessment, track);
    }
  }

  /**
   * Draw overlay bounding boxes, caliber lines, and tracking trails on canvas
   */
  drawOverlays(ctx, options = {}) {
    const showBBox = options.showBBox !== false;
    const showCalipers = options.showCalipers !== false;
    const showTracking = options.showTracking !== false;
    const showSporeHeatmap = options.showSporeHeatmap !== false;

    ctx.save();

    for (const track of this.tracks.values()) {
      if (track.disappeared > 1) continue;
      const b = track.bbox;
      const color = track.color || '#38bdf8';

      // 1. Draw Tracking Motion Trail
      if (showTracking && track.history.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(track.history[0].x, track.history[0].y);
        for (let i = 1; i < track.history.length; i++) {
          ctx.lineTo(track.history[i].x, track.history[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 2. Draw Bounding Box & HUD Label
      if (showBBox) {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        ctx.strokeRect(b.x, b.y, b.width, b.height);

        // Header Tag: ID & Grade
        const tagText = track.assessed
          ? `${track.id} [${track.assessment.grade}] ${track.assessment.diameter_mm}mm`
          : `${track.id} [ANALYZING]`;

        ctx.font = 'bold 11px monospace';
        const tagWidth = ctx.measureText(tagText).width + 12;
        ctx.fillStyle = color;
        ctx.fillRect(b.x, Math.max(0, b.y - 18), tagWidth, 18);

        ctx.fillStyle = '#0f172a';
        ctx.fillText(tagText, b.x + 6, Math.max(13, b.y - 4));
      }

      // 3. Draw Digital Caliper Lines (Equatorial Measurement)
      if (showCalipers && track.assessed) {
        const midY = b.y + b.height / 2;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // Caliper horizontal bar
        ctx.moveTo(b.x, midY);
        ctx.lineTo(b.x + b.width, midY);
        // Caliper left & right end brackets
        ctx.moveTo(b.x, midY - 6);
        ctx.lineTo(b.x, midY + 6);
        ctx.moveTo(b.x + b.width, midY - 6);
        ctx.lineTo(b.x + b.width, midY + 6);
        ctx.stroke();
      }

      // 4. Draw Aspergillus Spore Heatmap indicator
      if (showSporeHeatmap && track.assessment && track.assessment.aspergillus_detected) {
        ctx.fillStyle = 'rgba(220, 38, 38, 0.4)';
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(track.centroid.x, track.centroid.y, b.width * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('⚠️ ASPERGILLUS VETO', b.x, b.y + b.height + 14);
      }
    }

    ctx.restore();
  }
}

if (typeof window !== 'undefined') {
  window.ConveyorTracker = ConveyorTracker;
}
