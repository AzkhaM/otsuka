# Format Acuan — Logbook & Neraca Limbah B3

Ditranskrip langsung dari `Logbook Q2 2025.pdf` yang dikirim user (27 halaman, dua jenis dokumen berselang-seling). Dokumen ASLI PDF-nya tidak tersimpan di filesystem manapun — ini adalah transkripsi lengkap yang jadi acuan tunggal. **Jangan mendesain ulang field/kolom** — replikasi persis, kecuali stempel "ASLI"/"COPY" yang harus dihilangkan (instruksi eksplisit user).

---

## Dokumen A — Neraca Limbah B3 (FR/K3L/006/02/1)

Muncul di halaman 1, 4, 14, 23 sumber PDF — satu neraca per periode (kuartal).

### Header
- Logo Otsuka + "PT. Amerta Indah Otsuka"
- Judul: **"NERACA LIMBAH BAHAN BERACUN DAN BERBAHAYA"**
- Kotak info kanan atas: Halaman (1 dari 1) · No. Dokumen (**FR/K3L/006/02/1**) · Tanggal (13 Januari 2014 — tanggal terbit form, statis) · No. Revisi (00) · Mengantikan Nomor (-) · Tanggal (-)
- `BIDANG USAHA : Air Minum Dalam Kemasan` (statis)
- `PERIODE WAKTU : [rentang bulan] - [bulan] [tahun]` — mis. "Juli - September 2025", "Oktober - Desember 2025"

### Bagian I — Jenis Awal Limbah
Tabel kolom: **No | Jenis Awal Limbah | Jumlah | Satuan | CATATAN (Nomor Manifest)**
- Satu baris per jenis limbah unik yang dihasilkan pada periode itu, Jumlah dalam **Ton** (bukan kg — beda satuan dari logbook!), Catatan = nomor manifest.
- Baris **TOTAL** (font besar) = jumlah semua baris, satuan Ton. Ini nilai **A**.

### Bagian II — Perlakuan
Tabel kolom kiri: **PERLAKUAN | JUMLAH | SATUAN**; kolom kanan (di baris yang sama): **JENIS LIMBAH YANG DIKELOLA | PERIZINAN LIMBAH B3 DARI KLH (ADA / TIDAK ADA / KADALUARSA)**

7 kategori Perlakuan berurutan, tiap kategori bisa punya beberapa sub-baris (satu per jenis limbah yang masuk kategori itu):
1. DISIMPAN
2. DIMANFAATKAN
3. DIOLAH
4. DITIMBUN
5. **DISERAHKAN PIHAK KE-3**
6. EKSPORT
7. PERLAKUAN LAINNYA — sub-label "(KEMBALI KE SUPLIER)"

Di semua sample yang dikirim user, isi nyata **selalu 100% masuk ke kategori 5 "DISERAHKAN PIHAK KE-3"** — kategori lain selalu 0/kosong. Kolom kanan tiap sub-baris berisi nama jenis limbah + centang (√) di kolom "ADA" perizinan KLH (statis, tidak pernah "Tidak Ada"/"Kadaluarsa" pada sample).

Baris **TOTAL (B)** (font besar) = jumlah seluruh Perlakuan, harus sama persis dengan TOTAL (A) di semua sample (kinerja 100%).

### Baris penutup
- **RESIDU (C)** — Ton
- **JUMLAH LIMBAH YANG BELUM TERKELOLA (D)** — Ton
- **TOTAL JUMLAH LIMBAH (C+D)** — Ton
- **KINERJA PENGELOLAAN LB3 SELAMA PERIODE SKALA WAKTU PENAATAN** — % = (B÷A)×100. Sample menunjukkan 100,00% di 3 dari 4 halaman; 1 halaman (hal.1 sumber) menampilkan `#REF!` — itu bug Excel di dokumen asli (formula rusak), **BUKAN pola yang perlu ditiru** — sistem kita harus selalu menghitung benar, bukan mewarisi bug ini.

