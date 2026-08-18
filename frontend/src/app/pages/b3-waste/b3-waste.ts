import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon/icon';
import { BADGE_STATUS, LABEL_STATUS, PENGGUNA, bangunSeed } from './b3-waste-data';
import {
  type Aksi,
  type HeaderPengajuan,
  type IsiTimbang,
  type Pengajuan,
  type Peran,
  aksiUntuk,
  formatTanggal,
  formatWaktu,
  jalankanAksi,
} from './b3-waste-model';
import {
  type BlokLogbook,
  type Neraca,
  bangunLogbook,
  hitungNeraca,
  kelompokkanLogbook,
  pratinjauPengajuan,
} from './b3-waste-logbook';
import { B3Dokumen } from './b3-dokumen';
import { WastePicker, type PilihanLimbah } from './waste-picker';

// Amandemen 2 poin 7: tab 'logbook'/'neraca' DIHAPUS - dokumen sekarang digabung ke
// dalam detail satu pengajuan (lihat template, blok `@if (terpilih(); as p)`).
type Tab = 'ajukan' | 'daftar' | 'notifikasi';

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowIsoDateTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${todayIso()}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function headerKosong(): HeaderPengajuan {
  return { lokasi: '', pelaksana: '', diajukanOleh: '', tanggalPengajuan: todayIso(), usulanTanggalBuang: '' };
}

function pilihanKosong(): PilihanLimbah {
  return { items: [], lainnyaAktif: false, lainnya: '' };
}

function timbangKosong(): IsiTimbang {
  return { berat: {}, koreksiJenis: {}, tanggalTimbang: todayIso(), tanggalBuang: '', tujuan: '', noManifest: '', pernyataan: false };
}

@Component({
  selector: 'app-b3-waste',
  imports: [FormsModule, IconComponent, WastePicker, B3Dokumen],
  templateUrl: './b3-waste.html',
  styleUrls: ['../../shared/feature-page.css', './b3-waste.css'],
})
export class B3Waste {
  protected readonly formatTanggal = formatTanggal;
  protected readonly formatWaktu = formatWaktu;
  protected readonly labelStatus = (s: Pengajuan['status']) => LABEL_STATUS[s];
  protected readonly badgeStatus = (s: Pengajuan['status']) => BADGE_STATUS[s];

  private readonly seed = bangunSeed();
  private nextId = this.seed.nextId;
  private nextNomor = this.seed.nextNomor;
  private nextNotifId = this.seed.nextNotifId;

  peranAktif = signal<Peran>('USER');
  tabAktif = signal<Tab>('daftar');
  pengajuan = signal<Pengajuan[]>(this.seed.pengajuan);
  notifikasi = signal(this.seed.notifikasi);
  pilihanId = signal<number | null>(null);
  errors = signal<string[]>([]);
  infoAksi = signal('');
  ajukanUlangId = signal<number | null>(null);

  formHeader: HeaderPengajuan = headerKosong();
  formPilihan: PilihanLimbah = pilihanKosong();
  // Amandemen 2 poin 4: perkiraan berat opsional Tahap 1, diketik user SETELAH memilih
  // limbah (di luar WastePicker, yang tetap tidak disentuh). Buffer terpisah dari
  // formPilihan.items (yang selalu di-recreate dengan beratKg=null oleh WastePicker
  // setiap emit) - dikunci per ItemLimbah.id, jadi bertahan lintas toggle checklist.
  formBeratPerkiraan: Record<string, number | null> = {};
  formAlasan = signal('');
  formJadwal = { tanggal: '', jam: '' };
  formTimbang: IsiTimbang = timbangKosong();

  penggunaAktif = computed(() => PENGGUNA[this.peranAktif()]);
  terpilih = computed(() => this.pengajuan().find((p) => p.id === this.pilihanId()) ?? null);
  aksiTersedia = computed(() => aksiUntuk(this.terpilih()?.status, this.peranAktif()));
  notifikasiUrut = computed(() => [...this.notifikasi()].reverse());

