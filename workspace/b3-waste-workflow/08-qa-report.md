# 08 - QA REPORT: Menu Limbah B3 - Alur Pembuangan (Tahap 1-4)

| Field | Value |
|---|---|
| Task slug | `b3-waste-workflow` |
| QA | azkha-qa |
| Input | `01-spec.md` (34 AC), `02-architecture.md` (S1-S8, kontrak), `03-frontend.md`, `05-code-review.md` (APPROVED, minor fixed oleh orchestrator), kode di `frontend/src/app/pages/b3-waste/` |
| Metode | Trace kode + unit test Vitest (fungsi murni) + **build produksi** + **dev server nyata (`ng serve`) dites interaktif dengan Playwright headless** (klik sungguhan, bukan hanya baca kode) |
| Verdict akhir | **NEED FIX - 1 bug CRITICAL/BLOCKER ditemukan di runtime, tidak terlihat dari code review maupun `npm run build`** |

---

## 0. Ringkasan eksekutif

Build produksi lolos bersih, 34/34 AC secara **statis** tampak terpenuhi dari membaca kode (konsisten dengan klaim Frontend & Code Review). **Namun** saat halaman benar-benar dijalankan di browser (`ng serve` + interaksi klik sungguhan via Playwright, bukan hanya baca kode), ditemukan **bug fungsional kritis**: cascade checklist (`WastePicker`) **tidak bisa dipakai sama sekali** - setiap kali user mencentang departemen/sumber/jenis atau mengisi "Lainnya", pilihannya **langsung ter-reset ke kosong** oleh reaktivitas Angular Signals sebelum sempat ter-render ke layar. Akibatnya **tidak mungkin membuat pengajuan baru** melalui UI: `AC-10` (submit valid) gagal total, dan bersamaan dengannya `AC-2` s/d `AC-7` juga gagal (perilaku yang seharusnya terlihat tidak pernah terlihat).

Ini persis jenis bug yang diwanti-wanti orchestrator ("pernah ada bug layar blank yang lolos build") - bedanya kali ini bukan layar blank/crash (nol error console, nol exception), melainkan **reaktivitas diam-diam gagal** (silent failure), sehingga tidak terdeteksi oleh: `npm run build`, `tsc --noEmit`, Code Review (baca kode), maupun trace statis QA di awal task ini. Hanya klik sungguhan yang membongkarnya.

State machine, validasi negatif, notifikasi, role switcher, dan scope (AC-11 s/d AC-34) **semuanya PASS** dan diverifikasi baik lewat 36 unit test Vitest baru maupun interaksi nyata di browser terhadap 4 pengajuan seed yang sudah ada (jalur approve/reject/timbang tidak melalui `WastePicker`, sehingga tidak terdampak bug ini).

**Rekomendasi: NEED FIX.** Loop balik ke **Frontend** untuk memperbaiki `waste-picker.ts` sebelum SHIP. Detail akar masalah di Bagian 3.

---

## 1. Tabel Acceptance Criteria (01-spec.md Bagian 8)

