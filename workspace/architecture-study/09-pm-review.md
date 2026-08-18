# 09 - PM REVIEW & GERBANG DoD

| Field | Value |
|---|---|
| Task | AZK-001 - Studi & Dokumentasi Arsitektur Existing |
| Role | Product Manager (Azkha Company) |
| Tanggal | 2026-08-14 |
| Artefak yang direview | `02-architecture.md` (827 baris) terhadap `01-spec.md` |
| Track proses | RINGAN - Documentation Only |
| **PUTUSAN** | **SHIP** |

---

## 1. Cara saya memverifikasi

Saya tidak menerima klaim Architect apa adanya. Semua putusan PASS di bawah didasarkan pada **verifikasi independen** yang saya jalankan sendiri terhadap codebase (read-only), bukan pada pembacaan ulang dokumen. Perintah yang saya jalankan: `find -printf` (timestamp), `cat -n` (isi + nomor baris), `grep -rn` (pencarian referensi), `wc -l` (jumlah baris), `node -p require(...).version` (versi terpasang), `git rev-parse` (cek repo).

Prinsip Azkha: **tidak ada PASS tanpa bukti.**

---

## 2. Status per Acceptance Criteria

| ID | Kriteria | Status | Bukti verifikasi PM |
|---|---|---|---|
| AC1 | Dokumen ada & memuat 10 bagian | **PASS** (dengan substitusi ter-otorisasi) | File ada, 827 baris, 10 bagian bernomor + Lampiran A & B. Bagian 1-8 persis sesuai spec Bagian 6. Bagian 9 & 10 spec (ADR-001 + rekomendasi bertingkat) **diganti** menjadi "Ringkasan Kondisi Sekarang" & "Koreksi & Catatan Verifikasi" atas arahan user - lihat §3. |
| AC2 | Setiap klaim merujuk path nyata, tanpa file fiktif | **PASS** | Sampling 14 path yang dikutip: **14/14 ada**. Lebih jauh, saya cek **nomor barisnya** juga akurat: `server.ts:11,12,15,16,21,22,26,30,40,45,46` cocok persis baris demi baris; `product.ts:5` (`API_URL`), `product.ts:11-13` (`list()`), `product.ts:15-17` (`create()`) semuanya tepat. Tidak ditemukan satu pun file fiktif. |
| AC3 | Versi stack cocok dengan `package.json` | **PASS** | Seluruh kolom "Diminta" cocok 100% dengan `frontend/package.json` & `backend/package.json`. Kolom "Terpasang" saya uji ulang: `@angular/core` **22.1.1**, `express` **5.2.1**, `@prisma/client` **7.9.1**, TypeScript frontend **6.0.3** / backend **7.0.2** - semuanya cocok. |
| AC4 | Matriks status membedakan terhubung-DB / mock / orphan, mencakup seluruh `menu.ts` | **PASS** | `menu.ts` berisi 10 entri, satu (`Master`) punya 3 anak = **12 tujuan navigasi**. Matriks §6 memuat **ke-12-duanya**, tidak ada yang terlewat, plus baris terpisah untuk `ProductList` (orphan) dan redirect `/`. Empat kategori status dipakai dengan tegas. |
| AC5 | Alur data end-to-end konkret min. 1 operasi | **PASS** | Ada **dua** alur (BACA `GET /products` 19 langkah, TULIS `POST /products` 11 langkah), plus alur kontras untuk halaman mock. Menyebut nama fungsi/endpoint nyata dan nomor baris - saya verifikasi rantai `ngOnInit()` → `reload()` → `list()` → `http.get` → `app.get("/products")` → `prisma.product.findMany` → `res.json` benar seluruhnya. |
| AC6 | Ada ADR-001 format Konteks/Opsi/Rekomendasi/Konsekuensi | **WAIVED BY USER DIRECTIVE** | **Bukan kegagalan Architect.** Lihat §3. |
| AC7 | Gap diberi keparahan + dampak | **PASS** | 18 gap (G1-G18), **setiap item punya keparahan eksplisit + blok Fakta + blok Dampak**. Skala keparahan didefinisikan lebih dulu dan dikalibrasi ke konteks (dev lokal). Beberapa item bahkan diberi keparahan bersyarat (mis. G3 "Tinggi, menjadi Kritis saat deploy") - ini lebih baik dari yang diminta spec. |
| AC8 | **Nol perubahan file di `frontend/` & `backend/`** | **PASS** | Diverifikasi independen oleh saya, lihat §4. |
| AC9 | Dapat dipahami user, Bahasa Indonesia, istilah dijelaskan | **PASS** | Seluruhnya Bahasa Indonesia. Executive summary bisa dibaca non-teknis. Istilah teknis dijelaskan saat pertama muncul: *signal* ("wadah nilai reaktif"), *Observable cold*, *non-null assertion* (`!`), `Omit<Product,'id'>`, *orphan*, *driver adapter*. Diagram punya legenda warna. |

