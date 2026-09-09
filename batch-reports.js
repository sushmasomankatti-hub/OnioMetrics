/**
 * OnioMetrics — Batch Reports & Mandi Certificate Generator
 * Manages inspection batch archive, CSV exports, and printable APMC certificates.
 */

class BatchReportsUI {
  constructor() {
    this.tableBody = document.getElementById('batchHistoryBody');
    this.searchInput = document.getElementById('inputBatchSearch');
    this.filterVariety = document.getElementById('filterVariety');
    this.filterGrade = document.getElementById('filterGradeFilter');
    this.currentCertBatch = null;

    this.bindEvents();
    this.refreshTable();
  }

  bindEvents() {
    this.searchInput?.addEventListener('input', () => this.refreshTable());
    this.filterVariety?.addEventListener('change', () => this.refreshTable());
    this.filterGrade?.addEventListener('change', () => this.refreshTable());

    document.getElementById('btnExportAllCsv')?.addEventListener('click', () => this.exportAllCsv());
    document.getElementById('btnCreateNewBatchReport')?.addEventListener('click', () => {
      if (window.liveMonitor) window.liveMonitor.initBatchSession();
      window.app?.navigateTo('live-monitor');
    });

    // Modal controls
    document.getElementById('btnCloseBatchModal')?.addEventListener('click', () => this.closeCertificateModal());
    document.getElementById('btnPrintCert')?.addEventListener('click', () => window.print());
    document.getElementById('btnExportCertCsv')?.addEventListener('click', () => this.exportCurrentCertCsv());
    document.getElementById('btnExportCertJson')?.addEventListener('click', () => this.exportCurrentCertJson());
  }

