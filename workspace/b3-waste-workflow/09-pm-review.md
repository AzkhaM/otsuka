# 09 - PM REVIEW (FINAL): Menu Limbah B3 - Alur Pembuangan

| Field | Value |
|---|---|
| Task slug | `b3-waste-workflow` |
| Task ID | AZK-002 |
| PM | azkha-pm |
| Tanggal review | 2026-08-15 |
| Cakupan | Babak 1 (Tahap 1-4) + Babak 2 (Logbook & Neraca) + Amandemen 2 (revisi visual & penggabungan dokumen) |
| Artefak dibaca | `01-spec.md` (+§0 Amandemen), `logbook-neraca-format-reference.md` (+§Amandemen 2), `02-architecture.md` (§14-26), `03-frontend.md` (§9-10), `05-code-review.md` (4 ronde), `08-qa-report.md` (3 bagian) |
| **KEPUTUSAN** | **SHIP** |

---

## 1. Ringkasan Keputusan

**SHIP.** Nol bug Blocker/Major yang terbuka. Seluruh gerbang inti terlewati dengan bukti yang saya verifikasi ulang sendiri, bukan hanya klaim role lain.

Yang menentukan keputusan ini bukan jumlah AC yang hijau, melainkan satu fakta proses: **QA menemukan blocker nyata yang lolos dari build, type-check, dan Code Review** (bug `effect()` di `WastePicker` yang membuat checklist limbah reset sendiri sehingga pengajuan mustahil dibuat), lalu bug itu diperbaiki dan diverifikasi ulang lewat interaksi browser sungguhan. Ini bukti gerbang QA benar-benar bekerja sebagai gerbang, bukan formalitas stempel. Keputusan saya di DoR untuk **tidak melewati QA** - meski orchestrator mengusulkan skip - terbukti menyelamatkan task ini dari SHIP yang cacat total di fitur intinya.

Ada 5 acceptance criteria yang **tidak lagi berlaku secara literal** karena instruksi user sendiri di Amandemen 2 mengubah produknya. Itu saya catat sebagai **SUPERSEDED**, bukan PASS dan bukan FAIL - lihat Bagian 3. Kejujuran soal ini penting: menandai AC yang sudah dicabut sebagai "PASS" akan membuat laporan ini bohong.

---

## 2. Verifikasi Independen PM (dijalankan sendiri, bukan membaca laporan)

Saya tidak menandatangani DoD berdasarkan klaim. Berikut yang saya jalankan langsung:

| Yang diverifikasi | Perintah / metode | Hasil |
|---|---|---|
| Type-check | `npx tsc --noEmit -p tsconfig.app.json` | Bersih, exit 0 |
| Build produksi | `npm run build` | Sukses, nol error, nol warning. `main-QDXMPMBX.js` 437.58 kB - **hash identik** dengan yang dilaporkan Code Review Ronde 4 & QA Bagian 3, artinya kode yang saya uji persis kode yang mereka review |
| Unit test | `npx ng test --include ".../b3-waste-model.spec.ts"` | **36/36 PASS** |
| **Audit scope (AC-32)** | `ls --time-style=long-iso` atas seluruh daftar blacklist | **Semua file blacklist bertanggal 12-13 Agustus** - sebelum task ini dimulai (14 Agustus 09:17). `app.routes.ts`, `menu.ts`, `layout/*`, `feature-page.css`, `icon.ts`, `styles.css`, `package.json`, `angular.json`, `app.config.ts`, `company-reports/*`, `inspection/*`: **nol perubahan** |
| Dependency baru (AC-33) | `package.json` 784 B, mtime 12 Agustus 10:26 | **Tidak tersentuh** - nol dependency baru, terkonfirmasi lewat filesystem bukan pembacaan isi |
| Nol jaringan/persistence (AC-28) | `grep HttpClient\|fetch(\|XMLHttpRequest\|localStorage\|sessionStorage` di folder | **0 hasil** |
| Satu sumber data (AC-47) | `grep signal<Logbook\|signal<Neraca\|logbook.set(\|neraca.set(` | 2 hasil, **keduanya baris komentar** yang justru melarang praktik itu. Nol kode |
| Dokumen di-scope per pengajuan | `b3-waste.html:169-178` + `b3-waste.ts:144-155` | Dikonfirmasi `dokBlok(p)`/`dokNeraca(p)` menerima **satu** pengajuan, bukan `pengajuan()` global |
| Tab bar bersih | `type Tab = 'ajukan' \| 'daftar' \| 'notifikasi'` (`b3-waste.ts:29`) | Hanya 3 tab, nol sisa `'logbook'`/`'neraca'` |
| Stempel ASLI/COPY | `grep -niE "\basli\b\|\bcopy\b" *.html` | **0 hasil** - instruksi user dipatuhi |
| **Titipan keamanan saya di DoR** | `grep innerHTML\|bypassSecurity\|DomSanitizer` | **0 hasil**. Teks bebas "Lainnya" dirender lewat interpolasi `{{ p.lainnya }}` (`b3-waste.html:140`) yang otomatis di-escape Angular. Titipan saya terpenuhi |

