# 03 - FRONTEND: Menu Limbah B3 - Alur Pembuangan (Tahap 1-4)

| Field | Value |
|---|---|
| Task slug | `b3-waste-workflow` |
| Peran | Frontend |
| Input | `01-spec.md`, `02-architecture.md` (kontrak lengkap), kode lama `pages/b3-waste/` (diganti total) |
| Output | Kode di `frontend/src/app/pages/b3-waste/`, dokumen ini |

---

## 1. File yang dibuat/diubah (100% di dalam `frontend/src/app/pages/b3-waste/`)

| File | Baris | Isi |
|---|---|---|
| `b3-waste-model.ts` | 572 | Tipe, konstanta, `jalankanAksi()` (reducer murni), `validasi*()`, `masaSimpanHari`/`tambahHari`/`formatTanggal`/`formatWaktu`, `buatNotifikasi()`, `aksiUntuk()`. **Nol impor Angular, nol impor dari `b3-waste-data.ts`.** |
| `b3-waste-data.ts` | 232 | `MASTER_DEPARTEMEN`, `PENGGUNA`, `LABEL_STATUS`, `BADGE_STATUS`, `LAINNYA_DESKRIPSI`, `bangunSeed()` (replay reducer). |
| `b3-waste.ts` | 255 | class **`B3Waste`** (nama & file tidak diganti - `app.routes.ts` tidak disentuh). Container: seluruh signal state, handler aksi, computed. |
| `b3-waste.html` | 327 | Toolbar peran, tabs, form ajukan/perbaiki, daftar+antrean+detail, panel approval, form timbang, tab notifikasi, placeholder logbook/neraca. |
| `b3-waste.css` | 70 (2 602 bytes) | Style lokal non-cascade (demo-bar, riwayat, notifikasi, detail grid, dst). |
| `waste-picker.ts` | 159 | class **`WastePicker`**, selector `app-waste-picker`. State cascade bersarang, dipakai 2x (ajukan & ajukan-ulang). |
| `waste-picker.html` | 86 | Grid kartu cascade Departemen -> Sumber -> Jenis + kartu "Lainnya". |
| `waste-picker.css` | 156 (2 722 bytes) | Style cascade checklist (border aksen, chip kode, dst). |

Tidak ada file lain dibuat/diubah. Tidak disentuh: `app.routes.ts`, `shared/menu.ts`, `layout/**`, `shared/feature-page.css`, `shared/icon/icon.ts`, `styles.css`, `angular.json`, `package.json`, seluruh `backend/`, dan halaman `company-reports/`, `inspection/`, `placeholder/`. (Bukan git repo, jadi verifikasi dilakukan dengan `ls`/`grep` manual atas isi folder `b3-waste/` saja - lihat bagian 3.)

## 2. Hasil `npm run build`

```
> ng build
✔ Building...
Initial chunk files | Names | Raw size | Estimated transfer size
main-....js          | main  | 417.71 kB | 104.06 kB
styles-....css        | styles | 1.12 kB | 477 bytes
Application bundle generation complete.
```

**LOLOS.** Tanpa error, tanpa warning (termasuk nol warning `anyComponentStyle`). `npx tsc --noEmit` juga bersih (nol error tipe).

Ukuran CSS per komponen (budget `anyComponentStyle`: warning 6 kB, error 10 kB, dihitung atas gabungan `styleUrls`):

| Komponen | `styleUrls` | Ukuran gabungan |
|---|---|---|
| `B3Waste` | `feature-page.css` (5 143 B, shared, tidak diedit) + `b3-waste.css` (2 602 B) | **7 745 B** (~7,6 kB) - di bawah error 10 kB; build tidak melaporkan warning meski di atas 6 kB baku (indikasi Angular menghitung ukuran gzip, bukan raw, untuk pemicu warning - error tetap dievaluasi dan lolos) |
| `WastePicker` | `waste-picker.css` (2 722 B) saja | **2 722 B** - jauh di bawah 5 kB yang dialokasikan |

Tidak ada dependency baru; `package.json` tidak disentuh.

## 3. Audit scope (AC-32)

```
frontend/src/app/pages/b3-waste/
  b3-waste-model.ts   b3-waste-data.ts   b3-waste.ts   b3-waste.html   b3-waste.css
  waste-picker.ts     waste-picker.html  waste-picker.css
```

`grep` atas seluruh folder: nol hasil untuk `HttpClient`, `fetch(`, `XMLHttpRequest`, `provideHttpClient`, `innerHTML`, `toISOString`, `DatePipe`. `grep` atas pola `status: '...'`/`status = ...` (penulisan status): seluruh 7 titik penulisan literal (`status: 'WAIT_SUP'` dst.) hanya ada di `b3-waste-model.ts` (di dalam `jalankanAksi()`); seluruh kemunculan `.status` lain di `b3-waste.ts`/`.html` adalah **pembacaan** (`===`), bukan penulisan - sesuai aturan arsitektural "status hanya ditulis di `jalankanAksi()`" (R-3). `app.routes.ts` tetap mengimpor `B3Waste` dari `./pages/b3-waste/b3-waste` tanpa perubahan (nama file & class dipertahankan).

## 4. Trace skenario QA S1-S8 (baca kode/reducer, bukan run browser interaktif - QA akan verifikasi ulang dengan bukti langkah)

- **S1** (role switcher, tab, 5 kartu, no-reload): `gantiPeran()` hanya menulis `peranAktif`, tidak menyentuh `pengajuan`/`notifikasi`/`pilihanId` -> AC-30 aman. `MASTER_DEPARTEMEN` 4 elemen + kartu "Lainnya" statis di template -> 5 kartu (AC-1). Tab Logbook/Neraca hanya teks statis, nol perhitungan (AC-31).
- **S2** (cascade): `toggleDept` menghapus/menginisialisasi key departemen (AC-2, AC-6); dept 1-sumber auto-init `{[kode]: []}` (AC-3); Produksi init `{}` kosong sampai user pilih line (AC-3); `toggleJenis` push/filter kode dalam array -> multi-select (AC-5); checksum jenis (9/4/4/3/4/3/3) ditranskripsi persis dari 02-architecture.md 8.1, diverifikasi manual baris per baris (AC-4); tidak ada input number/berat di `waste-picker.html`/`b3-waste.html` bagian ajukan (AC-8).
- **S3** (submit gagal->berhasil): `validasiIsiPengajuan` mengembalikan array semua pelanggaran sekaligus (AC-9, pesan string persis tabel 5.2 arsitektur); submit valid -> `id`/`nomor` dari counter (`nextId`/`nextNomor` mulai 5/5 sesuai seed) -> `PLB3/2026/0005`, status `WAIT_SUP` (AC-10); `lainnya` tersimpan bila `lainnyaAktif` true (AC-7).
- **S4** (approval Supervisor): `aksiUntuk('WAIT_SUP','USER')=[]` -> nol tombol approve/reject untuk USER (AC-18); `validasiAlasan(' ')` gagal trim-check (AC-11); `SUP_REJECT` sukses menulis `supervisi.alasanTolak` + entri `riwayat` (catatan) yang dibaca ulang di peran USER lewat timeline riwayat (AC-12); `RESUBMIT` mereset `supervisi`/`pic` ke `null` tapi **tidak** menghapus `riwayat` lama (AC-17); `aksiUntuk('APPROVED','SUPERVISOR')=[]` -> nol tombol timbang untuk Supervisor (AC-18).
- **S5** (approval PIC): `validasiJadwal` mengembalikan pesan per-field independen (tanggal vs jam) (AC-14); `PIC_APPROVE` sukses menulis `pic.tanggalJadwal/jamJadwal`, dibaca di detail lewat kondisi `p.pic?.tanggalJadwal` untuk kedua peran lain (AC-15); `PIC_REJECT` sama pola dengan `SUP_REJECT` (AC-16).
- **S6** (timbang): `aksiUntuk` hanya mengizinkan `PIC_WEIGH` pada status `APPROVED` (AC-19); `validasiTimbang` memeriksa `typeof v !== 'number' || NaN || v<=0` untuk tiap item (AC-20) dan field penyerahan+pernyataan (AC-21, AC-22); `tambahHari` diverifikasi eksak dengan Node: `tambahHari('2026-08-15',185)='2027-02-16'`, `tambahHari('2026-08-15',365)='2027-08-15'` (cocok AC-23 persis); setelah `PIC_WEIGH` sukses, status `WEIGHED` final -> `aksiUntuk` mengembalikan `[]` untuk **semua** peran pada status ini, form timbang otomatis hilang dari DOM (bukan disabled) -> AC-24.
- **S7** (notifikasi): `buatNotifikasi` per aksi menghasilkan jumlah persis 2/2/2/1/2/2/2 sesuai tabel 5.4 arsitektur (dihitung manual per `case`) -> AC-25; isi notifikasi `SUP_REJECT`/`PIC_REJECT` menyisipkan `{alasan}` mentah, `PIC_APPROVE` menyisipkan `formatTanggal(tanggalJadwal)` + `jamJadwal` (AC-26); tab Notifikasi merender penerima+email+subjek+isi+waktu+nomor dengan judul eksplisit "Simulasi Email..." (AC-27).
- **S8** (scope & build): lihat bagian 2 dan 3 di atas - `npm run build` lolos, nol `HttpClient`/`fetch`, seluruh file baru ada di dalam whitelist, `app.routes.ts`/`menu.ts`/`layout/**`/`feature-page.css`/`icon.ts`/`styles.css`/`package.json`/`backend/` tidak disentuh sama sekali (tidak ada operasi Write/Edit yang menyasar file-file itu selama task ini).

## 5. Keputusan implementasi non-trivial (kontrak Architect tidak eksplisit di titik ini)

1. **`IsiPengajuan` ditambah field `lainnyaAktif: boolean`** (tidak ada di kontrak 4.5 asli, yang hanya punya `{ header, items, lainnya }`). Alasan: V-LAINNYA ("kartu Lainnya dicentang **tapi teks kosong**") tidak bisa dibedakan dari "kartu Lainnya tidak dicentang" hanya dari string `lainnya` semata - dua kondisi itu sama-sama bisa menghasilkan string kosong. Field baru ini aditif (tidak mengubah/menghapus field yang sudah dikunci) dan `PilihanLimbah` (kontrak 6.4) memang sudah membawa `lainnyaAktif`, jadi datanya sudah tersedia secara alami di `WastePicker` - tinggal diteruskan. Didokumentasikan sebagai komentar di `b3-waste-model.ts`.
2. **`Konteks`/`KonteksNotifikasi` ditambah field `pengguna: Record<Peran, Pengguna>`** (kontrak 5.1/5.4 hanya menyebut `{ waktu, id, nomor, notifIdAwal }` dan `{ waktu, idAwal }`). Alasan: `buatNotifikasi()` perlu nama+email penerima yang **bukan** pelaku aksi (mis. Supervisor dinotifikasi saat PIC menyetujui) - data itu ada di `PENGGUNA` constant yang menurut kontrak arsitektur ditempatkan di `b3-waste-data.ts`. Bila `b3-waste-model.ts` meng-impor `PENGGUNA` langsung dari situ, terbentuk import siklik karena `b3-waste-data.ts` juga meng-impor `jalankanAksi` untuk `bangunSeed()`. Menyuntik `pengguna` lewat `konteks` (pola yang sama dengan `waktu`/`id`/`nomor` yang juga disuntik, bukan dibaca sendiri oleh reducer) menghindari siklus sepenuhnya dan menjaga `b3-waste-model.ts` tetap nol dependensi ke file lain di folder ini.
3. **`WastePicker` tidak memakai `FormsModule`/`ngModel`** - checkbox pakai `[checked]`/`(change)`, textarea pakai `[value]`/`(input)`. Konsisten dengan prinsip ponytail (state cascade sudah lewat signal manual, `ngModel` tidak menambah nilai di sini) dan mengurangi permukaan dependency komponen.
4. **Reset form "Ajukan"** memanfaatkan siklus hidup Angular `@if`: `<app-waste-picker>` hanya dirender saat `tabAktif()==='ajukan'`, sehingga berpindah keluar-masuk tab menghancurkan & membuat ulang instance komponen (state cascade otomatis bersih). Ini menghindari kebutuhan method "reset" manual di `WastePicker` dan konsisten dengan alasan ADR-2 ("reset AC-6 sepele karena terisolasi").
5. **Nomor pengajuan** dibentuk dengan `PLB3/2026/${String(nextNomor).padStart(4,'0')}` di container (bukan di reducer) - reducer hanya menerima `nomor` jadi lewat `konteks.nomor`, sesuai kontrak "waktu, id, nomor disuntik lewat konteks".

## 6. Cara run dev

```
cd frontend
npm start        # ng serve, buka /b3-waste setelah login/redirect dashboard
npm run build     # verifikasi budget CSS & lolos production build
```

## 7. Catatan untuk Code Review / QA

- Prototipe **tanpa** unit test tertulis oleh Frontend (opsional, ranah QA per pembagian tugas 02-architecture.md bagian 10). Fungsi murni di `b3-waste-model.ts` siap diuji tanpa `TestBed` bila QA ingin menambah `b3-waste-model.spec.ts`.
- Bukan git repo - tidak ada diff otomatis untuk audit AC-32; Code Review disarankan membandingkan langsung isi `app.routes.ts`, `shared/menu.ts`, `layout/**` dengan versi yang dibaca Frontend di awal task (dikutip di bagian 3 dokumen ini) untuk memastikan identik.

## 8. Bugfix loop-back round 1 (QA `08-qa-report.md`): `WastePicker` effect self-reset (BLOCKER)

### 8.1 Ringkasan bug

QA menemukan (via `ng serve` + Playwright interaktif, bukan trace kode) bahwa cascade checklist di `WastePicker` **tidak bisa dipakai sama sekali**: setiap centang departemen/sumber/jenis, atau isi teks "Lainnya", langsung ter-reset ke kosong dalam <300ms, sebelum sempat terlihat/dipakai user. Akibatnya submit pengajuan baru mustahil lewat UI (AC-2, AC-3, AC-5, AC-7, AC-10 FAIL). Nol error console - kegagalan reaktivitas yang senyap, sehingga lolos `npm run build` dan Code Review baca-kode sebelumnya.