| AC | Deskripsi singkat | Status | Bukti |
|---|---|---|---|
| AC-1 | Grid 4 departemen + Lainnya, judul+deskripsi | **PASS** | Screenshot `02-user-ajukan.png` - 5 kartu dengan judul & deskripsi terlihat |
| AC-2 | Centang departemen -> area anak ber-border muncul | **FAIL (CRITICAL)** | Lihat Bagian 3. Area anak **tidak pernah muncul** di DOM nyata meski checkbox tampak tercentang sesaat |
| AC-3 | Eng/QA/Office 1 sumber otomatis; Produksi 4 sumber | **FAIL (CRITICAL)** | Konsekuensi AC-2 - tidak bisa diverifikasi karena state tidak pernah persisten di layar |
| AC-4 | Checklist jenis persis tabel mock + kode | **FAIL (dari sisi user)** / data source **PASS (dari sisi kode)** | Data `MASTER_DEPARTEMEN` ditranskripsi benar (checksum 9/4/4/3/4/3/3 diverifikasi manual baris-per-baris, sama seperti klaim Code Review), **tapi user tidak pernah bisa melihatnya** akibat AC-2 |
| AC-5 | Multi-select jenis dalam satu sumber | **FAIL (CRITICAL)** | Tidak bisa diuji - centang pertama saja sudah tidak persisten |
| AC-6 | Uncheck departemen membersihkan turunan; centang ulang -> kosong | **TIDAK DAPAT DIVERIFIKASI SEBAGAI PERILAKU POSITIF** | Logika `delete` di `toggleDept()` benar secara kode (dibaca ulang), tapi moot - state tidak pernah tersimpan cukup lama untuk diuji "uncheck lalu cek yang hilang" |
| AC-7 | Kartu "Lainnya" - input teks bebas ikut ke pengajuan | **FAIL (CRITICAL)** | Textarea "Lainnya" **tidak pernah muncul** meski checkbox sempat tampak tercentang - dikonfirmasi via `toggleLainnya()` dipanggil (event terbukti jalan) tapi state langsung ter-reset |
| AC-8 | Tidak ada input berat di form pengajuan | **PASS** | `grep 'type=number'` di `b3-waste.html`/`waste-picker.html` bagian Ajukan = nol hasil |
| AC-9 | Submit ditolak bila header kosong / nol jenis; pesan terlihat | **PASS** | Live test: submit form kosong total -> error box menampilkan kombinasi pesan V-HEADER + `Pilih minimal satu jenis sampah.`; status tetap tidak berubah |
| AC-10 | Submit valid -> `WAIT_SUP`, muncul di antrean Supervisor | **FAIL (CRITICAL, BLOCKER)** | Live test end-to-end: isi header lengkap + centang Engineering>Oli -> klik Ajukan -> **selalu gagal** dengan `Pilih minimal satu jenis sampah.` karena item tidak pernah tersimpan. **Tidak mungkin membuat pengajuan baru lewat UI sama sekali.** |
| AC-11 | Reject Supervisor alasan kosong/spasi ditolak | **PASS** | Live: alasan `"   "` -> error `Alasan penolakan wajib diisi.`; status tetap `Diajukan` |
| AC-12 | Reject dengan alasan -> `REJ_SUP`, alasan tampil ke User | **PASS** | Live: status jadi `Ditolak Supervisor`; ganti ke User, alasan `Kode aki belum sesuai manifest.` terbaca di detail |
| AC-13 | Approve Supervisor -> `WAIT_PIC`, masuk antrean PIC | **PASS** | Unit test T3 + live: setelah approve, item muncul di antrean PIC (verified via screenshot `04-pic-daftar.png`) |
| AC-14 | Approve PIC tanpa tanggal/jam ditolak | **PASS** | Live: klik Setujui tanpa isi -> error `Tanggal jadwal timbang wajib diisi.` + `Jam jadwal timbang wajib diisi.`; status tetap `Disetujui Supervisor` |
| AC-15 | Approve PIC dengan tanggal+jam -> `APPROVED`, jadwal tampil | **PASS** | Live: isi `2026-08-20`/`10:00` -> status `Disetujui & Terjadwal` |
| AC-16 | Reject PIC alasan kosong ditolak; terisi -> `REJ_PIC` | **PASS** | Unit test T6 (fungsi `validasiAlasan` identik dipakai reducer untuk SUP_REJECT & PIC_REJECT, keduanya diuji) + kode panel PIC memakai komponen alasan yang sama persis dengan Supervisor (sudah diverifikasi live) |
| AC-17 | `REJ_SUP`/`REJ_PIC` bisa diperbaiki & diajukan ulang -> `WAIT_SUP` | **PASS (dengan catatan)** | Live: "Perbaiki & Ajukan Ulang" pada item `REJ_SUP` -> klik "Ajukan Ulang" tanpa mengubah pilihan item -> status kembali `Diajukan`. **Catatan risiko:** mengubah/menambah pilihan item saat perbaikan kemungkinan besar akan kena bug root cause yang sama di AC-2 (karena `WastePicker` yang sama dipakai di mode ini) - tidak diuji langsung karena reproduksi memerlukan interaksi cascade yang sudah terbukti gagal |
| AC-18 | Tombol approval hanya utk peran berwenang | **PASS** | Live: peran User pada pengajuan `WAIT_SUP` - nol tombol `Setujui`/`Tolak`; kode `aksiUntuk()` dibaca ulang - Supervisor pada status `APPROVED` mengembalikan `[]` (nol tombol timbang) |
| AC-19 | Form timbang hanya utk status `APPROVED` | **PASS** | Live: `PLB3/2026/0001` (`APPROVED`) - tombol Validasi tersedia |
| AC-20 | Validasi ditolak bila ada berat kosong/<=0 | **PASS** | Live: submit dengan berat kosong -> error `Berat setiap item wajib diisi dan lebih besar dari 0 kg.` |
| AC-21 | Validasi ditolak bila tujuan/manifest kosong | **PASS** | Live: error `Tujuan penyerahan wajib diisi.` + `Nomor manifest wajib diisi.` muncul saat kosong |
| AC-22 | Validasi ditolak bila pernyataan belum dicentang | **PASS** | Live: error `Centang pernyataan validasi PIC.` |
| AC-23 | Maks. Simpan = tgl timbang + 185(A)/365(B) hari, basis `2026-08-15` | **PASS** | **Tiga jalur verifikasi independen, semua cocok:** (1) Node standalone: `tambahHari('2026-08-15',185)='2027-02-16'`, `tambahHari('2026-08-15',365)='2027-08-15'`; (2) unit test Vitest; (3) screenshot `weigh-preview.png` - Aki (A102d) tampil `16/02/2027`, Oli (B105d) tampil `15/08/2027` |
| AC-24 | Setelah validasi -> `WEIGHED`, seluruh field read-only | **PASS** | Live: status jadi `Ditimbang & Tervalidasi`; tombol Validasi hilang dari DOM (bukan disabled) untuk semua peran |
| AC-25 | Tiap transisi menghasilkan notifikasi dgn penerima persis | **PASS** | Unit test: 7 transisi menghasilkan 2/2/2/1/2/2/2 notifikasi persis sesuai kontrak; live: jumlah notifikasi bertambah sesuai (15 seed + 5 dari test = 20) |
| AC-26 | Notif penolakan memuat alasan; `APPROVED` memuat jadwal | **PASS** | Unit test: isi notifikasi `SUP_REJECT`/`PIC_REJECT` memuat alasan; `PIC_APPROVE` memuat tanggal terformat + jam |
| AC-27 | Notifikasi terlihat di halaman, penerima+waktu lengkap | **PASS** | Screenshot `05-notifikasi.png` - daftar lengkap peran, nama, email, subjek, isi, waktu, nomor, judul "Simulasi Email..." |
| AC-28 | Nol request jaringan (HttpClient/fetch/dst) | **PASS** | `grep` di seluruh `pages/b3-waste/`: nol hasil untuk `HttpClient`/`fetch(`/`XMLHttpRequest`/`provideHttpClient` |
| AC-29 | Role switcher di konten halaman, bukan topbar, berlabel demo | **PASS** | Screenshot `01-user-daftar.png` - toolbar "Mode Demo - lihat sebagai:" di dalam konten; `grep` di `layout/**` untuk `b3-waste`/`B3Waste`/`Limbah B3` = nol hasil |
| AC-30 | Ganti peran tanpa reload, data tetap utuh | **PASS** | Screenshot 3 peran (User/Supervisor/PIC) - statistik "Total Pengajuan: 4" identik di ketiganya, tanpa reload |
| AC-31 | Tab Logbook/Neraca placeholder, nol kalkulasi | **PASS** | Live: teks persis "Menunggu format Excel dari user - belum dikerjakan." di kedua tab, nol tabel/angka |
| AC-32 | Audit scope 100% di `pages/b3-waste/` | **PASS** | Verifikasi independen (bukan hanya percaya Code Review): isi `app.routes.ts` masih impor `B3Waste` dari path lama tanpa perubahan; `layout/**`, `shared/menu.ts`, `shared/icon/icon.ts`, `shared/feature-page.css`, `styles.css`, `package.json` seluruhnya bertanggal modifikasi **12-13 Agustus** (sebelum kerja babak ini yang dimulai 14 Agustus 09:17); `grep` konfirmasi nol referensi `b3-waste` di `layout/**` |
| AC-33 | `npm run build` sukses, nol dependency baru | **PASS** | Lihat Bagian 4 - build sukses, nol warning, `package.json` diperiksa identik dengan `01-spec.md` |
| AC-34 | Menu lain (`company-reports`, `inspection`, `dashboard`) tetap normal | **PASS** | Live: ketiga URL dibuka, nol page error, konten ter-render (`bodyTextLength` > 0 di semua) |

**Ringkasan:** 27 PASS, **6 FAIL** (AC-2, AC-3, AC-4\*, AC-5, AC-7, AC-10 - semuanya akar masalah yang sama), 1 "tidak dapat diverifikasi sebagai perilaku positif" (AC-6, konsekuensi bug yang sama). *AC-4 PASS dari sisi data source, FAIL dari sisi pengalaman user nyata - dihitung FAIL karena AC menuntut "checklist jenis sampah... menampilkan" yang berarti pengalaman user, bukan hanya keberadaan data.

---

## 2. Bug kritis: cascade checklist (`WastePicker`) tidak berfungsi di runtime

### 2.1 Cara reproduksi (terverifikasi berulang kali, di sesi bersih)

1. Jalankan `cd frontend && npx ng serve`, buka `/b3-waste` sebagai peran **User** (default).
2. Klik tab "Ajukan Pembuangan".
3. Isi field header (Lokasi, Pelaksana, Diajukan oleh) - opsional untuk reproduksi minimal, tidak memengaruhi bug.
4. Klik checkbox kartu **Engineering**.
5. **Yang diharapkan (AC-2, AC-3):** area ber-border aksen muncul di bawah kartu, berisi label "Sumber: ENG - Workshop & Utility" dan checklist 9 jenis sampah.
6. **Yang terjadi:** checkbox tampak tercentang sesaat, tapi area anak **tidak pernah muncul**, kotak "Total dipilih" tetap `0 jenis limbah dari 0 sumber`, dan bila diperiksa lagi (`class` elemen kartu), checkbox sebenarnya **tidak pernah benar-benar tercentang secara aplikatif** - centang yang terlihat murni artefak DOM native browser sesaat sebelum Angular menimpanya kembali.
7. Klik "Ajukan" dengan header terisi lengkap -> selalu muncul error `Pilih minimal satu jenis sampah.`, walau user sudah mencentang item. **Tidak ada cara mengisi form ini sampai valid.**

Direproduksi juga untuk kartu "Lainnya" (checkbox tercentang sesaat, textarea tidak pernah muncul) dan departemen Produksi (chip sumber tidak pernah terbuka). Nol error di console browser (`pageerror`/`console.error` kosong) - kegagalan **senyap**, karena itu tidak terdeteksi `npm run build` maupun Code Review yang hanya membaca kode.

