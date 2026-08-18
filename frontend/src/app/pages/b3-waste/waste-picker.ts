import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { MASTER_DEPARTEMEN, LAINNYA_DESKRIPSI } from './b3-waste-data';
import { type DepartemenLimbah, type ItemLimbah, masaSimpanHari } from './b3-waste-model';

export interface PilihanLimbah {
  items: ItemLimbah[];
  lainnyaAktif: boolean;
  lainnya: string;
}

// deptId -> sumberKode -> kode jenis[]. Dept dipilih <=> key ada; sumber dibuka <=> key anak ada.
type Seleksi = Record<string, Record<string, string[]>>;

@Component({
  selector: 'app-waste-picker',
  templateUrl: './waste-picker.html',
  styleUrls: ['./waste-picker.css'],
})
export class WastePicker {
  departemen = MASTER_DEPARTEMEN;
  lainnyaDeskripsi = LAINNYA_DESKRIPSI;

  nilaiAwal = input<PilihanLimbah | null>(null);
  pilihanChange = output<PilihanLimbah>();

  private seleksi = signal<Seleksi>({});
  lainnyaAktif = signal(false);
  lainnyaTeks = signal('');

  totalDipilih = computed(() => {
    let jenis = 0;
    const sumberDipakai = new Set<string>();
    for (const sumberMap of Object.values(this.seleksi())) {
      for (const [sumberKode, kodeList] of Object.entries(sumberMap)) {
        if (kodeList.length > 0) sumberDipakai.add(sumberKode);
        jenis += kodeList.length;
      }
    }
    return { jenis, sumber: sumberDipakai.size };
  });

  constructor() {
    effect(() => {
      const v = this.nilaiAwal();
      untracked(() => this.muatDari(v));
    });
  }

  deptDicentang(deptId: string): boolean {
    return deptId in this.seleksi();
  }

  sumberDicentang(deptId: string, sumberKode: string): boolean {
    return sumberKode in (this.seleksi()[deptId] ?? {});
  }

  jenisDicentang(deptId: string, sumberKode: string, kode: string): boolean {
    return (this.seleksi()[deptId]?.[sumberKode] ?? []).includes(kode);
  }

  jenisTerpilihCount(deptId: string, sumberKode: string): number {
    return (this.seleksi()[deptId]?.[sumberKode] ?? []).length;
  }

  toggleDept(dept: DepartemenLimbah): void {
    const cur = this.seleksi();
    if (dept.id in cur) {
      const { [dept.id]: _dihapus, ...sisa } = cur;
      this.seleksi.set(sisa);
    } else {
      const sumberAwal = dept.sumber.length === 1 ? { [dept.sumber[0].kode]: [] } : {};
      this.seleksi.set({ ...cur, [dept.id]: sumberAwal });
    }
    this.emit();
  }

  toggleSumber(deptId: string, sumberKode: string): void {
    const cur = this.seleksi();
    const deptSel = cur[deptId] ?? {};
    if (sumberKode in deptSel) {
      const { [sumberKode]: _dihapus, ...sisa } = deptSel;
      this.seleksi.set({ ...cur, [deptId]: sisa });
    } else {
      this.seleksi.set({ ...cur, [deptId]: { ...deptSel, [sumberKode]: [] } });
    }
    this.emit();
  }

  toggleJenis(deptId: string, sumberKode: string, kode: string): void {
    const cur = this.seleksi();
    const deptSel = cur[deptId] ?? {};
    const list = deptSel[sumberKode] ?? [];
    const next = list.includes(kode) ? list.filter((k) => k !== kode) : [...list, kode];
    this.seleksi.set({ ...cur, [deptId]: { ...deptSel, [sumberKode]: next } });
    this.emit();
  }

  toggleLainnya(): void {
    const aktif = !this.lainnyaAktif();
    this.lainnyaAktif.set(aktif);
    if (!aktif) this.lainnyaTeks.set('');
    this.emit();
  }

  onLainnyaTeks(teks: string): void {
    this.lainnyaTeks.set(teks);
    this.emit();
  }

  private muatDari(v: PilihanLimbah | null): void {
    if (!v || v.items.length === 0) {
      this.seleksi.set({});
    } else {
      const seleksi: Seleksi = {};
      for (const item of v.items) {
        const sumberMap = (seleksi[item.departemenId] ??= {});
        const list = (sumberMap[item.sumber] ??= []);
        list.push(item.kode);
      }
      this.seleksi.set(seleksi);
    }
    this.lainnyaAktif.set(v?.lainnyaAktif ?? false);
    this.lainnyaTeks.set(v?.lainnya ?? '');
    this.emit();
  }

  private buatItems(): ItemLimbah[] {
    const items: ItemLimbah[] = [];
    for (const [deptId, sumberMap] of Object.entries(this.seleksi())) {
      const dept = this.departemen.find((d) => d.id === deptId);
      if (!dept) continue;
      for (const [sumberKode, kodeList] of Object.entries(sumberMap)) {
        const sumber = dept.sumber.find((s) => s.kode === sumberKode);
        if (!sumber) continue;
        for (const kode of kodeList) {
          const jenis = sumber.jenis.find((j) => j.kode === kode);
          if (!jenis) continue;
          items.push({
            id: `${deptId}-${sumberKode}-${kode}`,
            departemenId: deptId,
            departemen: dept.nama,
            sumber: sumberKode,
            jenis: jenis.nama,
            kode,
            masaSimpanHari: masaSimpanHari(kode),
            beratKg: null,
            maksSimpan: null,
          });
        }
      }
    }
    return items;
  }

  private emit(): void {
    this.pilihanChange.emit({
      items: this.buatItems(),
      lainnyaAktif: this.lainnyaAktif(),
      lainnya: this.lainnyaAktif() ? this.lainnyaTeks() : '',
    });
  }
}