### Footer
- Kiri: "Dilaporkan Oleh :" + area tanda tangan (kosongkan/placeholder, prototype tidak perlu capture tanda tangan sungguhan) + nama **"Indra Setiyanto"** + jabatan "EHS Supervisor"
- Kanan: "Sukabumi, [tanggal laporan]" + "Mengetahui :" + area tanda tangan + nama **"Mugiyono"** + jabatan "EHS Section Head"
- **Tembusan** (list statis, selalu sama):
  1. BLH Kabupaten Sukabumi
  2. BPLHD Provinsi Jawa Barat
  3. KLHK Asdep IV bidang Pengelolaan Limbah B3 & Pemulihan Lahan Terkontaminasi Limbah B3
  4. KLHK Asdep Urusan Pengendalian Pencemaran Agroindustri
  5. Arsip EHS PT Amerta Indah Otsuka

---

## Dokumen B — Lembar Data Penyimpanan Limbah B3 (FR/K3L/006/01) = "Logbook"

Muncul di halaman 2-3, 5-13, 15-22, 24-27 sumber PDF. **Satu blok tabel terpisah per Jenis Limbah B3** (mis. blok sendiri untuk "Jerigen Bekas", blok sendiri untuk "Oli Bekas", dst) — bukan satu tabel raksasa campur semua jenis. Tiap blok mengulang header/footer lengkap seakan halaman sendiri.

### Header (per blok)
- Logo Otsuka + "PT. Amerta Indah Otsuka" · "Section K3L" · "Departemen Engineering"
- Judul: **"LEMBAR DATA PENYIMPANAN LIMBAH BAHAN BERACUN DAN BERBAHAYA"**
- Kotak info kanan atas: Halaman (1 dari 1) · No. Dokumen (**FR/K3L/006/01**) · Tanggal (13 Juni 2012) · No. Revisi (02) · Mengantikan No. (FR/K3L/006/01) · Tanggal (07 Mei 2012)
- `Area :` — kosong di semua sample (field ada tapi tidak diisi)
- `Karakteristik Limbah :` — selalu **"Beracun"** di semua sample

### Tabel (13 kolom, 3 grup header)
**Grup "MASUKNYA LIMBAH B3 KE TEMPAT PENYIMPANAN"** (kolom 3-7, kolom 1-2 di luar grup ini):
1. No.
2. Jenis Limbah B3 Masuk *(sama untuk semua baris dalam satu blok — nama blok)*
3. Tanggal Masuk Limbah B3
4. Sumber Limbah B3 *(kode line: OC3/GBL/ENG/CAN-PET/Sachet/dst)*
5. Jumlah Limbah B3 Masuk (kg)
6. Maksimal Penyimpanan s/d Tanggal *(header cetak statis "(t=0 + 90 hr)" — teks ini TIDAK berubah meski rumus asli sistem kita 185/365 hari, teks header cuma boilerplate form, replikasi persis apa adanya)*
7. Petugas *(selalu "Indra Setiyanto" di sample — di sistem kita: nama PIC aktif, "Pak Ruli")*

**Grup "KELUARNYA LIMBAH B3 DARI TEMPAT PENYIMPANAN"** (kolom 8-11):
8. Tanggal Keluar Limbah
9. Jumlah Limbah B3 (kg)
10. Tujuan Penyerahan *(selalu "PT. PLIB" di sample)*
11. Bukti Nomor Dokumen *(nomor manifest)*

**Grup "SISA"** (kolom 12-13):
12. Sisa LB3 Yang Ada di Tempat Penyimpanan (kg)
13. Petugas

**Pola penting dari data nyata:** hampir semua baris sample punya Tanggal Keluar = hari yang sama/berdekatan dengan Tanggal Masuk, dan **Sisa selalu 0**. Ini konsisten dengan asumsi yang SUDAH dipakai sistem kita (Tahap 4: timbang + penyerahan jadi satu aksi sekaligus) — jangan diubah, cukup dilanjutkan.

