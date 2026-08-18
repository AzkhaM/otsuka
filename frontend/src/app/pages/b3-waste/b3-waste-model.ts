// Mesin status murni untuk alur Limbah B3. TIDAK ADA impor Angular di file ini.
// Semua transisi status HANYA boleh terjadi lewat jalankanAksi() - lihat 02-architecture.md bagian 1.

export type Peran = 'USER' | 'SUPERVISOR' | 'PIC';

export interface Pengguna {
  peran: Peran;
  nama: string;
  email: string;
  jabatan: string;
}

export interface JenisLimbah {
  nama: string;
  kode: string;
}

export interface SumberLimbah {
  kode: string;
  nama: string;
  jenis: JenisLimbah[];
}

export interface DepartemenLimbah {
  id: string;
  nama: string;
  deskripsi: string;
  sumber: SumberLimbah[];
}

export type Status = 'WAIT_SUP' | 'REJ_SUP' | 'WAIT_PIC' | 'REJ_PIC' | 'APPROVED' | 'WEIGHED';

export interface HeaderPengajuan {
  lokasi: string;
  pelaksana: string;
  diajukanOleh: string;
  tanggalPengajuan: string;
  usulanTanggalBuang: string;
}

export interface ItemLimbah {
  id: string;
  departemenId: string;
  departemen: string;
  sumber: string;
  jenis: string;
  kode: string;
  masaSimpanHari: number;
  beratKg: number | null;
  maksSimpan: string | null;
}

export interface Supervisi {
  oleh: string;
  waktu: string;
  disetujui: boolean;
  alasanTolak: string;
}

export interface KeputusanPic {
  oleh: string;
  waktu: string;
  disetujui: boolean;
  tanggalJadwal: string;
  jamJadwal: string;
  alasanTolak: string;
}

export interface Penyerahan {
  tanggalTimbang: string;
  tanggalBuang: string;
  tujuan: string;
  noManifest: string;
  olehPic: string;
  divalidasi: boolean;
}

export interface RiwayatEntri {
  dari: Status | null;
  ke: Status;
  aksi: TipeAksi;
  oleh: string;
  peran: Peran;
  waktu: string;
  catatan: string;
}

export interface Pengajuan {
  id: number;
  nomor: string;
  status: Status;
  header: HeaderPengajuan;
  items: ItemLimbah[];
  lainnya: string;
  supervisi: Supervisi | null;
  pic: KeputusanPic | null;
  penyerahan: Penyerahan | null;
  riwayat: RiwayatEntri[];
}

export interface Notifikasi {
  id: number;
  pengajuanId: number;
  nomorPengajuan: string;
  kepadaPeran: Peran;
  kepadaNama: string;
  kepadaEmail: string;
  subjek: string;
  isi: string;
  waktu: string;
  pemicu: TipeAksi;
}

export type TipeAksi =
  | 'SUBMIT'
  | 'RESUBMIT'
  | 'SUP_APPROVE'
  | 'SUP_REJECT'
  | 'PIC_APPROVE'
  | 'PIC_REJECT'
  | 'PIC_WEIGH';

// KEPUTUSAN FRONTEND (didokumentasikan di 03-frontend.md #1): field `lainnyaAktif`
// ditambahkan pada IsiPengajuan (tidak ada di kontrak asli). Tanpa ini, V-LAINNYA
// ("kartu Lainnya dicentang tapi teks kosong") tidak bisa dibedakan dari "kartu
// Lainnya tidak dicentang" hanya dari string `lainnya` semata - dua kondisi itu
// sama-sama bisa berupa string kosong. Ini penambahan aditif, tidak mengubah/
// menghapus field yang sudah dikunci Architect.
export interface IsiPengajuan {
  header: HeaderPengajuan;
  items: ItemLimbah[];
  lainnya: string;
  lainnyaAktif: boolean;
}

// Babak 2: koreksi jenis limbah oleh PIC di preview Tahap 4 (02-architecture.md 17.1).
export interface KoreksiJenis {
  jenis: string;
  kode: string;
}

export interface IsiTimbang {
  berat: Record<string, number | null>;
  koreksiJenis?: Record<string, KoreksiJenis>; // key = ItemLimbah.id; absen = tidak dikoreksi
  tanggalTimbang: string;
  tanggalBuang: string;
  tujuan: string;
  noManifest: string;
  pernyataan: boolean;
}