### 8.2 Root cause

Di constructor `WastePicker` (`waste-picker.ts`):

```ts
constructor() {
  effect(() => this.muatDari(this.nilaiAwal()));
}
```

`effect()` di atas secara tekstual hanya membaca `nilaiAwal()`. Tapi badan efek memanggil `muatDari()`, yang di ujungnya memanggil `emit()` - dan `emit()` **membaca** `this.seleksi()`, `this.lainnyaAktif()`, `this.lainnyaTeks()` secara sinkron, masih di dalam eksekusi efek yang sama. Angular Signals melacak *seluruh* sinyal yang dibaca selama eksekusi efek sebagai dependency-nya, bukan cuma yang tertulis eksplisit di source. Jadi efek ini sebenarnya bergantung pada `{nilaiAwal, seleksi, lainnyaAktif, lainnyaTeks}`.

Setiap `toggleDept`/`toggleSumber`/`toggleJenis`/`toggleLainnya`/`onLainnyaTeks` menulis ke salah satu dari 3 sinyal "tersembunyi" itu -> efek terpicu ulang -> `muatDari(this.nilaiAwal())` dipanggil lagi dengan `nilaiAwal` yang sama (biasanya `null` di mode Ajukan baru) -> pilihan yang baru saja dibuat user langsung tertimpa kosong.

### 8.3 Fix yang diterapkan

Isolasi efek supaya hanya benar-benar depend ke `nilaiAwal`, dengan membaca `nilaiAwal()` di luar `untracked()` tapi memanggil `muatDari()` (termasuk `emit()` di dalamnya) **di dalam** `untracked()`, sehingga pembacaan sinyal internal oleh `emit()` tidak lagi didaftarkan sebagai dependency efek:

```ts
import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
// ...
constructor() {
  effect(() => {
    const v = this.nilaiAwal();
    untracked(() => this.muatDari(v));
  });
}
```

Satu-satunya file yang diubah: `frontend/src/app/pages/b3-waste/waste-picker.ts` (1 import ditambah, 1 method constructor diubah). Tidak ada file lain di scope yang disentuh (sesuai rule scope AC-32).

### 8.4 Bukti verifikasi (dilakukan sendiri oleh Frontend, bukan cuma `npm run build`)

1. **`npm run build`** - lolos bersih, nol error/warning, ukuran bundle nyaris identik dengan sebelumnya (`main-*.js` 417.73 kB, `styles-*.css` 1.12 kB).
2. **`ng test --include ".../b3-waste-model.spec.ts"`** - 36/36 tetap PASS (tidak tersentuh oleh fix ini, fix ada di komponen bukan model).
3. **`ng serve` (port 4302) + Playwright Chromium headless, interaksi klik nyata** (skrip dijalankan dari scratchpad, tidak menambah dependency ke `frontend/package.json`) - 3 skenario, 20 assertion, **semua PASS**, nol `pageerror`/`console.error` selama sesi:
   - **Skenario A - Ajukan baru:** centang kartu Engineering -> area anak (`.wp-anak`) muncul dan **tetap ada** setelah 800ms diam (jauh melewati window reset <300ms yang dilaporkan QA); centang jenis "Oli" -> tetap tercentang setelah 800ms; "Total dipilih" menunjukkan `1 jenis limbah dari 1 sumber` (bukan `0`); isi header lengkap -> klik "Ajukan" -> **tidak ada errors-box**, halaman pindah ke tab Daftar menampilkan pengajuan baru **`PLB3/2026/0005`** berstatus **"Diajukan" (WAIT_SUP)** berisi item **Oli / B105d / ENG** (bukan array kosong) - dikonfirmasi lewat screenshot; kartu statistik "Total Pengajuan" naik 4->5, "Menunggu Supervisor" naik 1->2.
   - **Skenario B - Kartu "Lainnya":** centang -> tetap tercentang setelah 600ms; textarea muncul di DOM; ketik "Sampah lain uji coba otomatis" -> nilai **tidak berubah/hilang** setelah 600ms diam.
   - **Skenario C - "Perbaiki & Ajukan Ulang" (jalur `nilaiAwal` terisi):** buka pengajuan `REJ_SUP` lama, klik "Perbaiki & Ajukan Ulang" -> checklist **ter-prefill benar** (3 checkbox tercentang dari data lama: Office/Kemasan Tinta, Office/Toner, dst., "Total dipilih: 2 jenis limbah dari 1 sumber") dan **tidak berubah/reset sendiri** setelah 500ms diam; menambah departemen baru (Engineering) saat mode edit **berhasil dan tetap tercentang** setelah 700ms (memverifikasi fix tidak merusak use-case prefill-lalu-edit); klik "Ajukan Ulang" -> sukses tanpa error, status kembali ke "Diajukan". Screenshot mengonfirmasi banner alasan tolak lama tetap tampil bersamaan dengan checklist yang bisa diedit.

   Screenshot bukti (scratchpad sesi ini, disimpan sebagai lampiran verifikasi, bukan bagian repo): `fix-01-checklist-persisten.png`, `fix-02-setelah-submit.png`, `fix-03-lainnya.png`, `fix-04-perbaiki-prefill.png`.

**Kesimpulan:** bug BLOCKER dari `08-qa-report.md` Bagian 2 sudah diperbaiki dan diverifikasi lewat interaksi browser nyata (bukan hanya baca kode/`npm run build`), termasuk memastikan use-case "Perbaiki & Ajukan Ulang" (yang memakai `nilaiAwal` terisi) tetap berfungsi setelah fix.

---

## 9. Babak 2 - Logbook & Neraca (kontrak `02-architecture.md` Bagian 14-26)

`waste-picker.ts/.html/.css` **tidak disentuh sama sekali** di babak ini (dikunci eksplisit Architect) - dikonfirmasi lewat `ls -la` (mtime tidak berubah dari babak 1) di bagian 9.5 di bawah.

### 9.1 File yang dibuat/diubah

| File | Status | Baris | Isi babak 2 |
|---|---|---|---|
| `b3-waste-model.ts` | diubah (aditif) | 600 (dari 572, +28) | `KoreksiJenis`, `IsiTimbang.koreksiJenis?`, `terapkanTimbang()` (dipakai reducer `PIC_WEIGH` **dan** preview - satu fungsi, bukan dua jalur), `riwayat.catatan` `PIC_WEIGH` menyisipkan `, koreksi jenis {n} item` bila ada koreksi |
| `b3-waste-data.ts` | diubah (aditif) | 275 (dari 232, +43) | `DOK_LOGBOOK`, `DOK_NERACA`, `PENANDATANGAN`, `TEMBUSAN` - nilai verbatim dari `logbook-neraca-format-reference.md` |
| `b3-waste-logbook.ts` | **BARU** | 280 | Tipe `LogbookEntry`/`BlokLogbook`/`Neraca`/`NeracaPerlakuan`/dst; `bangunLogbook()`, `kelompokkanLogbook()`, `hitungNeraca()`, `pratinjauPengajuan()`, `keTon()`/`formatTon()`/`formatKg()`/`formatPersen()`, `KATEGORI_PERLAKUAN`, `BULAN`. **Nol impor Angular** (diverifikasi: satu-satunya impor adalah dari `b3-waste-model.ts`). |
| `b3-dokumen.ts` | **BARU** | 45 | class `B3Dokumen`, selector `app-b3-dokumen`, `ViewEncapsulation.None`, `cetak()` (gerbang `body.b3-printing` + `afterprint`) |
| `b3-dokumen.html` | **BARU** | 217 | Replika Logbook (per blok, `@for` bersarang) + Neraca (Bagian I/II/penutup/tembusan) |
| `b3-dokumen.css` | **BARU** | 92 baris / 3 454 B | Style dokumen cetak + blok `@media print`. Budget `anyComponentStyle` untuk `B3Dokumen`: **<= 8 kB** (tanpa `feature-page.css`) - realisasi 3,45 kB, jauh di bawah error 10 kB. |
| `b3-waste.ts` | diubah (aditif) | 304 (dari 255, +49) | 3 computed (`logbook`/`logbookBlok`/`neraca`), 5 method pratinjau/koreksi (`pratinjauItem`, `pratinjauLogbook`, `pratinjauNeraca`, `jenisTersedia`, `setKoreksiJenis`), `timbangKosong()` +`koreksiJenis:{}`, `kirimTimbang()` menambahkan pesan "N baris ditambahkan ke Logbook & Neraca", import `B3Dokumen` |
| `b3-waste.html` | diubah | 366 (dari 327, +39) | Panel "Timbang & Validasi" diperluas jadi tabel preview editable (dropdown jenis + input berat) + pratinjau Neraca read-only; link "Lihat di Logbook &rarr;" saat `WEIGHED`; 2 placeholder Logbook/Neraca **diganti** `<app-b3-dokumen mode="logbook"/"neraca">` |
| `b3-waste.css` | diubah (aditif) | 77 baris / 3 015 B | `.preview-note`, `.preview-neraca`, `.preview-title`, `.preview-total`, `.preview-line`, `select.input-sm` |
| `waste-picker.ts/.html/.css` | **tidak disentuh** | - | - |

Total folder: 11 file kode + `b3-waste-model.spec.ts` (QA) = 12, sesuai kontrak Bagian 21 (nol sub-folder, nol barrel).

### 9.2 Hasil `npm run build` & `tsc`

```
npx tsc --noEmit -p tsconfig.app.json   -> bersih, nol error
npm run build                            -> sukses, nol error, nol warning
Initial chunk files | Names | Raw size | Estimated transfer size
main-*.js    | main   | 437.90 kB | 109.17 kB
styles-*.css | styles |   1.12 kB |   477 bytes
Application bundle generation complete.
```

Catatan proses: build sempat gagal sekali dengan `Debug Failure ... tsbuildinfo` - ini bug cache `.angular/cache` (path separator Windows vs POSIX), **bukan** masalah kode; hilang setelah `rm -rf .angular/cache`. Build sempat memunculkan CSS syntax warning satu kali karena komentar di `b3-dokumen.css` mengandung urutan karakter `*/ ` di tengah kalimat (`.doc-*/.b3-doc`) yang menutup blok komentar CSS lebih awal - diperbaiki dengan menulis ulang kalimatnya tanpa urutan `*/`.

Budget CSS realisasi akhir:

| Komponen | `styleUrls` | Ukuran gabungan | Batas |
|---|---|---|---|
| `B3Waste` | `feature-page.css` (5,1 kB) + `b3-waste.css` (3,0 kB) | ~8,1 kB | `b3-waste.css` sendiri <= 4 kB (kontrak 21) - **PASS**, warning >6kB gabungan diterima sesuai kontrak, nol error |
| `B3Dokumen` | `b3-dokumen.css` saja | 3,45 kB | <= 8 kB - **PASS**, jauh di bawah |
| `WastePicker` | `waste-picker.css` saja | 2,72 kB (tidak berubah) | <= 5 kB - **PASS** |

Audit scope: `find src -newer` tidak reliabel (semua file punya mtime checkout awal yang mirip), jadi audit dilakukan dengan `ls -la --time-style=full-iso` membandingkan mtime tiap file di `pages/b3-waste/` terhadap file blacklist (`app.routes.ts`, `shared/menu.ts`, `shared/feature-page.css`, `shared/icon/icon.ts`, `styles.css`). Hasil: seluruh file blacklist bertanggal 12-13 Agustus (sebelum sesi ini); `waste-picker.*` bertanggal 13 Agustus (fix babak 1, sebelum sesi ini); hanya 9 file yang disebut di 9.1 bertanggal sesi kerja babak 2 (14 Agustus, jam kerja sesi ini). Nol file di luar whitelist tersentuh.

### 9.3 Verifikasi interaktif (Playwright Chromium headless, `ng serve` port 4300, skrip dari scratchpad - tidak menambah dependency ke `frontend/package.json`)

Skenario dijalankan **dalam satu sesi browser tanpa reload**, menelusuri S9-S13 dari `02-architecture.md` Bagian 24.2. Semua assertion (35+) **PASS**.

**Titik kritis #1 - `logbook`/`neraca` adalah `computed`, bukan `signal` (P-1/AC-47):**
`grep -rn "signal<Logbook\|signal<Neraca\|logbook\.set\|logbook\.update\|neraca\.set\|neraca\.update" pages/b3-waste/` -> nol hasil kode (hanya muncul di dalam komentar yang **menjelaskan larangan itu sendiri**). `grep -n "^\s*logbook\s*=\|^\s*neraca\s*="  b3-waste.ts` -> `logbook = computed<LogbookEntry[]>(...)`, `logbookBlok = computed<BlokLogbook[]>(...)`, `neraca = computed<Neraca>(...)`.

**Titik kritis #2 - preview editable, nilai tersimpan = hasil edit PIC (AC-43):** di layar Timbang & Validasi `PLB3/2026/0001` (item Oli/B105d, Aki/A102d, Majun/B110d), diketik berat `120/40/18` -> pratinjau Neraca **langsung** menampilkan TOTAL A `0,1780` Ton & Kinerja `100,00%` **tanpa klik tombol apa pun**. Dropdown jenis baris pertama diubah dari "Oli (B105d)" ke "Aki (A102d)" -> Maks. Simpan baris itu berubah seketika dari `15/08/2027` (365 hari) ke `16/02/2027` (185 hari); pratinjau Neraca ikut menampilkan "Aki (A102d)". Berat baris itu diedit lagi jadi `35`, klik Validasi. Dibuka tab Logbook: blok "Aki (A102d)" berisi **2 baris** - baris asli Aki (berat `40`) dan baris eks-Oli-terkoreksi (berat `35`, Maks. Simpan `16/02/2027`) - **kolom Jumlah Masuk tidak pernah memuat nilai asli `120`** yang diketik user di awal. Blok "Oli (B105d)" **tidak ada** sama sekali (item itu sudah jadi bagian blok Aki). Kolom Petugas kedua baris = "Pak Ruli", kolom Sisa = `0`.

