/**
 * OnioMetrics — Local Database (IndexedDB v2.0)
 * 100% offline edge persistence for batch records, specimen telemetry, and calibrations.
 */

class LocalDB {
  constructor() {
    this.dbName = 'OnioMetricsDB';
    this.dbVersion = 2;
    this.db = null;
    this.isReady = false;
  }

  /**
   * Initialize IndexedDB database and object stores
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Batches store
        if (!db.objectStoreNames.contains('batches')) {
          const batchStore = db.createObjectStore('batches', { keyPath: 'batch_id' });
          batchStore.createIndex('timestamp', 'timestamp', { unique: false });
          batchStore.createIndex('synced', 'synced', { unique: false });
        }

        // Specimens telemetry store
        if (!db.objectStoreNames.contains('specimens')) {
          const specStore = db.createObjectStore('specimens', { keyPath: 'onion_id' });
          specStore.createIndex('batch_id', 'batch_id', { unique: false });
          specStore.createIndex('grade', 'grade', { unique: false });
        }

        // System Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        this.isReady = true;
        // Check if seed data exists; if empty, populate realistic past batches
        await this._seedInitialDataIfEmpty();
        resolve(this);
      };

      request.onerror = (event) => {
        console.warn('IndexedDB failed to open, falling back to in-memory store:', event.target.error);
        this._initFallbackMemory();
        resolve(this);
      };
    });
  }

  _initFallbackMemory() {
    this.fallbackStore = { batches: new Map(), specimens: new Map() };
    this.isReady = true;
  }

  /**
   * Save or update a batch record
   */
  async saveBatch(batchRecord) {
    if (!this.db) {
      this.fallbackStore.batches.set(batchRecord.batch_id, batchRecord);
      return batchRecord;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['batches'], 'readwrite');
      const store = tx.objectStore('batches');
      const req = store.put(batchRecord);
      req.onsuccess = () => resolve(batchRecord);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all past batches
   */
  async getAllBatches() {
    if (!this.db) {
      return Array.from(this.fallbackStore.batches.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['batches'], 'readonly');
      const store = tx.objectStore('batches');
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result || [];
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Save specimen telemetry record
   */
  async saveSpecimen(specimen) {
    if (!this.db) {
      this.fallbackStore.specimens.set(specimen.onion_id, specimen);
      return specimen;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['specimens'], 'readwrite');
      const store = tx.objectStore('specimens');
      const req = store.put(specimen);
      req.onsuccess = () => resolve(specimen);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all specimens for a batch
   */
  async getSpecimensForBatch(batchId) {
    if (!this.db) {
      return Array.from(this.fallbackStore.specimens.values()).filter(s => s.batch_id === batchId);
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['specimens'], 'readonly');
      const store = tx.objectStore('specimens');
      const index = store.index('batch_id');
      const req = index.getAll(batchId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Seed curated past batches if storage is newly initialized
   */
  async _seedInitialDataIfEmpty() {
    const existing = await this.getAllBatches();
    if (existing && existing.length > 0) return;

    const seedBatches = [
      {
        batch_id: 'BATCH-2026-0907-A',
        timestamp: '2026-09-07T10:30:00Z',
        station: 'Lasalgaon APMC — Line 01 (Export)',
        supplier: 'Sahyadri Farmer Producer Co.',
        variety: 'Red Nasik',
        lot_weight_kg: 3500,
        total_count: 248,
        count_a: 142,
        count_b: 68,
        count_c: 26,
        count_reject: 12,
        pct_a: 57.3,
        pct_b: 27.4,
        pct_c: 10.5,
        pct_reject: 4.8,
        avg_quality_score: 84.6,
        mold_incidents: 1,
        synced: true,
        operator: 'Inspector R. Patil (#409)'
      },
      {
        batch_id: 'BATCH-2026-0906-B',
        timestamp: '2026-09-06T14:15:00Z',
        station: 'Pimpalgaon Hub — Sizing Line B',
        supplier: 'Kisan Agro Cooperative',
        variety: 'Red Nasik',
        lot_weight_kg: 4200,
        total_count: 312,
        count_a: 204,
        count_b: 74,
        count_c: 24,
        count_reject: 10,
        pct_a: 65.4,
        pct_b: 23.7,
        pct_c: 7.7,
        pct_reject: 3.2,
        avg_quality_score: 88.2,
        mold_incidents: 0,
        synced: true,
        operator: 'Inspector S. Shinde (#214)'
      },
      {
        batch_id: 'BATCH-2026-0905-C',
        timestamp: '2026-09-05T09:45:00Z',
        station: 'Nashik Cold Terminal — Intake Hub',
        supplier: 'Nashik Valley Farms',
        variety: 'White Onion',
        lot_weight_kg: 2800,
        total_count: 195,
        count_a: 98,
        count_b: 62,
        count_c: 25,
        count_reject: 10,
        pct_a: 50.3,
        pct_b: 31.8,
        pct_c: 12.8,
        pct_reject: 5.1,
        avg_quality_score: 81.5,
        mold_incidents: 2,
        synced: false,
        operator: 'Inspector V. Jadhav (#108)'
      },
      {
        batch_id: 'BATCH-2026-0904-D',
        timestamp: '2026-09-04T16:20:00Z',
        station: 'Solapur Mandi — Packhouse 3',
        supplier: 'Godavari Organic Cluster',
        variety: 'Yellow Spanish',
        lot_weight_kg: 3100,
        total_count: 220,
        count_a: 106,
        count_b: 75,
        count_c: 28,
        count_reject: 11,
        pct_a: 48.2,
        pct_b: 34.1,
        pct_c: 12.7,
        pct_reject: 5.0,
        avg_quality_score: 79.8,
        mold_incidents: 0,
        synced: false,
        operator: 'Inspector M. Gaikwad (#312)'
      }
    ];

    for (const b of seedBatches) {
      await this.saveBatch(b);
    }
  }

  /**
   * Clear database cache
   */
  async clearAll() {
    if (!this.db) {
      this.fallbackStore.batches.clear();
      this.fallbackStore.specimens.clear();
      return;
    }
    return new Promise((resolve) => {
      const tx = this.db.transaction(['batches', 'specimens'], 'readwrite');
      tx.objectStore('batches').clear();
      tx.objectStore('specimens').clear();
      tx.oncomplete = () => resolve();
    });
  }
}

if (typeof window !== 'undefined') {
  window.LocalDB = new LocalDB();
}