export type Aksi =
  | { tipe: 'SUBMIT'; oleh: Pengguna; isi: IsiPengajuan }
  | { tipe: 'RESUBMIT'; oleh: Pengguna; isi: IsiPengajuan }
  | { tipe: 'SUP_APPROVE'; oleh: Pengguna }
  | { tipe: 'SUP_REJECT'; oleh: Pengguna; alasan: string }
  | { tipe: 'PIC_APPROVE'; oleh: Pengguna; tanggalJadwal: string; jamJadwal: string }
  | { tipe: 'PIC_REJECT'; oleh: Pengguna; alasan: string }
  | { tipe: 'PIC_WEIGH'; oleh: Pengguna; isi: IsiTimbang };

export type HasilAksi =
  | { ok: true; pengajuan: Pengajuan; notifikasi: Notifikasi[] }
  | { ok: false; errors: string[] };

// KEPUTUSAN FRONTEND (03-frontend.md #2): `konteks` untuk jalankanAksi() & buatNotifikasi()
// ditambah field `pengguna: Record<Peran, Pengguna>`. Alasan: buatNotifikasi perlu
// nama+email penerima (mis. Supervisor/PIC) yang bukan pelaku aksi (`aksi.oleh`).
// PENGGUNA adalah konstanta di b3-waste-data.ts; bila model.ts meng-impornya langsung,
// terbentuk import siklik (b3-waste-data.ts juga meng-impor jalankanAksi untuk bangunSeed()).
// Menyuntik lewat konteks menjaga b3-waste-model.ts tetap nol dependensi ke file lain,
// konsisten dengan pola yang sudah ada (waktu/id/nomor juga disuntik, bukan dibaca sendiri).
export interface Konteks {
  waktu: string;
  id: number;
  nomor: string;
  notifIdAwal: number;
  pengguna: Record<Peran, Pengguna>;
}

export const MASA_SIMPAN_A = 185;
export const MASA_SIMPAN_B = 365;

const E_GUARD = 'Aksi tidak diizinkan untuk status atau peran saat ini.';

export function masaSimpanHari(kode: string): number {
  const huruf = kode.trim().toUpperCase().charAt(0);
  return huruf === 'A' ? MASA_SIMPAN_A : MASA_SIMPAN_B;
}

/** tambahHari('2026-08-15', 185) -> '2027-02-16'. Aman zona waktu (Date lokal + format manual). */
export function tambahHari(tanggalIso: string, hari: number): string {
  const [y, m, d] = tanggalIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + hari);
  const yyyy = String(dt.getFullYear());
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** '2026-08-14' -> '14/08/2026' ; '' -> '-' */
export function formatTanggal(tanggalIso: string | null | undefined): string {
  if (!tanggalIso) return '-';
  const [y, m, d] = tanggalIso.split('-');
  return `${d}/${m}/${y}`;
}

/** '2026-08-10T08:15' -> '10/08/2026 08:15'. Tidak memakai Date/toISOString - string sudah wall-clock lokal. */
export function formatWaktu(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return '-';
  const [datePart, timePart] = isoDateTime.split('T');
  return `${formatTanggal(datePart)} ${(timePart ?? '').slice(0, 5)}`;
}

export function validasiIsiPengajuan(isi: IsiPengajuan): string[] {
  const errors: string[] = [];
  if (isi.header.lokasi.trim() === '') errors.push('Lokasi wajib diisi.');
  if (isi.header.pelaksana.trim() === '') errors.push('Pelaksana/pengangkut wajib diisi.');
  if (isi.header.diajukanOleh.trim() === '') errors.push('Diajukan oleh wajib diisi.');
  if (isi.header.tanggalPengajuan === '') errors.push('Tanggal pengajuan wajib diisi.');
  if (isi.items.length === 0) errors.push('Pilih minimal satu jenis sampah.');
  if (isi.lainnyaAktif && isi.lainnya.trim() === '') {
    errors.push('Keterangan "Lainnya" wajib diisi bila kartunya dicentang.');
  }
  return errors;
}

export function validasiAlasan(alasan: string): string[] {
  return alasan.trim() === '' ? ['Alasan penolakan wajib diisi.'] : [];
}

export function validasiJadwal(tanggal: string, jam: string): string[] {
  const errors: string[] = [];
  if (tanggal === '') errors.push('Tanggal jadwal timbang wajib diisi.');
  if (jam === '') errors.push('Jam jadwal timbang wajib diisi.');
  return errors;
}