**Rekapitulasi: 8 PASS, 1 WAIVED, 0 FAIL.**

---

## 3. Catatan khusus AC6 - waived, bukan failed

Spec asli (Bagian 6 poin 9 & 10, AC6) meminta ADR-001 dan rekomendasi bertingkat. **Setelah spec lulus DoR, user memberi arahan eksplisit** lewat checkpoint:

> "Tidak, laporan as-is saja"
> "yang kamu dapat itu yang dilaporkan ke saya, saya di sini ingin memastikan saja anda tau"

Arahan ini **mempersempit scope** menjadi laporan fakta murni tanpa spekulasi/rekomendasi. Konsekuensinya:

- **AC6 ditandai `WAIVED BY USER DIRECTIVE`.** Arahan user menimpa spec; spec adalah alat, bukan kontrak yang mengikat user terhadap keinginannya sendiri.
- Architect menangani ini dengan benar: alih-alih diam-diam menghapus dua bagian, ia (a) mengganti keduanya dengan bagian faktual bernilai setara, (b) **menandai penyimpangan itu di kepala dokumen** (baris 12-13) dan di §10.5, dan (c) secara eksplisit meminta PM menandainya waived, bukan lalai. Ini perilaku yang tepat - transparan, tidak menyembunyikan delta terhadap spec.
- Saya memverifikasi bahwa bagian pengganti benar-benar **bebas rekomendasi**. §9 dibuka dengan disclaimer eksplisit dan isinya lolos pemeriksaan: tabel kondisi, angka kunci, jarak UI-vs-data. Tidak ada kalimat "sebaiknya"/"disarankan". §9.3 bahkan menutup dengan penegasan bahwa daftar `interface` disebut "sebagai fakta tentang apa yang sudah ada, bukan usulan". **Arahan user dipatuhi dengan disiplin.**

---

## 4. Verifikasi AC8 (nol perubahan kode) - dilakukan ulang oleh PM

Ini gerbang terkeras di task ini (batas dari NG1), jadi saya tidak menumpang pada klaim Architect.

**Temuan yang mengubah metode verifikasi.** Spec mengasumsikan AC8 bisa dicek lewat `git diff`. Ternyata **project ini tidak punya git repository sama sekali**. Saya konfirmasi sendiri: `git rev-parse --is-inside-work-tree` di `otsuka/` menjawab `fatal: not a git repository (or any of the parent directories): .git`. Bukan hanya `otsuka/` - `frontend/` dan `backend/` juga tidak punya `.git`.

**Metode pengganti: perbandingan timestamp modifikasi (mtime).** Studi ini berjalan pada **14 Agustus 2026**. Jadi setiap file yang berubah selama studi pasti bermtime 14 Agustus. Hasil scan saya atas `frontend/src`, `backend/src`, dan `backend/prisma`:

| File terbaru | mtime |
|---|---|
| `frontend/src/app/shared/icon/icon.ts` | 2026-08-13 08:04 |
| `frontend/src/app/layout/layout.ts` | 2026-08-13 08:03 |
| `frontend/src/app/pages/placeholder/placeholder.ts` | 2026-08-12 22:45 |
| `backend/src/server.ts` | 2026-08-12 11:50 |
| `backend/prisma/schema.prisma` | 2026-08-12 11:44 |

