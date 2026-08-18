# 01 - SPEC: Menu Limbah B3 - Alur Pembuangan (Tahap 1-4)

| Field | Value |
|---|---|
| Task slug | `b3-waste-workflow` |
| Task ID | AZK-002 |
| Tanggal | 2026-08-14 |
| PM | azkha-pm |
| Project | Otsuka Work Permit (PT Amerta Indah Otsuka) |
| Project root | `d:\000 dokumen\004 carrier\MAGANG HUB\otsuka` |
| Tipe task | Fitur baru (frontend prototype) - **mengganti total** halaman `/b3-waste` yang ada |
| Track proses | **PENUH-RINGKAS** - PM -> Architect -> Frontend -> Code Review -> QA -> PM (lihat Bagian 11) |
| Spec sumber (wajib dibaca utuh) | `backend\.windsurf\skills\limbah b3\pembunagan limbah.md` |

---

## 1. Permintaan User (verbatim)

> "rules untuk project ini pastikan anda tidak mengutak atik menu lainnya dan hanya fokus ke menu limbah B3 sekarang kita akan membuat menu ini @backend/.windsurf/skills/limbah b3/pembunagan limbah.md gunakan design fitur cheklist yang sama dengan yang gambar yang saya kirimkan untuk flow yang lainnya bisa di sesuaikan seperti kirim notifikasi email karena nanti ada beberapa role seperti user-supervisor-pak ruli(PIC) baiknya ada nafigasi di header untuk memudahkan saya(karena ini hanya prototype agar kita dapat logicnya dulu agar anda paham untuk nantinya kita masukan ke project sebenarnya. untuk format exel nanti saja akan kirimkan saat anda ingin mengerjakan halaman loobook dan naraca"

Empat instruksi yang saya baca dari kalimat di atas:
1. **Rule keras**: jangan sentuh menu lain, fokus hanya menu Limbah B3.
2. Bangun alur sesuai file spec, pakai **pola desain checklist** dari screenshot yang user lampirkan.
3. Flow selain checklist boleh disesuaikan (contoh yang user sebut sendiri: notifikasi email), karena ada 3 role: User - Supervisor - PIC (Pak Ruli). Perlu **navigasi ganti-role** supaya user gampang mereview.
4. **Logbook & Neraca ditunda** - format Excel-nya menyusul.

---

## 0. AMANDEMEN (2026-08-14) — Babak 2: Logbook & Neraca dibuka

Setelah babak 1 (Tahap 1-4) APPROVED di Code Review dan lolos QA putaran 1 (ditemukan+diperbaiki 1 blocker: bug `effect()` di `WastePicker`, lihat `05-code-review.md` & `08-qa-report.md`), user mengirim `Logbook Q2 2025.pdf` berisi format ASLI kedua dokumen yang sebelumnya ditunda. **NG1 di Bagian 3 di bawah, dan setiap rujukan "Logbook/Neraca = placeholder/ditunda" di sisa dokumen ini (Bagian 6, Acceptance Criteria, DoD) DIAMANDEMEN DICABUT** - digantikan oleh scope baru berikut. Anggap teks lama itu sejarah keputusan, bukan aturan aktif lagi.

**Rujukan format wajib:** `workspace/b3-waste-workflow/logbook-neraca-format-reference.md` - transkripsi lengkap kedua dokumen (Neraca FR/K3L/006/02/1, Logbook FR/K3L/006/01) dari PDF asli user. **Sumber kebenaran tunggal untuk format** - PDF asli tidak ada di filesystem, jangan cari filenya, pakai file referensi ini.

