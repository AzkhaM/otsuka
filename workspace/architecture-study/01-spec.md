# 01 - SPEC: Studi & Dokumentasi Arsitektur Existing

| Field | Value |
|---|---|
| Task slug | `architecture-study` |
| Task ID | AZK-001 (task perdana Azkha Company - Divisi Software Engineer) |
| Tanggal | 2026-08-14 |
| PM | azkha-pm |
| Project | Otsuka Work Permit (PT Amerta Indah Otsuka) |
| Project root | `d:\000 dokumen\004 carrier\MAGANG HUB\otsuka` |
| Tipe task | Studi / dokumentasi (non-coding) |
| Track proses | **RINGAN - Documentation Only** (PM -> Architect -> PM close) |

---

## 1. Ringkasan Permintaan

Permintaan user (verbatim):

> "ok ini perdana untuk azkha company pertama saya ingin anda mempelajari arsitektur apa yang di pakai di sini dan laporkan kepada saya"

Interpretasi: user ingin **memahami arsitektur yang SUDAH ADA** di project ini (frontend + backend + database) dan menerima **laporan tertulis** tentangnya. Ini adalah task *discovery/dokumentasi*, **bukan** permintaan membangun fitur, mengubah kode, atau mendesain ulang sistem.

## 2. Problem & Tujuan

**Problem.** Project Otsuka Work Permit sudah berjalan dengan dua sub-project (`frontend/` Angular dan `backend/` Express+Prisma), tapi belum ada dokumen arsitektur tunggal yang menjelaskan: apa yang dipakai, bagaimana lapisan-lapisannya terhubung, mana yang sudah nyambung end-to-end dan mana yang masih mock. Tanpa ini, keputusan teknis untuk fitur EHS berikutnya (Laporan HQ Jepang, Limbah B3, Inspeksi & Sertifikasi) berisiko diambil tanpa dasar.

**Tujuan.**
1. Menghasilkan satu dokumen arsitektur yang akurat menggambarkan **kondisi SEKARANG (as-is)**.
2. Membuat jelas batas antara "sudah terhubung FE-BE-DB" vs "masih frontend-only dengan mock data".
3. Memberi user pijakan untuk memutuskan langkah berikutnya (apakah fitur EHS butuh backend baru).

## 3. Goals / Non-Goals

**Goals**
- G1. Dokumentasi stack & versi aktual per layer (frontend, backend, ORM/DB, tooling).
- G2. Dokumentasi struktur folder & tanggung jawab tiap bagian.
- G3. Dokumentasi alur data end-to-end pada satu contoh yang benar-benar terhubung (Product CRUD).
- G4. Penandaan eksplisit gap/technical debt yang teramati (bukan penilaian moral, cuma fakta + dampak).
- G5. ADR singkat: arsitektur saat ini vs rekomendasi untuk fitur EHS berikutnya (perlu backend baru atau tidak).

**Non-Goals**
- NG1. **Tidak menulis atau mengubah kode apa pun** di `frontend/` maupun `backend/`.
- NG2. Tidak melakukan refactor, migrasi database, atau perubahan schema Prisma.
- NG3. Tidak mendesain arsitektur target secara lengkap (blueprint fitur EHS penuh) - itu task terpisah nanti.
- NG4. Tidak membuat/menjalankan test, pipeline CI, atau deployment.
- NG5. Tidak melakukan security audit formal (tidak ada perubahan kode/permukaan serangan baru dari task ini).

## 4. Scope

**In scope** - studi & dokumentasi atas:

| Area | Yang didokumentasikan |
|---|---|
| Frontend | `frontend/src/app/` - Angular 22.1, standalone components, signals, zoneless, routing, layout shell, `shared/menu.ts`, pages (`placeholder`, `company-reports`, `b3-waste`, `inspection`), `components/product-list`, `services/product.ts`, `models/product.ts`, strategi styling (plain CSS + CSS custom properties) |
| Backend | `backend/src/server.ts` - Express 5, endpoint CRUD `/products`, middleware (`cors`, `express.json`), runtime `tsx watch` |
| Data | `backend/prisma/schema.prisma` (model `Product` saja), adapter `@prisma/adapter-better-sqlite3`, `dev.db`, folder `prisma/migrations/` |
| Integrasi | Kontrak FE-BE (base URL `http://localhost:3000/products` yang hardcoded di service), status keterhubungan tiap fitur |
| Konteks produk | Menu Otsuka Work Permit (Dashboard, Project, Task Approval, Project Active, Master, Guideline, Audit Log + Laporan HQ Jepang, Limbah B3, Inspeksi & Sertifikasi) dan status implementasinya |