**File termuda di seluruh source tree adalah 13 Agustus 08:04. Tidak ada satu pun file bertanggal 14 Agustus.** AC8 **PASS**.

**Penilaian atas metode Architect.** Metode `find -newermt` yang dipakai Architect **masuk akal dan merupakan pengganti terbaik yang tersedia** ketika git tidak ada - mtime berubah pada setiap operasi tulis filesystem, jadi ketiadaan mtime baru adalah bukti kuat tidak ada tulis. Architect juga mendokumentasikan keterbatasan ini secara terbuka di §8 G2 dan §10.3 T1, dan melengkapinya dengan inventaris file yang dibaca (Lampiran A).

*Sisa keterbatasan yang jujur perlu dicatat:* mtime bukan bukti kriptografis - secara teori file bisa diubah lalu mtime-nya dikembalikan. Dalam praktik ini tidak mungkin terjadi secara tidak sengaja, dan tidak ada motif. Saya menerima buktinya sebagai memadai. *Catatan proses:* perintah `-newermt` sendiri tidak tercantum di daftar perintah Lampiran A (hanya `find` generik) - kelengkapan dokumentasi yang bisa lebih rapi, tapi tidak memengaruhi validitas hasil karena saya sudah menjalankannya ulang sendiri.

---

## 5. Verifikasi silang temuan utama

Empat klaim paling konsekuensial saya uji ulang satu per satu:

**5.1 "0 dari 12 tujuan menu terhubung ke database" - TERKONFIRMASI.**
`app.routes.ts` hanya meng-import `Layout`, `Placeholder`, `CompanyReports`, `B3Waste`, `Inspection`. Sembilan route memakai `Placeholder`, tiga memakai komponen EHS yang datanya konstanta modul. Tidak ada `HttpClient` di jalur mana pun yang terhubung ke routing.

**5.2 "Product CRUD orphan" - TERKONFIRMASI, persis seperti dilaporkan.**
`grep -rn "ProductList\|product-list\|ProductService" frontend/src/` mengembalikan **tepat 7 baris, seluruhnya di dalam dua file Product itu sendiri** (6 di `product-list.ts`, 1 di `services/product.ts`). Nol referensi dari `app.routes.ts` atau file lain. Kesimpulan Architect akurat: satu-satunya jalur FE-BE-DB yang lengkap tidak terjangkau dari UI.

**5.3 "Kontrak Product sudah drift" - TERKONFIRMASI.**
`frontend/src/app/models/product.ts` berisi **5 field** (`id`, `name`, `category`, `stock`, `price`). `backend/prisma/schema.prisma` model `Product` berisi **6 field** - `createdAt DateTime @default(now())` tidak ada di sisi frontend. Drift nyata.

**5.4 "`app.spec.ts` usang" - TERKONFIRMASI secara pembacaan, dengan batas yang jujur.**
`app.spec.ts:21` memang berbunyi `expect(compiled.querySelector('h1')?.textContent).toContain('Hello, frontend')`, sementara `app.html` isinya **hanya** `<router-outlet />` (1 baris, tanpa `<h1>`). Secara logika assertion itu tidak mungkin lolos.

**Ini adalah kesimpulan pembacaan source, bukan hasil eksekusi `ng test`** - dan Architect **menyatakan batasan itu secara terbuka** di §8 G11 dan §10.4 poin 1, alih-alih menyajikannya sebagai fakta hasil uji. Saya menilai ini **perilaku yang benar**, bukan kelemahan: menjalankan `ng test` akan menulis ke cache build dan melanggar mandat read-only/AC8. Memilih patuh pada batas mandat lalu menyatakan ketidakpastiannya adalah trade-off yang tepat. Klaim ini tetap saya terima dengan label **"belum diuji eksekusi"**.

---

## 6. Erratum yang saya temukan (non-blocking)

Satu ketidakakuratan kecil, dicatat demi akurasi arsip - **tidak memicu NEED FIX**:

