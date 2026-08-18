import { Component, ViewEncapsulation, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DOK_LOGBOOK, DOK_NERACA, MASTER_DEPARTEMEN, PENANDATANGAN, TEMBUSAN } from './b3-waste-data';
import { type ItemLimbah, type JenisLimbah, formatTanggal } from './b3-waste-model';
import { type BlokLogbook, type LogbookEntry, type Neraca, formatKg, formatPersen, formatTon, halamanLogbook } from './b3-waste-logbook';
import { LOGO_OTSUKA_DATA_URI } from './logo-otsuka';

/**
 * Komponen presentational: replika cetak Logbook (FR/K3L/006/01) & Neraca (FR/K3L/006/02/1).
 * Tidak menghitung apa pun - seluruh data datang dari `blok`/`neraca` (dihitung di induk lewat
 * bangunLogbook()/kelompokkanLogbook()/hitungNeraca(), lihat P-1 02-architecture.md #14).
 *
 * Amandemen 2 poin 8/9: dipakai LANGSUNG di detail satu pengajuan (bukan lagi tab global), dan
 * mendapat mode EDITABLE - saat status APPROVED + role aktif PIC (before submit timbang), sel
 * "Jenis" & "Jumlah Masuk (kg)" pada tabel Logbook menjadi input/select yang menuliskan balik
 * lewat `beratChange`/`jenisChange`. Komponen ini TETAP tidak punya storage sendiri: nilai yang
 * ditampilkan saat editable datang dari `blok`/`beratMap` yang disuntik induk (buffer formTimbang),
 * bukan disalin ke state lokal di sini.
 *
 * ViewEncapsulation.None WAJIB (ADR-7): satu-satunya cara aturan `body.b3-printing *`
 * di b3-dokumen.css bisa menjangkau sidebar/topbar aplikasi (file `layout/**` masuk
 * blacklist scope, tidak boleh disentuh). Konsekuensinya SELURUH selektor di
 * b3-dokumen.css wajib bernamespace (`.b3-doc`/`.doc-*`/`body.b3-printing`) - tidak
 * boleh ada selektor elemen telanjang (R-9).
 *
 * Amandemen 3 #2/#3: Logbook tidak lagi satu dokumen per `BlokLogbook` (per kode) -
 * `halaman()` di bawah memanggil `halamanLogbook(blok())` (fungsi murni di
 * b3-waste-logbook.ts) untuk menggabungkan seluruh blok jadi satu daftar baris flat
 * terurut lalu memecahnya per 20 baris. Ini TETAP nol signal baru (P-1): `halaman()`
 * hanya turunan langsung dari input `blok` yang sudah ada, dihitung ulang tiap render
 * seperti `jenisTersedia()` - bukan disimpan.
 *
 * Amandemen 4 #1/#3: logo asli (`LOGO_OTSUKA_DATA_URI`) dipasang di sel brand header.
 * Ditambah SATU signal baru `sedangCetak` (pengecualian sadar terhadap P-1 "nol signal
 * baru" - dibutuhkan justru karena TIDAK boleh ada state lain yang bisa membocorkan
 * mode editable ke hasil cetak): dipaksa `true` sesaat sebelum `window.print()`, dibaca
 * lewat `editableEfektif()` (bukan `editable()` mentah) di TEMPLATE supaya sel Jenis/
 * Berat SELALU jatuh ke cabang readonly saat mencetak, apa pun status `editable` di layar.
 */
@Component({
  selector: 'app-b3-dokumen',
  imports: [FormsModule],
  templateUrl: './b3-dokumen.html',
  styleUrls: ['./b3-dokumen.css'],
  encapsulation: ViewEncapsulation.None,
})
export class B3Dokumen {
  protected readonly dokLogbook = DOK_LOGBOOK;
  protected readonly dokNeraca = DOK_NERACA;
  protected readonly penandatangan = PENANDATANGAN;
  protected readonly tembusan = TEMBUSAN;
  protected readonly formatTanggal = formatTanggal;
  protected readonly formatTon = formatTon;
  protected readonly formatKg = formatKg;
  protected readonly formatPersen = formatPersen;
  protected readonly logoOtsuka = LOGO_OTSUKA_DATA_URI;

  mode = input.required<'logbook' | 'neraca'>();
  blok = input<BlokLogbook[]>([]);
  neraca = input<Neraca | null>(null);
  /** Tampilkan tombol "Unduh PDF" + kalimat penjelas. Dimatikan pada panggilan kedua
   *  (mode neraca) saat logbook & neraca dirender berdampingan untuk satu pengajuan,
   *  supaya tidak ada 2 tombol identik (keduanya tetap mencetak seluruh `.b3-doc` di DOM). */
  toolbar = input<boolean>(true);

