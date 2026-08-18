# Sistem Digital Pembuangan Limbah B3 — Spesifikasi Bagian 1–5

**PT Amerta Indah Otsuka · Departemen K3L / Engineering (TPS LB3)**
Dokumen perencanaan aplikasi — versi pra-pengembangan (data contoh masih mock).

---

## 1. Ringkasan & tujuan

Aplikasi ini mendigitalkan dan mengotomatiskan rantai dokumen limbah B3 dari **pengajuan pembuangan → approval → penimbangan → logbook → neraca periodik**, menggantikan alur manual Excel/kertas. Prinsip utamanya: user hanya mengajukan, angka final ditimbang PIC, dan **logbook + neraca terbentuk otomatis dari satu sumber data** (tidak ada input ganda).

Dokumen sumber yang jadi acuan:

| Dokumen | No. | Peran dalam sistem |
|---|---|---|
| Catatan Permintaan Pembuangan Limbah | FR/K3L/006/02 | Pemicu — pengajuan (Bagian 1) |
| Lembar Data Penyimpanan Limbah B3 | FR/K3L/006/01 | Ledger masuk/keluar/sisa (Bagian 4) |
| Neraca Limbah B3 | FR/K3L/006/02/1 | Rekap periodik regulator (Bagian 5) |
| Rincian Teknis Izin TPS LB3 (Rintek) | — | Master jenis, sumber, masa simpan |

---

## 2. Alur lima tahap

1. **Diajukan user** — pemohon mengisi form & memilih limbah, lalu submit.
2. **Approve supervisor** — atasan menyetujui / menolak (dengan alasan).
3. **Jadwal & approve PIC** — PIC menetapkan tanggal-jam timbang, lalu menyetujui / menolak (dengan alasan).
4. **Timbang di lokasi** — PIC menimbang & mendata fisik limbah.
5. **Validasi → logbook & neraca** — hasil validasi otomatis menjadi Lembar Data + Neraca.

Email notifikasi terkirim di setiap perpindahan tahap.

---

## 3. Aturan wajib (logika inti)

- **Masa simpan by kode:** kode diawali **A → 185 hari**, kode diawali **B → 365 hari**.
  `Maksimal Simpan = Tanggal Masuk/Timbang + masa simpan`
- **Berat resmi = hasil timbang PIC**, bukan volume perkiraan user.
- **Saldo berjalan (Sisa):** `Σ Masuk − Σ Keluar`, per jenis / per area / total.
- **Neraca (mass balance):** `A = B + C + D`
  - A = total limbah dihasilkan
  - B = total dikelola (disimpan + dimanfaatkan + diolah + ditimbun + diserahkan pihak-3 + ekspor + lainnya)
  - C = residu · D = belum terkelola
- **Kinerja pengelolaan = (B ÷ A) × 100%**

---

## 4. Bagian 1 — Form pengajuan (user)

**File prototipe:** `sistem_pembuangan_limbah_b3_wadah.html`

### Field header
| Field | Contoh | Wajib |
|---|---|---|
| Lokasi | Sukabumi | ya |
| Pelaksana / pengangkut | PT PLIB | ya |
| Diajukan oleh | Feri Aryanto | ya |
| Tanggal pengajuan | 13/08/2026 | ya |
| Usulan tanggal pembuangan | 15/08/2026 | opsional (jadwal final oleh PIC) |

### Pemilihan limbah — cascade 3 tingkat (centang)
1. **Departemen** (grid centang): Engineering, QA, Produksi, Office, + kartu **Lainnya** (teks bebas).
2. **Sumber (kode line)** — muncul saat departemen dicentang.
3. **Jenis sampah** — muncul saat sumber dibuka, lalu dicentang.

Departemen satu-line langsung membuka sumbernya; Produksi punya 4 line (OC3/GBL/CAN-PET/Sachet). Uncheck departemen membersihkan pilihan di bawahnya. **Berat (kg) tidak diisi di sini** — diisi PIC saat timbang.