**Out of scope**
- Semua perubahan kode (lihat Non-Goals).
- `node_modules/`, file generated (`backend/src/generated/`), lockfile - cukup disebut, tidak dibedah.
- Infrastruktur/hosting produksi (belum ada).

## 5. Konteks Terverifikasi (baseline fakta untuk Architect)

Fakta berikut sudah diverifikasi langsung dari filesystem dan menjadi baseline; Architect wajib memverifikasi ulang seperlunya, bukan mengarang.

1. **Frontend** - Angular 22.1, standalone components (bukan NgModule), signals-based, **zoneless** (tanpa zone.js), dev server Vite bawaan Angular CLI. Struktur: `layout/` (shell sidebar + topbar), `shared/` (menu config, icon component, CSS bersama), `pages/` (per fitur). Styling plain CSS + CSS custom properties - **tidak ada Tailwind, Angular Material, atau UI library lain**.
2. **Halaman EHS baru** (`company-reports`, `b3-waste`, `inspection`) - **100% frontend-only dengan mock data lokal**, belum ada API/DB di belakangnya.
3. **Product CRUD** - `components/product-list` + `services/product.ts` + `models/product.ts` terhubung ke backend via `HttpClient`, base URL **hardcoded** `http://localhost:3000/products`. Namun sudah **orphan**: routing aktif diarahkan ke layout + menu baru, sehingga komponen ini tidak lagi terjangkau dari UI.
4. **Backend** - Express 5 + Prisma 7 dengan adapter `@prisma/adapter-better-sqlite3` (SQLite lokal, `dev.db`), TypeScript dijalankan via `tsx watch`. Seluruh API ada di **satu file** `src/server.ts`: CRUD `GET/POST/PUT/DELETE /products`, `PrismaClient` dipanggil **langsung di route handler** - belum ada layer controller/service/repository.
5. **Schema Prisma** - hanya 1 model: `Product` (`id`, `name`, `category`, `stock`, `price`, `createdAt`). Migrasi: `prisma/migrations/20260812044529_init/`.
6. **Middleware/keamanan** - hanya `cors()` + `express.json()`. **Tidak ada auth, authorization, validasi input, rate limiting, atau error handler terpusat.**
7. **Testing** - tidak ada test di backend; frontend hanya menyisakan `app.spec.ts` bawaan scaffold.
8. **Sifat Product CRUD** - ini **contoh latihan arsitektur** (untuk mempelajari pola koneksi FE-BE-DB), **bukan fitur bisnis riil** Otsuka.

## 6. Deliverable

| # | Artefak | Owner | Path |
|---|---|---|---|
| D1 | Spec ini | PM | `workspace/architecture-study/01-spec.md` |
| D2 | Laporan arsitektur as-is | Architect | `workspace/architecture-study/02-architecture.md` |
| D3 | Review & penutupan | PM | `workspace/architecture-study/09-pm-review.md` |

### Isi minimum D2 (`02-architecture.md`)

1. **Executive summary** - 5-10 kalimat, bisa dibaca non-teknis.
2. **Diagram/peta sistem** (ASCII/mermaid): Browser -> Angular -> HTTP -> Express -> Prisma -> SQLite.
3. **Stack per layer + versi**, dengan catatan pilihan yang menonjol (zoneless, signals, standalone, Prisma adapter, tsx).
4. **Struktur folder & tanggung jawab** untuk `frontend/` dan `backend/`.
5. **Alur data end-to-end** ditelusuri pada satu operasi nyata (mis. list/create Product): komponen -> service -> HTTP -> route -> Prisma -> tabel, dan balik lagi.
6. **Matriks status fitur**: tiap menu/halaman -> status (Terhubung FE-BE-DB / Frontend-only mock / Placeholder / Orphan).
7. **Pola arsitektur yang terbaca** (apa yang secara implisit sudah jadi konvensi di codebase ini).
8. **Gap & technical debt** dengan dampak + tingkat keparahan (mis. no auth, no validasi, no error handler, base URL hardcoded, monolith 1 file, no test, orphan code).
9. **ADR-001 (singkat)**: arsitektur saat ini vs kebutuhan fitur EHS berikutnya - apakah butuh backend baru, apakah SQLite cukup, apakah perlu layering sebelum menambah domain model. Format: Konteks / Opsi / Rekomendasi / Konsekuensi. **Rekomendasi, bukan eksekusi.**
10. **Rekomendasi bertingkat**: quick win vs perubahan struktural, diberi prioritas.

