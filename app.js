/**
 * OnioVision Edge — Main Application Controller
 * Handles SPA navigation, station switching, calibration settings, and lifecycle.
 */

class AppController {
  constructor() {
    this.currentPage = 'live-monitor';
    this.init();
  }

  async init() {
    // 1. Initialize Local Database
    if (window.LocalDB) {
      await window.LocalDB.init();
    }

    // 2. Initialize Subsystems
    if (window.SyncManager) {
      await window.SyncManager.updateStatus();
    }

    if (document.getElementById('visionCanvas')) {
      window.liveMonitor = new LiveMonitorUI();
    }

    this.bindNavigation();
    this.bindCalibrationControls();
    this.bindSyncModals();
  }

  bindNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const pageId = e.currentTarget.getAttribute('data-page');
        this.navigateTo(pageId);
      });
    });

    document.getElementById('btnOpenCalibration')?.addEventListener('click', () => {
      this.navigateTo('calibration');
    });

    // Station selector
    document.getElementById('stationSelect')?.addEventListener('change', (e) => {
      const st = e.target.value;
      if (window.liveMonitor && window.liveMonitor.activeBatch) {
        window.liveMonitor.activeBatch.station = e.target.options[e.target.selectedIndex].text;
      }
    });
  }

  navigateTo(pageId) {
    this.currentPage = pageId;

    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      if (tab.getAttribute('data-page') === pageId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Update pages
    document.querySelectorAll('.view-page').forEach(page => {
      if (page.id === `page-${pageId}`) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });

    // Refresh specific page data
    if (pageId === 'batch-reports' && window.BatchReportsUI) {
      window.BatchReportsUI.refreshTable();
    } else if (pageId === 'analytics' && window.AnalyticsViewUI) {
      window.AnalyticsViewUI.renderAllCharts();
    }
  }

  bindCalibrationControls() {
    // Px per mm slider
    const rngPx = document.getElementById('rngPxPerMm');
    const valPx = document.getElementById('valPxPerMm');
    rngPx?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      CONFIG.CALIBRATION.pixelsPerMm = val;
      if (valPx) valPx.textContent = `${val.toFixed(2)} px/mm`;
    });

    // Sprout limit slider
    const rngSprout = document.getElementById('rngSproutLimit');
    const valSprout = document.getElementById('valSproutLimit');
    rngSprout?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      if (valSprout) valSprout.textContent = `${val} mm`;
    });

    // Tracker Gating slider
    const rngTrack = document.getElementById('rngTrackerGating');
    const valTrack = document.getElementById('valTrackerGating');
    rngTrack?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      CONFIG.TRACKER.maxDisplacementPx = val;
      if (valTrack) valTrack.textContent = `${val} px`;
    });

    // Clear Cache button
    document.getElementById('btnClearLocalData')?.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear local cache? This will reset all stored batches.')) {
        await window.LocalDB.clearAll();
        alert('Local database cache cleared. Reloading application.');
        window.location.reload();
      }
    });

    // Export JSON Backup
    document.getElementById('btnExportBackupJson')?.addEventListener('click', async () => {
      const batches = await window.LocalDB.getAllBatches();
      const backup = {
        app: 'OnioMetrics',
        timestamp: new Date().toISOString(),
        batches: batches
      };
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
      const link = document.createElement('a');
      link.setAttribute('href', dataStr);
      link.setAttribute('download', `OnioMetrics_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  bindSyncModals() {
    const btnSyncCloud = document.getElementById('btnSyncCloud');
    const btnForceSync = document.getElementById('btnForceSyncCloud');
    const btnCloseSync = document.getElementById('btnCloseSyncModal');
    const btnFinishSync = document.getElementById('btnFinishSync');
    const modalSync = document.getElementById('modalSync');

    const triggerSync = () => {
      if (window.SyncManager) window.SyncManager.triggerSync();
    };

    btnSyncCloud?.addEventListener('click', triggerSync);
    btnForceSync?.addEventListener('click', triggerSync);

    const closeModal = () => {
      if (modalSync) modalSync.style.display = 'none';
    };

    btnCloseSync?.addEventListener('click', closeModal);
    btnFinishSync?.addEventListener('click', closeModal);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