**Goal baru (G7-G10), menggantikan NG1:**
- G7. Tab **Logbook** menampilkan Lembar Data Penyimpanan Limbah B3 replika persis format asli (minus stempel ASLI/COPY), dikelompokkan per Jenis Limbah, terisi dari transaksi timbang PIC yang sudah divalidasi. Kumulatif & permanen (state in-memory sesi berjalan, bukan per-submission).
- G8. Tab **Neraca** menampilkan Neraca Limbah B3 replika persis format asli, agregat kumulatif dari seluruh data Logbook (Bagian I Jenis Awal -> TOTAL A, Bagian II Perlakuan -> TOTAL B, Residu C, Belum Terkelola D, Kinerja %).
- G9. Layar **Tahap 4 (PIC Timbang & Validasi)** mendapat tambahan: preview live baris Logbook/Neraca untuk item pengajuan yang sedang diaudit, **editable oleh PIC** sebelum submit final. Setelah PIC klik "Validasi & Buat Logbook": preview di layar audit itu kosong kembali, TAPI baris yang baru tervalidasi permanen masuk ke Logbook & Neraca kumulatif (tab terpisah G7/G8).
- G10. Tombol **"Unduh PDF"** di tab Logbook dan Neraca, pakai `window.print()` native + CSS `@media print` (BUKAN library PDF baru - lihat alasan di file referensi bagian "Keputusan implementasi" poin 6).

**Asumsi yang dikunci** (detail & alasan ada di file referensi): model satu-event timbang=penyerahan yang sudah dibangun Tahap 4 TETAP DIPAKAI tanpa ubah -> konsekuensinya Sisa selalu 0, Perlakuan selalu 100% "Diserahkan Pihak Ke-3", Kinerja selalu 100%. Neraca = agregat kumulatif berjalan (bukan literal per-kuartal kalender). Ini pola yang konsisten dengan seluruh data sample di PDF user (bukan karangan).

**Track proses babak 2:** Architect (update `02-architecture.md` dengan kontrak Logbook/Neraca) -> Frontend -> Code Review -> QA (mencakup verifikasi ulang fix `WastePicker` dari babak 1 sekaligus fitur baru, menyatukan 2 kebutuhan QA jadi 1 putaran) -> PM DoD. Rule scope Bagian 4 (single-menu-only) tetap berlaku tanpa perubahan.

---

## 2. Problem & Tujuan

**Problem.** Rantai dokumen limbah B3 di Otsuka masih manual (Excel/kertas): pengajuan pembuangan, approval berjenjang, penimbangan, sampai logbook & neraca ditulis terpisah sehingga terjadi input ganda dan angka antar dokumen bisa tidak sinkron. Halaman `/b3-waste` yang ada sekarang hanya tabel flat mock 1-laporan-1-status; modelnya **tidak bisa menampung** alur berjenjang 3 role yang sebenarnya.

**Tujuan babak ini.** Membuktikan **logika alurnya dulu** dalam bentuk prototype yang bisa diklik end-to-end, sebelum masuk ke project sebenarnya. Yang harus terlihat jelas & teruji:
- pemilihan limbah bertingkat (Departemen -> Sumber -> Jenis) dengan pola checklist yang user minta;
- state machine approval 2 tingkat lengkap dengan aturan validasinya;
- siapa dapat notifikasi apa di tiap perpindahan status;
- berat resmi lahir dari timbang PIC, bukan dari perkiraan user.

**Bukan tujuan babak ini.** Menyimpan data permanen, mengirim email betulan, atau membangun Logbook & Neraca.

---

## 3. Goals / Non-Goals

**Goals**
- G1. Form pengajuan (Tahap 1) dengan cascade checklist 3 tingkat + kartu "Lainnya".
- G2. State machine 5 status + approval Supervisor (Tahap 2) dan PIC (Tahap 3), dengan seluruh aturan validasi wajib dari spec sumber.
- G3. Timbang & validasi PIC (Tahap 4) termasuk hitung otomatis Maksimal Simpan.
- G4. Simulasi notifikasi per transisi status (siapa penerimanya, apa isinya) - terlihat & bisa diperiksa.
- G5. Role switcher **lokal di halaman** untuk berpindah sudut pandang User / Supervisor / PIC.
- G6. Nol perubahan pada menu lain (rule keras, diaudit di Code Review).

**Non-Goals**
- NG1. **Tahap 5a Logbook** (FR/K3L/006/01) dan **Tahap 5b Neraca** (FR/K3L/006/02/1) - ditunda, menunggu format Excel dari user.
- NG2. Pengiriman email sungguhan / SMTP / notification service.
- NG3. Backend, database, schema Prisma, endpoint API - tidak ada yang disentuh.
- NG4. Autentikasi / otorisasi nyata. Role switcher adalah **alat demo**, bukan access control.
- NG5. Master data editor (CRUD jenis limbah, departemen, vendor) - pakai mock dari spec sumber.
- NG6. Dashboard & alert saldo/hitung mundur (spec sumber Bagian 8) - butuh logbook dulu.
- NG7. Menyentuh menu/halaman lain apa pun.