**Titik kritis #3 - layar audit PIC kosong permanen, tab dokumen tetap terisi (AC-44):** setelah klik Validasi, `page.getByText('Timbang & Validasi').count() === 0` (panel + preview **hilang total dari DOM**, bukan disabled); `.readonly-note` menampilkan "Data terkunci..."; `.info-box` berisi `"2 notifikasi terkirim: ... - 3 baris ditambahkan ke Logbook & Neraca."`. Dibuka pengajuan `APPROVED` lain (`PLB3/2026/0002`, setelah dijadwalkan) -> form timbang tampil **kosong total** (`inputValue() === ''`, checkbox tidak tercentang) - tidak ada bekas koreksi/berat dari pengajuan sebelumnya. Divalidasi juga (item Majun/B110d dari `produksi/OC3`, berat `10`). Dibuka tab Logbook: blok "Majun (B110d)" kini berisi **2 baris** (dari 2 pengajuan berbeda, kode sama - membuktikan grouping per-kode P-3/15.3 sekaligus akumulasi kumulatif lintas pengajuan). Tab Neraca: TOTAL (A) = TOTAL (B) = `0,1300` Ton, Kinerja `100,00%`. Diganti peran ke User lalu Supervisor -> isi tab Neraca **identik** (`innerText` sama persis) - dokumen tidak bergantung peran, data tidak hilang.

**Titik kritis #4 - PDF export (`window.print()` + `@media print` + gerbang `body.b3-printing`, AC-45/46):** klik "Unduh PDF" (dengan `window.print` di-stub agar tidak membuka dialog OS sungguhan di mode headless) -> `document.body.className` mengandung `b3-printing`. Dengan `page.emulateMedia({media:'print'})` (wajib untuk menguji `@media print` - `getComputedStyle` di mode layar biasa tidak menerapkan aturan ini sama sekali): elemen `.demo-bar` dan `.tabs` (termasuk tombol Unduh PDF sendiri) `visibility: hidden`, sementara `.b3-doc` tetap `visibility: visible`. Tab Neraca aktif -> nol elemen `.doc-logbook` di DOM (isolasi per tab, AC-46); tab Logbook aktif -> nol elemen `.doc-neraca`. Event `afterprint` disimulasikan (`window.dispatchEvent(new Event('afterprint'))`, meniru browser sungguhan setelah dialog print ditutup) -> `body.className` kembali kosong (kelas `b3-printing` terlepas).

**S13 (keadaan kosong, AC-41):** sebelum ada validasi apa pun, tab Logbook menampilkan `.doc-empty`: "Belum ada data logbook. Baris terbentuk otomatis setelah PIC memvalidasi timbang."; tab Neraca tetap merender dokumen lengkap (header, 7 kategori Perlakuan, footer, tembusan) dengan Bagian I berisi baris `.doc-empty-cell`: "Belum ada transaksi tervalidasi.", TOTAL 0,0000, dan baris Kinerja menampilkan `-` (bukan `NaN`/`0,00`/`#REF!`).

**AC-38 (nol stempel):** `page.locator('body').innerText()` diperiksa dengan regex `/\bASLI\b/` dan `/\bCOPY\b/` -> nol match.

Screenshot bukti visual (scratchpad, bukan bagian repo - path absolut untuk referensi reviewer): `evidence-logbook.png` (4 lembar Logbook: Aki/A102d, Terkontaminasi/A108d, Kemasan ex-Chemical/B104d, Majun/B110d - masing-masing dengan header replika lengkap No. Dokumen `FR/K3L/006/01` dsb.), `evidence-neraca.png` (dokumen Neraca lengkap: Bagian I 4 baris + TOTAL A `0,1300` Ton, Bagian II 7 kategori dengan centang ADA di `DISERAHKAN PIHAK KE-3`, TOTAL B `0,1300` Ton, Kinerja `100,00%`, footer + 5 butir Tembusan).

### 9.4 Trace S9-S13 vs AC-35..AC-47 (peta bukti)

| AC | Bukti |
|---|---|
| AC-35 | 9.3 titik kritis #3: 4 lembar terpisah per kode, header 6-baris info box + Area(kosong) + Karakteristik Beracun + footer Diperiksa/Disetujui - terlihat di `evidence-logbook.png` |
| AC-36 | `b3-dokumen.html` 13 `<th>` (2 `rowspan=2` + 11 di baris 2) dalam 3 grup `colspan` 5/4/2; kolom 6 memuat `(t=0 + 90 hr)` - diverifikasi via `headerMaksSimpanTxt.includes('(t=0 + 90 hr)')` |
| AC-37 | Sel per baris diverifikasi terstruktur (bukan regex teks gabungan): kolom Petugas = "Pak Ruli" di semua baris, kolom Sisa = "0" |
| AC-38 | grep + `page.locator('body').innerText()` regex - nol hasil |
| AC-39 | `evidence-neraca.png` Bagian I 4 baris `formatTon` 4 desimal koma, CATATAN berisi nomor manifest |
| AC-40 | 7 kategori tercetak (`DISIMPAN`..`PERLAKUAN LAINNYA`), hanya `DISERAHKAN PIHAK KE-3` berangka, TOTAL B `0,1300` = TOTAL A `0,1300` |
| AC-41 | Kinerja `100,00%` dengan data; `-` saat kosong (S13) |
| AC-42 | Blok Majun 2 baris lintas 2 pengajuan; Neraca identik lintas peran |
| AC-43 | Titik kritis #2 di atas - nilai final = hasil edit PIC, bukan input asli user |
| AC-44 | Titik kritis #3 - panel hilang dari DOM, `infoAksi` memuat "N baris ditambahkan", form baru kosong |
| AC-45 | Titik kritis #4 - gerbang class + visibility print + afterprint |
| AC-46 | Titik kritis #4 - isolasi `.doc-logbook`/`.doc-neraca` per tab |
| AC-47 | Titik kritis #1 - grep nol hasil |

### 9.5 Keputusan implementasi non-trivial

1. **Pesan `infoAksi` digabung dengan `.update()`, bukan `.set()` baru.** `kirimTimbang()` memanggil `terapkan()` (yang sudah mengisi `infoAksi` dengan ringkasan notifikasi babak 1) lalu menambahkan `- {N} baris ditambahkan ke Logbook & Neraca.` lewat `infoAksi.update(s => ...)`, supaya satu baris info berisi **kedua** informasi (notifikasi + logbook) sesuai kontrak 18.2 (`infoAksi = string babak 1 + " - {N} baris ditambahkan..."`) tanpa mengubah kontrak `terapkan()` yang sudah dipakai 6 aksi lain.
2. **`b3-dokumen.css` diberi header komentar yang eksplisit melarang selektor telanjang**, dan disiplin diterapkan: semua selektor dimulai `.doc-*`, `.b3-doc`, atau `body.b3-printing`; kombinasi elemen (`.doc-table th`, `.doc-infobox td`, dst.) selalu diawali kelas ancestor, tidak pernah elemen polos (`table{}`, `h1{}`). Warna dokumen dibuat statis (`#111`/`#fff`/`#333`) - bukan `var(--text)` dsb - supaya dokumen selalu tercetak hitam-di-atas-putih terlepas tema gelap aplikasi (konsisten dengan sifat "formulir resmi" yang direplikasi, bukan komponen UI aplikasi).
3. **Kolom "Jumlah Keluar (kg)" & "Sisa (kg)" di preview editable Tahap 4 dibuat murni tampilan (bukan input)** - mengikuti kontrak 18.3 tabel A ("tidak (P-3)" untuk kedua kolom itu); nilainya dicerminkan dari `formTimbang.berat[it.id]` via `formatKg()` untuk Jumlah Keluar, dan literal `0` untuk Sisa.
4. **Dropdown koreksi jenis (`<select [ngModel]="pratinjauItem(it).kode" (ngModelChange)="setKoreksiJenis(it,$event)">`) sengaja pakai binding satu-arah + handler eksplisit, bukan `[(ngModel)]` dua-arah** ke suatu field lokal - supaya nilai yang ditampilkan **selalu** hasil `pratinjauItem()` (yang membaca `formTimbang.koreksiJenis`), konsisten dengan aturan 18.3 "preview tidak punya storage sendiri". `setKoreksiJenis()` menulis langsung ke `formTimbang.koreksiJenis[it.id]`, satu-satunya tempat penulisan.
5. **Verifikasi Playwright: `getComputedStyle` untuk aturan `@media print` wajib dijalankan di bawah `page.emulateMedia({media:'print'})`.** Percobaan awal memeriksa `visibility` tanpa emulasi ini gagal (selalu `visible`) karena Chromium tidak menerapkan aturan `@media print` sama sekali di mode rendering layar biasa - kelas `body.b3-printing` sendiri tidak cukup untuk membuktikan CSS-nya bekerja, harus dikombinasikan dengan emulasi media. Dicatat di sini karena ini insight untuk QA saat menyusun skenario print S12 (harus pakai teknik yang sama, bukan sekadar cek `className`).
6. **Playwright `locator(...).filter({ has: ... })` untuk mencari section `.doc-logbook` tertentu berdasarkan judul blok di dalamnya sempat memberi hasil salah** (mengembalikan gabungan semua section, bukan section yang cocok saja) - diganti dengan `page.evaluate()` + `querySelectorAll` DOM langsung untuk kasus itu. Dicatat sebagai catatan teknik pengujian (bukan bug produk) untuk QA.
7. **`text-transform: uppercase` pada `.doc-blok-title`** (nama jenis limbah, mis. "Aki (A102d)") membuat `element.innerText()` Playwright mengembalikan teks dalam huruf besar (`AKI (A102D)`) karena `innerText` mengikuti tampilan visual ter-render, bukan DOM literal (`textContent` tetap `Aki (A102d)`). Ini presentasi CSS yang disengaja (meniru judul blok formulir), bukan bug - dicatat karena mempengaruhi cara QA harus mencocokkan teks judul blok (perlu case-insensitive atau `textContent`, bukan `innerText` case-sensitive).

### 9.6 Cara run dev (tidak berubah dari babak 1)

```
cd frontend
npm start        # ng serve, buka /b3-waste
npm run build     # verifikasi budget CSS & lolos production build
```

Tambahan verifikasi interaktif babak 2 (opsional, dipakai Frontend untuk bukti di atas): skrip Playwright standalone dijalankan dari luar folder proyek (scratchpad), **tidak** menambah dependency ke `frontend/package.json` - `npx playwright install chromium` + `node verify.mjs` terhadap `ng serve` yang sedang berjalan.

---

## 10. Revisi Amandemen 2 (2026-08-15) - polish visual & penggabungan dokumen

Revisi ini **bukan fitur baru**: implementasi ulang atas 9 poin kontrak tertulis orchestrator di `logbook-neraca-format-reference.md` bagian "AMANDEMEN 2", ditulis setelah Code Review round 3 APPROVE. Tidak ada Architect terpisah untuk putaran ini. `waste-picker.ts/.html/.css` **tidak disentuh sama sekali** (dikonfirmasi: file-file itu tidak pernah jadi target Write/Edit di sesi ini).

### 10.1 File yang diubah

