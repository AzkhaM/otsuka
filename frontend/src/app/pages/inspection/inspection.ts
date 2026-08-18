import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { IconComponent } from '../../shared/icon/icon';

interface P3gkUnit {
  id: number;
  barcodeId: string;
  location: string;
  lastInspection: string;
  nextInspection: string;
  inspector: string;
  status: 'OK' | 'Perlu Inspeksi' | 'Overdue';
}

interface Equipment {
  id: number;
  name: string;
  type: string;
  certNumber: string;
  department: string;
  expiryDate: Date;
}

type CertStatus = 'Kedaluwarsa' | 'Mendesak' | 'Perlu Perhatian' | 'Segera' | 'Aman';

function addDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function isoToday(offsetDays = 0): string {
  const d = addDays(offsetDays);
  return d.toISOString().slice(0, 10);
}

const MOCK_P3GK: P3gkUnit[] = [
  { id: 1, barcodeId: 'P3GK-A-001', location: 'Gudang Bahan Baku', lastInspection: isoToday(-20), nextInspection: isoToday(70), inspector: 'Fajar Nugraha', status: 'OK' },
  { id: 2, barcodeId: 'P3GK-A-002', location: 'Produksi Line A', lastInspection: isoToday(-85), nextInspection: isoToday(5), inspector: 'Fajar Nugraha', status: 'OK' },
  { id: 3, barcodeId: 'P3GK-A-003', location: 'Produksi Line B', lastInspection: isoToday(-95), nextInspection: isoToday(-5), inspector: 'Budi Santoso', status: 'Overdue' },
  { id: 4, barcodeId: 'P3GK-A-004', location: 'Kantor Lantai 2', lastInspection: isoToday(-60), nextInspection: isoToday(30), inspector: 'Azkha Mardiyan Muttaqien', status: 'OK' },
  { id: 5, barcodeId: 'P3GK-A-005', location: 'Ruang Genset', lastInspection: isoToday(-88), nextInspection: isoToday(2), inspector: 'Budi Santoso', status: 'Perlu Inspeksi' },
  { id: 6, barcodeId: 'P3GK-A-006', location: 'Gudang Barang Jadi', lastInspection: isoToday(-30), nextInspection: isoToday(60), inspector: 'Dewi Lestari', status: 'OK' },
];

const MOCK_EQUIPMENT: Equipment[] = [
  { id: 1, name: 'Conveyor Mesin Produksi 1', type: 'Conveyor', certNumber: 'CERT-CNV-2025-011', department: 'Production', expiryDate: addDays(365) },
  { id: 2, name: 'Overhead Crane Gudang 2', type: 'Crane', certNumber: 'CERT-CRN-2025-004', department: 'Warehouse', expiryDate: addDays(30) },
  { id: 3, name: 'Excavator Alat Berat 3', type: 'Alat Berat', certNumber: 'CERT-HVY-2025-009', department: 'Engineering', expiryDate: addDays(1) },
  { id: 4, name: 'Forklift Gudang 1', type: 'Forklift', certNumber: 'CERT-FLT-2025-014', department: 'Warehouse', expiryDate: addDays(-4) },
  { id: 5, name: 'Boiler Utility Plant', type: 'Bejana Tekan', certNumber: 'CERT-BLR-2025-002', department: 'Engineering', expiryDate: addDays(14) },
  { id: 6, name: 'Genset Cadangan 500kVA', type: 'Genset', certNumber: 'CERT-GEN-2025-007', department: 'Engineering', expiryDate: addDays(180) },
  { id: 7, name: 'Lift Barang Gudang 2', type: 'Lift', certNumber: 'CERT-LFT-2025-003', department: 'Warehouse', expiryDate: addDays(90) },
];

@Component({
  selector: 'app-inspection',
  imports: [FormsModule, IconComponent, DatePipe],
  templateUrl: './inspection.html',
  styleUrls: ['../../shared/feature-page.css'],
})
export class Inspection {
  activeTab = signal<'p3gk' | 'certification'>('p3gk');

  // --- P3GK barcode inspection ---
  units = signal<P3gkUnit[]>(MOCK_P3GK);
  scanInput = signal('');
  scanLog = signal<string[]>([]);

  unitCounts = computed(() => {
    const units = this.units();
    return {
      total: units.length,
      ok: units.filter((u) => u.status === 'OK').length,
      perluInspeksi: units.filter((u) => u.status === 'Perlu Inspeksi').length,
      overdue: units.filter((u) => u.status === 'Overdue').length,
    };
  });

  scanBarcode() {
    const code = this.scanInput().trim().toUpperCase();
    if (!code) return;
    const unit = this.units().find((u) => u.barcodeId === code);
    const now = new Date().toLocaleString('id-ID');

    if (!unit) {
      this.scanLog.update((log) => [`[${now}] Barcode "${code}" tidak ditemukan.`, ...log].slice(0, 6));
      this.scanInput.set('');
      return;
    }

    this.units.update((units) =>
      units.map((u) =>
        u.id === unit.id
          ? { ...u, lastInspection: isoToday(), nextInspection: isoToday(90), inspector: 'Azkha Mardiyan Muttaqien', status: 'OK' }
          : u,
      ),
    );
    this.scanLog.update((log) => [`[${now}] ${unit.barcodeId} - ${unit.location} berhasil diinspeksi.`, ...log].slice(0, 6));
    this.scanInput.set('');
  }

  // --- certification monitoring ---
  equipmentRows = computed(() => {
    const today = new Date();
    return [...MOCK_EQUIPMENT]
      .map((eq) => {
        const daysRemaining = Math.round((eq.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...eq, daysRemaining, status: this.certStatus(daysRemaining) };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  });

  certAlertCounts = computed(() => {
    const rows = this.equipmentRows();
    return {
      overdue: rows.filter((r) => r.status === 'Kedaluwarsa').length,
      urgent: rows.filter((r) => r.status === 'Mendesak' || r.status === 'Perlu Perhatian').length,
    };
  });

  private certStatus(daysRemaining: number): CertStatus {
    if (daysRemaining < 0) return 'Kedaluwarsa';
    if (daysRemaining <= 7) return 'Mendesak';
    if (daysRemaining <= 30) return 'Perlu Perhatian';
    if (daysRemaining <= 90) return 'Segera';
    return 'Aman';
  }

  setTab(tab: 'p3gk' | 'certification') {
    this.activeTab.set(tab);
  }
}