### 2.2 Analisis akar masalah (untuk membantu Frontend, bukan perbaikan oleh QA)

Di `waste-picker.ts`:

```ts
constructor() {
  effect(() => this.muatDari(this.nilaiAwal()));
}

private muatDari(v: PilihanLimbah | null): void {
  // ... this.seleksi.set(...), this.lainnyaAktif.set(...), this.lainnyaTeks.set(...)
  this.emit();
}

private emit(): void {
  this.pilihanChange.emit({
    items: this.buatItems(),          // membaca this.seleksi()
    lainnyaAktif: this.lainnyaAktif(), // membaca this.lainnyaAktif()
    lainnya: this.lainnyaAktif() ? this.lainnyaTeks() : '',
  });
}
```

`effect()` di constructor secara eksplisit hanya membaca `this.nilaiAwal()`. Tapi karena badan efek memanggil `muatDari()` -> `emit()`, dan `emit()` **membaca** `this.seleksi()`, `this.lainnyaAktif()`, `this.lainnyaTeks()` secara sinkron di dalam eksekusi efek yang sama, Angular Signals **secara otomatis ikut melacak sinyal-sinyal itu sebagai dependency efek** (bukan hanya `nilaiAwal`). Akibatnya, efek ini sebenarnya bergantung pada `{nilaiAwal, seleksi, lainnyaAktif, lainnyaTeks}` - bukan cuma `nilaiAwal` seperti yang terlihat dari kode.

Setiap kali user menekan checkbox (`toggleDept`/`toggleSumber`/`toggleJenis`/`toggleLainnya`/`onLainnyaTeks`), method itu menulis ke `seleksi`/`lainnyaAktif`/`lainnyaTeks` - salah satu dependency "tersembunyi" efek di atas. Ini men-trigger efek untuk berjalan ulang, yang memanggil `muatDari(this.nilaiAwal())` **lagi** dengan `nilaiAwal` yang sama (biasanya `null` di mode Ajukan baru) - yang langsung **menimpa balik** pilihan yang baru saja dibuat user menjadi kosong, sebelum sempat ter-render ke layar.

Dikonfirmasi lewat instrumentasi langsung (memanggil `toggleLainnya()` pada instance komponen sungguhan via `window.ng.getComponent()`): pemanggilan itu **berhasil** mengubah `lainnyaAktif` jadi `true` secara instan, tapi dalam <300ms nilai itu sudah kembali `false` dengan `muatDari` terpanggil ulang membawa `v=null` - persis pola "self-reset loop" di atas.

**Rekomendasi perbaikan (untuk Frontend, bukan diimplementasikan QA):** pisahkan pembacaan sinyal untuk keperluan emit dari efek pemuatan `nilaiAwal`, misalnya membungkus body `emit()`/`buatItems()` dengan `untracked()` saat dipanggil dari `muatDari()`, atau tidak memanggil `emit()` sama sekali dari jalur yang dipicu efek `nilaiAwal` (pemuatan awal tidak perlu memberi tahu parent balik).

### 2.3 Dampak & Severity

**Severity: CRITICAL / BLOCKER.** Ini bukan cacat kosmetik - fitur inti "Tahap 1: Form Pengajuan" (G1 di spec, seluruh Bagian 6.A) **tidak bisa dipakai user sama sekali**. Konsekuensi langsung:
- AC-2, AC-3, AC-5, AC-7, AC-10 FAIL secara langsung; AC-4, AC-6 tidak dapat diverifikasi sebagai perilaku positif.
- **DoD item 5 di `01-spec.md`** ("Alur end-to-end bisa didemokan dalam satu sesi: submit (User) -> approve (Supervisor) -> ...") **tidak dapat dipenuhi** - tidak mungkin memulai dari langkah "submit (User)" yang sungguhan lewat UI. Demo hanya bisa dijalankan dari data seed yang sudah ada, bukan pengajuan baru.
- Risiko R-4 (over-engineering ditolak) dan R-3 (transisi status bocor) di `02-architecture.md` sudah dimitigasi dengan baik dan **tidak** menjadi sumber bug ini - akar masalahnya justru pola reaktivitas Signals di `WastePicker`, bagian yang **tidak** disorot risiko eksplisit di dokumen arsitektur manapun.

**Role penanggung jawab perbaikan: Frontend.**

---

## 3. Bug lain

Tidak ditemukan bug lain. Seluruh 27 AC yang PASS diverifikasi dengan bukti nyata (unit test dan/atau interaksi browser sungguhan), bukan hanya klaim.

---

## 4. Bukti build & test dijalankan

### 4.1 `npm run build` (frontend/)

```
> ng build
✔ Building...
Initial chunk files | Names   |  Raw size | Estimated transfer size
main-4WEJE53L.js    | main    | 417.71 kB |               104.06 kB
styles-YPAUNJMG.css | styles  |   1.12 kB |               477 bytes
Application bundle generation complete. [11.932 seconds]
```
Sukses, nol error, nol warning `anyComponentStyle`. `b3-waste.css` = 2602 B (batas 4 kB), `waste-picker.css` = 2722 B (batas 5 kB) - dikonfirmasi ulang dengan `wc -c`, bukan hanya percaya laporan Frontend.

### 4.2 Unit test Vitest (opsional, dibuat QA sesuai izin `02-architecture.md` Bagian 10 & 11)

File baru: `frontend/src/app/pages/b3-waste/b3-waste-model.spec.ts` (satu-satunya file yang ditambahkan QA, di dalam whitelist folder `pages/b3-waste/`). Gaya ponytail: memakai `describe`/`it`/`expect` bawaan Vitest saja, tanpa helper/fixture di luar 2 factory kecil (`konteks()`, `isiValid()`) yang menghindari duplikasi payload 5-field berulang di 20 test case.

Cakupan: `masaSimpanHari`, `tambahHari` (angka eksak AC-23), `formatTanggal`, seluruh 5 fungsi `validasi*` (pesan persis tabel kontrak), **7 transisi sah T1-T7** (status tujuan + jumlah notifikasi), dan **6 transisi terlarang** (guard reducer, bukan cuma guard UI - sesuai desain "dua jaring" Architect) termasuk kasus eksplisit "PIC approve saat status masih WAIT_SUP".

```
> ng test --include "src/app/pages/b3-waste/b3-waste-model.spec.ts"
 Test Files  1 passed (1)
      Tests  36 passed (36)
```

Semua 36 test lolos. Catatan: `src/app/app.spec.ts` (pre-existing, di luar scope task ini) gagal 1/2 test - **sudah diprediksi** di `02-architecture.md` R-5 sebagai kondisi pra-ada, tidak disentuh sesuai rule scope AC-32. Dikonfirmasi ulang:
```
❯ frontend src/app/app.spec.ts (2 tests | 1 failed)
  × should render title
```

### 4.3 Verifikasi tanggal independen (Node standalone, di luar codebase)

```js
tambahHari('2026-08-15', 185) -> '2027-02-16'   // A102d, cocok kontrak
tambahHari('2026-08-15', 365) -> '2027-08-15'   // B105d, cocok kontrak
```

### 4.4 Dev server nyata + Playwright headless (verifikasi runtime, bukan hanya build)

`npx ng serve` dijalankan di port 4301; interaksi nyata dilakukan lewat Playwright Chromium headless (diinstal terpisah di folder scratchpad, **tidak** menambah dependency ke `frontend/package.json`). Ini yang membongkar bug Bagian 2 - trace kode semata (termasuk yang dilakukan Code Review) tidak akan menemukannya karena tidak ada error yang dilempar.