### Footer (per blok)
- Kiri: "Diperiksa oleh" + area tanda tangan (placeholder) + "(......) Tgl:"
- Kanan: "Disetujui oleh" + area tanda tangan (placeholder) + "(......) Tgl:"
- Tidak ada tembusan di dokumen ini (beda dari Neraca).

---

## Keputusan implementasi yang WAJIB diikuti (sudah diputuskan orchestrator, jangan didesain ulang)

1. **Hilangkan stempel "ASLI" dan "COPY [nomor]"** — satu-satunya elemen visual yang TIDAK direplikasi, sesuai instruksi eksplisit user. Semua elemen lain (termasuk teks header statis "(t=0 + 90 hr)", nama "Indra Setiyanto"/"Mugiyono" sebagai placeholder default, daftar Tembusan) direplikasi persis.
2. **Model satu-event (timbang=penyerahan sekaligus) yang sudah dibangun di Tahap 4 TETAP DIPAKAI** — konsekuensinya: Sisa logbook SELALU 0, Perlakuan Neraca SELALU 100% masuk "Diserahkan Pihak Ke-3", Residu(C)=0, Belum Terkelola(D)=0, Kinerja SELALU 100%. Ini cocok dengan pola di seluruh data sample yang dikirim user.
3. **Neraca di prototipe ini = agregat kumulatif berjalan** (bukan literal per-kuartal kalender) — jumlahkan seluruh transaksi logbook yang ada sejauh ini jadi satu Neraca yang terus update. Simplifikasi disengaja untuk prototipe; PERIODE WAKTU boleh ditulis dinamis (mis. rentang tanggal transaksi pertama-terakhir) atau label generik "Periode Berjalan".
4. **Alur baru di Tahap 4 (PIC Timbang & Validasi):** selain form input berat/tujuan/manifest yang SUDAH ADA, tambahkan **preview live** di bawah form yang menampilkan baris-baris persis seperti yang akan muncul di Bagian I & Bagian II Neraca (No/Jenis/Jumlah/Catatan, dan baris Perlakuan "Diserahkan Pihak Ke-3") untuk item-item di pengajuan itu — **preview ini editable**, PIC bisa koreksi nilai sebelum klik submit final (mis. kalau user salah pilih jenis/nilai).
5. **Setelah PIC klik "Validasi & Buat Logbook":** (a) reducer tetap seperti sekarang — status jadi `WEIGHED`; (b) item-item yang divalidasi ditambahkan sebagai baris baru ke Logbook kumulatif (dikelompokkan per Jenis Limbah) dan ke Neraca kumulatif; (c) tampilan preview di layar audit PIC KOSONG KEMBALI (PIC kembali ke daftar/pilih pengajuan lain) — TAPI data yang baru ditambahkan ke Logbook/Neraca **permanen tersimpan** di state aplikasi (in-memory, sesuai prototipe) dan tetap terlihat penuh di tab Logbook & tab Neraca terpisah.
6. **Unduh PDF:** pakai `window.print()` browser native + CSS `@media print` yang menyembunyikan chrome aplikasi (sidebar/topbar/tabs/tombol) dan hanya menampilkan dokumen terformat. **JANGAN tambah dependency npm baru** (jsPDF/pdfmake/dll) — ini prototipe, browser modern (Chrome/Edge) sudah punya "Simpan sebagai PDF" bawaan di dialog print. Ini keputusan sadar orchestrator (ponytail: native platform feature dulu), user perlu tahu ini artinya klik "Unduh PDF" akan membuka dialog print browser, bukan file langsung ke-download otomatis — kalau nanti masuk project sebenarnya baru pertimbangkan PDF generation sungguhan di backend.

---

## AMANDEMEN 2 (2026-08-14, putaran feedback visual dari user)

User mengirim 3 gambar: (1) logo asli PT Amerta Indah Otsuka, (2) screenshot header hasil render aplikasi kita (belum ada garis tabel, pakai logo placeholder), (3) screenshot header dari file Excel/PDF asli (garis tabel jelas: sel Logo+Perusahaan | sel Judul | sel Info kotak bergaris, dan baris Area/Karakteristik Limbah di bawahnya). Feedback berikut MENGGANTIKAN bagian terkait di atas.