---

## 4. Rule Keras: Single-Menu Only

Ini gerbang tegas, bukan imbauan. Code Review **wajib** mengaudit dan melaporkan daftar file yang berubah.

**Boleh dibuat/diubah (whitelist):**
- Apa pun **di dalam** `frontend/src/app/pages/b3-waste/` (boleh menambah sub-folder, komponen, file `.css` lokal, file model/state lokal).

**Dilarang diubah (blacklist, tidak ada pengecualian tanpa persetujuan user):**

| File / folder | Alasan |
|---|---|
| `frontend/src/app/app.routes.ts` | route `/b3-waste` **sudah ada** dan menunjuk ke komponen `B3Waste`. Semua tampilan baru dirakit **di dalam** halaman itu (tab/section internal), bukan route baru. |
| `frontend/src/app/shared/menu.ts` | entri menu "Limbah B3" sudah ada. |
| `frontend/src/app/layout/**` | topbar/sidebar dipakai SEMUA menu lain. Role switcher **dilarang** ditaruh di sini. |
| `frontend/src/app/shared/feature-page.css` | dishare 3 halaman EHS. Boleh **dipakai** (`styleUrls`), tidak boleh **diedit**. Style baru -> file `.css` baru di dalam folder `b3-waste/`. |
| `frontend/src/app/shared/icon/icon.ts` | dishare. Ikon tersedia: `grid, folder, check-square, layers, settings, book, clipboard, file-text, alert-triangle, shield, qrcode, menu, moon, sun, maximize, chevron-down, plus, scan`. Butuh ikon lain -> inline SVG lokal di komponen b3-waste, **jangan tambah ke `ICONS`**. |
| `frontend/src/styles.css`, `app.config.ts`, `angular.json`, `package.json` | global. Tidak boleh ada dependency baru. |
| `pages/company-reports/`, `pages/inspection/`, `pages/placeholder/`, `components/`, `services/`, `models/` | menu lain / kode di luar scope. |
| Seluruh `backend/` | tidak ada pekerjaan backend di babak ini. File spec di `backend/.windsurf/skills/` **hanya dibaca**. |

**Catatan penting soal "ganti total".** File `b3-waste.ts` dan `b3-waste.html` yang ada sekarang (tabel flat + `interface B3Report`) **diganti**, bukan ditambah. Model lamanya (1 laporan = 1 status, berat diisi user) bertentangan langsung dengan spec sumber (1 pengajuan = banyak item, berat hanya dari timbang PIC, status berjenjang). Menambal yang lama justru menghasilkan dua model yang saling bertabrakan.

---

## 5. Keputusan Teknis

### 5.1 Frontend-only + in-memory Angular signals (KEPUTUSAN FINAL)

**Keputusan:** seluruh state alur disimpan di signal Angular di dalam scope halaman Limbah B3. Tanpa HTTP, tanpa database, tanpa persistence.

**Alasan:**
1. **Sesuai framing user sendiri** - "ini hanya prototype agar kita dapat logicnya dulu ... nantinya kita masukan ke project sebenarnya". Target babak ini adalah kebenaran logika, bukan penyimpanan data.
2. **Konsisten dengan 3 menu EHS yang sudah ada** (Laporan HQ Jepang, Limbah B3 lama, Inspeksi) - semuanya frontend-only dengan mock di signal.
3. **Backend sekarang cuma punya 1 tabel `Product`** dan `server.ts` 47 baris tanpa lapisan, tanpa auth, tanpa validasi. Membangun schema B3 + endpoint di atas fondasi itu berarti pekerjaan besar yang kemungkinan besar dibuang saat pindah ke project sebenarnya.
4. **Lokasi file spec di `backend/.windsurf/skills/` bukan instruksi arsitektur.** Folder itu adalah cermin folder skill untuk AI assistant (ada juga di `.agents/skills/` dan `.claude/skills/`); isinya dokumentasi, bukan penempatan logic.