  // Amandemen 2 poin 9: "editable" = status APPROVED + peran aktif PIC + belum submit
  // timbang - sama persis kondisi yang sudah dijaga aksiTersedia() (matriks 3.3 babak 1),
  // jadi tinggal dibaca ulang, bukan dihitung dua kali.
  editableSekarang = computed(() => this.aksiTersedia().includes('PIC_WEIGH'));

  antrean = computed(() => {
    const peran = this.peranAktif();
    const list = this.pengajuan();
    if (peran === 'USER') return list.filter((p) => p.status === 'REJ_SUP' || p.status === 'REJ_PIC');
    if (peran === 'SUPERVISOR') return list.filter((p) => p.status === 'WAIT_SUP');
    return list.filter((p) => p.status === 'WAIT_PIC' || p.status === 'APPROVED');
  });

  statistik = computed(() => {
    const list = this.pengajuan();
    return {
      total: list.length,
      menungguSup: list.filter((p) => p.status === 'WAIT_SUP').length,
      menungguPic: list.filter((p) => p.status === 'WAIT_PIC').length,
      terjadwal: list.filter((p) => p.status === 'APPROVED').length,
      selesai: list.filter((p) => p.status === 'WEIGHED').length,
    };
  });

  nilaiAwalPicker = computed<PilihanLimbah | null>(() => {
    const id = this.ajukanUlangId();
    if (id === null) return null;
    const p = this.pengajuan().find((x) => x.id === id);
    if (!p) return null;
    return { items: p.items, lainnyaAktif: p.lainnya !== '', lainnya: p.lainnya };
  });

  nomorAjukanUlang = computed(() => this.pengajuan().find((p) => p.id === this.ajukanUlangId())?.nomor ?? '');
  alasanTolakSebelumnya = computed(() => {
    const p = this.pengajuan().find((x) => x.id === this.ajukanUlangId());
    return p?.supervisi?.alasanTolak || p?.pic?.alasanTolak || '';
  });

  totalBerat(p: Pengajuan): number {
    return Math.round(p.items.reduce((s, it) => s + (it.beratKg ?? 0), 0) * 100) / 100;
  }

  // --- Dokumen (Amandemen 2 poin 7/8/9): Logbook & Neraca digabung ke detail SATU
  // pengajuan, bukan lagi tab global lintas-semua-pengajuan (P-1 tetap dijaga: keduanya
  // proyeksi murni dari bangunLogbook([p]), nol signal baru). Saat editableSekarang(),
  // dipakai draft "seandainya divalidasi sekarang" (pratinjauPengajuan) yang dibaca dari
  // formTimbang - satu-satunya buffer edit, sama persis kontrak 18.3.
  private entriesUntuk(p: Pengajuan) {
    return this.editableSekarang()
      ? bangunLogbook([pratinjauPengajuan(p, this.formTimbang, this.penggunaAktif().nama)])
      : bangunLogbook([p]);
  }

  dokBlok(p: Pengajuan): BlokLogbook[] {
    return kelompokkanLogbook(this.entriesUntuk(p));
  }

  dokNeraca(p: Pengajuan): Neraca {
    return hitungNeraca(this.entriesUntuk(p));
  }

  onDokBerat(e: { itemId: string; value: number | null }): void {
    this.formTimbang.berat = { ...this.formTimbang.berat, [e.itemId]: e.value };
  }

  onDokJenis(e: { itemId: string; jenis: string; kode: string }): void {
    this.formTimbang.koreksiJenis = { ...(this.formTimbang.koreksiJenis ?? {}), [e.itemId]: { jenis: e.jenis, kode: e.kode } };
  }

