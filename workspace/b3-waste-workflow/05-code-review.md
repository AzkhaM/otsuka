# 05 - CODE REVIEW: Menu Limbah B3 - Alur Pembuangan (Tahap 1-4)

| Field | Value |
|---|---|
| Task slug | b3-waste-workflow |
| Reviewer | azkha-code-review |
| Ronde | **2 (re-review setelah loop-back QA)** |
| Input | `01-spec.md`, `02-architecture.md`, `03-frontend.md` (termasuk Bagian 8 baru), `08-qa-report.md` (BLOCKER), kode di `frontend/src/app/pages/b3-waste/` |
| Verdict | **APPROVED** |

---

## 0. Konteks ronde ini

Ronde 1 (sebelumnya): APPROVED, 0 Blocker, 0 Major, 1 Minor (import FormsModule tak terpakai di waste-picker.ts, sudah dibersihkan orchestrator saat itu).

QA kemudian menjalankan ng serve + interaksi Playwright nyata (bukan hanya baca kode) dan menemukan BLOCKER kritis: effect() di constructor WastePicker auto-track signal seleksi/lainnyaAktif/lainnyaTeks secara tidak sengaja (karena badan efek memanggil muatDari() -> emit() yang membaca signal-signal itu secara sinkron di eksekusi efek yang sama). Akibatnya setiap kali user mencentang checklist, efek terpicu ulang dan menimpa balik pilihan user menjadi kosong dalam waktu singkat - checklist limbah B3 tidak bisa dipakai sama sekali, submit pengajuan baru mustahil (AC-2, AC-3, AC-5, AC-7, AC-10 FAIL). Bug ini nol error console, sehingga lolos npm run build, tsc --noEmit, dan review round 1 yang hanya membaca kode statis - baru terbongkar lewat interaksi klik sungguhan.

Frontend memperbaiki dengan mengisolasi efek: baca nilaiAwal() di luar untracked() (tetap jadi dependency efek), lalu bungkus pemanggilan muatDari(v) (termasuk emit() di dalamnya) dengan untracked() supaya pembacaan seleksi/lainnyaAktif/lainnyaTeks di dalamnya tidak lagi terdaftar sebagai dependency efek. Detail lengkap di 03-frontend.md Bagian 8.

Review ronde 2 ini memverifikasi ulang fix tersebut secara independen, plus mengonfirmasi ulang temuan ronde 1 yang masih relevan.

---

## 1. Ringkasan Severity (ronde 2)

| Severity | Jumlah | Detail |
|---|---|---|
| Blocker | 0 | Bug effect() self-reset dari 08-qa-report.md sudah diverifikasi tertutup - lihat Bagian 2 |
| Major | 0 | - |
| Minor | 0 | Minor ronde 1 (import FormsModule tak terpakai) dikonfirmasi masih hilang - lihat Bagian 4 |
| Nit | 1 | (carry-over ronde 1, tidak berubah) konteks.pengguna menambah permukaan reducer - didokumentasikan dan beralasan, dicatat saja |

Nol Blocker, nol Major, nol Minor baru. Gerbang lolos.

---

## 2. Verifikasi fix BLOCKER (waste-picker.ts)

### 2.1 Kode sesudah fix (dibaca penuh baris 1-162, dikonfirmasi langsung dari file)

Import baris 1: `import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';` - untracked diimpor dari @angular/core, sumber resmi Angular Signals API.

Constructor:
```
constructor() {
  effect(() => {
    const v = this.nilaiAwal();
    untracked(() => this.muatDari(v));
  });
}
```

### 2.2 Analisis korektnes teknis

- nilaiAwal() tetap di luar untracked() (baris `const v = this.nilaiAwal();` dieksekusi sebelum masuk callback untracked), sehingga efek tetap reactive terhadap perubahan nilaiAwal - use-case "Perbaiki & Ajukan Ulang" (prefill dari pengajuan lama yang ditolak) tetap berfungsi karena nilaiAwal adalah satu-satunya dependency yang dimaksud, dan itu masih ter-track dengan benar.
- Seluruh badan muatDari(v) (baris 110-125) - termasuk pemanggilan emit() di baris terakhirnya - berjalan di dalam untracked(). Dibaca ulang baris per baris:
  - muatDari() menulis this.seleksi.set(...), this.lainnyaAktif.set(...), this.lainnyaTeks.set(...), lalu memanggil this.emit(). Semua ini di dalam untracked callback.
  - emit() (baris 155-161) membaca this.buatItems() (yang membaca this.seleksi() dan this.departemen), this.lainnyaAktif(), this.lainnyaTeks(). Karena emit() dipanggil dari dalam muatDari() yang sudah dibungkus untracked(), seluruh pembacaan sinyal ini tidak lagi didaftarkan sebagai dependency efek - inilah inti perbaikannya, tepat sasaran ke root cause yang didiagnosis QA di 08-qa-report.md 2.2.
  - Tidak ada signal lain yang dibaca di muatDari()/emit() di luar tiga signal internal (seleksi, lainnyaAktif, lainnyaTeks) yang memang seharusnya tidak menjadi dependency efek ini.
- Method toggleDept/toggleSumber/toggleJenis/toggleLainnya/onLainnyaTeks (baris 65-108, dipanggil langsung dari event handler template (change)/(input), bukan dari dalam efek) memanggil emit() di luar konteks efek sama sekali - jadi pemanggilan emit() di sana tidak relevan dengan masalah auto-tracking efek; ini murni notifikasi biasa ke parent via output(), berperilaku sama seperti sebelum bug ditemukan dan tidak disentuh oleh fix (memang tidak perlu disentuh).
- Tidak ada race condition baru: untracked() bersifat sinkron (bukan async/microtask) - muatDari(v) selesai dieksekusi penuh sebelum efek Angular berikutnya berjalan, tidak ada window waktu di mana state jadi tidak konsisten.
- Tidak ada regresi pada computed totalDipilih (baris 30-40): computed ini independen dari efek constructor, tetap membaca this.seleksi() secara normal dan reaktif terhadap perubahannya (computed seharusnya auto-track, itu bukan bug) - berfungsi seperti semula.

Kesimpulan teknis: fix benar dan tepat sasaran. Pola ini (baca dependency yang diinginkan di luar untracked, proses efek samping di dalam untracked) adalah idiom standar Angular Signals untuk kasus "load dari sumber eksternal lalu broadcast balik ke parent tanpa ikut men-subscribe ke output-nya sendiri" - konsisten dengan dokumentasi resmi Angular soal untracked().

### 2.3 Verifikasi independen tambahan (dijalankan reviewer sendiri, bukan percaya laporan Frontend)

- npm run build (dijalankan ulang oleh reviewer di frontend/): sukses, nol error, nol warning. Output: main-HYF5PVVW.js 417.73 kB, styles-YPAUNJMG.css 1.12 kB - konsisten dengan klaim Frontend.
- npx tsc --noEmit: bersih, nol error tipe.
- npx ng test --include "src/app/pages/b3-waste/b3-waste-model.spec.ts" --watch=false: Test Files 1 passed (1), Tests 36 passed (36) - dikonfirmasi identik dengan klaim Frontend (36/36), fix tidak menyentuh b3-waste-model.ts sehingga hasil ini diharapkan tidak berubah.

Reviewer tidak menjalankan ulang sesi Playwright interaktif (di luar scope tooling review kode statis + build/test); analisis korektnes teknis di atas dilakukan dengan membaca kode baris-per-baris untuk memverifikasi mekanisme untracked() secara independen dari klaim Frontend/QA, dan hasilnya konsisten dengan bukti screenshot/skenario A-C yang dilaporkan Frontend di 03-frontend.md 8.4 (checklist persisten setelah 800ms, submit PLB3/2026/0005 berhasil, prefill "Perbaiki & Ajukan Ulang" tetap benar).

---

## 3. Audit scope perubahan (AC-32, khusus ronde ini)

Dibandingkan timestamp modifikasi seluruh 9 file di frontend/src/app/pages/b3-waste/:

| File | Timestamp modifikasi |
|---|---|
| waste-picker.ts | 2026-08-14 13:43 (baru) |
| b3-waste-model.spec.ts | 2026-08-14 13:24 (dari QA, tidak berubah ronde ini) |
| b3-waste-data.ts, b3-waste-model.ts, b3-waste.css, b3-waste.html, b3-waste.ts, waste-picker.css, waste-picker.html | Seluruhnya 09:17-09:20 (tanggal kerja awal, tidak tersentuh ronde fix ini) |

Hanya waste-picker.ts yang berubah sejak review round 1 - dikonfirmasi lewat timestamp filesystem, bukan hanya klaim Frontend. Sesuai laporan Frontend: 1 import ditambah (untracked), 1 method constructor diubah. Diff minimal, tepat sasaran, tidak ada perubahan berlebihan di luar yang diperlukan untuk menutup bug (lolos standar ponytail - lihat Bagian 5).

---

## 4. Re-verifikasi temuan Minor ronde 1 (import FormsModule)

Dikonfirmasi ulang di kode saat ini: waste-picker.ts baris 1 hanya mengimpor dari @angular/core; @Component decorator (baris 14-18) tidak memiliki properti imports sama sekali - tidak ada jejak FormsModule. Pencarian pola FormsModule/ngModel atas folder pages/b3-waste/ mengonfirmasi FormsModule/ngModel hanya muncul di b3-waste.ts/b3-waste.html (dipakai sah untuk form header/alasan/jadwal/timbang di container), nol kemunculan di waste-picker.ts/waste-picker.html. Temuan Minor ronde 1 tetap terselesaikan, tidak regresi.

---

## 5. Standar ponytail (kesederhanaan fix)

Fix mengubah 1 baris import + 4 baris constructor menjadi bentuk yang setara secara fungsional tapi dengan dependency tracking yang benar - tidak menambah abstraksi baru (tidak ada wrapper/helper/service baru), tidak mengubah signature method manapun (muatDari/emit/toggle-toggle tetap identik), tidak menyentuh file lain. Ini persis perbaikan minimal yang menutup root cause tanpa efek samping di area lain - selaras dengan prinsip "kode yang tak ditulis = nol bug". Tidak ada temuan ponytail baru untuk fix ini.

---

## 6. Verdict

**APPROVED.**

Alasan: bug BLOCKER dari 08-qa-report.md (WastePicker effect self-reset) sudah diperbaiki dengan tepat secara teknis - nilaiAwal() dibaca di luar untracked() sehingga efek tetap reactive terhadap prefill (nilaiAwal berubah), sementara seluruh pembacaan sinyal internal di dalam muatDari()/emit() (seleksi, lainnyaAktif, lainnyaTeks) dibungkus untracked() sehingga tidak lagi ikut ter-track sebagai dependency efek - inilah akar masalah yang didiagnosis QA, dan fix ini menyasarnya secara presisi tanpa efek samping. Dikonfirmasi tidak ada race condition baru (untracked bersifat sinkron) dan tidak ada regresi pada use-case prefill "Perbaiki & Ajukan Ulang". Scope perubahan 100% terbatas pada waste-picker.ts (diverifikasi via timestamp filesystem independen). Minor ronde 1 (import FormsModule tak terpakai) dikonfirmasi tetap terselesaikan, tidak regresi. npm run build, npx tsc --noEmit, dan ng test (36/36) seluruhnya dijalankan ulang secara independen oleh reviewer dan lolos bersih.

Tidak ada perbaikan wajib. Rekomendasi: lanjut ke re-run QA terbatas (S2/S3 di 02-architecture.md, sesuai rekomendasi QA di 08-qa-report.md Bagian 6) untuk konfirmasi akhir lewat interaksi browser nyata bahwa cascade checklist benar-benar persisten di DOM sebelum SHIP - review kode statis ronde ini tidak menggantikan verifikasi runtime QA, hanya mengonfirmasi korektnes teknis fix di level kode.

---
---

# RONDE 3 - Babak 2: Logbook & Neraca (2026-08-14)

| Field | Value |
|---|---|
| Ronde | **3 (babak 2 - Logbook & Neraca)** |
| Input | 01-spec.md Bagian 0 (AMANDEMEN), logbook-neraca-format-reference.md, 02-architecture.md Bagian 14-26 (kontrak babak 2), 03-frontend.md Bagian 9 (laporan + 7 keputusan implementasi), kode di frontend/src/app/pages/b3-waste/ |
| Verdict | **APPROVED** |

## 0. Konteks ronde ini

Babak 1 (Tahap 1-4) sudah APPROVED (ronde 1-2) dan lolos QA. Babak 2 membuka Logbook (FR/K3L/006/01) dan Neraca (FR/K3L/006/02/1), preview editable di Tahap 4, dan Unduh PDF via window.print(). Sembilan file disentuh: 4 file babak 1 diubah secara aditif (b3-waste-model.ts, b3-waste-data.ts, b3-waste.ts, b3-waste.html, b3-waste.css), file baru murni (b3-waste-logbook.ts) dan komponen dokumen (b3-dokumen.ts/.html/.css). waste-picker.ts/.html/.css diklaim tidak disentuh - diverifikasi independen di Bagian 2.

Seluruh kode dibaca penuh (bukan cuplikan), npm run build dan npx tsc --noEmit dijalankan ulang independen oleh reviewer, dan grep audit dijalankan langsung atas folder (bukan dipercaya dari klaim Frontend).

## 1. Ringkasan Severity (ronde 3)

| Severity | Jumlah | Detail |
|---|---|---|
| Blocker | 0 | - |
| Major | 0 | - |
| Minor | 0 | - |
| Nit | 2 | (1) BlokLogbook.totalMasukKg/totalKeluarKg/sisaKg dihitung tapi tidak pernah dirender di b3-dokumen.html - dokumen asli tidak punya baris total per blok Logbook - lihat 6.1; (2) dua method pratinjau (pratinjauItem, pratinjauNeraca) dipanggil berulang dari binding template per-row/per-render - disengaja dan didokumentasikan eksplisit di kontrak 18.3, dicatat saja, bukan temuan baru |

Nol Blocker, nol Major, nol Minor. Gerbang lolos bersih.

## 2. Verifikasi klaim scope: waste-picker.* tidak disentuh (AC-32)

Diaudit independen lewat mtime filesystem atas seluruh folder b3-waste/, dibandingkan dengan file blacklist di luar folder:

```
waste-picker.html      2026-08-14 09:18:37   <- sesi babak 1 (bugfix round-2), sebelum babak 2
waste-picker.css       2026-08-14 09:18:51   <- idem
b3-waste-model.spec.ts 2026-08-14 13:24:19   <- milik QA babak 1, tidak disentuh
waste-picker.ts        2026-08-14 13:43:17   <- idem (fix effect() self-reset)
b3-waste-model.ts      2026-08-14 14:38:48   <- sesi babak 2 dimulai di sini
b3-waste-data.ts       2026-08-14 14:39:01
b3-waste-logbook.ts    2026-08-14 14:39:54   (baru)
b3-waste.ts            2026-08-14 14:43:21
b3-dokumen.ts           2026-08-14 14:43:38   (baru)
b3-dokumen.html          2026-08-14 14:44:10   (baru)
b3-waste.html           2026-08-14 14:45:22
b3-waste.css            2026-08-14 14:45:30
b3-dokumen.css           2026-08-14 14:46:24   (baru)
```

waste-picker.* 100% bertanggal sesi babak 1 (09:18-13:43), sedangkan seluruh 9 file yang berubah babak 2 berkerumun 14:38-14:46 - konfirmasi independen bahwa waste-picker.* sungguh tidak disentuh, bukan cuma klaim di 03-frontend.md. Isi waste-picker.ts juga dibaca penuh dan masih memuat fix untracked() dari ronde 2, tidak ada regresi.

File blacklist (app.routes.ts, shared/menu.ts, shared/feature-page.css, shared/icon/icon.ts, styles.css, package.json, angular.json) seluruhnya bertanggal 12-13 Agustus (sebelum sesi ini dimulai) - nol perubahan. package.json dibaca penuh: nol dependency baru (masih 8 dependencies + 6 devDependencies babak 1, identik). Ikon yang dipakai (alert-triangle, plus, check-square) sudah ada di icon.ts sebelum babak 2 - tidak ada entri baru ditambahkan ke ICONS.

**AC-32 PASS mutlak.**

## 3. P-1: Satu sumber data - logbook/neraca benar-benar computed, bukan signal

Perintah yang dijalankan reviewer:
```
grep -rn "signal<Logbook\|signal<Neraca\|logbook\.set(\|logbook\.update(\|neraca\.set(\|neraca\.update(" pages/b3-waste/
```
Hasil: **nol match kode** - dua baris yang muncul hanyalah komentar di b3-waste-logbook.ts baris 4-5 yang justru menjelaskan larangan itu sendiri ("Dilarang keras ada signal<LogbookEntry[]>..."), bukan pelanggaran.

Dibaca langsung di b3-waste.ts baris 102-104:
```ts
logbook     = computed<LogbookEntry[]>(() => bangunLogbook(this.pengajuan()));
logbookBlok = computed<BlokLogbook[]>(() => kelompokkanLogbook(this.logbook()));
neraca      = computed<Neraca>(() => hitungNeraca(this.logbook()));
```
Ketiganya computed() murni di atas pengajuan() yang sudah ada - tidak ada signal<LogbookEntry[]>/signal<Neraca> di mana pun, dan tidak ada .push/.update manual atas array logbook di file mana pun dalam folder. b3-waste-logbook.ts sendiri nol impor Angular (dikonfirmasi baris importnya hanya dari ./b3-waste-model). **AC-47/P-1 PASS.**

## 4. Preview editable = angka final: satu fungsi, bukan dua jalur

terapkanTimbang(items, isi) di b3-waste-model.ts (baris 264-279) adalah satu-satunya tempat transformasi item hasil timbang terjadi. Ditelusuri dua pemanggilnya:

1. **Reducer final** - cabang PIC_WEIGH di jalankanAksi() (baris 567): `const items = terapkanTimbang(sebelum.items, aksi.isi);`
2. **Preview live** - pratinjauPengajuan() di b3-waste-logbook.ts (baris 270): `items: terapkanTimbang(p.items, isi)`, dipanggil dari method komponen pratinjauItem()/pratinjauLogbook()/pratinjauNeraca() di b3-waste.ts (baris 147-157), yang semuanya membaca this.formTimbang - buffer yang sama yang dikirim ke kirimTimbang() -> terapkan({ tipe: 'PIC_WEIGH', ..., isi: this.formTimbang }).

Karena kedua jalur memanggil fungsi murni yang identik dengan payload yang identik (formTimbang), preview dan hasil final tidak bisa menyimpang secara struktural - bukan dua implementasi yang kebetulan mirip. id item tidak pernah dihitung ulang di terapkanTimbang (dikonfirmasi baris 270-278: field id tidak disebut sehingga tetap dari spread it), menutup risiko R-15 (kunci berat/koreksiJenis berbasis id tidak akan pernah hilang cocok).