  /** Ronde 5 fix BLOCKER: Neraca hanya boleh dipaksa mulai di kertas baru (break-before)
   *  bila Logbook yang dicetak sebelumnya (mode='logbook', pengajuan yang sama) benar-benar
   *  punya `.b3-doc` tercetak - kalau tidak (status pra-WEIGHED, blok kosong -> Logbook
   *  jatuh ke .doc-empty), forced break itu sendiri menghasilkan satu halaman kosong.
   *  Induk (b3-waste.ts) yang tahu isi dokBlok(p) menyuntik nilai ini; default true supaya
   *  perilaku lama (selalu break) tetap berlaku bila pemanggil tidak eksplisit set. */
  breakBefore = input<boolean>(true);

  // --- Amandemen 2 poin 9: editability menyatu dengan status (satu tampilan, dua mode) ---
  editable = input<boolean>(false);
  /** Item asli pengajuan - dipakai HANYA saat editable, untuk lookup opsi jenis per baris. */
  items = input<ItemLimbah[]>([]);
  /** Buffer berat PIC saat ini (formTimbang.berat induk) - nilai input saat editable. */
  beratMap = input<Record<string, number | null>>({});

  beratChange = output<{ itemId: string; value: number | null }>();
  jenisChange = output<{ itemId: string; jenis: string; kode: string }>();

  /** Amandemen 4 #3: `true` HANYA selama window.print() berlangsung (lihat cetak()). */
  private readonly sedangCetak = signal(false);
  /** WAJIB dipakai template (bukan `editable()` mentah) untuk keputusan render sel
   *  Jenis/Berat - override paksa jadi readonly selama cetak, terlepas status di layar. */
  protected readonly editableEfektif = computed(() => this.editable() && !this.sedangCetak());

  /** Amandemen 3 #3: kapasitas tetap 20 baris per lembar Logbook (kapasitas contoh asli). */
  protected readonly KAPASITAS_LOGBOOK = 20;

  /** Satu tabel gabungan per halaman (bukan lagi per-kode) - lihat komentar kelas di atas. */
  halaman(): LogbookEntry[][] {
    return halamanLogbook(this.blok(), this.KAPASITAS_LOGBOOK);
  }

  /** Baris kosong pengisi sampai genap `KAPASITAS_LOGBOOK` - urusan template, bukan data (#3). */
  padding(jumlahBaris: number): number[] {
    return Array.from({ length: Math.max(0, this.KAPASITAS_LOGBOOK - jumlahBaris) });
  }

  jenisTersedia(itemId: string): JenisLimbah[] {
    const it = this.items().find((x) => x.id === itemId);
    if (!it) return [];
    const dept = MASTER_DEPARTEMEN.find((d) => d.id === it.departemenId);
    return dept?.sumber.find((s) => s.kode === it.sumber)?.jenis ?? [];
  }

  onJenisSelect(itemId: string, kode: string): void {
    const jenis = this.jenisTersedia(itemId).find((j) => j.kode === kode);
    if (!jenis) return;
    this.jenisChange.emit({ itemId, jenis: jenis.nama, kode: jenis.kode });
  }

  /** window.print() native + gerbang class body.b3-printing (Bagian 20). Kelas dilepas
   *  lewat event afterprint, BUKAN sinkron setelah print() (sebagian browser tidak
   *  memblokir print() -> halaman tercetak kosong bila dilepas terlalu cepat).
   *
   *  Amandemen 4 #3: `sedangCetak` di-set SEBELUM print() supaya `editableEfektif()`
   *  jatuh ke `false` (readonly) - tapi zoneless: signal write tidak sinkron ke DOM,
   *  jadi window.print() TIDAK BOLEH dipanggil di baris berikutnya begitu saja (race
   *  condition: kotak input/select sempat ke-print sebelum Angular selesai patch DOM
   *  jadi teks polos). Dua requestAnimationFrame berantai adalah jaminan minimal yang
   *  benar: RAF pertama baru jalan SEBELUM browser melakukan paint berikutnya (cukup
   *  untuk menjadwalkan CD zoneless, tapi BELUM tentu sudah di-paint) - RAF KEDUA baru
   *  dieksekusi SETELAH paint dari RAF pertama selesai, jadi di titik itu DOM sudah
   *  pasti ter-patch & di-paint nyata sebagai teks polos sebelum window.print() dipanggil.
   *  Dibuktikan lewat PDF sungguhan (Playwright, bukan klaim) - lihat 03-frontend.md #15. */
  cetak(): void {
    document.body.classList.add('b3-printing');
    this.sedangCetak.set(true);
    window.addEventListener(
      'afterprint',
      () => {
        document.body.classList.remove('b3-printing');
        this.sedangCetak.set(false);
      },
      { once: true },
    );
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }
}