> **`backend/src/server.ts` berisi 46 baris, bukan 47.** Verifikasi: `wc -l` = 46, dan `cat -n` berakhir di baris 46 (file diakhiri newline). Angka "47 baris" muncul di §1, §2.1, §4.3, §8 G8, §9.1, dan §9.4.

**Mengapa tidak NEED FIX.** Saya cek 8 klaim jumlah baris lainnya: `styles.css` 73, `layout.css` 235, `feature-page.css` 302, `layout.html` 71, `company-reports.html` 131, `b3-waste.html` 148, `inspection.html` 167 - **7 dari 8 tepat persis**. Jadi ini penyimpangan terisolasi (kemungkinan off-by-one antar varian `wc`), bukan pola kecerobohan. Selisih satu baris pada file 46 baris **tidak mengubah satu pun kesimpulan** dokumen. Memutar ulang satu role penuh demi satu digit kosmetik adalah over-process - persis yang dilarang prinsip Azkha. **Koreksi tercatat di sini; itu cukup.**

---

## 7. Checklist Definition of Done

| Kriteria DoD (spec §12) | Status | Catatan |
|---|---|---|
| `02-architecture.md` ada & memuat bagian wajib | **LULUS** | 10 bagian; 2 di antaranya disubstitusi atas arahan user (§3) |
| AC2-AC7 terverifikasi PM lewat sampling | **LULUS** | Sampling 14 path + nomor baris + 5 versi paket + 12 entri menu; lihat §2 & §5 |
| AC8: nol perubahan di `frontend/`/`backend/` | **LULUS** | Diverifikasi ulang independen oleh PM (§4) |
| AC9: terbaca jelas, Bahasa Indonesia | **LULUS** | |
| Tidak ada klaim tanpa bukti | **LULUS** | Setiap klaim punya path + nomor baris. Klaim yang **tidak** dieksekusi dinyatakan terbuka sebagai batasan (§10.4), bukan disamarkan sebagai fakta |
| `09-pm-review.md` ditulis dengan status per-AC + keputusan | **LULUS** | Dokumen ini |
| User menyetujui penutupan (Checkpoint 2) | **MENUNGGU** | Satu-satunya item yang tersisa |

**Gerbang eskalasi.** E1/E2/E3 tidak terpicu - saya setuju dengan analisis Architect. Khusus **E2** (`bypassSecurityTrustHtml` di `icon.ts:48`): saya menerima kesimpulan "tidak eksploitabel" karena alasannya sound - `ICONS` adalah objek konstan 18 SVG statis, seluruh pemanggil `name` berasal dari `MENU` atau literal template, dan `ICONS[...] ?? ''` mencegah nama tak dikenal diteruskan apa adanya. Tidak ada input pengguna yang mencapai titik itu. **Security Engineer tidak perlu dipanggil.** Yang saya setujui juga adalah pencatatan *syaratnya* (G15): analisis ini gugur seketika bila kelak ada ikon yang bersumber dari data server.

---

## 8. PUTUSAN: **SHIP**

**Alasan.** Seluruh acceptance criteria yang masih berlaku terpenuhi dengan bukti yang dapat saya reproduksi sendiri. Satu-satunya AC yang tidak dipenuhi (AC6) gugur karena arahan eksplisit user, bukan karena kegagalan eksekusi - dan Architect menanganinya secara transparan alih-alih diam-diam. Dokumen menjawab persis pertanyaan yang diajukan user ("arsitektur apa yang dipakai di sini"), akurat sampai level nomor baris, dan jujur tentang apa yang tidak diverifikasinya.

Kualitas yang saya apresiasi sebagai PM: Architect **membedakan dengan tegas antara yang diverifikasi dan yang disimpulkan** (§10.4 mendaftar apa yang TIDAK dilakukan), dan **mengoreksi baseline spec saya sendiri** di dua tempat (K1: zoneless adalah default framework, bukan konfigurasi eksplisit; K3: ketiadaan error handler tidak berarti server crash, melainkan 500 HTML stack trace). Keduanya benar dan membuat laporan lebih tepat daripada spec yang saya tulis.