Guard maksSimpan = null bila tanggalTimbang kosong (baris 276) menutup R-16 (mencegah NaN di preview saat form belum lengkap). **AC-43 PASS.**

## 5. State setelah submit: preview kosong, data logbook permanen

Mekanisme ditelusuri tanpa kode sinkronisasi eksplisit, persis klaim arsitektur:

- Panel "Timbang & Validasi" di b3-waste.html baris 205 dibungkus @if (aksiTersedia().includes('PIC_WEIGH')). aksiUntuk status WEIGHED, peran PIC (di b3-waste-model.ts baris 422-425) mengembalikan array kosong (tidak ada cabang match) - panel otomatis lenyap dari DOM begitu status pindah, tanpa kode reset UI eksplisit.
- kirimTimbang() (baris 260-268) mereset this.formTimbang ke timbangKosong() hanya setelah terapkan() sukses - artinya form buffer bersih dan pengajuan() sudah ter-update dalam satu tick yang sama.
- logbook/logbookBlok/neraca adalah computed() di atas pengajuan() (Bagian 3) - begitu pengajuan() berubah (item baru berstatus WEIGHED masuk daftar), ketiga computed otomatis bertambah tanpa satu baris kode append manual.
- pilihanId sengaja tidak direset - dikonfirmasi kode tidak menyentuhnya di kirimTimbang(); PIC tetap di layar detail yang sekarang read-only (tabel item + readonly-note + link "Lihat di Logbook" muncul saat p.status === 'WEIGHED', baris 136-142 b3-waste.html). Ini sesuai alasan tertulis 02-architecture.md 18.2 (bukti AC-24 tetap terlihat di layar yang sama).
- Membuka pengajuan APPROVED lain: bukaDetail(id) (baris 186-190) memanggil resetFormAksi() yang menyetel ulang formTimbang = timbangKosong() - form baru dijamin kosong, tidak ada bekas koreksi jenis dari pengajuan sebelumnya (objek koreksiJenis baru, bukan referensi lama).

**AC-44 PASS.**

## 6. Grouping per kode (bukan nama)

kelompokkanLogbook() (b3-waste-logbook.ts baris 166-188) membangun Map<string, LogbookEntry[]> dengan kunci e.kode (bukan e.jenis) - dikonfirmasi baris 169: `const list = map.get(e.kode);`. Kasus konkret yang diminta orchestrator diverifikasi manual di master data (b3-waste-data.ts): "Elektrik" (Engineering/ENG baris 98, Produksi/CAN-PET baris 157) dan "Lampu TL/Elektrik" (Office/OFFICE baris 182) sama-sama berkode B107d - ketiganya akan jatuh ke entri Map yang sama, menghasilkan satu BlokLogbook dengan entries gabungan dan jenis = nama dari kemunculan pertama (sesuai urutan tanggalMasuk hasil sort bangunLogbook). Neraca (hitungNeraca) memakai pola agregasi identik (Map berkunci e.kode, baris 191-200) - konsisten, tidak ada jalur kedua yang mengelompokkan per nama.

### 6.1 Nit - field total per blok tak terpakai
BlokLogbook.totalMasukKg/totalKeluarKg/sisaKg dihitung di kelompokkanLogbook() (baris 175-184) tetapi tidak pernah dibaca di b3-dokumen.html - dokumen Logbook asli memang tidak punya baris total per lembar (beda dari Neraca yang punya TOTAL A/B eksplisit), jadi ini konsisten dengan referensi format, hanya saja field-nya jadi dead output. Ini bagian dari kontrak tipe yang sudah dikunci Architect (02-architecture.md 15.1) - bukan keputusan Frontend, dan menghapusnya berarti mengubah kontrak tipe tanpa otorisasi. Tidak memblokir, dicatat sebagai catatan untuk babak berikutnya bila field ini tidak jadi dipakai.

**AC-35, AC-42 PASS (secara struktural; verifikasi visual multi-blok/lintas-pengajuan sudah didemonstrasikan Frontend dengan Playwright di 03-frontend.md 9.3 - konsisten dengan trace kode di atas).**

## 7. Satuan & pembulatan (kg internal, Ton hanya di tampilan; Kinerja dari kg)

- LogbookEntry/bangunLogbook/kelompokkanLogbook seluruhnya bekerja dalam kg (field jumlahMasukKg, dst.) - dikonfirmasi tipe & operasi aritmetika di b3-waste-logbook.ts.
- keTon() (baris 110-112) hanya dipanggil di titik render/agregasi akhir: bagianI jumlahTon = keTon(a.kg), totalATon = keTon(totalAKg), totalBTon = keTon(totalBKg), barisAktif jumlahTon = keTon(a.kg) - seluruh penjumlahan (a.kg += e.jumlahMasukKg, totalAKg = reduce) terjadi sebelum konversi Ton, persis kontrak 16.2.
- **Kinerja dihitung dari kg, bukan Ton yang sudah dibulatkan** - dikonfirmasi baris 231: `kinerjaPersen = totalAKg === 0 ? null : Math.round((totalBKg / totalAKg) * 100 * 100) / 100`. Karena totalBKg didefinisikan sama dengan totalAKg (baris 228, by construction P-3), hasilnya selalu tepat 100 tanpa bergantung pembulatan Ton berjenjang manapun - menutup R-12 secara struktural, bukan cuma kebetulan data sample.
- kinerjaPersen = null saat totalAKg === 0, dirender tanda strip lewat formatPersen() (baris 125-127) - tidak akan pernah menampilkan 0,00/NaN/#REF!.
- DecimalPipe/Intl.NumberFormat grep = nol hasil (Bagian 10) - seluruh format angka lewat formatTon/formatKg/formatPersen yang memakai toFixed().replace('.', ',') manual (locale koma eksplisit, bukan bergantung locale Angular default en-US).

**AC-39, AC-40, AC-41 PASS.**

## 8. PDF print: scoping CSS & cleanup body.b3-printing

- b3-dokumen.css diaudit baris-per-baris (92 baris): seluruh selektor top-level diawali .doc-*, .b3-doc, atau (di dalam @media print) body.b3-printing. Dikonfirmasi dengan grep atas pola selektor elemen telanjang di awal baris - nol hasil, artinya tidak ada satu pun baris top-level yang dimulai elemen/utility telanjang (table{}, h1{}, dst). Karena B3Dokumen memakai ViewEncapsulation.None (dikonfirmasi hanya dipakai di komponen ini lewat grep atas seluruh folder), disiplin namespace ini adalah satu-satunya yang mencegah kebocoran style ke seluruh menu lain - lolos, tidak ada risiko R-9 terealisasi.
- Aturan print (body.b3-printing * { visibility:hidden } dst di dalam @media print) hanya menggigit saat kelas body.b3-printing terpasang dan dalam mode print - di luar kedua kondisi itu (browsing normal, atau print di menu lain tanpa kelas ini) CSS ini nol pengaruh terhadap DOM manapun.
- cetak() (b3-dokumen.ts baris 40-44) menambahkan kelas sebelum window.print(), dan melepasnya lewat listener afterprint (bukan sinkron setelah print() yang bisa gagal di browser non-blocking) dengan opsi { once: true } yang mencegah listener menumpuk bila cetak() dipanggil berulang kali dalam satu sesi. Ini menutup risiko "b3-printing nyangkut permanen di body" yang diminta orchestrator diverifikasi: kelas hanya lepas setelah dialog print (sukses atau dibatalkan) selesai, sesuai event afterprint yang ditembakkan browser di kedua kasus - bukan hanya saat cetak berhasil.
- Isolasi per tab: .doc-logbook/.doc-neraca hanya ada di DOM salah satu saja pada satu waktu, karena @if tabAktif() === 'logbook' / 'neraca' di b3-waste.html (baris 353-366) memastikan tab yang tidak aktif tidak dirender sama sekali - app-b3-dokumen untuk tab lain tidak ada instance-nya di DOM, jadi tidak perlu logika filter tambahan di dalam B3Dokumen sendiri.

**AC-45, AC-46 PASS.**

## 9. Stempel ASLI/COPY

Perintah grep case-insensitive atas kata ASLI dan COPY di seluruh folder b3-waste/ menghasilkan nol kecocokan kode - satu-satunya kemunculan string terkait adalah kata "asli" dalam frasa "kontrak asli" di komentar b3-waste-model.ts baris 124 (tidak berkaitan dengan stempel dokumen) dan kata "asli" dalam komentar Indonesia biasa di b3-waste.html baris 352 ("replika format asli") - keduanya bukan render teks ke pengguna, bukan pelanggaran. **AC-38 PASS.**

## 10. Verifikasi lain (grep independen atas seluruh folder)

```
signal<Logbook / signal<Neraca / logbook.set|update / neraca.set|update -> nol
ASLI / COPY                                                              -> nol (di luar komentar)
DecimalPipe / NumberFormat                                               -> nol (hanya di komentar larangan)
innerHTML                                                                -> nol
HttpClient / fetch( / XMLHttpRequest                                     -> nol
toISOString                                                              -> nol
DatePipe                                                                 -> nol
```
Seluruhnya konsisten dengan klaim 03-frontend.md 9.3 dan diperiksa ulang independen oleh reviewer (bukan disalin dari laporan).

## 11. Build & type-check (dijalankan ulang independen oleh reviewer)

- npx tsc --noEmit -p tsconfig.app.json -> bersih, nol error.
- npm run build -> sukses:
```
main-ZVMSK2MY.js    | main   | 437.90 kB | 109.17 kB
styles-YPAUNJMG.css | styles |   1.12 kB |   477 bytes
```
Nol error, nol warning anyComponentStyle (dikonfirmasi output build bersih). Ukuran CSS diverifikasi langsung dengan wc -c:

| File | Ukuran aktual (reviewer) | Batas kontrak | Status |
|---|---|---|---|
| b3-waste.css | 3 015 B | <= 4 kB (kontrak 21) | PASS |
| b3-dokumen.css | 3 454 B | <= 8 kB (kontrak 21) | PASS |
| waste-picker.css | 2 722 B (tidak berubah) | <= 5 kB | PASS |
| B3Waste gabungan (feature-page.css 5 143 B + b3-waste.css 3 015 B) | ~8 158 B | < error 10 kB | PASS |

Angka-angka ini identik dengan klaim 03-frontend.md 9.2 - dikonfirmasi, bukan disalin.

- npx vitest run (seluruh suite): b3-waste-model.spec.ts **36/36 PASS** (suite babak 1, tidak menguji fungsi babak 2 - opsional QA, tidak memblokir ronde ini). src/app/app.spec.ts gagal dengan ReferenceError describe is not defined - ini kegagalan pra-ada di luar scope (R-5, dicatat sejak 02-architecture.md), bukan regresi dari task ini; gerbang build tetap npm run build, bukan npm test.

## 12. Ponytail review - kesederhanaan struktur babak 2

Dijalankan atas seluruh diff babak 2 dengan pertanyaan "kode mana yang bisa dihapus/disederhanakan":

