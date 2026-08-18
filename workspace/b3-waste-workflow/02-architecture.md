# 02 - ARCHITECTURE: Menu Limbah B3 - Alur Pembuangan (Tahap 1-4)

| Field | Value |
|---|---|
| Task slug | `b3-waste-workflow` |
| Task ID | AZK-002 |
| Tanggal | 2026-08-14 |
| Architect | azkha-architect |
| Input | `01-spec.md`, `backend\.windsurf\skills\limbah b3\pembunagan limbah.md` (dibaca utuh) |
| Output untuk | Frontend (implementasi), Code Review (audit), QA (verifikasi) |

> **Cara membaca dokumen ini.** Bagian 3-8 adalah **kontrak**: nama tipe, nama field, nama fungsi, dan string pesan error di dalamnya harus dipakai **persis** oleh Frontend, karena QA akan menguji dengan string itu. Bagian 2 dan 12 adalah keputusan & batas. Tidak ada kode implementasi lengkap di sini - hanya signature dan bentuk data.

---

## 1. Ringkasan Arsitektur

Prototype ini adalah **satu halaman Angular berisi mesin status murni**. Tidak ada jaringan, tidak ada penyimpanan, tidak ada service injectable, tidak ada router tambahan.

```
                     route '/b3-waste' (SUDAH ADA, tidak disentuh)
                                 |
                                 v
              +--------------------------------------------+
              |  B3Waste (container, pemilik SELURUH state) |
              |  signals: peranAktif, tabAktif, pengajuan[],|
              |           notifikasi[], pilihanId, errors[] |
              +----------------+---------------------------+
                               |
        panggil fungsi murni   |    render
     +-------------------------+------------------------+
     |                                                  |
     v                                                  v
+---------------------------+              +---------------------------+
| b3-waste-model.ts         |              | WastePicker (anak)        |
| - tipe & konstanta        |              | cascade Departemen ->     |
| - jalankanAksi() REDUCER  |              | Sumber -> Jenis + Lainnya |
| - validasi*(), masaSimpan |              | input: nilai awal         |
| - buatNotifikasi()        |              | output: pilihanChange     |
| MURNI: tanpa Angular      |              +---------------------------+
+---------------------------+
     ^
     | data master + seed
+---------------------------+
| b3-waste-data.ts          |
| MASTER_DEPARTEMEN, PENGGUNA, bangunSeed() |
+---------------------------+
```

**Aturan arsitektural tunggal yang paling penting:** *tidak ada satu pun tempat di komponen yang boleh menulis `status` secara langsung.* Semua perpindahan status hanya lewat `jalankanAksi()`. Komponen hanya (a) mengumpulkan input form, (b) memanggil `jalankanAksi()`, (c) menyimpan hasilnya ke signal atau menampilkan `errors`. Ini yang membuat AC-11..AC-24 bisa diuji tanpa merender komponen.

### 1.1 Batas yang sengaja TIDAK dibuat (ponytail: "butuh ada nggak?")

| Yang lazim dibuat orang | Keputusan | Alasan |
|---|---|---|
| `B3WasteService` / `WorkflowStore` injectable | **TIDAK** | Hanya ada satu konsumen state (satu halaman). Service = satu lapisan indireksi tanpa pemakai kedua. State cukup di container. |
| Komponen per tahap (`submission-form`, `approval-panel`, `weigh-form`, `notification-panel`) | **TIDAK** | Semua butuh state yang sama; memecahnya berarti membangun 4x plumbing `input`/`output` untuk keuntungan nol. Ditangani `@if` dalam satu template. |
| Reactive Forms (`FormBuilder`, validator class) | **TIDAK** | Validasi sudah harus hidup di reducer murni (agar bisa diuji & agar aturan tidak terduplikasi). Cukup `[(ngModel)]` / `[value]`+`(input)`. |
| Enum TypeScript untuk status | **TIDAK** | Union string literal lebih ringan, lebih mudah dibaca di devtools, dan tidak menghasilkan kode runtime. |
| localStorage / persistence | **TIDAK** | Keputusan PM 5.1. |
| Library UI, date library (date-fns/dayjs) | **TIDAK** | Aritmetika tanggal yang dibutuhkan = "tambah N hari" (7 baris). Dependency baru dilarang (AC-33). |
| Route anak (`/b3-waste/ajukan`, dst.) | **TIDAK** | Melanggar rule single-menu (`app.routes.ts` masuk blacklist). Navigasi tahap = signal `tabAktif` + `pilihanId`. |

Satu-satunya pemecahan komponen yang **dibuat**: `WastePicker`. Alasannya bukan estetika, tapi dua hal konkret: (1) ia dipakai **dua kali** (form pengajuan baru & form perbaikan setelah ditolak), (2) ia punya state lokal bersarang sendiri yang tidak ada hubungannya dengan alur status, dan reset-nya jadi sepele bila terisolasi.

---

## 2. Keputusan Teknis Utama

### 2.1 Route: nol perubahan (WAJIB dipatuhi Frontend)

`app.routes.ts` baris 24 sudah berbunyi `{ path: 'b3-waste', component: B3Waste, ... }` dan mengimpor `B3Waste` dari `./pages/b3-waste/b3-waste`.

> **Konsekuensi mengikat:** file `frontend/src/app/pages/b3-waste/b3-waste.ts` harus tetap ada, tetap meng-export **class bernama `B3Waste`**, dan tetap standalone. Ganti isinya sebebas mungkin, **jangan** ganti nama file atau nama class. Dengan begitu `app.routes.ts` tidak perlu disentuh sama sekali (AC-32).

### 2.2 Seluruh state di container, dipindahkan lewat satu reducer murni

Lihat ADR-1. Reducer: `jalankanAksi(pengajuan | null, aksi, waktu) -> Hasil`.

### 2.3 Notifikasi = data yang dikembalikan reducer, bukan efek samping

Reducer mengembalikan `notifikasi: Notifikasi[]` bersama pengajuan hasil transisi. Container tinggal `notifikasi.update(list => [...baru, ...list])`. Tidak ada `NotificationService`, tidak ada toast dengan timer. Lihat ADR-3.

### 2.4 Tanggal: string ISO `YYYY-MM-DD`, aritmetika manual, **dilarang** `toISOString()`

Ini bukan preferensi gaya - ini bug nyata yang akan lolos ke QA kalau tidak dikunci. `new Date('2026-08-14')` diparse sebagai **UTC**; di zona WIB (UTC+7) `new Date('2026-08-14').toISOString().slice(0,10)` setelah manipulasi lokal bisa meleset satu hari. AC-23 menguji tanggal hasil hitung secara eksak, jadi kesalahan sehari = FAIL.

**Kontrak:** semua tanggal disimpan sebagai string `'YYYY-MM-DD'` (kompatibel langsung dengan `<input type="date">`), semua jam sebagai `'HH:mm'` (`<input type="time">`), dan penambahan hari memakai `tambahHari()` (bagian 5.3) yang bekerja dengan `new Date(y, m-1, d)` (konstruktor lokal) lalu memformat ulang manual dengan `padStart`. `DatePipe` **tidak dipakai untuk field tanggal** (ia memparse `'YYYY-MM-DD'` sebagai UTC dan menggeser tampilan). Untuk tampilan pakai `formatTanggal()` / `formatWaktu()` (fungsi murni, bagian 5.3).

### 2.5 Anggaran CSS (risiko build nyata, R-1)

`angular.json` mengaktifkan budget produksi `anyComponentStyle`: **warning 6 kB, error 10 kB**, dan `npm run build` memakai konfigurasi produksi. Budget dihitung per komponen atas **gabungan seluruh `styleUrls`** komponen itu. `shared/feature-page.css` = **5,0 kB**.

**Alokasi yang mengikat:**

| Komponen | styleUrls | Batas file baru |
|---|---|---|
| `B3Waste` | `['../../shared/feature-page.css', './b3-waste.css']` | `b3-waste.css` maksimal **4 kB** |
| `WastePicker` | `['./waste-picker.css']` (tanpa feature-page.css) | `waste-picker.css` maksimal **5 kB** |

Karena itu **seluruh style cascade checklist ditaruh di `waste-picker.css`**, bukan di `b3-waste.css`. Warning >6 kB pada `B3Waste` boleh terjadi (warning tidak menggagalkan build); **error >10 kB tidak boleh**. Frontend wajib mengecek ukuran file sebelum menyerahkan.

### 2.6 Reuse CSS bersama

`shared/feature-page.css` **hanya dibaca/dipakai**, tidak diedit. Kelas siap pakai yang wajib dimanfaatkan ulang (jangan menulis ulang di CSS lokal): `.page-head`, `.stats`/`.stat-card`/`.stat-label`/`.stat-value(.warning|.success|.danger)`, `.panel`, `.form-panel`/`.form-grid`/`.span-2`/`.form-actions`, `.btn-primary`, `.btn-ghost`, `.filters`, `.table-wrap`, `table/thead/tbody`, `.cell-title`, `.cell-sub`, `.badge` + `.badge-muted|info|success|warning|danger`, `.actions`, `.link-btn(.danger)`, `.empty-row`, `.banner`/`.banner-warning`/`.banner-danger`, `.tabs`/`.tab-btn`/`.tab-btn.active`.

Ikon yang tersedia di `shared/icon/icon.ts` dan cukup untuk halaman ini: `plus`, `check-square`, `alert-triangle`, `file-text`, `clipboard`, `shield`, `layers`, `book`. **Jangan** menambah entri ke `ICONS`.

---

## 3. State Machine (kontrak lengkap)

### 3.1 Status

| Kode | Label UI | Badge (kelas feature-page.css) | Makna |
|---|---|---|---|
| `WAIT_SUP` | Diajukan | `badge-warning` | Menunggu keputusan Supervisor |
| `REJ_SUP` | Ditolak Supervisor | `badge-danger` | Perlu perbaikan User |
| `WAIT_PIC` | Disetujui Supervisor | `badge-info` | Menunggu jadwal + keputusan PIC |
| `REJ_PIC` | Ditolak PIC | `badge-danger` | Perlu perbaikan User |
| `APPROVED` | Disetujui & Terjadwal | `badge-info` | Siap ditimbang PIC |
| `WEIGHED` | Ditimbang & Tervalidasi | `badge-success` | **Terminal.** Data terkunci read-only |

Tidak ada status `DRAFT`. Pengajuan lahir langsung di `WAIT_SUP` saat submit.

### 3.2 Tabel transisi (satu-satunya sumber kebenaran)

| # | Aksi (`tipe`) | Peran pemicu | Status asal | Status tujuan | Syarat validasi (semua wajib lulus) | Notifikasi |
|---|---|---|---|---|---|---|
| T1 | `SUBMIT` | `USER` | (belum ada) | `WAIT_SUP` | V-HEADER + V-ITEM + V-LAINNYA | N-SUBMIT (2) |
| T2 | `RESUBMIT` | `USER` | `REJ_SUP`, `REJ_PIC` | `WAIT_SUP` | V-HEADER + V-ITEM + V-LAINNYA | N-RESUBMIT (2) |
| T3 | `SUP_APPROVE` | `SUPERVISOR` | `WAIT_SUP` | `WAIT_PIC` | - | N-SUP-OK (2) |
| T4 | `SUP_REJECT` | `SUPERVISOR` | `WAIT_SUP` | `REJ_SUP` | V-ALASAN | N-SUP-NO (1) |
| T5 | `PIC_APPROVE` | `PIC` | `WAIT_PIC` | `APPROVED` | V-JADWAL | N-PIC-OK (2) |
| T6 | `PIC_REJECT` | `PIC` | `WAIT_PIC` | `REJ_PIC` | V-ALASAN | N-PIC-NO (2) |
| T7 | `PIC_WEIGH` | `PIC` | `APPROVED` | `WEIGHED` | V-BERAT + V-PENYERAHAN + V-PERNYATAAN | N-WEIGH (2) |

**Semua kombinasi lain ditolak.** Reducer mengembalikan `{ ok: false, errors: [E_GUARD] }` bila `aksi.tipe` tidak cocok dengan status saat ini, atau bila peran pemicu tidak sesuai kolom "Peran pemicu". Guard ini adalah **jaring pengaman kedua**; jaring pertama adalah UI yang memang tidak merender tombolnya (AC-18). Dua-duanya wajib ada: yang satu diuji QA lewat klik, yang satu lewat unit test.

`WEIGHED` tidak punya transisi keluar sama sekali (AC-24).

### 3.3 Matriks aksi per peran (dipakai untuk merender tombol)

| Status | USER | SUPERVISOR | PIC |
|---|---|---|---|
| `WAIT_SUP` | - (hanya lihat) | Setujui, Tolak | - |
| `REJ_SUP` | Perbaiki & Ajukan Ulang | - | - |
| `WAIT_PIC` | - | - | Jadwalkan & Setujui, Tolak |
| `REJ_PIC` | Perbaiki & Ajukan Ulang | - | - |
| `APPROVED` | - | - | Timbang & Validasi |
| `WEIGHED` | - | - | - |

Sel "-" berarti **tombol tidak dirender sama sekali** (bukan disabled). Rendernya lewat satu helper: `aksiTersedia(status, peran): TipeAksi[]`.

### 3.4 Antrean "Perlu tindakan Anda"

Semua peran melihat **seluruh** pengajuan (ini alat demo, bukan access control - lihat catatan Security di 01-spec §11). Yang berbeda hanya seksi atas daftar:

| Peran | Isi antrean |
|---|---|
| `USER` | status `REJ_SUP` atau `REJ_PIC` |
| `SUPERVISOR` | status `WAIT_SUP` |
| `PIC` | status `WAIT_PIC` (perlu jadwal) **dan** `APPROVED` (perlu timbang) |

Ini yang memenuhi AC-10 ("muncul di antrean Supervisor") dan AC-13 ("muncul di antrean PIC").

---

## 4. Model Data (kontrak TypeScript)

File: `b3-waste-model.ts`. Nama field bersifat **mengikat**.

### 4.1 Peran & pengguna

```ts
export type Peran = 'USER' | 'SUPERVISOR' | 'PIC';

export interface Pengguna {
  peran: Peran;
  nama: string;
  email: string;
  jabatan: string;   // label untuk toolbar demo
}
```

Konstanta di `b3-waste-data.ts` (nilai **persis** seperti ini; "Pak Ruli" final, menggantikan "Pak Feri" di spec sumber):

```ts
export const PENGGUNA: Record<Peran, Pengguna> = {
  USER:       { peran: 'USER',       nama: 'Feri Aryanto', email: 'feri.aryanto@aio.co.id', jabatan: 'Pemohon / User' },
  SUPERVISOR: { peran: 'SUPERVISOR', nama: 'Andi Nugroho', email: 'andi.nugroho@aio.co.id', jabatan: 'Supervisor' },
  PIC:        { peran: 'PIC',        nama: 'Pak Ruli',     email: 'ruli@aio.co.id',         jabatan: 'PIC Pembuangan (K3L)' },
};
```

### 4.2 Master data limbah

```ts
export interface JenisLimbah {
  nama: string;   // cth 'Oli'
  kode: string;   // cth 'B105d'  -> penentu masa simpan
}

export interface SumberLimbah {
  kode: string;              // cth 'ENG', 'OC3'  -> otoritatif, dari spec sumber
  nama: string;              // label tampilan, cth 'Workshop & Utility'
  jenis: JenisLimbah[];
}

export interface DepartemenLimbah {
  id: string;                // slug stabil: 'engineering' | 'qa' | 'produksi' | 'office'
  nama: string;              // 'Engineering'
  deskripsi: string;         // kalimat kecil di kartu (AC-1)
  sumber: SumberLimbah[];    // 1 elemen kecuali Produksi (4 elemen)
}
```

`sumber.length === 1` adalah penanda "departemen satu-line" (auto-buka, bagian 6.2). Tidak perlu flag tambahan.

### 4.3 Pengajuan

```ts
export type Status = 'WAIT_SUP' | 'REJ_SUP' | 'WAIT_PIC' | 'REJ_PIC' | 'APPROVED' | 'WEIGHED';

export interface HeaderPengajuan {
  lokasi: string;              // wajib
  pelaksana: string;           // wajib - pengangkut, cth 'PT PLIB'
  diajukanOleh: string;        // wajib
  tanggalPengajuan: string;    // wajib, 'YYYY-MM-DD'
  usulanTanggalBuang: string;  // OPSIONAL, '' bila kosong
}

export interface ItemLimbah {
  id: string;              // `${departemenId}-${sumberKode}-${kode}` (unik dalam satu pengajuan)
  departemenId: string;
  departemen: string;      // nama tampil, disalin saat submit (snapshot)
  sumber: string;          // kode line, cth 'OC3'
  jenis: string;           // cth 'Majun'
  kode: string;            // cth 'B110d'
  masaSimpanHari: number;  // 185 | 365, dihitung saat item dibuat
  beratKg: number | null;      // null sampai Tahap 4. TIDAK PERNAH diisi user.
  maksSimpan: string | null;   // 'YYYY-MM-DD', null sampai Tahap 4
}

export interface Supervisi {
  oleh: string;
  waktu: string;        // ISO datetime
  disetujui: boolean;
  alasanTolak: string;  // '' bila disetujui
}

export interface KeputusanPic {
  oleh: string;
  waktu: string;
  disetujui: boolean;
  tanggalJadwal: string; // 'YYYY-MM-DD', '' bila ditolak
  jamJadwal: string;     // 'HH:mm', '' bila ditolak
  alasanTolak: string;
}

export interface Penyerahan {
  tanggalTimbang: string; // 'YYYY-MM-DD' - basis hitung maksSimpan
  tanggalBuang: string;   // 'YYYY-MM-DD'
  tujuan: string;         // cth 'PT PLIB'
  noManifest: string;
  olehPic: string;
  divalidasi: boolean;
}

export interface RiwayatEntri {
  dari: Status | null;   // null untuk SUBMIT pertama
  ke: Status;
  aksi: TipeAksi;
  oleh: string;
  peran: Peran;
  waktu: string;         // ISO datetime
  catatan: string;       // alasan tolak / jadwal / ringkasan timbang; '' bila tak ada
}

export interface Pengajuan {
  id: number;
  nomor: string;             // 'PLB3/2026/0001'
  status: Status;
  header: HeaderPengajuan;
  items: ItemLimbah[];
  lainnya: string;           // teks bebas kartu "Lainnya"; '' bila tidak dipakai
  supervisi: Supervisi | null;
  pic: KeputusanPic | null;
  penyerahan: Penyerahan | null;
  riwayat: RiwayatEntri[];   // urut kronologis naik
}
```

Catatan desain: `supervisi`/`pic` menyimpan **keputusan terakhir**. Saat `RESUBMIT`, keduanya di-reset ke `null` (siklus approval dimulai ulang) sementara `riwayat` **tidak pernah dihapus** - jejak penolakan tetap terbaca. Ini yang membuat AC-12 (alasan tampil di sisi User) tetap terpenuhi setelah diajukan ulang: alasan lama ada di riwayat.