  gantiPeran(p: Peran): void {
    this.peranAktif.set(p);
    this.errors.set([]);
    if (this.tabAktif() === 'ajukan' && p !== 'USER') this.tabAktif.set('daftar');
    // Ganti peran TIDAK menyentuh pilihanId (AC-30) - bila jadi PIC sambil masih di
    // detail pengajuan APPROVED, pastikan panel timbang yang baru muncul sudah pre-fill.
    if (p === 'PIC') {
      const t = this.terpilih();
      if (t && t.status === 'APPROVED') this.pastikanBeratTerisi(t);
    }
  }

  bukaTab(t: Tab): void {
    this.tabAktif.set(t);
    this.errors.set([]);
    if (t === 'daftar') this.pilihanId.set(null);
    if (t === 'ajukan' && this.ajukanUlangId() === null) {
      this.formHeader = headerKosong();
      this.formPilihan = pilihanKosong();
      this.formBeratPerkiraan = {};
    }
  }

  bukaDetail(id: number): void {
    this.pilihanId.set(id);
    this.tabAktif.set('daftar');
    this.resetFormAksi();
    // Amandemen 2 poin 5: form berat PIC WAJIB pre-fill dari perkiraan Tahap 1
    // (item.beratKg), bukan mulai dari kosong - PIC mengoreksi, bukan mengetik ulang.
    const p = this.pengajuan().find((x) => x.id === id);
    if (p) this.pastikanBeratTerisi(p);
  }

  /** Amandemen 2 poin 5 (lanjutan): idempotent - hanya mengisi key yang BELUM pernah
   *  disentuh (absen di formTimbang.berat), tidak pernah menimpa koreksi PIC yang sudah
   *  diketik. Dipanggil dari SETIAP jalur yang bisa membuat panel Timbang & Validasi
   *  jadi terlihat: buka detail langsung (bukaDetail), tetap di halaman yang sama saat
   *  PIC baru menyetujui+jadwal (setujuiPic), atau tetap di halaman yang sama sambil
   *  ganti peran ke PIC (gantiPeran) - status/role bisa berubah tanpa navigasi ulang. */
  private pastikanBeratTerisi(p: Pengajuan): void {
    const berat = { ...this.formTimbang.berat };
    let berubah = false;
    for (const it of p.items) {
      if (!(it.id in berat)) {
        berat[it.id] = it.beratKg;
        berubah = true;
      }
    }
    if (berubah) this.formTimbang.berat = berat;
  }

  kembaliKeDaftar(): void {
    this.pilihanId.set(null);
  }

  mulaiAjukanUlang(p: Pengajuan): void {
    this.ajukanUlangId.set(p.id);
    this.formHeader = { ...p.header };
    this.formBeratPerkiraan = Object.fromEntries(p.items.map((it) => [it.id, it.beratKg]));
    this.errors.set([]);
    this.tabAktif.set('ajukan');
  }

  batalAjukanUlang(): void {
    this.ajukanUlangId.set(null);
    this.formHeader = headerKosong();
    this.formBeratPerkiraan = {};
    this.errors.set([]);
    this.tabAktif.set('daftar');
  }

  ajukan(): void {
    const items = this.formPilihan.items.map((it) => ({ ...it, beratKg: this.formBeratPerkiraan[it.id] ?? null }));
    const isi = { header: { ...this.formHeader }, items, lainnya: this.formPilihan.lainnya, lainnyaAktif: this.formPilihan.lainnyaAktif };
    const ok = this.terapkan({ tipe: 'SUBMIT', oleh: this.penggunaAktif(), isi }, null);
    if (ok) {
      const baru = this.pengajuan()[this.pengajuan().length - 1];
      this.formHeader = headerKosong();
      this.formBeratPerkiraan = {};
      this.pilihanId.set(baru.id);
      this.tabAktif.set('daftar');
    }
  }