**Risiko yang diterima:** refresh browser = data hilang. Dapat diterima karena role switcher bersifat in-page (ganti sudut pandang tidak memicu reload), sehingga demo end-to-end User -> Supervisor -> PIC bisa dijalankan dalam satu sesi tanpa refresh. **Tidak** menambah localStorage/sessionStorage - itu menambah kompleksitas (serialisasi, migrasi bentuk data, tombol reset) untuk nilai yang kecil di prototype.

### 5.2 Notifikasi email = disimulasikan, bukan dikirim

Tidak ada infrastruktur email dan tidak ada backend. Implementasi: setiap transisi status menulis entri notifikasi (penerima + peran + subjek + isi + timestamp) ke state, ditampilkan sebagai **panel "Notifikasi Terkirim"** di halaman (dan/atau toast saat aksi terjadi). Nilai yang diuji adalah **logika siapa-dapat-apa**, yang justru jadi lebih mudah diverifikasi daripada email betulan.

### 5.3 Role switcher = kontrol lokal halaman

Ditempatkan sebagai toolbar di bagian atas konten halaman `/b3-waste`, **bukan** di topbar aplikasi (`layout/`). Alasan: topbar dishare semua menu; menaruhnya di sana melanggar rule Bagian 4. Wajib diberi label yang jelas bahwa ini alat demo (mis. "Mode Demo - lihat sebagai:"), agar tidak dikira fitur otentikasi.

### 5.4 Status ke-6: `WEIGHED` (penambahan sadar terhadap spec sumber)

Spec sumber mendefinisikan 5 status, berhenti di `APPROVED`. Tapi Tahap 4 (timbang & validasi) mengunci data dan menghasilkan angka final - tanpa status ke-6 tidak ada cara merepresentasikan "sudah ditimbang" dan tidak ada cara mengunci form. Karena itu ditambahkan **`WEIGHED` - "Ditimbang & Tervalidasi"** sebagai status terminal babak ini. Ini penambahan PM, dicatat terbuka untuk dikonfirmasi user; di sistem final status ini kemungkinan jadi pintu masuk ke Logbook.

### 5.5 Asumsi yang diambil dari daftar "perlu dikonfirmasi" (spec sumber Bagian 9)

| # | Item | Keputusan prototype |
|---|---|---|
| 1 | Masa simpan kode A: 185 vs 180 hari | **185 hari** (sesuai arahan di spec sumber). Kode B = 365 hari. Konstanta ini harus mudah diubah satu tempat. |
| 2 | Master Sumber -> Jenis | Pakai tabel mock spec sumber Bagian 4 **persis apa adanya**. Dilarang mengarang/menambah jenis. |
| 3 | Penetap jadwal timbang | **PIC**. |
| 4 | Satu event = Masuk+Keluar sekaligus vs Masuk saja | **Ditunda** - ini pertanyaan logbook, di luar scope babak ini. |
| 5 | Satuan neraca kg vs Ton | **kg** di seluruh UI. |
| 6 | Nama peran | User menyebut **Pak Ruli** sebagai PIC; spec sumber menulis **Pak Feri (K3L)**. Prototype pakai **Pak Ruli** sebagai PIC (mengikuti user, sumber yang lebih baru) dan **Feri Aryanto** sebagai contoh pemohon, **Andi Nugroho** sebagai Supervisor. Diskrepansi ini dilaporkan ke user di Checkpoint 2. |

---

## 6. Scope (5 area kerja)

### A. Form Pengajuan (Tahap 1) - peran User
Field header: Lokasi, Pelaksana/pengangkut, Diajukan oleh, Tanggal pengajuan (wajib); Usulan tanggal pembuangan (opsional).
Pemilihan limbah cascade 3 tingkat lewat checkbox. **Berat tidak diisi di sini.**

**Pola visual checklist (dari screenshot referensi user)** - wajib diadaptasi:
- kartu checkbox **induk** berisi **judul + kalimat deskripsi kecil** di bawahnya;
- saat induk dicentang, terbuka **area ber-border (aksen biru)** berisi opsi anak;
- opsi anak bersifat **multi-select** (boleh beberapa sekaligus);
- ada kartu **"Lainnya"** dengan input teks bebas untuk kategori tak terdaftar.