### 4.4 Notifikasi (simulasi email in-app)

```ts
export interface Notifikasi {
  id: number;
  pengajuanId: number;
  nomorPengajuan: string;
  kepadaPeran: Peran;
  kepadaNama: string;
  kepadaEmail: string;
  subjek: string;
  isi: string;
  waktu: string;      // ISO datetime
  pemicu: TipeAksi;   // aksi yang melahirkannya - dipakai QA untuk AC-25
}
```

### 4.5 Aksi & hasil reducer

```ts
export type TipeAksi =
  | 'SUBMIT' | 'RESUBMIT'
  | 'SUP_APPROVE' | 'SUP_REJECT'
  | 'PIC_APPROVE' | 'PIC_REJECT'
  | 'PIC_WEIGH';

export interface IsiPengajuan {          // payload bersama SUBMIT & RESUBMIT
  header: HeaderPengajuan;
  items: ItemLimbah[];
  lainnya: string;
}

export interface IsiTimbang {
  berat: Record<string, number | null>;  // key = ItemLimbah.id
  tanggalTimbang: string;
  tanggalBuang: string;
  tujuan: string;
  noManifest: string;
  pernyataan: boolean;
}

export type Aksi =
  | { tipe: 'SUBMIT';       oleh: Pengguna; isi: IsiPengajuan }
  | { tipe: 'RESUBMIT';     oleh: Pengguna; isi: IsiPengajuan }
  | { tipe: 'SUP_APPROVE';  oleh: Pengguna }
  | { tipe: 'SUP_REJECT';   oleh: Pengguna; alasan: string }
  | { tipe: 'PIC_APPROVE';  oleh: Pengguna; tanggalJadwal: string; jamJadwal: string }
  | { tipe: 'PIC_REJECT';   oleh: Pengguna; alasan: string }
  | { tipe: 'PIC_WEIGH';    oleh: Pengguna; isi: IsiTimbang };

export type HasilAksi =
  | { ok: true;  pengajuan: Pengajuan; notifikasi: Notifikasi[] }
  | { ok: false; errors: string[] };
```

---

## 5. Kontrak Fungsi (semua murni, di `b3-waste-model.ts`)

### 5.1 Reducer

```ts
export function jalankanAksi(
  sebelum: Pengajuan | null,   // null hanya sah untuk SUBMIT
  aksi: Aksi,
  konteks: { waktu: string; id: number; nomor: string; notifIdAwal: number },
): HasilAksi;
```

- **Tidak memanggil `new Date()` di dalamnya.** Waktu, id, nomor disuntik lewat `konteks` -> unit test deterministik, seed bisa direplay dengan timestamp tetap.
- Selalu mengembalikan objek **baru** (`{ ...sebelum, ... }`), tidak pernah memutasi argumen.
- Urutan internal: cek guard peran+status -> kumpulkan `errors` validasi -> bila ada error, `return { ok:false, errors }` **tanpa** menyentuh apa pun -> bila lolos, bangun pengajuan baru + `riwayat` entri baru + `buatNotifikasi()`.
- Untuk `PIC_WEIGH`: setiap item diperbarui `beratKg = isi.berat[item.id]` dan `maksSimpan = tambahHari(isi.tanggalTimbang, item.masaSimpanHari)`.

### 5.2 Validasi (dipakai reducer, boleh juga dipanggil UI untuk menampilkan error inline)

```ts
export function validasiIsiPengajuan(isi: IsiPengajuan): string[];  // V-HEADER + V-ITEM + V-LAINNYA
export function validasiAlasan(alasan: string): string[];           // V-ALASAN
export function validasiJadwal(tanggal: string, jam: string): string[]; // V-JADWAL
export function validasiTimbang(items: ItemLimbah[], isi: IsiTimbang): string[]; // V-BERAT + V-PENYERAHAN + V-PERNYATAAN
```

**Pesan error - string persis (QA menguji dengan string ini):**

| Kode | Kondisi | Pesan |
|---|---|---|
| V-HEADER | `lokasi.trim() === ''` | `Lokasi wajib diisi.` |
| V-HEADER | `pelaksana.trim() === ''` | `Pelaksana/pengangkut wajib diisi.` |
| V-HEADER | `diajukanOleh.trim() === ''` | `Diajukan oleh wajib diisi.` |
| V-HEADER | `tanggalPengajuan === ''` | `Tanggal pengajuan wajib diisi.` |
| V-ITEM | `items.length === 0` | `Pilih minimal satu jenis sampah.` |
| V-LAINNYA | kartu Lainnya dicentang tapi teks kosong | `Keterangan "Lainnya" wajib diisi bila kartunya dicentang.` |
| V-ALASAN | `alasan.trim() === ''` | `Alasan penolakan wajib diisi.` |
| V-JADWAL | `tanggalJadwal === ''` | `Tanggal jadwal timbang wajib diisi.` |
| V-JADWAL | `jamJadwal === ''` | `Jam jadwal timbang wajib diisi.` |
| V-BERAT | ada item dengan berat `null`/`NaN`/`<= 0` | `Berat setiap item wajib diisi dan lebih besar dari 0 kg.` |
| V-PENYERAHAN | `tanggalTimbang === ''` | `Tanggal timbang wajib diisi.` |
| V-PENYERAHAN | `tanggalBuang === ''` | `Tanggal pembuangan wajib diisi.` |
| V-PENYERAHAN | `tujuan.trim() === ''` | `Tujuan penyerahan wajib diisi.` |
| V-PENYERAHAN | `noManifest.trim() === ''` | `Nomor manifest wajib diisi.` |
| V-PERNYATAAN | `pernyataan !== true` | `Centang pernyataan validasi PIC.` |
| E_GUARD | aksi tak sesuai status/peran | `Aksi tidak diizinkan untuk status atau peran saat ini.` |

Catatan V-LAINNYA: aturan ini tambahan Architect (tidak ada di AC), turunan wajar dari AC-7. Kartu "Lainnya" **tidak** menghasilkan `ItemLimbah` (tak punya kode -> tak punya masa simpan -> tak bisa ditimbang), jadi mencentang Lainnya saja **tidak** memenuhi `items.length > 0`; submit tetap ditolak dengan `Pilih minimal satu jenis sampah.` Ini konsisten dengan AC-9.

`validasiIsiPengajuan` menerima `IsiPengajuan`; agar V-LAINNYA bisa dievaluasi, `WastePicker` mengirim `lainnya: ''` saat kartu tidak dicentang dan mengirim teks apa adanya (boleh kosong/spasi) saat dicentang - lihat 6.4.

### 5.3 Aturan hitung & format

```ts
export const MASA_SIMPAN_A = 185;  // hari - kode diawali 'A'
export const MASA_SIMPAN_B = 365;  // hari - kode diawali 'B'

/** 'A102d' -> 185 ; 'B105d' -> 365. Case-insensitive, trim dulu. */
export function masaSimpanHari(kode: string): number;

/** tambahHari('2026-08-14', 185) -> '2027-02-15'. Aman zona waktu (Date lokal + format manual). */
export function tambahHari(tanggalIso: string, hari: number): string;

/** '2026-08-14' -> '14/08/2026' ; '' -> '-' */
export function formatTanggal(tanggalIso: string): string;

/** ISO datetime -> '14/08/2026 09:32' ; dipakai untuk riwayat & notifikasi */
export function formatWaktu(isoDateTime: string): string;
```

Implementasi `masaSimpanHari` yang diminta: ambil huruf pertama setelah `trim().toUpperCase()`; `'A'` -> `MASA_SIMPAN_A`, selain itu -> `MASA_SIMPAN_B`. Seluruh kode di master hanya diawali A atau B, jadi cabang default aman.

Implementasi `tambahHari` yang diminta (jangan pakai `Date.parse`/`toISOString`):
pecah string dengan `split('-')` -> `new Date(y, m - 1, d)` -> `setDate(getDate() + hari)` -> susun ulang `` `${yyyy}-${mm}-${dd}` `` dengan `padStart(2, '0')`.

**Verifikasi angka yang harus benar (dipakai QA di AC-23), basis tanggal timbang `2026-08-15`:**

| Kode | Masa simpan | Maksimal Simpan |
|---|---|---|
| `A102d` (Aki) | 185 hari | `2027-02-16` -> tampil `16/02/2027` |
| `B105d` (Oli) | 365 hari | `2027-08-15` -> tampil `15/08/2027` |

(2026 bukan kabisat; 2028 kabisat - hati-hati bila basis tanggal digeser.)

### 5.4 Notifikasi

```ts
export function buatNotifikasi(
  aksi: Aksi,
  pengajuan: Pengajuan,     // kondisi SESUDAH transisi
  konteks: { waktu: string; idAwal: number },
): Notifikasi[];
```

**Tabel penerima & isi - kontrak yang diuji AC-25/AC-26.** `{...}` = interpolasi. Tanggal dalam isi selalu lewat `formatTanggal()`.

| Aksi | # | Penerima | Subjek | Isi |
|---|---|---|---|---|
| `SUBMIT` | 1 | SUPERVISOR | `[Limbah B3] Pengajuan baru {nomor} menunggu persetujuan Anda` | `{diajukanOleh} mengajukan pembuangan limbah B3 sebanyak {n} item dari lokasi {lokasi}. Mohon tinjau dan setujui atau tolak.` |
|  | 2 | USER | `[Limbah B3] Pengajuan {nomor} berhasil dikirim` | `Pengajuan Anda ({n} item) telah diteruskan ke Supervisor {namaSupervisor} dan menunggu persetujuan.` |
| `RESUBMIT` | 1 | SUPERVISOR | `[Limbah B3] Pengajuan {nomor} diajukan ulang, menunggu persetujuan Anda` | `{diajukanOleh} telah memperbaiki dan mengajukan ulang pengajuan {nomor} ({n} item). Mohon tinjau kembali.` |
|  | 2 | USER | `[Limbah B3] Pengajuan {nomor} berhasil diajukan ulang` | `Perbaikan Anda telah diteruskan ke Supervisor {namaSupervisor} dan menunggu persetujuan.` |
| `SUP_APPROVE` | 1 | PIC | `[Limbah B3] {nomor} disetujui Supervisor, perlu jadwal timbang` | `Pengajuan {nomor} dari {diajukanOleh} telah disetujui {namaSupervisor}. Mohon tetapkan tanggal dan jam timbang, lalu setujui.` |
|  | 2 | USER | `[Limbah B3] {nomor} disetujui Supervisor` | `Pengajuan Anda disetujui {namaSupervisor}. Selanjutnya menunggu penjadwalan dari PIC {namaPic}.` |
| `SUP_REJECT` | 1 | USER | `[Limbah B3] {nomor} ditolak Supervisor` | `Pengajuan Anda ditolak oleh {namaSupervisor}. Alasan: {alasan} Anda dapat memperbaiki dan mengajukan ulang.` |
| `PIC_APPROVE` | 1 | USER | `[Limbah B3] {nomor} disetujui & terjadwal` | `Pengajuan Anda disetujui PIC {namaPic}. Timbang dijadwalkan {tanggalJadwal} pukul {jamJadwal} WIB.` |
|  | 2 | SUPERVISOR | `[Limbah B3] {nomor} disetujui & terjadwal` | `Pengajuan {nomor} dari {diajukanOleh} disetujui PIC {namaPic}. Timbang dijadwalkan {tanggalJadwal} pukul {jamJadwal} WIB.` |
| `PIC_REJECT` | 1 | USER | `[Limbah B3] {nomor} ditolak PIC` | `Pengajuan Anda ditolak oleh PIC {namaPic}. Alasan: {alasan} Anda dapat memperbaiki dan mengajukan ulang.` |
|  | 2 | SUPERVISOR | `[Limbah B3] {nomor} ditolak PIC` | `Pengajuan {nomor} dari {diajukanOleh} ditolak PIC {namaPic}. Alasan: {alasan}` |
| `PIC_WEIGH` | 1 | USER | `[Limbah B3] {nomor} selesai ditimbang & tervalidasi` | `Total berat final {totalKg} kg untuk {n} item. Diserahkan ke {tujuan} pada {tanggalBuang} dengan manifest {noManifest}.` |
|  | 2 | SUPERVISOR | `[Limbah B3] {nomor} selesai ditimbang & tervalidasi` | `Pengajuan {nomor} dari {diajukanOleh}: total berat final {totalKg} kg, diserahkan ke {tujuan} pada {tanggalBuang}, manifest {noManifest}.` |

Jumlah notifikasi per transisi: **2, 2, 2, 1, 2, 2, 2** (urut tabel di atas). Ini yang dihitung QA di AC-25.

---

## 6. Struktur Komponen & UI

### 6.1 Daftar file (100% di dalam `frontend/src/app/pages/b3-waste/`)

| File | Isi | Perkiraan |
|---|---|---|
| `b3-waste-model.ts` | Semua `interface`/`type`, konstanta, fungsi murni bagian 5. **Nol impor Angular.** | ~260 baris |
| `b3-waste-data.ts` | `MASTER_DEPARTEMEN`, `PENGGUNA`, `LABEL_STATUS`, `BADGE_STATUS`, `bangunSeed()`. | ~140 baris |
| `b3-waste.ts` | class **`B3Waste`** (nama wajib). Pemilik state, handler aksi, computed. | ~220 baris |
| `b3-waste.html` | Toolbar peran, tabs, form pengajuan, daftar, detail+aksi, timbang, notifikasi, placeholder. | ~380 baris |
| `b3-waste.css` | Style baru khusus halaman. **Maks 4 kB** (lihat 2.5). | <4 kB |
| `waste-picker.ts` | class **`WastePicker`**, selector `app-waste-picker`. | ~90 baris |
| `waste-picker.html` | Grid kartu cascade. | ~80 baris |
| `waste-picker.css` | Style cascade. **Maks 5 kB**. | <5 kB |
| `b3-waste-model.spec.ts` | *(opsional, milik QA)* unit test fungsi murni. | - |

**Tidak ada file lain.** Tidak ada `index.ts` barrel, tidak ada folder `models/`/`components/` di dalamnya - tujuh file datar sudah cukup dan lebih mudah diaudit.

Konvensi wajib (ikut codebase): file kebab-case tanpa sufiks tipe; class PascalCase tanpa sufiks `Component`; standalone (`imports: [...]` di dekorator); `@if`/`@for`/`@switch`; `signal`/`computed`; `inject()` bila perlu (di sini kemungkinan besar tidak perlu sama sekali).

### 6.2 `B3Waste` - state & anggota publik

```ts
// --- state utama ---
peranAktif   = signal<Peran>('USER');
tabAktif     = signal<Tab>('daftar');       // type Tab = 'ajukan'|'daftar'|'notifikasi'|'logbook'|'neraca'
pengajuan    = signal<Pengajuan[]>(seed.pengajuan);
notifikasi   = signal<Notifikasi[]>(seed.notifikasi);
pilihanId    = signal<number | null>(null); // null = tampilkan daftar, terisi = tampilkan detail
errors       = signal<string[]>([]);        // error aksi terakhir
infoAksi     = signal<string>('');          // konfirmasi inline, cth '2 notifikasi terkirim: Supervisor, User'

// --- state form (objek biasa, bukan signal - cukup untuk ngModel) ---
formHeader   : HeaderPengajuan;
formPilihan  : PilihanLimbah;               // dari WastePicker
formAlasan   = signal('');
formJadwal   = { tanggal: '', jam: '' };
formTimbang  : IsiTimbang;

// --- computed ---
penggunaAktif = computed(() => PENGGUNA[this.peranAktif()]);
terpilih      = computed(() => this.pengajuan().find(p => p.id === this.pilihanId()) ?? null);
antrean       = computed(() => ...);         // aturan 3.4
statistik     = computed(() => ({ total, menungguSup, menungguPic, terjadwal, selesai }));
notifikasiUrut= computed(() => [...this.notifikasi()].reverse()); // terbaru di atas
aksiTersedia  = computed(() => aksiUntuk(this.terpilih()?.status, this.peranAktif()));
```

Counter internal: `nextId`, `nextNomor`, `nextNotifId` (private field biasa, bukan signal - tidak dirender).

Handler (satu per aksi, semuanya bermuara ke satu helper privat `terapkan(aksi, target)`):
`ajukan()`, `ajukanUlang()`, `setujuiSupervisor()`, `tolakSupervisor()`, `setujuiPic()`, `tolakPic()`, `validasiTimbang()`.

`terapkan()` melakukan: panggil `jalankanAksi` -> bila `ok:false` set `errors` dan **berhenti** -> bila `ok:true` update array `pengajuan`, tambahkan `notifikasi`, kosongkan `errors`, isi `infoAksi`, reset form terkait.

Efek ganti peran: `gantiPeran(p)` menyetel `peranAktif`, mengosongkan `errors`, dan **bila** `tabAktif() === 'ajukan'` sedangkan `p !== 'USER'`, pindahkan ke `'daftar'`. **Tidak** menyentuh `pengajuan`/`notifikasi`/`pilihanId` (AC-30).

### 6.3 Tata letak halaman (satu route, semua tahap di dalamnya)

```
[.page-head]  judul + deskripsi
[.demo-bar]   "Mode Demo - lihat sebagai:" [User][Supervisor][PIC (Pak Ruli)]  <- lokal di halaman (AC-29)
              + kalimat kecil: "Alat demo prototipe, bukan sistem login."
[.stats]      5 kartu ringkas
[.tabs]       [Ajukan Pembuangan*] [Daftar Pengajuan] [Notifikasi (n)] [Logbook] [Neraca]
              (*tab Ajukan hanya dirender saat peran USER)
[konten tab]
```

- **Tab `daftar`**: `@if (terpilih())` -> panel detail (header, tabel item, riwayat/timeline, panel aksi sesuai peran+status, form timbang bila `APPROVED`+PIC) dengan tombol "<- Kembali ke daftar"; `@else` -> seksi "Perlu tindakan Anda" (kartu/tabel dari `antrean()`) + tabel "Semua Pengajuan" (kolom: Nomor, Diajukan oleh, Tanggal, Jumlah item, Total berat, Status, aksi "Lihat").
- **Tab `ajukan`**: `.form-panel` header + `<app-waste-picker>` + tombol Ajukan. Setelah sukses: `tabAktif='daftar'`, `pilihanId` = pengajuan baru, `infoAksi` terisi.
- **Perbaiki & ajukan ulang**: memakai tab `ajukan` juga - `ajukanUlangId` (signal) diset, form diisi ulang dari pengajuan lama, judul panel berubah jadi "Perbaiki Pengajuan {nomor}", dan banner `banner-danger` menampilkan alasan penolakan sebelumnya. Tombol jadi "Ajukan Ulang" -> aksi `RESUBMIT`.
- **Tab `notifikasi`**: daftar `notifikasiUrut()`; tiap baris: badge peran + nama + email penerima, subjek tebal, isi, waktu (`formatWaktu`), nomor pengajuan. Judul panel wajib menegaskan simulasi: "Simulasi Email - tidak ada email yang benar-benar dikirim".
- **Tab `logbook`** & **`neraca`**: panel berisi persis - "Menunggu format Excel dari user - belum dikerjakan." (+ satu kalimat penjelas). **Nol tabel, nol angka, nol perhitungan** (AC-31, NG1).