Kesimpulan verifikasi PM: **seluruh klaim scope, build, dan test dari Frontend/Code Review/QA benar dan dapat direproduksi.** Tidak ada satu pun klaim yang saya temukan dilebih-lebihkan.

---

## 3. Status Acceptance Criteria

### 3.1 Rekap

| Kelompok | Jumlah | Status |
|---|---|---|
| Babak 1 (AC-1..AC-34) | 34 | **29 PASS**, 1 dicabut (AC-31), **4 SUPERSEDED sebagian/penuh** oleh Amandemen 2 (AC-8) - lihat 3.2 |
| Babak 2 (AC-35..AC-47) | 13 | **9 PASS penuh**, **4 SUPERSEDED** lokasinya oleh Amandemen 2 (AC-42, AC-44, AC-45/46) - substansinya tetap terverifikasi |
| Amandemen 2 (9 poin kontrak) | 9 | **9 terpenuhi**, diverifikasi 42/42 assertion interaktif QA |

**Nol AC berstatus FAIL.**

### 3.2 AC yang SUPERSEDED - dicatat terbuka, bukan disembunyikan

Ini bagian terpenting dari review saya. Lima AC di bawah **tidak lagi menggambarkan produk yang dikirim**, karena user sendiri mengubah arahannya di tengah jalan. Menandainya PASS akan menyesatkan.

| AC | Bunyi asli | Kenyataan sekarang | Penilaian |
|---|---|---|---|
| **AC-8** | "Tidak ada input berat/volume di form pengajuan user" | **Ada** field "Perkiraan Berat (kg)" opsional di Tahap 1 (`b3-waste.html:73-85`) | **SUPERSEDED - sah.** Amandemen 2 poin 4 adalah instruksi eksplisit user yang membalik AC ini. Saya verifikasi field ini benar-benar opsional: `validasiIsiPengajuan()` tidak pernah memeriksa `beratKg`, jadi submit tanpa mengisi tetap lolos. Prinsip asli "berat resmi = hasil timbang PIC" **tetap utuh** - QA membuktikan angka final yang tersimpan adalah hasil koreksi PIC (`40`/`15`), bukan perkiraan user (`42,5`) |
| **AC-31** | "Tab Logbook/Neraca placeholder, nol kalkulasi" | Dokumen penuh terimplementasi | **SUPERSEDED - sah.** Dicabut resmi di `01-spec.md` §0 saat user mengirim PDF format asli |
| **AC-42** | "Logbook & Neraca **kumulatif lintas pengajuan**, bertahan saat pindah tab & ganti peran" | Dokumen **di-scope per satu pengajuan**; tampilan kumulatif lintas-pengajuan **tidak ada** | **SUPERSEDED - sah, tapi ini pengurangan kemampuan nyata.** Amandemen 2 poin 7 & 9 memerintahkannya secara eksplisit. Lihat Bagian 6 Item Terbuka 2 - saya nilai ini perlu disampaikan ke user, karena Neraca yang sesungguhnya (sesuai form regulator) memang dokumen periodik lintas-pengajuan |
| **AC-44** | "...tab Logbook bertambah tepat N baris" | Tidak ada tab Logbook | **SUPERSEDED sebagian.** Substansi yang penting tetap PASS & terverifikasi: setelah validasi, panel timbang hilang, status `WEIGHED`, dokumen jadi read-only (QA: 0 elemen `.doc-input`), data hasil edit permanen |
| **AC-45 / AC-46** | "Mencetak dari tab Neraca tidak memunculkan lembar Logbook, dan sebaliknya" | Satu klik mencetak Logbook **dan** Neraca pengajuan itu sekaligus | **SUPERSEDED - sah.** Konsekuensi logis dari penggabungan tampilan (Amandemen 2 poin 7: "unduh dokumen pengajuan ini saja"). Yang esensial tetap PASS: cetakan **di-scope ke satu pengajuan** (QA verifikasi tepat 4 blok pada `PLB3/2026/0001`, bukan gabungan seluruh pengajuan), chrome aplikasi tersembunyi, `body.b3-printing` bersih setelah dialog ditutup |

**Akar penyebab drift ini** saya catat di Bagian 5 (temuan proses): tidak ada role yang ditugasi memperbarui daftar AC saat Amandemen 2 masuk, sehingga ketidakcocokan baru ketahuan di meja saya.

---

## 4. Cek Definition of Done (`01-spec.md` Bagian 12)