1. **Header dokumen wajib pakai border tabel nyata**, bukan flex tanpa garis: 3 sel bersebelahan (Logo+Nama Perusahaan | Judul Dokumen | Info kotak 6-baris Halaman/No.Dokumen/Tanggal/No.Revisi/Menggantikan No./Tanggal), semua sel punya garis pembatas terlihat, persis pola tabel Excel asli. Untuk Logbook, di bawah header ada baris `Area :` dan `Karakteristik Limbah :` juga dengan garis, sebelum tabel data utama.
2. **Logo asli** — user mengirim file logo tapi terkirim sebagai gambar inline di chat, ORCHESTRATOR TIDAK PUNYA path file sungguhan ke situ (belum bisa diproses jadi asset). **Untuk putaran ini pakai placeholder teks/circle seperti yang sudah ada** (konsisten keputusan Architect sebelumnya: "logo tidak direplikasi, tak ada aset") - orchestrator akan follow-up terpisah begitu file logo diterima.
3. **Isi sel tabel di-tengahkan** (`text-align:center`, kolom angka/tanggal terutama) supaya sama seperti tampilan PDF asli.
4. **Tahap 1 (form pengajuan User) kurang field**: user SEHARUSNYA JUGA bisa mengisi **perkiraan berat (kg) per item** saat mengajukan (sebelumnya di spec: berat cuma diisi PIC). Field ini OPSIONAL di Tahap 1 (boleh kosong/0), ditaruh di `b3-waste.html` SETELAH `<app-waste-picker>` (bukan di dalam `waste-picker.ts/html` - file itu tetap DILARANG disentuh) - render tabel kecil daftar item terpilih (dari `formPilihan.items`, sudah tersedia via output `pilihanChange`) dengan satu kolom input angka "Perkiraan Berat (kg)" per baris. Nilai ini disimpan ke `ItemLimbah.beratKg` saat submit (field yang sudah ada, sebelumnya selalu `null` sampai PIC mengisi - sekarang boleh terisi dari awal sebagai perkiraan).
5. **Tahap 4 (PIC Timbang & Validasi) jadi "koreksi", bukan isi dari kosong**: form berat per item PIC WAJIB pre-fill dari `item.beratKg` (perkiraan user, kalau ada) bukan mulai dari 0/kosong - PIC tinggal mengoreksi angka yang salah, bukan mengetik ulang semua dari nol. Validasi "berat > 0" di submit final tetap berlaku (kalau user tidak isi apa-apa, PIC tetap wajib isi sebelum submit).
6. **Field yang berlaku untuk SELURUH item dalam satu pengajuan** (Tanggal Timbang/Buang, Tujuan Penyerahan, No. Manifest - field ini SUDAH single/shared di model `IsiTimbang` yang ada, tidak perlu ubah data model) **harus ditaruh visual di PALING ATAS panel Timbang & Validasi**, sebelum tabel per-item, jelas terpisah sebagai "berlaku untuk semua item di pengajuan ini" - bukan diulang per baris.
7. **HAPUS tab navigasi "Logbook" dan "Neraca" dari tab bar** (`tabAktif` type buang dua value ini, tombol tab dihapus). **Gabungkan tampilan dokumen ke dalam detail pengajuan** (`@if (terpilih(); as p)` di `b3-waste.html`, yang sekarang render tabel item polos) - GANTI dengan render `<app-b3-dokumen>` yang di-scope HANYA ke pengajuan itu (`[daftarPengajuan]="[p]"`, bukan seluruh `pengajuan()`) sehingga Logbook & Neraca yang tampil adalah proyeksi dokumen resmi UNTUK PENGAJUAN INI SAJA - fungsi murni `bangunLogbook()`/`kelompokkanLogbook()`/`hitungNeraca()` di `b3-waste-logbook.ts` **TIDAK PERLU DIUBAH** (sudah generik terima array pengajuan, tinggal dipanggil dengan array 1 elemen). Tombol "Unduh PDF" pindah ke sini juga (unduh dokumen pengajuan ini saja).
8. **Editability menyatu dengan status**: saat pengajuan sedang diaudit PIC (status APPROVED, role aktif PIC, sebelum submit timbang) - tabel dalam `<app-b3-dokumen>` menampilkan INPUT editable per sel berat/jenis (bukan panel form terpisah seperti sebelumnya - satu tampilan, dua mode: readonly vs editable, tergantung status+role). Setelah `WEIGHED` atau untuk role lain, sel yang sama tampil sebagai teks biasa (readonly). Ini konsekuensi dari instruksi user "pastikan PIC bisa edit setiap tabelnya" + "sudah satu paket" (tidak ada lagi 2 tampilan terpisah untuk hal yang sama).
9. Neraca kumulatif lintas-semua-pengajuan (yang sebelumnya jadi tab terpisah) **TIDAK dibangun ulang jadi tampilan baru di putaran ini** - fungsi hitungnya tetap generik dan bisa dipakai lagi kalau user minta rekap periodik nanti, cukup dicatat sebagai kemungkinan masa depan, bukan dikerjakan sekarang.