Adaptasi ke 3 tingkat: **Departemen** (induk, grid kartu) -> saat dicentang buka area **Sumber/line** -> saat sumber dipilih buka checklist **Jenis sampah** (menampilkan nama + kode). Departemen dengan satu line (Engineering/ENG, QA/QA-LAB, Office/OFFICE) langsung membuka sumbernya; Produksi punya 4 line (OC3, GBL, CAN-PET, Sachet).

### B. Approval berjenjang (Tahap 2-3) - Supervisor & PIC
State machine + aturan validasi (Bagian 7). Termasuk jalur perbaikan & ajukan ulang setelah ditolak.

### C. Timbang & Validasi (Tahap 4) - PIC
Berat (kg) per item, Maksimal Simpan terhitung otomatis, data penyerahan (tanggal pembuangan, tujuan, nomor manifest), centang pernyataan validasi. Setelah validasi, data **terkunci** (read-only).

### D. Simulasi notifikasi
Log notifikasi per transisi dengan penerima sesuai tabel Bagian 7.

### E. Role switcher lokal + navigasi antar tahap
Ganti sudut pandang User / Supervisor / PIC. Konten & aksi yang tersedia menyesuaikan role aktif.

**Placeholder (bukan implementasi):** boleh ada tab/section "Logbook" dan "Neraca" yang menampilkan pesan "Menunggu format Excel dari user - belum dikerjakan". Dilarang membangun kalkulasi A/B/C/D, kinerja %, atau ledger masuk/keluar/sisa.

---

## 7. Data Model & State Machine (ringkas)

> Detail lengkap (tabel mock departemen-sumber-jenis beserta kode, teks form, aturan) ada di spec sumber. **Architect wajib membaca file sumber utuh**, jangan bekerja dari ringkasan ini saja.

**Bentuk data (konseptual, penamaan final oleh Architect):**

```
Pengajuan
  id, status, header{ lokasi, pelaksana, diajukanOleh, tanggalPengajuan, usulanTanggalBuang? }
  items[]      -> { departemen, sumber, jenis, kode, masaSimpanHari, beratKg?, maksSimpan? }
  supervisi    -> { oleh?, tanggal?, alasanTolak? }
  pic          -> { oleh?, tanggalJadwal?, jamJadwal?, alasanTolak? }
  penyerahan   -> { tanggalBuang?, tujuan?, noManifest?, divalidasi:boolean }
  riwayat[]    -> { dari, ke, oleh, waktu, catatan }
Notifikasi     -> { kepadaRole, kepadaNama, subjek, isi, waktu, pengajuanId }
```

**State machine:**

| Dari | Aksi | Ke | Notifikasi ke |
|---|---|---|---|
| (baru) | User submit | `WAIT_SUP` (Diajukan) | Supervisor (pengajuan baru) + User (konfirmasi) |
| `WAIT_SUP` | Supervisor reject + alasan | `REJ_SUP` (Ditolak Supervisor) | User (berisi alasan) |
| `WAIT_SUP` | Supervisor approve | `WAIT_PIC` (Disetujui Supervisor) | PIC (perlu jadwal) + User |
| `WAIT_PIC` | PIC reject + alasan | `REJ_PIC` (Ditolak PIC) | User + Supervisor |
| `WAIT_PIC` | PIC approve + tgl/jam | `APPROVED` (Disetujui & Terjadwal) | User + Supervisor (berisi jadwal) |
| `APPROVED` | PIC validasi timbang | `WEIGHED` (Ditimbang & Tervalidasi) | User + Supervisor (berisi berat final + no. manifest) |
| `REJ_SUP` / `REJ_PIC` | User perbaiki & ajukan ulang | `WAIT_SUP` | sama seperti submit |

Transisi di luar tabel ini **tidak boleh mungkin terjadi** dari UI.

**Aturan turunan:**
- `masaSimpanHari` = 185 bila kode diawali `A`, 365 bila diawali `B`.
- `maksSimpan` = tanggal timbang + `masaSimpanHari`.
- Berat resmi hanya dari input PIC di Tahap 4.

---

## 8. Acceptance Criteria (testable)