Keamanan yang dititipkan PM: teks "Lainnya" dan seluruh input user dirender lewat interpolasi `{{ }}`. **Dilarang `innerHTML`** di mana pun dalam folder ini.

### 6.4 `WastePicker` - kontrak input/output

```ts
export interface PilihanLimbah {
  items: ItemLimbah[];       // sudah lengkap: id, kode, masaSimpanHari, beratKg=null, maksSimpan=null
  lainnyaAktif: boolean;
  lainnya: string;
}

// selector: 'app-waste-picker'
nilaiAwal      = input<PilihanLimbah | null>(null);   // untuk mode perbaiki & ajukan ulang
pilihanChange  = output<PilihanLimbah>();             // di-emit setiap perubahan centang/teks
```

State internal (tidak diekspos):
```ts
// dept dipilih  <=> key ada di objek. sumber dibuka <=> key ada di objek anak.
seleksi = signal<Record<string, Record<string, string[]>>>({});  // deptId -> sumberKode -> kode jenis[]
lainnyaAktif = signal(false);
lainnyaTeks  = signal('');
```

Alasan bentuk bersarang: aturan "uncheck induk membersihkan turunannya" (AC-6) jadi satu operasi `delete` pada level yang tepat - tidak ada state yatim yang bisa bocor. Perubahan selalu membuat objek baru (immutability signal).

Konversi ke `items` (dipakai saat emit): untuk tiap deptId -> sumberKode -> tiap kode, cari `JenisLimbah` di master, hasilkan `ItemLimbah` dengan `id = ${deptId}-${sumberKode}-${kode}` dan `masaSimpanHari = masaSimpanHari(kode)`.

---

## 7. Cascade Checklist - Spesifikasi UI Detail

Mengadaptasi pola screenshot referensi (kartu induk berdeskripsi -> area anak ber-border aksen -> checkbox anak multi-select).

### 7.1 Tingkat 1 - kartu Departemen

Grid `repeat(auto-fit, minmax(260px, 1fr))`, 5 kartu: Engineering, QA, Produksi, Office, **Lainnya**.

Struktur tiap kartu:
```
+--------------------------------------------------+
| [x]  Engineering                                  |   <- checkbox + judul (font 15px, bold)
|      Limbah dari maintenance, workshop, dan       |   <- deskripsi (13px, var(--text-muted))
|      utility: oli, aki, filter, majun.            |
|  +--------------------------------------------+   |   <- area anak, HANYA saat tercentang
|  | (tingkat 2 & 3)                             |   |      border 1px + border-left 3px aksen
|  +--------------------------------------------+   |      var(--brand-500), background var(--bg)
+--------------------------------------------------+
```
- Kartu tercentang: `border-color: var(--brand-500)` + `box-shadow: 0 0 0 1px var(--brand-500)` (tanpa mengubah layout / tanpa geser 1px).
- Kartu tidak tercentang: **area anak tidak ada di DOM sama sekali** (`@if`), bukan sekadar `display:none` - AC-2 diuji lewat DOM.
- Seluruh kartu bisa diklik untuk toggle (`<label>` membungkus), tapi klik di dalam area anak **tidak** boleh menoggle induk (area anak berada di luar `<label>` induk).

Deskripsi kartu (teks final, ditulis Architect karena spec sumber tidak menyediakannya):

| Kartu | Deskripsi |
|---|---|
| Engineering | `Limbah dari kegiatan maintenance, workshop, dan utility: oli, aki, filter, majun.` |
| QA | `Limbah dari laboratorium quality assurance: bahan kimia kadaluarsa dan residu sampel.` |
| Produksi | `Limbah dari empat line produksi: OC3, GBL, CAN-PET, dan Sachet.` |
| Office | `Limbah perkantoran: kemasan tinta, toner, dan lampu TL bekas.` |
| Lainnya | `Departemen atau jenis limbah yang belum terdaftar. Tuliskan keterangannya di kolom teks.` |

### 7.2 Tingkat 2 - Sumber / line

Dua perilaku, ditentukan oleh `sumber.length`:

- **Satu sumber** (Engineering/ENG, QA/QA-LAB, Office/OFFICE): saat departemen dicentang, sumber itu **otomatis terbuka** - tidak ada checkbox sumber. Ditampilkan sebagai baris label statis: `Sumber: ENG - Workshop & Utility`, langsung diikuti checklist jenis (AC-3).
  Implementasi: saat mencentang dept, inisialisasi `seleksi[deptId] = { [sumber[0].kode]: [] }`.
- **Empat sumber** (Produksi: `OC3`, `GBL`, `CAN-PET`, `Sachet`): tampil sebagai **4 checkbox** dalam satu baris chip. Multi-select. Mencentang salah satunya membuka blok jenis miliknya sendiri (bersarang satu tingkat lagi, border-left aksen lebih tipis). Uncheck sumber -> `delete seleksi[deptId][sumberKode]` (jenis di bawahnya hilang).
  Implementasi: saat mencentang dept Produksi, inisialisasi `seleksi['produksi'] = {}` (belum ada sumber terbuka).

Label sumber (`SumberLimbah.nama`) murni kosmetik; **kode** (`ENG`, `OC3`, `GBL`, `CAN-PET`, `Sachet`, `QA-LAB`, `OFFICE`) adalah yang otoritatif dan wajib tampil.

### 7.3 Tingkat 3 - Jenis sampah

- Checklist multi-select (AC-5), tata letak grid 2 kolom pada layar lebar, 1 kolom sempit.
- Label tiap baris: `{nama}` + `<span class="kode-chip">{kode}</span>` (chip kecil monospace) - kode **wajib** terlihat (AC-4).
- Isi daftar **persis** dari `MASTER_DEPARTEMEN` (bagian 8.1). Dilarang menambah/mengurangi/mengurutkan ulang.
- Ringkasan kecil di bawah tiap blok: `{k} jenis dipilih`.

### 7.4 Kartu "Lainnya"

Kartu ke-5 di grid yang sama. Saat dicentang, area anak berisi satu `<textarea rows="2">` (atau `<input type="text">`) dengan placeholder `Tuliskan departemen/jenis limbah yang belum terdaftar` dan `maxlength="200"`. Isinya dibawa ke `Pengajuan.lainnya` (AC-7) dan ditampilkan di panel detail sebagai baris "Catatan Lainnya". Uncheck -> teks dikosongkan.

### 7.5 Ringkasan pilihan (di bawah grid, dalam WastePicker)

Satu baris: `Total dipilih: {n} jenis limbah dari {m} sumber.` - memberi umpan balik sebelum submit dan memudahkan QA menghitung.

---

## 8. Mock Data

### 8.1 `MASTER_DEPARTEMEN` - transkripsi PERSIS dari spec sumber Bagian 4

> Dilarang keras menambah, mengurangi, atau mengubah nama/kode jenis. Angka di kolom "Jumlah" adalah checksum untuk QA (AC-4).

| Departemen (`id`) | Sumber (`kode`) | `nama` sumber (label) | Jenis (nama - kode), berurutan | Jumlah |
|---|---|---|---|---|
| Engineering (`engineering`) | `ENG` | Workshop & Utility | Oli - `B105d`; Aki - `A102d`; Elektrik - `B107d`; Filter - `B109d`; Baterai Lithium - `B326-1`; Majun - `B110d`; Kemasan ex-Chemical - `B104d`; Terkontaminasi - `A108d`; POPs - `A101d` | **9** |
| QA (`qa`) | `QA-LAB` | Laboratorium QA | Bahan Kimia Kadaluarsa - `A338-1`; Residu Sample - `A338-3`; Kemasan ex-Chemical - `B104d`; Terkontaminasi - `A108d` | **4** |
| Produksi (`produksi`) | `OC3` | Line OC3 | Kemasan ex-Chemical - `B104d`; Majun - `B110d`; Oli - `B105d`; Terkontaminasi - `A108d` | **4** |
| Produksi (`produksi`) | `GBL` | Line GBL | Kemasan ex-Chemical - `B104d`; Majun - `B110d`; Terkontaminasi - `A108d` | **3** |
| Produksi (`produksi`) | `CAN-PET` | Line CAN-PET | Kemasan ex-Chemical - `B104d`; Majun - `B110d`; Oli - `B105d`; Elektrik - `B107d` | **4** |
| Produksi (`produksi`) | `Sachet` | Line Sachet | Kemasan ex-Chemical - `B104d`; Majun - `B110d`; Terkontaminasi - `A108d` | **3** |
| Office (`office`) | `OFFICE` | Area Perkantoran | Kemasan Tinta - `B321-4`; Toner - `B353-1`; Lampu TL/Elektrik - `B107d` | **3** |

Bentuk literal: satu array `DepartemenLimbah[]` berisi 4 elemen; elemen `produksi` punya 4 `SumberLimbah`, tiga lainnya punya 1.

Turunan masa simpan yang otomatis benar bila `masaSimpanHari()` dipakai: `A101d`, `A102d`, `A108d`, `A338-1`, `A338-3` -> **185**; `B104d`, `B105d`, `B107d`, `B109d`, `B110d`, `B321-4`, `B326-1`, `B353-1` -> **365**.

### 8.2 Seed pengajuan - dibangun dengan replay reducer

`bangunSeed()` **tidak** menulis objek `Pengajuan` lengkap secara literal. Ia mendefinisikan 4 skrip pendek lalu memanggil `jalankanAksi()` berturut-turut dengan timestamp tetap. Alasan: riwayat & notifikasi seed otomatis konsisten dengan mesin status (tidak ada dua sumber kebenaran), dan seed langsung menjadi asap-uji reducer.

```ts
export function bangunSeed(): { pengajuan: Pengajuan[]; notifikasi: Notifikasi[]; nextId: number; nextNomor: number; nextNotifId: number };
```

Empat seed (tanggal literal, deterministik - **jangan** memakai `new Date()`):

| # | Nomor | Header | Item (deptId/sumber/kode) | Skrip aksi | Status akhir |
|---|---|---|---|---|---|
| 1 | `PLB3/2026/0001` | Sukabumi; PT PLIB; Feri Aryanto; `2026-08-10`; usulan `2026-08-14` | `engineering/ENG/B105d` (Oli), `engineering/ENG/A102d` (Aki), `engineering/ENG/B110d` (Majun) | `SUBMIT` @ `2026-08-10T08:15` -> `SUP_APPROVE` @ `2026-08-10T10:40` -> `PIC_APPROVE` (`2026-08-15`, `09:00`) @ `2026-08-11T08:05` | **`APPROVED`** (siap ditimbang PIC) |
| 2 | `PLB3/2026/0002` | Sukabumi; PT PLIB; Feri Aryanto; `2026-08-12`; usulan `''` | `produksi/OC3/B104d`, `produksi/OC3/B110d`, `produksi/GBL/A108d` | `SUBMIT` @ `2026-08-12T09:20` -> `SUP_APPROVE` @ `2026-08-12T13:05` | **`WAIT_PIC`** (antrean PIC) |
| 3 | `PLB3/2026/0003` | Sukabumi; PT PLIB; Feri Aryanto; `2026-08-13`; usulan `2026-08-18`; `lainnya: 'Drum bekas cat dari area workshop, belum ada kodenya.'` | `qa/QA-LAB/A338-1`, `qa/QA-LAB/A338-3` | `SUBMIT` @ `2026-08-13T07:45` | **`WAIT_SUP`** (antrean Supervisor) |
| 4 | `PLB3/2026/0004` | Sukabumi; PT PLIB; Feri Aryanto; `2026-08-13`; usulan `''` | `office/OFFICE/B321-4`, `office/OFFICE/B353-1` | `SUBMIT` @ `2026-08-13T14:10` -> `SUP_REJECT` alasan `Jumlah toner bekas belum dipisahkan dari kemasan tinta. Mohon dipisah dan diajukan ulang.` @ `2026-08-13T15:30` | **`REJ_SUP`** (perlu perbaikan User) |

Dengan 4 seed ini, ketiga peran punya pekerjaan begitu halaman dibuka: Supervisor lihat #3, PIC lihat #2 (jadwal) dan #1 (timbang), User lihat #4 (perbaiki). Status `REJ_PIC` dan `WEIGHED` sengaja **tidak** di-seed - keduanya dicapai dalam satu klik dari #2 dan #1, dan itu justru yang ingin diperagakan. Notifikasi seed yang dihasilkan: 2+2+2 (#1) + 2+2 (#2) + 2 (#3) + 2+1 (#4) = **15 entri**.

`nextId = 5`, `nextNomor = 5` (menghasilkan `PLB3/2026/0005`), `nextNotifId = 16`.

---

## 9. ADR

### ADR-1: State di container + reducer murni, bukan service/store injectable

**Konteks.** Ada 6 status, 7 transisi, 15+ aturan validasi, dan 3 sudut pandang peran. Refleks umum: bikin `WorkflowStore` injectable ber-signal.
**Keputusan.** State hidup sebagai signal di class `B3Waste`. Seluruh logika transisi ada di fungsi murni `jalankanAksi()` di file terpisah tanpa impor Angular.
**Alasan.** Store injectable menambah lapisan tanpa konsumen kedua (halaman ini satu-satunya). Sebaliknya, memisahkan **logika** (bukan state) ke fungsi murni memberi manfaat nyata: bisa diuji Vitest tanpa TestBed, dan Code Review bisa memverifikasi "transisi tidak tersebar" dengan mencari `status:` di seluruh folder - hasilnya harus hanya di satu file.
**Konsekuensi.** (+) Uji cepat & deterministik; permukaan API kecil. (-) Bila kelak butuh state B3 di halaman lain, perlu refactor mengangkatnya jadi service - refactor mekanis 30 menit, dan saat itu kebutuhannya sudah nyata (YAGNI).

### ADR-2: Dua komponen saja (`B3Waste` + `WastePicker`)

**Konteks.** Halaman memuat 5 tab dan 4 form; godaan memecah per tahap besar.
**Keputusan.** Satu container + satu komponen anak (cascade picker). Tab & tahap dikendalikan `@if`/`@switch` atas `tabAktif`, `pilihanId`, `peranAktif`, `status`.
**Alasan.** Setiap pecahan tahap akan menerima pengajuan yang sama dan mengembalikan aksi ke induk - murni plumbing. `WastePicker` beda: dipakai dua kali (ajukan & ajukan ulang) dan punya state bersarang sendiri; isolasinya membuat aturan reset AC-6 sepele dan memberi ruang budget CSS terpisah (2.5).
**Konsekuensi.** (+) Alur data satu arah tanpa `output` berantai; jumlah file minimum. (-) `b3-waste.html` panjang (~380 baris); dimitigasi dengan komentar penanda seksi (`<!-- ==== TAB: DAFTAR ==== -->`). Konsisten dengan `inspection.html` yang sudah ada.

### ADR-3: Notifikasi adalah nilai kembalian reducer, bukan efek samping

**Konteks.** "Email terkirim" perlu disimulasikan; refleks umum: service notifikasi + toast bertimer.
**Keputusan.** `jalankanAksi()` mengembalikan `notifikasi: Notifikasi[]` bersamaan dengan pengajuan baru. Container hanya menyimpannya ke daftar. Tampilan: tab "Notifikasi" + badge jumlah + satu baris konfirmasi inline setelah aksi. Tanpa toast, tanpa `setTimeout`.
**Alasan.** Yang diuji AC-25/26 adalah **siapa menerima apa**, bukan animasi. Sebagai nilai balik, itu bisa di-assert langsung di unit test; sebagai efek samping, butuh spy/mock. Toast bertimer juga menambah kerumitan zoneless yang tidak dibayar manfaatnya.
**Konsekuensi.** (+) Deterministik & mudah diaudit; log lengkap tersimpan. (-) Umpan balik kurang "hidup" dibanding toast; dibayar dengan badge jumlah pada tab dan baris `infoAksi`.

### ADR-4: Seed dibangun dengan mereplay aksi, bukan literal objek jadi

**Konteks.** Seed harus punya riwayat dan notifikasi yang masuk akal untuk 4 status berbeda.
**Keputusan.** `bangunSeed()` menjalankan skrip aksi lewat `jalankanAksi()` dengan timestamp tetap.
**Alasan.** Menulis literal `riwayat` + `notifikasi` tangan berarti ~150 baris yang bisa melenceng dari perilaku reducer - persis kelas bug yang membuat QA mengejar hantu. Replay = satu sumber kebenaran, dan seed sekaligus jadi asap-uji.
**Konsekuensi.** (+) Konsistensi dijamin; hemat ~150 baris. (-) Seed tidak bisa memuat kondisi mustahil (justru diinginkan); bila reducer bug, halaman gagal render sejak awal - terdeteksi dini, bukan diam-diam.

---

## 10. Pembagian Tugas Implementasi

Hanya ada satu pelaksana (Frontend), jadi ini urutan kerja - **dan urutan ini penting**: kontrak murni dulu, UI belakangan.

| # | Tugas | File | Selesai bila |
|---|---|---|---|
| F1 | Tipe, konstanta, fungsi hitung/format | `b3-waste-model.ts` | `masaSimpanHari`, `tambahHari`, `formatTanggal`, `formatWaktu` sesuai tabel 5.3 |
| F2 | Validasi + reducer + notifikasi | `b3-waste-model.ts` | 7 transisi tabel 3.2 jalan; string error persis tabel 5.2; jumlah notifikasi persis 5.4 |
| F3 | Master data + pengguna + seed | `b3-waste-data.ts` | Checksum jenis (9/4/4/3/4/3/3) cocok; 4 seed lahir dengan status benar; 15 notifikasi |
| F4 | Cascade picker | `waste-picker.*` | Bagian 7 terpenuhi (AC-1..AC-7); file CSS <5 kB |
| F5 | Kerangka halaman: toolbar peran, tabs, statistik, placeholder | `b3-waste.*` | AC-29, AC-30, AC-31 |
| F6 | Tab ajukan + ajukan ulang | `b3-waste.*` | AC-8, AC-9, AC-10, AC-17 |
| F7 | Daftar + antrean + detail + timeline riwayat | `b3-waste.*` | AC-18 (tombol per peran), antrean 3.4 |
| F8 | Panel approval Supervisor & PIC | `b3-waste.*` | AC-11..AC-16 |
| F9 | Form timbang + kunci read-only | `b3-waste.*` | AC-19..AC-24 |
| F10 | Tab notifikasi | `b3-waste.*` | AC-25..AC-27 |
| F11 | Rapikan: cek ukuran CSS, `npm run build`, audit daftar file | - | AC-28, AC-32, AC-33, AC-34 |

