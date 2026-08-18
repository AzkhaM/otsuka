// Master data + seed. Boleh mengimpor b3-waste-model.ts (satu arah); model.ts TIDAK
// boleh mengimpor balik file ini (lihat catatan "KEPUTUSAN FRONTEND #2" di b3-waste-model.ts).
import {
  type DepartemenLimbah,
  type ItemLimbah,
  type Notifikasi,
  type Pengajuan,
  type Pengguna,
  type Peran,
  type Status,
  jalankanAksi,
  masaSimpanHari,
} from './b3-waste-model';

export const PENGGUNA: Record<Peran, Pengguna> = {
  USER: { peran: 'USER', nama: 'Feri Aryanto', email: 'feri.aryanto@aio.co.id', jabatan: 'Pemohon / User' },
  SUPERVISOR: { peran: 'SUPERVISOR', nama: 'Andi Nugroho', email: 'andi.nugroho@aio.co.id', jabatan: 'Supervisor' },
  PIC: { peran: 'PIC', nama: 'Pak Ruli', email: 'ruli@aio.co.id', jabatan: 'PIC Pembuangan (K3L)' },
};

export const LABEL_STATUS: Record<Status, string> = {
  WAIT_SUP: 'Diajukan',
  REJ_SUP: 'Ditolak Supervisor',
  WAIT_PIC: 'Disetujui Supervisor',
  REJ_PIC: 'Ditolak PIC',
  APPROVED: 'Disetujui & Terjadwal',
  WEIGHED: 'Ditimbang & Tervalidasi',
};

export const BADGE_STATUS: Record<Status, string> = {
  WAIT_SUP: 'badge-warning',
  REJ_SUP: 'badge-danger',
  WAIT_PIC: 'badge-info',
  REJ_PIC: 'badge-danger',
  APPROVED: 'badge-info',
  WEIGHED: 'badge-success',
};

export const LAINNYA_DESKRIPSI = 'Departemen atau jenis limbah yang belum terdaftar. Tuliskan keterangannya di kolom teks.';

// Babak 2: teks statis replika form Logbook/Neraca (02-architecture.md 17.3). Nilai
// VERBATIM dari logbook-neraca-format-reference.md. Dilarang menambah stempel ASLI/COPY.
export const DOK_LOGBOOK = {
  perusahaan: 'PT. Amerta Indah Otsuka',
  section: 'Section K3L',
  departemen: 'Departemen Engineering',
  judul: 'LEMBAR DATA PENYIMPANAN LIMBAH BAHAN BERACUN DAN BERBAHAYA',
  halaman: '1 dari 1',
  noDokumen: 'FR/K3L/006/01',
  tanggal: '13 Juni 2012',
  revisi: '02',
  mengantikanNomor: 'FR/K3L/006/01',
  mengantikanTanggal: '07 Mei 2012',
  karakteristik: 'Beracun',
  headerMaksSimpan: 'Maksimal Penyimpanan s/d Tanggal (t=0 + 90 hr)',
};