Console/page error selama seluruh sesi pengujian (memuat halaman 3x sebagai User/Supervisor/PIC, membuka semua tab, mencoba submit, approve, reject, timbang, dan membuka `/company-reports`, `/inspection`, `/dashboard`): **nol** `pageerror`, nol `console.error`.

---

## 5. Cara menjalankan ulang verifikasi ini

```bash
cd frontend
npm run build                                              # AC-33
npx ng test --include "src/app/pages/b3-waste/b3-waste-model.spec.ts"   # unit test murni (opsional, milik QA)
npx ng serve                                                # lalu buka http://localhost:4200/b3-waste manual
```

Untuk mereproduksi bug Bagian 2 secara manual (tanpa Playwright): buka `/b3-waste`, tab "Ajukan Pembuangan", centang kartu departemen mana pun - area anak tidak akan pernah muncul.

---

## 6. Rekomendasi

**NEED FIX.** Loop balik ke **Frontend** (masih dalam batas "maksimal 2 putaran" di `01-spec.md` Bagian 11 - ini putaran pertama). Fokus perbaikan tunggal: root cause di Bagian 2.2 (`waste-picker.ts`, interaksi `effect()` constructor dengan `emit()`/`muatDari()`). Setelah diperbaiki, minimal perlu re-run manual S2 dan S3 (`02-architecture.md`) untuk konfirmasi cascade checklist benar-benar persisten di DOM, plus re-run `npm run build` (karena scope AC-32 harus tetap 100% di `pages/b3-waste/`, hanya `waste-picker.ts` yang perlu disentuh).

Tidak perlu mengulang verifikasi state machine/validasi/notifikasi/role-switcher/scope (AC-11 s/d AC-34) - semuanya sudah PASS dengan bukti kuat dan tidak bersinggungan dengan file yang perlu diperbaiki.

---
---

# BAGIAN 2 - QA Babak 2 (Logbook & Neraca) + Regresi Fix WastePicker

| Field | Value |
|---|---|
| Konteks | Loop-back QA setelah Frontend memperbaiki bug BLOCKER `effect()`/`untracked()` di `WastePicker` (Code Review Ronde 2 APPROVED), dan setelah babak 2 (Logbook & Neraca, `02-architecture.md` Bagian 14-26) diimplementasikan dan APPROVED di Code Review Ronde 3 |
| Input | `01-spec.md` §0 AMANDEMEN, `logbook-neraca-format-reference.md`, `02-architecture.md` §14-26 (AC-35..AC-47, skenario S9-S13), `03-frontend.md` §9, `05-code-review.md` Ronde 2 & 3 |
| Metode | Baca kode independen + `npm run build`/`tsc` + `ng serve` nyata + Playwright headless interaktif |

## B2.1 Re-verifikasi fix `WastePicker` (regresi babak 1)

Dibaca ulang `waste-picker.ts` baris 42-47:
```ts
constructor() {
  effect(() => {
    const v = this.nilaiAwal();
    untracked(() => this.muatDari(v));
  });
}
```
Konfirmasi independen: `nilaiAwal()` dibaca **di luar** `untracked()` (tetap jadi dependency efek - prefill "Perbaiki & Ajukan Ulang" tetap reaktif), sedangkan seluruh badan `muatDari(v)` (termasuk `emit()` di dalamnya yang membaca `seleksi()`/`lainnyaAktif()`/`lainnyaTeks()`) dibungkus `untracked()` - persis akar masalah yang saya diagnosis di Bagian 2.2 di atas. Fix ini tepat sasaran.

**Verifikasi interaktif (bukan cuma baca kode):** lihat B2.5 langkah cascade - centang Engineering→Oli+Aki, tunggu 900ms diam, checklist **tetap tercentang** dan "Total dipilih: 2 jenis..." tetap tampil. Regresi babak 1 **tidak terjadi lagi**.

## B2.2 Audit independen scope & mock data (P-1, AC-47)

```
grep -rn "signal<Logbook\|signal<Neraca\|logbook\.set(\|logbook\.update(\|neraca\.set(\|neraca\.update(" pages/b3-waste/
```
Hasil: **nol match kode** (dua kemunculan hanya di komentar yang menjelaskan larangan itu sendiri). `b3-waste-logbook.ts` dikonfirmasi nol impor Angular. `logbook`/`logbookBlok`/`neraca` di `b3-waste.ts` (versi babak 2, sebelum Amandemen 2) adalah `computed()` murni di atas `pengajuan()` - bukan `signal`. **AC-47/P-1 PASS.**

Audit mtime independen (bukan percaya klaim Frontend) menunjukkan `waste-picker.ts/.html/.css` bertanggal sesi babak 1 (09:18-13:43), sementara 9 file babak 2 (`b3-waste-model.ts`, `b3-waste-data.ts`, `b3-waste-logbook.ts` [baru], `b3-dokumen.ts/.html/.css` [baru], `b3-waste.ts/.html/.css`) berkerumun di sesi terpisah (14:38-14:46) - konsisten dengan klaim scope, `AC-32 PASS`.

`npm run build` (dijalankan ulang independen): sukses, nol error, nol warning. `npx tsc --noEmit`: bersih. `npx ng test --include b3-waste-model.spec.ts`: **36/36 PASS** (regresi babak 1 hijau).

## B2.3 Verifikasi angka (AC-39, AC-40, AC-41) - dijalankan via unit-level trace + Node standalone

`keTon()`, `formatTon()`, `formatPersen()` dibaca ulang - implementasi `Math.round(kg/1000*10000)/10000` (4 desimal) dan `kinerjaPersen` dihitung dari **kg** (bukan Ton yang sudah dibulatkan), sehingga `totalBKg === totalAKg` secara konstruksi (P-3) -> kinerja **selalu tepat 100** kecuali `totalAKg===0` -> `null` -> render `-`. Tidak ada jalur yang bisa menghasilkan `99,99%`/`NaN`/`#REF!`. **AC-41 PASS** (dikonfirmasi ulang juga secara visual di B2.5 - lihat kinerja `100,00%` di screenshot).

## B2.4 Catatan penting: babak 2 (tab Logbook/Neraca terpisah, S9-S13 asli) SUDAH DIGANTIKAN Amandemen 2

Pada saat saya membaca kode babak 2 (tab global "Logbook"/"Neraca" + preview di panel timbang terpisah), Frontend sudah lebih dulu menerapkan **Amandemen 2** (lihat Bagian 3 di bawah) yang **menghapus** tab tersebut dan menggabungkan dokumen ke detail per-pengajuan. Skenario S9-S13 literal (tab Logbook global, agregasi lintas-semua-pengajuan yang terlihat sebagai tab) sudah **tidak relevan lagi** dengan UI yang berjalan - digantikan verifikasi setara di scope baru (per-pengajuan) pada Bagian 3 di bawah, yang mencakup semua substansi AC-35..AC-47 yang masih berlaku (13 kolom, grouping per kode, kinerja 100%, nol stempel, PDF scoped) hanya dengan lokasi tampilan yang berbeda dari yang dideskripsikan skenario asli.

---
---

# BAGIAN 3 - QA FINAL KONSOLIDASI: Amandemen 2 (polish visual & penggabungan dokumen ke detail pengajuan)