| # | Item DoD | Status | Bukti |
|---|---|---|---|
| 1 | Seluruh AC PASS dengan bukti tertulis | **LULUS** | `08-qa-report.md` 3 bagian; 42/42 assertion interaktif + 36 unit test + screenshot. Nol FAIL; 5 SUPERSEDED terdokumentasi di Bagian 3.2 di atas |
| 2 | Code Review ada, temuan tinggi/menengah ditangani | **LULUS** | 4 ronde. Ronde 4: **0 Blocker, 0 Major, 1 Minor** (`text-align:center` blanket - di-waive dengan alasan tertulis: mengikuti Excel asli, data master terpanjang ~22 karakter), 2 Nit carry-over |
| 3 | **AC-32 audit scope PASS mutlak** | **LULUS** | Diverifikasi **sendiri oleh saya** lewat mtime seluruh daftar blacklist - semuanya 12-13 Agustus, sebelum task dimulai. Nol pelanggaran. Rule keras user "jangan utak-atik menu lain" dipatuhi 100% |
| 4 | `npm run build` sukses, nol dependency baru | **LULUS** | Dijalankan sendiri: build bersih; `package.json` tidak tersentuh sejak 12 Agustus |
| 5 | Alur E2E didemokan satu sesi + jalur reject + ajukan ulang | **LULUS** | QA B3.3: submit -> approve Supervisor -> approve+jadwal PIC -> koreksi -> validasi -> `WEIGHED`, satu sesi tanpa reload. Jalur reject (AC-11/12/16) & ajukan ulang (AC-17) terverifikasi di QA Bagian 1 |
| 6 | Logbook & Neraca placeholder (NG1 dihormati) | **TIDAK BERLAKU** | Dicabut resmi oleh user di `01-spec.md` §0. Kini terimplementasi penuh - ini kemajuan, bukan pelanggaran |
| 7 | Artefak `01`, `02`, `04`, `05`, `08`, `09` lengkap | **LULUS dengan catatan** | Lengkap semua; laporan Frontend bernomor `03-frontend.md` (bukan `04`) - penyimpangan penamaan sepele, nol dampak |

**Gerbang DoD: LULUS.**

---

## 5. Penilaian Proses: Amandemen 2 tanpa Architect

Orchestrator meminta penilaian saya soal keputusannya menyintesis sendiri kontrak Amandemen 2 (9 poin, ditulis langsung di `logbook-neraca-format-reference.md`) tanpa memanggil Architect.

**Penilaian saya: proporsional, tapi berada di batas - dan ada satu biaya nyata yang terjadi.**

Yang membenarkan keputusan itu:
- Enam dari sembilan poin memang murni visual/penempatan (header bergaris, rata-tengah, field bersama dipindah ke atas, logo ditunda).
- Kontraknya tegas soal batas arsitektural yang paling berisiko: poin 7 secara eksplisit memerintahkan `bangunLogbook()`/`kelompokkanLogbook()`/`hitungNeraca()` **tidak diubah**, cukup dipanggil dengan array 1 elemen. Itu persis instruksi yang akan diberikan Architect, dan berhasil menjaga prinsip P-1 (satu sumber data). Code Review Ronde 4 memverifikasi ketiga fungsi itu byte-identik lewat mtime.
- Hasil akhirnya lolos dua gerbang independen: Code Review (0 blocker/major) dan QA (42/42, nol bug baru).

Yang membuat saya menahan diri menyebutnya "sepenuhnya tepat":
1. **Poin 8 bukan revisi visual - itu perubahan kontrak komponen.** Menggabungkan dua tampilan jadi satu komponen bermode `editable`/`readonly` mengubah input komponen dan memindahkan pertanyaan "siapa pemilik state buffer edit". Itu wilayah Architect.
2. **Biayanya terwujud nyata.** Frontend menemukan dan memperbaiki sendiri bug non-trivial `pastikanBeratTerisi()` (pre-fill tidak ter-trigger di alur normal) - dan itu **persis kelas masalah kepemilikan state** yang seharusnya dijawab kontrak arsitektur di awal, bukan ditemukan saat implementasi. Untungnya Code Review Ronde 4 §4 menelusuri ketiga titik pemanggilan satu per satu dan QA memverifikasi idempotensinya secara interaktif (ganti peran PIC->User->PIC, edit bertahan). Jaring pengaman bekerja - tapi jaring pengaman bekerja *setelah* jatuh, bukan mencegah jatuh.
3. **Daftar AC tidak ikut diperbarui.** Tidak ada yang bertugas menyelaraskan AC-8/42/44/45/46 dengan produk baru, sehingga ketidakcocokan itu baru ketahuan di gerbang DoD (Bagian 3.2). Kalau saya tidak membaca silang, laporan akhir bisa mengklaim "47/47 PASS" - klaim yang tidak benar.

**Aturan yang saya tetapkan untuk task berikutnya** (bukan teguran, ini perbaikan proses):
> Revisi boleh melewati Architect bila hanya menyentuh tampilan, teks, atau tata letak. Bila revisi mengubah **input/output komponen, kepemilikan state, atau scope data** - panggil Architect meski singkat. Dan siapa pun yang menulis amandemen scope **wajib sekalian menyatakan AC mana yang dicabut/diganti**, supaya gerbang DoD tidak jadi tempat pertama ketidakcocokan itu ditemukan.