## 7. Acceptance Criteria (testable)

| ID | Kriteria | Cara verifikasi |
|---|---|---|
| AC1 | `02-architecture.md` ada di folder task dan memuat ke-10 bagian pada Bagian 6 | Cek keberadaan file + heading |
| AC2 | Setiap klaim teknis merujuk path file/konfigurasi nyata di repo (tanpa file fiktif) | Sampling: tiap path yang dikutip harus benar-benar ada |
| AC3 | Versi stack yang disebut cocok dengan `package.json` masing-masing sub-project | Bandingkan dengan `frontend/package.json` & `backend/package.json` |
| AC4 | Ada matriks status fitur yang membedakan "terhubung DB" vs "mock frontend-only" vs "orphan" | Tabel ada dan mencakup seluruh menu di `shared/menu.ts` |
| AC5 | Ada alur data end-to-end yang ditelusuri konkret untuk minimal 1 operasi | Bagian alur data ada dan menyebut nama fungsi/endpoint nyata |
| AC6 | Ada ADR-001 dengan format Konteks/Opsi/Rekomendasi/Konsekuensi | Bagian ADR ada dan lengkap 4 elemen |
| AC7 | Gap/technical debt diberi tingkat keparahan dan dampak, bukan sekadar daftar | Tiap item punya keparahan + dampak |
| AC8 | **Nol perubahan pada file di `frontend/` dan `backend/`** | Diff/inspeksi: tidak ada file di luar `workspace/` yang termodifikasi |
| AC9 | Dokumen bisa dipahami user (bahasa Indonesia, istilah teknis dijelaskan saat pertama muncul) | Review PM di tahap DoD |

## 8. Keputusan Skala Proses (WAJIB DIBACA ORCHESTRATOR)

**Track yang dipilih: RINGAN - Documentation Only.**

```
PM (spec + DoR)  ->  ARCHITECT (02-architecture.md)  ->  PM (09-pm-review.md + DoD)  ->  SELESAI
```

**Role yang DILEWATI dan alasannya:**

| Role | Status | Alasan |
|---|---|---|
| Backend Engineer | **SKIP** | Tidak ada API/endpoint yang dibuat atau diubah |
| Frontend Engineer | **SKIP** | Tidak ada komponen/halaman yang dibuat atau diubah |
| Code Reviewer | **SKIP** | Gerbang ini wajib hanya bila ada kode berubah. Delta kode task ini = 0 (lihat AC8) |
| Security Engineer | **SKIP** | Tidak ada permukaan serangan baru, tidak menyentuh data/akses. Temuan keamanan yang *teramati* (mis. tidak ada auth) tetap dicatat Architect sebagai gap di D2, tapi tidak memicu audit formal |
| DevOps | **SKIP** | Tidak ada build, deploy, pipeline, atau infrastruktur yang disentuh |
| QA | **SKIP** | Tidak ada perilaku runtime baru yang bisa diuji. Verifikasi kualitas dilakukan PM lewat AC1-AC9 terhadap dokumen |

**Justifikasi (prinsip anti over-process).** Gerbang inti Azkha (Code Review, Security, QA) adalah gerbang atas **perubahan kode**. Task ini menghasilkan **teks**, bukan artefak yang dieksekusi mesin; menjalankan 6 role tambahan hanya akan menghasilkan laporan kosong "tidak ada yang ditinjau" dan membuang waktu user. Kualitas tetap dijaga: AC1-AC9 dapat diverifikasi objektif, dan PM tetap menjalankan gerbang DoD di akhir.

**Trigger eskalasi ke jalur lebih berat.** Bila di tengah jalan muncul salah satu kondisi berikut, Architect **berhenti** dan lapor balik ke PM, jangan lanjut sendiri:
- E1. Ternyata dibutuhkan perubahan kode agar dokumentasi akurat (mis. harus menjalankan/memperbaiki sesuatu).
- E2. Ditemukan isu keamanan aktif dan eksploitabel (bukan sekadar "belum ada auth di app lokal dev") - PM akan mempertimbangkan memanggil Security Engineer.
- E3. User mengubah permintaan dari "dokumentasikan" menjadi "perbaiki/bangun".