| Field | Value |
|---|---|
| Konteks | Gerbang QA terakhir sebelum PM DoD. Mencakup babak 1 (Tahap 1-4) + babak 2 (Logbook/Neraca) + Amandemen 2 (9 poin revisi: header bergaris, field perkiraan berat Tahap 1, pre-fill Tahap 4, field bersama dipindah ke atas, tab Logbook/Neraca dihapus & digabung ke detail pengajuan dengan mode editable/readonly) |
| Input | `logbook-neraca-format-reference.md` §"AMANDEMEN 2" (9 poin), `03-frontend.md` §10 (6 keputusan implementasi termasuk bug `pastikanBeratTerisi()` yang ditemukan+diperbaiki sendiri Frontend), `05-code-review.md` RONDE 4 (APPROVED, 0 blocker/major, 1 minor non-blocking), kode aktual di `frontend/src/app/pages/b3-waste/` (9 file) |
| Metode | Baca kode independen (bukan percaya klaim) + `npm run build`/`tsc`/`vitest` + `ng serve` nyata (port 4303) + Playwright Chromium headless, satu sesi browser tanpa reload, 42 assertion terprogram + 3 screenshot bukti visual |

## B3.1 Verifikasi kode independen (sebelum interaksi browser)

Dibaca penuh `b3-waste.ts` (338 baris), `b3-dokumen.ts` (81 baris), `b3-dokumen.html` (257 baris), `b3-waste.html` (327 baris), `b3-dokumen.css` (99 baris). Temuan konsisten dengan klaim `03-frontend.md` §10 dan `05-code-review.md` RONDE 4:

- `Tab` type sekarang `'ajukan' | 'daftar' | 'notifikasi'` - dikonfirmasi `grep "'logbook'\|'neraca'"` di seluruh folder = nol hasil kode (hanya `mode: input.required<'logbook'|'neraca'>()` di `B3Dokumen`, yang merupakan **mode tampilan komponen**, bukan tab navigasi - beda konsep, disengaja tetap ada).
- `pastikanBeratTerisi()` dibaca baris-per-baris (b3-waste.ts baris 205-215): memakai operator `in` (bukan `??`/`||`) untuk cek key sudah pernah disentuh - ini yang membuatnya idempoten. Dipanggil dari 3 titik (`bukaDetail`, `setujuiPic`, `gantiPeran` dengan guard `p==='PIC' && status==='APPROVED'`) - dikonfirmasi tidak ada pemanggilan dari template/binding (`grep pastikanBeratTerisi *.html` = nol hasil), jadi tidak tereksekusi tiap change-detection cycle.
- `editableSekarang = computed(() => this.aksiTersedia().includes('PIC_WEIGH'))` - satu-satunya sumber prop `[editable]` yang dikirim ke `<app-b3-dokumen>` (`grep "app-b3-dokumen"` di `b3-waste.html` = 2 pemanggilan; hanya pemanggilan mode `logbook` yang membawa `[editable]`, mode `neraca` tidak pernah menerima `editable` sama sekali - default `false`). `aksiUntuk()` di `b3-waste-model.ts` (**tidak diubah** sejak babak 1, dikonfirmasi ulang baris 414-426) membuat `'PIC_WEIGH'` **struktural mustahil** muncul untuk peran USER/SUPERVISOR (kedua cabang itu `return` lebih dulu sebelum kode sampai ke pengecekan status PIC).
- Field bersama (Tanggal Timbang/Buang, Tujuan, Manifest) dikonfirmasi di `b3-waste.html` baris 145-162, **sebelum** blok `<app-b3-dokumen>` baris 169-178 - urutan DOM sesuai kontrak.
- `b3-dokumen.css`: header `.doc-head`/`.doc-infobox`/`.doc-meta` memakai `<table>` semantik asli (bukan `div`+`border` tanpa struktur) dengan `border: 1px solid #333` - bukan flex tanpa garis.
- `grep -rniE "\basli\b|\bcopy\b"` di seluruh folder = nol hasil di luar komentar kode (bukan render ke user).

## B3.2 Build, type-check, unit test (dijalankan ulang independen)

```
npx tsc --noEmit -p tsconfig.app.json   -> bersih, nol error
npm run build                            -> sukses, nol error, nol warning
  main-QDXMPMBX.js    | main   | 437.58 kB | 109.18 kB
  styles-YPAUNJMG.css | styles |   1.12 kB | 477 bytes
npx ng test --include b3-waste-model.spec.ts -> 36/36 PASS (regresi babak 1 hijau)
```
Budget CSS diukur ulang dengan `wc -c`: `b3-dokumen.css` 4361 B (batas 8 kB), `b3-waste.css` 3015 B (batas 4 kB), `waste-picker.css` 2722 B (batas 5 kB, tidak berubah) - semua **PASS**.

Audit scope mtime independen (`ls -la --time-style=full-iso`): `waste-picker.*` dan `b3-waste-model.ts`/`b3-waste-data.ts`/`b3-waste-logbook.ts` bertanggal sesi-sesi sebelumnya (14 Agustus), **hanya** 6 file (`b3-dokumen.ts/.html/.css`, `b3-waste.ts/.html/.css`) bertanggal sesi Amandemen 2 (15 Agustus 13:10-13:20) - **AC-32 PASS**.

## B3.3 Verifikasi interaktif - alur end-to-end penuh (`ng serve` port 4303 + Playwright, satu sesi tanpa reload)

Skenario dijalankan persis sesuai mandat: **User ajukan 2 item beda jenis (Oli B105d + Aki A102d) dengan perkiraan berat HANYA pada satu item (Oli=42,5 kg, Aki dikosongkan) -> Supervisor approve -> PIC approve+jadwal -> tanpa navigasi tambahan, PIC koreksi tabel dokumen -> isi field bersama -> centang pernyataan -> submit -> verifikasi akhir.**

**42/42 assertion terprogram PASS, nol `console.error`/`pageerror` sepanjang sesi.** Titik-titik kritis:

| # | Yang diverifikasi | Hasil |
|---|---|---|
| 1 | Tab bar persis 3 tombol (Ajukan/Daftar/Notifikasi); nol tombol/link "Logbook"/"Neraca"/"Lihat di Logbook" di mana pun | PASS |
| 2 | **Regresi WastePicker**: centang Engineering→Oli+Aki, tunggu 900ms diam - checklist **tetap tercentang**, "Total dipilih: 2 jenis limbah dari 1 sumber" tetap tampil (bug babak 1 tidak kembali) | PASS |
| 3 | Field "Perkiraan Berat (kg)" opsional muncul di Tahap 1 setelah `<app-waste-picker>`, 2 baris sesuai jumlah item dipilih; diisi `42.5` hanya pada baris Oli | PASS |
| 4 | Submit -> `WAIT_SUP`; Supervisor approve (di halaman yang sama, tanpa reload) -> `WAIT_PIC`; PIC approve+jadwal (di halaman yang sama) -> `APPROVED` | PASS |
| 5 | **Tanpa navigasi tambahan** (persis skenario mandat "PIC approve+jadwal -> buka detail pengajuan **itu**" - yang ternyata sudah di halaman yang sama), heading "Timbang & Validasi" + `<app-b3-dokumen>` editable **langsung tampil** | PASS |
| 6 | **Pre-fill dari perkiraan user**: baris Oli (kode `B105d`) pre-filled `42.5` persis nilai Tahap 1; baris Aki (kode `A102d`, tidak diisi user) pre-filled **KOSONG** (`''`, bukan `'0'`, bukan error) - dicocokkan by value bukan posisi, karena tabel diurutkan per-kode (Aki `A102d` tercetak lebih dulu dari Oli `B105d` meski dipilih belakangan) | PASS |
| 7 | Urutan DOM: heading field-bersama muncul **sebelum** `<app-b3-dokumen>` pertama | PASS |
| 8 | **PIC mengedit** kedua baris (Aki kosong→`15`, Oli `42.5`→`40`) | (aksi, bukan assertion) |
| 9 | **Idempotensi `pastikanBeratTerisi()`**: ganti peran PIC→User→PIC (tetap di detail yang sama) - edit `40`/`15` **bertahan**, tidak ter-reset balik ke `42.5`/kosong | PASS (2 assertion) |
| 10 | Isi field bersama (tanggal timbang/buang, tujuan, manifest) + centang pernyataan + klik Validasi -> status `WEIGHED` | PASS |
| 11 | Setelah submit: **0** elemen `.doc-input` di seluruh halaman (tabel otomatis kembali read-only); catatan "Data terkunci" tampil | PASS (2 assertion) |
| 12 | **Nilai final = hasil edit PIC**: body text memuat `40` dan `15`; **tidak** memuat `42.5`/`42,5` dalam bentuk apa pun - membuktikan angka yang tersimpan bukan input asli user | PASS (3 assertion) |
| 13 | Kinerja `100,00 %`; nol stempel ASLI/COPY | PASS (2 assertion) |
| 14 | **Guard lintas role** pada pengajuan `APPROVED` (`PLB3/2026/0001`, seed): sebagai **USER** - 0 `.doc-input`; sebagai **SUPERVISOR** - 0 `.doc-input`; sebagai **PIC** - `.doc-input` **ada** (kontras positif) | PASS (3 assertion) |
| 15 | `.doc-head td` punya `border` CSS nyata (`getComputedStyle`, bukan estimasi visual semata) | PASS |
| 16 | **PDF/print**: klik "Unduh PDF" (di dalam blok detail, bukan tab terpisah) -> `body.b3-printing` terpasang; dengan `emulateMedia({media:'print'})`, `.tabs` (chrome aplikasi) `hidden`, `.b3-doc` `visible`; jumlah `.b3-doc` yang akan tercetak **di-scope ke satu pengajuan** (diverifikasi pada `PLB3/2026/0001`: tepat 4 blok = 3 logbook [Oli/Aki/Majun, 3 kode berbeda] + 1 neraca - bukan gabungan seluruh pengajuan lain); `afterprint` melepas kelas `b3-printing` (nol residu) | PASS (5 assertion) |
| 17 | Nol `console.error`/`pageerror` sepanjang seluruh sesi (submit, approve x2, edit, submit timbang, ganti role berkali-kali, print) | PASS (2 assertion) |

Bukti visual (screenshot, scratchpad): `amd2-01-editable-prefill.png` (tabel editable dengan baris Aki KOSONG dan Oli `42.5`, field bersama di atas, header bergaris, Neraca menyatu di bawah), `amd2-02-readonly-final.png` (dokumen readonly final: Aki `15`, Oli `40`, Neraca TOTAL A=B `0,0550` Ton, Kinerja `100,00%`, "Data terkunci", riwayat `PIC_WEIGH`), `amd2-03-header-border.png` (crop header 3-sel bergaris pada pengajuan seed).

## B3.4 Hasil akhir Bagian 3

**Nol bug ditemukan di putaran ini.** Seluruh 7 fokus verifikasi yang diminta orchestrator (alur E2E penuh, idempotensi `pastikanBeratTerisi()`, guard editable/readonly lintas role, regresi WastePicker, PDF/print scope, visual header border, tab bar bersih) **PASS** dengan bukti terprogram + visual, dijalankan lewat interaksi browser nyata (bukan hanya baca kode atau percaya laporan Frontend/Code Review).

---

## Rekapitulasi Akhir (Babak 1 + Babak 2 + Amandemen 2)

| Area | Status |
|---|---|
| Babak 1 (AC-1..AC-34, S1-S8) | **PASS** setelah 1 putaran perbaikan (bug BLOCKER `effect()` `WastePicker` ditemukan QA putaran pertama, diperbaiki Frontend dengan `untracked()`, diverifikasi ulang PASS - lihat Bagian 1 & B2.1) |
| Babak 2 (AC-35..AC-47 - substansi, bukan lagi lokasi tab literal karena digantikan Amandemen 2) | **PASS** - grouping per kode, kinerja 100%/`-` saat kosong, nol stempel, 13 kolom, P-1 (computed murni) semuanya diverifikasi baik di level kode maupun di scope tampilan baru (per-pengajuan) |
| Amandemen 2 (polish visual + penggabungan dokumen + pre-fill PIC) | **PASS** - 42/42 assertion interaktif, screenshot bukti, nol bug |
| Regresi lintas putaran | **Nol regresi** - WastePicker (fix babak 1) tetap berfungsi setelah babak 2 dan Amandemen 2; 36/36 unit test murni tetap hijau di setiap putaran |

**Rekomendasi akhir: SHIP.** Tidak ada temuan Blocker/Critical yang belum ditutup. Satu-satunya catatan non-blocking yang diwariskan dari Code Review (bukan temuan QA baru, tidak perlu tindakan sebelum SHIP): `text-align:center` blanket pada `.doc-table td` (Minor, Ronde 4) - dampaknya kecil pada data master saat ini (nama jenis limbah terpendek), dicatat untuk dipertimbangkan bila data produksi nyata punya teks kolom yang jauh lebih panjang.

### Cara menjalankan ulang verifikasi Bagian 2-3

```bash
cd frontend
npm run build                                                            # AC-33
npx ng test --include "src/app/pages/b3-waste/b3-waste-model.spec.ts"    # 36 unit test murni
npx ng serve --port 4303                                                  # lalu buka http://localhost:4303/b3-waste manual
```
Untuk mereplikasi verifikasi interaktif: skenario di B3.3 dijalankan manual di browser (submit pengajuan baru dengan perkiraan berat parsial → approve berjenjang tanpa reload → sebagai PIC koreksi tabel dokumen di detail pengajuan yang sama → submit → periksa readonly + nilai final). Skrip Playwright yang dipakai QA disimpan di scratchpad sesi (bukan bagian repo, tidak menambah dependency ke `frontend/package.json`).

---
---

# BAGIAN 4 - QA FINAL: Amandemen 3 (fix bug print "Unduh PDF cuma Neraca" + Logbook 1 tabel gabungan+pagination)

| Field | Value |
|---|---|
| Konteks | Bug dilaporkan **user setelah SHIP** ("Unduh PDF" cuma mencetak Neraca) + permintaan penyederhanaan Logbook jadi 1 tabel gabungan dengan padding 20 baris/halaman + pagination otomatis. Melalui **4 ronde Code Review berurutan** (Ronde 5-8): Ronde 5 CHANGES REQUESTED (1 BLOCKER halaman kosong depan + 1 MAJOR tabel 20-baris kepotong 2 halaman fisik) → fix ditutup, Ronde 6 CHANGES REQUESTED lagi (1 MAJOR: fix kolom rapuh terhadap nama vendor >24 char) → fix ditutup, Ronde 7 CHANGES REQUESTED lagi (1 BLOCKER: `overflow:hidden` pada `.doc-cell-clip` dinetralkan rule wildcard `!important` yang sama-sama menang lewat *source order*, ditemukan lewat `getComputedStyle()` sungguhan bukan cuma jumlah halaman) → fix ditutup, Ronde 8 **APPROVED** (diverifikasi ulang `getComputedStyle()` di 40 sel + render PDF sungguhan + zoom visual) |
| Input | `logbook-neraca-format-reference.md` §"AMANDEMEN 3" (4 poin: root-cause bug print + spesifikasi 1 tabel gabungan+pagination 20 baris + kapasitas otomatis pecah halaman), `03-frontend.md` §11-14 (4 putaran fix lengkap dengan root-cause & angka konkret per skenario), `05-code-review.md` RONDE 5-8 (histori CHANGES REQUESTED → APPROVED, metodologi `page.pdf()` sungguhan + `pypdf` + `getComputedStyle()` di bawah kondisi print sungguhan, bukan hanya jumlah halaman) |
| Metode | Sesuai arahan orchestrator: **fokus sudut pandang pengguna end-to-end** (bukan mengulang audit CSS baris-per-baris yang sudah sangat menyeluruh di Ronde 5-8). Kode dibaca sekali untuk konfirmasi independen bahwa versi final yang berjalan **identik** dengan yang di-APPROVE Ronde 8 (bukan versi lain), lalu diverifikasi lewat `ng serve` sungguhan + Playwright + **PDF asli** (`page.pdf()` dibaca ulang dengan `pdf-parse`, bukan hanya DOM/screenshot) |