Setiap AC harus bisa dijawab PASS/FAIL dengan bukti (langkah reproduksi atau test).

**Cascade & form pengajuan**
- **AC-1** Grid Departemen menampilkan 4 kartu (Engineering, QA, Produksi, Office) + 1 kartu "Lainnya"; tiap kartu punya judul **dan** kalimat deskripsi.
- **AC-2** Mencentang departemen membuka area anak ber-border aksen; departemen tak tercentang tidak menampilkan area anak.
- **AC-3** Engineering/QA/Office langsung menampilkan satu sumber (ENG / QA-LAB / OFFICE); Produksi menampilkan 4 pilihan sumber (OC3, GBL, CAN-PET, Sachet).
- **AC-4** Memilih sumber menampilkan checklist Jenis sampah **persis** sesuai tabel mock spec sumber, lengkap dengan kodenya (mis. sumber ENG memunculkan 9 jenis: Oli B105d, Aki A102d, Elektrik B107d, Filter B109d, Baterai Lithium B326-1, Majun B110d, Kemasan ex-Chemical B104d, Terkontaminasi A108d, POPs A101d). Tidak ada jenis di luar tabel.
- **AC-5** Jenis sampah bersifat multi-select - dua jenis atau lebih dalam satu sumber bisa tercentang bersamaan.
- **AC-6** Meng-**uncheck** departemen menghapus seluruh pilihan sumber **dan** jenis di bawahnya; mencentang ulang departemen itu menampilkan keadaan kosong, bukan pilihan lama.
- **AC-7** Kartu "Lainnya" menyediakan input teks bebas, dan isinya ikut terbawa ke pengajuan.
- **AC-8** Tidak ada input berat/volume di form pengajuan user.
- **AC-9** Submit **ditolak** bila salah satu terjadi: field header wajib kosong, ATAU tidak ada satu pun jenis sampah tercentang. Pesan error terlihat, status tidak berubah.
- **AC-10** Submit valid -> status `WAIT_SUP`, pengajuan muncul di antrean Supervisor.

**Approval**
- **AC-11** Supervisor reject dengan alasan **kosong/spasi saja** ditolak validasi; status tetap `WAIT_SUP`.
- **AC-12** Supervisor reject dengan alasan terisi -> `REJ_SUP`, dan alasan itu tampil di sisi User.
- **AC-13** Supervisor approve -> `WAIT_PIC`, muncul di antrean PIC.
- **AC-14** PIC approve **tanpa** mengisi tanggal ATAU jam jadwal ditolak validasi; status tetap `WAIT_PIC`.
- **AC-15** PIC approve dengan tanggal+jam terisi -> `APPROVED`, jadwal tampil di sisi User dan Supervisor.
- **AC-16** PIC reject dengan alasan kosong ditolak; dengan alasan terisi -> `REJ_PIC`.
- **AC-17** Pengajuan `REJ_SUP`/`REJ_PIC` dapat diperbaiki User dan diajukan ulang -> kembali ke `WAIT_SUP`.
- **AC-18** Aksi approval hanya tersedia pada role yang berwenang: role User tidak punya tombol approve/reject; Supervisor tidak punya tombol timbang.

**Timbang & validasi**
- **AC-19** Form timbang hanya bisa dibuka untuk pengajuan berstatus `APPROVED`.
- **AC-20** Validasi ditolak bila ada item dengan berat <= 0 atau kosong.
- **AC-21** Validasi ditolak bila tujuan penyerahan ATAU nomor manifest kosong.
- **AC-22** Validasi ditolak bila checkbox pernyataan PIC belum dicentang.
- **AC-23** Maksimal Simpan terhitung otomatis = tanggal timbang + 185 hari untuk kode diawali `A`, + 365 hari untuk kode diawali `B`. Diverifikasi minimal pada satu item A (mis. A102d) dan satu item B (mis. B105d).
- **AC-24** Setelah validasi berhasil -> status `WEIGHED` dan seluruh field pengajuan menjadi read-only (tidak ada jalan mengedit berat dari UI).