## 9. Dependensi & Asumsi

**Dependensi**
- D-1. Akses baca ke `frontend/` dan `backend/` - **terpenuhi** (sudah diverifikasi).
- D-2. Tidak ada dependensi ke layanan eksternal, kredensial, atau jaringan.

**Asumsi**
- A-1. Kondisi codebase saat spec ini ditulis (2026-08-14) adalah kondisi yang ingin didokumentasikan.
- A-2. Aplikasi hanya berjalan di lingkungan development lokal; belum ada environment staging/produksi.
- A-3. User adalah pemilik/pengembang project ini, jadi laporan boleh detail teknis, tapi tetap perlu ramah dibaca.
- A-4. Bahasa dokumen: **Bahasa Indonesia**.

## 10. Ruang Lingkup per Role

**PM (fase ini)** - intake, spec, gerbang DoR, checkpoint ke user, lalu gerbang DoD + `09-pm-review.md`.

**Architect** - satu-satunya role eksekusi:
- Baca kode di `frontend/` dan `backend/` **read-only**.
- Verifikasi baseline fakta di Bagian 5; koreksi bila menemukan ketidaksesuaian (dan catat koreksinya secara eksplisit).
- Tulis `02-architecture.md` sesuai Bagian 6.
- **Dilarang** mengubah file apa pun di luar `workspace/architecture-study/`.
- Hentikan pekerjaan dan lapor ke PM bila terkena trigger E1/E2/E3.

## 11. Definition of Ready (DoR) - Gerbang 1

| Kriteria DoR | Status | Catatan |
|---|---|---|
| Tujuan jelas & tidak ambigu | LULUS | Permintaan eksplisit: pelajari arsitektur existing, laporkan |
| Scope & out-of-scope tertulis tegas | LULUS | Bagian 4; batas keras "nol perubahan kode" (NG1, AC8) |
| Acceptance criteria testable | LULUS | AC1-AC9 diverifikasi dengan cara objektif (keberadaan bagian, kecocokan path, kecocokan versi, delta kode = 0) |
| Dependensi teridentifikasi | LULUS | Hanya akses baca filesystem; sudah terpenuhi |
| Deliverable terdefinisi | LULUS | D1/D2/D3 dengan path pasti dan isi minimum 10 bagian |
| Tidak ada ambiguitas besar | LULUS | Baseline fakta sudah diverifikasi dari filesystem, bukan asumsi |
| Skala proses ditetapkan | LULUS | Track Ringan - Documentation Only, plus trigger eskalasi E1-E3 |

**PUTUSAN DoR: LULUS.** Yang akan didokumentasikan sudah jelas, batasnya tegas, hasilnya bisa diverifikasi, dan tidak ada blocker. Boleh lanjut ke Architect setelah persetujuan user (Checkpoint 1).

## 12. Definition of Done (DoD) - Gerbang 2

Task ditutup hanya bila SELURUH poin terpenuhi:

- [ ] `02-architecture.md` ada dan memuat 10 bagian wajib (AC1).
- [ ] AC2-AC7 terverifikasi PM lewat sampling terhadap codebase.
- [ ] AC8 terverifikasi: tidak ada file di `frontend/` atau `backend/` yang berubah.
- [ ] AC9: dokumen terbaca jelas dalam Bahasa Indonesia.
- [ ] Tidak ada klaim tanpa bukti - setiap pernyataan teknis dapat dilacak ke file nyata.
- [ ] `09-pm-review.md` ditulis dengan status per-AC dan keputusan SHIP / NEED FIX / BLOCKED.
- [ ] User menyetujui penutupan di Checkpoint 2.

## 13. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Architect ikut "memperbaiki" kode saat membaca | Melanggar NG1/AC8, di luar mandat user | Larangan eksplisit di Bagian 10; AC8 dicek di DoD |
| Laporan melebar jadi desain arsitektur target penuh | Scope creep, user hanya minta laporan as-is | ADR dibatasi format singkat 4 elemen; NG3 |
| Detail terlalu teknis sehingga tidak terpakai | Deliverable tidak bernilai | AC9 + executive summary non-teknis wajib |
| Klaim tidak akurat (halusinasi versi/path) | Merusak kepercayaan pada laporan | AC2 & AC3: setiap path/versi harus dicek ke file nyata |