## B4.0 Konfirmasi independen: kode yang diuji = kode yang di-APPROVE Ronde 8

Sebelum menjalankan skenario, saya membandingkan build production dengan hash yang dicatat Code Review Ronde 8 (`05-code-review.md` §6): `main-E3KWNGR7.js`. Build ulang saya sendiri (independen, bukan menyalin) menghasilkan **hash byte-untuk-byte identik**: `main-E3KWNGR7.js | main | 440.21 kB | 109.67 kB`. Ini bukti kuat bahwa kode yang saya uji adalah persis kode yang sudah melalui 4 ronde review, bukan versi lain yang belum direview.

Dibaca ulang `b3-dokumen.css` (154 baris) untuk memastikan urutan rule sesuai klaim final (Ronde 8 §2): wildcard `body.b3-printing .b3-doc * { overflow: visible !important }` (baris 114-116) diikuti rule `.doc-cell-clip` (baris 121-125) - urutan **persis** seperti yang dikonfirmasi APPROVED, tidak ada rule ketiga yang menyusul. `b3-waste-data.ts` dikonfirmasi 275 baris dengan seed asli 3-item (`buatItem('engineering','ENG','B105d')`, dst.) - tidak ada sisa data uji sementara dari ronde-ronde sebelumnya.

```
npx tsc --noEmit -p tsconfig.app.json   -> bersih, nol error
npm run build                            -> sukses, nol error, nol warning, hash identik Ronde 8
npx ng test --include b3-waste-model.spec.ts -> 36/36 PASS
```

## B4.1 TEST A - Alur E2E penuh dengan nama vendor REALISTIS + PDF sungguhan (bukan simulasi)

Skenario dijalankan **persis** seperti mandat: User ajukan (Engineering → Oli + Aki + Majun, 3 jenis/kode berbeda, dipilih via `WastePicker` sungguhan) → Supervisor approve → PIC approve+jadwal → PIC timbang & validasi dengan **Tujuan Penyerahan = `"PT Prasadha Pamunah Limbah Industri"` (36 karakter - persis nama vendor nyata yang dipakai Code Review Ronde 6-8 sebagai kasus paling rusak)** dan **No. Manifest = `"MNF/2026/VIII/00123-A"` (format lengkap realistis)** → submit → klik "Unduh PDF" di detail pengajuan (bukan tab terpisah) → **PDF SUNGGUHAN di-generate lewat `page.pdf({format:'A4', landscape:true, printBackground:true})`** (API yang sama dipakai Code Review Ronde 5-8, bukan `getBoundingClientRect()`/screenshot semata) dan dibaca ulang dengan `pdf-parse` (Node, setara `pypdf` yang dipakai reviewer).

**Hasil: PDF asli, 2 halaman, nol halaman kosong, KEDUA dokumen (Logbook dan Neraca) ada:**

| Verifikasi | Hasil |
|---|---|
| Jumlah halaman PDF | **2** (bukan 1 - membuktikan bug asli "cuma Neraca" **tidak terjadi**) |
| Panjang teks tiap halaman | 1559 & 1449 karakter (jauh di atas ambang 50 karakter untuk halaman kosong) |
| Halaman 1 memuat judul Logbook ("LEMBAR DATA PENYIMPANAN...") | **Ada** (dikonfirmasi dengan normalisasi whitespace - `pdf-parse` menyisipkan spasi artifisial di tengah kata ber-uppercase, artefak ekstraksi jinak, bukan cacat render - dibuktikan lewat pembacaan teks mentah manual, lihat B4.4) |
| Halaman 2 memuat judul Neraca ("NERACA...BERACUN...BERBAHAYA") | **Ada** |
| Logbook = SATU tabel gabungan (bukan 3 dokumen terpisah per kode seperti sebelum Amandemen 3) | **Ya** - `document.querySelectorAll('.doc-logbook')` = **1** section (dikonfirmasi DOM langsung, bukan cuma PDF) |
| Baris data (Aki, Oli, Majun) terurut per kode & dipadatkan | **3 baris data** (nomor 1-3) diikuti **17 baris kosong bernomor lanjutan 4-20** = tepat 20 baris/halaman, urutan `["Aki","Oli","Majun"]` sesuai kode `A102d < B105d < B110d` |
| Nama vendor 36-karakter di PDF | **Terpotong bersih dengan ellipsis**: `"PT Prasadha Pamunah Limbah Indu..."` - **string ini identik persis** dengan yang dikonfirmasi Code Review Ronde 8 §4 sebagai hasil yang BENAR (bukan bug - `doc-cell-clip` bekerja sesuai desain, mencegah baris melebar/tumpang tindih); awalan nama tetap ada di teks PDF (data tidak hilang total, hanya representasi visual dipotong) |
| Nomor manifest di PDF | Ada, utuh |
| `body.b3-printing` terpasang setelah klik tombol, dilepas setelah event `afterprint` | PASS, nol residu kelas |

Screenshot layar biasa (`amd3-01-weighed-doc.png`) mengonfirmasi visual: tabel Logbook satu blok dengan 3 baris data + 17 baris kosong, kolom "Tujuan Penyerahan" menampilkan `PT Prasadha Pamunah Limbah...` terpotong rapi tanpa tumpang tindih ke kolom "Bukti Nomor Dokumen" di sebelahnya, dokumen Neraca menyatu tepat di bawahnya (TOTAL A=B `0,0450` Ton, Kinerja `100,00%`).

## B4.2 TEST B - Pengajuan pra-`WEIGHED`: cek halaman kosong depan + temuan tambahan (bukan blocker)

Dibuka `PLB3/2026/0002` (status `Disetujui Supervisor` / `WAIT_PIC`, belum ditimbang). **Temuan:**

