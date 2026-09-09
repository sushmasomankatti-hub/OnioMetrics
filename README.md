# OnioMetrics — Smart Onion Assessment & Grading Platform

An offline-first, edge AI-driven onion quality assessment and optical grading platform engineered for agricultural procurement centers, APMC mandis, packhouses, and conveyor-belt sorting lines.

The platform provides sub-millimeter diameter sizing, 7 dedicated vision AI defect modules, frame-to-frame conveyor object tracking (zero double counting), exportable batch reports, official APMC Mandi certificates, and a mandatory food-safety veto for dangerous *Aspergillus* species mold.

---

## 🌟 1. Sizing Logic & Defect-Driven Rejection

Physical sizing (Grade A, B, C) is determined strictly by measured equatorial diameter (in mm):
- **🟢 Grade A (Large / Super)**: **&gt; 60.0 mm** (Export markets, premium domestic retail).
- **🟡 Grade B (Medium)**: **50.0 – 60.0 mm** (Standard household cooking, general trade).
- **🟠 Grade C (Small / Baby)**: **&le; 50.0 mm** (Regional culinary use, sambar, pickling, baby/mini).

### 🔴 Defect-Driven Rejection (Diameter-Independent)
**Diameter alone does not cause rejection.** A clean small/baby onion is classified as **Grade C**.
Rejection is strictly defect-driven and triggered unconditionally when any of the following are detected:
1. **Rotten / Soft Decay**: Any active soft rot, water-soaked tissue, or bacterial decay ($\ge 1.5\%$).
2. **Vegetative Sprouting**: Any green apical shoots emerging from the neck node ($\ge 0.8\%$).
3. **Aspergillus Mold (Critical Food-Safety Veto)**: Any conidial spore mass of black mold (*A. niger*) or yellow mold (*A. flavus*).
4. **Excessive Surface Defects**: Harvesting cuts, mechanical wounds, and dry tunic cracks exceeding $18.0\%$.

| Grade | Classification Basis | Criteria | Market Use / Payout Status |
| :--- | :--- | :--- | :--- |
| **🟢 Grade A** | Diameter Caliper | **&gt; 60.0 mm**, defect &le; 5%, zero rot/sprout/mold | Export / Premium domestic |
| **🟡 Grade B** | Diameter Caliper | **50.0 – 60.0 mm**, defect &le; 12%, zero rot/sprout/mold | Standard mandi trade |
| **🟠 Grade C** | Diameter Caliper | **&le; 50.0 mm**, defect &le; 18%, zero rot/sprout/mold | Regional culinary / baby |
| **🔴 Reject** | **Defects Only** | **Rotten, Sprouted, Aspergillus mold, or damage &gt; 18%** | Cull discard / processing |

---

## 🔬 2. The 7 AI Vision Modules & Structured JSON Telemetry

The vision pipeline decomposes quality assessment into 7 dedicated modules:

1. **Sprouting Detection (`sprout-detector.js`)**: Identifies green vegetative shoots emerging from the apical neck node; outputs `sprout_percent` coverage, shoot length ($\text{mm}$), and pass/fail status.
2. **Rot / Decay Detection (`rot-detector.js`)**: Detects bacterial soft rot, water-soaked scales, and moisture leakage sheen.
3. **Size Measurement (`size-caliper.js`)**: Sub-millimeter digital caliper measuring equatorial diameter and polar height using calibrated pixels-per-mm ratio ($K_{cal} = 3.20\text{ px/mm}$).
4. **Shape Classification (`shape-analyzer.js`)**: Classifies contour into **Round**, **Oval**, or **Irregular** based on aspect ratio ($H/W$), circularity metric ($\frac{4\pi \cdot \text{Area}}{\text{Perimeter}^2}$), and bilateral symmetry.
5. **Colour Classification (`color-classifier.js`)**: 3D HSV histogram analysis against reference variety envelopes (**Red Nasik**, **White Onion**, **Yellow Spanish**) to classify **Good**, **Faded**, or **Discoloured**.
6. **Aspergillus (Mold) Species Detector (`aspergillus-detector.js`)**: Dedicated classifier trained to identify black mold (*Aspergillus niger*) and yellow mold (*Aspergillus flavus*); outputs species label, confidence score, and triggers the **food-safety veto**.
7. **Surface / External Defects (`surface-defects.js`)**: Identifies cuts, harvesting bruises, dry skin cracks, and peeling percentage.

### Standardized Output JSON Schema
Every specimen produces an exact structured telemetry record:
```json
{
  "onion_id": "B003-00187",
  "diameter_mm": 64.2,
  "grade": "A",
  "shape": "Round",
  "colour": "Good",
  "sprout_detected": false,
  "rot_detected": false,
  "aspergillus_detected": false,
  "aspergillus_species": null,
  "defect_percent": 2.1,
  "final_status": "Accepted - Grade A"
}
```

---

## ☣️ 3. Critical Food-Safety Aspergillus Veto

*Aspergillus niger* and *Aspergillus flavus* produce destructive black spore dust and potential carcinogenic mycotoxins (aflatoxins and ochratoxins).

- **The Veto Rule**: If `aspergillus_detected === true`, the grading engine **unconditionally overrides** diameter and quality scores, forcing the final status to:
  `"Rejected - Food Safety Alert (Aspergillus niger (Black Mold))"`