**Tidak memblokir SHIP.** Hasil akhirnya sudah lolos dua gerbang independen dan saya verifikasi sendiri.

---

## 6. Item Terbuka & Risiko (non-blocking)

| # | Item | Keparahan | Catatan |
|---|---|---|---|
| 1 | **Logo asli Otsuka belum terpasang** - masih placeholder | Rendah, **bukan cacat** | User mengirim logo sebagai gambar inline di chat; tidak ada file yang bisa dijadikan asset. Bukan kegagalan implementasi. Untuk memasangnya nanti: butuh file (`.png`/`.svg`) - dan perlu diingat penempatannya harus tetap **di dalam** folder `b3-waste/` atau `public/` agar tidak melanggar rule scope |
| 2 | **Neraca sekarang per-pengajuan, bukan periodik lintas-pengajuan** | **Sedang - perlu keputusan user** | Ini konsekuensi Amandemen 2 poin 7 & 9 (permintaan user sendiri). Tapi Neraca resmi FR/K3L/006/02/1 pada dasarnya **dokumen periodik** ("PERIODE WAKTU: Juli - September 2025") yang menjumlahkan seluruh limbah dalam satu kuartal. Bentuk sekarang berguna untuk memverifikasi satu pengajuan, **belum bisa dipakai sebagai laporan regulator**. Kabar baiknya: `hitungNeraca()` tetap generik menerima array pengajuan - menambah rekap periodik nanti tinggal memanggilnya dengan array penuh + filter tanggal, bukan membangun ulang |
| 3 | **Data hilang saat refresh browser** (in-memory) | Rendah - risiko yang diterima sejak DoR | Sesuai keputusan 5.1. Demo harus dijalankan satu sesi tanpa refresh. Persistence adalah pekerjaan saat masuk project sebenarnya |
| 4 | **"Unduh PDF" membuka dialog print browser**, bukan file ter-download otomatis | Rendah | Keputusan sadar (nol dependency baru). User perlu pilih "Simpan sebagai PDF" di dialog Chrome/Edge. PDF sungguhan sebaiknya digenerate di backend saat masuk project nyata |
| 5 | `text-align:center` blanket di sel tabel dokumen | Minor (Code Review Ronde 4, di-waive) | Aman untuk data master sekarang (teks maks ~22 karakter). Pertimbangkan rata-kiri untuk kolom "Jenis Limbah B3 Masuk"/"Tujuan Penyerahan" bila data produksi punya teks jauh lebih panjang |
| 6 | `src/app/app.spec.ts` gagal 1 test | Nol - **kondisi pra-ada** | Sudah ada sebelum task ini, di luar scope, **sengaja tidak disentuh** demi mematuhi rule AC-32. Bukan regresi dari pekerjaan ini |
| 7 | Nama PIC: user bilang "Pak Ruli", spec sumber tulis "Pak Feri (K3L)" | Rendah | Sistem memakai **Pak Ruli**. Perlu konfirmasi user |
| 8 | Status `WEIGHED` adalah tambahan PM di luar 5 status spec sumber | Rendah | Perlu konfirmasi user; kemungkinan jadi pintu masuk ke Logbook di sistem final |
| 9 | Project bukan git repo | Rendah | Saran `git init` sejak DoR belum dieksekusi. Tidak memblokir, tapi sekarang ada ~12 file kerja tanpa jaring pengaman versi - **saya naikkan urgensinya**: lakukan sebelum babak berikutnya |

---

## 7. Konfirmasi Track Proses

Track yang saya putuskan di DoR - **PM -> Architect -> Frontend -> Code Review -> QA -> PM**, melewati Backend/Security/DevOps - **tetap valid untuk keseluruhan hasil akhir**, dan saya konfirmasi ulang dengan bukti:

- **Backend dilewati - benar.** Nol file `backend/` disentuh. Nol `HttpClient`/`fetch`/`XMLHttpRequest` di folder b3-waste (diverifikasi sendiri). Keputusan frontend-only di DoR terbukti tepat: seluruh logika alur, state machine, dan proyeksi dokumen bisa dibuktikan benar tanpa satu baris backend pun - persis yang diminta user ("dapat logicnya dulu").
- **Security dilewati - benar, dan titipan saya terpenuhi.** Nol auth, nol jaringan, nol storage, nol dependency baru, nol `innerHTML`/`bypassSecurity`. Teks bebas dari user ("Lainnya") dirender lewat interpolasi yang otomatis di-escape. Role switcher konsisten dilabeli mode demo, tidak pernah dipresentasikan sebagai access control - meski perlu dicatat bahwa `aksiUntuk()` **secara struktural** mencegah role non-PIC masuk mode editable, yang berarti logika otorisasinya sudah benar bentuknya untuk diangkat jadi otorisasi sungguhan nanti.
- **DevOps dilewati - benar.** Nol infra, nol CI, nol deployment. Satu-satunya jejak DevOps yang relevan (git init) tercatat sebagai Item Terbuka 9.

---

## 8. Keputusan Akhir

# SHIP