1. **Pemecahan b3-waste-logbook.ts (murni) + b3-dokumen.ts/.html/.css (presentational)** - dipertahankan, tidak over-engineered. Alasan diverifikasi bukan sekadar diklaim: (a) B3Dokumen wajib jadi komponen terpisah karena ViewEncapsulation.None adalah satu-satunya cara menjangkau body.b3-printing tanpa menyentuh layout/** (blacklist) - menaruhnya di B3Waste langsung akan meng-global-kan seluruh style halaman B3Waste (bocor ke menu lain), bukan pilihan gaya; (b) b3-waste-logbook.ts terpisah dari b3-waste-model.ts mencegah file model membengkak lagi dan menjaga audit R-3 (penulisan status hanya di satu file) tetap mudah dibaca - dikonfirmasi b3-waste-model.ts tetap 600 baris, bukan sekitar 800 baris andai digabung. Tidak ada lapisan tambahan di atas ini (tidak ada service/store baru, B3Dokumen tidak punya signal state sendiri - dikonfirmasi hanya 2 input() + 1 method cetak(), benar-benar presentational seperti diklaim).
2. **Tidak ada abstraksi baru yang tidak perlu** - nol class/interface tambahan di luar yang dipetakan langsung ke kolom dokumen (tabel pemetaan kontrak membuktikan nol field yatim di LogbookEntry, dikonfirmasi tidak ada field ekstra yang tidak dipakai kecuali Nit 6.1 di atas).
3. **Preview Tahap 4 tidak dipecah jadi komponen ke-3** meski tergoda (form + tabel + pratinjau Neraca) - tetap di dalam template B3Waste yang sudah ada, membaca formTimbang langsung tanpa input/output tambahan. Ini keputusan yang benar: memecahnya akan butuh plumbing dua arah untuk buffer yang sama, nilai tambah nol (konsisten dengan penolakan eksplisit di kontrak arsitektur).
4. **Tidak ada library baru** untuk PDF/format angka/tanggal - window.print() native, toFixed().replace() manual - dikonfirmasi package.json nol dependency baru (Bagian 2/11).
5. **Satu fungsi terapkanTimbang dipakai ulang** untuk preview dan final (Bagian 4) - ini justru pengurangan duplikasi paling signifikan di seluruh babak 2, bukan penambahan.

Tidak ada temuan ponytail yang mengharuskan perubahan. Struktur file (11 kode + 1 spec, nol sub-folder/barrel) proporsional terhadap kompleksitas dua dokumen replika 13-kolom dan agregasi kumulatif.

## 13. Verdict

**APPROVED.**

Nol Blocker, nol Major, nol Minor. Dua Nit dicatat (field BlokLogbook total tak terpakai - bagian kontrak Architect, bukan cacat Frontend; pemanggilan method pratinjau berulang di template - disengaja dan terdokumentasi), keduanya tidak memerlukan perbaikan sebelum lanjut.

Ringkasan bukti yang mendasari verdict:
- P-1 (satu sumber data): logbook/logbookBlok/neraca dikonfirmasi computed() murni, nol signal/.set/.update di seluruh folder (Bagian 3).
- Preview = final: satu fungsi terapkanTimbang() dipakai reducer PIC_WEIGH dan pratinjauPengajuan() dengan payload (formTimbang) yang sama secara struktural (Bagian 4).
- Reset & permanensi: mekanisme "preview kosong lagi, data logbook permanen" ditelusuri tanpa kode sinkronisasi manual - murni akibat @if DOM + computed() di atas pengajuan() (Bagian 5).
- Grouping per kode: kelompokkanLogbook/hitungNeraca berkunci e.kode, dikonfirmasi kasus B107d (Elektrik/Lampu TL-Elektrik) akan tergabung satu blok (Bagian 6).
- Satuan & pembulatan: kg internal, keTon() hanya di titik render, Kinerja dihitung dari kg sehingga selalu tepat 100% by construction, nol DecimalPipe (Bagian 7).
- PDF print: CSS 100% ternamespace (grep selektor top-level = nol pelanggaran), gerbang body.b3-printing + cleanup afterprint (bukan sinkron), isolasi per tab lewat @if (Bagian 8).
- Nol stempel ASLI/COPY (Bagian 9), nol scope creep (Bagian 2, audit mtime independen), build & tsc bersih dijalankan ulang independen oleh reviewer (Bagian 11).

Rekomendasi lanjut: QA babak 2 (S9-S13, AC-35..AC-47) untuk verifikasi runtime/visual - review kode statis ronde ini mengonfirmasi korektnes struktural dan kepatuhan kontrak, bukan pengganti verifikasi interaksi browser nyata (konsisten dengan catatan penutup ronde 2).


---
---

# RONDE 4 - Amandemen 2 (2026-08-15)

| Field | Value |
|---|---|
| Ronde | **4 (Amandemen 2 - polish visual & penggabungan dokumen)** |
| Input | `logbook-neraca-format-reference.md` bagian "AMANDEMEN 2" (9 poin, kontrak resmi), `03-frontend.md` Bagian 10 (laporan implementasi + 6 keputusan non-trivial), `05-code-review.md` ronde 1-3 (konteks, tidak direview ulang), kode di `frontend/src/app/pages/b3-waste/` |
| Verdict | **APPROVED** |

## 0. Konteks ronde ini

Ronde 3 (babak 2 - Logbook & Neraca) APPROVED, 0 Blocker/Major/Minor, 2 Nit (tidak memblokir). Amandemen 2 ini BUKAN fitur baru: 9 poin revisi visual/struktural dari feedback user (header tabel bergaris, field perkiraan berat Tahap 1, pre-fill berat Tahap 4, field bersama dipindah ke atas, tab Logbook/Neraca dihapus+digabung ke detail pengajuan dengan mode editable/readonly). Fokus ronde ini: b3-dokumen.ts/.html/.css dan b3-waste.ts/.html/.css (satu-satunya file yang berubah menurut klaim Frontend), plus verifikasi independen bahwa waste-picker.*, b3-waste-model.ts, b3-waste-data.ts, b3-waste-logbook.ts benar-benar tidak disentuh.

## 1. Ringkasan Severity (ronde 4)

| Severity | Jumlah | Detail |
|---|---|---|
| Blocker | 0 | - |
| Major | 0 | - |
| Minor | 1 | text-align:center blanket di .doc-table td (b3-dokumen.css baris 63) berpotensi sedikit menurunkan keterbacaan kolom teks panjang (Jenis Limbah B3 Masuk, Tujuan Penyerahan) dibanding rata-kiri - lihat Bagian 6. Tidak memblokir: data master saat ini pendek (maks kira-kira 22 karakter), keputusan ini eksplisit dan beralasan di 03-frontend.md 10.4 poin 1 (mengikuti referensi Excel asli) |
| Nit | 2 (carry-over) | Field BlokLogbook.total* tak terpakai (ronde 3, masih berlaku, bukan cacat ronde ini); pemanggilan dokBlok(p)/dokNeraca(p) sebagai method biasa (bukan computed) dari binding template, dieksekusi ulang tiap siklus deteksi perubahan - lihat Bagian 3 |

Nol Blocker, nol Major. Gerbang lolos.

## 2. Audit scope (mtime independen, bukan percaya klaim Frontend)

```
waste-picker.html      2026-08-14 09:18:37   <- babak 1, tidak tersentuh
waste-picker.css       2026-08-14 09:18:51   <- idem
waste-picker.ts        2026-08-14 13:43:17   <- idem (fix untracked() ronde 2)
b3-waste-model.ts      2026-08-14 14:38:48   <- IDENTIK timestamp ronde 3 (babak 2), tidak tersentuh
b3-waste-data.ts       2026-08-14 14:39:01   <- IDENTIK timestamp ronde 3
b3-waste-logbook.ts    2026-08-14 14:39:54   <- IDENTIK timestamp ronde 3
b3-dokumen.ts          2026-08-15 13:10:24   <- sesi ronde 4
b3-dokumen.html        2026-08-15 13:11:02   <- sesi ronde 4
b3-dokumen.css         2026-08-15 13:11:22   <- sesi ronde 4
b3-waste.html          2026-08-15 13:13:02   <- sesi ronde 4
b3-waste.css           2026-08-15 13:13:10   <- sesi ronde 4
b3-waste.ts            2026-08-15 13:20:05   <- sesi ronde 4
```

Dikonfirmasi lewat Get-ChildItem/wc -c langsung atas filesystem: timestamp b3-waste-model.ts/b3-waste-data.ts/b3-waste-logbook.ts persis sama (ke detik) dengan yang tercatat di audit ronde 3 - bukti kuat file-file ini nol perubahan sejak babak 2, bukan sekadar klaim laporan. waste-picker.* juga identik dengan audit ronde 2/3. Hanya 6 file (b3-dokumen.ts/.html/.css, b3-waste.ts/.html/.css) yang berubah, sesuai klaim 03-frontend.md 10.1. AC-32 (scope) PASS.

## 3. P-1 tetap utuh: bangunLogbook/kelompokkanLogbook/hitungNeraca tidak diubah, hanya scope pemanggilan

Karena b3-waste-logbook.ts dikonfirmasi byte-identik (mtime sama) dengan ronde 3 yang sudah diaudit baris-per-baris (05-code-review.md Bagian 3/4/6/7 ronde 3), fungsi murni ini tidak perlu diaudit ulang isinya. Yang diverifikasi ronde ini adalah titik pemanggilannya:

    private entriesUntuk(p: Pengajuan) {
      return this.editableSekarang()
        ? bangunLogbook([pratinjauPengajuan(p, this.formTimbang, this.penggunaAktif().nama)])
        : bangunLogbook([p]);
    }
    dokBlok(p: Pengajuan): BlokLogbook[] { return kelompokkanLogbook(this.entriesUntuk(p)); }
    dokNeraca(p: Pengajuan): Neraca { return hitungNeraca(this.entriesUntuk(p)); }

- Computed global logbook/logbookBlok/neraca (lintas SEMUA pengajuan, ada di babak 2) dikonfirmasi dihapus dari b3-waste.ts - grep atas pola penulisan "computed" di sekitar nama logbook/neraca di b3-waste.ts = nol hasil. Tidak ada kode mati tersisa (sesuai keputusan 10.4 poin 5, dan cocok kontrak amendemen poin 9 "tidak dibangun ulang jadi tampilan baru").
- Tidak ada signal<LogbookEntry[]>/signal<Neraca>/.set(/.update( baru atas hasil agregasi - dokBlok/dokNeraca mengembalikan nilai baru tiap panggilan langsung dari fungsi murni, konsisten P-1.
- Array satu elemen dikonfirmasi diteruskan persis sesuai kontrak amendemen poin 7 (fungsi generik, tinggal dipanggil dengan array 1 elemen) - tidak ada logika filter/agregasi tambahan yang disisipkan Frontend di titik pemanggilan.

Catatan (Nit, bukan regresi): dokBlok(p)/dokNeraca(p) adalah method biasa, dipanggil langsung dari binding template, bukan computed() yang dimemoisasi. Konsekuensinya fungsi ini (dan bangunLogbook/kelompokkanLogbook/hitungNeraca di dalamnya) dieksekusi ulang setiap siklus deteksi perubahan Angular, bukan hanya saat dependency-nya berubah - sama persis pola pratinjauItem/pratinjauNeraca babak 2 yang sudah dicatat sebagai Nit ronde 3 (disengaja, didokumentasikan). Tidak berdampak korektnes (fungsi murni, idempotent), hanya potensi kerja komputasi berulang untuk 1 pengajuan skala kecil - diterima sebagai trade-off performa yang sudah pernah disetujui, tidak perlu perbaikan.

## 4. Verifikasi pastikanBeratTerisi() - idempotensi & keamanan koreksi PIC

Ini titik paling berisiko dari revisi ini (dipanggil dari 3 tempat). Diaudit baris-per-baris:

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

- Guard idempoten: memakai operator "in" (cek keberadaan key), bukan "??"/"||" (cek nilai falsy). Ini krusial: begitu sebuah item pernah "disentuh" - baik oleh pastikanBeratTerisi sendiri (mengisi dari perkiraan, termasuk null bila user tidak isi apa pun di Tahap 1) maupun oleh PIC lewat onDokBerat() - key it.id PASTI ada di formTimbang.berat, sehingga panggilan berikutnya ke pastikanBeratTerisi untuk item yang sama tidak pernah menimpanya kembali. Ditelusuri onDokBerat(): this.formTimbang.berat = { ...this.formTimbang.berat, [e.itemId]: e.value } - key selalu tertulis (bahkan saat e.value === null / input dikosongkan PIC), tidak pernah dihapus dari map. Kombinasi keduanya menutup skenario risiko yang diminta diverifikasi: koreksi PIC tidak akan pernah tertimpa balik ke perkiraan user oleh pemanggilan ulang fungsi ini.
- 3 titik pemanggilan ditelusuri satu per satu, dikonfirmasi tidak ada jalur balapan:
  1. bukaDetail(id) (baris 189-197): memanggil resetFormAksi() lebih dulu (mereset formTimbang = timbangKosong(), berat: {} baru) baru kemudian pastikanBeratTerisi(p). Ini memastikan setiap kali user berpindah ke detail pengajuan LAIN, buffer benar-benar kosong sebelum diisi ulang dari perkiraan pengajuan yang baru dibuka - tidak ada kebocoran nilai dari pengajuan sebelumnya (dikonfirmasi tidak ada kode yang menyalin berat lama sebelum reset).
  2. setujuiPic() (baris 277-286): dipanggil setelah terapkan(...) sukses mengubah status ke APPROVED, TANPA memanggil resetFormAksi() - benar, karena PIC belum pernah mengisi apa pun di form timbang di titik ini (form timbang baru pertama kali terlihat), jadi berat masih kosong/prapengisian dari Tahap 1 saja, aman untuk diisi.
  3. gantiPeran(p) (baris 166-176): hanya dipanggil bila p === 'PIC' DAN t.status === 'APPROVED' (guard eksplisit) - tidak mereset formTimbang, sehingga bila PIC sempat berganti peran ke User/Supervisor lalu kembali ke PIC pada detail yang sama, edit yang sudah dilakukan sebelumnya (key sudah ada) tidak akan ditimpa; item yang belum pernah disentuh tetap terisi otomatis dari perkiraan.
- Tidak ada pemanggilan dari template/computed - dikonfirmasi lewat grep bahwa pastikanBeratTerisi hanya muncul di 3 titik pemanggilan + 1 definisi di b3-waste.ts, nol kemunculan di file .html. Ini penting: bila dipanggil dari binding template, fungsi akan tereksekusi setiap siklus deteksi perubahan - meski secara teknis tetap idempoten (guard "in" tetap berlaku), pemanggilan dari 3 titik event-driven (bukan tiap render) adalah desain yang lebih bersih dan sesuai jejak yang didokumentasikan Frontend.
- Skenario silang-pengajuan diverifikasi manual: PIC buka detail A (approved) -> edit berat -> "Kembali ke daftar" (pilihanId di-null-kan, formTimbang TIDAK direset di titik ini) -> buka detail B (approved lain) via bukaDetail(B.id) -> resetFormAksi() jalan lebih dulu -> berat bersih -> pastikanBeratTerisi(B) mengisi dari perkiraan B, bukan sisa edit A. Tidak ada kontaminasi silang.

Kesimpulan: fix aman dan benar-benar idempoten sesuai definisi yang diminta - tidak ada jalur di mana koreksi PIC yang sudah diketik bisa tertimpa balik ke perkiraan awal user akibat pemanggilan ulang dari titik manapun.

## 5. Guard editable/readonly (status + role)

- editableSekarang = computed(() => this.aksiTersedia().includes('PIC_WEIGH')), dan aksiTersedia = computed(() => aksiUntuk(this.terpilih()?.status, this.peranAktif())).
- Dibaca aksiUntuk() di b3-waste-model.ts (file tidak berubah, tetap sama sejak babak 1, diverifikasi ulang baris 414-426): cabang USER dan SUPERVISOR masing-masing return lebih awal (mengembalikan array kosong/isi lain, tidak pernah menyertakan 'PIC_WEIGH') sebelum kode sampai ke pengecekan status === 'APPROVED' -> ['PIC_WEIGH'] di bagian bawah fungsi (komentar // PIC) - secara struktural mustahil 'PIC_WEIGH' muncul untuk peran selain PIC, terlepas dari status apa pun. Untuk peran PIC sendiri, 'PIC_WEIGH' hanya muncul saat status === 'APPROVED' - status lain (termasuk WEIGHED) mengembalikan array kosong.
- editableSekarang() adalah satu-satunya sumber untuk prop [editable] yang dikirim ke app-b3-dokumen (b3-waste.html baris 172) - dikonfirmasi hanya ada satu pemanggilan app-b3-dokumen mode logbook dengan [editable]="editableSekarang()" di seluruh b3-waste.html, tidak ada jalur kedua/alternatif yang bisa membawa editable=true dengan kondisi berbeda. Panggilan kedua (mode neraca) tidak menerima [editable] sama sekali (default false), dan template Neraca (b3-dokumen.html baris 130-257) memang tidak pernah membaca editable()/items()/beratMap() - nol risiko di sisi Neraca.
- Di dalam B3Dokumen, sel Jenis & Jumlah Masuk hanya menampilkan select/input di dalam @if (editable()) (baris 76, 89 b3-dokumen.html); cabang else selalu teks polos. Karena editable() hanya bisa bernilai true bila diinjeksi dari editableSekarang() yang sudah diverifikasi di atas, tidak ada cara User/Supervisor melihat tabel dalam mode editable, dan status WEIGHED juga otomatis kembali ke readonly (dikonfirmasi verifikasi interaktif Frontend 03-frontend.md 10.3 poin 7: nol elemen .doc-input setelah submit).

Guard editable/readonly PASS - aman terhadap kombinasi role x status yang diminta diverifikasi.

## 6. Header tabel bergaris & text-align:center blanket

- b3-dokumen.css baris 41-57 (.doc-head, .doc-infobox, .doc-meta): dikonfirmasi struktur tabel HTML semantik nyata (table/tbody/tr/td di b3-dokumen.html baris 13-43, 138-157), bukan div dengan border tanpa struktur tabel - border-collapse: collapse + border: 1px solid #333 pada td/th menghasilkan garis tabel Excel-style yang diminta (3 sel: brand | judul | info-box 6-baris), dikonfirmasi juga oleh getComputedStyle Frontend (1px solid rgb(51,51,51), 03-frontend.md 10.3 poin 9). PASS.
- .doc-table td { text-align: center } (baris 63) memang blanket, menggantikan .doc-right yang dihapus (keputusan 10.4 poin 1). Dampak keterbacaan diverifikasi terhadap data master aktual (b3-waste-data.ts): nama jenis limbah terpanjang di seed data sekitar 22 karakter ("Bahan Kimia Kadaluarsa"), field header seperti "Tujuan Penyerahan" (misal "PT. PLIB") juga pendek - pada skala ini center-align tidak menimbulkan regresi keterbacaan yang serius (baris pendek, tidak wrapping berlebihan). Namun untuk data produksi nyata dengan nama lebih panjang, atau kolom "Jenis Limbah B3 Masuk" yang bisa memuat teks 2 baris, rata-tengah multi-baris memang secara umum sedikit lebih sulit dipindai mata dibanding rata-kiri.
- Verdict: Minor, bukan Blocker - sesuai instruksi eksplisit dan konsisten dengan keputusan Frontend yang sudah didokumentasikan beralasan (mengikuti tampilan Excel referensi asli, 10.4 poin 1). Rekomendasi non-wajib: pertimbangkan text-align left khusus untuk kolom "Jenis Limbah B3 Masuk"/"Tujuan Penyerahan" bila field ini nanti diisi teks yang lebih panjang di data produksi sungguhan - tidak menghalangi SHIP prototipe ini.

## 7. Field Perkiraan Berat Tahap 1

- Ditaruh di b3-waste.html baris 72-95, setelah app-waste-picker (baris 67), merender dari formPilihan.items (hasil output pilihanChange) - tidak menyentuh waste-picker.* (dikonfirmasi ulang di Bagian 2 lewat mtime).
- Opsional dikonfirmasi ganda: (a) input tidak punya atribut required, placeholder "opsional"; (b) validasiIsiPengajuan() (di b3-waste-model.ts, tidak berubah) sama sekali tidak memeriksa items[].beratKg - submit dengan berat kosong/0 tidak akan pernah gagal validasi.
- Alur data: formBeratPerkiraan (buffer per-it.id, terpisah dari formPilihan.items supaya tidak tertimpa re-create WastePicker setiap emit) -> ajukan()/ajukanUlang() memetakan beratKg: this.formBeratPerkiraan[it.id] ?? null ke ItemLimbah sebelum dikirim ke reducer SUBMIT/RESUBMIT -> tersimpan di Pengajuan.items[].beratKg. Alir benar, PASS.

## 8. Tab bar & kode mati

Pencarian pola tabAktif untuk 'logbook'/'neraca', serta method lama pratinjauItem/pratinjauLogbook/pratinjauNeraca/setKoreksiJenis, atas seluruh folder menghasilkan nol kecocokan. b3-waste.html hanya memuat 3 tombol tab (Ajukan/Daftar/Notifikasi, baris 29-35). jenisTersedia() dikonfirmasi tunggal - hanya ada di B3Dokumen (dipindah sesuai klaim), nol duplikasi di b3-waste.ts. PASS, tidak ada kode mati tersisa dari penghapusan tab lama (selaras ponytail).

## 9. PDF/print setelah dipindah ke scope per-pengajuan

cetak() di b3-dokumen.ts (baris 76-80) tidak berubah polanya dari babak 2: gerbang body.b3-printing sebelum window.print(), dilepas lewat listener afterprint ({ once: true }). Karena Logbook (mode logbook, toolbar tampil) dan Neraca (mode neraca, toolbar dimatikan) sekarang dirender BERDAMPINGAN di detail satu pengajuan (bukan dua tab terpisah), keduanya sama-sama punya class .b3-doc di DOM saat tombol "Unduh PDF" diklik - CSS media print yang menampilkan .b3-doc (baris 86) mencakup keduanya sekaligus, sehingga satu klik mencetak logbook+neraca pengajuan itu dalam satu dokumen. Ini konsisten dengan niat kontrak amendemen poin 7 ("Unduh dokumen pengajuan ini saja", bukan dua unduhan terpisah) dan sudah diverifikasi interaktif oleh Frontend (verify-print.mjs, 03-frontend.md 10.3). PASS, tidak ada regresi mekanisme print.

## 10. Budget CSS - verifikasi independen

    b3-waste.css      : 2 620 B  (klaim: 2 620 B)      batas 4 kB    PASS
    b3-dokumen.css    : 4 361 B  (klaim: 4 361 B)      batas 8 kB    PASS (naik dari 3 454 B babak 2, sesuai header table + sel editable)
    waste-picker.css  : 2 722 B  (tidak berubah)       batas 5 kB    PASS

Diukur langsung dengan wc -c oleh reviewer (bukan disalin dari laporan) - identik dengan klaim 03-frontend.md 10.2. npm run build (dijalankan ulang reviewer) tidak melaporkan warning anyComponentStyle apa pun, mengonfirmasi build produksi benar-benar lolos budget meskipun B3Waste gabungan (feature-page.css 5 143 B + b3-waste.css 2 620 B kira-kira 7,76 kB) berada di atas ambang warning 6 kB nominal (perilaku ini sudah diverifikasi & diterima sejak ronde 3).

## 11. Build & type-check (dijalankan ulang independen oleh reviewer)

    npx tsc --noEmit -p tsconfig.app.json   -> bersih, nol error
    npm run build                            -> sukses, nol error, nol warning
    main-QDXMPMBX.js    | main   | 437.58 kB | 109.18 kB
    styles-YPAUNJMG.css | styles |   1.12 kB | 477 bytes

Konsisten dengan klaim Frontend (ukuran bundle hampir identik, selisih wajar dari hash build). PASS.

## 12. Ponytail review - kesederhanaan struktur ronde ini

1. Penghapusan computed global logbook/logbookBlok/neraca (Bagian 3) adalah pemangkasan yang tepat - UI-nya (tab global) sudah dihapus dan tidak ada pemanggil lain; fungsi murni di b3-waste-logbook.ts tetap utuh untuk dipakai lagi nanti. Ini contoh baik "kode yang tak ditulis/dipertahankan tanpa pemanggil = nol bug".
2. B3Dokumen tetap presentational murni (Bagian 5, keputusan 10.4 poin 3) - jenisTersedia()/onJenisSelect() yang dipindah ke sana hanya lookup atas data statis (MASTER_DEPARTEMEN), bukan logika bisnis baru; parent (B3Waste) tetap satu-satunya pemilik buffer edit (formTimbang). Tidak ada abstraksi/lapisan baru (tidak ada service/store) ditambahkan untuk mendukung editability - sesuai prinsip minimal.
3. Kelas CSS doc-right/doc-center yang jadi no-op di markup HTML (disebutkan di 10.4 poin 1) sengaja tidak dibersihkan satu-satu - biaya diff tinggi, manfaat nol karena sudah identik dengan default baru. Ini keputusan pragmatis yang wajar, dicatat sebagai catatan bukan temuan baru (tidak ada baris CSS mati - kelasnya cuma tidak lagi berefek, HTML-nya tetap valid).
4. .input-sm di b3-waste.css tetap dipakai (tabel Perkiraan Berat Tahap 1) - dikonfirmasi bukan sisa kode mati, meski nama kelas yang sama dipakai sebelumnya untuk dropdown jenis babak 2 (sudah dihapus bersama select.input-sm). Tidak ada duplikasi definisi kelas.
5. Nol dependency baru (package.json tidak disentuh, dikonfirmasi tidak ada di daftar file yang berubah pada Bagian 2).

Tidak ada temuan ponytail yang mengharuskan perubahan sebelum SHIP.

## 13. Verdict

APPROVED.

Ringkasan bukti:
- Scope 100% sesuai klaim: hanya 6 file berubah, waste-picker.*/b3-waste-model.ts/b3-waste-data.ts/b3-waste-logbook.ts dikonfirmasi identik lewat mtime yang PERSIS SAMA dengan audit ronde 3 (Bagian 2).
- P-1 tetap utuh: bangunLogbook/kelompokkanLogbook/hitungNeraca byte-identik dengan ronde 3 (tidak diaudit ulang isinya, cukup dikonfirmasi tak berubah), hanya scope pemanggilan berubah jadi array 1 elemen; computed global lama dihapus bersih tanpa sisa kode mati (Bagian 3).
- pastikanBeratTerisi() aman dan idempoten - guard "in" (bukan "??") memastikan key yang sudah pernah diisi (oleh sistem maupun PIC) tidak pernah tertimpa ulang; 3 titik pemanggilan ditelusuri satu per satu, tidak ada jalur balapan atau kontaminasi silang-pengajuan (Bagian 4). Ini adalah risiko tertinggi dari revisi ini dan lolos verifikasi mendalam.
- Guard editable/readonly benar secara struktural - aksiUntuk() membuat 'PIC_WEIGH' mustahil muncul untuk peran non-PIC di level fungsi murni (return awal per-peran), dan hanya ada satu titik injeksi [editable] di seluruh template - tidak ada celah bagi User/Supervisor melihat tabel dalam mode editable (Bagian 5).
- Header tabel bergaris terverifikasi struktur tabel semantik nyata (bukan div+border); text-align:center blanket dicatat sebagai 1 Minor (dampak kecil pada data master saat ini, keputusan beralasan, tidak memblokir) (Bagian 6).
- Field Perkiraan Berat Tahap 1 opsional dikonfirmasi tidak mempengaruhi validasi submit, alir data ke ItemLimbah.beratKg benar (Bagian 7).
- Tab bar bersih (3 tombol saja), nol kode mati dari penghapusan tab Logbook/Neraca lama (Bagian 8).
- PDF print tetap berfungsi setelah dipindah ke scope per-pengajuan, mencetak logbook+neraca sekaligus sesuai niat kontrak (Bagian 9).
- Budget CSS diverifikasi independen (wc -c), npm run build dan npx tsc --noEmit dijalankan ulang oleh reviewer sendiri, keduanya bersih (Bagian 10-11).
- Ponytail: nol temuan yang mengharuskan perubahan; penghapusan computed global adalah pemangkasan kode mati yang tepat (Bagian 12).