| File | Status | Baris (sebelum &rarr; sesudah) | Isi revisi |
|---|---|---|---|
| `b3-waste-model.ts` | **tidak disentuh** | 600 | - |
| `b3-waste-data.ts` | **tidak disentuh** | 275 | - |
| `b3-waste-logbook.ts` | **tidak disentuh** | 280 | `bangunLogbook()`/`kelompokkanLogbook()`/`hitungNeraca()` dipakai APA ADANYA, hanya dipanggil dengan array 1 elemen (`[p]`) dari `b3-waste.ts` - sesuai instruksi poin 7 amendemen (fungsi ini generik, tidak perlu diubah) |
| `b3-dokumen.ts` | diubah | 45 &rarr; 81 | Input baru `editable`, `items`, `beratMap`, `toolbar`; output baru `beratChange`/`jenisChange`; method `jenisTersedia()`/`onJenisSelect()` (pindah dari `b3-waste.ts`, sekarang mengimpor `MASTER_DEPARTEMEN` langsung); `imports: [FormsModule]` ditambahkan (dipakai `ngModel` pada sel editable) |
| `b3-dokumen.html` | diubah | 217 &rarr; 257 | Header logbook & neraca diganti dari `<div class="doc-head">` flex jadi `<table class="doc-head">` 3-sel bergaris (brand \| judul \| info-box); baris `Area`/`Karakteristik Limbah` (logbook) dan `Bidang Usaha`/`Periode Waktu` (neraca) jadi `<table class="doc-meta">` bergaris; sel jenis & jumlah masuk pada tabel logbook jadi `@if (editable())` - `<select>`/`<input>` vs teks polos; toolbar "Unduh PDF" dibungkus `@if (toolbar())` |
| `b3-dokumen.css` | diubah | 92 &rarr; 99 baris / 3 454 B &rarr; **4 361 B** | `.doc-head`/`.doc-meta` ditulis ulang total (flex &rarr; table+border); `.doc-table td` default `text-align:center` (mengganti `.doc-right`, yang dihapus - lihat 10.3 keputusan #1); `.doc-input`/`select.doc-input` untuk sel editable. Budget `B3Dokumen` (`b3-dokumen.css` saja, tanpa `feature-page.css`) tetap **&lt;= 8 kB** - realisasi 4,36 kB |
| `b3-waste.ts` | diubah | 304 &rarr; 338 | `Tab` buang `'logbook'`/`'neraca'`; hapus computed global `logbook`/`logbookBlok`/`neraca` (P-1 tetap dijaga - sekarang proyeksi di-scope per pengajuan lewat `dokBlok(p)`/`dokNeraca(p)`, bukan lintas semua pengajuan); hapus `pratinjauItem`/`jenisTersedia`/`setKoreksiJenis` (pindah ke `B3Dokumen`); tambah `formBeratPerkiraan` (buffer Tahap 1), `editableSekarang` (computed), `dokBlok(p)`/`dokNeraca(p)`, `onDokBerat`/`onDokJenis`, `pastikanBeratTerisi()` (lihat 10.3 keputusan #2) |
| `b3-waste.html` | diubah | 366 &rarr; 327 | Tombol tab Logbook/Neraca dihapus; tabel "Perkiraan Berat" ditambah di tab Ajukan (setelah `<app-waste-picker>`); panel "Timbang & Validasi" diringkas jadi field bersama saja (dipindah ke ATAS, sebelum dokumen); tabel item polos + panel preview lama **diganti total** oleh `<app-b3-dokumen>` (mode logbook + mode neraca) di-scope ke `[p]`; tombol "Unduh PDF" otomatis ikut pindah (sudah jadi bagian internal `<app-b3-dokumen>`); dua blok `@if (tabAktif() === 'logbook'/'neraca')` di akhir file dihapus |
| `b3-waste.css` | diubah | 77 baris / 3 015 B &rarr; 70 baris / **2 620 B** | Hapus 5 rule mati (`.preview-note`, `.preview-neraca`, `.preview-title`, `.preview-total`, `.preview-line`) dan `select.input-sm` (jenis dropdown pindah ke `.doc-input` milik `B3Dokumen`); `.checkbox-label` diberi `margin-top` (sebelumnya diwarisi dari elemen tetangga yang sekarang dihapus) |
| `waste-picker.ts/.html/.css` | **tidak disentuh** | 162/86/156 | - |

### 10.2 Hasil verifikasi

```
npx tsc --noEmit -p tsconfig.app.json   -> bersih, nol error
npm run build                            -> sukses, nol error, nol warning
Initial chunk files | Names   | Raw size  | Estimated transfer size
main-JKZE34C4.js    | main    | 437.37 kB | 109.17 kB
styles-YPAUNJMG.css | styles  |   1.12 kB | 477 bytes
```

Budget CSS realisasi:

| Komponen | `styleUrls` | Ukuran | Batas |
|---|---|---|---|
| `B3Waste` | `feature-page.css` (5,1 kB) + `b3-waste.css` (2,62 kB) | ~7,76 kB | `b3-waste.css` sendiri &lt;= 4 kB - **PASS** (turun dari 3,0 kB babak 2 karena rule mati dihapus) |
| `B3Dokumen` | `b3-dokumen.css` saja | 4,36 kB | &lt;= 8 kB - **PASS** (naik dari 3,45 kB karena header table + sel editable) |
| `WastePicker` | `waste-picker.css` saja | 2,72 kB (tidak berubah) | &lt;= 5 kB - **PASS** |

### 10.3 Verifikasi interaktif (Playwright Chromium headless, `ng serve` port 4310, skrip dari scratchpad - tidak menambah dependency ke `frontend/package.json`)

Skrip dijalankan **dalam satu sesi browser tanpa reload**, menelusuri alur mandat orchestrator persis: User ajukan 2 item (Oli B105d + Aki A102d) dengan perkiraan berat 42,5 kg hanya pada Oli &rarr; Supervisor setujui &rarr; PIC setujui+jadwal &rarr; **buka detail pengajuan itu (bukan tab terpisah)** &rarr; edit angka sebagai PIC &rarr; isi field bersama &rarr; centang pernyataan &rarr; submit &rarr; verifikasi akhir. **28/28 assertion PASS, nol `console.error`/`pageerror` selama sesi.**

Titik kritis yang diverifikasi:

1. **Tab bar**: persis 3 tombol - "Ajukan Pembuangan", "Daftar Pengajuan", "Notifikasi (n)"; nol tombol "Logbook"/"Neraca".
2. **Field perkiraan berat Tahap 1**: tabel muncul setelah `<app-waste-picker>` dengan 2 baris (jumlah = `formPilihan.items.length`); nilai `42.5` diketik pada baris Oli.
3. **Dokumen langsung di detail**: setelah PIC approve+jadwal (status `APPROVED`), tanpa pindah tab, `<app-b3-dokumen>` langsung tampil di bawah panel "Timbang & Validasi" berisi field bersama.
4. **Pre-fill dari perkiraan user**: 2 input berat editable ditemukan di tabel dokumen; salah satunya (blok "Oli (B105d)") berisi `42.5` persis nilai yang diketik di Tahap 1 - **dikonfirmasi dengan mencocokkan NILAI, bukan posisi index**, karena tabel dokumen mengelompokkan blok per `kode` terurut (Aki `A102d` tercetak sebelum Oli `B105d` meski dipilih belakangan di Tahap 1 - lihat keputusan #3 di bawah); baris lain (Aki, tidak diisi user) tampil **kosong** (bukan `0`).
5. **Urutan visual field bersama vs tabel**: dicek lewat urutan DOM `h3`/`app-b3-dokumen` - judul "Timbang & Validasi" (field bersama) berada pada index lebih kecil dari elemen `<app-b3-dokumen>` pertama, membuktikan field bersama benar tampil **sebelum** tabel per-item (poin 6).
6. **Edit PIC tersimpan, bukan angka asli user**: setelah PIC mengubah kedua baris (Aki &rarr; 15, Oli 42,5 &rarr; 40) dan submit, status jadi `WEIGHED`; body text memuat `40`; body text **tidak lagi** memuat `42.5` dalam bentuk apa pun - membuktikan nilai final = hasil koreksi PIC.
7. **Readonly setelah WEIGHED**: `.doc-table .doc-input` (elemen `<input>`/`<select>` editable) berjumlah **0** setelah submit - sel yang sama otomatis kembali jadi teks (satu tampilan, dua mode, sesuai poin 9); `.readonly-note` "Data terkunci..." tampil.
8. **Unduh PDF pindah ke detail**: tombol ditemukan di dalam blok detail pengajuan (bukan tab terpisah).
9. **Border header nyata**: `getComputedStyle` atas `.doc-head td` pertama &rarr; `1px solid rgb(51, 51, 51)` (dicocokkan dengan regex angka &gt;=1) - dikonfirmasi BUKAN flex tanpa garis. Screenshot `evidence-doc-head.png` menunjukkan 3 sel bersebelahan bergaris (brand \| judul \| info-box 6-baris), dan `evidence-detail-final.png` menunjukkan baris `Area`/`Karakteristik Limbah` juga bergaris tepat di bawah header, sebelum tabel data.
10. **Sel tabel center**: `getComputedStyle` atas `.doc-table tbody td` pertama &rarr; `text-align: center`.
11. **Regresi WastePicker**: dari tab Ajukan (state browser baru, bukan mode ajukan-ulang), centang Office &rarr; centang Toner (`B353-1`) &rarr; tunggu 900 ms diam &rarr; teks "Total dipilih: 1 jenis limbah dari 1 sumber" tetap ada (checklist tidak reset sendiri, bug babak 1 tidak regresi).

Verifikasi tambahan (skrip terpisah `verify-print.mjs`) untuk mekanisme cetak (poin 20 arsitektur, tidak diubah tapi dipengaruhi restrukturisasi `toolbar` input): klik "Unduh PDF" (dengan `window.print` distub) &rarr; `body.className` memuat `b3-printing`; dengan `page.emulateMedia({media:'print'})`, `.tabs` (chrome aplikasi) `visibility: hidden` sementara `.b3-doc` `visibility: visible`; `window.dispatchEvent(new Event('afterprint'))` &rarr; kelas `b3-printing` terlepas. Catatan: karena Logbook & Neraca sekarang tampil BERDAMPINGAN (bukan tab terpisah, lihat keputusan #4), kedua `.b3-doc` (semua blok logbook + neraca) ikut tercetak bersama dalam satu unduhan - ini dianggap SESUAI niat "unduh dokumen pengajuan ini" (satu paket, bukan dua unduhan terpisah).

Screenshot bukti (scratchpad, bukan bagian repo): `evidence-doc-head.png` (crop header 3-sel bergaris), `evidence-detail-final.png` (halaman detail penuh: field bersama di atas, dua blok logbook Aki+Oli dengan header/Area-Karakteristik bergaris, dokumen Neraca menyatu di bawahnya dengan Bagian I/II/penutup/tembusan, riwayat, catatan "Data terkunci").

### 10.4 Keputusan implementasi non-trivial

1. **`.doc-right` dihapus total, diganti default `.doc-table td { text-align: center }`.** Amendemen poin 3 menulis "isi sel tabel di-tengahkan... terutama kolom angka/tanggal" - dibaca sebagai default umum (bukan hanya kolom tertentu), konsisten dengan tampilan Excel asli di screenshot referensi user (hampir semua sel pendek center-aligned, termasuk kolom teks seperti "Petugas"/"Tujuan Penyerahan"). Kelas `doc-right`/`doc-center` di HTML sengaja **tidak** dibersihkan satu-satu dari markup (biaya diff tinggi, manfaat nol karena keduanya sekarang identik dengan default) - class tersebut jadi no-op harmless, bukan bug.
2. **Logo tetap TEKS SAJA, tanpa lingkaran/placeholder grafis baru.** Amendemen poin 2 eksplisit menyuruh "pakai placeholder teks/circle **seperti yang sudah ada**" - dibaca sebagai "lanjutkan status quo" (yang sudah ada dari babak 2 original: teks nama perusahaan saja, nol elemen gambar, sesuai 02-architecture.md 19.4 "tanpa logo gambar - header memakai teks"), bukan instruksi untuk *menambah* elemen visual baru (lingkaran/inisial) yang belum pernah ada. Menambah elemen grafis baru yang tidak diminta eksplisit dianggap scope creep (ponytail) - order-nya "jangan coba generate/tebak logo" lebih kuat daripada menambah placeholder dekoratif yang tidak fungsional. Header tetap dapat borders penuh (poin 1) tanpa perlu elemen logo tambahan.
3. **Editability `B3Dokumen`: parent (`B3Waste`) tetap pemilik SATU-SATUNYA buffer edit (`formTimbang`), `B3Dokumen` tetap presentational murni (ADR-7 tidak dilanggar).** Alih-alih memberi `B3Dokumen` akses langsung ke `Pengajuan[]` mentah dan menghitung proyeksi editable-nya sendiri secara internal (yang akan membuatnya "pintar" dan melanggar prinsip ADR-7 "komponen ini bodoh, tidak menghitung apa pun"), keputusannya: `B3Waste.dokBlok(p)`/`dokNeraca(p)` tetap yang memanggil `bangunLogbook()`/`pratinjauPengajuan()` (persis pola babak 2 `pratinjauLogbook()`/`pratinjauNeraca()` yang sudah ada, sekadar diberi nama ulang & digabung) dan meneruskan HASIL JADI (`BlokLogbook[]`/`Neraca`) ke `B3Dokumen` lewat input `blok`/`neraca` yang **sudah ada sebelumnya** - tidak ada input baru bernama `daftarPengajuan` seperti contoh literal di kontrak amendemen. `B3Dokumen` hanya menambah 4 input baru yang sifatnya presentational (`editable`, `items`, `beratMap`, `toolbar`) dan 2 output (`beratChange`, `jenisChange`) untuk menulis balik interaksi mentah pengguna (klik/ketik) ke parent - is masih **nol logika bisnis** di `B3Dokumen` selain lookup tampilan (`jenisTersedia()`, murni pembacaan `MASTER_DEPARTEMEN` statis, setara dengan `DOK_LOGBOOK` dkk yang sudah diimpornya). Ini dipilih karena (a) mempertahankan kontrak ADR-7 apa adanya alih-alih menciptakan varian baru yang belum diaudit, (b) `pratinjauPengajuan`/`bangunLogbook` sudah pure functions yang gampang diverifikasi di satu tempat (`b3-waste.ts`), (c) risiko lebih rendah - `B3Dokumen` yang sudah lolos Code Review round sebelumnya untuk bagian renderingnya tidak perlu diaudit ulang logika agregasinya.
4. **`pastikanBeratTerisi()` dipanggil dari 3 titik (`bukaDetail`, `setujuiPic`, `gantiPeran`), bukan 1.** Percobaan pertama hanya menaruh pre-fill di `bukaDetail()` (titik paling jelas) - **gagal** di verifikasi interaktif karena skenario mandat orchestrator ("PIC approve+jadwal -> buka detail pengajuan **itu**") ternyata sudah **berada** di halaman detail yang sama sejak sebelum status berubah (navigasi awal terjadi sekali lewat klik "Lihat" di antrean, lalu Supervisor/PIC menyetujui **tanpa** pindah halaman - `pilihanId` tidak pernah di-reset, sesuai AC-30 babak 1). Akibatnya `formTimbang.berat` tetap `{}` kosong tepat saat panel editable pertama kali muncul. Diperbaiki dengan method idempotent (`pastikanBeratTerisi`) yang **hanya mengisi key yang belum pernah disentuh** (memakai `in` check, bukan `??`, supaya tidak menimpa input PIC yang sudah diketik atau field yang sengaja dikosongkan lagi) dan dipanggil ulang di setiap titik yang bisa membuat panel editable pertama kali terlihat: buka detail langsung, PIC baru saja menyetujui+jadwal sambil tetap di halaman yang sama, dan ganti peran ke PIC sambil tetap di halaman detail sebuah pengajuan `APPROVED`. Bug ini murni ditemukan lewat **verifikasi interaktif**, tidak akan terdeteksi oleh `npm run build`/`tsc` semata - dicatat di sini sebagai bukti kenapa langkah verifikasi Playwright wajib, bukan opsional.
5. **Computed global `logbook`/`logbookBlok`/`neraca` (lintas SEMUA pengajuan) dihapus dari `b3-waste.ts`**, bukan dibiarkan sebagai kode mati. Amendemen poin 9 (ringkasan) mencatat rekap lintas-pengajuan "tidak dibangun ulang jadi tampilan baru... cukup dicatat sebagai kemungkinan masa depan" - karena UI-nya (tab global) sudah dihapus (poin 7) dan tidak ada pemanggil lain, computed ini jadi kode mati murni. Dihapus demi ponytail/minimalis; fungsi murni `bangunLogbook()`/`kelompokkanLogbook()`/`hitungNeraca()` di `b3-waste-logbook.ts` (yang sebenarnya menyediakan kemampuan rekap lintas-pengajuan itu) **tetap ada apa adanya** dan bisa dipanggil lagi dengan `pengajuan()` penuh (bukan `[p]`) kapan pun dibutuhkan kembali - tidak ada kemampuan yang hilang, hanya titik pemanggilannya yang untuk sementara tidak dipakai.
6. **Dokumen (`<app-b3-dokumen>`) dirender untuk SEMUA status pengajuan di detail, bukan hanya `APPROVED`/`WEIGHED`.** Kontrak amendemen poin 7 eksplisit: "GANTI [tabel item polos yang **selalu** tampil untuk semua status] dengan `<app-b3-dokumen>`". Konsekuensi: untuk status `WAIT_SUP`/`REJ_SUP`/`WAIT_PIC`/`REJ_PIC` (belum ditimbang), `bangunLogbook([p])` menyaring status &ne; `WEIGHED` sehingga blok kosong &rarr; tampilan jatuh ke empty-state yang sudah ada sejak babak 2 ("Belum ada data logbook..." + Neraca kosong dengan `-` pada Kinerja, bukan `NaN`/error). Dicatat sebagai trade-off sadar (bukan bug): detail pengajuan pra-timbang sekarang menampilkan dokumen formal kosong alih-alih ringkasan item sederhana. Tidak diverifikasi eksplisit oleh orchestrator (alur wajib hanya menguji status `APPROVED`&rarr;`WEIGHED`), jadi diikuti literal tanpa penyimpangan tambahan.

---

## 11. Revisi Amandemen 3 (2026-08-16) - fix bug print + simplifikasi Logbook

Revisi ini ditemukan **setelah SHIP** (bug report user + permintaan penyederhanaan), bukan fitur baru. Kontrak lengkap: `logbook-neraca-format-reference.md` bagian "AMANDEMEN 3" (4 poin, ditulis orchestrator, termasuk diagnosis root cause bug print). `waste-picker.ts/.html/.css` **tidak disentuh sama sekali** di putaran ini.

### 11.1 File yang diubah

| File | Baris (sebelum &rarr; sesudah) | Isi revisi |
|---|---|---|
| `b3-waste-logbook.ts` | 280 &rarr; 294 (+14) | Fungsi murni baru `halamanLogbook(blok: BlokLogbook[], kapasitas = 20): LogbookEntry[][]` - flatten seluruh entries dari `blok` (urutan pengelompokan per-kode dari `kelompokkanLogbook()` dipertahankan) lalu `chunk` per `kapasitas` baris. Ditaruh tepat sebelum `hitungNeraca()`. `kelompokkanLogbook()` **tidak diubah sama sekali** (dipakai persis apa adanya, sesuai instruksi eksplisit kontrak). Kembalikan data ASLI tanpa baris kosong - padding baris kosong sepenuhnya urusan template. |
| `b3-dokumen.ts` | 81 &rarr; 101 (+20) | Import `LogbookEntry`, `halamanLogbook`. 3 anggota baru: `KAPASITAS_LOGBOOK = 20` (protected const), `halaman(): LogbookEntry[][]` (turunan langsung `blok()`, dipanggil ulang tiap render seperti `jenisTersedia()` - pola yang sudah ada, nol signal baru/P-1 tetap dijaga), `padding(jumlahBaris): number[]` (menghasilkan array kosong sepanjang sisa kapasitas, dipakai template untuk `@for` baris pengisi). Komentar kelas diperbarui menjelaskan alasan `halaman()` tetap memenuhi P-1. |
| `b3-dokumen.html` | 257 &rarr; 268 (+11) | Blok Logbook diubah total: `@for (b of blok(); track b.kode)` (satu dokumen per kode) &rarr; `@for (pg of halaman(); track $index)` (satu dokumen per HALAMAN kapasitas-20). `<h2 class="doc-blok-title">{{ b.jenis }} ({{ b.kode }})</h2>` **dihapus** (tidak relevan lagi untuk tabel gabungan). Info box "Halaman" sekarang dinamis: `{{ $index + 1 }} dari {{ halaman().length }}`. Tabel data memakai baris `pg` (bukan `b.entries`). Ditambah blok `@for (_ of padding(pg.length); ...)` yang merender baris `<tr class="doc-row-empty">` (nomor urut lanjutan + 12 sel `&nbsp;`) sampai genap 20 baris per halaman. |
| `b3-dokumen.css` | 4 361 B &rarr; 5 198 B | **Fix bug print (root cause di kontrak Amandemen 3 #1):** `body.b3-printing .b3-doc { position:absolute; ... }` **dihapus** dari selektor `.b3-doc` individual (yang tadinya membuat Logbook & Neraca bertumpuk persis di posisi sama karena keduanya kini berdampingan dalam satu detail pengajuan). Diganti aturan baru `body.b3-printing .b3-print-root { position:absolute; left:0; top:0; width:100% }` yang menyasar wrapper baru (lihat `b3-waste.html`). `.b3-doc` di dalam wrapper sekarang statis (alur normal, bertumpuk vertikal). Aturan page-break diperluas dari `.doc-logbook + .doc-logbook` saja menjadi juga `body.b3-printing .doc-neraca { break-before: page }` (langsung pada elemen, bukan sibling - perlu karena Logbook & Neraca berada di DOM host `<app-b3-dokumen>` yang berbeda, sehingga selector adjacent-sibling `+` tidak menjangkau lintas host). Selektor `.doc-blok-title` dihapus (sudah tidak dipakai di HTML), digabung jadi komentar di atas `.doc-section-title`. |
| `b3-waste.html` | 327 &rarr; 331 (+4) | Kedua pemanggilan `<app-b3-dokumen mode="logbook">`/`<app-b3-dokumen mode="neraca">` dibungkus `<div class="b3-print-root">...</div>` - satu-satunya elemen yang mendapat `position:absolute` saat print (lihat komentar di `b3-dokumen.css`). |

Tidak ada file lain disentuh. `hitungNeraca()` tidak disentuh sama sekali (Neraca tidak terpengaruh revisi ini, sesuai kontrak).

### 11.2 Hasil build

```
npx tsc --noEmit -p tsconfig.app.json   -> bersih, nol error
npm run build                            -> sukses, nol error, nol warning
Initial chunk files | Names         |  Raw size | Estimated transfer size
main-MLUCKJJW.js    | main          | 438.42 kB |               109.36 kB
styles-YPAUNJMG.css | styles        |   1.12 kB |               477 bytes
```

Budget CSS `B3Dokumen` (`b3-dokumen.css` saja): **5 198 B (~5,08 kB)**, naik dari 4 361 B babak Amandemen 2 (header info-box dinamis + baris `doc-row-empty` + aturan print baru) - tetap jauh di bawah batas error 10 kB / warning 8 kB kontrak. `B3Waste`/`WastePicker` tidak berubah ukurannya (file CSS-nya tidak disentuh putaran ini).

### 11.3 Bukti verifikasi interaktif (Playwright Chromium headless, `ng serve --port 4321`, skrip dari scratchpad - tidak menambah dependency ke `frontend/package.json`)

Semua skrip dijalankan terhadap `ng serve` yang benar-benar berjalan (bukan trace kode), nol `pageerror`/`console.error` di seluruh sesi.

**A. Bug print - benar-benar teratasi (kasus normal, `PLB3/2026/0001`, 3 item, alur lengkap sampai `WEIGHED`):**
Login sebagai PIC &rarr; buka detail &rarr; isi field bersama (tanggal timbang/buang, tujuan, manifest) &rarr; isi 3 berat via sel editable (`.doc-input[type=number]`) &rarr; centang pernyataan &rarr; klik Validasi &rarr; status `WEIGHED` terkonfirmasi (`.readonly-note` "Data terkunci..." muncul). Klik "Unduh PDF" (`window.print` distub agar tidak membuka dialog OS di headless) &rarr; `body.className` memuat `b3-printing`. Dengan `page.emulateMedia({media:'print'})`, `getBoundingClientRect()` + `getComputedStyle()` atas SELURUH elemen `.b3-doc`:
```
[{ cls: "b3-doc doc-logbook", visibility: "visible", top: -115, height: 770 },
 { cls: "b3-doc doc-neraca",  visibility: "visible", top: 655,  height: 938 }]
```
Kedua `.b3-doc` **`visibility: visible` DAN posisi `top` berbeda** (bukti tidak bertumpuk - sebelumnya bug membuat keduanya sama-sama `top:0`, Neraca menutupi Logbook). `getComputedStyle('.b3-print-root')` &rarr; `{ position: "absolute", top: "0px", left: "0px", width: "1280px" }` - mengonfirmasi wrapper (bukan `.b3-doc` individual) yang menjadi elemen absolute, sesuai desain fix. Screenshot penuh (`small-03-print-emulated.png`, disimpan di scratchpad) menunjukkan Logbook (1 halaman) lalu Neraca tercetak berurutan sebagai 2 blok terpisah, bukan bertindihan.

**B. Logbook satu tabel gabungan + padding (kasus 3 item):**
Sebelum submit (preview editable): `.doc-logbook` berjumlah **1** (bukan 3 dokumen terpisah per kode seperti sebelumnya); `.doc-table tbody tr` berjumlah **20** total, hanya **3** yang bukan `.doc-row-empty` (data asli: Aki/Oli/Majun - urutan tetap terkelompok per kode karena `kelompokkanLogbook()` tetap dipakai internal `bangunLogbook`&rarr;`kelompokkanLogbook`&rarr;`halamanLogbook`). Setelah submit (`WEIGHED`), struktur baris **identik** (20 total, 3 non-empty) - hanya sel berubah dari input/select ke teks. Screenshot `small-02-weighed-padded.png` mengonfirmasi visual: 3 baris berisi (Aki 10 kg, Oli 15 kg, Majun 20 kg - manifest MNF-2608-999) diikuti 17 baris kosong bernomor urut 4-20 sampai memenuhi satu lembar kertas.

**C. Pagination otomatis >20 item (manipulasi data test sementara, `TIDAK disimpan permanen`):**
Seed `PLB3/2026/0001` di `b3-waste-data.ts` diperbanyak sementara dari 3 jadi **25 item** (lintas Engineering/QA/Produksi, id unik per departemen+sumber+kode) untuk memicu pagination, diverifikasi via Playwright, **lalu dikembalikan persis ke baris asli** (`const items = [buatItem('engineering','ENG','B105d'), buatItem('engineering','ENG','A102d'), buatItem('engineering','ENG','B110d')];` - dikonfirmasi via `grep` setelah revert, tidak ada sisa penanda `TEMP-TEST-PAGINATION`). Hasil saat 25 item aktif:
```
JUMLAH_HALAMAN_LOGBOOK 2
RINCIAN_BARIS_PER_HALAMAN [{"totalRows":20,"nonEmptyRows":20},{"totalRows":20,"nonEmptyRows":5}]
TEKS_HALAMAN ["Halaman1 dari 2","Halaman2 dari 2","Halaman1 dari 1"]
```
Halaman 1 penuh (20/20 baris data, TANPA padding karena pas penuh), halaman 2 berisi 5 baris data + 15 baris kosong pengisi. Print emulation dengan 3 `.b3-doc` (2 halaman Logbook + 1 Neraca) sekaligus: seluruhnya `visibility: visible`, `top` masing-masing **berbeda** (`-238`, `692`, `1502` - `Set` unik = 3 dari 3 elemen), membuktikan `break-before: page` bekerja untuk kasus multi-halaman DAN transisi Logbook&rarr;Neraca sekaligus. Screenshot `big-01-overview.png` (tampilan layar biasa, 3 dokumen berurutan) dan `big-03-print-emulated.png` (dengan `emulateMedia(print)` aktif) disimpan sebagai bukti visual di scratchpad.

**D. Regresi:**
- **Neraca tidak berubah**: `hitungNeraca()` tidak disentuh; pada kasus B, TOTAL (A)=(B) `0,0450` Ton, Kinerja `100,00%`, 3 baris Bagian I/II sesuai 3 item yang divalidasi - identik pola sebelum revisi.
- **WastePicker masih normal**: dari tab "Ajukan Pembuangan" (state baru), centang departemen "Engineering" (auto-expand 1-sumber, sesuai perilaku sejak babak 1) lalu centang checkbox jenis "Oli" &rarr; setelah 900 ms diam, teks "1 jenis dipilih" **tetap ada** (tidak reset sendiri - bug babak 1 yang sudah diperbaiki tidak regresi). File `waste-picker.ts/.html/.css` dikonfirmasi tidak tersentuh sama sekali di sesi ini (tidak pernah jadi target Write/Edit).

### 11.4 Keputusan implementasi non-trivial

1. **Judul per-blok (`<h2 class="doc-blok-title">{{ b.jenis }} ({{ b.kode }})</h2>`) dihapus total dari markup, tidak diganti judul lain.** Kontrak Amandemen 3 #2 hanya menginstruksikan "gabungkan jadi SATU tabel" tanpa menyebut judul pengganti; karena satu halaman sekarang bisa berisi banyak kode limbah sekaligus (lihat kasus C: 20 kode berbeda dalam 1 halaman), judul tunggal per-kode sudah tidak representatif dan akan menyesatkan (mis. tertulis "Aki (A102d)" padahal halaman itu juga berisi baris Oli/Majun/dst). Judul dokumen umum ("LEMBAR DATA PENYIMPANAN...") di header `.doc-head` sudah cukup mengidentifikasi dokumen tanpa perlu sub-judul kode.
2. **`.doc-neraca` diberi `break-before: page` langsung (bukan lewat sibling combinator `.b3-doc + .b3-doc`).** Root cause bug asli adalah `position:absolute` pada tiap `.b3-doc`, sudah diperbaiki lewat wrapper `.b3-print-root`. Tapi begitu `.b3-doc` kembali ke alur normal, transisi halaman terakhir Logbook &rarr; Neraca perlu page-break eksplisit juga - namun secara struktur DOM, section `.doc-logbook` terakhir dan `.doc-neraca` **bukan sibling langsung** (masing-masing berada di dalam host `<app-b3-dokumen>` yang berbeda: satu untuk `mode="logbook"`, satu untuk `mode="neraca"`), sehingga selector `+` (adjacent sibling) yang sudah ada (`.doc-logbook + .doc-logbook`) tidak bisa dipakai untuk transisi ini. Solusinya: aturan terpisah yang menempel LANGSUNG ke `.doc-neraca` (bukan bergantung pada posisi sibling-nya), sehingga tetap benar terlepas dari struktur host di sekitarnya.
3. **Baris kosong pengisi (`.doc-row-empty`) diberi nomor urut lanjutan (`{{ pg.length + pi + 1 }}`), bukan benar-benar kosong total.** Kontrak Amandemen 3 #3 eksplisit mengizinkan kedua opsi ("boleh cuma nomor urut terisi atau benar-benar kosong semua"). Nomor urut lanjutan dipilih karena lebih mendekati tampilan form kertas asli (baris bernomor 1-20 walau sebagian kosong, konsisten dengan pola blanko formulir fisik yang dicetak duluan sebelum diisi tangan) dan memudahkan verifikasi visual/otomatis (jumlah baris = 20 selalu bisa dicek dari nomor baris terakhir).
4. **`halaman()`/`padding()` di `B3Dokumen` tetap berupa PLAIN METHOD (bukan `computed()`), konsisten pola `jenisTersedia()`/`dokBlok(p)`/`dokNeraca(p)` yang sudah ada sejak Amandemen 2.** Alternatif memakai `computed(() => halamanLogbook(this.blok()))` sempat dipertimbangkan (berpotensi sedikit lebih efisien secara caching), tapi memilih pola method biasa untuk konsistensi dengan konvensi codebase yang sudah diaudit Code Review sebelumnya ("P-1 = turunan murni dipanggil ulang tiap render dari template, bukan disimpan sebagai signal/computed baru") - menghindari ambiguitas apakah `computed()` di komponen presentational dianggap "signal baru" yang dilarang P-1 atau tidak. Method biasa jelas-jelas bukan storage, nol perdebatan interpretasi.

---

## 12. Fix Ronde 5 - CHANGES REQUESTED ditutup (2026-08-16, sesi lanjutan)

Code Review Ronde 5 (`05-code-review.md`) memverifikasi laporan Bagian 11 di atas dengan PDF **sungguhan** (Playwright `page.pdf()` + `pypdf`, bukan hanya `getBoundingClientRect()`) dan menemukan 2 defect nyata: 1 BLOCKER (halaman kosong di depan PDF untuk status pra-WEIGHED) dan 1 MAJOR (tabel Logbook 20-baris lebih tinggi dari satu halaman fisik A4 landscape). Verdict: **CHANGES REQUESTED**. Sesi ini memperbaiki keduanya dan memverifikasi ulang dengan metodologi PDF sungguhan yang identik dengan reviewer.

### 12.1 File yang diubah sesi ini

| File | Isi perubahan |
|---|---|
| `b3-dokumen.ts` | Tambah input `breakBefore = input<boolean>(true)` (dipakai HANYA oleh mode Neraca) - lihat 12.2. |
| `b3-dokumen.html` | (a) `<section class="b3-doc doc-neraca">` &rarr; `[class.doc-neraca-break]="breakBefore()"` (fix BLOCKER). (b) `<table class="doc-table">` Logbook &rarr; `<table class="doc-table doc-table-logbook">` + `<colgroup>` 13 kolom lebar tetap (fix MAJOR, lihat 12.3). |
| `b3-waste.html` | `<app-b3-dokumen mode="neraca" ...>` diberi `[breakBefore]="dokBlok(p).length > 0"` - satu-satunya titik yang tahu apakah Logbook pengajuan ini benar-benar kosong atau tidak. |
| `b3-dokumen.css` | (a) Selektor print `body.b3-printing .doc-neraca` &rarr; `.doc-neraca-break` (fix BLOCKER). (b) Tambah `height:0/overflow:hidden` pada aturan `visibility:hidden` blanket + pengecualian untuk `.b3-print-root`/`.b3-doc` (fix defect BLOCKER turunan - lihat 12.2 catatan tambahan). (c) `.doc-table-logbook { table-layout: fixed }` + padding/font-size dipadatkan di seluruh `.b3-doc`/`.doc-head`/`.doc-meta`/`.doc-table`/`.doc-foot` (fix MAJOR, lihat 12.3). |
| `b3-waste-data.ts` | **Tidak berubah permanen** - sempat diperbesar sementara ke 20 lalu 25 item pada seed `PLB3/2026/0001` (+1 langkah `PIC_WEIGH` sementara) untuk skenario uji B/C, **direvert 100% ke bentuk asli** setelah pengukuran, dikonfirmasi `diff` byte-identik dengan versi sebelum sesi ini (lihat 12.4). |

`waste-picker.*`, `b3-waste-model.ts`, `b3-waste-model.spec.ts`, `kelompokkanLogbook()`/`hitungNeraca()` di `b3-waste-logbook.ts` **tidak disentuh sama sekali** (sesuai batasan orchestrator) - dikonfirmasi lewat `Get-ChildItem` mtime: hanya `b3-dokumen.ts/.html/.css` dan `b3-waste.html` yang bertimestamp sesi ini; `b3-waste-logbook.ts`/`b3-waste.ts`/`b3-waste.css` tetap bertimestamp sesi sebelumnya.

### 12.2 Fix BLOCKER - halaman kosong di depan PDF (status pra-WEIGHED)

**Root cause (dikonfirmasi Reviewer Ronde 5):** aturan `body.b3-printing .doc-neraca { break-before: page }` memaksa page-break tanpa syarat, padahal untuk status pra-WEIGHED, Logbook (`dokBlok(p).length === 0`) jatuh ke `.doc-empty` (bukan `.b3-doc`) - forced break itu sendiri menciptakan 1 halaman kosong sebelum Neraca.

**Fix:** break-before dipindah jadi kondisional lewat class binding, bukan CSS tanpa syarat:
- `B3Dokumen` dapat input baru `breakBefore` (default `true`, dipakai hanya oleh instance mode Neraca).
- Section `.doc-neraca` di template mendapat class tambahan `doc-neraca-break` HANYA bila `breakBefore()` true.
- `b3-waste.html` menyuntik `[breakBefore]="dokBlok(p).length > 0"` - persis kondisi yang sama dipakai template Logbook (`@if (blok().length)`) untuk memutuskan apakah menampilkan `.doc-empty` atau tabel data, sehingga kedua sisi (Logbook kosong-atau-tidak, Neraca break-atau-tidak) dijamin konsisten dari satu sumber kebenaran yang sama.
- CSS: `body.b3-printing .doc-neraca { break-before: page }` &rarr; `body.b3-printing .doc-neraca-break { break-before: page }`.

**Catatan tambahan (ditemukan sendiri saat verifikasi ulang dengan PDF sungguhan, DI LUAR 2 defect yang dilaporkan reviewer, tapi wajib ditutup karena kriteria verifikasi eksplisit "TIDAK ADA halaman kosong"):** setelah fix di atas, PDF status pra-WEIGHED sudah tidak punya halaman kosong di DEPAN, tapi ditemukan 1 halaman kosong TAMBAHAN di EKOR PDF (2 halaman total: Neraca lalu 1 halaman kosong). Root cause: `body.b3-printing * { visibility: hidden }` menyembunyikan chrome aplikasi (sidebar/topbar/panel lain) secara visual, TAPI tidak mengeluarkannya dari alur dokumen (layout) - total tinggi elemen tersembunyi itu (diukur 807px pada kasus uji) melebihi satu halaman cetak (~733px @ margin 8mm), sehingga browser menambah 1 halaman kosong ekstra untuk menampungnya meski isinya tak pernah terlihat. Fix: aturan wildcard ditambah `height: 0 !important; overflow: hidden !important;`, dengan `.b3-print-root`/`.b3-doc`/turunannya dikecualikan (`height: auto; overflow: visible`) supaya konten yang memang harus tercetak tidak ikut terpangkas. Diverifikasi AMAN (tidak memotong konten) karena tidak ada satu pun ancestor `.b3-print-root` di aplikasi ini yang `position` selain `static` (grep `position: (relative|absolute|fixed|sticky)` atas `layout/**` hanya menemukan `.topbar { position: sticky }`, dan `.topbar` adalah SIBLING dari `router-outlet` di `layout.html`, bukan ancestor dari `.b3-print-root`) - sehingga `.b3-print-root` (position:absolute) positioning-nya relatif ke initial containing block, tidak tergantung ukuran/overflow ancestor manapun. Setelah fix ini: 1 halaman, nol karakter kosong di halaman manapun (lihat 12.5).

### 12.3 Fix MAJOR - Logbook 20-baris tidak muat 1 halaman fisik

**Root cause diukur ulang (bukan asumsi):** dengan viewport disamakan ke lebar area cetak sungguhan (1062px, dihitung dari lebar konten A4 landscape dikurangi margin 8mm x2), `.doc-logbook` tinggi 759,6px vs budget 733,1px (kelebihan ~26px) - TAPI penyebab utamanya bukan padding/font semata: kolom "Bukti Nomor Dokumen" (dan sejenisnya) memakai `table-layout: auto` sehingga browser mengalokasikan lebar kolom terlalu sempit, memaksa nilai seperti nomor manifest membungkus 2 baris di **SETIAP** baris data (20 baris x tinggi dobel = pemborosan terbesar, terkonfirmasi lewat pengukuran per-baris `getBoundingClientRect()`: 25,84px/baris saat wrap terjadi vs 14,92px/baris setelah fix).

**Fix (kombinasi):**
1. **`table-layout: fixed` + `<colgroup>` 13 kolom lebar tetap** pada tabel Logbook (kelas baru `doc-table-logbook`, tidak menyentuh tabel Neraca yang tetap `table-layout: auto`) - lebar dihitung supaya nilai realistis (nomor manifest ~13 karakter, nama jenis limbah terpanjang di master data ~22 karakter "Bahan Kimia Kadaluarsa") tetap 1 baris, bukan mengandalkan auto-sizing browser yang terbukti tidak dapat diprediksi.
2. **Densitas visual dipadatkan** di seluruh `.b3-doc` (padding `18px 20px` &rarr; `10px 16px`), `.doc-head`/`.doc-meta` (padding sel dikurangi ~2-3px), `.doc-table` (padding sel `4px 6px` &rarr; `1.5px 5px`, font `10.5px` &rarr; `9.5px`), `.doc-foot` (`margin-top 18px` &rarr; `8px`, `.doc-sign-box` tinggi `46px` &rarr; `26px`) - semua nilai masih dalam batas wajar terbaca (bukan mikroskopis), diverifikasi visual lewat render PDF (lihat screenshot bukti 12.5).

**Hasil setelah fix:** `.doc-logbook` tinggi turun ke 562,97px (headroom ~170px di bawah budget 733,1px) - **kapasitas 20 baris DIPERTAHANKAN (tidak diturunkan ke 18)**, karena setelah fix table-layout+densitas, 20 baris + header 2-baris + footer tanda tangan terbukti muat nyaman dalam satu halaman fisik dengan margin aman, dikonfirmasi lewat PDF sungguhan (bukan hanya DOM), lihat 12.5 skenario B/C. Tidak ada penyimpangan dari kontrak "20 baris/halaman" yang perlu dicatat.

### 12.4 Metodologi verifikasi ulang (identik dengan Reviewer Ronde 5)

Playwright Chromium headless (`npm install playwright` di direktori scratchpad terpisah - **tidak menambah dependency ke `frontend/package.json`**) + `ng serve --port 4300` sungguhan (bukan trace kode) untuk setiap skenario:
1. Navigasi ke `/b3-waste`, buka detail pengajuan target lewat interaksi UI nyata (klik tab/tombol "Lihat", bukan manipulasi state langsung).
2. `document.body.classList.add('b3-printing')` + `page.emulateMedia({ media: 'print' })` (mereplikasi persis apa yang dilakukan `cetak()` di `b3-dokumen.ts`).
3. `page.pdf({ format: 'A4', landscape: true, printBackground: true })` - PDF **sungguhan**, bukan screenshot.
4. Baca ulang PDF dengan `pypdf.PdfReader` (Python) - hitung `len(reader.pages)` dan `extract_text()` per halaman untuk mendeteksi halaman kosong (0 karakter) dan memverifikasi urutan/isi konten.
5. Render tiap halaman ke PNG (`pymupdf`) untuk verifikasi visual manual (tidak ada teks terpotong/tertumpuk).

Skenario B/C (Logbook 20 & >20 baris) butuh pengajuan berstatus `WEIGHED` dengan banyak item - seed `PLB3/2026/0001` diperbesar SEMENTARA (20 lalu 25 item lintas Engineering/QA/Produksi, id unik per departemen+sumber+kode, ditambah 1 langkah `PIC_WEIGH` di `bangunSeed()`) persis pola yang sudah dipakai & disetujui pada laporan Bagian 11.3-C, lalu direvert. Revert dikonfirmasi bersih lewat `diff` (byte-identik dengan file sebelum sesi ini, nol sisa penanda test).

### 12.5 Hasil verifikasi PDF sungguhan (angka konkret per skenario)

**Skenario A - status pra-WEIGHED, TIDAK ADA halaman kosong (kriteria wajib):**
| Pengajuan | Status | Jumlah halaman PDF | Isi |
|---|---|---|---|
| `PLB3/2026/0002` | WAIT_PIC ("Disetujui Supervisor") | **1** | Neraca kosong (Kinerja `-`), 0 halaman kosong |
| `PLB3/2026/0003` | WAIT_SUP ("Diajukan") | **1** | Neraca kosong, 0 halaman kosong |

Sebelum fix (reproduksi ulang defect asli): `PLB3/2026/0002` menghasilkan 2 halaman (halaman 0 = 0 karakter/kosong total, halaman 1 = Neraca) - blocker dikonfirmasi ada, lalu dikonfirmasi hilang (1 halaman, langsung berisi Neraca) setelah fix 12.2 (termasuk sub-fix trailing-blank-page).

**Skenario B - WEIGHED, 20 item (Logbook harus PERSIS 1 halaman penuh):**
| Pengajuan (temp) | Jumlah item | Jumlah halaman PDF total | Rincian |
|---|---|---|---|
| `PLB3/2026/0001` (diperbesar sementara) | 20 | **3** | Hal.0 = Logbook lengkap (header + 20 baris data + footer tanda tangan, SEMUA di 1 halaman, "Halaman 1 dari 1"); Hal.1-2 = Neraca (2 halaman, tidak terkait defect Logbook) |

Sebelum fix MAJOR: 4 halaman (Logbook terpotong jadi 2 halaman - footer tanda tangan "Diperiksa oleh/Disetujui oleh" terpisah sendirian di halaman ke-2, tanpa tabel). Setelah fix: Logbook **PERSIS 1 halaman**, header+tabel 20-baris+footer tanda tangan seluruhnya di halaman yang sama, tidak terpotong - dikonfirmasi lewat `extract_text()` (semua 20 baris + "Diperiksa oleh"/"Disetujui oleh" ada di teks halaman 0 yang sama) dan render visual PNG.

**Skenario C - WEIGHED, 25 item (>20, pagination 2 halaman Logbook + Neraca, tanpa halaman kosong ekstra):**
| Pengajuan (temp) | Jumlah item | Jumlah halaman PDF total | Rincian |
|---|---|---|---|
| `PLB3/2026/0001` (diperbesar sementara) | 25 | **4** | Hal.0 = Logbook "Halaman 1 dari 2" (20 baris data, tanpa padding karena pas penuh); Hal.1 = Logbook "Halaman 2 dari 2" (5 baris data + 15 baris padding kosong bernomor 6-20, semua di 1 halaman fisik); Hal.2-3 = Neraca (2 halaman) |

Nol halaman kosong ekstra di manapun (dikonfirmasi `extract_text()` tiap halaman punya konten, tidak ada yang 0 karakter). Urutan benar: Logbook hal.1 &rarr; Logbook hal.2 &rarr; Neraca - konsisten kontrak pagination.

**Ringkasan angka kapasitas final:** Kapasitas Logbook **tetap 20 baris/halaman** (`KAPASITAS_LOGBOOK` di `b3-dokumen.ts` tidak diubah) - TIDAK diturunkan ke 18. Setelah fix `table-layout: fixed` + densitas CSS, 20 baris terverifikasi muat 1 halaman fisik dengan headroom ~170px (DOM, viewport print-equivalent) dan dikonfirmasi ulang lewat PDF sungguhan (Skenario B: 1 halaman, "Halaman 1 dari 1", semua konten utuh). Tidak ada penyimpangan dari asumsi kontrak yang perlu dicatat ke Arsitek.

### 12.6 Build & test (dijalankan ulang setelah semua fix + revert seed)

```
npx tsc --noEmit -p tsconfig.app.json   -> bersih, nol error
npm run build                            -> sukses, nol error, nol warning
main-ZVHZN3LB.js    | main   | 439.18 kB | 109.65 kB
styles-YPAUNJMG.css | styles |   1.12 kB | 477 bytes
npx vitest run src/app/pages/b3-waste/b3-waste-model.spec.ts  -> 36/36 PASS
```

Budget CSS `b3-dokumen.css`: **7 584 B (~7,4 kB)**, naik dari 5 198 B (Bagian 11) karena `<colgroup>` HTML + aturan `table-layout`/`height`/`overflow` tambahan - tetap di bawah batas kontrak 8 kB (mepet, dicatat untuk perhatian bila ada penambahan CSS lagi di masa depan).

---

## 13. Fix Ronde 6 - CHANGES REQUESTED ditutup: Logbook rapuh terhadap nilai realistis (2026-08-16, sesi lanjutan)

Code Review Ronde 6 (`05-code-review.md`) mengonfirmasi fix MAJOR Bagian 12.3 **BENAR untuk kasus yang diuji Bagian 12.5** (nilai pendek sesuai contoh baku `PT. PLIB`/`MNF-2608-001`), tapi **rapuh** terhadap nilai realistis: field `Tujuan Penyerahan` dan `No. Manifest` (input bebas tanpa `maxlength`, disalin identik ke SEMUA baris Logbook karena field bersama satu-pengajuan) di atas ~24-26 karakter membuat tabel 20-baris kembali terpotong jadi 2 halaman fisik - direproduksi reviewer dengan 2 nama vendor pengolah limbah B3 nyata di Indonesia (29 & 36 karakter) dan 1 format nomor manifest realistis (22 karakter). Verdict: **CHANGES REQUESTED**, 1 MAJOR wajib ditutup + retest matriks lengkap dengan PDF sungguhan.

### 13.1 File yang diubah sesi ini

| File | Isi perubahan |
|---|---|
| `b3-dokumen.html` | (a) `<colgroup>` tabel Logbook: lebar kolom Tujuan Penyerahan `13%→17%` dan Bukti Nomor Dokumen `10%→12,5%`, diambil HANYA dari 2 kolom yang nilainya terjamin pendek/setara kolom lain yang sudah terbukti aman (lihat 13.2). (b) `<td>` Tujuan Penyerahan & Bukti Nomor Dokumen diberi `class="doc-cell-clip"` + `[title]="e.tujuan"`/`[title]="e.noManifest"` (jaring pengaman mutlak, lihat 13.2). |
| `b3-dokumen.css` | Tambah 1 rule `.doc-table-logbook td.doc-cell-clip { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`. |
| `b3-waste.html` | Input `Tujuan Penyerahan` & `Nomor Manifest` diberi `maxlength="40"` (defense-in-depth, lihat 13.2 poin 3). |
| `b3-waste-data.ts` | **Tidak berubah permanen** - dipakai sementara untuk 7 skenario uji PDF (20 item, seed `PLB3/2026/0001` + 1 langkah `PIC_WEIGH`, pola identik Bagian 12.4), direvert 100% setelah tiap pengukuran, dikonfirmasi `diff`/`cmp` byte-identik dengan versi sebelum sesi ini (lihat 13.4). |

`b3-dokumen.ts`, `b3-waste-logbook.ts` (termasuk `halamanLogbook()`/`kelompokkanLogbook()`/`hitungNeraca()`), `b3-waste-model.ts`, `waste-picker.*` **tidak disentuh** - `KAPASITAS_LOGBOOK` tetap 20 (opsi "turunkan kapasitas" dari mandat orchestrator TIDAK dipakai; opsi yang dipakai adalah kombinasi lebar kolom + clip ellipsis + `maxlength`, lihat 13.2 untuk alasan).

### 13.2 Root cause & fix

**Root cause (dikonfirmasi reviewer, bukan tebakan):** `<colgroup>` Ronde 5 dihitung memakai contoh baku `PT. PLIB` (8 karakter) sebagai patokan lebar kolom Tujuan (13%) & No. Manifest (10%) - lebar itu cukup untuk teks pendek TAPI nama vendor B3 realistis (rata-rata 24-36 karakter, dibuktikan reviewer dengan 2 nama vendor nyata) melebihi kapasitas kolom, wrap 2 baris, dan karena field ini SAMA di SEMUA 20 baris (bukan per-item), efeknya dikalikan 20x - jauh lebih sensitif daripada kolom lain yang nilainya bervariasi per-baris.

**Fix (2 lapis, bukan 1):**

1. **Lebarkan kolom + realokasi dari donor yang benar-benar aman (percobaan pertama GAGAL, dicatat sebagai pembelajaran):** Percobaan awal mengambil ruang dari kolom `No.`/`Petugas` (asumsi "nama PIC selalu pendek") - **diverifikasi PDF sungguhan hasilnya REGRESI LEBIH PARAH (4 halaman)** karena `Petugas` diperkecil ke 4% membuat "Pak Ruli" (nilai `olehPic` PIC tunggal di seed, 8 karakter) ikut wrap 2 baris di SEMUA 20 baris, dan `No.` diperkecil ke 2% membuat angka 2-digit (10-20) ikut wrap. Diperbaiki: donor final HANYA `Sisa (kg)` (selalu string `"0"` - lihat `sisaKg: 0 // P-3` di `b3-waste-logbook.ts`, `6%→2%`) dan `Maksimal Penyimpanan` (format tanggal identik dengan kolom Tanggal Masuk/Keluar yang sudah terbukti muat di 7%, `9,5%→7%`) - keduanya dijamin aman lewat perbandingan langsung dengan kolom lain yang SUDAH terverifikasi PASS, bukan asumsi baru. Hasil: Tujuan `13%→17%`, No. Manifest `10%→12,5%`, kolom lain (`No.`, `Jenis`, `Petugas` x2, tanggal, berat) dikembalikan/dipertahankan ke lebar ASLI Ronde 5 yang sudah terbukti aman.
2. **`doc-cell-clip` (nowrap + overflow hidden + text-overflow ellipsis) khusus 2 kolom ini - jaring pengaman MUTLAK, bukan sekadar pelebaran.** Ini bukan cuma "kolom lebih lebar" (yang tetap punya batas dan bisa jebol lagi oleh nama vendor yang lebih panjang lagi di masa depan) - `doc-cell-clip` menjamin tinggi baris tabel **TIDAK PERNAH bertambah berapa pun panjang teksnya**, karena baris tidak pernah wrap ke baris ke-2. Diverifikasi lewat skenario ekstrem 111 karakter (jauh di luar `maxlength`, mensimulasikan nilai yang lolos lewat cara lain) - tetap 3 halaman (13.4, skenario tambahan #7). Kolom lain (`No.`/`Petugas`/`Sisa`/tanggal) TIDAK diberi `doc-cell-clip` karena nilainya bukan free-text tanpa batas (index urut, nama PIC tunggal hardcoded, konstanta `"0"`, format tanggal tetap) - menambah clip di sana hanya kosmetik, tidak menutup risiko nyata.
3. **`maxlength="40"` pada kedua `<input>` di `b3-waste.html` - defense-in-depth, bukan mekanisme utama.** Karena `doc-cell-clip` sudah menjamin layout aman untuk PANJANG BERAPA PUN, `maxlength` di sini murni untuk kualitas dokumen tercetak (mencegah PIC tanpa sadar mengetik nama sangat panjang yang ujungnya terpotong "…" di dokumen resmi) - bukan syarat supaya halaman tidak pecah (itu sudah dijamin poin 2). Angka 40 dipilih karena: (a) lebih besar dari nama vendor B3 terpanjang yang diuji reviewer (36 karakter, `PT Prasadha Pamunah Limbah Industri`) dengan margin wajar, dan (b) diverifikasi PDF sungguhan bahwa 40 karakter PUN (skenario worst-case: KEDUA field sekaligus di 40 karakter) tetap 3 halaman TANPA perlu terpotong ellipsis sama sekali (lihat 13.4, skenario #6) - jadi `maxlength=40` bukan angka tebakan, terbukti aman dan generous sekaligus.

### 13.3 Metodologi verifikasi ulang (identik Bagian 12.4, plus reproduksi persis 5 nilai uji reviewer)

Playwright Chromium headless + `ng serve --port 4400` sungguhan, `page.pdf()` A4 landscape `printBackground:true`, `pypdf.PdfReader` (`C:\Python313\python.exe`) untuk hitung halaman & `extract_text()`. Seed `PLB3/2026/0001` dipatch ke 20 item (kombinasi dept/sumber/kode IDENTIK dengan `patch_seed.mjs` milik reviewer Ronde 6, lihat scratchpad `r6verify/patch_seed.mjs`) + 1 langkah `PIC_WEIGH` dengan `tujuan`/`noManifest` disuntik per skenario, lalu direvert ke `b3-waste-data.ts.orig` (byte-identik, dikonfirmasi `diff` + `cmp`) sebelum skenario berikutnya di-patch - tidak ada 2 skenario yang tumpang tindih pada file yang sama.

### 13.4 Hasil verifikasi PDF sungguhan - SELURUH 5 nilai uji reviewer + 2 skenario tambahan

| # | Nilai diuji | Field | Panjang | Hasil Ronde 6 (SEBELUM fix) | Hasil Ronde 7 (SESUDAH fix) |
|---|---|---|---|---|---|
| 1 | `PT. PLIB` | tujuan | 8 char | 3 halaman (PASS) | **3 halaman (PASS)** |
| 2 | `PT Wastec International` | tujuan | 24 char | 3 halaman (PASS, pas di batas) | **3 halaman (PASS)** |
| 3 | `PT Pengelola Limbah Sukabumi` | tujuan | 29 char | **4 halaman (GAGAL)** | **3 halaman (PASS)** |
| 4 | `PT Prasadha Pamunah Limbah Industri` | tujuan | 36 char | **4 halaman (GAGAL)** | **3 halaman (PASS)** - teks utuh tampil TANPA terpotong ellipsis (kolom cukup lebar) |
| 5 | `MNF/2026/VIII/00123-A` | noManifest | 22 char | **4 halaman (GAGAL)** | **3 halaman (PASS)** |
| 6 (tambahan) | Kedua field sekaligus di `maxlength` 40 char | tujuan + noManifest | 40 + 40 char | tidak diuji reviewer | **3 halaman (PASS)** - masih tanpa perlu ellipsis |
| 7 (tambahan) | Nilai ekstrem melewati `maxlength` (mensimulasikan bypass) | tujuan | 111 char | tidak diuji reviewer | **3 halaman (PASS)** - `doc-cell-clip` memotong dengan ellipsis, layout tetap utuh |

Setiap baris tabel di atas diuji pada pengajuan 20-item yang sama (skenario B Bagian 12.5: header + 20 baris data + footer tanda tangan dalam 1 halaman Logbook, "Halaman 1 dari 1", diikuti 2 halaman Neraca = 3 halaman total) - PDF disimpan di scratchpad `r6verify/R7-S1..S7-*.pdf` untuk audit ulang bila diperlukan. Nol halaman kosong terdeteksi di semua skenario (`extract_text()` tiap halaman berisi konten).

### 13.5 Build & test (dijalankan ulang setelah semua fix + revert seed)

```
npx tsc --noEmit -p tsconfig.app.json   -> bersih, nol error
npm run build                            -> sukses, nol error, nol warning
main-FZKIWEUD.js    | main   | 440.09 kB | 109.75 kB
styles-YPAUNJMG.css | styles |   1.12 kB | 477 bytes
npx vitest run src/app/pages/b3-waste/b3-waste-model.spec.ts  -> 36/36 PASS
```

Budget CSS `b3-dokumen.css`: **8 044 B (~7,9 kB)**, naik dari 7 584 B (Bagian 12.6) karena 1 rule `.doc-cell-clip` + komentar penjelas root-cause/fix - tetap di bawah batas kontrak 10 kB error dan tidak memicu warning `anyComponentStyle` (ambang 6 kB gzip, dikonfirmasi `npm run build` nol warning). Headroom byte mentah tersisa ~2 kB dari batas error - dicatat untuk perhatian bila ada penambahan CSS besar di masa depan pada file ini.

### 13.6 Catatan untuk Arsitek (tidak ada perubahan kontrak, murni informasi)

Tidak ada perubahan pada `02-architecture.md`, model data, atau kontrak API - seluruh fix murni presentational (lebar kolom, 1 rule CSS, 1 atribut HTML `maxlength`). Satu hal yang mungkin relevan untuk dicatat: field `Tujuan Penyerahan` & `No. Manifest` kini dibatasi 40 karakter di UI (`maxlength`) - bila Arsitek ingin batas ini juga ditegakkan di lapisan lain (mis. validasi saat kontrak backend nyata dibangun di masa depan), 40 karakter adalah angka yang sudah diverifikasi aman untuk tata letak dokumen cetak Logbook, bukan sekadar konvensi UI.

---

## 14. Fix Ronde 7 - BLOCKER cascade CSS ditutup: `overflow:hidden` pada `.doc-cell-clip` dinetralkan `!important` wildcard saat print sungguhan (2026-08-16, sesi lanjutan)

Code Review Ronde 7 (`05-code-review.md`) membuktikan lewat `getComputedStyle()` sungguhan di bawah kondisi print (`body.b3-printing` + `page.emulateMedia({media:'print'})` bersamaan) bahwa `overflow:hidden` pada `.doc-cell-clip` (fix Ronde 6) **tidak pernah aktif saat mencetak sungguhan** - dinetralkan oleh rule wildcard `body.b3-printing .b3-doc * { overflow: visible !important; ... }` (fix BLOCKER Ronde 5, baris 113-116) yang sama-sama `!important` dan menang lewat specificity yang identik. Akibatnya teks kolom Tujuan Penyerahan/Bukti Nomor Dokumen di atas ~30-33 karakter bocor visual tumpang tindih ke sel tetangga di PDF final, meski jumlah halaman "kelihatan benar" (karena `white-space:nowrap` sendirian sudah cukup menjaga tinggi baris konstan). Verdict Ronde 7: **CHANGES REQUESTED**, 1 BLOCKER wajib ditutup + metodologi verifikasi baru (`getComputedStyle()`, bukan cuma jumlah halaman).

### 14.1 File yang diubah sesi ini

| File | Isi perubahan |
|---|---|
| `b3-dokumen.css` | Tambah 1 rule BARU `body.b3-printing .doc-cell-clip { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }`, ditempatkan **setelah** rule wildcard `body.b3-printing .b3-doc * { ...overflow: visible !important... }` (baris 113-116) di urutan file - lihat 14.2 untuk alasan posisi. Rule lama `.doc-table-logbook td.doc-cell-clip` (Ronde 6, tanpa `!important`, di luar `@media print`) **tidak diubah/dihapus** - tetap berlaku untuk mode layar biasa. |
| `b3-waste-data.ts` | **Tidak berubah permanen** - dipakai sementara untuk 8 skenario uji PDF (seed `PLB3/2026/0001` 3-item asli + 4 pengajuan tambahan `#5-#8`: 20-item x2 nilai ambang/maxlength, 25-item regresi pagination, 20-item nilai ekstrem 111 char), direvert 100% setelah pengukuran - dikonfirmasi jumlah baris file (275) identik dengan sebelum sesi ini (lihat 14.4). |

`b3-dokumen.html`, `b3-dokumen.ts`, `b3-waste.html`, `b3-waste-logbook.ts`, `b3-waste-model.ts`, `waste-picker.*` **tidak disentuh** - fix 100% terbatas pada satu rule CSS baru di `b3-dokumen.css`.

### 14.2 Root cause & fix (ringkas, detail teknis lengkap sudah didiagnosis presisi oleh reviewer di `05-code-review.md` RONDE 7 Bagian 3)

`td.doc-cell-clip` adalah descendant dari `.b3-doc` (section `class="b3-doc doc-logbook"`), sehingga ikut tersasar rule wildcard `body.b3-printing .b3-doc * { overflow: visible !important; ... }` yang ditulis Ronde 5 untuk tujuan LAIN (mencegah chrome tersembunyi menyumbang tinggi halaman kosong). Karena kedua rule sama-sama `!important` dan sama-sama punya specificity 2 kelas + 1 elemen (`body.b3-printing .b3-doc *` vs `body.b3-printing .doc-cell-clip`), CSS tie-break jatuh ke **source order** - rule yang datang lebih akhir di file menang. Rule lama Ronde 6 (`.doc-table-logbook td.doc-cell-clip`, tanpa `!important`) selalu kalah dari wildcard Ronde 5 begitu keduanya sama-sama match (yaitu tepat saat `body.b3-printing` + `@media print` aktif bersamaan - kondisi window.print() sungguhan).

**Fix:** rule baru dengan selector `body.b3-printing .doc-cell-clip` (2 kelas + 1 elemen - specificity IDENTIK dengan wildcard), ketiga deklarasi (`overflow`/`text-overflow`/`white-space`) diberi `!important`, dan **ditempatkan setelah** rule wildcard baris 113-116 di urutan file - sehingga menang murni lewat source order, bukan lewat specificity yang lebih tinggi (memang tidak mungkin lebih tinggi karena `.doc-cell-clip` sendiri hanya 1 kelas tambahan dibanding `*` yang berkontribusi nol).

Rule CSS final (b3-dokumen.css, di dalam `@media print`, setelah baris 116):
```css
body.b3-printing .doc-cell-clip {
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
```

### 14.3 Verifikasi WAJIB #1 (paling penting) - `getComputedStyle()` sungguhan di bawah print emulation

Playwright Chromium headless, `ng serve --port 4210`, viewport diset ke **lebar konten A4 landscape sesungguhnya** (`(297-16)mm x (210-16)mm` dikonversi ke px @96dpi = **1062x733px**, mengikuti margin 8mm dari rule `@page` di file ini) sebelum `page.emulateMedia({ media: 'print' })` - supaya `getComputedStyle()` mengukur kondisi selebar-mungkin representatif terhadap tata letak cetak sungguhan (bukan sekadar viewport layar default), bukan hanya px semu dari `page.pdf()` yang tidak bisa diintrospeksi langsung dengan `getComputedStyle()`.

Diuji pada sel `.doc-cell-clip` sungguhan (kolom Bukti Nomor Dokumen, nilai 40-karakter `MNF/2026/VIII/00123-ABCDEFGHIJKLMNOPQRST`, PLB3/2026/0006) pada 3 kondisi berurutan pada elemen YANG SAMA, identik metodologi reviewer:

| Kondisi | `overflow` | `text-overflow` | `white-space` | `scrollWidth` vs lebar sel |
|---|---|---|---|---|
| Mode layar biasa (tanpa `b3-printing`, tanpa `emulateMedia`) | `hidden` | `ellipsis` | `nowrap` | 187px vs 174.9px (overflow konten, TAPI diklip) |
| `body.b3-printing` ditambahkan, `emulateMedia` BELUM dipanggil | `hidden` | `ellipsis` | `nowrap` | 187px vs 174.9px (idem - `@media print` belum match) |
| `body.b3-printing` + `page.emulateMedia({media:'print'})` (= **kondisi cetak sungguhan**) | **`hidden`** | **`ellipsis`** | **`nowrap`** | 187px vs 174.9px (overflow konten tetap ada TAPI tetap diklip - `overflow:hidden` AKTIF) |

**Hasil kunci: `overflow` computed value tetap `hidden` (BUKAN `visible`) tepat pada kondisi print sungguhan** - berbeda dari temuan BLOCKER reviewer sebelum fix (`visible`, bug). Diulang untuk sel 33-karakter (`PLB3/2026/0005`, ambang overflow yang dikonfirmasi reviewer Ronde 7 Bagian 3.3) dengan hasil identik (`overflow: hidden` di ketiga kondisi). Skrip & output mentah tersimpan di scratchpad reviewer sesi ini (`r7fix/verify.js`, `r7fix/run2.json`).

### 14.4 Verifikasi WAJIB #2 - PDF sungguhan: jumlah halaman (bukti sekunder) + screenshot/zoom visual (bukti utama defect tertutup)

Metodologi identik Ronde 6/7 (Playwright + `page.pdf()` A4 landscape `printBackground:true` + `pypdf.PdfReader` untuk jumlah halaman), DITAMBAH `pymupdf` untuk render zoom 8x kolom Tujuan Penyerahan/Bukti Nomor Dokumen guna konfirmasi visual (bukan hanya jumlah halaman, sesuai permintaan eksplisit metodologi baru).

**Tabel jumlah halaman (bukti sekunder):**

| # | Skenario | Item | Nilai diuji | Halaman |
|---|---|---|---|---|
| 1 | `PLB3/2026/0002` (WAIT_PIC, belum WEIGHED) | - | regresi halaman kosong (defect 1/1b) | 1 halaman, nol halaman kosong |
| 2 | `PLB3/2026/0003` (WAIT_SUP, belum WEIGHED) | - | regresi halaman kosong (defect 1/1b) | 1 halaman, nol halaman kosong |
| 3 | `PLB3/2026/0001` (asli, APPROVED, preview) | 3 | baseline tak berubah | 2 halaman (1 Logbook + 1 Neraca) |
| 4 | `PLB3/2026/0005` (baru) | 20 | noManifest 33 char (ambang overflow Ronde 7 Bagian 3.3) | **3 halaman** (1 Logbook + 2 Neraca) |
| 5 | `PLB3/2026/0006` (baru) | 20 | tujuan+noManifest 40+40 char (batas `maxlength`) | **3 halaman** |
| 6 | `PLB3/2026/0007` (baru) | 25 | regresi >20 item (WAJIB pecah ke Logbook hal. ke-2) | **4 halaman** (2 Logbook + 2 Neraca) - pagination `KAPASITAS_LOGBOOK=20` tidak regresi |
| 7 | `PLB3/2026/0008` (baru) | 20 | tujuan ekstrem 111 char (reproduksi klaim 13.4 #7) | **3 halaman** - catatan: anomali sekunder Ronde 7 Bagian 4 (Neraca menyusut 2→1 halaman pada nilai ekstrem ini) **TIDAK terulang** setelah fix; Neraca tetap 2 halaman penuh, nol data hilang |

Nol halaman kosong terdeteksi di seluruh skenario (`extract_text()` tiap halaman berisi konten).

**Screenshot zoom visual (bukti utama defect tertutup):** kolom Tujuan Penyerahan & Bukti Nomor Dokumen dirender 8x zoom dari PDF sungguhan (bukan mode layar) untuk skenario #4 (33 char), #5 (40+40 char, kasus yang PALING RUSAK di temuan reviewer Ronde 7 Bagian 3.2 - teks bertumpuk tak terbaca), dan #7 (111 char ekstrem). Ketiganya dikonfirmasi terpotong bersih dengan tanda elipsis ("…"), **teks tetap berada dalam batas kolom masing-masing, nol tumpang tindih ke sel tetangga** - kontras langsung dengan temuan reviewer sebelum fix (screenshot `S6b-manifest-zoom.png` di 05-code-review.md, huruf saling menimpa). Kolom CATATAN Nomor Manifest di Neraca Bagian I (celah terpisah, dicatat Minor opsional di Ronde 7 Bagian 5, tidak disentuh fix ini) diperiksa ulang pada nilai 40 char - tabel tetap dalam batas kertas (x=613pt dari lebar halaman 843pt), tidak regresi.

### 14.5 Build & test (dijalankan ulang setelah fix + revert seed, dikonfirmasi 275 baris `b3-waste-data.ts` identik sebelum sesi)

```
npx tsc --noEmit -p tsconfig.app.json   -> bersih, nol error
npm run build                            -> sukses, nol error, nol warning
main-E3KWNGR7.js    | main   | 440.21 kB | 109.67 kB
styles-YPAUNJMG.css | styles |   1.12 kB | 477 bytes
npx vitest run src/app/pages/b3-waste/b3-waste-model.spec.ts  -> 36/36 PASS
```

Budget CSS `b3-dokumen.css`: **8 552 B (~8,35 kB)**, naik dari 8 044 B (Bagian 13.5) karena 1 rule `body.b3-printing .doc-cell-clip` + komentar akar-masalah ringkas. Sedikit di atas target internal 8 kB (Alokasi 21 di `02-architecture.md`) tapi jauh di bawah **batas error 10 kB** `anyComponentStyle` yang sesungguhnya menggagalkan build (`R-13`) - dikonfirmasi `npm run build` nol warning/error. Komentar sengaja dipersingkat dari draft awal (~900 byte -> ~330 byte) untuk menjaga headroom, sesuai prinsip ponytail (jelaskan cukup untuk maintainer berikutnya, tidak berlebihan).

### 14.6 Catatan untuk Arsitek/QA (tidak ada perubahan kontrak)

Tidak ada perubahan model data/kontrak API - fix murni 1 rule CSS baru. Dua catatan carry-over dari Ronde 7 yang TIDAK ditindaklanjuti sesi ini (di luar scope BLOCKER cascade, eksplisit ditandai opsional/Minor oleh reviewer): (1) kolom CATATAN Nomor Manifest di Neraca Bagian I belum punya proteksi terstruktur (hanya aman karena `table-layout:auto` kebetulan memberi ruang - lihat 14.4); (2) rule `doc-row-empty` masih tanpa style (kosmetik, carry-over 3+ ronde). Direkomendasikan QA/reviewer berikutnya memverifikasi ulang independen dengan `getComputedStyle()` sungguhan (bukan hanya jumlah halaman) sebelum SHIP, sesuai metodologi yang sekarang jadi standar untuk kelas bug CSS cascade seperti ini.