Task `b3-waste-workflow` **memenuhi Definition of Done** dan siap ditutup, dengan catatan 9 item terbuka non-blocking di Bagian 6 - di mana **Item 1 (logo) dan Item 2 (Neraca periodik)** perlu keputusan user sebelum babak berikutnya.

Alasan utama:
1. Rule keras user - "jangan utak-atik menu lain" - dipatuhi **100%**, diverifikasi mandiri oleh saya lewat mtime seluruh daftar blacklist, bukan lewat klaim.
2. Nol bug Blocker/Major terbuka; satu-satunya blocker yang pernah ada ditemukan QA lewat interaksi browser nyata, diperbaiki, dan diverifikasi ulang tidak kembali di dua putaran berikutnya.
3. Seluruh gerbang bukti dijalankan ulang oleh saya sendiri dan hasilnya cocok: build bersih, tsc bersih, 36/36 test hijau, hash bundle identik dengan yang direview.
4. Alur inti yang jadi tujuan user - "dapat logicnya dulu" - terbukti bisa dijalankan ujung-ke-ujung dalam satu sesi, termasuk jalur penolakan dan pengajuan ulang.

Ditandatangani: **azkha-pm**, 2026-08-15.

---
---

# BAGIAN II - PM REVIEW: AMANDEMEN 3 (bug print post-SHIP + penyederhanaan Logbook)

| Field | Value |
|---|---|
| Tanggal review | 2026-08-16 |
| Pemicu | **Bug dilaporkan user setelah SHIP**: "Unduh PDF" hanya mencetak Neraca, Logbook hilang. Ditambah permintaan penyederhanaan Logbook jadi 1 tabel gabungan + padding/pagination 20 baris per halaman |
| Rangkaian | Code Review **Ronde 5, 6, 7 CHANGES REQUESTED** -> **Ronde 8 APPROVED** -> QA Bagian 4 **PASS** |
| Artefak dibaca | `logbook-neraca-format-reference.md` §Amandemen 3, `03-frontend.md` §11-14, `05-code-review.md` Ronde 5-8, `08-qa-report.md` Bagian 4 |
| **KEPUTUSAN** | **SHIP** |

---

## II.1 Verifikasi Independen PM

Seperti sebelumnya, saya tidak menandatangani berdasarkan klaim. Yang saya jalankan sendiri:

| Yang diverifikasi | Metode | Hasil |
|---|---|---|
| Kode yang saya uji = kode yang di-APPROVE | `npm run build`, bandingkan hash | **`main-E3KWNGR7.js` 440.21 kB - identik** dengan hash yang dicatat Code Review Ronde 8 §6 dan QA B4.0. Bukti kuat saya menguji kode yang sama, bukan versi lain |
| Type-check | `npx tsc --noEmit -p tsconfig.app.json` | Bersih, exit 0 |
| Unit test | `npx ng test --include ".../b3-waste-model.spec.ts"` | **36/36 PASS** - nol regresi logika inti setelah 4 ronde utak-atik CSS |
| **Audit scope (AC-32)** | `ls --time-style=long-iso` seluruh blacklist | **Semua tetap 12-13 Agustus.** `app.routes.ts`, `menu.ts`, `layout/*`, `feature-page.css`, `icon.ts`, `styles.css`, `package.json`, `angular.json`, `app.config.ts`, `company-reports/*`, `inspection/*` - **nol perubahan sepanjang 4 ronde**. Nol dependency baru |
| **Integritas file seed** (titik paling rawan - reviewer sempat patch-lalu-revert untuk skenario uji) | `md5sum b3-waste-data.ts` | **`dce2499e221f398934586c8ffe4b7cdb`** - **cocok persis** dengan hash yang dicatat Ronde 8 §7. File kembali pristine 275 baris. Ini penting: mtime-nya `16 Agu 18:32` (paling baru di folder) yang sekilas mencurigakan, tapi hash membuktikan **isinya tidak berubah** - artefak operasi copy verifikasi, bukan perubahan konten. Diperkuat fakta hash bundle produksi identik (kalau seed berubah, hash bundle pasti ikut berubah) |
| **Root cause fix asli** (`position:absolute` pindah ke wrapper) | Baca `b3-dokumen.css` + `b3-waste.html` | Dikonfirmasi: `body.b3-printing .b3-print-root` (baris 132) yang menerima posisi absolut, **bukan** tiap `.b3-doc`. Wrapper `<div class="b3-print-root">` ada di `b3-waste.html:176` membungkus kedua dokumen. Penyebab asli "dua dokumen bertumpuk di posisi sama" benar-benar hilang secara struktural |
| **Fix BLOCKER Ronde 7** (source-order cascade) | Baca urutan rule | Dikonfirmasi: wildcard `overflow: visible !important` di **baris 116**, lalu `.doc-cell-clip { overflow: hidden !important }` di **baris 121-125** - benar setelahnya, menang lewat source-order. Saya periksa sisa file: **tidak ada rule keempat** setelah baris 125 yang menyentuh `overflow`/`text-overflow`/`white-space` pada selector yang bisa menyasar `.doc-cell-clip` |
| **Fix halaman kosong** | Baca template + CSS | `break-before: page` **kondisional** lewat `[class.doc-neraca-break]="breakBefore()"` (`b3-dokumen.html:176`), bukan dipaksa tanpa syarat |
| **Logbook jadi 1 tabel gabungan** | Baca `halamanLogbook()` + template | Fungsi murni `halamanLogbook(blok, kapasitas = 20)` (`b3-waste-logbook.ts:194-202`) - flatten lalu chunk, nol state. Template merender satu `.doc-logbook` per halaman. Untuk 3 item = 1 section, cocok dengan temuan QA `querySelectorAll('.doc-logbook') = 1` |
| **Tombol PDF pra-`WEIGHED`** (temuan QA) | Baca `b3-dokumen.html:6-10` | **Dikonfirmasi benar**: toolbar dibungkus `@if (blok().length)`, dan instance Neraca dipanggil `[toolbar]="false"`. Jadi memang **tidak ada tombol sama sekali** sebelum status `WEIGHED` |