**Notifikasi**
- **AC-25** Setiap transisi status di Bagian 7 menghasilkan entri notifikasi dengan **penerima persis** seperti tabel (jumlah dan role-nya cocok).
- **AC-26** Notifikasi penolakan memuat teks alasan; notifikasi `APPROVED` memuat tanggal+jam jadwal.
- **AC-27** Notifikasi bisa dilihat user di halaman (panel/daftar), lengkap dengan penerima dan waktu.
- **AC-28** Tidak ada request jaringan apa pun keluar dari halaman ini (tidak ada `HttpClient`/`fetch` di kode b3-waste).

**Role switcher & scope**
- **AC-29** Toolbar role switcher berada **di dalam konten halaman** `/b3-waste`, bukan di topbar/sidebar aplikasi. Diberi label yang menyatakan ini mode demo.
- **AC-30** Berganti role mengubah tampilan/aksi tanpa reload halaman, dan **data pengajuan tetap utuh**.
- **AC-31** Tab/section "Logbook" dan "Neraca" ada sebagai placeholder bertulis menunggu format, tanpa kalkulasi apa pun.
- **AC-32** **Audit scope**: daftar seluruh file yang dibuat/diubah berada 100% di dalam `frontend/src/app/pages/b3-waste/`. Nol perubahan pada `app.routes.ts`, `menu.ts`, `layout/**`, `shared/feature-page.css`, `shared/icon/icon.ts`, `styles.css`, `package.json`, dan seluruh `backend/`.
- **AC-33** `npm run build` di `frontend/` sukses tanpa error. Tidak ada dependency baru di `package.json`.
- **AC-34** Menu lain masih berfungsi seperti sebelumnya (Laporan HQ Jepang, Inspeksi & Sertifikasi, dan halaman placeholder tetap terbuka normal).

---

## 9. Dependensi & Asumsi

**Dependensi**
- D1. File spec sumber `backend\.windsurf\skills\limbah b3\pembunagan limbah.md` - **wajib dibaca utuh oleh Architect**.
- D2. Codebase frontend Angular 22.1 (standalone, signals, zoneless, plain CSS, tanpa UI library). Konvensi: nama file kebab-case tanpa sufiks tipe, kelas PascalCase tanpa sufiks `Component`, `inject()` bukan constructor injection, control flow `@if`/`@for`.
- D3. Screenshot referensi pola checklist (permit kerja) - **tidak ada di repo**, deskripsinya sudah dirangkum di Bagian 6.A. Frontend bekerja dari deskripsi itu.

**Asumsi**
- A1. File prototipe HTML yang disebut spec sumber Bagian 10 (`sistem_pembuangan_limbah_b3_wadah.html`, dll.) **tidak ada di repo ini** - sudah dicek, folder `skills/limbah b3/` hanya berisi file `.md`. Semua UI dibangun dari nol mengikuti deskripsi spec.
- A2. Data departemen/sumber/jenis masih MOCK; master data lapangan menyusul. Prototype tidak menunggu itu.
- A3. Project root **bukan git repo**. Tidak jadi blocker; namun perubahan babak ini mengganti total 2 file existing tanpa jaring pengaman versi - **saya sarankan user menjalankan `git init` + commit awal sebelum Frontend mulai**. Ini rekomendasi, bukan syarat.

---

## 10. Ruang Lingkup per Role

| Role | Yang dikerjakan | Artefak |
|---|---|---|
| **PM** | Spec, gerbang DoR, gerbang DoD, checkpoint ke user | `01-spec.md`, `09-pm-review.md` |
| **Architect** | Baca spec sumber utuh. Desain: struktur komponen di dalam folder `b3-waste/` (pemecahan komponen + siapa memegang state), bentuk tipe data final, implementasi state machine (fungsi transisi terpusat + guard), aturan turunan (masa simpan, validasi), kontrak notifikasi, strategi role switcher. Tetapkan batas: apa yang **tidak** perlu diabstraksi. | `02-architecture.md` |
| **Frontend** | Implementasi penuh di dalam `frontend/src/app/pages/b3-waste/`. Ganti `b3-waste.ts`/`.html`, tambah komponen & CSS lokal seperlunya. | Kode + `04-frontend.md` (catatan implementasi + daftar file yang disentuh) |
| **Code Review** | Jalankan `/ponytail-review`. Fokus: (a) **audit scope AC-32**, (b) over-engineering - task ini rawan abstraksi berlebih karena banyak state, (c) transisi status tidak tersebar di banyak tempat, (d) tidak ada dependency baru, (e) konsistensi konvensi codebase. | `05-code-review.md` |
| **QA** | Verifikasi AC-1..AC-34 satu per satu dengan bukti. Jalankan `npm run build`. Boleh menambah unit test Vitest untuk logika murni (transisi status, aturan validasi, hitung masa simpan) - **hanya bila file testnya berada di dalam folder `b3-waste/`**. | `08-qa-report.md` |