Bila QA menulis unit test (opsional), sasarannya **hanya** F1-F3 - itu bagian murni dan tempat semua aturan berbahaya berada.

---

## 11. Skenario Acceptance Test (acuan QA)

Format: langkah konkret + hasil yang diharapkan. Kolom "AC" memetakan ke 01-spec Bagian 8. Skenario dijalankan berurutan dalam **satu sesi tanpa refresh** kecuali disebut lain.

### S1 - Muat awal & role switcher (AC-29, AC-30, AC-31, AC-1)
1. Buka `/b3-waste`. -> Judul halaman tampil; toolbar "Mode Demo - lihat sebagai:" berada **di dalam area konten**, bukan di topbar aplikasi (topbar tetap hanya berisi judul, dark mode, fullscreen, user chip). **AC-29**
2. Periksa tab. -> Ada tab `Logbook` dan `Neraca`; keduanya hanya berisi teks "Menunggu format Excel dari user - belum dikerjakan.", tanpa tabel/angka. **AC-31**
3. Tab "Ajukan Pembuangan" (peran USER) -> grid menampilkan **5 kartu**: Engineering, QA, Produksi, Office, Lainnya; tiap kartu punya judul **dan** kalimat deskripsi. **AC-1**
4. Klik "Supervisor" lalu "PIC", lalu kembali "User". -> Tidak ada reload (URL tetap `/b3-waste`, state scroll/tab tidak reset); jumlah pengajuan di statistik tetap 4. **AC-30**

### S2 - Cascade checklist (AC-2..AC-7)
1. Peran USER, tab Ajukan. Kartu Engineering belum dicentang -> tidak ada area anak di DOM. **AC-2**
2. Centang Engineering. -> Muncul area ber-border aksen; tertulis sumber `ENG` **tanpa** checkbox sumber; checklist jenis langsung terlihat. **AC-3**
3. Hitung jenis di ENG -> tepat **9** baris, berurutan: Oli `B105d`, Aki `A102d`, Elektrik `B107d`, Filter `B109d`, Baterai Lithium `B326-1`, Majun `B110d`, Kemasan ex-Chemical `B104d`, Terkontaminasi `A108d`, POPs `A101d`. Tidak ada jenis lain. **AC-4**
4. Centang Produksi. -> Muncul 4 pilihan sumber: `OC3`, `GBL`, `CAN-PET`, `Sachet`. Centang `OC3` -> 4 jenis; centang `GBL` juga -> blok kedua muncul, blok `OC3` tetap ada dengan 3 jenis di GBL. **AC-3, AC-5**
5. Di ENG, centang Oli **dan** Aki bersamaan. -> Dua-duanya tercentang. **AC-5**
6. Uncheck Engineering. -> Area anak hilang. Centang lagi Engineering. -> Checklist muncul **kosong** (Oli & Aki tidak lagi tercentang); ringkasan "Total dipilih" tidak menghitung item Engineering. **AC-6**
7. Centang kartu "Lainnya", isi `Drum bekas cat`. -> Input teks muncul. (Isinya diverifikasi terbawa di S3.) **AC-7**
8. Telusuri seluruh form pengajuan. -> **Tidak ada** input berat/volume/jumlah kg di mana pun. **AC-8**

### S3 - Submit: jalur gagal lalu berhasil (AC-9, AC-10)
1. Kosongkan field Lokasi, jangan centang jenis apa pun, klik "Ajukan". -> Muncul daftar error memuat `Lokasi wajib diisi.` **dan** `Pilih minimal satu jenis sampah.`; tidak ada pengajuan baru (statistik tetap). **AC-9**
2. Isi header lengkap (Lokasi `Sukabumi`, Pelaksana `PT PLIB`, Diajukan oleh `Feri Aryanto`, Tanggal pengajuan terisi), tetap tanpa jenis -> klik Ajukan. -> Error hanya `Pilih minimal satu jenis sampah.`; status tak berubah. **AC-9**
3. Centang Engineering -> Oli (`B105d`) dan Aki (`A102d`); kartu Lainnya tercentang dengan teks `Drum bekas cat`. Klik Ajukan. -> Pengajuan baru `PLB3/2026/0005` berstatus **Diajukan (`WAIT_SUP`)**; detailnya menampilkan 2 item dan baris "Catatan Lainnya: Drum bekas cat". **AC-7, AC-10**
4. Ganti peran ke Supervisor, buka tab Daftar. -> `PLB3/2026/0005` ada di seksi "Perlu tindakan Anda". **AC-10**

### S4 - Approval Supervisor (AC-11, AC-12, AC-13, AC-18)
1. Peran USER, buka detail `PLB3/2026/0005`. -> Tidak ada tombol Setujui/Tolak sama sekali. **AC-18**
2. Ganti ke Supervisor, buka detail yang sama, klik Tolak dengan alasan berisi spasi saja (`"   "`). -> Error `Alasan penolakan wajib diisi.`; status tetap **Diajukan**. **AC-11**
3. Isi alasan `Kode aki belum sesuai manifest.`, klik Tolak. -> Status jadi **Ditolak Supervisor (`REJ_SUP`)**. Ganti ke peran USER -> alasan itu terbaca di detail (banner/riwayat). **AC-12**
4. Peran USER, klik "Perbaiki & Ajukan Ulang", ubah/biarkan pilihan, submit. -> Status kembali **Diajukan (`WAIT_SUP`)**; riwayat memuat entri penolakan lama **dan** entri pengajuan ulang. **AC-17**
5. Ganti ke Supervisor, klik Setujui. -> Status **Disetujui Supervisor (`WAIT_PIC`)**. Ganti ke PIC -> pengajuan muncul di antrean "Perlu tindakan Anda". **AC-13**
6. Peran Supervisor, buka pengajuan `PLB3/2026/0001` (status `APPROVED`). -> **Tidak ada** tombol Timbang. **AC-18**

### S5 - Approval PIC (AC-14, AC-15, AC-16)
1. Peran PIC, buka `PLB3/2026/0002` (`WAIT_PIC`). Kosongkan jam, isi tanggal saja, klik Setujui. -> Error `Jam jadwal timbang wajib diisi.`; status tetap `WAIT_PIC`. Ulangi dengan jam terisi tapi tanggal kosong -> `Tanggal jadwal timbang wajib diisi.`; status tetap. **AC-14**
2. Isi tanggal `2026-08-20` dan jam `10:00`, klik Setujui. -> Status **Disetujui & Terjadwal (`APPROVED`)**; jadwal tampil. Ganti ke USER lalu Supervisor -> jadwal terbaca di kedua sudut pandang. **AC-15**
3. Peran PIC, buka pengajuan lain berstatus `WAIT_PIC` (atau hasil S4 langkah 5), klik Tolak dengan alasan kosong -> ditolak validasi. Isi alasan `TPS penuh, tunda minggu depan.` -> status **Ditolak PIC (`REJ_PIC`)**. **AC-16**

### S6 - Timbang & validasi (AC-19..AC-24)
1. Peran PIC, buka `PLB3/2026/0003` (`WAIT_SUP`). -> Form timbang **tidak** tersedia. Buka `PLB3/2026/0001` (`APPROVED`) -> form timbang tersedia. **AC-19**
2. `PLB3/2026/0001` berisi item Oli `B105d`, Aki `A102d`, Majun `B110d`. Isi berat hanya untuk 2 item (satu kosong), klik Validasi. -> Error `Berat setiap item wajib diisi dan lebih besar dari 0 kg.`; status tetap `APPROVED`. Ulangi dengan salah satu berat `0` -> error sama. **AC-20**
3. Isi semua berat (`120`, `35`, `18`), kosongkan Nomor manifest -> Validasi. -> Error `Nomor manifest wajib diisi.`. Kosongkan Tujuan -> `Tujuan penyerahan wajib diisi.`. **AC-21**
4. Isi Tujuan `PT PLIB` dan Manifest `MNF-2608-001`, jangan centang pernyataan -> Validasi. -> Error `Centang pernyataan validasi PIC.`; status tetap. **AC-22**
5. Set Tanggal timbang `2026-08-15`. -> Kolom "Maksimal Simpan" terhitung otomatis: Aki `A102d` -> **16/02/2027** (185 hari); Oli `B105d` -> **15/08/2027** (365 hari). **AC-23**
6. Centang pernyataan, isi Tanggal pembuangan `2026-08-15`, klik Validasi. -> Status **Ditimbang & Tervalidasi (`WEIGHED`)**; seluruh field jadi teks read-only; tidak ada tombol/input untuk mengubah berat dari peran mana pun. **AC-24**

### S7 - Notifikasi (AC-25, AC-26, AC-27)
1. Buka tab Notifikasi. -> Terlihat daftar dengan penerima (peran + nama + email), subjek, isi, waktu, nomor pengajuan; ada pernyataan bahwa ini simulasi. **AC-27**
2. Hitung notifikasi yang lahir di S3 langkah 3 (`SUBMIT`) -> tepat **2**: satu ke Supervisor (Andi Nugroho), satu ke User (Feri Aryanto). **AC-25**
3. Hitung notifikasi S4 langkah 3 (`SUP_REJECT`) -> tepat **1**, ke User, dan isinya memuat kalimat alasan `Kode aki belum sesuai manifest.` **AC-25, AC-26**
4. Hitung notifikasi S5 langkah 2 (`PIC_APPROVE`) -> tepat **2** (User + Supervisor), isinya memuat `20/08/2026` dan `10:00`. **AC-25, AC-26**
5. Hitung notifikasi S6 langkah 6 (`PIC_WEIGH`) -> tepat **2** (User + Supervisor), memuat total berat `173` kg dan `MNF-2608-001`. **AC-25**
6. Cek `PIC_REJECT` (S5 langkah 3) -> tepat **2** (User + Supervisor), keduanya memuat alasan. **AC-25, AC-26**

### S8 - Scope & build (AC-28, AC-32, AC-33, AC-34)
1. Cari `HttpClient`, `fetch(`, `XMLHttpRequest`, `provideHttpClient` di seluruh `pages/b3-waste/`. -> Nol hasil. Buka DevTools Network saat menjalankan S3-S6 -> nol request selain aset statis. **AC-28**
2. Daftar seluruh file yang dibuat/diubah. -> 100% di dalam `frontend/src/app/pages/b3-waste/`. `app.routes.ts`, `shared/menu.ts`, `layout/**`, `shared/feature-page.css`, `shared/icon/icon.ts`, `styles.css`, `package.json`, seluruh `backend/` **tidak berubah** (bandingkan isi/waktu-ubah). **AC-32**
3. Jalankan `npm run build` di `frontend/`. -> Sukses tanpa error. Bandingkan `package.json` dependencies dengan daftar di 01-spec -> identik. Perhatikan juga tidak ada budget **error** `anyComponentStyle` (warning boleh). **AC-33**
4. Buka `/company-reports`, `/inspection`, `/dashboard`. -> Ketiganya terbuka normal seperti sebelumnya. **AC-34**

### Peta AC -> skenario

| AC | Skenario | AC | Skenario |
|---|---|---|---|
| 1 | S1.3 | 18 | S4.1, S4.6 |
| 2 | S2.1-2 | 19 | S6.1 |
| 3 | S2.2, S2.4 | 20 | S6.2 |
| 4 | S2.3 | 21 | S6.3 |
| 5 | S2.4, S2.5 | 22 | S6.4 |
| 6 | S2.6 | 23 | S6.5 |
| 7 | S2.7, S3.3 | 24 | S6.6 |
| 8 | S2.8 | 25 | S7.2-6 |
| 9 | S3.1-2 | 26 | S7.3-4, S7.6 |
| 10 | S3.3-4 | 27 | S7.1 |
| 11 | S4.2 | 28 | S8.1 |
| 12 | S4.3 | 29 | S1.1 |
| 13 | S4.5 | 30 | S1.4 |
| 14 | S5.1 | 31 | S1.2 |
| 15 | S5.2 | 32 | S8.2 |
| 16 | S5.3 | 33 | S8.3 |
| 17 | S4.4 | 34 | S8.4 |

### Unit test opsional (bila QA menambah `b3-waste-model.spec.ts`)

Sasaran minimal, semuanya tanpa TestBed: `masaSimpanHari('A102d') === 185` & `masaSimpanHari('B105d') === 365`; `tambahHari('2026-08-15', 185) === '2027-02-16'` & `tambahHari('2026-08-15', 365) === '2027-08-15'`; setiap transisi tabel 3.2 (ok) dan minimal 6 transisi terlarang (`ok:false` dengan `E_GUARD`); tiap aturan validasi tabel 5.2; jumlah + penerima notifikasi tabel 5.4.

---

## 12. Risiko Teknis

| # | Risiko | Dampak | Mitigasi (sudah dibakukan di dokumen ini) |
|---|---|---|---|
| **R-1** | **Budget CSS produksi.** `anyComponentStyle` error di 10 kB; `feature-page.css` sudah 5,0 kB dan ikut dihitung ke komponen `B3Waste`. CSS cascade yang ditulis serampangan bisa **menggagalkan `npm run build`** -> AC-33 FAIL. | Tinggi | Alokasi 2.5: `b3-waste.css` <=4 kB, seluruh style cascade pindah ke `waste-picker.css` (<=5 kB, komponen terpisah = budget terpisah). F11 wajib cek ukuran file. |
| **R-2** | **Pergeseran tanggal karena zona waktu.** `toISOString()` / `DatePipe` atas string `YYYY-MM-DD` menggeser sehari di WIB -> AC-23 FAIL dengan gejala membingungkan. | Tinggi | Kontrak 2.4: aritmetika manual `new Date(y, m-1, d)` + format `padStart`; `DatePipe` dilarang untuk field tanggal; angka verifikasi eksplisit di 5.3. |
| **R-3** | **Logika transisi bocor ke template.** Mudah sekali menulis `p.status = 'APPROVED'` langsung di handler; Code Review menandai ini (fokus (c)). | Sedang | Aturan tunggal bagian 1; `Pengajuan.status` hanya ditulis di `jalankanAksi()`. Audit: cari `status:` / `status =` di folder - hasil sah hanya di `b3-waste-model.ts`. |
| **R-4** | **Over-engineering** (service, store, komponen per tahap, reactive forms) - task ini sangat mengundangnya. | Sedang | Daftar "sengaja tidak dibuat" 1.1 + ADR-1/ADR-2 sebagai dasar penolakan saat review. |
| **R-5** | **`app.spec.ts` yang sudah ada SEKARANG GAGAL** (mengharapkan `<h1>Hello, frontend</h1>`, padahal `app.html` hanya `<router-outlet />`). Bila QA menjalankan `npm test`, akan merah **bukan karena** pekerjaan ini. | Rendah | Dicatat di sini. QA: kegagalan `app.spec.ts` adalah kondisi pra-ada, di luar scope, **jangan** diperbaiki (file di luar whitelist AC-32). Gerbang build adalah `npm run build`, bukan `npm test`. |
| **R-6** | Nama class/berkas komponen route berubah -> `app.routes.ts` terpaksa diedit -> AC-32 FAIL mutlak. | Rendah tapi fatal | Kunci 2.1: `pages/b3-waste/b3-waste.ts` harus tetap meng-export class `B3Waste`. |
| **R-7** | Master data tergoda "dirapikan" (menambah jenis, mengurutkan ulang, menyeragamkan nama). | Sedang | Checksum jumlah jenis 9/4/4/3/4/3/3 di 8.1; AC-4 diuji per baris. |
| **R-8** | `b3-waste.html` membengkak sampai sulit dibaca. | Rendah | Batas praktis: bila melewati ~450 baris, satu-satunya pemecahan yang diizinkan adalah mengeluarkan **panel timbang** jadi komponen ke-3 di folder yang sama. Selain itu, tetap satu template. |

---

## 13. Hal yang Perlu Dikonfirmasi ke User (tidak memblokir Frontend)

Semuanya sudah punya keputusan kerja; ini hanya untuk diketahui user pada checkpoint berikutnya.

1. **Status ke-6 `WEIGHED`** - penambahan sadar di luar 5 status spec sumber (keputusan PM 5.4). Dipakai sebagai status terminal babak ini.
2. **Nama PIC "Pak Ruli"** dipakai di seluruh UI & notifikasi, menggantikan "Pak Feri (K3L)" di spec sumber. "Feri Aryanto" tetap sebagai contoh pemohon.
3. **Kartu "Lainnya" tidak menghasilkan item yang bisa ditimbang** (tidak punya kode -> tidak punya masa simpan). Ia tersimpan sebagai catatan pengajuan. Konsekuensinya: mencentang Lainnya saja tidak cukup untuk submit.
4. **Deskripsi kartu departemen & label sumber** (mis. "Line OC3", "Workshop & Utility") ditulis Architect karena spec sumber tidak menyediakannya. **Kode** sumber dan seluruh **jenis + kode** tidak diubah sedikit pun.
5. **Masa simpan A = 185 hari** (bukan 180) - mengikuti arahan spec sumber; konstanta `MASA_SIMPAN_A` ada di satu tempat bila perlu diubah.

---
---

# BABAK 2 - Logbook & Neraca (penambahan kontrak, 2026-08-14)

> **Status dokumen.** Bagian 1-13 di atas adalah kontrak babak 1 yang **sudah diimplementasi, direview, dan lolos QA** - tidak ada satu pun yang dicabut atau diubah oleh bagian ini. Bagian 14-26 di bawah adalah **penambahan murni** untuk babak 2 (`01-spec.md` Bagian 0 AMANDEMEN, goal G7-G10).
>
> **Cara membaca.** Sama seperti babak 1: nama tipe, nama field, nama fungsi, dan string yang ditulis di sini bersifat **mengikat** - Frontend memakainya persis, QA menguji dengan itu. Satu-satunya sumber kebenaran format dokumen adalah `logbook-neraca-format-reference.md`; dokumen ini menerjemahkannya jadi kontrak kode, bukan mendesain ulang formatnya.

---

## 14. Ruang Lingkup Babak 2 & Prinsip Pengikat

**Yang dibangun:** tab Logbook (replika FR/K3L/006/01), tab Neraca (replika FR/K3L/006/02/1), preview editable di Tahap 4, tombol Unduh PDF via `window.print()`.

**Tiga prinsip yang mengikat seluruh bagian ini** (pelanggaran = NEED FIX di Code Review):