### Data mock (Departemen → Sumber → Jenis)
> Status **MOCK** — menunggu master data lapangan.

| Departemen | Sumber | Jenis sampah (kode) |
|---|---|---|
| Engineering | ENG | Oli (B105d), Aki (A102d), Elektrik (B107d), Filter (B109d), Baterai Lithium (B326-1), Majun (B110d), Kemasan ex-Chemical (B104d), Terkontaminasi (A108d), POPs (A101d) |
| QA | QA-LAB | Bahan Kimia Kadaluarsa (A338-1), Residu Sample (A338-3), Kemasan ex-Chemical (B104d), Terkontaminasi (A108d) |
| Produksi | OC3 | Kemasan ex-Chemical (B104d), Majun (B110d), Oli (B105d), Terkontaminasi (A108d) |
| Produksi | GBL | Kemasan ex-Chemical (B104d), Majun (B110d), Terkontaminasi (A108d) |
| Produksi | CAN-PET | Kemasan ex-Chemical (B104d), Majun (B110d), Oli (B105d), Elektrik (B107d) |
| Produksi | Sachet | Kemasan ex-Chemical (B104d), Majun (B110d), Terkontaminasi (A108d) |
| Office | OFFICE | Kemasan Tinta (B321-4), Toner (B353-1), Lampu TL/Elektrik (B107d) |

**Output:** draft pengajuan `{ departemen, sumber, jenis, kode, masa_simpan }` + header → diteruskan ke Supervisor.

---

## 5. Bagian 2–3 — Alur approval (user → supervisor → PIC)

**File prototipe:** `bagian2-3_simulasi_approval.html`

### Peran
| Peran | Contoh nama | Tindakan |
|---|---|---|
| User / pemohon | Feri Aryanto | Submit pengajuan; terima notifikasi |
| Supervisor | Andi Nugroho | Approve / Reject (alasan wajib) |
| PIC Pembuangan | Pak Feri (K3L) | Tetapkan jadwal + Approve / Reject (alasan wajib) |

### State machine
| Status | Dipicu oleh | Email terkirim ke |
|---|---|---|
| Diajukan (WAIT_SUP) | user submit | Supervisor (baru) + User (konfirmasi) |
| Ditolak supervisor (REJ_SUP) | supervisor reject + alasan | User (alasan) |
| Disetujui supervisor (WAIT_PIC) | supervisor approve | PIC (perlu jadwal) + User |
| Ditolak PIC (REJ_PIC) | PIC reject + alasan | User + Supervisor |
| Disetujui & terjadwal (APPROVED) | PIC approve + tgl/jam | User + Supervisor (jadwal) |

### Aturan approval
- **Reject wajib disertai alasan** (divalidasi; tidak boleh kosong). Alasan ikut dikirim ke pemohon.
- **PIC wajib mengisi tanggal & jam** inspeksi sebelum menyetujui.
- Setelah ditolak, pemohon dapat **memperbaiki & mengajukan ulang**.
- **Asumsi:** penetapan jadwal timbang ada di tangan PIC (dikonfirmasi bila berbeda).

---

## 6. Bagian 4–5 — Timbang, logbook & neraca (PIC)

**File prototipe:** `bagian4-5_timbang_logbook_neraca.html`

### Tahap 4 — Timbang & validasi (template logbook digital)
PIC mengisi **berat timbang (kg)** tiap item (Maksimal Simpan terhitung otomatis), lalu data penyerahan: tanggal pembuangan, tujuan (PT PLIB), nomor manifest. Validasi:
- setiap item berat > 0 kg,
- tujuan & nomor manifest wajib,
- centang pernyataan validasi PIC.

Setelah **Validasi & buat logbook**, data terkunci dan mengalir ke Bagian 5.

### Tahap 5a — Logbook (Lembar Data Penyimpanan, FR/K3L/006/01)
Terbentuk otomatis, format asli, tiga blok kolom:

- **Masuk:** No, Jenis, Tgl Masuk, Sumber, Jumlah (kg), Maks. Simpan, Petugas
- **Keluar:** Tgl Keluar, Jumlah (kg), Tujuan Penyerahan, Bukti No. Dokumen
- **Sisa:** Sisa (kg), Petugas + baris TOTAL

Bila timbang & penyerahan sehari → Sisa = 0. Bila limbah ditahan di TPS → blok Keluar dikosongkan, Sisa = jumlah masuk hingga penyerahan.

### Tahap 5b — Neraca (FR/K3L/006/02/1)
Dijumlahkan otomatis dari logbook:

- **Bagian I** — Jenis Awal Limbah + jumlah + catatan (no. manifest) → **TOTAL (A)**
- **Bagian II** — Perlakuan (Disimpan / Dimanfaatkan / Diolah / Ditimbun / **Diserahkan Pihak Ke-3** / Ekspor / Lainnya) + izin KLH → **TOTAL (B)**
- **Residu (C)**, **Belum Terkelola (D)**, Total tersisa (C+D)
- **Kinerja = (B/A) × 100%**

Tembusan: DLH Kabupaten Sukabumi, DLH Provinsi Jawa Barat, KLHK, Arsip EHS.

---

## 7. Aliran data (satu sumber, tiga tampilan)

```
Form pengajuan (item: departemen, sumber, jenis, kode)
        │  submit
        ▼
Approval supervisor ──(reject+alasan)──► kembali ke user
        │  approve
        ▼
Approval PIC + jadwal ──(reject+alasan)──► kembali ke user
        │  approve
        ▼
Timbang PIC (berat kg) + penyerahan (tujuan, manifest)
        │  validasi
        ├──────────────► LOGBOOK  (baris masuk/keluar/sisa, maks simpan)
        └──────────────► NERACA   (A → B → C → D, Kinerja %)
```

Berat dari PIC = angka final di semua tampilan. Logbook & Neraca bukan input terpisah, melainkan proyeksi dari transaksi yang sama.

---

## 8. Modul & cakupan (seluruh rantai)

- **Master data** — jenis limbah B3 (kode, kategori, karakteristik, kuota, masa simpan), departemen, sumber/line, pihak ketiga, petugas.
- **Modul 1** — Permintaan pembuangan (Bagian 1).
- **Modul 2** — Ledger TPS: masuk / sisa / keluar (Bagian 4).
- **Modul 3** — Neraca periodik otomatis (Bagian 5).
- **Dashboard & alert** — saldo per jenis, hitung mundur batas simpan, jenis mendekati/melewati tenggat.

---

## 9. Daftar hal yang masih perlu dikonfirmasi

1. **Masa simpan kode A:** 185 hari (briefing) vs 180 hari (Rintek) — dipakai **185** sesuai arahan; mohon dipastikan final.
2. **Master Sumber → Jenis asli** — pengelompokan kode line saat ini mock, menunggu data lapangan.
3. **Penetap jadwal timbang** — diasumsikan PIC.
4. **Satu event = Masuk + Keluar sekaligus** (disposal langsung ke PLIB) vs Masuk saja (ditahan di TPS dulu).
5. **Satuan neraca** — kg (dipakai sekarang) vs Ton (format regulator).
6. **Nama peran** — Pak Feri diset sebagai PIC; konfirmasi bila sama/berbeda dengan pemohon.

---

## 10. Daftar file prototipe

| Bagian | File |
|---|---|
| 1 — Form pengajuan | `sistem_pembuangan_limbah_b3_wadah.html` |
| 1 — Dokumentasi ringkas | `bagian1_form_pengajuan.md` |
| 2–3 — Simulasi approval | `bagian2-3_simulasi_approval.html` |
| 4–5 — Timbang → logbook → neraca | `bagian4-5_timbang_logbook_neraca.html` |
| 1–5 — Spesifikasi gabungan | `spesifikasi_lengkap_bagian1-5.md` (dokumen ini) |