Nol Blocker, nol Major, 1 Minor (tidak wajib diperbaiki sebelum SHIP - dicatat untuk pertimbangan masa depan bila data produksi punya teks lebih panjang), 2 Nit carry-over (tidak baru, tidak memblokir).

Tidak ada perbaikan wajib untuk lanjut. Rekomendasi: lanjut ke QA untuk verifikasi runtime/visual atas 9 poin Amandemen 2 (khususnya guard editable/readonly lintas role dan skenario pastikanBeratTerisi() yang sudah diverifikasi Frontend lewat Playwright di 03-frontend.md 10.3, layak direplikasi independen oleh QA) - review kode statis ronde ini mengonfirmasi korektnes struktural dan keamanan fix, bukan pengganti verifikasi interaksi browser nyata.

---

# RONDE 5 - Amandemen 3: fix print + simplifikasi Logbook (2026-08-16)

## 0. Konteks ronde ini

Bug ditemukan setelah SHIP (round 4 APPROVE): "Unduh PDF" hanya mencetak Neraca, Logbook hilang. Root cause sudah didiagnosis orchestrator di logbook-neraca-format-reference.md AMANDEMEN 3 (dua .b3-doc sama-sama position:absolute; top:0; left:0 saat print, bertumpuk). Sekaligus permintaan penyederhanaan: Logbook jadi satu tabel gabungan, kapasitas 20 baris/halaman, padding baris kosong, pagination otomatis lebih dari 20 baris. File yang diklaim berubah: b3-waste-logbook.ts, b3-dokumen.ts/.html/.css, b3-waste.html, b3-waste-data.ts (revert sementara seed 25-item).

Review ini dilakukan dengan verifikasi independen: bukan hanya baca kode, tapi render sungguhan lewat ng serve + Playwright Chromium headless, termasuk generate PDF sungguhan (page.pdf()) dan menghitung/membaca isi halaman per halaman dengan pypdf - bukan cuma getBoundingClientRect()/getComputedStyle() di DOM kontinu seperti yang dilakukan Frontend di laporannya (11.3). Ini penting karena bug print hanya benar-benar bisa dibuktikan lewat pipeline pagination cetak sungguhan, bukan lewat pengecekan posisi elemen di layar biasa.

## 1. Ringkasan Severity (ronde 5)

| Severity | Jumlah |
|---|---|
| Blocker | 1 |
| Major | 1 |
| Minor | 2 |
| Nit | 1 |

## 2. Audit scope (mtime independen)

Dijalankan Get-ChildItem -Recurse -File atas frontend/src disaring LastWriteTime lebih besar dari 2026-08-16 00:00:00. Hasil - PERSIS 6 file, semua di dalam pages/b3-waste/, cocok 100% dengan klaim Frontend di 11.1:

```
b3-waste-logbook.ts   10:44:16
b3-dokumen.ts         10:44:38
b3-dokumen.html       10:45:15
b3-dokumen.css        10:45:36
b3-waste.html         10:45:45
b3-waste-data.ts      10:50:43
```

Nol file lain (termasuk b3-waste.ts, b3-waste.css, waste-picker.*) tersentuh - dikonfirmasi tidak ada di daftar ini meski berada di folder yang sama. Nol file di luar pages/b3-waste/ tersentuh. PASS.

## 3. Revert seed data 25-item (test sementara)

b3-waste-data.ts baris 231 memuat array items dengan persis 3 elemen buatItem, cocok dengan yang diklaim Frontend sebagai nilai asli setelah revert. Pencarian atas seluruh folder untuk pola TEMP-TEST/PAGINATION/25-item mencurigakan: nol hasil. PASS - tidak ada sisa data test tertinggal.

## 4. kelompokkanLogbook() - audit isi (bukan cuma percaya laporan)

Dibaca isi fungsi penuh di b3-waste-logbook.ts baris 166-188: mengelompokkan entries per kode (Map), menghitung totalMasukKg/totalKeluarKg/sisaKg per blok, sort hasil per kode ascending. Logikanya konsisten dengan deskripsi kontrak 15.3 dan dengan bagaimana hitungNeraca()/dokBlok() di b3-waste.ts memakainya (tidak berubah pola pemanggilan). Tidak ada git repo untuk diff literal sebelum/sesudah, tapi: (a) hitungNeraca() letaknya persis setelah halamanLogbook() yang baru (fungsi baru disisipkan di antara kelompokkanLogbook() dan hitungNeraca(), bukan menimpa keduanya - konsisten dengan klaim "+14 baris, ditaruh sebelum hitungNeraca()"); (b) isi hitungNeraca() tidak mengandung indikasi perubahan (masih pola agregasi per-kode yang sama, KATEGORI_PERLAKUAN, kinerjaPersen dari kg bukan Ton - identik dengan yang diverifikasi Ronde 4). Tidak ditemukan penyimpangan. Neraca aman dari kebocoran perubahan.

## 5. halamanLogbook() - murni dan benar

Ditulis di b3-waste-logbook.ts (fungsi baru, sebelum hitungNeraca()): flatten seluruh entries dari blok (blok.flatMap), lalu chunk per kapasitas pakai slice di dalam loop. Tidak ada satu baris pun yang menulis balik ke blok atau ke b.entries.

- Tidak memutasi input - flatMap dan slice keduanya menghasilkan array baru.
- Tidak menghasilkan baris kosong di level data - hanya flatten+chunk atas entries asli, tidak menyisipkan objek placeholder apa pun. Padding baris kosong sepenuhnya di template (b3-dokumen.html baris 108-117, blok at-for padding(pg.length)), TIDAK bocor ke LogbookEntry[] yang sama yang dipakai hitungNeraca(). PASS - risiko "kebocoran baris palsu ke Neraca" yang diminta diperiksa terbukti TIDAK terjadi (dikonfirmasi baca kode: hitungNeraca(entries) selalu dipanggil dengan hasil bangunLogbook(), bukan hasil halamanLogbook()/padding()).
- Urutan tetap terjaga (mengikuti urutan blok yang sudah disortir per-kode oleh kelompokkanLogbook()).

## 6. P-1 tetap utuh