  ajukanUlang(): void {
    const target = this.pengajuan().find((p) => p.id === this.ajukanUlangId());
    if (!target) return;
    const items = this.formPilihan.items.map((it) => ({ ...it, beratKg: this.formBeratPerkiraan[it.id] ?? null }));
    const isi = { header: { ...this.formHeader }, items, lainnya: this.formPilihan.lainnya, lainnyaAktif: this.formPilihan.lainnyaAktif };
    const ok = this.terapkan({ tipe: 'RESUBMIT', oleh: this.penggunaAktif(), isi }, target);
    if (ok) {
      this.ajukanUlangId.set(null);
      this.formHeader = headerKosong();
      this.formBeratPerkiraan = {};
      this.pilihanId.set(target.id);
      this.tabAktif.set('daftar');
    }
  }

  setujuiSupervisor(): void {
    const p = this.terpilih();
    if (!p) return;
    this.terapkan({ tipe: 'SUP_APPROVE', oleh: this.penggunaAktif() }, p);
  }

  tolakSupervisor(): void {
    const p = this.terpilih();
    if (!p) return;
    if (this.terapkan({ tipe: 'SUP_REJECT', oleh: this.penggunaAktif(), alasan: this.formAlasan() }, p)) this.formAlasan.set('');
  }

  setujuiPic(): void {
    const p = this.terpilih();
    if (!p) return;
    if (this.terapkan({ tipe: 'PIC_APPROVE', oleh: this.penggunaAktif(), tanggalJadwal: this.formJadwal.tanggal, jamJadwal: this.formJadwal.jam }, p)) {
      this.formJadwal = { tanggal: '', jam: '' };
      // Status baru saja jadi APPROVED tanpa navigasi ulang (pilihanId tidak berubah) -
      // panel Timbang & Validasi langsung tampil di halaman yang sama, jadi pre-fill di sini juga.
      this.pastikanBeratTerisi(p);
    }
  }

  tolakPic(): void {
    const p = this.terpilih();
    if (!p) return;
    if (this.terapkan({ tipe: 'PIC_REJECT', oleh: this.penggunaAktif(), alasan: this.formAlasan() }, p)) this.formAlasan.set('');
  }

  kirimTimbang(): void {
    const p = this.terpilih();
    if (!p) return;
    const jumlahItem = p.items.length;
    if (this.terapkan({ tipe: 'PIC_WEIGH', oleh: this.penggunaAktif(), isi: this.formTimbang }, p)) {
      this.formTimbang = timbangKosong();
      this.infoAksi.update((s) => `${s} - ${jumlahItem} baris ditambahkan ke Logbook & Neraca.`);
    }
  }

  private resetFormAksi(): void {
    this.errors.set([]);
    this.infoAksi.set('');
    this.formAlasan.set('');
    this.formJadwal = { tanggal: '', jam: '' };
    this.formTimbang = timbangKosong();
  }

  /** Satu-satunya tempat yang boleh memanggil jalankanAksi() dari komponen ini. */
  private terapkan(aksi: Aksi, target: Pengajuan | null): boolean {
    const hasil = jalankanAksi(target, aksi, {
      waktu: nowIsoDateTime(),
      id: this.nextId,
      nomor: `PLB3/2026/${String(this.nextNomor).padStart(4, '0')}`,
      notifIdAwal: this.nextNotifId,
      pengguna: PENGGUNA,
    });
    if (!hasil.ok) {
      this.errors.set(hasil.errors);
      return false;
    }
    this.errors.set([]);
    if (target === null) {
      this.pengajuan.update((list) => [...list, hasil.pengajuan]);
      this.nextId++;
      this.nextNomor++;
    } else {
      this.pengajuan.update((list) => list.map((p) => (p.id === hasil.pengajuan.id ? hasil.pengajuan : p)));
    }
    this.notifikasi.update((list) => [...list, ...hasil.notifikasi]);
    this.nextNotifId += hasil.notifikasi.length;
    this.infoAksi.set(`${hasil.notifikasi.length} notifikasi terkirim: ${hasil.notifikasi.map((n) => n.kepadaNama).join(', ')}`);
    return true;
  }
}