---

## AMANDEMEN 3 (2026-08-15, setelah SHIP - bug print + penyederhanaan Logbook)

Ditemukan setelah DoD/SHIP: bug nyata di PDF export + permintaan penyederhanaan struktur Logbook. Ini PERBAIKAN/REVISI, bukan fitur baru.

### 1. BUG: "Unduh PDF" cuma mencetak Neraca, Logbook hilang

**Root cause (sudah didiagnosis orchestrator, baca `b3-dokumen.css` baris 84-99):**
```css
body.b3-printing .b3-doc {
  position: absolute; left: 0; top: 0; width: 100%; ...
}
```
Aturan ini berlaku untuk SETIAP elemen `.b3-doc` di halaman. Karena Logbook & Neraca sekarang dirender BERDAMPINGAN untuk satu pengajuan (Amandemen 2 poin 7-8), ada DUA elemen `.b3-doc` sekaligus di DOM saat print - keduanya sama-sama kena `position:absolute; top:0; left:0`, jadi **keduanya bertumpuk PERSIS di posisi yang sama**. Yang dirender belakangan di DOM (Neraca, karena `<app-b3-dokumen mode="neraca">` dipanggil setelah `mode="logbook"` di `b3-waste.html`) menutupi yang duluan. Hasilnya: yang ke-print/ke-PDF cuma Neraca.

**Fix yang benar:** JANGAN beri `position:absolute` ke setiap `.b3-doc` individual. Sebagai gantinya, bungkus SEMUA blok cetak (Logbook + Neraca, dan nanti multi-halaman Logbook - lihat poin 2) dalam SATU wrapper (mis. `.b3-print-root`) di `b3-waste.html` yang membungkus kedua pemanggilan `<app-b3-dokumen>`. Wrapper INI SAJA yang dapat `position:absolute; top:0; left:0; width:100%` (mengeluarkan konten dari alur layout elemen tersembunyi lain). Di dalam wrapper, tiap `.b3-doc` tetap di ALUR NORMAL (statis, bertumpuk vertikal seperti biasa, bukan absolute) supaya berurutan alih-alih bertindihan - `break-before: page` yang sudah ada dipakai untuk memberi jeda halaman antar blok (Logbook lalu Neraca jadi 2 halaman print terpisah, bukan bertumpuk).

### 2. Logbook disederhanakan jadi SATU tabel gabungan (bukan per-kode terpisah)

**Sebelumnya** (Bagian 14-26 kontrak Architect): `kelompokkanLogbook()` memecah entries jadi banyak `BlokLogbook` (satu per `kode`), tiap blok dirender sebagai dokumen terpisah sendiri (header/footer masing-masing) - meniru persis pola PDF asli (satu sheet Excel per jenis limbah).