- **Visual Alert**: The UI triggers an urgent, flashing red biohazard banner and marks the specimen for immediate segregation to prevent conveyor cross-contamination.

---

## 📷 4. Dual Live Camera Modes

### A. Single-Unit Mode
- Live camera stream with target crosshair HUD, centering circle, and digital caliper brackets.
- Real-time display of: diameter, grade, colour, shape, sprout/rot/mold flags.
- **"Capture & Assess"** button + **Auto-Trigger on Stable Detection** (analyzes automatically once the specimen is stationary for $\ge 600\text{ ms}$).
- Instant Result Card with pass/fail and high-contrast grade badges.

### B. Batch / Conveyor Mode
- Continuous live stream of moving conveyor belt with multi-object detection.
- **Centroid Object Tracker (`conveyor-tracker.js`)**: Tracks specimens frame-to-frame with persistent IDs (`ON-001`, `ON-002`, ...), eliminating double-counting across the focal assessment zone.
- **Real-Time Running Tally Dashboard**:
  - Total Scanned
  - Grade A Count & % (Green)
  - Grade B Count & % (Amber)
  - Grade C Count & % (Orange)
  - Reject Count & % (Red)
  - Running Quality Score %
- End-of-batch summary report generated automatically with printable APMC certificate.

---

## 📄 5. Five Complete Dashboard & Reporting Pages

1. **Live Monitor Page**: Live stream viewport, Single/Batch toggle, camera source selector (Webcam, 60 FPS Simulator, Upload, Presets), running tally cards, specimen diagnostic card, and real-time scanned queue.
2. **Batch Reports Page**: Filterable table of past batches, one-click CSV export, and official **Printable Mandi Inspection Certificate (A4)** with digital QR code seal and lot payout valuation.
3. **Grading Criteria Reference Page**: Static standard reference table, Aspergillus food-safety pathology callout, and an **Interactive Caliper Diameter Slider** demonstrator.
4. **Analytics Page**: KPI stat cards, Quality Score trend line chart, Grade Distribution donut chart, Defect Pareto breakdown, and Supplier Quality Ranking.
5. **Edge Calibration & Settings**: Pixel-to-mm ratio slider ($K_{px/mm}$), reference coin calibration, sprout threshold adjustments, and local SSD storage telemetry.

---

## 🚀 6. Quick Start & Execution

### Zero-Setup Standalone Mode (100% Offline Edge Kiosk)
Open `index.html` directly in any web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari).
No installation, no npm, and no internet connection required.

### Optional Python FastAPI Edge Server (Hardware USB / RTSP Cameras)
For packhouses deploying industrial USB cameras or RTSP network camera streams:

```bash
cd backend
pip install -r requirements.txt
python main.py
```
Open `http://localhost:8000` to access the application.

---

## 📁 7. File Structure

```
smart-onion-platform/
├── index.html                     # Main Single Page Application shell
├── README.md                      # Documentation and specifications
├── css/
│   ├── industrial-theme.css       # High-contrast industrial UI theme & grade tokens
│   └── components.css             # HUD overlays, conveyor lanes, modals, A4 print styles
├── js/
│   ├── app.js                     # Application router, calibration, and lifecycle
│   ├── config.js                  # Diameter thresholds, defect limits, varieties, grading rules
│   ├── vision/
│   │   ├── image-processor.js     # RGB/HSV conversion, Otsu thresholding, blob extraction
│   │   ├── size-caliper.js        # Sub-mm equatorial caliper measurement
│   │   ├── shape-analyzer.js      # Round / Oval / Irregular aspect ratio & symmetry
│   │   ├── color-classifier.js    # HSV color histogram against Red/White/Yellow varieties
│   │   ├── sprout-detector.js     # Apical chlorophyll shoot detection & coverage %
│   │   ├── rot-detector.js        # Soft spot, moisture sheen, and necrotic decay detection
│   │   ├── aspergillus-detector.js# A. niger & A. flavus mold detection & food safety veto
│   │   ├── surface-defects.js     # Cuts, cracks, skin damage surface %
│   │   └── grading-engine.js      # Arbitration engine returning exact structured JSON schema
│   ├── tracker/
│   │   └── conveyor-tracker.js    # Euclidean centroid tracker & focal line registration
│   ├── storage/
│   │   ├── local-db.js            # IndexedDB offline store for batches & specimens
│   │   └── sync-manager.js        # Offline-first queue & cloud sync manager
│   ├── samples/
│   │   └── preset-data.js         # Curated specimens (Grade A, B, C, Undersize, Mold, Sprout)
│   └── ui/
│       ├── conveyor-simulator.js  # 60 FPS procedural conveyor visualizer
│       ├── live-monitor.js        # Live Monitor HUD, camera controls, tally counters
│       ├── batch-reports.js       # Archive table, CSV export, printable A4 certificate
│       ├── grading-reference.js   # Criteria reference & interactive caliper slider
│       └── analytics-view.js      # Canvas trend charts, donut distribution, Pareto bars
└── backend/
    ├── requirements.txt           # Python edge server dependencies
    ├── main.py                    # FastAPI edge REST server with static mounting
    └── vision_engine.py           # Native OpenCV / NumPy computer vision implementation
```