**Seluruh klaim Frontend, Code Review, dan QA terverifikasi benar dan dapat direproduksi.** Nol klaim yang saya temukan dilebih-lebihkan.

---

## II.2 Status Bug yang Dilaporkan User

| Bug / permintaan | Status | Bukti terkuat |
|---|---|---|
| "Unduh PDF" hanya mencetak Neraca, Logbook hilang | **TERATASI** | QA membuat **PDF sungguhan** (`page.pdf()`) lalu membacanya ulang dengan `pdf-parse`: **2 halaman**, halaman 1 = judul Logbook, halaman 2 = judul Neraca, panjang teks 1559 & 1449 karakter (jauh di atas ambang halaman kosong). Ini bukan simulasi DOM - ini file PDF yang isinya dibaca balik |
| Logbook disederhanakan jadi 1 tabel gabungan | **TERPENUHI** | 3 item beda kode -> **1** section `.doc-logbook` (dulu 3 dokumen terpisah), baris tetap terkelompok urut kode `A102d < B105d < B110d` |
| Padding 20 baris + pagination otomatis | **TERPENUHI** | 3 baris data + 17 baris kosong bernomor 4-20 = tepat 20 baris/halaman. Uji 25 item -> 4 halaman, nol halaman kosong |
| Nama vendor panjang merusak layout (ditemukan reviewer, bukan dilaporkan user) | **TERATASI** | Vendor 36 karakter terpotong bersih `"PT Prasadha Pamunah Limbah Indu..."`, nol tumpang tindih. Diverifikasi `getComputedStyle()` pada **40/40 sel** di kondisi cetak sungguhan + render zoom 8x dari PDF asli |

---

## II.3 Penilaian Proses: 4 Ronde untuk Satu Area Masalah

Orchestrator meminta penilaian saya apakah 4 loop-back ini masih wajar, mengingat `01-spec.md` Bagian 11 menetapkan **maksimal 2 putaran**.

**Penilaian: pengecualian yang dapat diterima, dan ditangani dengan benar - tapi saya tidak akan membingkainya sebagai "4 bug berbeda yang tidak terkait".**

Framing yang jujur: ini **satu area rapuh** (cascade CSS + `!important` + `@media print`) di mana tiap perbaikan membuka atau memperlihatkan cacat bertetangga. Yang membedakannya dari "gagal berulang" - dan inilah yang membuat saya menerimanya:

1. **Tiap ronde defect-nya benar-benar baru**, bukan defect lama yang diperbaiki lalu gagal lagi. R5 halaman kosong + tabel kepotong; R6 rapuh terhadap nama vendor realistis; R7 mekanisme ellipsis tidak pernah aktif; R8 tuntas.
2. **Metodologi verifikasinya menguat tiap ronde**, bukan mengulang cara yang sama. Puncaknya di R7 saat reviewer berhenti mengukur *gejala* (jumlah halaman PDF) dan mulai mengukur *mekanisme* (`getComputedStyle()` di kondisi cetak sungguhan).
3. **Ronde terakhir memverifikasi mekanisme, bukan kebetulan lolos**: 40 sel sekaligus, pada dua skenario yang di R7 terbukti rusak, di tiga kondisi berurutan. Ditambah QA independen yang menghasilkan PDF nyata dan menemukan **nol bug baru**.

Yang harus saya catat dengan jujur, karena penting untuk pembelajaran: **APPROVED di Ronde 6 adalah lolos-palsu.** Cacat yang ditemukan R7 kemungkinan besar sudah ada sejak wildcard R5 diperkenalkan - R6 tidak melihatnya karena mengukur jumlah halaman, dan jumlah halaman kebetulan benar meski teksnya tumpang tindih. Jadi rantai ini panjang bukan semata karena masalahnya sulit, tapi karena **selama dua ronde kita mengukur hal yang salah**.

