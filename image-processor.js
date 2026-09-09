/**
 * OnioVision Edge — Image Processor
 * Edge-optimized computer vision routines: RGB/HSV color conversion,
 * background segmentation, connected-component contour detection, and ROI masking.
 */

class ImageProcessor {
  /**
   * Convert RGB pixel to HSV color space
   * Returns { h: [0-360], s: [0-1], v: [0-1] }
   */
  static rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s, v };
  }

  /**
   * Extract onion contours from an image or canvas context
   * Uses luminance thresholding & connected-component bounding box detection
   */
  static extractOnionBlobs(ctx, width, height, roi = null) {
    const rx = roi ? roi.x : 0;
    const ry = roi ? roi.y : 0;
    const rw = roi ? roi.width : width;
    const rh = roi ? roi.height : height;

    const imgData = ctx.getImageData(rx, ry, rw, rh);
    const data = imgData.data;
    const minArea = CONFIG.CALIBRATION.minOnionAreaPx;

    // Grid sampling to detect blob islands (fast edge approximation)
    const step = 4;
    const gridCols = Math.floor(rw / step);
    const gridRows = Math.floor(rh / step);
    const mask = new Uint8Array(gridCols * gridRows);

    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        const px = (gy * step * rw + gx * step) * 4;
        const r = data[px];
        const g = data[px + 1];
        const b = data[px + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // Foreground onion criteria: not deep black background, not ultra-white glare
        if (lum > 22 && lum < 240) {
          // Check chroma saturation to reject grey conveyor belt
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          if (sat > 0.14 || (lum > 30 && lum < 180)) {
            mask[gy * gridCols + gx] = 1;
          }
        }
      }
    }

    // Connected component labeling on coarse mask
    const visited = new Uint8Array(gridCols * gridRows);
    const blobs = [];

    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        const idx = gy * gridCols + gx;
        if (mask[idx] === 1 && visited[idx] === 0) {
          // Flood fill queue
          let minX = gx, maxX = gx, minY = gy, maxY = gy;
          let count = 0;
          const queue = [idx];
          visited[idx] = 1;

          while (queue.length > 0) {
            const cur = queue.pop();
            count++;
            const cy = Math.floor(cur / gridCols);
            const cx = cur % gridCols;

            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;

            // 4-neighbor flood
            const neighbors = [
              cx > 0 ? cur - 1 : -1,
              cx < gridCols - 1 ? cur + 1 : -1,
              cy > 0 ? cur - gridCols : -1,
              cy < gridRows - 1 ? cur + gridCols : -1
            ];

            for (const n of neighbors) {
              if (n !== -1 && mask[n] === 1 && visited[n] === 0) {
                visited[n] = 1;
                queue.push(n);
              }
            }
          }

          const areaPx = count * step * step;
          if (areaPx >= minArea && areaPx <= CONFIG.CALIBRATION.maxOnionAreaPx) {
            const bx = rx + minX * step;
            const by = ry + minY * step;
            const bw = (maxX - minX + 1) * step;
            const bh = (maxY - minY + 1) * step;
            blobs.push({
              x: bx,
              y: by,
              width: bw,
              height: bh,
              areaPx,
              centerX: bx + bw / 2,
              centerY: by + bh / 2
            });
          }
        }
      }
    }

    return blobs;
  }

  /**
   * Samples pixel statistics within a bounding box
   */
  static sampleRoiPixels(ctx, bbox) {
    const imgData = ctx.getImageData(
      Math.max(0, Math.floor(bbox.x)),
      Math.max(0, Math.floor(bbox.y)),
      Math.max(1, Math.floor(bbox.width)),
      Math.max(1, Math.floor(bbox.height))
    );
    return imgData;
  }
}

if (typeof window !== 'undefined') {
  window.ImageProcessor = ImageProcessor;
}
