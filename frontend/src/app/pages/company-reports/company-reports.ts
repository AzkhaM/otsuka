import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon/icon';

interface HqDocument {
  id: number;
  title: string;
  department: string;
  period: string;
  category: string;
  uploadedBy: string;
  uploadDate: string;
  status: 'Draft' | 'Diajukan' | 'Disetujui';
  fileName: string;
}

const DEPARTMENTS = ['EHS', 'Production', 'Quality Control', 'Warehouse', 'Engineering', 'HR & GA'];

const MOCK_DOCS: HqDocument[] = [
  { id: 1, title: 'Laporan Bulanan Safety Performance', department: 'EHS', period: 'Juli 2026', category: 'Safety Report', uploadedBy: 'Azkha Mardiyan Muttaqien', uploadDate: '2026-08-02', status: 'Disetujui', fileName: 'safety-performance-jul-2026.pdf' },
  { id: 2, title: 'Laporan Produksi Kuartalan', department: 'Production', period: 'Q2 2026', category: 'Production Report', uploadedBy: 'Rina Wulandari', uploadDate: '2026-07-28', status: 'Diajukan', fileName: 'production-q2-2026.xlsx' },
  { id: 3, title: 'Laporan Hasil Uji Kualitas', department: 'Quality Control', period: 'Juli 2026', category: 'Quality Report', uploadedBy: 'Budi Santoso', uploadDate: '2026-08-05', status: 'Diajukan', fileName: 'qc-result-jul-2026.pdf' },
  { id: 4, title: 'Laporan Inventori Gudang', department: 'Warehouse', period: 'Juli 2026', category: 'Inventory Report', uploadedBy: 'Dewi Lestari', uploadDate: '2026-08-01', status: 'Draft', fileName: 'inventory-jul-2026.xlsx' },
  { id: 5, title: 'Laporan Maintenance Mesin', department: 'Engineering', period: 'Juli 2026', category: 'Maintenance Report', uploadedBy: 'Fajar Nugraha', uploadDate: '2026-07-30', status: 'Disetujui', fileName: 'maintenance-jul-2026.pdf' },
  { id: 6, title: 'Laporan Kepatuhan K3', department: 'EHS', period: 'Q2 2026', category: 'Compliance Report', uploadedBy: 'Azkha Mardiyan Muttaqien', uploadDate: '2026-07-15', status: 'Disetujui', fileName: 'k3-compliance-q2-2026.pdf' },
  { id: 7, title: 'Laporan Rekrutmen & Turnover', department: 'HR & GA', period: 'Juli 2026', category: 'HR Report', uploadedBy: 'Siti Aminah', uploadDate: '2026-08-04', status: 'Draft', fileName: 'hr-turnover-jul-2026.xlsx' },
];

@Component({
  selector: 'app-company-reports',
  imports: [FormsModule, IconComponent],
  templateUrl: './company-reports.html',
  styleUrls: ['../../shared/feature-page.css'],
})
export class CompanyReports {
  departments = DEPARTMENTS;
  documents = signal<HqDocument[]>(MOCK_DOCS);

  filterDepartment = signal('');
  filterStatus = signal('');
  search = signal('');
  showForm = signal(false);

  form = this.emptyForm();

  periods = computed(() => [...new Set(this.documents().map((d) => d.period))]);

  filtered = computed(() => {
    const dept = this.filterDepartment();
    const status = this.filterStatus();
    const q = this.search().toLowerCase().trim();
    return this.documents().filter((d) => {
      if (dept && d.department !== dept) return false;
      if (status && d.status !== status) return false;
      if (q && !d.title.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  counts = computed(() => {
    const docs = this.documents();
    return {
      total: docs.length,
      draft: docs.filter((d) => d.status === 'Draft').length,
      diajukan: docs.filter((d) => d.status === 'Diajukan').length,
      disetujui: docs.filter((d) => d.status === 'Disetujui').length,
    };
  });

  private emptyForm() {
    return { title: '', department: DEPARTMENTS[0], period: '', category: '', fileName: '' };
  }

  toggleForm() {
    this.showForm.update((v) => !v);
    this.form = this.emptyForm();
  }

  submit() {
    if (!this.form.title.trim() || !this.form.fileName.trim()) return;
    const next: HqDocument = {
      id: Math.max(0, ...this.documents().map((d) => d.id)) + 1,
      title: this.form.title,
      department: this.form.department,
      period: this.form.period || '-',
      category: this.form.category || 'Lainnya',
      uploadedBy: 'Azkha Mardiyan Muttaqien',
      uploadDate: new Date().toISOString().slice(0, 10),
      status: 'Draft',
      fileName: this.form.fileName,
    };
    this.documents.update((docs) => [next, ...docs]);
    this.showForm.set(false);
    this.form = this.emptyForm();
  }

  remove(id: number) {
    this.documents.update((docs) => docs.filter((d) => d.id !== id));
  }
}