**Kesimpulan proses:** aturan "maksimal 2 putaran" dirancang untuk menangkap gejala *lain* - role yang berputar-putar tanpa kemajuan. Di sini tiap putaran menghasilkan kemajuan nyata dan pemahaman yang bertambah, jadi menghentikannya di putaran 2 justru akan mengirim bug tumpang-tindih teks ke user. **Saya sahkan sebagai pengecualian, bukan pelanggaran.** Aturan 2 putaran saya perjelas untuk ke depan:

> Batas 2 putaran berlaku untuk **defect yang sama berulang**. Bila tiap putaran menemukan defect **baru** lewat metodologi yang **lebih dalam**, putaran boleh dilanjutkan - dengan syarat setiap putaran mencatat secara eksplisit *apa yang berubah dari metodologi sebelumnya*. Rantai wajib dihentikan dan dieskalasi ke PM bila dua putaran berturut-turut memakai metodologi yang sama.

---

## II.4 Temuan PM: Kenapa Bug Ini Lolos ke User (pola berulang)

Ini bagian paling berharga dari review saya, dan saya menuliskannya sebagai koreksi atas gerbang DoD saya sendiri di Bagian I.

**Bug ini lolos SHIP pertama karena dua gerbang memverifikasi fitur cetak lewat *proksi*, bukan lewat *artefaknya*.** Code Review Ronde 4 §9 **menalar** bahwa kedua dokumen akan tercetak bersama dan menyimpulkan itu sesuai niat kontrak. QA Bagian 3 memeriksa `emulateMedia` + visibilitas elemen. Keduanya masuk akal - **dan keduanya salah**, karena tidak ada yang benar-benar menghasilkan file PDF lalu melihat isinya. Elemennya memang `visible`; yang tidak terlihat adalah keduanya bertumpuk di koordinat yang sama.

Ini **pola yang sama persis** dengan bug BLOCKER di babak 1 (`WastePicker` reset sendiri): lolos build, lolos type-check, lolos Code Review - karena semuanya **membaca kode**, bukan **menjalankan produknya**. Dua kali dalam satu task, kelas kegagalan yang sama.

**Aturan tetap yang saya tetapkan mulai sekarang:**

> Fitur yang menghasilkan **artefak** (PDF, export, file, cetakan) wajib diverifikasi dengan **membuat artefak itu lalu memeriksa isinya** - bukan dengan memeriksa DOM/CSS yang dianggap akan menghasilkannya. Dan fitur interaktif wajib diverifikasi lewat **interaksi sungguhan**, bukan pembacaan kode.

QA sudah menerapkan ini di Bagian 4 (membuat PDF asli, membacanya balik dengan `pdf-parse`) - itulah sebabnya kali ini saya percaya hasilnya.

---

## II.5 Keputusan atas Temuan QA: Tombol "Unduh PDF" Tidak Muncul Pra-`WEIGHED`

QA meminta PM memutuskan apakah ini perlu dikonfirmasi ke user. Saya verifikasi sendiri faktanya benar (`@if (blok().length)` di `b3-dokumen.html:6`).

**Keputusan: KONFIRMASI KE USER. Non-blocking, tidak menahan SHIP.**

Alasan saya tidak menutupnya sepihak sebagai "by design":
- Argumen "by design" memang kuat: dokumen resmi tanpa data timbang adalah formulir kosong, dan Logbook/Neraca secara definisi lahir dari transaksi timbang.
- **Tapi** user sendiri sudah menyatakan nyaman dengan halaman berisi baris kosong - kata-katanya sendiri di Amandemen 3: *"walaupun kosong saat dijadikan pdf tidak apa apa"*. Konteksnya memang soal padding 20 baris, bukan dokumen pra-timbang - namun itu sinyal cukup kuat bahwa user mungkin memang ingin bisa mencetak formulir kosong (mis. untuk dibawa ke lapangan saat timbang manual).
- Biaya bertanya nyaris nol; biaya menebak salah adalah putaran perbaikan lain.

Saya tidak menebak niat user. Pertanyaannya diteruskan apa adanya.

---

## II.6 Cek Definition of Done (Amandemen 3)

| # | Item | Status | Bukti |
|---|---|---|---|
| 1 | Bug yang dilaporkan user teratasi | **LULUS** | PDF sungguhan 2 halaman, Logbook + Neraca keduanya ada (II.2) |
| 2 | Code Review APPROVED, temuan tinggi/menengah ditutup | **LULUS** | Ronde 8 APPROVED. Nol Blocker/Major terbuka. 2 Minor carry-over murni kosmetik (kolom CATATAN Neraca tanpa proteksi terstruktur; `doc-row-empty` tanpa style) - di-waive dengan alasan tertulis |
| 3 | **AC-32 audit scope PASS mutlak** | **LULUS** | Diverifikasi sendiri: seluruh blacklist tetap 12-13 Agustus. Hanya `b3-dokumen.css` berubah permanen di Ronde 8. Seed file terbukti pristine lewat md5 |
| 4 | Build sukses, nol dependency baru | **LULUS** | Dijalankan sendiri; hash identik dengan yang direview; `package.json` tidak tersentuh |
| 5 | Nol regresi pada fitur yang sudah SHIP | **LULUS** | 36/36 unit test hijau; QA verifikasi ulang `WastePicker` (bug babak 1) dan guard editable/readonly lintas role - keduanya tidak regresi; nol `console.error` sepanjang sesi |
| 6 | Verifikasi lewat artefak nyata, bukan proksi | **LULUS** | PDF asli dibuat & dibaca balik (`pdf-parse` di QA, `pypdf` + render zoom `pymupdf` di Code Review) |