**Tidak ada NEED FIX.** Satu erratum kosmetik dicatat di §6 dan tidak memerlukan putaran ulang.

---

## 9. Risiko terbuka yang perlu user ketahui

Ini **bukan** kekurangan laporan - ini kondisi project yang terungkap **oleh** laporan. Saya cantumkan agar tidak hilang saat task ditutup.

| # | Risiko | Keparahan | Mengapa perlu perhatian |
|---|---|---|---|
| R1 | **Tidak ada version control sama sekali** | **Kritis** | Tidak ada riwayat, rollback, atau backup. Satu kesalahan hapus = kerja hilang permanen. Ini risiko terhadap pekerjaan yang **sudah ada**, aktif setiap hari selama belum ditangani. |
| R2 | **0 dari 12 tujuan menu tersambung ke database** | **Kritis** | Tiga halaman EHS terlihat berfungsi penuh saat didemokan padahal seluruh datanya hilang saat refresh. Risiko nyatanya bersifat komunikasi: pemangku kepentingan yang melihat demo bisa menyimpulkan fitur hampir jadi. |
| R3 | Satu-satunya referensi pola FE-BE-DB adalah kode mati | Sedang | Bahwa Product CRUD adalah latihan **tidak tertulis di mana pun dalam codebase** (§10.2 K5) - hanya di kepala pengembang dan di dokumen proses ini. |
| R4 | Klaim `app.spec.ts` usang belum diuji eksekusi | Rendah | Sangat mungkin benar, tapi berstatus "kesimpulan pembacaan". Kepastian hanya butuh satu kali `npm test`. |
| R5 | AC8 terverifikasi via mtime, bukan git | Rendah | Konsekuensi dari R1. Untuk task berikutnya, ketiadaan git berarti tidak ada mekanisme audit perubahan yang kuat. |

---

## 10. Rekomendasi PM (di luar cakupan laporan Architect)

> **Batas yang jelas:** bagian ini adalah **penilaian saya sebagai PM**, bukan bagian dari `02-architecture.md`. Arahan user "laporan as-is saja" mengikat isi laporan Architect - dan itu dipatuhi. Yang di bawah ini terpisah, boleh diabaikan sepenuhnya. Tidak ada satu pun yang dieksekusi tanpa perintah user.

1. **Inisialisasi git sebelum pekerjaan berikutnya apa pun.** Satu perintah, menutup satu-satunya risiko Kritis yang mengancam kerja yang sudah ada. `.gitignore` sudah lengkap di kedua sub-project, jadi tidak ada pekerjaan persiapan. Ini rekomendasi dengan rasio manfaat-terhadap-usaha tertinggi di seluruh daftar.
2. **Jalankan `npm test` sekali** di `frontend/` untuk menutup R4 - mengubah satu kesimpulan menjadi fakta.
3. **Bila fitur EHS akan dilanjutkan, jadikan itu task terpisah dengan spec sendiri.** Laporan ini sudah memetakan bentuk datanya (`HqDocument` 9 field, `B3Report` 10 field, `P3gkUnit` 7 field, `Equipment` 6 field) - modal yang bagus untuk desain schema, tapi keputusan arsitekturnya perlu gerbang DoR-nya sendiri.
4. **Tandai sifat "latihan" Product CRUD di dalam codebase** (satu komentar cukup) agar pengetahuan itu tidak hanya hidup di dokumen proses.

---

## 11. Lokasi artefak

| Artefak | Path |
|---|---|
| Spec + DoR | `d:\000 dokumen\004 carrier\MAGANG HUB\otsuka\workspace\architecture-study\01-spec.md` |
| Laporan arsitektur | `d:\000 dokumen\004 carrier\MAGANG HUB\otsuka\workspace\architecture-study\02-architecture.md` |
| Review PM + DoD (dokumen ini) | `d:\000 dokumen\004 carrier\MAGANG HUB\otsuka\workspace\architecture-study\09-pm-review.md` |

**Status task: SHIP - menunggu persetujuan penutupan user di Checkpoint 2.**