export const DOK_NERACA = {
  perusahaan: 'PT. Amerta Indah Otsuka',
  judul: 'NERACA LIMBAH BAHAN BERACUN DAN BERBAHAYA',
  halaman: '1 dari 1',
  noDokumen: 'FR/K3L/006/02/1',
  tanggal: '13 Januari 2014',
  revisi: '00',
  mengantikanNomor: '-',
  mengantikanTanggal: '-',
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

// Transkripsi PERSIS dari spec sumber Bagian 4 / 02-architecture.md 8.1. Dilarang
// menambah/mengurangi/mengurutkan ulang. Checksum jenis per sumber: 9/4/4/3/4/3/3.
export const MASTER_DEPARTEMEN: DepartemenLimbah[] = [
  {
    id: 'engineering',
    nama: 'Engineering',
    deskripsi: 'Limbah dari kegiatan maintenance, workshop, dan utility: oli, aki, filter, majun.',
    sumber: [
      {
        kode: 'ENG',
        nama: 'Workshop & Utility',
        jenis: [
          { nama: 'Oli', kode: 'B105d' },
          { nama: 'Aki', kode: 'A102d' },
          { nama: 'Elektrik', kode: 'B107d' },
          { nama: 'Filter', kode: 'B109d' },
          { nama: 'Baterai Lithium', kode: 'B326-1' },
          { nama: 'Majun', kode: 'B110d' },
          { nama: 'Kemasan ex-Chemical', kode: 'B104d' },
          { nama: 'Terkontaminasi', kode: 'A108d' },
          { nama: 'POPs', kode: 'A101d' },
        ],
      },
    ],
  },
  {
    id: 'qa',
    nama: 'QA',
    deskripsi: 'Limbah dari laboratorium quality assurance: bahan kimia kadaluarsa dan residu sampel.',
    sumber: [
      {
        kode: 'QA-LAB',
        nama: 'Laboratorium QA',
        jenis: [
          { nama: 'Bahan Kimia Kadaluarsa', kode: 'A338-1' },
          { nama: 'Residu Sample', kode: 'A338-3' },
          { nama: 'Kemasan ex-Chemical', kode: 'B104d' },
          { nama: 'Terkontaminasi', kode: 'A108d' },
        ],
      },
    ],
  },
  {
    id: 'produksi',
    nama: 'Produksi',
    deskripsi: 'Limbah dari empat line produksi: OC3, GBL, CAN-PET, dan Sachet.',
    sumber: [
      {
        kode: 'OC3',
        nama: 'Line OC3',
        jenis: [
          { nama: 'Kemasan ex-Chemical', kode: 'B104d' },
          { nama: 'Majun', kode: 'B110d' },
          { nama: 'Oli', kode: 'B105d' },
          { nama: 'Terkontaminasi', kode: 'A108d' },
        ],
      },
      {
        kode: 'GBL',
        nama: 'Line GBL',
        jenis: [
          { nama: 'Kemasan ex-Chemical', kode: 'B104d' },
          { nama: 'Majun', kode: 'B110d' },
          { nama: 'Terkontaminasi', kode: 'A108d' },
        ],
      },
      {
        kode: 'CAN-PET',
        nama: 'Line CAN-PET',
        jenis: [
          { nama: 'Kemasan ex-Chemical', kode: 'B104d' },
          { nama: 'Majun', kode: 'B110d' },
          { nama: 'Oli', kode: 'B105d' },
          { nama: 'Elektrik', kode: 'B107d' },
        ],
      },
      {
        kode: 'Sachet',
        nama: 'Line Sachet',
        jenis: [
          { nama: 'Kemasan ex-Chemical', kode: 'B104d' },
          { nama: 'Majun', kode: 'B110d' },
          { nama: 'Terkontaminasi', kode: 'A108d' },
        ],
      },
    ],
  },
  {
    id: 'office',
    nama: 'Office',
    deskripsi: 'Limbah perkantoran: kemasan tinta, toner, dan lampu TL bekas.',
    sumber: [
      {
        kode: 'OFFICE',
        nama: 'Area Perkantoran',
        jenis: [
          { nama: 'Kemasan Tinta', kode: 'B321-4' },
          { nama: 'Toner', kode: 'B353-1' },
          { nama: 'Lampu TL/Elektrik', kode: 'B107d' },
        ],
      },
    ],
  },
];

function buatItem(departemenId: string, sumberKode: string, kode: string): ItemLimbah {
  const dept = MASTER_DEPARTEMEN.find((d) => d.id === departemenId)!;
  const sumber = dept.sumber.find((s) => s.kode === sumberKode)!;
  const jenis = sumber.jenis.find((j) => j.kode === kode)!;
  return {
    id: `${departemenId}-${sumberKode}-${kode}`,
    departemenId,
    departemen: dept.nama,
    sumber: sumber.kode,
    jenis: jenis.nama,
    kode: jenis.kode,
    masaSimpanHari: masaSimpanHari(kode),
    beratKg: null,
    maksSimpan: null,
  };
}

// Seed dibangun dengan MEREPLAY jalankanAksi() (ADR-4) - bukan literal objek jadi -
// supaya riwayat & notifikasi seed tidak pernah menyimpang dari perilaku reducer.
export function bangunSeed(): {
  pengajuan: Pengajuan[];
  notifikasi: Notifikasi[];
  nextId: number;
  nextNomor: number;
  nextNotifId: number;
} {
  const daftarPengajuan: Pengajuan[] = [];
  const daftarNotifikasi: Notifikasi[] = [];
  let notifId = 1;

  const jalan = (sebelum: Pengajuan | null, aksi: Parameters<typeof jalankanAksi>[1], waktu: string, id: number, nomor: string): Pengajuan => {
    const hasil = jalankanAksi(sebelum, aksi, { waktu, id, nomor, notifIdAwal: notifId, pengguna: PENGGUNA });
    if (!hasil.ok) throw new Error(`bangunSeed gagal pada ${nomor}: ${hasil.errors.join(', ')}`);
    notifId += hasil.notifikasi.length;
    daftarNotifikasi.push(...hasil.notifikasi);
    return hasil.pengajuan;
  };

  // #1 PLB3/2026/0001 -> APPROVED (siap ditimbang PIC)
  {
    const nomor = 'PLB3/2026/0001';
    const header = { lokasi: 'Sukabumi', pelaksana: 'PT PLIB', diajukanOleh: 'Feri Aryanto', tanggalPengajuan: '2026-08-10', usulanTanggalBuang: '2026-08-14' };
    const items = [buatItem('engineering', 'ENG', 'B105d'), buatItem('engineering', 'ENG', 'A102d'), buatItem('engineering', 'ENG', 'B110d')];
    let p = jalan(null, { tipe: 'SUBMIT', oleh: PENGGUNA.USER, isi: { header, items, lainnya: '', lainnyaAktif: false } }, '2026-08-10T08:15', 1, nomor);
    p = jalan(p, { tipe: 'SUP_APPROVE', oleh: PENGGUNA.SUPERVISOR }, '2026-08-10T10:40', 1, nomor);
    p = jalan(p, { tipe: 'PIC_APPROVE', oleh: PENGGUNA.PIC, tanggalJadwal: '2026-08-15', jamJadwal: '09:00' }, '2026-08-11T08:05', 1, nomor);
    daftarPengajuan.push(p);
  }

  // #2 PLB3/2026/0002 -> WAIT_PIC (antrean PIC, perlu jadwal)
  {
    const nomor = 'PLB3/2026/0002';
    const header = { lokasi: 'Sukabumi', pelaksana: 'PT PLIB', diajukanOleh: 'Feri Aryanto', tanggalPengajuan: '2026-08-12', usulanTanggalBuang: '' };
    const items = [buatItem('produksi', 'OC3', 'B104d'), buatItem('produksi', 'OC3', 'B110d'), buatItem('produksi', 'GBL', 'A108d')];
    let p = jalan(null, { tipe: 'SUBMIT', oleh: PENGGUNA.USER, isi: { header, items, lainnya: '', lainnyaAktif: false } }, '2026-08-12T09:20', 2, nomor);
    p = jalan(p, { tipe: 'SUP_APPROVE', oleh: PENGGUNA.SUPERVISOR }, '2026-08-12T13:05', 2, nomor);
    daftarPengajuan.push(p);
  }

  // #3 PLB3/2026/0003 -> WAIT_SUP (antrean Supervisor)
  {
    const nomor = 'PLB3/2026/0003';
    const header = { lokasi: 'Sukabumi', pelaksana: 'PT PLIB', diajukanOleh: 'Feri Aryanto', tanggalPengajuan: '2026-08-13', usulanTanggalBuang: '2026-08-18' };
    const items = [buatItem('qa', 'QA-LAB', 'A338-1'), buatItem('qa', 'QA-LAB', 'A338-3')];
    const lainnya = 'Drum bekas cat dari area workshop, belum ada kodenya.';
    const p = jalan(null, { tipe: 'SUBMIT', oleh: PENGGUNA.USER, isi: { header, items, lainnya, lainnyaAktif: true } }, '2026-08-13T07:45', 3, nomor);
    daftarPengajuan.push(p);
  }

  // #4 PLB3/2026/0004 -> REJ_SUP (perlu perbaikan User)
  {
    const nomor = 'PLB3/2026/0004';
    const header = { lokasi: 'Sukabumi', pelaksana: 'PT PLIB', diajukanOleh: 'Feri Aryanto', tanggalPengajuan: '2026-08-13', usulanTanggalBuang: '' };
    const items = [buatItem('office', 'OFFICE', 'B321-4'), buatItem('office', 'OFFICE', 'B353-1')];
    let p = jalan(null, { tipe: 'SUBMIT', oleh: PENGGUNA.USER, isi: { header, items, lainnya: '', lainnyaAktif: false } }, '2026-08-13T14:10', 4, nomor);
    p = jalan(
      p,
      { tipe: 'SUP_REJECT', oleh: PENGGUNA.SUPERVISOR, alasan: 'Jumlah toner bekas belum dipisahkan dari kemasan tinta. Mohon dipisah dan diajukan ulang.' },
      '2026-08-13T15:30',
      4,
      nomor,
    );
    daftarPengajuan.push(p);
  }

  return { pengajuan: daftarPengajuan, notifikasi: daftarNotifikasi, nextId: 5, nextNomor: 5, nextNotifId: notifId };
}