Pencarian pola signal( di b3-dokumen.ts: nol hasil. halaman()/padding() adalah plain method (bukan computed()/signal()), konsisten pola jenisTersedia() yang sudah diaudit Ronde 4. b3-waste.ts (pemilik satu-satunya proyeksi state via computed) tidak disentuh sama sekali ronde ini (dikonfirmasi via mtime bagian 2) - nol risiko regresi P-1 di sana. PASS.

## 7. Fix bug print - CSS root cause

.b3-doc individual tidak lagi mendapat position:absolute (dikonfirmasi baca b3-dokumen.css baris 101-105: hanya margin:0; border:none; break-inside:auto). position:absolute; top:0; left:0; width:100% sekarang hanya pada .b3-print-root (baris 95-100). Wrapper ini membungkus KEDUA app-b3-dokumen di b3-waste.html baris 171-182 (dikonfirmasi baca markup langsung - satu div class b3-print-root membungkus mode logbook dan mode neraca). Di dalam wrapper, .b3-doc alur normal (statis), bertumpuk vertikal, dipisah break-before:page. Desain fix sesuai kontrak AMANDEMEN 3 nomor 1 secara struktural.

### 7.1 Verifikasi independen kasus NORMAL (data ada) - PASS

Skenario: PLB3/2026/0001 (3 item), diisi berat via sel editable PIC, body class b3-printing ditambah + emulateMedia print, lalu generate PDF sungguhan via page.pdf (landscape true, format A4, printBackground true) dan dibaca dengan pypdf. Hasil: 4 halaman, urutan benar (Logbook header+sebagian tabel, lanjutan tabel Logbook, Neraca, lanjutan Neraca/tembusan), tidak ada tumpang tindih Logbook/Neraca, tidak ada halaman kosong di kasus ini. Ini membuktikan bug asli (Neraca menutupi Logbook) memang teratasi untuk kasus normal.

### 7.2 BLOCKER BARU ditemukan - halaman kosong di depan PDF saat Logbook belum ada data (status pra-WEIGHED)

Kontrak Amandemen 2 (10.4 keputusan nomor 6, dipertahankan) membuat app-b3-dokumen dirender untuk SEMUA status pengajuan, bukan cuma WEIGHED. Untuk status pra-WEIGHED (WAIT_SUP/REJ_SUP/WAIT_PIC/REJ_PIC/APPROVED sebelum submit timbang - mayoritas siklus hidup satu pengajuan), bangunLogbook([p]) mengembalikan array kosong, blok().length jadi 0, Logbook jatuh ke .doc-empty ("Belum ada data logbook...") yang BUKAN .b3-doc, sementara Neraca tetap render penuh sebagai .b3-doc.doc-neraca (kosong tapi tetap .b3-doc, sesuai kontrak S13/AC-41 lama). Tombol Unduh PDF tetap tersedia dan bisa dipicu di status ini.

Reproduksi dan bukti (dilakukan sendiri, independen dari klaim Frontend):

1. Buka PLB3/2026/0002 (status WAIT_PIC / "Disetujui Supervisor" di seed data - representatif untuk seluruh status pra-WEIGHED).
2. Tambahkan class b3-printing ke body, generate PDF sungguhan (bukan cuma cek CSS) via page.pdf (landscape true, format A4, printBackground true).
3. Baca PDF dengan pypdf.PdfReader - hasil 3 halaman total. Isi per halaman:
   - Halaman 0: KOSONG TOTAL (extract_text() mengembalikan string kosong, nol karakter).
   - Halaman 1: mulai "PT. Amerta Indah Otsuka NERACA LIMBAH BAHAN BERACUN DAN BERBAHAYA...".
   - Halaman 2: lanjutan footer/tembusan Neraca.

Root cause (diverifikasi lewat pengukuran DOM langsung, bukan tebakan): di dalam .b3-print-root, .doc-neraca berada top 69px (bukan 0) karena .doc-empty (placeholder teks Logbook kosong) tetap visibility hidden (BUKAN display none) sesuai aturan global body.b3-printing semua elemen jadi visibility hidden - elemen ini tetap menempati ruang di alur dokumen (69px). Aturan baru body.b3-printing .doc-neraca break-before page (ditambahkan ronde ini, kontrak AMANDEMEN 3 keputusan nomor 2 di 11.4) memaksa page-break tepat sebelum .doc-neraca tanpa syarat, tidak peduli apakah ada Logbook .b3-doc yang benar-benar tercetak sebelumnya atau tidak. Akibatnya 69px ruang kosong (dari elemen .doc-empty yang hidden tapi memakan ruang) itu sendiri dipaksa jadi halaman penuh tersendiri (kosong, karena isinya invisible) sebelum Neraca boleh mulai di halaman berikutnya.

Ini adalah regresi BARU dari ronde ini sendiri - aturan .doc-neraca break-before page sama sekali tidak ada sebelum ronde 5 (sebelumnya cuma ada .doc-logbook plus .doc-logbook break-before page, sibling selector yang otomatis tidak berlaku kalau tidak ada elemen sebelumnya). Menambahkan break-before langsung ke .doc-neraca (dipilih karena sibling selector tidak menjangkau lintas host component, sudah benar untuk kasus ADA Logbook) tidak mempertimbangkan kasus Logbook kosong, di mana forced break itu sendiri yang menciptakan halaman kosong - persis jenis bug yang harusnya sedang diperbaiki di ronde ini (halaman kosong ekstra tak disengaja).

Dampak: setiap kali PIC/Supervisor/User mengklik Unduh PDF pada pengajuan yang belum WEIGHED (mayoritas siklus hidup pengajuan - status WAIT_SUP/REJ_SUP/WAIT_PIC/REJ_PIC/APPROVED pra-timbang), hasil PDF akan diawali halaman kosong. Ini jelas bukan "sudah teratasi" secara mutlak seperti yang diklaim laporan Frontend 11.3-A (yang HANYA menguji kasus status WEIGHED dengan Logbook terisi).

File dan lokasi: frontend/src/app/pages/b3-waste/b3-dokumen.css baris 107-108 (aturan gabungan .doc-logbook plus .doc-logbook dan .doc-neraca break-before page).

Saran fix: syaratkan break-before pada .doc-neraca hanya berlaku bila didahului elemen .doc-logbook yang benar-benar tercetak - opsi realistis: pindahkan keputusan "apakah perlu page-break sebelum Neraca" ke TEMPLATE (kondisional class doc-neraca-break yang di-set true hanya bila blok().length lebih dari 0, dikontrol dari induk yang tahu apakah Logbook kosong atau tidak), bukan CSS unconditional. Alternatif memberi .doc-empty display none saat print tidak cukup - forced break tetap akan membuat Neraca mulai di halaman baru meski tidak ada apa pun mendahuluinya, dan suppression break pertama secara default browser tidak konsisten diandalkan di sini karena .doc-empty (walau hidden) tetap terhitung sebagai node mendahului dalam alur. Perlu diuji ulang dengan PDF sungguhan setelah fix, bukan cuma getComputedStyle.

## 8. MAJOR - satu "halaman" Logbook (20 baris) tidak muat dalam satu halaman cetak fisik

Kontrak AMANDEMEN 3 nomor 3 eksplisit: "Logbook harus tampil PENUH SATU KERTAS ... walaupun kosong saat dijadikan pdf tidak apa apa" - asumsi implisitnya: 20 baris (dipadatkan) sama dengan tepat satu halaman fisik saat dicetak.

Diukur langsung (bukan asumsi): pada kasus normal (PLB3/2026/0001, 3 baris data plus 17 padding jadi 20 baris total, mode editable/preview PIC), tinggi aktual .doc-logbook (getBoundingClientRect height, di bawah emulateMedia print) sama dengan 806px. Sementara aturan at-page size A4 landscape margin 8mm yang dideklarasikan di b3-dokumen.css baris 110 memberi area cetak usable sekitar 733px (194mm pada 96dpi) - bahkan dengan asumsi paling longgar (margin 0 sama sekali, sekitar 794px), tinggi .doc-logbook (806px) tetap melebihi budget halaman. Konsekuensinya (dikonfirmasi lewat page.pdf plus pypdf pada kasus normal 7.1 di atas): tabel 20-baris tunggal itu terpotong otomatis oleh browser jadi 2 halaman fisik (header tabel terulang di halaman lanjutan, footer tanda tangan "Diperiksa oleh/Disetujui oleh" berakhir terpisah sendirian di halaman ke-2) - bukan satu lembar utuh seperti yang diminta kontrak.

Ini bukan kasus langka - karena setiap halaman Logbook sekarang selalu dipadatkan tepat 20 baris (baik data asli sedikit maupun banyak, lihat bagian 5), overflow ini terjadi pada setiap pengajuan yang dicetak, 100 persen reproducible dengan CSS saat ini. Ini kemungkinan besar tidak akan terjadi sebelum ronde ini (tabel per-blok lama panjangnya bervariasi mengikuti jumlah item asli, seringkali jauh di bawah 20 baris, sehingga kemungkinan muat satu halaman jauh lebih tinggi) - jadi ini efek samping baru dari keputusan "padatkan selalu sampai 20 baris".

Kenapa lolos verifikasi Frontend: laporan 11.3-A/B Frontend memverifikasi lewat getBoundingClientRect di DOM kontinu (bukan hasil render halaman-demi-halaman sungguhan) dan hanya membandingkan posisi top antar elemen .b3-doc (untuk membuktikan tidak bertumpuk) - metode ini tidak bisa mendeteksi apakah satu elemen itu sendiri melebihi tinggi satu halaman cetak. Perlu generate PDF sungguhan (seperti dilakukan reviewer di sini) untuk menangkap ini.

File dan lokasi: b3-dokumen.css (ukuran font/padding sel .doc-table td baris 65, .doc-head/.doc-meta/.doc-foot - kombinasi tinggi elemen-elemen ini yang melebihi budget), berinteraksi dengan keputusan kapasitas tetap 20 di b3-dokumen.ts baris 68 (KAPASITAS_LOGBOOK sama dengan 20).

Saran fix (pilih salah satu, bukan resep tunggal): (a) kecilkan font-size/padding sel tabel cetak sedikit sampai 20 baris plus header plus footer benar-benar muat di bawah budget terukur, atau (b) turunkan kapasitas efektif (misalnya 18) sambil tetap dokumentasikan sebagai asumsi yang bisa dikoreksi (kontrak sendiri menyebut "asumsi, bisa dikoreksi user kalau salah"), atau (c) kecilkan margin at-page - lalu wajib diverifikasi ulang dengan page.pdf sungguhan plus pengukuran tinggi aktual, bukan cuma npm run build atau cek visual layar biasa.

## 9. Pagination lebih dari 20 baris dan transisi Logbook ke Neraca (mekanisme, terlepas dari temuan bagian 8)

Logika halamanLogbook()/padding()/at-for di template sudah benar secara struktural: chunk per 20 tetap urut per-kode, halaman terakhir dipadatkan, tiap halaman dapat header/footer sendiri, aturan .doc-logbook plus .doc-logbook break-before page bekerja untuk sesama Logbook (sibling asli dalam satu host component - selector adjacent-sibling valid di sini, tidak seperti kasus lintas-host Logbook ke Neraca). Tidak ditemukan bug logika pagination selain overflow fisik di bagian 8 dan blank-page di bagian 7.2.

## 10. Build dan type-check (independen)

npx tsc --noEmit -p tsconfig.app.json -> bersih, nol error (dijalankan ulang oleh reviewer).
npm run build -> sukses, nol error, nol warning (dijalankan ulang oleh reviewer).
main-MLUCKJJW.js main 438.42 kB, transfer 109.36 kB. styles-YPAUNJMG.css 1.12 kB, transfer 477 bytes.

Angka identik dengan klaim Frontend 11.2. PASS - tapi build/tsc hijau tidak cukup untuk menangkap dua temuan di atas (keduanya murni bug rendering/CSS cetak, tidak terdeteksi compiler).

## 11. Ponytail review - kesederhanaan ronde ini

- Minor: kelas doc-row-empty dipakai di template (b3-dokumen.html baris 111) tapi tidak punya rule CSS sama sekali di b3-dokumen.css (pencarian pola doc-row-empty di b3-dokumen.css - nol hasil). Bukan bug fungsional (baris tetap tampil, cuma tanpa styling pembeda dari baris data), tapi ini hook mati - baik dihapus (kalau memang tidak perlu dibedakan visual) atau diisi rule-nya (kalau maksudnya baris kosong perlu dibedakan, misalnya warna abu-abu tipis) supaya tidak ambigu untuk pembaca kode berikutnya.
- Penghapusan total .doc-blok-title (CSS dan HTML, tidak disisakan dead selector) - rapi, sesuai prinsip ponytail, tidak ada temuan.
- halaman() dipanggil ulang di dalam at-for untuk halaman().length (baris info kotak "Halaman X dari Y", b3-dokumen.html baris 28) - artinya fungsi murni ini dieksekusi ulang (flatten+chunk) setiap iterasi at-for luar, bukan cuma sekali. Untuk maksimal puluhan baris ini murah secara komputasi (bukan masalah performa nyata), tapi kalau ingin lebih bersih bisa dihitung sekali dengan variabel lokal at-let. Nit, tidak wajib diperbaiki.
- Tidak ditemukan dependency baru, duplikasi baru, atau abstraksi berlebih di 6 file yang diubah ronde ini - perubahan aditif yang proporsional dengan kebutuhan kontrak.

## 12. Verdict RONDE 5

CHANGES REQUESTED.

Klaim Frontend "bug print benar-benar teratasi" BENAR untuk skenario yang mereka uji (status WEIGHED, Logbook berisi data) - tumpang-tindih Logbook/Neraca yang asli memang sudah tidak terjadi lagi, dikonfirmasi lewat PDF sungguhan (bagian 7.1). TAPI KLAIM ITU TIDAK LENGKAP: ronde ini memperkenalkan regresi baru (halaman kosong di depan PDF untuk status pra-WEIGHED, bagian 7.2 - BLOCKER) dan mengekspos pelanggaran kontrak "satu halaman Logbook sama dengan satu kertas" yang selama ini tidak pernah diuji dengan render cetak sungguhan (bagian 8 - MAJOR). Jawaban eksplisit ke pertanyaan "apakah bug print benar-benar teratasi": TIDAK SEPENUHNYA - sebagian teratasi (kasus data lengkap), sebagian bermasalah dengan cara baru (kasus data kosong/pra-timbang, dan overflow fisik satu halaman).

Perbaikan wajib sebelum lolos (Frontend):
1. [BLOCKER] Perbaiki aturan body.b3-printing .doc-neraca break-before page di b3-dokumen.css supaya tidak memaksa halaman kosong ketika tidak ada .doc-logbook yang benar-benar tercetak sebelumnya (lihat saran fix di bagian 7.2). Verifikasi ulang wajib pakai page.pdf sungguhan (atau setara) plus pembacaan isi per halaman, bukan cuma getComputedStyle/getBoundingClientRect di DOM kontinu.
2. [MAJOR] Pastikan satu halaman Logbook (20 baris plus header plus meta plus footer) benar-benar muat dalam satu halaman fisik at-page yang dideklarasikan (lihat opsi fix di bagian 8). Verifikasi ulang wajib mengukur tinggi aktual elemen vs area cetak, dan/atau generate PDF sungguhan lalu hitung jumlah halaman per skenario (kosong, 1-20 baris, lebih dari 20 baris).
3. [Minor, disarankan sekalian] Isi atau hapus rule CSS untuk .doc-row-empty (bagian 11).

Setelah kedua item wajib diperbaiki, wajib retest ketiga skenario (kosong/normal/lebih dari 20 baris) dengan PDF sungguhan sebelum diajukan ulang ke Code Review.

---

# RONDE 6 - Verifikasi fix Ronde 5 (blank page + Logbook overflow) dengan PDF sungguhan (2026-08-16)

## 0. Konteks ronde ini

Ronde 5 (reviewer sendiri): CHANGES REQUESTED - 1 BLOCKER (halaman kosong di depan PDF untuk status pra-WEIGHED) + 1 MAJOR (tabel Logbook 20-baris tidak muat 1 halaman fisik). Frontend melaporkan (03-frontend.md Bagian 12) kedua defect sudah diperbaiki, plus 1 defect tambahan yang mereka temukan sendiri saat verifikasi ulang (halaman kosong di EKOR PDF, akibat elemen visibility:hidden yang tetap memakan ruang layout).

Metodologi ronde ini identik dengan ronde 5: ng serve sungguhan (port 4400) plus Playwright Chromium headless plus page.pdf format A4 landscape printBackground true plus pypdf.PdfReader (Python 3.13, path eksplisit C colon backslash Python313 backslash python.exe - alias python dan python3 bawaan Windows Store tidak berfungsi) untuk menghitung halaman dan mengekstrak teks per halaman. Build dan tsc dijalankan ulang independen. Seed data diperbesar sementara (20 lalu 25 item, ditambah 1 langkah PIC_WEIGH) via script Node (patch_seed.mjs, disimpan di scratchpad, mencari-ganti blok nomor 1 PLB3 2026 0001 persis) untuk skenario B dan C, lalu direvert - setiap revert dikonfirmasi bersih lewat diff byte-identik terhadap salinan asli yang diambil SEBELUM sesi ini menyentuh file.

## 1. Verifikasi fix BLOCKER (halaman kosong depan) plus defect tambahan (halaman kosong ekor)

Skenario A - status pra-WEIGHED, PDF sungguhan:

| Pengajuan | Status | Jumlah halaman PDF (hasil reviewer) | Klaim Frontend (12.5) |
|---|---|---|---|
| PLB3 2026 0002 | WAIT_PIC (Disetujui Supervisor) | 1, chars=1257, langsung mulai teks Neraca | 1 |
| PLB3 2026 0003 | WAIT_SUP (Diajukan) | 1, chars=1257, langsung mulai teks Neraca | 1 |

Nol halaman dengan extract_text() kosong pada kedua PDF ini - blocker asli (halaman kosong di depan) dan defect tambahan (halaman kosong di ekor, dari elemen visibility:hidden yang tetap memakan ruang layout) keduanya dikonfirmasi TERTUTUP, cocok 100 persen dengan klaim Frontend.

Analisis kode fix (dibaca independen):
- b3-dokumen.ts baris 63: input baru breakBefore = input boolean default true, dipakai hanya oleh instance mode neraca.
- b3-dokumen.html baris 160: section b3-doc doc-neraca dengan class binding doc-neraca-break dikondisikan breakBefore() - class binding kondisional, bukan lagi CSS unconditional.
- b3-waste.html baris 183: app-b3-dokumen mode neraca diberi breakBefore sama dengan dokBlok(p).length lebih besar dari 0 - kondisi sama persis dengan yang dipakai untuk memutuskan Logbook kosong-atau-tidak, satu sumber kebenaran, konsisten.
- b3-dokumen.css baris 108-136: aturan wildcard body.b3-printing semua elemen visibility hidden height 0 min-height 0 overflow hidden, dengan pengecualian eksplisit b3-print-root dan b3-doc serta turunannya (height auto, overflow visible).

Verifikasi keamanan pengecualian (poin 2 mandat orchestrator) - dilakukan independen, bukan percaya klaim Frontend:
Pencarian pola posisi relative absolute fixed sticky atas SELURUH frontend/src/app (bukan cuma layout folder): satu-satunya hasil di luar b3-dokumen.css sendiri adalah layout.css baris 135, topbar diberi position sticky. Dibaca layout.html: topbar adalah SIBLING dari main content yang membungkus router-outlet (keduanya anak dari div class main), BUKAN ancestor dari router-outlet atau b3-print-root. Juga digrep properti lain yang bisa membentuk containing block baru untuk position absolute (transform, filter, perspective, contain, will-change) atas seluruh src/app - satu-satunya transform yang ditemukan (layout.css baris 95, chevron sidebar saat grup terbuka) ada di elemen chevron sidebar, juga bukan ancestor b3-print-root. Kesimpulan: klaim aman tidak ada ancestor positioned adalah BENAR, diverifikasi lewat pencarian yang lebih luas dari yang dilaporkan Frontend (mereka hanya menyebut cek folder layout; reviewer menggrep seluruh src/app).

Verdict bagian ini: PASS, fix BLOCKER plus defect tambahan tertutup, diverifikasi ulang independen dengan PDF sungguhan plus audit CSS containing-block.

## 2. Verifikasi fix MAJOR (Logbook 20-baris) - PASS untuk kasus yang diuji Frontend, TAPI ditemukan MAJOR BARU (fragilitas kolom teks bebas)

### 2.1 Reproduksi persis klaim Frontend (nilai field pendek, sesuai contoh baku logbook-neraca-format-reference.md: Tujuan Penyerahan selalu diisi PT. PLIB di sample)

Seed PLB3 2026 0001 diperbesar sementara jadi 20 item lintas 4 departemen (checksum kombinasi dept+sumber+kode dijaga unik) plus 1 langkah PIC_WEIGH dengan tujuan diisi PT. PLIB dan noManifest diisi MNF-2608-001 (format pendek yang sama dengan placeholder resmi b3-waste.html baris 159, contoh MNF-2608-001):

| Skenario | Jumlah item | Jumlah halaman PDF | Rincian |
|---|---|---|---|
| B (reviewer) | 20 | 3 | Hal.0 = Logbook lengkap, Halaman 1 dari 1, 20 baris data plus footer tanda tangan, SEMUA di 1 halaman; Hal.1-2 = Neraca |
| C (reviewer, 25 item) | 25 | 4 | Hal.0 Logbook Halaman 1 dari 2 (20 baris penuh), Hal.1 Logbook Halaman 2 dari 2 (5 baris plus 15 padding), Hal.2-3 Neraca |

Cocok 100 persen dengan klaim Frontend 12.5 (Skenario B: 3 halaman; Skenario C: 4 halaman). Fix table-layout fixed plus colgroup 13 kolom dan densitas CSS bekerja benar untuk kasus yang mereka uji.

### 2.2 MAJOR BARU - fix rapuh terhadap panjang teks realistis pada field bebas yang SAMA untuk seluruh baris (tujuan, noManifest)

b3-waste.html baris 155-159 mengonfirmasi Tujuan Penyerahan dan No. Manifest adalah input text tanpa maxlength, dan b3-waste-logbook.ts baris 150-151 dan 288-289 mengonfirmasi kedua field ini adalah field bersama (IsiTimbang.tujuan dan IsiTimbang.noManifest) yang disalin identik ke SETIAP baris LogbookEntry dalam satu pengajuan (bukan per-item) - artinya bila PIC mengetik nilai yang realistis lebih panjang dari contoh baku PT. PLIB atau MNF-2608-001, SELURUH 20 baris ikut melebar bersamaan, bukan cuma satu baris outlier.

Diuji ulang (seed 20-item yang sama, hanya field tujuan/noManifest diganti, sisanya identik) - direvert bersih setelah tiap pengukuran, dikonfirmasi diff byte-identik tiap kali:

| Nilai tujuan diuji | Panjang | Hasil wrap | Halaman PDF |
|---|---|---|---|
| PT. PLIB (baku referensi) | 8 karakter | Tidak wrap | 3 (sesuai klaim) |
| PT Wastec International (nama vendor B3 nyata dan masuk akal) | 24 karakter | Tidak wrap, pas di batas | 3 |
| PT Pengelola Limbah Sukabumi | 29 karakter | WRAP 2 baris di SEMUA 20 baris | 4 - tabel Logbook terpotong jadi 2 halaman lagi (halaman kedua dimulai dengan header tabel yang terulang, footer tanda tangan lepas di halaman lanjutan) |
| PT Prasadha Pamunah Limbah Industri (nama perusahaan pengolah limbah B3 berizin nyata di Indonesia) | 36 karakter | Wrap 2 baris di semua baris | 4 - regresi identik |

Diuji juga kolom Bukti Nomor Dokumen (noManifest, lebar kolom cuma 10 persen dari lebar tabel - LEBIH sempit dari kolom tujuan yang 13 persen) dengan tujuan dikembalikan pendek: nilai realistis MNF garis miring 2026 garis miring VIII garis miring 00123 dash A (22 karakter, meniru format penomoran manifest B3 Indonesia yang lazim pakai tanda garis miring dan angka romawi) - hasil sama: 4 halaman, tabel Logbook kembali terpotong.

Ini adalah reproduksi PERSIS bug MAJOR ronde 5 (tabel 20-baris terpotong 2 halaman fisik), muncul kembali lewat jalur yang berbeda: fix ronde 6 (table-layout fixed plus lebar kolom tetap plus densitas) terbukti benar untuk PANJANG TEKS yang dipakai di contoh baku demo, tapi tidak divalidasi terhadap rentang panjang realistis untuk 2 field bebas (tujuan, noManifest) yang nilainya digandakan ke SEMUA baris sekaligus - jauh lebih sensitif terhadap overflow dibanding field per-baris (misalnya nama jenis limbah, yang sudah diuji Frontend terhadap nilai terpanjang di master data). Klaim headroom sekitar 170px (12.3 dan 12.5) hanya berlaku untuk kombinasi teks pendek spesifik yang diuji; margin sesungguhnya jauh lebih tipis dan sudah terlampaui hanya dengan SATU field yang realistis (bukan ekstrem) lebih panjang dari contoh baku.

Tidak ada mitigasi apa pun di kode untuk kasus ini: tidak ada maxlength di input, tidak ada text-overflow ellipsis atau pembatasan baris di CSS kolom tujuan/noManifest, tidak ada penyesuaian dinamis kapasitas atau ukuran font berdasar panjang konten aktual.

Severity: MAJOR. Bukan skenario ekstrem atau adversarial - PT. PLIB adalah nilai CONTOH di dokumen referensi, bukan batasan sistem; nama vendor pengolah limbah B3 sungguhan di Indonesia lazim lebih panjang dari itu (dibuktikan dengan 2 nama vendor nyata di atas). Setiap pengajuan dengan tepat 20 item (atau kelipatan 20 pada halaman terakhir) DAN nilai tujuan/noManifest yang realistis-panjang akan mereproduksi bug tabel terpotong 2 halaman fisik yang seharusnya sudah ditutup ronde ini.

File dan lokasi: b3-dokumen.html baris 54-60 (colgroup, lebar kolom tujuan 13 persen dan noManifest 10 persen tetap, tidak elastis terhadap panjang konten realistis), b3-waste.html baris 155-159 (input tanpa maxlength), b3-dokumen.css baris 69-75 (doc-table-logbook td memakai word-break break-word - membantu mencegah overflow horizontal tapi TIDAK mencegah pertambahan tinggi baris/halaman).

Saran fix (bukan resep tunggal, wajib diverifikasi ulang dengan page.pdf sungguhan memakai nilai realistis-panjang seperti di atas, bukan cuma nilai demo pendek):
1. Tambahkan maxlength wajar (misalnya 30 sampai 40) pada input tujuan dan noManifest DAN pastikan lewat pengukuran nyata bahwa batas itu (worst-case, di-wrap 2 baris di SEMUA 20 baris sekaligus karena field ini bersama) tetap muat 1 halaman fisik - bukan angka yang ditebak.
2. Atau: white-space nowrap, overflow hidden, text-overflow ellipsis pada sel tujuan/noManifest saat cetak (mengorbankan keterbacaan penuh demi kepastian tinggi baris tetap konstan) - lazim untuk dokumen tabular formal yang punya batas fisik kertas.
3. Atau: naikkan lagi headroom (kurangi padding/font lebih jauh, atau kecilkan margin halaman cetak) sampai worst-case 2-baris-di-semua-20-baris untuk KEDUA kolom bebas ini terbukti muat - lalu didokumentasikan sebagai batas yang benar-benar diuji, bukan diasumsikan dari 1 kombinasi nilai pendek.

## 3. CSS budget - dikonfirmasi

wc -c atas b3-dokumen.css menghasilkan 7584 bytes, cocok persis dengan klaim 7,584 B (sekitar 7,4 kB). npm run build (dijalankan ulang reviewer di direktori nyata, bukan hanya percaya laporan): sukses, nol error, nol warning (termasuk nol warning anyComponentStyle walau raw 7584 B berada di atas ambang warning 6 kB - konsisten dengan pola yang sudah diverifikasi ronde-ronde sebelumnya, Angular memicu warning dari ukuran gzip bukan raw). Budget error 10 kB jelas tidak terlampaui. PASS - tapi lihat Bagian 2.2: sisa headroom byte CSS tidak relevan dengan MAJOR baru yang ditemukan (itu murni soal tinggi baris cetak, bukan ukuran file CSS).

## 4. Build dan type-check independen

npx tsc --noEmit -p tsconfig.app.json -> bersih, nol error (reviewer).
npm run build -> sukses, nol error, nol warning (reviewer). main-ZVHZN3LB.js 439.18 kB transfer 109.65 kB, styles-YPAUNJMG.css 1.12 kB transfer 477 bytes - identik dengan klaim Frontend 12.6.
npx vitest run pada b3-waste-model.spec.ts -> 36/36 PASS (reviewer).

Dijalankan ULANG setelah seluruh manipulasi seed sementara (20/25 item dengan 3 varian nilai field) direvert - hash bundle main-ZVHZN3LB.js identik dengan build pertama sebelum manipulasi apa pun, bukti tambahan revert benar-benar bersih secara byte, bukan hanya diff teks.

## 5. Audit scope (independen, mtime)

Daftar file di frontend/src/app/pages/b3-waste/ (ls -la, time-style full-iso):

b3-dokumen.css dan b3-dokumen.html dan b3-dokumen.ts bertimestamp sesi Frontend (16 Agustus, sekitar 11:18 sampai 11:32).
b3-waste.html juga bertimestamp sesi Frontend (16 Agustus 11:18).
b3-waste-data.ts berubah-ubah selama reviewer menguji Skenario B/C, direvert byte-identik tiap kali (dikonfirmasi diff, PASS).
b3-waste-logbook.ts TIDAK berubah dari ronde 5 (timestamp 10:44:16, identik dengan audit ronde 5 Bagian 2).
b3-waste-model.ts dan b3-waste-model.spec.ts tidak tersentuh (timestamp 14 Agustus, jauh sebelum sesi ronde 5/6).
b3-waste.ts dan b3-waste.css tidak tersentuh sesi ini (timestamp 15 Agustus).
waste-picker.ts/.html/.css tidak tersentuh (timestamp 14 Agustus, babak 1).

Cocok 100 persen dengan klaim 03-frontend.md Bagian 12.1: hanya b3-dokumen.ts/.html/.css dan b3-waste.html berubah permanen. Fungsi kelompokkanLogbook() dan hitungNeraca() (di b3-waste-logbook.ts, timestamp tidak berubah dari ronde 5) dikonfirmasi tidak tersentuh. PASS.

## 6. Carry-over belum diperbaiki (Minor, dari Ronde 5 Bagian 11)

Kelas doc-row-empty (dipakai b3-dokumen.html baris 123) masih nol rule CSS di b3-dokumen.css (pencarian pola doc-row-empty di file CSS itu menghasilkan nol match) - hook mati yang sama, belum dibersihkan atau diisi ronde ini. Tidak fungsional-blocking, tapi disebutkan lagi karena sudah 2 ronde tidak ditindaklanjuti (sudah "disarankan sekalian" sejak ronde 5).

## 7. Ponytail review ronde ini

- Fix BLOCKER (class binding breakBefore) proporsional, tidak menambah abstraksi berlebih - satu input baru dengan default aman (true), dipakai tepat 1 titik.
- Fix MAJOR (colgroup plus densitas) juga proporsional untuk kasus yang mereka uji - masalahnya bukan over-engineering, justru UNDER-testing (kurang menguji rentang panjang konten realistis), lihat Bagian 2.2.
- Tidak ditemukan duplikasi, dependency baru, atau abstraksi berlebih di 4 file yang diubah ronde ini.

## 8. Verdict RONDE 6

CHANGES REQUESTED.

Fix BLOCKER (halaman kosong depan) dan defect tambahan (halaman kosong ekor) dari Ronde 5 dan laporan Frontend Bagian 12 dikonfirmasi TERTUTUP lewat PDF sungguhan plus audit CSS containing-block independen - kerja bagus, tidak ada catatan tambahan di area ini.

Fix MAJOR (Logbook 20-baris) BENAR untuk skenario spesifik yang diuji Frontend (nilai field pendek sesuai contoh baku referensi) - dikonfirmasi ulang PASS 100 persen (Skenario B = 3 halaman, C = 4 halaman, identik klaim). TAPI fix ini rapuh: diuji dengan nilai tujuan/noManifest yang realistis (bukan ekstrem - termasuk nama 2 vendor pengolah limbah B3 nyata di Indonesia) melebihi sekitar 24-26 karakter, tabel Logbook 20-baris kembali terpotong jadi 2 halaman fisik (Bagian 2.2) - mereproduksi persis kelas bug MAJOR yang seharusnya ditutup ronde ini. Ini BUKAN skenario tepi atau adversarial buatan reviewer untuk mencari-cari masalah: PT. PLIB secara eksplisit hanya dilabeli sebagai sample di dokumen referensi format Logbook/Neraca, bukan batas sistem yang dijamin; field-nya input text bebas tanpa maxlength, dan nilainya digandakan ke SEMUA 20 baris sekaligus (bukan per-baris) sehingga jauh lebih sensitif terhadap overflow dibanding field lain yang sudah diuji.

Perbaikan wajib sebelum lolos (Frontend):
1. [MAJOR] Pastikan tabel Logbook 20-baris tetap muat 1 halaman fisik untuk RENTANG PANJANG REALISTIS field Tujuan Penyerahan dan No. Manifest (bukan hanya nilai contoh baku PT. PLIB / MNF-2608-001) - lihat 3 opsi saran fix di Bagian 2.2 (maxlength plus verifikasi batas, atau ellipsis/nowrap saat cetak, atau headroom lebih besar). Verifikasi ulang WAJIB pakai page.pdf sungguhan dengan nilai uji yang secara eksplisit lebih panjang dari contoh baku (misalnya nama vendor pengolah limbah B3 nyata 24 karakter atau lebih untuk tujuan, format manifest ber-garis-miring 20 karakter atau lebih untuk noManifest), bukan cuma nilai demo pendek yang kebetulan muat.
2. [Minor, carry-over 2 ronde] Isi atau hapus rule CSS untuk doc-row-empty (Bagian 6).

Setelah item 1 diperbaiki, wajib retest ULANG seluruh matriks (kosong / 20-baris nilai pendek / 20-baris nilai realistis-panjang / lebih dari 20-baris) dengan PDF sungguhan, termasuk skenario nilai panjang yang ditemukan di ronde ini, sebelum diajukan ulang ke Code Review.

---

# RONDE 7 - Verifikasi fix Ronde 6 (Logbook rapuh nilai realistis) - apakah ellipsis genuinely robust? (2026-08-16)

## 0. Konteks ronde ini

Ronde 6 (reviewer sendiri): CHANGES REQUESTED - 1 MAJOR (fix Ronde 5 rapuh terhadap panjang teks realistis pada field Tujuan Penyerahan/No. Manifest, yang digandakan ke SEMUA 20 baris Logbook sekaligus). Frontend melaporkan (03-frontend.md Bagian 13) fix berlapis: lebar kolom disesuaikan + text-overflow: ellipsis (doc-cell-clip) sebagai "jaring pengaman MUTLAK", plus maxlength=40 di input sebagai defense-in-depth, diklaim diverifikasi dengan PDF sungguhan termasuk stress-test 111 karakter (3 halaman PASS, teks terpotong ellipsis, "layout tetap utuh").

Metodologi ronde ini: identik Ronde 5/6 (ng serve sungguhan, Playwright Chromium headless, page.pdf() A4 landscape printBackground:true, pypdf.PdfReader untuk hitung halaman/ekstrak teks per halaman, build/tsc/vitest dijalankan ulang independen, seed diperbesar sementara lalu direvert), DITAMBAH satu teknik diagnostik baru yang tidak dipakai ronde manapun sebelumnya: getComputedStyle() + scrollWidth vs getBoundingClientRect().width pada sel .doc-cell-clip di bawah kondisi print sungguhan (body.b3-printing + page.emulateMedia({media:'print'}), persis kondisi yang direplikasi cetak()), untuk memverifikasi apakah overflow:hidden/text-overflow:ellipsis BENAR-BENAR aktif secara komputasi saat mencetak - bukan hanya menyimpulkan dari jumlah halaman PDF semata. Teknik ini terbukti krusial (lihat Bagian 3) karena mengungkap defect yang tidak terlihat sama sekali lewat metrik jumlah halaman yang dipakai seluruh verifikasi sebelumnya (termasuk verifikasi Frontend sendiri).

Seed PLB3/2026/0001 dipatch sementara ke 20 item (kombinasi dept/sumber/kode unik, pola sama dengan Ronde 5/6/Frontend) + 1 langkah PIC_WEIGH dengan tujuan/noManifest disuntik per skenario, lalu direvert cmp-byte-identik sebelum skenario berikutnya - tidak ada 2 skenario tumpang tindih pada file yang sama. Revert akhir dikonfirmasi cmp byte-identik (Bagian 9).

## 1. Reproduksi 5 nilai uji Ronde 6 + 2 tambahan Frontend - SEMUA PASS untuk metrik jumlah halaman

| # | Nilai diuji | Field | Panjang | Klaim Frontend 13.4 | Hasil reviewer (independen) |
|---|---|---|---|---|---|
| 1 | PT. PLIB | tujuan | 8 char | 3 halaman | 3 halaman - cocok |
| 2 | PT Wastec International | tujuan | 24 char | 3 halaman | 3 halaman - cocok |
| 3 | PT Pengelola Limbah Sukabumi | tujuan | 29 char | 3 halaman (dari 4 sebelum fix) | 3 halaman - cocok, regresi Ronde 6 dikonfirmasi TERTUTUP |
| 4 | PT Prasadha Pamunah Limbah Industri | tujuan | 36 char | 3 halaman, teks utuh tanpa terpotong | 3 halaman - cocok; dikonfirmasi teks penuh 36 karakter muncul 20x di halaman, nol karakter ellipsis dari mekanisme clip (kolom cukup lebar) |
| 5 | MNF/2026/VIII/00123-A | noManifest | 22 char | 3 halaman | 3 halaman - cocok |
| 6 | Kedua field di maxlength 40 char sekaligus | tujuan+noManifest | 40+40 | 3 halaman, tanpa perlu ellipsis | 3 halaman - cocok secara JUMLAH HALAMAN - TAPI lihat Bagian 3: pada panjang PERSIS ini kolom noManifest sudah overflow komputasional (scrollWidth 172px lebih besar dari width 170.875px) dan BOCOR VISUAL ke sel tetangga saat dicetak sungguhan, meski jumlah halaman kebetulan tetap benar |
| 7 | Nilai ekstrem 111 char, HANYA field tujuan (reproduksi persis klaim Frontend, noManifest dibiarkan pendek MNF-2608-001) | tujuan | 111 char | 3 halaman, "doc-cell-clip memotong dengan ellipsis, layout tetap utuh" | 2 halaman - TIDAK COCOK dengan klaim 3 halaman (lihat Bagian 4 untuk detail; Neraca yang biasanya 2 halaman menyusut jadi 1 halaman tanpa kehilangan data - anomali sekunder, bukan blocker berdiri sendiri) - DAN klaim "layout tetap utuh" lewat mekanisme ellipsis terbukti salah, lihat Bagian 3 |

PDF disimpan di scratchpad reviewer (r7verify/S1..S7*.pdf, S6b-recheck.pdf, S7b-tujuan-only-111.pdf) untuk audit ulang.

Kesimpulan bagian ini: metrik "jumlah halaman PDF" - satu-satunya kriteria pass/fail yang dipakai Frontend (dan reviewer di Ronde 5/6) - cocok untuk 5 dari 7 baris, termasuk seluruhnya 3 nilai yang GAGAL di Ronde 6. Regresi MAJOR Ronde 6 (halaman terpotong 2x karena wrap) dikonfirmasi tertutup sejauh diukur lewat jumlah halaman. Tapi metrik ini punya lubang buta besar - lihat Bagian 3.

## 2. Analisis kode fix (dibaca independen)

- b3-dokumen.html baris 62-69: colgroup 13 kolom, lebar Tujuan Penyerahan 17% dan Bukti Nomor Dokumen 12.5% (naik dari 13%/10% Ronde 5), diambil dari Sisa (kg) (6%->2%) dan Maksimal Penyimpanan (9.5%->7%) - dikonfirmasi kolom No./Petugas (baik sisi masuk maupun keluar) TIDAK disentuh (tetap lebar asli Ronde 5), sesuai narasi "percobaan pertama GAGAL, donor final HANYA Sisa+Maks. Simpan" di komentar HTML baris 48-61 dan 03-frontend.md 13.2 poin 1.
- b3-dokumen.html baris 130-131: sel td class doc-cell-clip dengan binding [title]="e.tujuan" dan sama untuk e.noManifest.
- b3-dokumen.css baris 80: .doc-table-logbook td.doc-cell-clip { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } - deklarasi BENAR secara CSS murni (dikonfirmasi bekerja di mode layar biasa, Bagian 3).
- b3-waste.html baris 161/164: maxlength="40" pada kedua input.

Kode di atas, dibaca berdiri sendiri, tampak benar dan proporsional - TIDAK ada masalah pada baris-baris ini sendiri. Masalahnya (Bagian 3) muncul dari INTERAKSI dengan aturan CSS lain yang ditulis di Ronde 5, jauh dari lokasi fix Ronde 6/7.

## 3. BLOCKER BARU - overflow:hidden pada .doc-cell-clip DINETRALKAN oleh aturan !important Ronde 5 tepat saat mencetak sungguhan; "jaring pengaman mutlak" tidak aktif pada kondisi yang justru paling penting

### 3.1 Temuan

b3-dokumen.css baris 113-116 (aturan @media print dari fix BLOCKER Ronde 5, lihat 03-frontend.md 12.2) berbunyi kurang lebih:

  body.b3-printing * { visibility: hidden !important; height: 0 !important; min-height: 0 !important; overflow: hidden !important; }
  body.b3-printing .b3-print-root,
  body.b3-printing .b3-doc,
  body.b3-printing .b3-doc * { visibility: visible !important; height: auto !important; overflow: visible !important; }

Baris 116 menyasar SELURUH descendant .b3-doc (selector ".b3-doc *") dengan overflow: visible !important. td.doc-cell-clip adalah descendant .b3-doc (ia berada di dalam section class="b3-doc doc-logbook"), jadi rule ini JUGA menyasarnya. Karena !important SELALU menang atas rule tanpa !important tidak peduli spesifisitas selektor, overflow: hidden di .doc-table-logbook td.doc-cell-clip (baris 80, TANPA !important) kalah melawan baris 116 pada kondisi body.b3-printing + @media print aktif bersamaan - yaitu PERSIS kondisi yang dibuat cetak() di b3-dokumen.ts (document.body.classList.add('b3-printing') + browser masuk mode print) dan PERSIS kondisi yang direplikasi page.emulateMedia({media:'print'}) di seluruh skrip verifikasi Ronde 5/6/7 (termasuk skrip Frontend sendiri, lihat 03-frontend.md 12.4/13.3).

Dikonfirmasi lewat getComputedStyle() langsung pada sel .doc-cell-clip sungguhan (bukan asumsi baca kode), 3 kondisi berurutan pada elemen YANG SAMA:

| Kondisi | overflow komputasi |
|---|---|
| Mode layar biasa (tanpa body.b3-printing, tanpa emulateMedia) | hidden (BENAR) |
| body.b3-printing class ditambahkan, TAPI emulateMedia('print') belum dipanggil | hidden (BENAR - @media print belum match, baris 113-116 belum berlaku) |
| body.b3-printing class + page.emulateMedia({media:'print'}) (= kondisi cetak sungguhan) | visible (SALAH - inilah bug) |

Baris kedua di atas penting: ini membuktikan mengecek document.body.className mengandung b3-printing saja (teknik yang dipakai berulang kali di Ronde 5/6 untuk memverifikasi gerbang cetak) tidak cukup untuk menjamin .doc-cell-clip benar-benar aktif - harus dikombinasikan dengan emulateMedia, teknik yang sebenarnya SUDAH diketahui perlu untuk @media print secara umum (dicatat Frontend sendiri di 03-frontend.md 9.5 poin 5), tapi rupanya belum diterapkan sampai ke level per-sel overflow saat menguji doc-cell-clip khusus Ronde 6/7 - baik oleh Frontend maupun reviewer Ronde 6 (yang saat itu memang belum ada mekanisme doc-cell-clip untuk diuji).

### 3.2 Konsekuensi nyata - bukan cuma soal computed style, teks BENAR-BENAR bocor tumpang tindih ke sel tetangga di PDF final

Screenshot render PDF (via pymupdf, zoom tinggi) pada skenario nilai noManifest PERSIS di batas maxlength=40 (MNF/2026/VIII/00123-ABCDEFGHIJKLMNOPQRST, nilai REALISTIS dalam rentang yang eksplisit diklaim "aman" 03-frontend.md 13.4 baris #6) menunjukkan teks kolom Bukti Nomor Dokumen (MNF/2026/...) tercetak BERTUMPUK LANGSUNG di atas ekor teks kolom Tujuan Penyerahan di sebelah kirinya (huruf "l"/"a" dari "Nasional" dan "M"/"N" dari "MNF" saling menimpa, lihat lampiran S6b-manifest-zoom.png) - bukan dipotong bersih dengan tanda elipsis, melainkan tumpang tindih tidak terbaca. Ini terjadi di SEMUA 20 baris data (nilai field sama untuk semua baris, sesuai sifat field bersama yang sudah didiagnosis Ronde 6). Dokumen ini adalah replika resmi Logbook B3 (FR/K3L/006/01) yang secara eksplisit ditujukan untuk dicetak/diajukan ke instansi (lihat daftar Tembusan di Neraca: BLH Kabupaten Sukabumi, BPLHD Provinsi Jawa Barat, KLHK) - teks yang tumpang tindih tak terbaca pada SELURUH baris data membuat dokumen cetak tidak layak pakai untuk tujuan itu.

### 3.3 Ambang keterjangkauan - bukan skenario ekstrem, tercapai jauh di bawah maxlength=40

Diukur lewat scrollWidth vs lebar sel sungguhan (sama font/kondisi cetak) pada kolom Bukti Nomor Dokumen (lebih sempit, 12.5 persen kurang lebih 170,9px):

| Panjang noManifest | scrollWidth | Lebar sel | Overflow? |
|---|---|---|---|
| 21 char (MNF/2026/VIII/00123-A, nilai Ronde 6) | 170px | 170,9px | Tidak (pas di batas) |
| 27 char | 170px | 170,9px | Tidak (masih pas) |
| 29 char | 170px | 170,9px | Tidak (masih pas) |
| 33 char | 172px | 170,9px | YA - overflow mulai di sini |
| 40 char (maxlength penuh) | 225px | 170,9px | YA, jelas overflow (32 persen lebih lebar dari sel) |
| 111 char (ekstrem) | sekitar 708px | 170,9px | YA, overflow parah (4x lebar sel) |

Ambang mulai overflow ada di sekitar 30-33 karakter untuk kolom noManifest - jauh di bawah maxlength=40 yang secara eksplisit diklaim "generous" dan "aman" (03-frontend.md 13.2 poin 3), dan sangat mudah tercapai oleh format nomor manifest realistis (mis. format ber-revisi/ber-suffix seperti yang dipakai reviewer di atas, 33-40 karakter, bukan string acak). Kolom Tujuan Penyerahan (lebih lebar, 17 persen kurang lebih 232px) punya ambang lebih tinggi (masih aman di 40 char untuk font ini, baru overflow di skenario ekstrem 111 char) - tapi TIDAK ADA jaminan struktural bahwa 232px selalu cukup untuk SEMUA nama vendor B3 valid sampai 40 karakter (kebetulan aman untuk kombinasi font/lebar saat ini, bukan by design).

### 3.4 Root cause & mengapa ini lolos verifikasi Frontend sendiri

Frontend memverifikasi klaim "doc-cell-clip memotong dengan ellipsis, layout tetap utuh" (13.4 baris #7) hanya lewat jumlah halaman PDF (pypdf.PdfReader page count), bukan lewat pemeriksaan visual/computed-style pada sel itu sendiri. Karena white-space: nowrap (bagian dari deklarasi .doc-cell-clip yang SAMA, dan TIDAK terkena override !important manapun) tetap mencegah teks membungkus ke baris ke-2 terlepas dari overflow gagal atau tidak, TINGGI baris tabel tetap konstan (14,92px, sama seperti kasus sukses) walau overflow:hidden-nya sendiri tidak aktif - sehingga jumlah halaman PDF (yang murni fungsi tinggi kumulatif baris) tetap "benar" secara kebetulan, sementara isi visual selnya sudah rusak (bocor ke sel tetangga). Inilah sebabnya bug ini tidak terdeteksi oleh satu-satunya metrik yang dipakai sejauh ini - kelemahan metodologis yang sama menimpa Ronde 5/6 (yang juga hanya mengecek jumlah halaman) belum pernah terungkap karena sebelum Ronde 6/7 belum ada mekanisme "clip" yang bisa gagal diam-diam seperti ini.

### 3.5 Lokasi & saran fix

File: frontend/src/app/pages/b3-waste/b3-dokumen.css baris 80 (deklarasi asli, tanpa !important) vs baris 113-116 (aturan @media print wildcard, dengan !important, ditulis Ronde 5 untuk tujuan berbeda - mencegah elemen chrome tersembunyi menyumbang tinggi halaman kosong, lihat 03-frontend.md 12.2).

Saran (bukan resep tunggal, WAJIB diverifikasi ulang dengan getComputedStyle() + scrollWidth di bawah emulateMedia print sungguhan, bukan hanya jumlah halaman PDF):
1. Tambah aturan print-scoped khusus SETELAH baris 116 (urutan sumber menentukan siapa menang saat spesifisitas+important seri) yang mengembalikan overflow:hidden/text-overflow:ellipsis/white-space:nowrap dengan important untuk .doc-cell-clip secara spesifik, contoh selector: body.b3-printing .doc-cell-clip dengan ketiga deklarasi di atas ditambah important.
2. Atau: persempit selector wildcard baris 116 supaya TIDAK menyasar .doc-cell-clip (mis. ganti .b3-doc bintang dengan daftar elemen yang benar-benar butuh height:auto/overflow:visible - lebih rapuh untuk dirawat, tidak direkomendasikan dibanding opsi 1).
3. Setelah fix, WAJIB retest: (a) ulangi tabel Bagian 1 dengan getComputedStyle check bukan hanya jumlah halaman; (b) screenshot/zoom visual sel doc-cell-clip pada nilai 33-40 karakter (ambang yang sudah dikonfirmasi overflow) untuk memastikan benar-benar terpotong bersih dengan tanda elipsis dan TIDAK bertumpuk dengan sel tetangga.

## 4. Anomali sekunder (dicatat, bukan bagian dari BLOCKER di atas) - jumlah halaman Neraca menyusut pada skenario ekstrem 111 karakter

Direproduksi PERSIS klaim Frontend 13.4 baris #7 (hanya tujuan=111 char diubah, noManifest dibiarkan MNF-2608-001 pendek): hasil reviewer 2 halaman total (Logbook 1 halaman penuh seperti biasa + Neraca 1 halaman, bukan 2), BUKAN 3 halaman seperti diklaim. Dikonfirmasi lewat extract_text() bahwa halaman Neraca tunggal ini tetap berisi SELURUH data (11 baris Bagian I, Bagian II, footer, Tembusan lengkap - tidak ada yang hilang/terpotong), jadi ini BUKAN kehilangan data. Root cause tidak ditelusuri lebih lanjut karena field yang menyebabkannya (tujuan) tidak pernah dirender di dokumen Neraca sama sekali (Neraca hanya memakai noManifest lewat kolom CATATAN Bagian I, bukan tujuan) - kemungkinan besar terkait efek samping tinggi konten Logbook terhadap perhitungan height:0/overflow:hidden pada wildcard cetak yang memengaruhi reflow global, di luar scope investigasi ronde ini. Dicatat untuk kewaspadaan QA/Frontend saat menutup BLOCKER Bagian 3 (verifikasi ulang WAJIB mencakup jumlah halaman total, bukan cuma perilaku sel doc-cell-clip, untuk memastikan tidak ada regresi baru pada Neraca akibat perubahan CSS cetak).

## 5. Kolom CATATAN (Nomor Manifest) di Neraca Bagian I - tidak diberi proteksi apa pun, dicatat sebagai celah terpisah (bukan blocker berdiri sendiri saat ini)

b3-waste-logbook.ts baris 213/219: nilai noManifest (field SAMA yang bermasalah di Bagian 3) juga disalin ke kolom "CATATAN (Nomor Manifest)" pada tabel Bagian I Neraca (b3-dokumen.html sekitar baris 217), DI DALAM table class doc-table biasa - BUKAN doc-table-logbook, jadi table-layout: auto, TANPA doc-cell-clip, TANPA lebar kolom tetap. Pada nilai realistis (diuji sampai 40 char), kolom ini tetap aman karena table-layout:auto otomatis memberi ruang lebih ke kolom itu tanpa memaksa wrap/overflow (dikonfirmasi visual, screenshot S6-page1.png: teks 40 karakter tampil utuh satu baris, tabel tetap dalam batas kertas). Pada nilai ekstrem 111 karakter (jauh di luar maxlength), kolom ini melebar sangat lebar TAPI screenshot (S7-neraca-page.png) mengonfirmasi tabel keseluruhan TETAP berada dalam batas kertas (tidak terpotong tepi halaman) - jadi TIDAK ada bukti kebocoran/terpotong nyata di kolom ini sejauh diuji, berbeda dengan Bagian 3. Dicatat sebagai observasi (Minor) karena tabel ini sama sekali tidak punya jaring pengaman terstruktur (mengandalkan kebetulan table-layout:auto mendistribusikan ruang) - tidak diblokir ke verdict ronde ini, tapi disarankan Frontend mempertimbangkan proteksi serupa (lebar kolom tetap atau clip) di titik ini juga sekalian saat memperbaiki Bagian 3, karena akar datanya (noManifest bebas tanpa batas terstruktur) identik.

## 6. Aksesibilitas title attribute - AMAN, dikonfirmasi independen

b3-dokumen.html baris 130-131: binding [title]="e.tujuan" dan [title]="e.noManifest" adalah property binding Angular ke properti DOM native title (bukan attr.title, bukan innerHTML). Properti title pada elemen HTML tidak pernah diinterpretasikan sebagai markup/HTML oleh browser (nilai apa pun yang di-assign ke element.title selalu diperlakukan sebagai teks polos oleh spesifikasi DOM, ditampilkan sebagai tooltip native browser) - tidak ada jalur eksekusi script maupun rendering HTML lewat atribut ini, terlepas dari isi string tujuan/noManifest. title juga BUKAN bagian dari daftar "sensitive property" Angular yang memerlukan DomSanitizer (daftar itu terbatas pada href/src pada elemen tertentu, style, innerHTML, iframe srcdoc, dan sejenisnya) - Angular tidak menandai binding ini sebagai butuh sanitasi karena memang tidak ada risiko XSS di jalur ini. Dikonfirmasi juga secara praktis: nilai tujuan/noManifest yang dipakai sepanjang pengujian Bagian 1/3 (termasuk string berulang panjang) selalu tampil sebagai teks literal di DOM tanpa efek samping/pageerror/console.error (nol error terdeteksi di SELURUH sesi Playwright ronde ini, seluruh skenario). PASS, tidak ada catatan.

## 7. Regresi kolom Petugas / Pak Ruli - AMAN, dengan catatan keterbatasan cakupan uji

Kolom Petugas (kedua sisi, index 7 dan 13 pada colgroup) TIDAK disentuh sesi Ronde 6/7 (tetap 6 persen masing-masing, lebar ASLI Ronde 5 yang sudah terbukti aman) - dikonfirmasi lewat colgroup b3-dokumen.html baris 64-68 dan lewat render visual berulang: "Pak Ruli" tampil satu baris utuh, tidak pernah wrap, di SELURUH skenario yang diuji ronde ini. Namun, dikonfirmasi lewat b3-waste-logbook.ts baris 147/153 dan PENGGUNA.PIC.nama (b3-waste-data.ts baris 18) bahwa nilai kolom ini selalu "Pak Ruli" - field ini BUKAN input bebas, melainkan nama pengguna PIC tunggal yang hardcode di seluruh prototipe (tidak ada mekanisme ganti/tambah PIC lain di aplikasi demo ini, sesuai AC-29 "role switcher lokal", bukan sistem auth sungguhan). Artinya permintaan verifikasi "nama petugas lain yang masuk akal" secara struktural tidak dapat diuji pada versi aplikasi saat ini - risiko regresi di kolom ini terbatas pada satu nilai tetap yang sudah dikonfirmasi aman, bukan rentang nilai bebas seperti tujuan/noManifest. Dicatat sebagai batasan cakupan (bukan defect), konsisten dengan sifat prototipe tahap ini.

## 8. CSS budget, build, tsc, test - dikonfirmasi independen

wc -c atas b3-dokumen.css: 8044 bytes, cocok PERSIS dengan klaim 03-frontend.md 13.5 (sekitar 7,9 kB). npm run build (dijalankan ulang reviewer): sukses, nol error, nol warning (termasuk nol warning anyComponentStyle); hash bundle main-FZKIWEUD.js (440.09 kB, transfer 109.75 kB) identik persis dengan klaim Frontend 13.5 - dikonfirmasi dua kali (sebelum dan sesudah seluruh manipulasi seed sementara sesi ini, hash sama, bukti tambahan revert bersih secara byte). npx tsc --noEmit -p tsconfig.app.json: bersih, nol error. npx vitest run src/app/pages/b3-waste/b3-waste-model.spec.ts: 36/36 PASS.

## 9. Audit scope & revert seed - dikonfirmasi independen

Get-ChildItem/ls -la mtime (sebelum sesi menyentuh apa pun): waste-picker.ts/.html/.css (14 Agustus), b3-waste-model.ts/b3-waste-model.spec.ts (14 Agustus), b3-waste.ts/b3-waste.css (15 Agustus), b3-waste-logbook.ts (16 Agustus 10:44:16, TIDAK berubah dari Ronde 5/6 - timestamp identik dengan audit Ronde 6) - seluruhnya tidak tersentuh Ronde 7, cocok dengan klaim 03-frontend.md 13.1. b3-dokumen.ts juga bertimestamp SEBELUM sesi Ronde 7 (11:18, sesi Amandemen 2) - dikonfirmasi TIDAK diubah ronde ini (sesuai klaim, hanya .html/.css yang berubah untuk komponen ini). Hanya b3-dokumen.html, b3-dokumen.css, b3-waste.html bertimestamp permanen sesi Ronde 7 (12:0x). b3-waste-data.ts dikonfirmasi cmp byte-identik dengan versi sebelum sesi reviewer menyentuhnya (setelah lebih dari 10 kali patch-lalu-revert selama pengujian Bagian 1/3/4) - revert bersih 100 persen.

Fungsi kelompokkanLogbook()/hitungNeraca() (di b3-waste-logbook.ts, tidak tersentuh) dan konstanta KAPASITAS_LOGBOOK/method halamanLogbook() (di b3-dokumen.ts/b3-waste-logbook.ts, tetap sama dengan 20, parameter tidak diubah) dikonfirmasi tidak disentuh - klaim Frontend bahwa mereka memilih opsi "lebar kolom + ellipsis" BUKAN opsi "turunkan kapasitas 20 ke 18" adalah BENAR, dikonfirmasi langsung dari kode (protected readonly KAPASITAS_LOGBOOK = 20 di b3-dokumen.ts baris 76, tidak berubah dari Ronde 5).

PASS - scope bersih, tidak ada penyimpangan.

## 10. Ponytail review ronde ini

- Perubahan colgroup (realokasi dari 2 kolom yang benar-benar aman) proporsional, tidak ada abstraksi berlebih.
- doc-cell-clip sebagai konsep (1 class CSS + 1 attribute HTML per sel) adalah pendekatan MINIMAL yang benar untuk masalah yang coba diselesaikan - bukan over-engineering. Masalahnya BUKAN pada kompleksitas fix ini, melainkan interaksi tak terduga dengan CSS important yang ditulis sebelumnya (Bagian 3) - ini murni bug kebenaran, bukan kelebihan/ketidaksederhanaan kode.
- maxlength=40 pada 2 input adalah tambahan atomik, wajar sebagai defense-in-depth, tidak berlebihan.
- Tidak ditemukan duplikasi, dependency baru, atau kode mati baru di file yang diubah ronde ini.
- Carry-over dari Ronde 6 Bagian 6 (doc-row-empty tanpa rule CSS) TIDAK diperiksa ulang eksplisit ronde ini (di luar fokus BLOCKER print) - masih dianggap Minor terbuka, disebutkan kembali untuk kelengkapan (sudah 3 ronde berturut-turut tidak ditindaklanjuti, tapi tidak menghalangi gerbang berulang kali karena murni kosmetik).

## 11. Verdict RONDE 7

CHANGES REQUESTED.

Regresi MAJOR dari Ronde 6 (tabel Logbook 20-baris terpotong 2 halaman fisik akibat field Tujuan Penyerahan/No. Manifest yang panjang) dikonfirmasi TERTUTUP untuk metrik jumlah halaman - kelima nilai uji Ronde 6 (termasuk 3 yang sebelumnya GAGAL: Sukabumi 29 char, Prasadha 36 char, manifest 22 char) sekarang seluruhnya PASS 1 halaman fisik Logbook / 3 halaman total, direproduksi independen dengan PDF sungguhan. Kerja bagus di area ini - realokasi lebar kolom dari donor yang benar-benar aman (bukan asal comot seperti percobaan pertama yang sudah dikoreksi sendiri oleh Frontend sebelum lapor) adalah keputusan yang tepat dan terbukti.

TAPI mekanisme yang diklaim sebagai "jaring pengaman MUTLAK" (doc-cell-clip, text-overflow ellipsis) - yang menjadi ALASAN UTAMA ronde ini seharusnya menutup SELURUH KELAS bug (bukan cuma kasus spesifik) - terbukti TIDAK AKTIF pada kondisi cetak sungguhan (body.b3-printing + media print bersamaan, persis yang terjadi saat window.print() sungguhan dipanggil), karena dinetralkan oleh aturan overflow visible dengan important yang ditulis Ronde 5 untuk tujuan lain (Bagian 3). Akibatnya, nilai realistis di atas kurang lebih 30-33 karakter pada kolom No. Manifest (masih JAUH di bawah maxlength=40 yang diklaim generous dan aman) menghasilkan teks yang bertumpuk/tidak terbaca dengan sel tetangganya di PDF final, dikonfirmasi lewat getComputedStyle DAN render visual zoom (bukan asumsi). Klaim eksplisit Frontend di 03-frontend.md 13.4 baris #7 (doc-cell-clip memotong dengan ellipsis, layout tetap utuh, pada 111 karakter) terbukti salah saat direproduksi independen - baik jumlah halaman (2, bukan 3) maupun perilaku clip-nya sendiri (tidak aktif, bocor visual, bukan terpotong bersih).

Ini BUKAN kegagalan pada kelas bug yang sama seperti Ronde 5/6 (jumlah halaman fisik) - secara sempit, metrik itu sekarang lolos konsisten. Tapi ini adalah bug BARU pada mekanisme yang secara eksplisit dijual sebagai penutup permanen seluruh kelas masalah, dan bug ini reachable dengan nilai realistis dalam rentang yang aplikasi sendiri anggap valid (maxlength=40), bukan skenario adversarial. Untuk dokumen resmi yang ditujukan ke instansi pemerintah, teks yang tumpang tindih tidak terbaca pada kolom kunci (nomor manifest - identitas legal transaksi limbah B3) adalah defect fungsional serius, setara level BLOCKER dengan bug jumlah halaman yang sudah ditutup 2 ronde sebelumnya.

Perbaikan wajib sebelum lolos (Frontend):
1. [BLOCKER] Pastikan overflow:hidden/text-overflow:ellipsis/white-space:nowrap pada .doc-cell-clip benar-benar AKTIF (menang atas rule important Ronde 5) saat body.b3-printing + media print aktif bersamaan - lihat saran fix Bagian 3.5. Verifikasi WAJIB pakai getComputedStyle() plus scrollWidth pada sel itu sendiri di bawah emulateMedia print sungguhan, BUKAN hanya jumlah halaman PDF (metrik itu terbukti buta terhadap kelas bug ini karena white-space:nowrap sendirian sudah menjaga tinggi baris konstan terlepas overflow aktif atau tidak).
2. [BLOCKER, sama seperti nomor 1] Setelah fix, retest ulang MINIMAL kombinasi 33 dan 40 karakter pada kolom No. Manifest (ambang yang sudah dikonfirmasi overflow reviewer, Bagian 3.3) dengan zoom visual sel tersebut, pastikan hasilnya benar-benar terpotong bersih tanda elipsis tanpa tumpang tindih ke sel tetangga.
3. [Minor, opsional tapi disarankan] Pertimbangkan proteksi serupa pada kolom CATATAN Nomor Manifest di tabel Bagian I Neraca (Bagian 5) - sumber datanya sama (noManifest bebas), saat ini hanya aman karena kebetulan table-layout:auto memberi ruang, bukan by design.
4. [Minor, carry-over 3 ronde] Isi atau hapus rule CSS untuk doc-row-empty (sejak Ronde 5 Bagian 11, belum pernah ditindaklanjuti).
5. Selidiki anomali sekunder Bagian 4 (Neraca menyusut 2 ke 1 halaman pada nilai tujuan ekstrem) sebagai bagian dari retest nomor 2 di atas, untuk memastikan tidak ada regresi baru pada Neraca akibat perubahan CSS yang dibuat untuk menutup nomor 1.

Setelah perbaikan nomor 1 dan 2, verifikasi ulang WAJIB mencakup baik metrik lama (jumlah halaman, matriks lengkap kosong/20-baris pendek/20-baris realistis-panjang/lebih dari 20-baris) MAUPUN metrik baru (computed style + visual clip check pada doc-cell-clip) sebelum diajukan ulang ke Code Review.

---

# RONDE 8 - Verifikasi fix BLOCKER Ronde 7 (`.doc-cell-clip` dinetralkan wildcard `!important` saat print sungguhan) - apakah mekanisme genuinely aktif? (2026-08-16)

## 0. Konteks ronde ini

Ronde 7 (reviewer sendiri): CHANGES REQUESTED - 1 BLOCKER. `overflow:hidden` pada `.doc-cell-clip` (Ronde 6) terbukti dinetralkan oleh rule wildcard `body.b3-printing .b3-doc * { overflow: visible !important; ... }` (Ronde 5) tepat pada kondisi `body.b3-printing` + `@media print` aktif bersamaan (kondisi cetak sungguhan) - dikonfirmasi lewat `getComputedStyle()` (bukan hanya jumlah halaman PDF) dan render visual zoom yang menunjukkan teks kolom Tujuan Penyerahan/Bukti Nomor Dokumen bertumpuk tak terbaca ke sel tetangga.

Frontend melapor (`03-frontend.md` Bagian 14): 1 rule CSS baru `body.b3-printing .doc-cell-clip { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }`, specificity IDENTIK dengan wildcard (2 kelas + 1 elemen), ditempatkan SETELAH rule wildcard di urutan file supaya menang via source-order tie-break murni (bukan specificity, karena memang tidak mungkin lebih tinggi).

Metodologi ronde ini: identik dengan yang ditetapkan sendiri oleh reviewer di Ronde 7 - `getComputedStyle()` sungguhan di bawah `page.emulateMedia({media:'print'})` + `body.b3-printing` DULU (bukan cuma jumlah halaman), lalu jumlah halaman PDF sebagai bukti sekunder, lalu visual zoom, lalu regresi, lalu build/tsc/scope. Dijalankan sepenuhnya independen (skrip baru ditulis reviewer, `ng serve --port 4310` dijalankan ulang oleh reviewer, bukan memakai server/skrip sisa sesi Frontend).

## 1. Verifikasi WAJIB #1 (paling penting) - `getComputedStyle()` sungguhan pada SELURUH sel `.doc-cell-clip` (bukan cuma 1 elemen sampel)

Playwright Chromium headless, `ng serve --port 4310` dijalankan reviewer sendiri, viewport diset ke lebar konten A4 landscape (1062x733px, mengikuti margin 8mm `@page`) sebelum `page.emulateMedia({media:'print'})`, identik teknik Ronde 7. Seed dipatch sementara dengan skenario PERSIS yang sama dengan Ronde 7 (`items20`, `PLB3/2026/0005` = noManifest 33 char/ambang overflow, `PLB3/2026/0006` = tujuan+noManifest 40+40 char/batas maxlength) - dipilih sengaja SAMA dengan kasus yang di Ronde 7 terbukti GAGAL (tumpang tindih), supaya perbandingan before/after apple-to-apple. Bedanya dari skrip Ronde 7: kali ini SELURUH 40 sel `.doc-cell-clip` per skenario diperiksa (20 baris x 2 kolom), bukan cuma 1 sel sampel, untuk menutup kemungkinan fix hanya kebetulan benar pada satu titik data.

Hasil agregat (3 kondisi berurutan pada elemen yang sama, seperti Ronde 7 - mode layar biasa / body.b3-printing saja tanpa emulateMedia / body.b3-printing + emulateMedia print = kondisi cetak sungguhan):

| Skenario | Kondisi | overflow (nilai unik di 40 sel) | text-overflow | white-space | Sel dengan scrollWidth > clientWidth |
|---|---|---|---|---|---|
| PLB3/2026/0005 (33 char) | Layar biasa | hidden | ellipsis | nowrap | 40/40 |
| PLB3/2026/0005 | b3-printing saja (belum emulateMedia) | hidden | ellipsis | nowrap | 40/40 |
| PLB3/2026/0005 | b3-printing + emulateMedia print (= cetak sungguhan) | hidden | ellipsis | nowrap | 40/40 |
| PLB3/2026/0006 (40+40 char, kasus PALING RUSAK di Ronde 7) | Layar biasa | hidden | ellipsis | nowrap | 40/40 |
| PLB3/2026/0006 | b3-printing saja | hidden | ellipsis | nowrap | 40/40 |
| PLB3/2026/0006 | b3-printing + emulateMedia print (= cetak sungguhan) | hidden | ellipsis | nowrap | 40/40 |

Hasil kunci: pada KONDISI CETAK SUNGGUHAN (baris ke-3 tiap skenario) - persis kondisi yang di Ronde 7 menghasilkan overflow: visible (bug) - sekarang overflow computed value = hidden di SELURUH 40/40 sel, konsisten 100 persen, bukan cuma sampel tunggal. Kolom "sel dengan scrollWidth > clientWidth" mengonfirmasi konten memang benar-benar overflow batas sel di seluruh baris (bukan kebetulan pas muat) - artinya mekanisme clip sungguh-sungguh bekerja menahan overflow nyata, bukan no-op. Skrip dan report.json mentah tersimpan di scratchpad reviewer (r8verify/verify.js, r8verify/report.json).

Ini membuktikan root cause Ronde 7 (kalah source-order melawan wildcard important) sudah genuinely tertutup secara mekanisme - bukan lolos kebetulan pada 1 nilai uji tertentu.

## 2. Verifikasi source-order dan tidak ada rule ketiga yang menyusul (dibaca SELURUH @media print block, bukan potongan)

b3-dokumen.css dibaca utuh (153 baris). Urutan relevan di dalam @media print (mulai baris 101):

- Baris 113: body.b3-printing * { ... overflow: hidden !important; } (wildcard cleanup Ronde 5)
- Baris 114-116: body.b3-printing .b3-print-root, .b3-doc, .b3-doc * { ... overflow: visible !important; } (wildcard yang jadi biang masalah Ronde 7)
- Baris 117-125: rule baru Frontend body.b3-printing .doc-cell-clip { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; } - dikonfirmasi tepat SETELAH baris 114-116, sesuai klaim.
- Baris 126-137: .b3-print-root position/left/top/width (tidak menyentuh overflow/text-overflow/white-space/.doc-cell-clip)
- Baris 138-142: .b3-doc margin/border/break-inside (idem, tidak relevan)
- Baris 149-150: .doc-logbook + .doc-logbook, .doc-neraca-break -> break-before: page (tidak relevan)
- Baris 151: .doc-table { print-color-adjust: exact; ... } (tidak menyentuh overflow/text-overflow/white-space, dan bukan wildcard * yang bisa menyasar .doc-cell-clip lewat cascade lain)
- Baris 152: @page { size: A4 landscape; margin: 8mm; }

Dikonfirmasi: TIDAK ADA rule keempat/kelima setelah baris 125 yang menyentuh overflow/text-overflow/white-space pada selector yang bisa menyasar .doc-cell-clip (baik langsung maupun via wildcard *). Pola bug Ronde 7 (rule ketiga menyusul dengan specificity sama/lebih tinggi) tidak terulang. Rule Frontend adalah SATU-SATUNYA titik keputusan final untuk properti-properti ini pada elemen .doc-cell-clip di bawah body.b3-printing + @media print.

## 3. PDF sungguhan - jumlah halaman (bukti sekunder) plus regresi

page.pdf() A4 landscape printBackground:true, dibaca pypdf.PdfReader (jumlah halaman + extract_text() per halaman untuk deteksi halaman kosong):

| Skenario | Item | Nilai diuji | Halaman | Halaman kosong |
|---|---|---|---|---|
| PLB3/2026/0002 (WAIT_PIC, pra-WEIGHED) | - | regresi halaman kosong depan | 1 | nol |
| PLB3/2026/0003 (WAIT_SUP, pra-WEIGHED) | - | regresi halaman kosong depan | 1 | nol |
| PLB3/2026/0001 (asli, APPROVED) | 3 | baseline | 2 | nol |
| PLB3/2026/0005 (baru) | 20 | noManifest 33 char (ambang overflow Ronde 7) | 3 | nol |
| PLB3/2026/0006 (baru) | 20 | tujuan+noManifest 40+40 char (kasus PALING RUSAK Ronde 7) | 3 | nol |
| PLB3/2026/0007 (baru) | 25 | regresi pagination lebih dari 20 item | 4 | nol |
| PLB3/2026/0008 (baru) | 20 | tujuan ekstrem 111 char | 3 | nol |

Seluruh angka cocok persis dengan klaim Frontend 14.4 (termasuk skenario 8 = 3 halaman, mengonfirmasi anomali sekunder Ronde 7 Bagian 4 - Neraca menyusut 2 ke 1 halaman - juga tidak terulang). Regresi halaman kosong pra-WEIGHED (defect 1/1b) dan pagination 20/25-item (defect 2) PASS, diverifikasi independen bukan hanya percaya klaim.

## 4. Visual/zoom check dari PDF sungguhan - bukti utama defect Ronde 7 tertutup

Render pymupdf 8x zoom pada kolom Tujuan Penyerahan + Bukti Nomor Dokumen, baris 1-7, untuk KEDUA skenario yang di Ronde 7 terbukti bocor (PLB3/2026/0005 33 char dan PLB3/2026/0006 40+40 char - kasus yang paling rusak, screenshot Ronde 7 S6b-manifest-zoom.png menunjukkan huruf saling menimpa tak terbaca).

Hasil: kedua skenario menampilkan teks terpotong bersih dengan tanda elipsis (contoh: "PT Prasadha Pamunah Limbah Indu...", "PT Pengelola Limbah Industri Nasio...", "MNF/2026/VIII/00123-AB...") di SEMUA baris yang diperiksa, tetap sepenuhnya berada dalam batas kolom masing-masing, nol tumpang tindih ke sel tetangga - kontras langsung dan jelas dengan temuan Ronde 7 pada skenario identik. Full-page render skenario 5 juga dikonfirmasi tidak ada halaman kosong dan seluruh 20 baris + footer tanda tangan muat rapi dalam 1 halaman fisik (regresi Ronde 5/6 tetap tertutup). Gambar tersimpan di scratchpad reviewer: r8verify/s5-0005-33char-full.png, r8verify/s5-0005-33char-zoom.png, r8verify/s6-0006-40char-zoom.png.

## 5. CSS budget - dikonfirmasi

wc -c atas b3-dokumen.css: 8552 bytes, cocok PERSIS dengan klaim 03-frontend.md 14.5 (8 552 B, sekitar 8,35 kB). Di bawah batas error anyComponentStyle (10 kB) dengan margin sekitar 1,45 kB. Sedikit di atas target internal 8 kB (bukan pelanggaran keras, sudah dicatat Frontend sendiri).

## 6. Build, tsc, test - dijalankan ulang independen

    npx tsc --noEmit -p tsconfig.app.json   -> bersih, nol error
    npm run build                            -> sukses, nol error, nol warning
    main-E3KWNGR7.js    | main   | 440.21 kB | 109.67 kB   (HASH dan UKURAN IDENTIK dengan klaim 14.5)
    styles-YPAUNJMG.css | styles |   1.12 kB | 477 bytes
    npx vitest run src/app/pages/b3-waste/b3-waste-model.spec.ts  -> 36/36 PASS

Hash bundle main-E3KWNGR7.js identik byte-untuk-byte dengan yang dilaporkan Frontend - bukti tambahan independen bahwa kode produksi yang diverifikasi reviewer adalah PERSIS kode yang sama yang diklaim Frontend (bukan versi berbeda), dan bahwa revert seed sementara reviewer (Bagian 1/3/4) tidak meninggalkan sisa yang memengaruhi build.

## 7. Audit scope dan revert seed - dikonfirmasi independen

Get-ChildItem urut LastWriteTime atas frontend/src/app/pages/b3-waste/:

    waste-picker.html      8/14/2026 9:18 AM
    waste-picker.css       8/14/2026 9:18 AM
    b3-waste-model.spec.ts 8/14/2026 1:24 PM
    waste-picker.ts        8/14/2026 1:43 PM
    b3-waste-model.ts      8/14/2026 2:38 PM
    b3-waste.css           8/15/2026 1:13 PM
    b3-waste.ts            8/15/2026 1:20 PM
    b3-waste-logbook.ts    8/16/2026 10:44 AM   (Ronde 5/6/7, tidak disentuh)
    b3-dokumen.ts          8/16/2026 11:18 AM   (Amandemen 2, tidak disentuh)
    b3-waste.html          8/16/2026 12:01 PM   (Ronde 7, tidak disentuh)
    b3-dokumen.html        8/16/2026 12:09 PM   (Ronde 7, tidak disentuh)
    b3-dokumen.css         8/16/2026 12:56 PM   (SATU-SATUNYA file bertimestamp setelah seluruh file Ronde 7 di atas - konsisten dengan sesi fix Ronde 8)

Hanya b3-dokumen.css yang bertimestamp permanen sesi Ronde 8, sesuai klaim Frontend "1 file". b3-waste-data.ts diverifikasi lewat md5sum (bukan cuma mtime, karena reviewer sendiri sempat menulis-lalu-revert file ini untuk skenario Bagian 1/3): hash sebelum patch reviewer, hash backup reviewer, dan hash setelah revert identik (dce2499e221f398934586c8ffe4b7cdb) - revert bersih 100 persen byte-identik, cocok dengan versi pristine sebelum sesi reviewer maupun sebelum sesi Frontend manapun menyentuhnya (baris tetap 275, tidak berubah dari Ronde 7 Bagian 9). Catatan: mtime b3-waste-data.ts pada listing di atas akan menunjukkan waktu operasi copy reviewer sendiri (bukan sesi Frontend) - ini artefak proses verifikasi reviewer, BUKAN bukti perubahan konten permanen (dikonfirmasi via hash, bukan mtime, untuk file ini).

b3-dokumen.html, b3-waste.html, b3-waste-model.ts, b3-waste-logbook.ts, waste-picker.* dikonfirmasi TIDAK disentuh Ronde 8 (mtime tetap sesi-sesi sebelumnya), sesuai klaim 03-frontend.md Bagian 14.1.

PASS - scope bersih, hanya b3-dokumen.css berubah permanen.

## 8. Ponytail review ronde ini

- Fix 1 rule CSS (9 baris termasuk komentar) dengan selector specificity yang sengaja dibuat identik dengan wildcard yang jadi biang masalah, dimenangkan murni lewat source-order - ini pendekatan minimal yang tepat untuk kelas bug CSS-cascade seperti ini (bukan solusi berlebih seperti menulis ulang seluruh wildcard Ronde 5 atau menambah lapisan abstraksi baru). Konsisten dengan saran opsi 1 yang reviewer sarankan sendiri di Ronde 7 Bagian 3.5.
- Komentar di baris 117-120 ringkas dan tepat sasaran (menjelaskan mengapa posisi ini kritis - source-order tie-break - bukan sekadar deskripsi kode), akan membantu maintainer berikutnya menghindari regresi yang sama bila ada penambahan rule di masa depan.
- Tidak ada file lain disentuh, tidak ada dependency baru, tidak ada duplikasi. Fix sepenuhnya proporsional terhadap BLOCKER yang diperbaiki.
- Carry-over Minor yang belum ditindaklanjuti (bukan blocker, tercatat untuk kelengkapan, sudah beberapa ronde tidak menghalangi gerbang): (1) kolom CATATAN Nomor Manifest di Neraca Bagian I masih tanpa proteksi terstruktur (Ronde 7 Bagian 5); (2) doc-row-empty masih tanpa rule CSS (Ronde 6 Bagian 6/Ronde 7 Bagian 10).

## 9. Verdict RONDE 8

APPROVED.

Bug print BLOCKER yang melewati 3 ronde review (Ronde 5: gerbang cetak dasar; Ronde 6: lebar kolom + ellipsis untuk teks panjang; Ronde 7: BLOCKER ditemukan - ellipsis dinetralkan wildcard important; Ronde 8: fix diverifikasi tuntas) sekarang genuinely tertutup secara mekanisme, bukan kebetulan lolos test case. Dasar kesimpulan ini:

1. getComputedStyle() sungguhan pada SELURUH 40 sel .doc-cell-clip (bukan sampel tunggal), pada KEDUA skenario yang sebelumnya terbukti gagal di Ronde 7, di bawah kondisi cetak sungguhan (body.b3-printing + emulateMedia print bersamaan) - overflow: hidden aktif 100 persen konsisten, dengan konten yang benar-benar overflow batas sel di seluruh baris (bukan no-op kebetulan aman).
2. Posisi source-order rule baru dikonfirmasi benar (setelah wildcard Ronde 5) lewat pembacaan utuh file, dan dikonfirmasi TIDAK ADA rule ketiga setelahnya yang bisa mengulang pola bug yang sama.
3. Render visual zoom PDF sungguhan pada 2 nilai ambang (33 char, 40+40 char - termasuk kasus paling rusak Ronde 7) menunjukkan teks terpotong bersih dengan elipsis, kontras langsung dengan screenshot bertumpuk Ronde 7 pada skenario identik.
4. Regresi jumlah halaman (pra-WEIGHED 1 halaman, pagination 20/25-item, baseline) seluruhnya PASS dan cocok persis dengan klaim Frontend, diverifikasi independen.
5. Build/tsc/test bersih; hash bundle produksi identik byte-untuk-byte dengan klaim Frontend (bukti tambahan bahwa kode yang direview sama dengan kode yang di-build).
6. Scope bersih: hanya b3-dokumen.css berubah permanen (dikonfirmasi mtime); b3-waste-data.ts direvert byte-identik (dikonfirmasi hash, bukan hanya mtime).

Tidak ada BLOCKER atau MAJOR baru ditemukan ronde ini. 2 Minor carry-over (kolom CATATAN Neraca tanpa proteksi terstruktur, doc-row-empty tanpa style) tetap terbuka tapi murni kosmetik/observasi berjaga-jaga - tidak menghalangi gerbang, direkomendasikan ditindaklanjuti saat ada perubahan lain di area yang sama (bukan sesi terpisah khusus untuk ini).

Fitur "Fix bug print Logbook/Neraca B3" siap SHIP dari sisi Code Review setelah 4 putaran (Ronde 5-8) - metodologi verifikasi computed-style + visual zoom (bukan hanya jumlah halaman) yang ditetapkan Ronde 7 terbukti berhasil menangkap kelas bug ini secara tuntas di Ronde 8.