  /**
   * Refresh and render batches table from IndexedDB
   */
  async refreshTable() {
    if (!this.tableBody) return;
    const batches = await window.LocalDB.getAllBatches();
    const query = (this.searchInput?.value || '').toLowerCase();
    const varietyFilter = this.filterVariety?.value || 'all';
    const gradeFilter = this.filterGrade?.value || 'all';

    const filtered = batches.filter(b => {
      const matchQuery = b.batch_id.toLowerCase().includes(query) ||
        (b.supplier && b.supplier.toLowerCase().includes(query)) ||
        (b.station && b.station.toLowerCase().includes(query));

      const matchVariety = varietyFilter === 'all' || b.variety === varietyFilter;
      const matchGrade = gradeFilter === 'all' ||
        (gradeFilter === 'high-a' && b.pct_a >= 60) ||
        (gradeFilter === 'has-rejects' && b.mold_incidents > 0);

      return matchQuery && matchVariety && matchGrade;
    });

    if (filtered.length === 0) {
      this.tableBody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:24px;color:var(--text-muted);">No matching batch records found.</td></tr>';
      return;
    }

    this.tableBody.innerHTML = filtered.map(b => {
      const d = new Date(b.timestamp);
      const dateFormatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const safetyBadge = b.mold_incidents > 0
        ? `<span class="badge-grade grade-reject">⚠️ ${b.mold_incidents} Mold Veto</span>`
        : `<span class="badge-grade grade-a">✓ Clean</span>`;

      return `
        <tr>
          <td><strong style="color:#38bdf8;font-family:var(--font-mono);">${b.batch_id}</strong></td>
          <td style="font-size:0.75rem;color:var(--text-secondary);">${dateFormatted}</td>
          <td><strong>${b.supplier || 'Mandi Farmer Co-op'}</strong></td>
          <td><span class="batch-variety-tag">${b.variety}</span></td>
          <td style="font-family:var(--font-mono);font-weight:700;">${b.total_count}</td>
          <td><span class="badge-grade grade-a">${(b.pct_a || 0).toFixed(1)}% (${b.count_a || 0})</span></td>
          <td><span class="badge-grade grade-b">${(b.pct_b || 0).toFixed(1)}% (${b.count_b || 0})</span></td>
          <td><span class="badge-grade grade-c">${(b.pct_c || 0).toFixed(1)}% (${b.count_c || 0})</span></td>
          <td><span class="badge-grade grade-reject">${(b.pct_reject || 0).toFixed(1)}% (${b.count_reject || 0})</span></td>
          <td><strong style="color:#c084fc;font-family:var(--font-mono);">${b.avg_quality_score || b.running_quality_score || '--'}%</strong></td>
          <td>${safetyBadge}</td>
          <td>
            <button class="btn btn-outline" style="min-height:30px;padding:4px 10px;font-size:0.75rem;" onclick="window.BatchReportsUI.openBatchCertificateModal('${b.batch_id}')">
              📄 Certificate
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Open the official printable inspection certificate modal
   */
  async openBatchCertificateModal(batchOrId) {
    let b = batchOrId;
    if (typeof batchOrId === 'string') {
      const batches = await window.LocalDB.getAllBatches();
      b = batches.find(item => item.batch_id === batchOrId);
    }

    if (!b) return;
    this.currentCertBatch = b;

    const modal = document.getElementById('modalBatchSummary');
    if (!modal) return;

    // Fill in Certificate Data
    document.getElementById('modalCertId').textContent = `CERT-${b.batch_id.replace('BATCH-', '')}`;
    document.getElementById('certStationName').textContent = b.station || 'Lasalgaon APMC Regional Procurement Center';
    document.getElementById('certDate').textContent = `Date: ${new Date(b.timestamp).toLocaleString()} IST`;
    document.getElementById('certBatchId').textContent = b.batch_id;
    document.getElementById('certSupplier').textContent = b.supplier || 'Sahyadri Farmer Producer Co.';
    document.getElementById('certVariety').textContent = b.variety;
    document.getElementById('certWeight').textContent = `${b.lot_weight_kg || 3500} kg`;
    document.getElementById('certOperator').textContent = b.operator || 'Inspector R. Patil (#409)';

    // Pricing & Valuation by Variety
    const prices = CONFIG.VARIETIES[b.variety]?.indicativePricePerKg || { A: 32, B: 24, C: 16, Reject: 5 };
    const totalWt = b.lot_weight_kg || 3500;
    const totCount = Math.max(1, b.total_count);

    const wtA = Math.round(totalWt * ((b.count_a || 0) / totCount));
    const wtB = Math.round(totalWt * ((b.count_b || 0) / totCount));
    const wtC = Math.round(totalWt * ((b.count_c || 0) / totCount));
    const wtRej = Math.round(totalWt * ((b.count_reject || 0) / totCount));

    const valA = wtA * prices.A;
    const valB = wtB * prices.B;
    const valC = wtC * prices.C;
    const valRej = wtRej * prices.Reject;
    const totalValuation = valA + valB + valC + valRej;

    const yieldBody = document.getElementById('certYieldBody');
    if (yieldBody) {
      yieldBody.innerHTML = `
        <tr>
          <td><span class="badge-grade grade-a">Grade A (Super)</span></td>
          <td>&gt; 60.0 mm</td>
          <td>${b.count_a || 0}</td>
          <td><strong>${(b.pct_a || 0).toFixed(1)}%</strong></td>
          <td>${wtA.toLocaleString()} kg</td>
          <td>₹${prices.A.toFixed(2)}</td>
          <td><strong>₹${valA.toLocaleString()}</strong></td>
        </tr>
        <tr>
          <td><span class="badge-grade grade-b">Grade B (Medium)</span></td>
          <td>50.0 – 60.0 mm</td>
          <td>${b.count_b || 0}</td>
          <td><strong>${(b.pct_b || 0).toFixed(1)}%</strong></td>
          <td>${wtB.toLocaleString()} kg</td>
          <td>₹${prices.B.toFixed(2)}</td>
          <td><strong>₹${valB.toLocaleString()}</strong></td>
        </tr>
        <tr>
          <td><span class="badge-grade grade-c">Grade C (Baby)</span></td>
          <td>35.0 – 50.0 mm</td>
          <td>${b.count_c || 0}</td>
          <td><strong>${(b.pct_c || 0).toFixed(1)}%</strong></td>
          <td>${wtC.toLocaleString()} kg</td>
          <td>₹${prices.C.toFixed(2)}</td>
          <td><strong>₹${valC.toLocaleString()}</strong></td>
        </tr>
        <tr>
          <td><span class="badge-grade grade-reject">Reject (Cull)</span></td>
          <td>&lt; 35.0 mm / Defects</td>
          <td>${b.count_reject || 0}</td>
          <td><strong>${(b.pct_reject || 0).toFixed(1)}%</strong></td>
          <td>${wtRej.toLocaleString()} kg</td>
          <td>₹${prices.Reject.toFixed(2)}</td>
          <td><strong>₹${valRej.toLocaleString()}</strong></td>
        </tr>
      `;
    }

    document.getElementById('certTotalCount').textContent = b.total_count;
    document.getElementById('certTotalWeight').textContent = `${totalWt.toLocaleString()} kg`;
    document.getElementById('certTotalValuation').textContent = `₹${totalValuation.toLocaleString()}`;

    // Safety Alert Box in Certificate
    const safetyBox = document.getElementById('certSafetyBox');
    const safetyTxt = document.getElementById('certSafetyText');
    if (b.mold_incidents > 0) {
      safetyBox.className = 'cert-safety-box flagged';
      safetyTxt.textContent = `WARNING: ${b.mold_incidents} specimen(s) flagged for Aspergillus fungal infection. Affected sub-lot culled. Proceed with segregated shipment.`;
    } else {
      safetyBox.className = 'cert-safety-box';
      safetyTxt.textContent = 'No Aspergillus niger or Aspergillus flavus colony threshold exceedances detected. Lot is officially approved for commercial and export packaging.';
    }

    modal.style.display = 'flex';
  }

  closeCertificateModal() {
    const modal = document.getElementById('modalBatchSummary');
    if (modal) modal.style.display = 'none';
  }

  /**
   * Export all batches to CSV
   */
  async exportAllCsv() {
    const batches = await window.LocalDB.getAllBatches();
    if (!batches || batches.length === 0) {
      alert('No batches available to export.');
      return;
    }

    const headers = ['Batch ID', 'Date', 'Station', 'Supplier', 'Variety', 'Weight (kg)', 'Total Scanned', 'Grade A Count', 'Grade A %', 'Grade B Count', 'Grade B %', 'Grade C Count', 'Grade C %', 'Reject Count', 'Reject %', 'Quality Score', 'Mold Incidents', 'Synced'];
    const rows = batches.map(b => [
      b.batch_id,
      b.timestamp,
      `"${b.station || ''}"`,
      `"${b.supplier || ''}"`,
      b.variety,
      b.lot_weight_kg || 0,
      b.total_count,
      b.count_a || 0,
      b.pct_a || 0,
      b.count_b || 0,
      b.pct_b || 0,
      b.count_c || 0,
      b.pct_c || 0,
      b.count_reject || 0,
      b.pct_reject || 0,
      b.avg_quality_score || b.running_quality_score || 0,
      b.mold_incidents || 0,
      b.synced ? 'Yes' : 'No'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OnioMetrics_Batches_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportCurrentCertCsv() {
    if (!this.currentCertBatch) return;
    const b = this.currentCertBatch;
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Batch ID', b.batch_id],
      ['Date', b.timestamp],
      ['Supplier', b.supplier],
      ['Variety', b.variety],
      ['Total Onions', b.total_count],
      ['Grade A Count', b.count_a],
      ['Grade A %', `${b.pct_a}%`],
      ['Grade B Count', b.count_b],
      ['Grade B %', `${b.pct_b}%`],
      ['Grade C Count', b.count_c],
      ['Grade C %', `${b.pct_c}%`],
      ['Reject Count', b.count_reject],
      ['Reject %', `${b.pct_reject}%`],
      ['Quality Score', `${b.avg_quality_score || b.running_quality_score}%`],
      ['Mold Incidents', b.mold_incidents]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${b.batch_id}_Inspection_Certificate.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportCurrentCertJson() {
    if (!this.currentCertBatch) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.currentCertBatch, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `${this.currentCertBatch.batch_id}_Certificate.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

if (typeof window !== 'undefined') {
  window.BatchReportsUI = new BatchReportsUI();
}