**Gerbang DoD Amandemen 3: LULUS.**

---

## II.7 Item Terbuka - Diperbarui

Item dari Bagian I yang **masih berlaku**: no. 2 (Neraca per-pengajuan, belum periodik), 3 (data hilang saat refresh), 4 ("Unduh PDF" membuka dialog cetak browser), 6 (`app.spec.ts` pra-ada), 7 (nama PIC), 8 (status `WEIGHED`), 9 (bukan git repo - **urgensinya naik lagi**, kini ~13 file kerja melewati 8 ronde review tanpa jaring pengaman versi).

Item no. 5 (`text-align:center`) tetap terbuka sebagai Minor kosmetik.

**Diperbarui / baru:**

| # | Item | Keparahan | Catatan |
|---|---|---|---|
| 1 | **Logo asli Otsuka - masih ditunggu** | Rendah, **butuh tindakan user** | Sudah ada jawaban tegas atas pertanyaan user "taruh di mana": **user tidak perlu menaruh file apa pun secara manual**. Cukup beri tahu path file di komputer user, atau kirim ulang sebagai **lampiran file** (bukan gambar inline di chat). Orchestrator akan membacanya dan meng-encode base64 langsung ke dalam kode - **tidak** butuh folder `assets/` maupun ubah `angular.json`, jadi tetap 100% patuh rule scope. Sampai file diterima, placeholder teks tetap dipakai |
| 10 | **Tombol "Unduh PDF" tidak tersedia sebelum status `WEIGHED`** | Rendah - **butuh keputusan user** | Lihat II.5. Perlu jawaban: apakah user ingin bisa mencetak formulir kosong/pratinjau sebelum ditimbang? |
| 11 | **Kapasitas 20 baris/halaman adalah asumsi** | Rendah - **layak dikonfirmasi user** | Diambil dari sample PDF terpadat (20 baris "Jerigen Bekas"). Kalau kapasitas kertas sebenarnya berbeda, tinggal ubah satu angka default di `halamanLogbook(blok, kapasitas = 20)` - nol perubahan struktural |
| 12 | **Nama/teks yang sangat panjang dipotong dengan elipsis di cetakan** | Rendah - konsekuensi desain | Data tidak hilang dari sistem, hanya representasi cetaknya dipotong agar tidak merusak tata letak. Bila di lapangan nama vendor panjang harus tampil utuh di dokumen resmi, itu butuh keputusan lain (mis. font lebih kecil atau kolom lebih lebar) - bukan bug |

---

## II.8 Konfirmasi Track Proses

Masih **valid dan konsisten sepanjang 8 ronde**. Amandemen 3 murni CSS/template/fungsi murni di frontend: nol backend, nol jaringan, nol storage, nol dependency baru, nol perubahan pada file bersama. Skip Backend/Security/DevOps tetap benar. Satu-satunya file yang berubah permanen di ronde terakhir adalah `b3-dokumen.css`.

---

## II.9 Keputusan Akhir Amandemen 3

# SHIP

Alasan utama:
1. **Bug yang dilaporkan user terbukti teratasi lewat artefak nyata** - PDF sungguhan dibuat dan isinya dibaca balik, bukan disimpulkan dari kode. 2 halaman, Logbook dan Neraca keduanya ada, nol halaman kosong.
2. **Perbaikannya terbukti benar secara mekanisme, bukan kebetulan lolos** - `getComputedStyle()` pada 40/40 sel di kondisi cetak sungguhan, pada dua skenario yang sebelumnya terbukti rusak.
3. **Nol regresi** - 36/36 unit test hijau, `WastePicker` dan guard role tetap aman setelah 4 ronde utak-atik CSS.
4. **Rule keras user tetap dipatuhi 100%** - saya audit sendiri; seluruh file menu lain tidak tersentuh sepanjang seluruh task, dan integritas file seed saya buktikan lewat md5, bukan sekadar mtime.
5. Kode yang saya verifikasi **terbukti identik** dengan yang di-APPROVE dan di-QA (hash bundle `main-E3KWNGR7.js` sama persis di tiga sesi independen).

Tiga hal menunggu keputusan/tindakan user (tidak menahan SHIP): **file logo**, **tombol PDF pra-timbang**, dan **kapasitas 20 baris**.

Ditandatangani: **azkha-pm**, 2026-08-16.