- **Tombol "Unduh PDF" TIDAK muncul sama sekali di layar untuk status ini** - karena toolbar Logbook hanya dirender `@if (blok().length)` (kosong saat pra-`WEIGHED`, jatuh ke pesan "Belum ada data logbook...") dan toolbar Neraca memang sengaja dimatikan permanen (`[toolbar]="false"`, dipakai bareng dokumen Logbook). Ini **bukan bug** dari fix Amandemen 3 (bukan regresi apa pun) - hanya observasi struktural: mandat "buka detail, klik Unduh PDF" untuk status pra-`WEIGHED` **tidak dapat dieksekusi lewat UI sungguhan** karena elemennya tidak ada di DOM sama sekali untuk user nyata mengeklik.
- Untuk tetap menutup substansi verifikasi yang diminta (memastikan mekanisme anti-halaman-kosong benar-benar berfungsi seandainya print sempat terjadi - persis metodologi Code Review Ronde 5-8 sendiri, yang juga tidak mengklik tombol di skenario ini karena alasan yang sama), saya mensimulasikan kondisi print secara manual (`body.classList.add('b3-printing')` + `page.pdf()` langsung) - hasil: **1 halaman, nol halaman kosong**, berisi dokumen Neraca kosong yang valid ("Belum ada transaksi tervalidasi.", Kinerja `-`). Mekanisme fix BLOCKER Ronde 5 (`breakBefore` kondisional) **tetap terbukti benar** bila suatu saat ada jalur lain untuk memicunya (mis. `Ctrl+P` manual oleh user, yang tidak digerbangi tombol UI).

**Klasifikasi:** ini bukan FAIL dari fix Amandemen 3 (tidak ada regresi, tidak ada bug baru) - melainkan **observasi UX** yang layak diteruskan ke PM/user: saat ini tidak ada cara bagi user sungguhan memicu unduh PDF untuk pengajuan yang belum ditimbang. Tidak jelas apakah ini disengaja (dokumen memang belum "resmi" sebelum ditimbang) atau celah - saya tidak menebak niatnya, hanya melaporkan faktanya untuk keputusan PM/user.

## B4.3 TEST C - Logbook satu tabel gabungan (bukan per-kode terpisah)

Tergabung dalam TEST A: dikonfirmasi `document.querySelectorAll('.doc-logbook')` = **1**, bukan 3 (untuk 3 item dengan 3 kode berbeda - Aki/Oli/Majun). Sebelum Amandemen 3, ini akan menghasilkan 3 section/dokumen terpisah (satu per kode); sekarang **satu tabel gabungan** dengan baris tetap terkelompok berurutan per kode. **PASS.**

## B4.4 Verifikasi tambahan: mekanisme print benar-benar aktif (`getComputedStyle`, bukan cuma jumlah halaman)

Karena PDF sungguhan (`page.pdf()`) sudah membuktikan hasil akhir bersih (nol kontaminasi teks sidebar/menu aplikasi ke dalam PDF - dikonfirmasi dengan membaca ulang teks mentah tiap halaman: dimulai langsung dari `"PT. Amerta Indah Otsuka Section K3L..."`, nol jejak "Dashboard"/"Task Approval"/"Mode Demo"), saya melakukan **satu verifikasi tambahan independen** dengan `getComputedStyle()` (metodologi yang sama seperti Code Review Ronde 7-8, bukan `page.pdf()`) untuk memastikan sesi saya sendiri (bukan mengutip klaim Ronde 8) melihat mekanisme yang sama aktif:

```
{ tabsVisibility: "hidden", demoBarVisibility: "hidden", docVisibility: "visible",
  printRootPosition: "absolute", bodyClass: "b3-printing" }
```
Cocok persis dengan yang dikonfirmasi Code Review Ronde 8. **Catatan teknik pengujian (bukan bug produk):** screenshot penuh-halaman (`page.screenshot({fullPage:true})`) yang diambil sesaat setelah `page.emulateMedia({media:'print'})` **tidak secara visual menampilkan** sidebar/topbar tersembunyi pada percobaan pertama saya (`amd3-02-print-emulated.png` masih menunjukkan chrome aplikasi utuh) - ini murni kuirk kompositing screenshot Playwright (kemungkinan urutan render internal saat `fullPage` capture dikombinasikan dengan `emulateMedia`), **bukan** indikasi mekanisme print gagal, dibuktikan tuntas oleh `getComputedStyle()` di atas dan oleh PDF asli yang sudah bersih di B4.1. Dicatat di sini sebagai pembelajaran teknik pengujian (screenshot fullPage tidak selalu representasi tepercaya dari `emulateMedia`; `getComputedStyle()`/`page.pdf()` adalah sumber kebenaran).

## B4.5 TEST D - Regresi

- **WastePicker**: centang Engineering → Oli, Aki, Majun (3 jenis) via klik sungguhan, tunggu 900ms diam - seluruhnya tetap tercentang, "3 jenis..." tetap tampil. Bug babak 1 (`effect()` self-reset) **tidak regresi**.
- **Guard editable/readonly lintas role** (pengajuan `APPROVED` seed `PLB3/2026/0001`): USER - 0 `.doc-input`; SUPERVISOR - 0 `.doc-input`; PIC - `.doc-input` ada (kontras positif). **Tidak regresi.**
- Build/`tsc`/36 unit test: bersih (B4.0).
- Nol `console.error`/`pageerror` di seluruh sesi (2 skrip Playwright terpisah, mencakup submit, approve x2, timbang, print x2, ganti role berkali-kali).

## B4.6 Hasil akhir Bagian 4

**28/28 assertion terprogram PASS** (TEST A-D) + 1 verifikasi tambahan `getComputedStyle()` yang juga cocok. **Nol bug baru ditemukan.** Bug asli yang dilaporkan user ("Unduh PDF cuma Neraca") **dikonfirmasi tuntas teratasi** lewat PDF sungguhan (bukan hanya trace kode/klaim Code Review) - 2 halaman bersih, Logbook dan Neraca keduanya ada, nol halaman kosong, nama vendor panjang aman (terpotong rapi, tidak tumpang tindih), Logbook sekarang satu tabel gabungan sesuai permintaan penyederhanaan user.

**Satu observasi non-blocking untuk PM/user** (bukan bug dari fix ini, ditemukan saat menjalankan mandat test B): tombol "Unduh PDF" tidak tersedia di UI untuk pengajuan yang belum berstatus `WEIGHED` (Logbook masih kosong) - user tidak bisa mengunduh dokumen kosong/pratinjau untuk pengajuan yang belum ditimbang. Perlu diklarifikasi ke user apakah ini perilaku yang diinginkan.

**Rekomendasi akhir: SHIP.** Tidak ada temuan Blocker/Critical/Major. Konsisten dengan verdict Code Review Ronde 8 (APPROVED setelah 4 putaran), sekarang diperkuat dengan verifikasi PDF sungguhan dari sudut pandang pengguna akhir yang independen dari proses review kode.

### Cara menjalankan ulang verifikasi Bagian 4

```bash
cd frontend
npm run build                                                            # konfirmasi hash main-E3KWNGR7.js
npx ng test --include "src/app/pages/b3-waste/b3-waste-model.spec.ts"    # 36 unit test murni
npx ng serve --port 4304                                                  # lalu buka http://localhost:4304/b3-waste manual
```
Verifikasi manual: submit pengajuan baru (3 jenis limbah beda kode) → approve berjenjang → PIC isi Tujuan Penyerahan dengan nama vendor panjang (>30 karakter) & No. Manifest format lengkap → submit → klik "Unduh PDF" pada detail pengajuan → pilih "Simpan sebagai PDF" di dialog cetak browser → buka file PDF, periksa: (a) ada 2+ halaman (Logbook lalu Neraca), (b) nol halaman kosong, (c) nama vendor panjang terpotong rapi dengan "..." di kolom Tujuan Penyerahan, tidak tumpang tindih ke kolom sebelahnya. Skrip Playwright (termasuk pembacaan PDF sungguhan dengan `pdf-parse`) disimpan di scratchpad sesi QA - `pdf-parse` diinstal terpisah di scratchpad, **tidak** ditambahkan ke `frontend/package.json`.