export function validasiTimbang(items: ItemLimbah[], isi: IsiTimbang): string[] {
  const errors: string[] = [];
  const adaBeratKosong = items.some((it) => {
    const v = isi.berat[it.id];
    return typeof v !== 'number' || Number.isNaN(v) || v <= 0;
  });
  if (adaBeratKosong) errors.push('Berat setiap item wajib diisi dan lebih besar dari 0 kg.');
  if (isi.tanggalTimbang === '') errors.push('Tanggal timbang wajib diisi.');
  if (isi.tanggalBuang === '') errors.push('Tanggal pembuangan wajib diisi.');
  if (isi.tujuan.trim() === '') errors.push('Tujuan penyerahan wajib diisi.');
  if (isi.noManifest.trim() === '') errors.push('Nomor manifest wajib diisi.');
  if (isi.pernyataan !== true) errors.push('Centang pernyataan validasi PIC.');
  return errors;
}

function bulatkan(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Item hasil timbang. Dipakai reducer PIC_WEIGH DAN preview Tahap 4 (pratinjauPengajuan
 * di b3-waste-logbook.ts) - preview dijamin identik hasil akhir karena satu fungsi.
 * `id` TIDAK PERNAH dihitung ulang di sini: ia kunci `isi.berat`/`isi.koreksiJenis`,
 * bukan deskripsi (R-15 02-architecture.md).
 */
export function terapkanTimbang(items: ItemLimbah[], isi: IsiTimbang): ItemLimbah[] {
  return items.map((it) => {
    const koreksi = isi.koreksiJenis?.[it.id];
    const kode = koreksi?.kode.trim() || it.kode;
    const jenis = koreksi?.jenis.trim() || it.jenis;
    const hariSimpan = masaSimpanHari(kode);
    return {
      ...it,
      kode,
      jenis,
      masaSimpanHari: hariSimpan,
      beratKg: isi.berat[it.id] ?? null,
      maksSimpan: isi.tanggalTimbang ? tambahHari(isi.tanggalTimbang, hariSimpan) : null,
    };
  });
}

export interface KonteksNotifikasi {
  waktu: string;
  idAwal: number;
  pengguna: Record<Peran, Pengguna>;
}

export function buatNotifikasi(aksi: Aksi, pengajuan: Pengajuan, konteks: KonteksNotifikasi): Notifikasi[] {
  const { waktu, idAwal, pengguna } = konteks;

  const n = pengajuan.items.length;
  const nomor = pengajuan.nomor;
  const diajukanOleh = pengajuan.header.diajukanOleh;
  const lokasi = pengajuan.header.lokasi;
  const namaSupervisor = pengguna.SUPERVISOR.nama;
  const namaPic = pengguna.PIC.nama;

  let urut = 0;
  const kirim = (kepadaPeran: Peran, subjek: string, isi: string): Notifikasi => {
    const p = pengguna[kepadaPeran];
    const notif: Notifikasi = {
      id: idAwal + urut,
      pengajuanId: pengajuan.id,
      nomorPengajuan: nomor,
      kepadaPeran,
      kepadaNama: p.nama,
      kepadaEmail: p.email,
      subjek,
      isi,
      waktu,
      pemicu: aksi.tipe,
    };
    urut++;
    return notif;
  };

  switch (aksi.tipe) {
    case 'SUBMIT':
      return [
        kirim(
          'SUPERVISOR',
          `[Limbah B3] Pengajuan baru ${nomor} menunggu persetujuan Anda`,
          `${diajukanOleh} mengajukan pembuangan limbah B3 sebanyak ${n} item dari lokasi ${lokasi}. Mohon tinjau dan setujui atau tolak.`,
        ),
        kirim(
          'USER',
          `[Limbah B3] Pengajuan ${nomor} berhasil dikirim`,
          `Pengajuan Anda (${n} item) telah diteruskan ke Supervisor ${namaSupervisor} dan menunggu persetujuan.`,
        ),
      ];
    case 'RESUBMIT':
      return [
        kirim(
          'SUPERVISOR',
          `[Limbah B3] Pengajuan ${nomor} diajukan ulang, menunggu persetujuan Anda`,
          `${diajukanOleh} telah memperbaiki dan mengajukan ulang pengajuan ${nomor} (${n} item). Mohon tinjau kembali.`,
        ),
        kirim(
          'USER',
          `[Limbah B3] Pengajuan ${nomor} berhasil diajukan ulang`,
          `Perbaikan Anda telah diteruskan ke Supervisor ${namaSupervisor} dan menunggu persetujuan.`,
        ),
      ];
    case 'SUP_APPROVE':
      return [
        kirim(
          'PIC',
          `[Limbah B3] ${nomor} disetujui Supervisor, perlu jadwal timbang`,
          `Pengajuan ${nomor} dari ${diajukanOleh} telah disetujui ${namaSupervisor}. Mohon tetapkan tanggal dan jam timbang, lalu setujui.`,
        ),
        kirim(
          'USER',
          `[Limbah B3] ${nomor} disetujui Supervisor`,
          `Pengajuan Anda disetujui ${namaSupervisor}. Selanjutnya menunggu penjadwalan dari PIC ${namaPic}.`,
        ),
      ];
    case 'SUP_REJECT':
      return [
        kirim(
          'USER',
          `[Limbah B3] ${nomor} ditolak Supervisor`,
          `Pengajuan Anda ditolak oleh ${namaSupervisor}. Alasan: ${aksi.alasan} Anda dapat memperbaiki dan mengajukan ulang.`,
        ),
      ];
    case 'PIC_APPROVE': {
      const tgl = formatTanggal(aksi.tanggalJadwal);
      return [
        kirim(
          'USER',
          `[Limbah B3] ${nomor} disetujui & terjadwal`,
          `Pengajuan Anda disetujui PIC ${namaPic}. Timbang dijadwalkan ${tgl} pukul ${aksi.jamJadwal} WIB.`,
        ),
        kirim(
          'SUPERVISOR',
          `[Limbah B3] ${nomor} disetujui & terjadwal`,
          `Pengajuan ${nomor} dari ${diajukanOleh} disetujui PIC ${namaPic}. Timbang dijadwalkan ${tgl} pukul ${aksi.jamJadwal} WIB.`,
        ),
      ];
    }
    case 'PIC_REJECT':
      return [
        kirim(
          'USER',
          `[Limbah B3] ${nomor} ditolak PIC`,
          `Pengajuan Anda ditolak oleh PIC ${namaPic}. Alasan: ${aksi.alasan} Anda dapat memperbaiki dan mengajukan ulang.`,
        ),
        kirim(
          'SUPERVISOR',
          `[Limbah B3] ${nomor} ditolak PIC`,
          `Pengajuan ${nomor} dari ${diajukanOleh} ditolak PIC ${namaPic}. Alasan: ${aksi.alasan}`,
        ),
      ];
    case 'PIC_WEIGH': {
      const totalKg = bulatkan(pengajuan.items.reduce((s, it) => s + (it.beratKg ?? 0), 0));
      const tujuan = pengajuan.penyerahan?.tujuan ?? '';
      const tanggalBuang = formatTanggal(pengajuan.penyerahan?.tanggalBuang);
      const noManifest = pengajuan.penyerahan?.noManifest ?? '';
      return [
        kirim(
          'USER',
          `[Limbah B3] ${nomor} selesai ditimbang & tervalidasi`,
          `Total berat final ${totalKg} kg untuk ${n} item. Diserahkan ke ${tujuan} pada ${tanggalBuang} dengan manifest ${noManifest}.`,
        ),
        kirim(
          'SUPERVISOR',
          `[Limbah B3] ${nomor} selesai ditimbang & tervalidasi`,
          `Pengajuan ${nomor} dari ${diajukanOleh}: total berat final ${totalKg} kg, diserahkan ke ${tujuan} pada ${tanggalBuang}, manifest ${noManifest}.`,
        ),
      ];
    }
  }
}

/** Tombol yang boleh dirender untuk kombinasi status+peran ini (matriks 3.3 arsitektur). */
export function aksiUntuk(status: Status | null | undefined, peran: Peran): TipeAksi[] {
  if (!status) return [];
  if (peran === 'USER') {
    return status === 'REJ_SUP' || status === 'REJ_PIC' ? ['RESUBMIT'] : [];
  }
  if (peran === 'SUPERVISOR') {
    return status === 'WAIT_SUP' ? ['SUP_APPROVE', 'SUP_REJECT'] : [];
  }
  // PIC
  if (status === 'WAIT_PIC') return ['PIC_APPROVE', 'PIC_REJECT'];
  if (status === 'APPROVED') return ['PIC_WEIGH'];
  return [];
}

export function jalankanAksi(sebelum: Pengajuan | null, aksi: Aksi, konteks: Konteks): HasilAksi {
  const notifKonteks = { waktu: konteks.waktu, idAwal: konteks.notifIdAwal, pengguna: konteks.pengguna };

  switch (aksi.tipe) {
    case 'SUBMIT': {
      if (sebelum !== null || aksi.oleh.peran !== 'USER') return { ok: false, errors: [E_GUARD] };
      const errors = validasiIsiPengajuan(aksi.isi);
      if (errors.length) return { ok: false, errors };
      const pengajuan: Pengajuan = {
        id: konteks.id,
        nomor: konteks.nomor,
        status: 'WAIT_SUP',
        header: aksi.isi.header,
        items: aksi.isi.items,
        lainnya: aksi.isi.lainnyaAktif ? aksi.isi.lainnya : '',
        supervisi: null,
        pic: null,
        penyerahan: null,
        riwayat: [
          { dari: null, ke: 'WAIT_SUP', aksi: 'SUBMIT', oleh: aksi.oleh.nama, peran: 'USER', waktu: konteks.waktu, catatan: '' },
        ],
      };
      return { ok: true, pengajuan, notifikasi: buatNotifikasi(aksi, pengajuan, notifKonteks) };
    }

    case 'RESUBMIT': {
      if (!sebelum || aksi.oleh.peran !== 'USER' || (sebelum.status !== 'REJ_SUP' && sebelum.status !== 'REJ_PIC')) {
        return { ok: false, errors: [E_GUARD] };
      }
      const errors = validasiIsiPengajuan(aksi.isi);
      if (errors.length) return { ok: false, errors };
      const pengajuan: Pengajuan = {
        ...sebelum,
        status: 'WAIT_SUP',
        header: aksi.isi.header,
        items: aksi.isi.items,
        lainnya: aksi.isi.lainnyaAktif ? aksi.isi.lainnya : '',
        supervisi: null,
        pic: null,
        riwayat: [
          ...sebelum.riwayat,
          { dari: sebelum.status, ke: 'WAIT_SUP', aksi: 'RESUBMIT', oleh: aksi.oleh.nama, peran: 'USER', waktu: konteks.waktu, catatan: '' },
        ],
      };
      return { ok: true, pengajuan, notifikasi: buatNotifikasi(aksi, pengajuan, notifKonteks) };
    }

    case 'SUP_APPROVE': {
      if (!sebelum || sebelum.status !== 'WAIT_SUP' || aksi.oleh.peran !== 'SUPERVISOR') return { ok: false, errors: [E_GUARD] };
      const supervisi: Supervisi = { oleh: aksi.oleh.nama, waktu: konteks.waktu, disetujui: true, alasanTolak: '' };
      const pengajuan: Pengajuan = {
        ...sebelum,
        status: 'WAIT_PIC',
        supervisi,
        riwayat: [
          ...sebelum.riwayat,
          { dari: 'WAIT_SUP', ke: 'WAIT_PIC', aksi: 'SUP_APPROVE', oleh: aksi.oleh.nama, peran: 'SUPERVISOR', waktu: konteks.waktu, catatan: '' },
        ],
      };
      return { ok: true, pengajuan, notifikasi: buatNotifikasi(aksi, pengajuan, notifKonteks) };
    }

    case 'SUP_REJECT': {
      if (!sebelum || sebelum.status !== 'WAIT_SUP' || aksi.oleh.peran !== 'SUPERVISOR') return { ok: false, errors: [E_GUARD] };
      const errors = validasiAlasan(aksi.alasan);
      if (errors.length) return { ok: false, errors };
      const supervisi: Supervisi = { oleh: aksi.oleh.nama, waktu: konteks.waktu, disetujui: false, alasanTolak: aksi.alasan };
      const pengajuan: Pengajuan = {
        ...sebelum,
        status: 'REJ_SUP',
        supervisi,
        riwayat: [
          ...sebelum.riwayat,
          { dari: 'WAIT_SUP', ke: 'REJ_SUP', aksi: 'SUP_REJECT', oleh: aksi.oleh.nama, peran: 'SUPERVISOR', waktu: konteks.waktu, catatan: aksi.alasan },
        ],
      };
      return { ok: true, pengajuan, notifikasi: buatNotifikasi(aksi, pengajuan, notifKonteks) };
    }

    case 'PIC_APPROVE': {
      if (!sebelum || sebelum.status !== 'WAIT_PIC' || aksi.oleh.peran !== 'PIC') return { ok: false, errors: [E_GUARD] };
      const errors = validasiJadwal(aksi.tanggalJadwal, aksi.jamJadwal);
      if (errors.length) return { ok: false, errors };
      const pic: KeputusanPic = {
        oleh: aksi.oleh.nama,
        waktu: konteks.waktu,
        disetujui: true,
        tanggalJadwal: aksi.tanggalJadwal,
        jamJadwal: aksi.jamJadwal,
        alasanTolak: '',
      };
      const pengajuan: Pengajuan = {
        ...sebelum,
        status: 'APPROVED',
        pic,
        riwayat: [
          ...sebelum.riwayat,
          {
            dari: 'WAIT_PIC',
            ke: 'APPROVED',
            aksi: 'PIC_APPROVE',
            oleh: aksi.oleh.nama,
            peran: 'PIC',
            waktu: konteks.waktu,
            catatan: `Jadwal timbang ${formatTanggal(aksi.tanggalJadwal)} pukul ${aksi.jamJadwal}`,
          },
        ],
      };
      return { ok: true, pengajuan, notifikasi: buatNotifikasi(aksi, pengajuan, notifKonteks) };
    }

    case 'PIC_REJECT': {
      if (!sebelum || sebelum.status !== 'WAIT_PIC' || aksi.oleh.peran !== 'PIC') return { ok: false, errors: [E_GUARD] };
      const errors = validasiAlasan(aksi.alasan);
      if (errors.length) return { ok: false, errors };
      const pic: KeputusanPic = {
        oleh: aksi.oleh.nama,
        waktu: konteks.waktu,
        disetujui: false,
        tanggalJadwal: '',
        jamJadwal: '',
        alasanTolak: aksi.alasan,
      };
      const pengajuan: Pengajuan = {
        ...sebelum,
        status: 'REJ_PIC',
        pic,
        riwayat: [
          ...sebelum.riwayat,
          { dari: 'WAIT_PIC', ke: 'REJ_PIC', aksi: 'PIC_REJECT', oleh: aksi.oleh.nama, peran: 'PIC', waktu: konteks.waktu, catatan: aksi.alasan },
        ],
      };
      return { ok: true, pengajuan, notifikasi: buatNotifikasi(aksi, pengajuan, notifKonteks) };
    }

    case 'PIC_WEIGH': {
      if (!sebelum || sebelum.status !== 'APPROVED' || aksi.oleh.peran !== 'PIC') return { ok: false, errors: [E_GUARD] };
      const errors = validasiTimbang(sebelum.items, aksi.isi);
      if (errors.length) return { ok: false, errors };
      const items = terapkanTimbang(sebelum.items, aksi.isi);
      const penyerahan: Penyerahan = {
        tanggalTimbang: aksi.isi.tanggalTimbang,
        tanggalBuang: aksi.isi.tanggalBuang,
        tujuan: aksi.isi.tujuan,
        noManifest: aksi.isi.noManifest,
        olehPic: aksi.oleh.nama,
        divalidasi: true,
      };
      const totalKg = bulatkan(items.reduce((s, it) => s + (it.beratKg ?? 0), 0));
      const jumlahKoreksi = Object.keys(aksi.isi.koreksiJenis ?? {}).length;
      const catatanKoreksi = jumlahKoreksi > 0 ? `, koreksi jenis ${jumlahKoreksi} item` : '';
      const pengajuan: Pengajuan = {
        ...sebelum,
        status: 'WEIGHED',
        items,
        penyerahan,
        riwayat: [
          ...sebelum.riwayat,
          {
            dari: 'APPROVED',
            ke: 'WEIGHED',
            aksi: 'PIC_WEIGH',
            oleh: aksi.oleh.nama,
            peran: 'PIC',
            waktu: konteks.waktu,
            catatan: `Total berat ${totalKg} kg, manifest ${aksi.isi.noManifest}${catatanKoreksi}`,
          },
        ],
      };
      return { ok: true, pengajuan, notifikasi: buatNotifikasi(aksi, pengajuan, notifKonteks) };
    }
  }
}