---

## 11. Track Proses (keputusan PM)

**PM -> Architect -> Frontend -> Code Review -> QA -> PM (DoD)**

Role yang **dilewati**, beserta alasannya:
- **Backend** - tidak ada pekerjaan backend (keputusan 5.1).
- **Security** - tidak ada auth, tidak ada data nyata, tidak ada endpoint/permukaan jaringan baru, tidak ada dependency baru. Satu hal yang **dititipkan ke Code Review**: pastikan role switcher tidak dipresentasikan seolah access control, dan tidak ada `innerHTML` dari input user (input "Lainnya" adalah teks user).
- **DevOps** - tidak ada infra, CI, atau deployment; bukan git repo.

**QA tidak dilewati** meski orchestrator mengusulkan begitu. Alasan: task ini punya 34 acceptance criteria dengan banyak aturan validasi negatif ("harus ditolak bila..."). Prinsip divisi: tidak ada PASS tanpa bukti, dan Code Review membaca kode - bukan memverifikasi perilaku. QA di sini bersifat **ringan**: verifikasi berbasis penelusuran + build, ditambah unit test opsional untuk logika murni. Tidak ada infrastruktur test baru.

**Loop perbaikan:** maksimal 2 putaran (Frontend -> Code Review -> QA -> PM).

---

## 12. Definition of Done

Task ini SHIP hanya bila **semua** terpenuhi:
1. Seluruh AC di Bagian 8 berstatus PASS dengan bukti tertulis di `08-qa-report.md` (bukan klaim tanpa langkah).
2. `05-code-review.md` ada, seluruh temuan severity tinggi/menengah sudah ditangani atau di-waive dengan alasan tertulis.
3. **AC-32 (audit scope) PASS mutlak** - satu file saja di luar whitelist = NEED FIX, tanpa negosiasi.
4. `npm run build` di `frontend/` sukses; tidak ada dependency baru.
5. Alur end-to-end bisa didemokan dalam satu sesi: submit (User) -> approve (Supervisor) -> jadwal+approve (PIC) -> timbang+validasi (PIC) -> status `WEIGHED`, plus minimal satu jalur reject dan satu ajukan-ulang.
6. Logbook & Neraca tetap berupa placeholder (bukti bahwa NG1 dihormati).
7. Artefak `01`, `02`, `04`, `05`, `08`, `09` lengkap di folder task.

---

## 13. Gerbang Definition of Ready

| Kriteria | Status | Catatan |
|---|---|---|
| Tujuan jelas | LULUS | Buktikan logika alur Tahap 1-4 dalam prototype yang bisa diklik. |
| Acceptance criteria testable | LULUS | 34 AC, tiap AC punya kondisi PASS/FAIL yang bisa dieksekusi. |
| Dependensi teridentifikasi | LULUS | Spec sumber (ada, sudah dibaca), codebase (ada, sudah diperiksa), screenshot referensi (tidak ada di repo -> polanya sudah dideskripsikan tertulis di 6.A). |
| Batas scope tegas | LULUS | Whitelist/blacklist file eksplisit di Bagian 4; Logbook & Neraca dinyatakan out-of-scope. |
| Ambiguitas besar | TIDAK ADA | Enam item "perlu dikonfirmasi" dari spec sumber sudah diputuskan sebagai asumsi kerja (5.5); tidak ada yang memblokir. Dua hal dilaporkan ke user: nama PIC (Pak Ruli vs Pak Feri) dan penambahan status `WEIGHED`. |

**HASIL: DoR LULUS.** Boleh lanjut ke Architect setelah Checkpoint 1 disetujui user.