**P-1. Satu sumber data - Logbook & Neraca adalah PROYEKSI, bukan penyimpanan.**
Spec sumber Bagian 1 & 7: *"logbook + neraca terbentuk otomatis dari satu sumber data (tidak ada input ganda)"*, *"Logbook & Neraca bukan input terpisah, melainkan proyeksi dari transaksi yang sama"*. Konsekuensi keras: **dilarang ada `signal<LogbookEntry[]>`, `signal<Neraca>`, atau array logbook yang di-`push`/`update` di mana pun.** Seluruh Logbook & Neraca lahir dari `computed()` di atas `pengajuan()` yang sudah ada. Audit Code Review: `grep "signal<Logbook"` dan `grep "signal<Neraca"` di folder `b3-waste/` harus **nol hasil**.

**P-2. Status & data pengajuan tetap hanya ditulis oleh `jalankanAksi()`.** Aturan arsitektural babak 1 (Bagian 1) tidak melunak. Semua "edit PIC" di preview bermuara ke payload `IsiTimbang` yang masuk ke reducer lewat aksi `PIC_WEIGH` yang sudah ada. **Tidak ada aksi baru, tidak ada status baru** di babak 2.

**P-3. Model satu-event dipertahankan apa adanya** (referensi keputusan #2): timbang = penyerahan sekaligus -> `Sisa` logbook selalu 0, seluruh Perlakuan Neraca masuk kategori `DISERAHKAN PIHAK KE-3`, `C = 0`, `D = 0`, `Kinerja = 100,00%`. Ini bukan penyederhanaan yang dikarang - itu pola seluruh data sample user.

### 14.1 Yang sengaja TIDAK dibuat (lanjutan tabel 1.1)

| Yang lazim dibuat orang | Keputusan | Alasan |
|---|---|---|
| `LogbookStore` / signal penampung baris logbook | **TIDAK** | P-1. Baris logbook 100% dapat diturunkan dari `Pengajuan` berstatus `WEIGHED` (lihat tabel pemetaan 15.2 - nol field yatim). Menyimpannya lagi = dua sumber yang bisa menyimpang. |
| Aksi/status baru (`LOGBOOK_ENTRY`, `POSTED`, dst.) | **TIDAK** | `WEIGHED` sudah berarti "sudah masuk logbook". Menambah status = menambah 7 sel matriks tanpa perilaku baru. |
| Library PDF (jsPDF/pdfmake/html2canvas) | **TIDAK** | Referensi keputusan #6 + AC-33 (dilarang dependency baru). `window.print()` + `@media print` adalah fitur platform yang sudah ada. |
| Library format angka (`Intl.NumberFormat` via `DecimalPipe`) | **TIDAK** | `DecimalPipe` default locale `en-US` -> pemisah desimal titik, sedangkan dokumen resmi memakai koma (`100,00`). Registrasi locale `id` = perubahan `app.config.ts` (blacklist). Cukup `toFixed(n).replace('.', ',')` - 1 baris, lihat 16.3. **`DecimalPipe` dilarang** (setara larangan `DatePipe` di 2.4). |
| Komponen terpisah untuk preview Tahap 4 | **TIDAK** | Preview hidup di dalam panel timbang yang sudah ada, membaca `formTimbang` yang sama. Memisahkannya berarti membangun plumbing `input`/`output` untuk buffer yang sama. |
| Filter periode / pemilih kuartal di tab Neraca | **TIDAK** | Referensi keputusan #3: Neraca prototipe = agregat kumulatif berjalan. Filter periode adalah fitur yang belum diminta (YAGNI) dan menambah state ke-2 yang bisa bertentangan dengan Logbook. |

---

## 15. Model Data Baru (kontrak TypeScript)

File baru: **`b3-waste-logbook.ts`** (murni, nol impor Angular; mengimpor tipe & `masaSimpanHari`/`tambahHari`/`formatTanggal` dari `b3-waste-model.ts`). Alasan file terpisah: ADR-5.

### 15.1 Tipe

```ts
import type { ItemLimbah, Pengajuan } from './b3-waste-model';

/** Satu baris tabel Logbook = satu ItemLimbah dari satu Pengajuan berstatus WEIGHED.
 *  SEMUA field di bawah adalah TURUNAN - tidak ada satu pun yang diinput manual di sini. */
export interface LogbookEntry {
  // --- jejak balik ke sumber (bukan kolom dokumen; dipakai untuk track & audit) ---
  pengajuanId: number;
  nomorPengajuan: string;
  itemId: string;            // = ItemLimbah.id
  // --- kolom dokumen (urutan sama dengan tabel 13 kolom) ---
  jenis: string;             // kol 2  - nama jenis (setelah koreksi PIC bila ada)
  kode: string;              // kunci blok & Neraca; tidak dicetak sebagai kolom sendiri
  tanggalMasuk: string;      // kol 3  - 'YYYY-MM-DD'
  sumber: string;            // kol 4  - kode line
  jumlahMasukKg: number;     // kol 5
  maksSimpan: string | null; // kol 6  - null -> render '-'
  petugasMasuk: string;      // kol 7
  tanggalKeluar: string;     // kol 8
  jumlahKeluarKg: number;    // kol 9  - == jumlahMasukKg (P-3)
  tujuan: string;            // kol 10
  noManifest: string;        // kol 11
  sisaKg: number;            // kol 12 - == 0 (P-3)
  petugasSisa: string;       // kol 13 - == petugasMasuk
}

/** Satu blok = satu "lembar" dokumen Logbook (satu jenis limbah). */
export interface BlokLogbook {
  kode: string;              // kunci blok - lihat 15.3
  jenis: string;             // label blok
  entries: LogbookEntry[];
  totalMasukKg: number;
  totalKeluarKg: number;
  sisaKg: number;            // totalMasuk - totalKeluar (selalu 0)
}

export type KategoriPerlakuan =
  | 'DISIMPAN' | 'DIMANFAATKAN' | 'DIOLAH' | 'DITIMBUN'
  | 'DISERAHKAN PIHAK KE-3' | 'EKSPORT' | 'PERLAKUAN LAINNYA';

export interface NeracaBarisAwal {          // Bagian I
  no: number;
  jenis: string;
  kode: string;
  jumlahTon: number;
  satuan: 'Ton';
  catatan: string;           // nomor manifest unik, digabung ', '
}

export interface NeracaBarisPerlakuan {     // sub-baris kanan Bagian II
  jenis: string;             // '-' untuk kategori kosong
  kode: string;              // '' untuk kategori kosong
  jumlahTon: number;
  izinKlh: 'ADA' | '-';      // '-' hanya untuk baris placeholder kategori kosong
}

export interface NeracaPerlakuan {          // satu kategori Bagian II
  kategori: KategoriPerlakuan;
  subLabel: string;          // '(KEMBALI KE SUPLIER)' untuk PERLAKUAN LAINNYA, selain itu ''
  jumlahTon: number;         // subtotal kategori
  satuan: 'Ton';
  baris: NeracaBarisPerlakuan[];  // DIJAMIN panjang >= 1 (placeholder bila kosong) -> rowspan aman
}

export interface Neraca {
  periodeLabel: string;      // 16.4
  tanggalLaporan: string;    // 'YYYY-MM-DD' | '' - 16.4
  bagianI: NeracaBarisAwal[];
  totalATon: number;
  perlakuan: NeracaPerlakuan[];   // SELALU 7 elemen, urutan tetap KATEGORI_PERLAKUAN
  totalBTon: number;
  residuCTon: number;        // 0 (P-3)
  belumTerkelolaDTon: number;// 0 (P-3)
  totalCDTon: number;        // 0 (P-3)
  kinerjaPersen: number | null;   // null bila totalAKg === 0 -> render '-'
  totalAKg: number;          // basis hitung kinerja (16.2) - juga berguna untuk QA
  totalBKg: number;
}
```

Konstanta di `b3-waste-logbook.ts`:

```ts
export const KATEGORI_PERLAKUAN: readonly KategoriPerlakuan[] = [
  'DISIMPAN', 'DIMANFAATKAN', 'DIOLAH', 'DITIMBUN',
  'DISERAHKAN PIHAK KE-3', 'EKSPORT', 'PERLAKUAN LAINNYA',
];                                   // urutan WAJIB persis seperti dokumen asli
export const PERLAKUAN_AKTIF: KategoriPerlakuan = 'DISERAHKAN PIHAK KE-3';  // P-3
export const KG_PER_TON = 1000;
```

**`LogbookEntry` tidak punya field `no`.** Nomor urut baris adalah `$index + 1` di dalam blok saat render - nomor cetak, bukan data.

### 15.2 Pemetaan kolom -> sumber field (bukti bahwa nol input manual dibutuhkan)

Sumber: satu `Pengajuan p` berstatus `WEIGHED` + satu `ItemLimbah it` miliknya.

| # | Kolom dokumen Logbook | Field `LogbookEntry` | Diturunkan dari |
|---|---|---|---|
| 1 | No. | *(tidak disimpan)* | `$index + 1` dalam blok |
| 2 | Jenis Limbah B3 Masuk | `jenis` | `it.jenis` |
| 3 | Tanggal Masuk Limbah B3 | `tanggalMasuk` | `p.penyerahan.tanggalTimbang` |
| 4 | Sumber Limbah B3 | `sumber` | `it.sumber` (kode line) |
| 5 | Jumlah Limbah B3 Masuk (kg) | `jumlahMasukKg` | `it.beratKg ?? 0` |
| 6 | Maksimal Penyimpanan s/d Tanggal | `maksSimpan` | `it.maksSimpan` |
| 7 | Petugas | `petugasMasuk` | `p.penyerahan.olehPic` |
| 8 | Tanggal Keluar Limbah | `tanggalKeluar` | `p.penyerahan.tanggalBuang` |
| 9 | Jumlah Limbah B3 (kg) | `jumlahKeluarKg` | `= jumlahMasukKg` (P-3) |
| 10 | Tujuan Penyerahan | `tujuan` | `p.penyerahan.tujuan` |
| 11 | Bukti Nomor Dokumen | `noManifest` | `p.penyerahan.noManifest` |
| 12 | Sisa LB3 (kg) | `sisaKg` | `jumlahMasukKg - jumlahKeluarKg` = **0** |
| 13 | Petugas | `petugasSisa` | `= petugasMasuk` |
| - | Area | *(tidak disimpan)* | dicetak **kosong** - sesuai seluruh sample (referensi: "field ada tapi tidak diisi") |
| - | Karakteristik Limbah | *(tidak disimpan)* | konstanta statis `'Beracun'` |

**Nol field yatim.** Inilah pembuktian formal bahwa `LogbookEntry` boleh 100% derived - dan karena itu, harus derived (P-1).

### 15.3 Kunci pengelompokan blok: `kode`, bukan `jenis`

Dokumen asli mengelompokkan per "Jenis Limbah". Di master kita ada **satu kasus** nama berbeda dengan kode sama: `Elektrik` (Engineering/ENG dan Produksi/CAN-PET) vs `Lampu TL/Elektrik` (Office/OFFICE) - keduanya **`B107d`**.

**Keputusan: kunci blok = `kode`.** Alasan: kode adalah identitas regulator; kode juga yang menentukan masa simpan dan yang dibaca di manifest. Mengelompokkan per nama akan memunculkan dua lembar/dua baris Neraca untuk satu kode limbah yang sama - salah secara substansi.
**Label blok** = `jenis` dari entry pertama (urutan 17.2), dan **selalu dicetak bersama kodenya**: `Elektrik (B107d)`. Dengan begitu tidak ada informasi yang hilang dan tidak ada duplikasi kode. Dicatat sebagai butir konfirmasi user (26.6).

---

## 16. Aturan Hitung Final (kontrak angka - QA menguji nilainya)

### 16.1 Konversi kg -> Ton

Logbook & seluruh data internal tetap **kg** (keputusan PM 5.5 #5 tidak berubah untuk Logbook). Neraca memakai **Ton** karena dokumen aslinya begitu (referensi Dokumen A: *"Jumlah dalam Ton (bukan kg - beda satuan dari logbook!)"*). Ini amandemen sadar atas keputusan PM 5.5 #5 yang menulis "kg di seluruh UI" - dicatat sebagai butir konfirmasi 26.1.

```ts
/** kg -> Ton, dibulatkan 4 desimal. 173 kg -> 0.173 ; 120.5 kg -> 0.1205 */
export function keTon(kg: number): number {
  return Math.round((kg / KG_PER_TON) * 10000) / 10000;
}
```

**4 desimal, bukan 2.** Alasan konkret: input berat memakai `step="0.1"` kg; 2 desimal Ton (= 10 kg) akan membulatkan 18 kg jadi `0,02` dan menghilangkan angka nyata. 4 desimal Ton = 0,1 kg = presisi input, jadi **nol kehilangan data**.

### 16.2 Urutan agregasi (WAJIB - ini yang menjaga A = B)

1. Seluruh penjumlahan dilakukan **dalam kg** (`number`, float).
2. Konversi `keTon()` dilakukan **hanya sekali, di akhir**, pada nilai baris & total yang akan ditampilkan.
3. `totalATon = keTon(totalAKg)` dan `totalBTon = keTon(totalBKg)`, dengan `totalBKg === totalAKg` secara konstruksi (P-3: seluruh baris masuk satu kategori perlakuan).
4. **Kinerja dihitung dari kg, bukan dari Ton yang sudah dibulatkan:**

```ts
kinerjaPersen = totalAKg === 0 ? null : Math.round((totalBKg / totalAKg) * 100 * 100) / 100;   // 2 desimal
```

Karena `totalBKg === totalAKg`, hasilnya **selalu tepat `100`** -> tampil `100,00`. Bila `totalAKg === 0` (belum ada data), `kinerjaPersen = null` -> dirender `-`. **Dilarang** menampilkan `0,00`, `NaN`, `Infinity`, atau `#REF!` (referensi: `#REF!` di PDF asli adalah bug Excel, jangan ditiru).

Catatan pembulatan baris: jumlah `keTon()` per baris bisa berbeda dari `totalATon` pada digit ke-4 bila ada banyak baris berdesimal. Itu **diterima** dan tidak memengaruhi kinerja (langkah 4 memakai kg). Jangan "memperbaiki"-nya dengan menghitung total sebagai penjumlahan baris yang sudah dibulatkan.

### 16.3 Format tampilan (fungsi murni di `b3-waste-logbook.ts`)

```ts
/** 0.173  -> '0,1730' (selalu 4 desimal, koma) */
export function formatTon(ton: number): string;      // ton.toFixed(4).replace('.', ',')
/** 173    -> '173'  ; 120.5 -> '120,5'  (maks 2 desimal, tanpa nol ekor, koma) */
export function formatKg(kg: number): string;
/** 100    -> '100,00' ; null -> '-' */
export function formatPersen(p: number | null): string;
```

`formatKg`: `String(Math.round(kg * 100) / 100).replace('.', ',')`. **Dilarang `DecimalPipe`/`Intl`** (14.1).

### 16.4 Periode & tanggal laporan Neraca

- `tanggalLaporan` = `tanggalKeluar` **terbesar** dari seluruh entry (`''` bila kosong). Sengaja **tidak** memakai `new Date()` supaya render deterministik & bisa diuji QA (konsisten dengan 2.4 dan ADR-4).
- `periodeLabel`, dari `tanggalMasuk` terkecil (`t1`) dan terbesar (`t2`):
  - tidak ada data -> `'Periode Berjalan'`
  - tahun sama -> `'Juli - September 2025'` (`${BULAN[m1]} - ${BULAN[m2]} ${y}`); bila bulan juga sama -> `'Agustus 2026'`
  - beda tahun -> `'Desember 2025 - Februari 2026'`
- `BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']` (konstanta di `b3-waste-logbook.ts`).
- Dicetak sebagai `PERIODE WAKTU : {periodeLabel}`; footer Neraca `Sukabumi, {formatTanggal(tanggalLaporan)}`.

---

## 17. Fungsi Murni Baru & Perubahan Aditif pada File Babak 1

### 17.1 Tambahan pada `b3-waste-model.ts` (dua perubahan, keduanya aditif)

**(a) `IsiTimbang` mendapat satu field opsional** - payload koreksi PIC:

```ts
export interface KoreksiJenis { jenis: string; kode: string }

export interface IsiTimbang {
  berat: Record<string, number | null>;
  koreksiJenis?: Record<string, KoreksiJenis>;   // BARU. key = ItemLimbah.id; absen = tidak dikoreksi
  tanggalTimbang: string;
  tanggalBuang: string;
  tujuan: string;
  noManifest: string;
  pernyataan: boolean;
}
```

Opsional -> seed, unit test babak 1, dan `timbangKosong()` yang sudah ada tetap valid tanpa perubahan wajib. (`timbangKosong()` boleh menambahkan `koreksiJenis: {}` agar `[(ngModel)]` punya objek untuk ditulisi.)

**(b) Transform item saat timbang diangkat jadi fungsi murni yang bisa dipakai ulang:**

```ts
/** Item hasil timbang. Dipakai reducer PIC_WEIGH DAN preview Tahap 4 -> preview dijamin identik hasil akhir. */
export function terapkanTimbang(items: ItemLimbah[], isi: IsiTimbang): ItemLimbah[];
```

Kontrak per item (`it`):

| Field | Nilai |
|---|---|
| `id`, `departemenId`, `departemen`, `sumber` | **tidak berubah** (`id` **jangan** dihitung ulang - ia kunci `isi.berat` & `isi.koreksiJenis`) |
| `kode` | `k?.kode.trim() \|\| it.kode`, dengan `k = isi.koreksiJenis?.[it.id]` |
| `jenis` | `k?.jenis.trim() \|\| it.jenis` |
| `masaSimpanHari` | `masaSimpanHari(kode)` - **dihitung ulang** dari kode hasil koreksi |
| `beratKg` | `isi.berat[it.id] ?? null` |
| `maksSimpan` | `isi.tanggalTimbang ? tambahHari(isi.tanggalTimbang, masaSimpanHari) : null` - **guard wajib**, karena preview dipanggil saat form masih setengah terisi |

Cabang `PIC_WEIGH` di `jalankanAksi()` **wajib** diubah memanggil fungsi ini (menggantikan `.map()` inline yang ada sekarang), supaya preview dan hasil final tidak bisa menyimpang. Sisa cabang `PIC_WEIGH` tidak berubah. Tambahan kecil pada `riwayat.catatan` `PIC_WEIGH` bila ada koreksi: sisipkan `, koreksi jenis {n} item` setelah total berat (audit trail koreksi PIC).

### 17.2 Fungsi di `b3-waste-logbook.ts`

```ts
/** Proyeksi seluruh pengajuan -> baris logbook. Satu-satunya pintu lahirnya LogbookEntry. */
export function bangunLogbook(daftar: Pengajuan[]): LogbookEntry[];
export function kelompokkanLogbook(entries: LogbookEntry[]): BlokLogbook[];
export function hitungNeraca(entries: LogbookEntry[]): Neraca;
/** Draft "seandainya divalidasi sekarang" untuk preview Tahap 4 - lihat 18.3. */
export function pratinjauPengajuan(p: Pengajuan, isi: IsiTimbang, olehPic: string): Pengajuan;
export function keTon(kg: number): number;
export function formatTon(ton: number): string;
export function formatKg(kg: number): string;
export function formatPersen(p: number | null): string;
```

**`bangunLogbook`:**
1. Ambil hanya pengajuan dengan `status === 'WEIGHED' && penyerahan !== null`. (Filter `status`, bukan `penyerahan.divalidasi` semata - status adalah otoritasnya.)
2. `flatMap` seluruh `items` -> satu `LogbookEntry` per item, sesuai pemetaan 15.2. **Tidak** menyaring item ber-`beratKg === null` (pakai `?? 0`) - supaya jalur kode preview dan jalur final identik; pada data final validasi sudah menjamin berat > 0.
3. Urutan hasil (deterministik, QA bergantung padanya): `tanggalMasuk` naik -> `nomorPengajuan` naik -> `itemId` naik.

**`kelompokkanLogbook`:** `Map<kode, LogbookEntry[]>` dibangun sekali dengan sekali lintasan (bukan `filter()` di dalam `@for` template - ADR-6), lalu jadi array `BlokLogbook` yang **diurutkan `kode` naik** (`localeCompare`). `jenis` blok = `entries[0].jenis`. Total per blok dibulatkan 2 desimal.

**`hitungNeraca`:**
1. Agregasi kg per `kode` (sekali lintasan): `{ jenis, kode, kg, manifest: Set<string> }`.
2. `bagianI` = array hasil, urut `kode` naik, `no = index + 1`, `jumlahTon = keTon(kg)`, `catatan` = manifest unik digabung `', '` (urut kemunculan; `''` bila kosong -> render `-`).
3. `totalAKg` = total seluruh kg; `totalATon = keTon(totalAKg)`.
4. `perlakuan` = **7 elemen** dari `KATEGORI_PERLAKUAN`. Kategori `PERLAKUAN_AKTIF` mendapat satu `NeracaBarisPerlakuan` per jenis (sama isi dengan Bagian I, `izinKlh: 'ADA'`) dan `jumlahTon = totalATon`; **6 kategori lain** mendapat `jumlahTon = 0` dan **tepat satu baris placeholder** `{ jenis: '-', kode: '', jumlahTon: 0, izinKlh: '-' }` supaya `rowspan = baris.length` selalu valid di template. `subLabel` hanya terisi untuk `PERLAKUAN LAINNYA` = `'(KEMBALI KE SUPLIER)'`.
5. `totalBKg = totalAKg`; `totalBTon = keTon(totalBKg)`; `residuCTon = belumTerkelolaDTon = totalCDTon = 0`; `kinerjaPersen` per 16.2; `periodeLabel`/`tanggalLaporan` per 16.4.
6. Bila `entries.length === 0`: `bagianI = []`, semua total `0`, `kinerjaPersen = null`, `periodeLabel = 'Periode Berjalan'`, `perlakuan` tetap 7 kategori berisi placeholder.

**`pratinjauPengajuan(p, isi, olehPic)`** mengembalikan objek `Pengajuan` **baru** (tidak memutasi `p`, tidak menyentuh signal apa pun):

```
{ ...p, status: 'WEIGHED', items: terapkanTimbang(p.items, isi),
  penyerahan: { tanggalTimbang: isi.tanggalTimbang, tanggalBuang: isi.tanggalBuang,
                tujuan: isi.tujuan, noManifest: isi.noManifest, olehPic, divalidasi: true } }
```

Objek ini **hanya dipakai sebagai argumen `bangunLogbook([draft])`** dan tidak pernah disimpan ke state. Inilah yang membuat preview = hasil akhir secara konstruksi (bukan karena dua kode yang "kebetulan mirip").

### 17.3 Konstanta teks dokumen -> `b3-waste-data.ts`

Teks statis form (bukan logika) ikut file data yang sudah ada, agar `b3-waste-logbook.ts` tetap berisi hitungan saja. Nilai **verbatim** dari referensi:

```ts
export const DOK_LOGBOOK = {
  perusahaan: 'PT. Amerta Indah Otsuka', section: 'Section K3L', departemen: 'Departemen Engineering',
  judul: 'LEMBAR DATA PENYIMPANAN LIMBAH BAHAN BERACUN DAN BERBAHAYA',
  halaman: '1 dari 1', noDokumen: 'FR/K3L/006/01', tanggal: '13 Juni 2012', revisi: '02',
  mengantikanNomor: 'FR/K3L/006/01', mengantikanTanggal: '07 Mei 2012',
  karakteristik: 'Beracun',
  headerMaksSimpan: 'Maksimal Penyimpanan s/d Tanggal (t=0 + 90 hr)',   // boilerplate form, JANGAN diubah jadi 185/365
};

export const DOK_NERACA = {
  perusahaan: 'PT. Amerta Indah Otsuka',
  judul: 'NERACA LIMBAH BAHAN BERACUN DAN BERBAHAYA',
  halaman: '1 dari 1', noDokumen: 'FR/K3L/006/02/1', tanggal: '13 Januari 2014', revisi: '00',
  mengantikanNomor: '-', mengantikanTanggal: '-',
  bidangUsaha: 'Air Minum Dalam Kemasan',
};

export const PENANDATANGAN = {
  kota: 'Sukabumi',
  dilaporkan: { nama: 'Indra Setiyanto', jabatan: 'EHS Supervisor' },
  mengetahui: { nama: 'Mugiyono', jabatan: 'EHS Section Head' },
};

export const TEMBUSAN: readonly string[] = [
  'BLH Kabupaten Sukabumi',
  'BPLHD Provinsi Jawa Barat',
  'KLHK Asdep IV bidang Pengelolaan Limbah B3 & Pemulihan Lahan Terkontaminasi Limbah B3',
  'KLHK Asdep Urusan Pengendalian Pencemaran Agroindustri',
  'Arsip EHS PT Amerta Indah Otsuka',
];
```

**Dilarang** menambahkan stempel `ASLI`/`COPY` (referensi keputusan #1 - satu-satunya elemen yang sengaja tidak direplikasi).

---

## 18. State Tambahan di `B3Waste` & Mekanisme Tahap 4

### 18.1 Tambahan anggota `B3Waste` (`b3-waste.ts`)

```ts
// --- computed BARU (tidak ada signal baru sama sekali) ---
logbook     = computed<LogbookEntry[]>(() => bangunLogbook(this.pengajuan()));
logbookBlok = computed<BlokLogbook[]>(() => kelompokkanLogbook(this.logbook()));
neraca      = computed<Neraca>(() => hitungNeraca(this.logbook()));
```

**Keputusan eksplisit yang diminta orchestrator: `logbook` adalah `computed`, BUKAN `signal`.**
Alasan (P-1): setiap field baris logbook dapat diturunkan tanpa sisa dari `Pengajuan` berstatus `WEIGHED` (bukti: tabel 15.2). Bila dijadikan `signal` yang di-append saat `PIC_WEIGH`, lahir sumber kedua yang harus dijaga sinkron - dan pertanyaan-pertanyaan yang tidak punya jawaban murah: apa yang terjadi kalau reducer gagal setelah append? bagaimana kalau seed ditambah pengajuan `WEIGHED`? bagaimana menguji konsistensi keduanya? Dengan `computed`, semua pertanyaan itu tidak ada: satu-satunya cara sebuah baris muncul di Logbook adalah `pengajuan()` berisi pengajuan `WEIGHED` - persis definisi bisnisnya. Biaya rekomputasi nol relevansi (puluhan baris, hanya saat `pengajuan()` berubah).

Satu-satunya pengecualian yang **tidak** dijadikan `computed` adalah pratinjau Tahap 4 - lihat 18.3.

### 18.2 Tahap 4: apa yang direset & apa yang di-append saat `PIC_WEIGH` sukses

| State | Sebelum submit (mode preview) | Setelah `kirimTimbang()` sukses |
|---|---|---|
| `formTimbang` (berat, **koreksiJenis**, tanggalTimbang, tanggalBuang, tujuan, noManifest, pernyataan) | **satu-satunya buffer edit PIC** - semua input preview terikat ke sini | **DIRESET** ke `timbangKosong()` (perilaku babak 1, tidak berubah) |
| `pengajuan()` | tidak tersentuh | **DI-UPDATE** oleh `terapkan()`: item terisi `beratKg`/`maksSimpan`/(jenis+kode hasil koreksi), `penyerahan` terisi, `status = 'WEIGHED'` |
| `notifikasi()` | tidak tersentuh | **DI-APPEND** 2 notifikasi (`PIC_WEIGH`, tabel 5.4) - tidak berubah dari babak 1 |
| `logbook()` / `logbookBlok()` / `neraca()` | menghitung dari `pengajuan()` -> pengajuan ini **belum** masuk | **otomatis bertambah** N baris (N = jumlah item). **Tidak ada kode yang meng-append apa pun ke sini** |
| `pilihanId` | pengajuan yang sedang diaudit | **TIDAK direset** - lihat alasan di bawah |
| `errors` / `infoAksi` | error validasi terakhir | `errors = []`; `infoAksi` = string babak 1 + ` - {N} baris ditambahkan ke Logbook & Neraca.` |

**Bagaimana "preview kosong lagi setelah submit" terjadi (mekanisme presisi, tanpa kode reset khusus):**
panel timbang beserta preview di dalamnya dibungkus `@if (aksiTersedia().includes('PIC_WEIGH'))`. Setelah status jadi `WEIGHED`, `aksiUntuk('WEIGHED', 'PIC')` mengembalikan `[]` (fungsi babak 1, tidak diubah) -> seluruh panel **hilang dari DOM**, dan `formTimbang` sudah direset. Jadi layar audit PIC memang kosong dari preview, sementara tab Logbook/Neraca terisi penuh - keduanya hasil dari satu perubahan yang sama, tanpa satu pun baris kode sinkronisasi. Ini realisasi langsung referensi keputusan #5.

**Kenapa `pilihanId` TIDAK direset ke `null`:** referensi menulis "(PIC kembali ke daftar/pilih pengajuan lain)" sebagai deskripsi, bukan syarat. Tetap di detail lebih baik karena (a) AC-24 babak 1 diverifikasi di layar itu ("seluruh field jadi read-only" - S6.6) dan melempar PIC ke daftar menghapus bukti itu, (b) PIC melihat konfirmasi + data terkunci, (c) tombol "Kembali ke daftar" sudah ada. Sebagai pengganti navigasi otomatis, tambahkan di panel detail saat `p.status === 'WEIGHED'` satu `link-btn` **"Lihat di Logbook"** -> `bukaTab('logbook')`.

### 18.3 Preview live Tahap 4 - kontrak isi & keterikatan input

Preview dirender **di dalam** panel "Timbang & Validasi" yang sudah ada, terdiri atas 2 bagian:

**(A) Tabel baris Logbook - EDITABLE.** Ini adalah tabel timbang yang sudah ada, diperluas jadi replika baris logbook yang akan dibuat:

| Kolom | Sumber | Editable? |
|---|---|---|
| No. | `$index + 1` | tidak |
| Jenis Limbah | `<select>` berisi seluruh `JenisLimbah` dari sumber item itu (`MASTER_DEPARTEMEN[deptId].sumber[kode].jenis`), nilai terpilih = `koreksiJenis[id] ?? item asli` | **YA** (koreksi PIC) |
| Sumber | `it.sumber` | tidak |
| Jumlah Masuk (kg) | `<input type="number" step="0.1">` -> `formTimbang.berat[it.id]` | **YA** (input berat yang sudah ada) |
| Maks. Simpan | `pratinjauItem(it).maksSimpan` (ikut berubah bila kelas kode A/B berganti karena koreksi) | tidak (turunan) |
| Jumlah Keluar (kg) | cermin Jumlah Masuk | tidak (P-3) |
| Sisa (kg) | `0` | tidak (P-3) |

Di bawah tabel, kalimat kecil wajib: `Tanggal masuk/keluar, tujuan, dan nomor manifest berlaku untuk seluruh baris - isi di form di bawah.`

**(B) Pratinjau Neraca - READ-ONLY, dan itu disengaja.** Menampilkan Bagian I (No/Jenis/Jumlah Ton/Catatan manifest) + TOTAL (A), satu baris Perlakuan `DISERAHKAN PIHAK KE-3` + TOTAL (B), C, D, dan Kinerja - **untuk pengajuan ini saja**. Alasan read-only: setiap angka di situ adalah proyeksi dari nilai yang sudah editable di bagian (A). Menjadikannya editable = pintu input kedua untuk angka yang sama = pelanggaran P-1 dan sumber percekcokan angka (persis masalah manual yang dibereskan aplikasi ini).

**Keterikatan input - aturan keras:** preview **tidak punya storage sendiri**. Setiap kontrol editable menulis langsung ke `formTimbang` (`berat[id]`, `koreksiJenis[id]`). Dilarang membuat signal/objek buffer preview terpisah lalu "menyalinnya" saat submit.

**Sumber data preview (pengecualian sadar terhadap "pakai `computed`"):** `formTimbang` adalah objek biasa (bukan signal) - keputusan babak 1 yang tidak diubah agar `[(ngModel)]` yang sudah jalan tidak perlu ditulis ulang. Karena itu preview dipanggil sebagai **method dari template**, bukan `computed`:

```ts
pratinjauItem(it: ItemLimbah): ItemLimbah;      // terapkanTimbang([it], this.formTimbang)[0]
pratinjauLogbook(p: Pengajuan): LogbookEntry[]; // bangunLogbook([pratinjauPengajuan(p, this.formTimbang, this.penggunaAktif().nama)])
pratinjauNeraca(p: Pengajuan): Neraca;          // hitungNeraca(this.pratinjauLogbook(p))
jenisTersedia(it: ItemLimbah): JenisLimbah[];   // lookup MASTER_DEPARTEMEN by departemenId + sumber
setKoreksiJenis(it: ItemLimbah, kode: string): void;  // tulis { jenis, kode } ke formTimbang.koreksiJenis[it.id]
```

Ini aman & disengaja: (a) `ngModel` menembakkan event listener template -> Angular zoneless menjadwalkan CD -> ekspresi template dievaluasi ulang, jadi preview memang live; (b) biayanya O(jumlah item pengajuan) - satuan digit; (c) alternatifnya (mengubah `formTimbang` jadi signal) berarti menulis ulang ~8 binding pada kode yang sudah lolos Code Review & QA, dengan manfaat nol yang terukur. **Jangan** menyiasatinya dengan `effect()` yang menyalin ke signal - itu justru pola yang melahirkan blocker babak 1 (bug `effect()` `WastePicker`).

---

## 19. Struktur Render Tab Logbook & Neraca

### 19.1 Komponen baru `B3Dokumen` (satu komponen untuk dua dokumen)

```ts
// file: b3-dokumen.ts | selector: 'app-b3-dokumen' | class: B3Dokumen
// encapsulation: ViewEncapsulation.None  <-- WAJIB, alasan di ADR-7 & Bagian 20
mode   = input.required<'logbook' | 'neraca'>();
blok   = input<BlokLogbook[]>([]);     // dipakai saat mode 'logbook'
neraca = input<Neraca | null>(null);   // dipakai saat mode 'neraca'
```

Komponen ini **bodoh (presentational)**: tidak menghitung apa pun, tidak punya signal state, hanya merender + menyimpan satu method `cetak()` (Bagian 20). Induk memberi data dari `logbookBlok()` / `neraca()`.

Pemakaian di `b3-waste.html` (menggantikan dua panel placeholder yang ada sekarang):

```html
@if (tabAktif() === 'logbook') {
  <div class="panel">                                   <!-- di LUAR .b3-doc -> otomatis tidak ikut tercetak -->
    <h3 class="panel-title">Logbook - Lembar Data Penyimpanan Limbah B3 (FR/K3L/006/01)</h3>
    <p class="panel-sub">Terbentuk otomatis dari hasil timbang & validasi PIC. Satu lembar per jenis limbah.</p>
  </div>
  <app-b3-dokumen mode="logbook" [blok]="logbookBlok()" />
}
@if (tabAktif() === 'neraca') {  ... <app-b3-dokumen mode="neraca" [neraca]="neraca()" /> }
```

### 19.2 Struktur template Logbook (`@for` bersarang)

```html
@if (blok().length) {
  <button class="btn-primary" (click)="cetak()">Unduh PDF</button>   <!-- di luar .b3-doc -->
  @for (b of blok(); track b.kode) {
    <section class="b3-doc doc-logbook">
      <!-- header replika: perusahaan/section/departemen | judul | kotak info 6 baris (DOK_LOGBOOK) -->
      <!-- 'Area :' (dicetak KOSONG) | 'Karakteristik Limbah : Beracun' -->
      <!-- judul blok: {{ b.jenis }} ({{ b.kode }}) -->
      <table class="doc-table">
        <thead>
          <tr><th rowspan="2">No.</th><th rowspan="2">Jenis Limbah B3 Masuk</th>
              <th colspan="5">MASUKNYA LIMBAH B3 KE TEMPAT PENYIMPANAN</th>
              <th colspan="4">KELUARNYA LIMBAH B3 DARI TEMPAT PENYIMPANAN</th>
              <th colspan="2">SISA</th></tr>
          <tr><th>Tanggal Masuk Limbah B3</th><th>Sumber Limbah B3</th><th>Jumlah Limbah B3 Masuk (kg)</th>
              <th>Maksimal Penyimpanan s/d Tanggal (t=0 + 90 hr)</th><th>Petugas</th>
              <th>Tanggal Keluar Limbah</th><th>Jumlah Limbah B3 (kg)</th><th>Tujuan Penyerahan</th><th>Bukti Nomor Dokumen</th>
              <th>Sisa LB3 Yang Ada di Tempat Penyimpanan (kg)</th><th>Petugas</th></tr>
        </thead>
        <tbody>
          @for (e of b.entries; track e.pengajuanId + '-' + e.itemId; let i = $index) {
            <tr> ... 13 sel, kolom 1 = {{ i + 1 }} ... </tr>
          }
        </tbody>
      </table>
      <!-- footer replika: 'Diperiksa oleh' + '( ...... ) Tgl:' | 'Disetujui oleh' + '( ...... ) Tgl:' -->
    </section>
  }
} @else {
  <div class="panel"><p class="empty-row">Belum ada data logbook. Baris terbentuk otomatis setelah PIC memvalidasi timbang.</p></div>
}
```

Total 13 `<th>` pada baris ke-2 + 2 `<th rowspan="2">` pada baris pertama = 13 kolom badan tabel. **Nomor urut per blok dimulai dari 1** (dokumen per lembar), bukan lanjut lintas blok.

### 19.3 Grouping per jenis: `computed` Map di TS, bukan filter di template

**Keputusan: pengelompokan dilakukan sekali di TypeScript** (`kelompokkanLogbook`, sekali lintasan `Map`), template hanya `@for` dua tingkat atas array jadi (`blok` -> `blok.entries`).

Alternatif yang **ditolak**: `@for (jenis of daftarJenis())` + `@for (e of logbook() | filter jenis)` atau memanggil method filter di dalam `@for` - itu O(jenis x baris) tiap change detection, membuat `track` sulit stabil, dan memaksa pipe/method di template yang dievaluasi berulang. Detail ADR-6. **Dilarang memakai `KeyValuePipe` atas `Map`** (butuh impor `CommonModule` dan urutannya bergantung implementasi pipe); kontraknya adalah **array `BlokLogbook[]` yang sudah terurut**.

### 19.4 Struktur template Neraca (dua bagian + baris penutup)

Satu `<section class="b3-doc doc-neraca">` (bukan per blok):

1. Header: `PT. Amerta Indah Otsuka` | judul | kotak info 6 baris dari `DOK_NERACA` | `BIDANG USAHA : Air Minum Dalam Kemasan` | `PERIODE WAKTU : {{ n.periodeLabel }}`.
2. **Bagian I** - tabel `No | Jenis Awal Limbah | Jumlah | Satuan | CATATAN (Nomor Manifest)`; `@for (r of n.bagianI; track r.kode)`; jenis dicetak `{{ r.jenis }} ({{ r.kode }})`; jumlah `formatTon`; satuan `Ton`; catatan `r.catatan || '-'`. Baris terakhir **TOTAL** (kelas `doc-total`) = `formatTon(n.totalATon)` + label `(A)`.
3. **Bagian II** - tabel `PERLAKUAN | JUMLAH | SATUAN | JENIS LIMBAH YANG DIKELOLA | PERIZINAN LIMBAH B3 DARI KLH`; kolom perizinan dipecah **3 sub-kolom**: `ADA | TIDAK ADA | KADALUARSA`.

```html
@for (k of n.perlakuan; track k.kategori) {
  @for (b of k.baris; track b.jenis + b.kode; let i = $index) {
    <tr>
      @if (i === 0) {
        <td [attr.rowspan]="k.baris.length">{{ k.kategori }}<span class="doc-sub">{{ k.subLabel }}</span></td>
        <td [attr.rowspan]="k.baris.length">{{ formatTon(k.jumlahTon) }}</td>
        <td [attr.rowspan]="k.baris.length">Ton</td>
      }
      <td>{{ b.jenis }}</td>
      <td>@if (b.izinKlh === 'ADA') { <span>&#10003;</span> }</td><td></td><td></td>
    </tr>
  }
}
```

`k.baris` dijamin panjang >= 1 oleh `hitungNeraca` (15.1) sehingga `rowspan` selalu >= 1 dan **7 kategori selalu tercetak** walau kosong - persis dokumen asli.

4. Baris penutup (masing-masing satu baris tabel, satuan `Ton`): **TOTAL (B)** = `formatTon(n.totalBTon)`; **RESIDU (C)**; **JUMLAH LIMBAH YANG BELUM TERKELOLA (D)**; **TOTAL JUMLAH LIMBAH (C+D)**; **KINERJA PENGELOLAAN LB3 SELAMA PERIODE SKALA WAKTU PENAATAN** = `{{ formatPersen(n.kinerjaPersen) }} %`.
5. Footer: kiri `Dilaporkan Oleh :` + area tanda tangan kosong + `Indra Setiyanto` / `EHS Supervisor`; kanan `Sukabumi, {{ formatTanggal(n.tanggalLaporan) }}` + `Mengetahui :` + area tanda tangan kosong + `Mugiyono` / `EHS Section Head`; lalu `Tembusan :` sebagai `<ol>` dari `TEMBUSAN` (5 butir).
6. Empty state (`n.bagianI.length === 0`): dokumen tetap dirender lengkap (header, 7 kategori kosong, total 0, kinerja `-`) + satu baris `Belum ada transaksi tervalidasi.` di Bagian I. Alasan: yang diuji QA adalah replika format, dan Neraca kosong tetap dokumen yang sah.

**Larangan render:** tanpa `innerHTML` (aturan babak 1 tetap), tanpa logo gambar (tidak ada aset di repo - header memakai teks `PT. Amerta Indah Otsuka`; butir konfirmasi 26.2), tanpa stempel ASLI/COPY.

---

## 20. Kontrak PDF Export (`window.print()` + `@media print`)

### 20.1 Masalah yang harus dipecahkan

Sidebar & topbar aplikasi hidup di komponen `layout/` yang masuk **blacklist** (Bagian 4) - `layout.css` tidak boleh disentuh. Sementara itu CSS komponen Angular ter-enkapsulasi (`[_ngcontent-*]`), sehingga aturan dari `b3-waste.css` **tidak bisa** menjangkau elemen di luar komponen (`::ng-deep` pun hanya menjangkau ke bawah, bukan ke atas/samping). Jadi menyembunyikan chrome aplikasi tidak mungkin dilakukan dari stylesheet ter-enkapsulasi.

### 20.2 Keputusan: satu komponen ber-`ViewEncapsulation.None` + gerbang kelas `body.b3-printing`

```ts
// b3-dokumen.ts
@Component({ ..., encapsulation: ViewEncapsulation.None, styleUrls: ['./b3-dokumen.css'] })
export class B3Dokumen {
  cetak(): void {
    document.body.classList.add('b3-printing');
    window.addEventListener('afterprint', () => document.body.classList.remove('b3-printing'), { once: true });
    window.print();
  }
}
```

```css
/* b3-dokumen.css - SELURUH aturan wajib diawali .b3-doc atau body.b3-printing. Tidak boleh ada selektor telanjang. */
@media print {
  body.b3-printing * { visibility: hidden !important; }
  body.b3-printing .b3-doc, body.b3-printing .b3-doc * { visibility: visible !important; }
  body.b3-printing .b3-doc { position: absolute; left: 0; top: 0; width: 100%; margin: 0; }
  body.b3-printing .doc-logbook + .doc-logbook { break-before: page; }
  body.b3-printing .b3-doc { break-inside: auto; }
  body.b3-printing .b3-doc table { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  @page { size: A4 landscape; margin: 8mm; }
}
```

**Apa yang tercetak:** hanya elemen di dalam `.b3-doc` - yaitu lembar-lembar Logbook atau dokumen Neraca yang **sedang aktif tabnya** (tab lain tidak ada di DOM karena `@if` pada `tabAktif()`).
**Apa yang tidak tercetak:** sidebar & topbar aplikasi, `.page-head`, `.demo-bar`, `.stats`, `.tabs`, panel judul, dan tombol "Unduh PDF" itu sendiri - semuanya berada **di luar** `.b3-doc`, jadi tidak perlu kelas `.no-print` satu per satu. Aturan tunggal `body.b3-printing *` sudah menutup semuanya, termasuk elemen milik komponen lain yang tidak boleh kita sentuh filenya.

**Kenapa gerbang `body.b3-printing`, bukan `body *` polos:** style dari komponen `ViewEncapsulation.None` tetap terpasang di `<head>` setelah komponen dihancurkan. Tanpa gerbang, menekan Ctrl+P di menu lain (setelah pernah membuka Limbah B3) akan mencetak halaman kosong - regresi ke menu lain (melanggar AC-34 secara semangat). Dengan gerbang, aturan hanya menggigit selama `cetak()` kita berjalan, dan kelas dilepas otomatis pada event `afterprint` (didukung Chrome/Edge/Firefox/Safari modern). **Dilarang** melepas kelas secara sinkron setelah `window.print()` (di sebagian browser `print()` tidak memblokir -> halaman tercetak kosong).

**Kenapa `position: absolute`, bukan `fixed`:** elemen `fixed` hanya tercetak di halaman pertama pada Chrome - Logbook bisa berhalaman banyak. `absolute` + `left/top: 0` menarik dokumen ke pangkal halaman sementara sisa konten tetap `visibility: hidden` (kotaknya masih ada, tapi tak terlihat).

**Orientasi:** satu `@page { size: A4 landscape }` untuk kedua dokumen. Alasan: Logbook 13 kolom mustahil terbaca di portrait; Neraca tetap layak di landscape; `@page` bersifat dokumen sehingga tidak bisa dikondisikan per tab tanpa manipulasi DOM tambahan. User tetap bisa mengubah orientasi di dialog print. (Risiko sisa: R-11.)

**Ekspektasi user yang wajib ditulis di UI:** di dekat tombol, satu kalimat kecil: `Membuka dialog cetak browser - pilih "Simpan sebagai PDF" untuk mengunduh.` (referensi keputusan #6: user perlu tahu ini bukan unduhan otomatis).

---

## 21. Struktur File (final babak 2) & Budget CSS

| File | Status | Isi babak 2 | Perkiraan |
|---|---|---|---|
| `b3-waste-model.ts` | **diubah (aditif)** | `KoreksiJenis`, `IsiTimbang.koreksiJenis?`, `terapkanTimbang()`, cabang `PIC_WEIGH` memanggilnya | +30 baris |
| `b3-waste-data.ts` | **diubah (aditif)** | `DOK_LOGBOOK`, `DOK_NERACA`, `PENANDATANGAN`, `TEMBUSAN` | +35 baris |
| `b3-waste-logbook.ts` | **BARU** | tipe Logbook/Neraca, `bangunLogbook`, `kelompokkanLogbook`, `hitungNeraca`, `pratinjauPengajuan`, `keTon`/`format*`, `KATEGORI_PERLAKUAN`, `BULAN` | ~200 baris |
| `b3-dokumen.ts` | **BARU** | class `B3Dokumen`, `ViewEncapsulation.None`, `cetak()` | ~35 baris |
| `b3-dokumen.html` | **BARU** | replika Logbook (per blok) + Neraca | ~200 baris |
| `b3-dokumen.css` | **BARU** | style dokumen (ternamespace `.b3-doc`) + blok `@media print` | <= **8 kB** |
| `b3-waste.ts` | **diubah (aditif)** | 3 computed (18.1) + 5 method pratinjau/koreksi (18.3) + `bukaTab` tetap | +45 baris |
| `b3-waste.html` | **diubah** | panel timbang diperluas jadi preview editable + pratinjau Neraca; 2 placeholder logbook/neraca **diganti** `<app-b3-dokumen>`; link "Lihat di Logbook" | +90 / -14 baris |
| `b3-waste.css` | **diubah (aditif)** | style preview (tabel kecil, sub-panel pratinjau) | tetap <= **4 kB** |
| `waste-picker.*` | **tidak disentuh** | - | - |

Total folder jadi **11 file** (+ `b3-waste-model.spec.ts` milik QA). Tidak ada sub-folder, tidak ada barrel.

**Kenapa memecah `b3-waste-logbook.ts` (bukan menumpuk di `b3-waste-model.ts`):** ADR-5. **Kenapa memecah komponen `B3Dokumen` (bukan menumpuk di `b3-waste.html`):** ADR-7.

**Budget CSS (aturan 2.5 tetap berlaku, dengan alokasi baru):**

| Komponen | `styleUrls` | Batas |
|---|---|---|
| `B3Waste` | `feature-page.css` (5,1 kB) + `b3-waste.css` | `b3-waste.css` <= **4 kB** (sekarang 2,6 kB - sisa ruang ~1,4 kB untuk style preview) |
| `WastePicker` | `waste-picker.css` | <= 5 kB (tidak berubah) |
| `B3Dokumen` | `b3-dokumen.css` saja | <= **8 kB** (budget error 10 kB; komponen ini tidak memakai `feature-page.css`) |

`B3Dokumen` **tidak** memakai `feature-page.css`: dokumen harus tampil seperti formulir kertas (border penuh, font kecil, tanpa tema kartu aplikasi), dan menghindarinya memberi ruang budget 8 kB penuh.

---

## 22. ADR Babak 2

### ADR-5: `LogbookEntry` derived (computed), dan hitungannya tinggal di file murni terpisah

**Konteks.** Butuh baris logbook & agregat neraca dari transaksi timbang. Refleks umum: `logbook = signal<LogbookEntry[]>([])` yang di-`push` saat PIC validasi - persis yang ditanyakan orchestrator.
**Keputusan.** `logbook` adalah `computed()` atas `pengajuan()`. Seluruh hitungan diletakkan di file murni **baru** `b3-waste-logbook.ts`, bukan ditumpuk ke `b3-waste-model.ts`.
**Alasan.** (1) Tabel 15.2 membuktikan nol field yatim - menyimpan ulang = menciptakan sumber kedua yang bisa menyimpang, melanggar kalimat eksplisit spec sumber ("proyeksi dari transaksi yang sama"). (2) Preview PIC yang editable justru menuntut ini: bila logbook disimpan terpisah, "nilai hasil edit" harus disalin ke dua tempat dan bisa berbeda; dengan derived, satu-satunya jalan masuk adalah `IsiTimbang` -> reducer -> `pengajuan()`. (3) File terpisah: pelaporan adalah concern berbeda dari mesin status, nol kopling dua arah (`b3-waste-logbook.ts` mengimpor tipe dari model, tidak sebaliknya), dan aturan audit R-3 ("penulisan `status:` hanya di `b3-waste-model.ts`") tetap gampang dibaca karena file model tidak membengkak jadi ~780 baris.
**Konsekuensi.** (+) Mustahil ada Logbook yang tidak punya pengajuan `WEIGHED`; tidak ada kode sinkronisasi; agregasi bisa diuji Vitest tanpa TestBed. (-) Setiap perubahan `pengajuan()` menghitung ulang seluruh logbook - tidak relevan pada skala prototipe (puluhan baris, in-memory, hanya saat ada aksi). (-) Bila kelak butuh koreksi logbook yang **tidak** berasal dari pengajuan (mis. limbah masuk tanpa pengajuan), perlu sumber kedua yang sah - saat itu barulah `signal` dibenarkan, dan itu keputusan babak berikutnya (YAGNI).

### ADR-6: Pengelompokan per jenis dikerjakan di TypeScript (array terurut), bukan di template

**Konteks.** Logbook = satu lembar per jenis. Refleks umum: `@for` atas daftar jenis lalu `filter` di dalamnya, atau `Map` + `KeyValuePipe`.
**Keputusan.** Fungsi murni `kelompokkanLogbook()` menghasilkan `BlokLogbook[]` terurut (`Map` sekali lintasan di dalamnya); template hanya `@for` bersarang atas array jadi.
**Alasan.** Filter di template dievaluasi setiap change detection dan berbiaya O(jenis x baris); `KeyValuePipe` menuntut impor `CommonModule` dan urutan yang tidak dikontrol kontrak. Array terurut membuat `track` stabil (`b.kode`) dan membuat urutan lembar bisa diuji QA secara eksak.
**Konsekuensi.** (+) Template dangkal & murah; hasil deterministik. (-) Satu tipe tambahan (`BlokLogbook`) - dibayar oleh hilangnya logika di template.

### ADR-7: Satu komponen `B3Dokumen` ber-`ViewEncapsulation.None`, dengan seluruh selektor ternamespace

**Konteks.** Dua dokumen cetak + kebutuhan menyembunyikan chrome aplikasi yang filenya masuk blacklist.
**Keputusan.** Satu komponen anak `B3Dokumen` (`mode: 'logbook' | 'neraca'`) dengan `ViewEncapsulation.None`, stylesheet ternamespace `.b3-doc`, dan aturan print bergerbang `body.b3-printing`.
**Alasan.** (1) Hanya stylesheet tak ter-enkapsulasi yang bisa menulis `body.b3-printing *` - dan itu satu-satunya cara menyembunyikan sidebar/topbar **tanpa menyentuh `layout/**`**. (2) Melakukannya pada `B3Waste` akan meng-global-kan seluruh style halaman (bocor ke menu lain) - tidak dapat diterima. (3) Satu komponen untuk dua dokumen, bukan dua: keduanya berbagi chrome dokumen yang sama (kotak info, blok tanda tangan, gaya tabel formulir); memecah dua berarti menduplikasi CSS itu atau membuat file CSS ketiga bersama. (4) Sekaligus menyelamatkan `b3-waste.html` dari ~590 baris (batas praktis R-8) dan memberi budget CSS terpisah.
**Konsekuensi.** (+) Print bekerja tanpa satu pun file di luar folder disentuh; `b3-waste.html` tetap terkelola. (-) Disiplin manual: **setiap** selektor di `b3-dokumen.css` wajib diawali `.b3-doc`/`body.b3-printing` (diaudit Code Review, R-9). (-) `@page` bersifat global saat print (R-11).

---

## 23. Pembagian Tugas Implementasi (lanjutan tabel Bagian 10)

Urutan penting: murni dulu, UI belakangan, print terakhir.

| # | Tugas | File | Selesai bila |
|---|---|---|---|
| F12 | Tipe + agregasi murni: `LogbookEntry`, `BlokLogbook`, `Neraca*`, `bangunLogbook`, `kelompokkanLogbook`, `hitungNeraca`, `keTon`, `format*`, `BULAN`, `KATEGORI_PERLAKUAN` | `b3-waste-logbook.ts` | Angka 16.1-16.4 tepat; 7 kategori selalu ada; kinerja `null` saat kosong |
| F13 | `KoreksiJenis` + `IsiTimbang.koreksiJenis?` + `terapkanTimbang()` + `PIC_WEIGH` memanggilnya + `pratinjauPengajuan()` | `b3-waste-model.ts`, `b3-waste-logbook.ts` | Seluruh unit test babak 1 tetap hijau (perubahan aditif); preview & hasil final memakai satu fungsi |
| F14 | Konstanta teks dokumen | `b3-waste-data.ts` | Nilai verbatim 17.3, tanpa ASLI/COPY |
| F15 | 3 computed + 5 method pratinjau/koreksi | `b3-waste.ts` | Nol `signal<Logbook...>`/`signal<Neraca>` di seluruh folder |
| F16 | Preview editable di panel timbang + pratinjau Neraca read-only + link "Lihat di Logbook" + `infoAksi` | `b3-waste.html`, `b3-waste.css` | 18.2 & 18.3; `b3-waste.css` tetap <= 4 kB |
| F17 | Komponen dokumen: replika Logbook per blok & Neraca 2 bagian | `b3-dokumen.*` | Bagian 19 lengkap; 13 kolom; 7 kategori; tembusan 5 butir |
| F18 | Print: `cetak()`, `@media print`, gerbang `body.b3-printing`; lalu `npm run build` + audit ukuran CSS + audit scope | `b3-dokumen.*` | Bagian 20; build sukses; nol file di luar folder; nol dependency baru |

Bila QA menambah unit test babak 2, sasarannya **hanya F12-F13** (bagian murni): `keTon`, `hitungNeraca` (A=B, kinerja 100, kategori kosong), `kelompokkanLogbook` (grouping B107d), `terapkanTimbang` (koreksi jenis mengubah masa simpan).

---

## 24. Acceptance Criteria & Skenario Test Babak 2

AC-1..AC-34 babak 1 **tetap berlaku dan wajib tetap PASS**, dengan satu pengecualian yang diamandemen: **AC-31 dicabut** (placeholder Logbook/Neraca) - digantikan AC-35..AC-47. AC-32 (audit scope) dan AC-33 (build tanpa dependency baru) berlaku penuh atas file baru.

### 24.1 AC baru

| AC | Kriteria |
|---|---|
| **AC-35** | Tab Logbook menampilkan **satu lembar per kode jenis limbah** dari seluruh item pengajuan berstatus `WEIGHED`. Tiap lembar punya header replika (judul, No. Dokumen `FR/K3L/006/01`, Tanggal `13 Juni 2012`, Revisi `02`, Mengantikan `FR/K3L/006/01` / `07 Mei 2012`, Halaman `1 dari 1`), baris `Area :` (kosong) dan `Karakteristik Limbah : Beracun`, serta footer `Diperiksa oleh` + `Disetujui oleh`. |
| **AC-36** | Tabel Logbook punya **tepat 13 kolom** dengan 3 grup header (`MASUKNYA...` 5 kolom, `KELUARNYA...` 4 kolom, `SISA` 2 kolom); judul kolom 6 memuat teks `(t=0 + 90 hr)` **apa adanya**. |
| **AC-37** | Setiap baris = satu item tervalidasi, nilainya sesuai pemetaan 15.2; kolom Sisa **selalu `0`**; kolom Petugas berisi nama PIC (`Pak Ruli`), bukan nama sample PDF. |
| **AC-38** | Tidak ada stempel/teks `ASLI` maupun `COPY` di mana pun (grep di folder: nol hasil). |
| **AC-39** | Neraca Bagian I: satu baris per kode jenis, **Jumlah dalam Ton** (4 desimal, pemisah koma), CATATAN memuat seluruh nomor manifest unik yang menyumbang baris itu; baris TOTAL = **A**. |
| **AC-40** | Neraca Bagian II menampilkan **7 kategori berurutan** (DISIMPAN, DIMANFAATKAN, DIOLAH, DITIMBUN, DISERAHKAN PIHAK KE-3, EKSPORT, PERLAKUAN LAINNYA (KEMBALI KE SUPLIER)); hanya `DISERAHKAN PIHAK KE-3` berisi angka; **TOTAL (B) === TOTAL (A)**; kolom perizinan bercentang di `ADA`. |
| **AC-41** | `RESIDU (C) = 0`, `BELUM TERKELOLA (D) = 0`, `TOTAL (C+D) = 0`, **Kinerja = `100,00 %`** selama ada data; saat belum ada data Kinerja tampil `-` (bukan `0,00`, bukan `NaN`, bukan `#REF!`). |
| **AC-42** | Logbook & Neraca bersifat **kumulatif lintas pengajuan** dan bertahan saat berpindah tab dan berganti peran (tanpa reload). |
| **AC-43** | Preview Tahap 4 **editable**: mengubah `Jenis` (dropdown) dan `Jumlah kg` mengubah baris pratinjau & pratinjau Neraca seketika; setelah Validasi, **nilai yang tersimpan di Logbook adalah nilai hasil edit PIC**, dan `Maks. Simpan` ikut berubah bila kelas kode berpindah A<->B. |
| **AC-44** | Setelah Validasi sukses: panel timbang + preview **hilang dari layar audit**, `infoAksi` memuat `baris ditambahkan ke Logbook & Neraca`, tab Logbook bertambah **tepat N baris** (N = jumlah item), tab Neraca ter-update. |
| **AC-45** | Tombol **Unduh PDF** memicu dialog print browser; pratinjau print hanya memuat konten dokumen - **tanpa** sidebar, topbar, page-head, demo bar, statistik, tabs, dan tombol itu sendiri. Setelah dialog ditutup, `document.body` tidak lagi ber-kelas `b3-printing`, dan mencetak menu lain kembali normal. |
| **AC-46** | Ada tab yang tidak aktif tidak ikut tercetak (mencetak dari tab Neraca tidak memunculkan lembar Logbook, dan sebaliknya). |
| **AC-47** | **Satu sumber data**: `grep "signal<Logbook"`, `grep "signal<Neraca"`, dan `grep "logbook.update\|logbook.set"` di folder `b3-waste/` = **nol hasil**. Logbook & Neraca hanya lahir dari `computed()`/fungsi murni. |

### 24.2 Skenario (lanjutan S1-S8; dijalankan dalam satu sesi tanpa refresh)

#### S9 - Validasi 1 pengajuan multi-item -> Logbook terkelompok & Neraca ter-update (AC-35..AC-42)
1. Peran PIC, buka `PLB3/2026/0001` (`APPROVED`, 3 item: Oli `B105d`, Aki `A102d`, Majun `B110d`). Isi Tanggal timbang `2026-08-15`, Tanggal pembuangan `2026-08-15`, Tujuan `PT PLIB`, Manifest `MNF-2608-001`, berat `120` / `35` / `18`, centang pernyataan, klik Validasi. -> Status `WEIGHED`.
2. Buka tab **Logbook**. -> Muncul **3 lembar terpisah**, urut kode: `Aki (A102d)`, `Oli (B105d)`, `Majun (B110d)`. Tiap lembar berisi **1 baris** bernomor `1`. **AC-35**
3. Periksa satu lembar (Oli). -> 13 kolom; Tanggal Masuk `15/08/2026`; Sumber `ENG`; Jumlah Masuk `120`; Maks. Simpan `15/08/2027`; Petugas `Pak Ruli`; Tanggal Keluar `15/08/2026`; Jumlah Keluar `120`; Tujuan `PT PLIB`; Bukti Nomor Dokumen `MNF-2608-001`; **Sisa `0`**. Header kolom 6 memuat `(t=0 + 90 hr)`. Lembar Aki: Maks. Simpan `16/02/2027`. **AC-36, AC-37**
4. Cari teks `ASLI` / `COPY` di halaman. -> Tidak ada. **AC-38**
5. Buka tab **Neraca**. -> Bagian I berisi 3 baris (`Aki (A102d)` `0,0350`, `Oli (B105d)` `0,1200`, `Majun (B110d)` `0,0180`), semua Satuan `Ton`, CATATAN `MNF-2608-001`; **TOTAL (A) = `0,1730`**. **AC-39**
6. Bagian II. -> 7 kategori tercetak berurutan; hanya `DISERAHKAN PIHAK KE-3` berisi `0,1730` dengan 3 sub-baris jenis + centang di kolom `ADA`; **TOTAL (B) = `0,1730` = TOTAL (A)**. **AC-40**
7. Baris penutup. -> C `0`, D `0`, C+D `0`, **KINERJA `100,00 %`**. `PERIODE WAKTU : Agustus 2026`; footer `Sukabumi, 15/08/2026`, `Indra Setiyanto`/`EHS Supervisor`, `Mugiyono`/`EHS Section Head`, Tembusan 5 butir. **AC-41**
8. Validasi pengajuan kedua yang memuat jenis yang sudah ada (mis. Majun `B110d` dari `produksi/OC3`, berat `10`). -> Lembar `Majun (B110d)` kini punya **2 baris** (nomor 1 & 2, urut tanggal), lembar lain tidak berubah; Neraca baris Majun jadi `0,0280`, TOTAL A & B naik bersamaan, Kinerja tetap `100,00 %`. **AC-42**
9. Ganti peran ke USER lalu SUPERVISOR, buka tab Logbook & Neraca. -> Isinya sama persis (dokumen tidak bergantung peran), data tidak hilang. **AC-42**

#### S10 - Preview PIC editable: nilai hasil edit yang tersimpan (AC-43)
1. Peran PIC, buka pengajuan `APPROVED` berisi item Oli `B105d` (Engineering/ENG). Isi tanggal timbang. -> Panel Timbang menampilkan tabel baris logbook (No, Jenis dropdown, Sumber, Jumlah Masuk, Maks. Simpan, Jumlah Keluar, Sisa) dan di bawahnya pratinjau Neraca (Bagian I + Perlakuan + Total + Kinerja).
2. Ketik berat `120`. -> Baris pratinjau langsung menampilkan Jumlah Masuk `120`, Jumlah Keluar `120`, Sisa `0`; pratinjau Neraca Bagian I `0,1200`, TOTAL A = TOTAL B = `0,1200`, Kinerja `100,00 %` - **tanpa menekan tombol apa pun**.
3. Ubah dropdown Jenis dari `Oli (B105d)` ke `Aki (A102d)`. -> Nama baris berubah jadi `Aki`, **Maks. Simpan berubah** dari `15/08/2027` (365 hari) ke `16/02/2027` (185 hari); pratinjau Neraca menampilkan `Aki (A102d)`.
4. Ubah berat jadi `35`, klik Validasi. -> Status `WEIGHED`.
5. Buka detail pengajuan itu & tab Logbook. -> Yang tersimpan adalah **`Aki`, `A102d`, `35` kg, maks simpan `16/02/2027`** - **bukan** `Oli`/`120` yang dipilih user di Tahap 1. Riwayat memuat entri `PIC_WEIGH` dengan catatan yang menyebut koreksi jenis. **AC-43**
6. Pratinjau Neraca di layar audit dicoba diklik/diketik. -> Tidak ada input di sana (read-only by design; satu-satunya jalan mengubah angka adalah tabel di atasnya).

#### S11 - Layar audit kosong setelah submit, tab dokumen tetap terisi (AC-44)
1. Lanjutan S10 langkah 4, tetap di layar detail pengajuan yang baru divalidasi. -> Panel "Timbang & Validasi" beserta seluruh preview **tidak ada lagi di DOM**; tabel item tampil read-only; ada catatan "Data terkunci"; `infoAksi` memuat `2 notifikasi terkirim: ...` **dan** `baris ditambahkan ke Logbook & Neraca`. **AC-44**
2. Buka pengajuan `APPROVED` lain. -> Form timbang tampil **kosong** (berat kosong, tujuan/manifest kosong, pernyataan tidak tercentang, tidak ada sisa koreksi jenis dari pengajuan sebelumnya). **AC-44**
3. Klik "Lihat di Logbook" / buka tab Logbook. -> Baris dari pengajuan yang tadi divalidasi **ada dan permanen** (bertahan saat pindah tab bolak-balik). **AC-44**

#### S12 - Unduh PDF (AC-45, AC-46)
1. Tab Logbook, klik **Unduh PDF**. -> Dialog print browser terbuka. Pratinjau memuat **hanya** lembar-lembar Logbook: tidak ada sidebar aplikasi, topbar, judul halaman, demo bar, kartu statistik, tabs, maupun tombol Unduh PDF. **AC-45**
2. Periksa jumlah halaman. -> Setiap lembar (blok jenis) mulai di halaman baru; orientasi landscape; 13 kolom terbaca utuh tanpa terpotong.
3. Batalkan dialog. Periksa `document.body.className`. -> Tidak mengandung `b3-printing`. **AC-45**
4. Pindah ke tab Neraca, klik Unduh PDF. -> Pratinjau memuat **hanya** dokumen Neraca (Bagian I + II + penutup + tembusan); tidak ada lembar Logbook. **AC-46**
5. Buka menu lain (`/inspection`), tekan Ctrl+P. -> Halaman tercetak normal seperti sebelum fitur ini ada (tidak blank, sidebar tetap seperti perilaku semula). **AC-45, AC-34**

#### S13 - Keadaan kosong & konsistensi kinerja (AC-41, AC-47)
1. (Di sesi baru / sebelum ada validasi apa pun) Buka tab Logbook. -> Pesan `Belum ada data logbook. Baris terbentuk otomatis setelah PIC memvalidasi timbang.`; tidak ada tabel kosong yang menggantung.
2. Tab Neraca sebelum ada data. -> Dokumen tetap lengkap; Bagian I menampilkan `Belum ada transaksi tervalidasi.`; TOTAL A/B `0,0000`; **Kinerja `-`** (bukan `0,00`, bukan `NaN`, bukan `#REF!`). **AC-41**
3. Setelah 2-3 validasi dengan berat berbeda (termasuk desimal, mis. `120,5` kg). -> Kinerja tetap **`100,00 %`**; TOTAL (B) selalu sama persis dengan TOTAL (A). **AC-41**
4. Audit kode: `grep "signal<Logbook"`, `grep "signal<Neraca"`, `grep "logbook.set\|logbook.update"` di `pages/b3-waste/`. -> **nol hasil**. **AC-47**

---

## 25. Risiko Teknis Babak 2 (lanjutan tabel Bagian 12)

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| **R-9** | **Kebocoran CSS global.** `b3-dokumen.css` tidak ter-enkapsulasi; satu selektor telanjang (mis. `table { }`, `h3 { }`) langsung merusak seluruh menu lain. | **Tinggi** | Aturan 20.2: setiap selektor wajib diawali `.b3-doc` atau `body.b3-printing`. Audit Code Review: baca file dan pastikan tidak ada selektor yang dimulai dengan elemen/utility umum. F18 wajib membuka 2 menu lain setelah membuka Limbah B3 untuk memastikan tampilan tidak berubah. |
| **R-10** | **Print menghasilkan halaman blank / terpotong.** `visibility: hidden` + posisi yang salah (`fixed`) membuat hanya halaman pertama tercetak; atau kelas `b3-printing` dilepas terlalu cepat. | Tinggi | 20.2: `position: absolute` (bukan `fixed`), pelepasan kelas lewat `afterprint` (bukan sinkron setelah `print()`). Diuji manual di Chrome/Edge (S12). |
| **R-11** | **`@page { size: A4 landscape }` bersifat global** saat print - berlaku juga bila user mencetak menu lain di sesi yang sama setelah membuka Limbah B3. | Rendah | Diterima sadar: tidak ada menu lain yang punya alur cetak, dan orientasi bisa diubah di dialog print. Dicatat sebagai butir konfirmasi 26.5. |
| **R-12** | **Pembulatan Ton membuat A != B** -> kinerja jadi `99,99%` dan seluruh premis "selalu 100%" runtuh. | Sedang | 16.2: seluruh agregasi dalam kg; `keTon()` hanya di ujung; kinerja dihitung dari kg. Diuji S13.3 dengan berat desimal. |
| **R-13** | **Budget CSS `anyComponentStyle`.** Replika dua formulir kertas bisa membengkakkan `b3-dokumen.css` melewati error 10 kB -> `npm run build` GAGAL (AC-33). | Sedang | Alokasi 21: `b3-dokumen.css` <= 8 kB, tanpa `feature-page.css`. Style dokumen memakai satu kelas tabel bersama (`.doc-table`) untuk kedua dokumen. F18 wajib cek ukuran file sebelum menyerahkan. |
| **R-14** | **Godaan menyimpan logbook di signal** saat implementasi (terasa "lebih gampang" dari computed ketika mengerjakan preview). | Sedang | P-1 + ADR-5 + AC-47 (grep). Ini pelanggaran severity tinggi otomatis di Code Review. |
| **R-15** | **`id` item dihitung ulang setelah koreksi jenis** (`${dept}-${sumber}-${kode}` menggoda untuk diperbarui) -> kunci `isi.berat` tidak cocok lagi, berat hilang / validasi gagal misterius. | Sedang | 17.1: `id` **tidak pernah** berubah setelah item dibuat; ia kunci, bukan deskripsi. Dicatat sebagai komentar wajib di `terapkanTimbang()`. |
| **R-16** | **Preview memanggil `tambahHari('')`** saat form belum lengkap -> `NaN` tanggal di layar. | Rendah | Guard di `terapkanTimbang()` (17.1): `maksSimpan = null` bila `tanggalTimbang` kosong; template merender `-`. |
| **R-17** | **`b3-waste.html` melewati batas praktis R-8** karena preview baru. | Rendah | Dokumen dipindah ke `B3Dokumen` (ADR-7); yang ditambahkan ke `b3-waste.html` hanya preview (~90 baris) sehingga totalnya ~400 baris - masih di bawah batas 450. |

---

## 26. Hal yang Perlu Dikonfirmasi ke User - Babak 2 (tidak memblokir Frontend)

Semua sudah punya keputusan kerja; ini daftar untuk checkpoint PM berikutnya.

1. **Satuan berbeda antar dokumen.** Logbook memakai **kg**, Neraca memakai **Ton** (4 desimal) - karena begitulah kedua form aslinya. Ini mengamandemen keputusan PM 5.5 #5 ("kg di seluruh UI") khusus untuk dokumen Neraca.
2. **Logo Otsuka tidak direplikasi sebagai gambar** - tidak ada berkas logo di repo dan menambah aset biner bukan bagian scope. Header memakai teks `PT. Amerta Indah Otsuka`. Bila user mengirim file logo, penambahannya sepele (satu `<img>` + aset di dalam folder b3-waste).
3. **Kolom "PERIZINAN LIMBAH B3 DARI KLH" dirender sebagai 3 sub-kolom** (`ADA | TIDAK ADA | KADALUARSA`) dengan centang di `ADA` - interpretasi Architect atas header PDF yang menulis ketiganya dalam satu judul kolom. Bila di form asli itu satu sel teks, perubahannya kosmetik.
4. **Nama penanda tangan tetap statis** `Indra Setiyanto` (EHS Supervisor) dan `Mugiyono` (EHS Section Head) sesuai form asli, sedangkan kolom **Petugas** di Logbook memakai PIC aktif (`Pak Ruli`). Area tanda tangan dicetak kosong (prototipe tidak menangani tanda tangan).
5. **"Unduh PDF" membuka dialog cetak browser**, bukan mengunduh file otomatis; orientasi default **landscape** untuk kedua dokumen (Logbook 13 kolom tidak muat portrait).
6. **Pengelompokan lembar/baris memakai KODE limbah, bukan nama.** Akibat nyata di master saat ini: `Elektrik` (ENG, CAN-PET) dan `Lampu TL/Elektrik` (OFFICE) sama-sama `B107d` -> tergabung dalam **satu** lembar/baris berlabel `Elektrik (B107d)`. Bila user ingin keduanya terpisah, master data perlu kode berbeda (bukan aplikasi yang diubah).
7. **PIC boleh mengoreksi Jenis limbah di Tahap 4** (dropdown terbatas pada jenis milik sumber item itu). Koreksi mengubah kode, masa simpan, dan Maksimal Simpan. Pilihan asli user tidak disimpan sebagai field tersendiri - jejaknya ada di `riwayat` (catatan `PIC_WEIGH`). Bila audit trail per-item diperlukan, itu penambahan field yang perlu diminta terpisah.
8. **Neraca = agregat kumulatif berjalan**, bukan per-kuartal kalender (referensi keputusan #3). `PERIODE WAKTU` diisi dari rentang tanggal transaksi yang ada. Filter/pemilih periode belum dibuat (YAGNI) - mudah ditambahkan bila kelak diminta.