**Sekarang (permintaan user, "untuk sekarang"):** gabungkan SEMUA item dalam satu pengajuan jadi **SATU tabel Logbook saja** (satu header, satu footer) - TAPI urutan barisnya tetap rapi terkelompok per jenis/kode (baris kode yang sama tetap berurutan bersebelahan, bukan acak). `kelompokkanLogbook()` **TIDAK PERLU diubah** (tetap dipakai internal untuk urutan pengelompokan) - cukup tambah fungsi baru yang MENGGABUNGKAN `BlokLogbook[]` jadi satu daftar baris flat terurut, dipakai untuk render tabel tunggal, bukan lagi `@for` per-blok yang masing-masing jadi dokumen sendiri.

### 3. Logbook harus tampil PENUH SATU KERTAS (baris dipadatkan sesuai kapasitas contoh asli), dan otomatis jadi 2 halaman kalau item melebihi kapasitas

Dari contoh PDF asli yang dikirim user, kapasitas baris per lembar Logbook **maksimal 20 baris** (lihat sample terpadat: 20 baris "Jerigen Bekas"). Pakai **20 sebagai kapasitas tetap per halaman** (asumsi, bisa dikoreksi user kalau salah).

- Kalau jumlah baris data < 20: **padatkan dengan baris kosong** (kosong/blank, boleh cuma nomor urut terisi atau benar-benar kosong semua) sampai genap 20 baris, supaya saat di-print/PDF terlihat penuh satu halaman kertas seperti form asli - "walaupun kosong saat dijadikan pdf tidak apa apa" (kata user sendiri, ini bukan bug, ini permintaan).
- Kalau jumlah baris data > 20: **otomatis pecah jadi 2 (atau lebih) blok Logbook terpisah** (halaman ke-2 dst juga dipadatkan sampai 20 kalau tidak genap), masing-masing dengan header/footer sendiri (memakai mekanisme `.doc-logbook + .doc-logbook { break-before: page }` yang sudah ada), tercetak berurutan sebagai beberapa halaman.
- Buat fungsi murni baru di `b3-waste-logbook.ts`, mis. `halamanLogbook(blok: BlokLogbook[], kapasitas = 20): LogbookEntry[][]` - flatten seluruh entries dari `blok` (urutan sudah benar dari `kelompokkanLogbook`) jadi satu array, lalu `chunk` per `kapasitas`. Template merender satu `.doc-logbook` per elemen array hasil (hasil chunk terakhir dipadatkan baris kosong di template, BUKAN di fungsi murni - fungsi murni cukup mengembalikan data asli, padding baris kosong itu urusan render/template).

### 4. Logo: BELUM ADA file asli

Orchestrator sudah minta file logo ke user, user balik bertanya taruh di mana. **Jawaban:** user TIDAK perlu menaruh file apa pun secara manual ke folder proyek - cukup beri tahu orchestrator lokasi file di komputer user (path lokal, atau kirim ulang sebagai file attachment, bukan gambar inline di chat), lalu orchestrator akan membaca file itu langsung dan meng-encode base64 ke dalam kode (`b3-dokumen.ts`/`.css`) - TIDAK PERNAH butuh folder `assets/` terpisah atau ubah `angular.json` (tetap 100% di dalam `pages/b3-waste/`, konsisten rule scope). Belum ada aksi untuk putaran ini - placeholder teks tetap dipakai sampai file diterima.

---

## AMANDEMEN 4 (2026-08-18) - logo terpasang + polish visual + jaminan field edit tidak pernah tercetak

### 1. Logo SUDAH ADA, sudah di-encode

User menaruh sendiri file asli di `frontend/src/app/pages/b3-waste/assets/logo-otsuka-fc.webp` (249x127px, latar transparan, dikonfirmasi visual oleh orchestrator - logo Otsuka asli: bentuk tetes air biru + titik merah + wordmark "Otsuka" + teks "PT Amerta Indah Otsuka"). Orchestrator SUDAH meng-encode base64 file ini (BUKAN tugas Frontend lagi) ke:

`frontend/src/app/pages/b3-waste/logo-otsuka.ts` - berisi satu named export `LOGO_OTSUKA_DATA_URI` (string data URI `data:image/webp;base64,...`, ~29,5KB). File `assets/logo-otsuka-fc.webp` sendiri BOLEH TETAP ADA di folder (tidak perlu dihapus, dokumentasi sumber) tapi TIDAK dipakai langsung oleh Angular - satu-satunya jalur pemakaian adalah import `LOGO_OTSUKA_DATA_URI` dari `logo-otsuka.ts` lalu dipasang ke `<img [src]="LOGO_OTSUKA_DATA_URI">` di `b3-dokumen.html` (ganti placeholder teks di sel brand header yang sekarang ada). Ini menghindari ketergantungan pada Angular asset-pipeline (`public/`/`angular.json` config) yang di luar scope folder `pages/b3-waste/`.

### 2. Polish visual umum ("lebih rapih")

Permintaan user cukup umum - gunakan penilaian desain wajar: rapikan spacing/alignment form edit Tahap 4 (field bersama di atas, tabel di bawah) dan header tabel dokumen (Logbook & Neraca) supaya terlihat rapi & konsisten kalau di-export ke PDF - TIDAK ada kontrak presisi baru untuk ini, ini judgment call Frontend/Architect seperti biasa, boleh sertakan rasional singkat di laporan kalau mengubah sesuatu yang cukup terlihat bedanya.

### 3. WAJIB: field edit (`<input>`/`<select>`) TIDAK BOLEH tercetak/ter-export - HANYA teks biasa

**Ini requirement fungsional konkret, bukan sekadar polish kosmetik.** Situasi sekarang: `B3Dokumen` punya mode `editable` (dipakai PIC saat mengaudit Tahap 4, sebelum submit final) yang merender sel Jenis/Berat sebagai `<input>`/`<select>` di layar. Tombol "Unduh PDF" TETAP MUNCUL & BISA DIKLIK saat mode editable ini aktif (karena `entriesUntuk(p)` sudah menghasilkan data preview lewat `pratinjauPengajuan()` meski belum submit final) - kalau user klik "Unduh PDF" SAAT PIC masih dalam mode edit, hasil cetak/PDF SEKARANG KEMUNGKINAN BESAR ikut menampilkan kotak input/dropdown form widget (bukan teks polos) karena `window.print()` mencetak DOM apa adanya, dan CSS `visibility`/`display` saja tidak bisa mengganti elemen `<input>` jadi teks `{{value}}` (itu keputusan struktural Angular `@if`, bukan CSS).

**Fix yang wajib**: pastikan render HASIL CETAK/EXPORT selalu dalam mode READONLY (teks polos), TIDAK PERNAH mode editable, TERLEPAS dari status editable di layar saat tombol diklik. Cara paling ponytail: tambah state "sedang mencetak" yang dipaksa `false` untuk keputusan editable HANYA selama proses cetak berlangsung (mis. signal `sedangCetak` yang di-set `true` sesaat sebelum `window.print()` dipanggil dari `cetak()`, dipakai untuk override `editable` jadi `false` di template selama itu, lalu dikembalikan `false`/dilepas setelah `afterprint`) - PASTIKAN Angular benar-benar sudah re-render (DOM sudah berubah jadi teks polos) SEBELUM `window.print()` benar-benar dipanggil (perhatikan timing async render di Angular zoneless - signal write tidak langsung sinkron ke DOM, mungkin perlu `requestAnimationFrame` ganda atau mekanisme tunggu render yang tepat sebelum trigger print, supaya tidak ada race condition yang bikin kotak input masih sempat ke-print).

**Verifikasi WAJIB** (ikuti standar rigor Amandemen 3 - PDF sungguhan + pemeriksaan konten, bukan cuma page-count): trigger "Unduh PDF" PERSIS SAAT status editable aktif (PIC di tengah proses timbang, sebelum klik submit final) - generate PDF sungguhan, screenshot/zoom hasilnya, konfirmasi TIDAK ADA elemen kotak input/dropdown yang terlihat (garis kotak, panah dropdown, dst) - HANYA teks polos seperti kondisi readonly biasa.

