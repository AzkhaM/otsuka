// Unit test QA (opsional, ranah QA - lihat 02-architecture.md bagian 10 & 11).
// Sasaran: hanya logika murni (masaSimpanHari, tambahHari, validasi*, jalankanAksi).
// Gaya ponytail: assertion & runner bawaan Vitest, tanpa helper/fixture berlebih.
import { describe, expect, it } from 'vitest';
import {
  type IsiPengajuan,
  type IsiTimbang,
  type Konteks,
  type Pengguna,
  formatTanggal,
  jalankanAksi,
  masaSimpanHari,
  tambahHari,
  validasiAlasan,
  validasiIsiPengajuan,
  validasiJadwal,
  validasiTimbang,
} from './b3-waste-model';

const USER: Pengguna = { peran: 'USER', nama: 'Feri Aryanto', email: 'feri@aio.co.id', jabatan: 'User' };
const SUPERVISOR: Pengguna = { peran: 'SUPERVISOR', nama: 'Andi Nugroho', email: 'andi@aio.co.id', jabatan: 'Supervisor' };
const PIC: Pengguna = { peran: 'PIC', nama: 'Pak Ruli', email: 'ruli@aio.co.id', jabatan: 'PIC' };
const PENGGUNA = { USER, SUPERVISOR, PIC };

function konteks(id: number, waktu: string): Konteks {
  return { waktu, id, nomor: `PLB3/2026/000${id}`, notifIdAwal: 1, pengguna: PENGGUNA };
}

function isiValid(): IsiPengajuan {
  return {
    header: { lokasi: 'Sukabumi', pelaksana: 'PT PLIB', diajukanOleh: 'Feri Aryanto', tanggalPengajuan: '2026-08-10', usulanTanggalBuang: '' },
    items: [{ id: 'engineering-ENG-A102d', departemenId: 'engineering', departemen: 'Engineering', sumber: 'ENG', jenis: 'Aki', kode: 'A102d', masaSimpanHari: 185, beratKg: null, maksSimpan: null }],
    lainnya: '',
    lainnyaAktif: false,
  };
}

// --- 5.3 Aturan hitung & format ---

describe('masaSimpanHari', () => {
  it('kode diawali A -> 185', () => expect(masaSimpanHari('A102d')).toBe(185));
  it('kode diawali B -> 365', () => expect(masaSimpanHari('B105d')).toBe(365));
});

describe('tambahHari (basis QA, tanggal timbang 2026-08-15)', () => {
  it('A102d: +185 hari -> 2027-02-16', () => expect(tambahHari('2026-08-15', 185)).toBe('2027-02-16'));
  it('B105d: +365 hari -> 2027-08-15', () => expect(tambahHari('2026-08-15', 365)).toBe('2027-08-15'));
});

describe('formatTanggal', () => {
  it('YYYY-MM-DD -> DD/MM/YYYY', () => expect(formatTanggal('2026-08-14')).toBe('14/08/2026'));
  it('kosong -> "-"', () => expect(formatTanggal('')).toBe('-'));
});

// --- 5.2 Validasi (string persis) ---

describe('validasiIsiPengajuan', () => {
  it('header kosong menghasilkan pesan persis kontrak', () => {
    const isi = isiValid();
    isi.header = { ...isi.header, lokasi: '', pelaksana: '', diajukanOleh: '', tanggalPengajuan: '' };
    isi.items = [];
    expect(validasiIsiPengajuan(isi)).toEqual([
      'Lokasi wajib diisi.',
      'Pelaksana/pengangkut wajib diisi.',
      'Diajukan oleh wajib diisi.',
      'Tanggal pengajuan wajib diisi.',
      'Pilih minimal satu jenis sampah.',
    ]);
  });

  it('items kosong -> "Pilih minimal satu jenis sampah."', () => {
    const isi = { ...isiValid(), items: [] };
    expect(validasiIsiPengajuan(isi)).toContain('Pilih minimal satu jenis sampah.');
  });

  it('Lainnya dicentang tapi kosong -> ditolak, dan Lainnya saja TIDAK cukup memenuhi item', () => {
    const isi: IsiPengajuan = { ...isiValid(), items: [], lainnyaAktif: true, lainnya: '   ' };
    const errors = validasiIsiPengajuan(isi);
    expect(errors).toContain('Keterangan "Lainnya" wajib diisi bila kartunya dicentang.');
    expect(errors).toContain('Pilih minimal satu jenis sampah.');
  });

  it('valid -> tanpa error', () => expect(validasiIsiPengajuan(isiValid())).toEqual([]));
});

describe('validasiAlasan', () => {
  it('kosong -> ditolak', () => expect(validasiAlasan('')).toEqual(['Alasan penolakan wajib diisi.']));
  it('spasi saja -> ditolak', () => expect(validasiAlasan('   ')).toEqual(['Alasan penolakan wajib diisi.']));
  it('terisi -> lolos', () => expect(validasiAlasan('TPS penuh.')).toEqual([]));
});

describe('validasiJadwal', () => {
  it('tanggal & jam kosong -> dua pesan independen', () => {
    expect(validasiJadwal('', '')).toEqual(['Tanggal jadwal timbang wajib diisi.', 'Jam jadwal timbang wajib diisi.']);
  });
  it('hanya jam kosong -> satu pesan', () => expect(validasiJadwal('2026-08-20', '')).toEqual(['Jam jadwal timbang wajib diisi.']));
  it('hanya tanggal kosong -> satu pesan', () => expect(validasiJadwal('', '10:00')).toEqual(['Tanggal jadwal timbang wajib diisi.']));
  it('keduanya terisi -> lolos', () => expect(validasiJadwal('2026-08-20', '10:00')).toEqual([]));
});

describe('validasiTimbang', () => {
  const items = isiValid().items;
  const isiDasar: IsiTimbang = { berat: { [items[0].id]: 10 }, tanggalTimbang: '2026-08-15', tanggalBuang: '2026-08-15', tujuan: 'PT PLIB', noManifest: 'MNF-001', pernyataan: true };

  it('berat kosong/<=0 -> ditolak', () => {
    expect(validasiTimbang(items, { ...isiDasar, berat: { [items[0].id]: null } })).toContain('Berat setiap item wajib diisi dan lebih besar dari 0 kg.');
    expect(validasiTimbang(items, { ...isiDasar, berat: { [items[0].id]: 0 } })).toContain('Berat setiap item wajib diisi dan lebih besar dari 0 kg.');
  });
  it('tujuan kosong -> ditolak', () => expect(validasiTimbang(items, { ...isiDasar, tujuan: '' })).toContain('Tujuan penyerahan wajib diisi.'));
  it('nomor manifest kosong -> ditolak', () => expect(validasiTimbang(items, { ...isiDasar, noManifest: '' })).toContain('Nomor manifest wajib diisi.'));
  it('pernyataan belum dicentang -> ditolak', () => expect(validasiTimbang(items, { ...isiDasar, pernyataan: false })).toContain('Centang pernyataan validasi PIC.'));
  it('semua valid -> lolos', () => expect(validasiTimbang(items, isiDasar)).toEqual([]));
});

// --- 3.2 State machine: transisi sah (T1-T7) ---

describe('jalankanAksi - transisi sah T1-T7', () => {
  it('T1 SUBMIT: null -> WAIT_SUP, 2 notifikasi', () => {
    const hasil = jalankanAksi(null, { tipe: 'SUBMIT', oleh: USER, isi: isiValid() }, konteks(1, '2026-08-10T08:00'));
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.pengajuan.status).toBe('WAIT_SUP');
    expect(hasil.notifikasi).toHaveLength(2);
  });

  it('T3 SUP_APPROVE: WAIT_SUP -> WAIT_PIC, 2 notifikasi', () => {
    const submit = jalankanAksi(null, { tipe: 'SUBMIT', oleh: USER, isi: isiValid() }, konteks(1, '2026-08-10T08:00'));
    if (!submit.ok) throw new Error('setup gagal');
    const hasil = jalankanAksi(submit.pengajuan, { tipe: 'SUP_APPROVE', oleh: SUPERVISOR }, konteks(1, '2026-08-10T09:00'));
    expect(hasil.ok).toBe(true);
    if (hasil.ok) {
      expect(hasil.pengajuan.status).toBe('WAIT_PIC');
      expect(hasil.notifikasi).toHaveLength(2);
    }
  });

  it('T4 SUP_REJECT (alasan terisi): WAIT_SUP -> REJ_SUP, 1 notifikasi memuat alasan', () => {
    const submit = jalankanAksi(null, { tipe: 'SUBMIT', oleh: USER, isi: isiValid() }, konteks(1, '2026-08-10T08:00'));
    if (!submit.ok) throw new Error('setup gagal');
    const hasil = jalankanAksi(submit.pengajuan, { tipe: 'SUP_REJECT', oleh: SUPERVISOR, alasan: 'Kode aki belum sesuai manifest.' }, konteks(1, '2026-08-10T09:00'));
    expect(hasil.ok).toBe(true);
    if (hasil.ok) {
      expect(hasil.pengajuan.status).toBe('REJ_SUP');
      expect(hasil.notifikasi).toHaveLength(1);
      expect(hasil.notifikasi[0].isi).toContain('Kode aki belum sesuai manifest.');
    }
  });

  it('T2 RESUBMIT: REJ_SUP -> WAIT_SUP, riwayat lama tetap ada', () => {
    const submit = jalankanAksi(null, { tipe: 'SUBMIT', oleh: USER, isi: isiValid() }, konteks(1, '2026-08-10T08:00'));
    if (!submit.ok) throw new Error('setup gagal');
    const reject = jalankanAksi(submit.pengajuan, { tipe: 'SUP_REJECT', oleh: SUPERVISOR, alasan: 'Perbaiki dulu.' }, konteks(1, '2026-08-10T09:00'));
    if (!reject.ok) throw new Error('setup gagal');
    const hasil = jalankanAksi(reject.pengajuan, { tipe: 'RESUBMIT', oleh: USER, isi: isiValid() }, konteks(1, '2026-08-11T08:00'));
    expect(hasil.ok).toBe(true);
    if (hasil.ok) {
      expect(hasil.pengajuan.status).toBe('WAIT_SUP');
      expect(hasil.pengajuan.riwayat.some((r) => r.aksi === 'SUP_REJECT')).toBe(true);
      expect(hasil.pengajuan.riwayat.some((r) => r.aksi === 'RESUBMIT')).toBe(true);
    }
  });

  function sampaiWaitPic() {
    const submit = jalankanAksi(null, { tipe: 'SUBMIT', oleh: USER, isi: isiValid() }, konteks(1, '2026-08-10T08:00'));
    if (!submit.ok) throw new Error('setup gagal');
    const approve = jalankanAksi(submit.pengajuan, { tipe: 'SUP_APPROVE', oleh: SUPERVISOR }, konteks(1, '2026-08-10T09:00'));
    if (!approve.ok) throw new Error('setup gagal');
    return approve.pengajuan;
  }

  it('T5 PIC_APPROVE (tanggal+jam terisi): WAIT_PIC -> APPROVED, 2 notifikasi memuat jadwal', () => {
    const p = sampaiWaitPic();
    const hasil = jalankanAksi(p, { tipe: 'PIC_APPROVE', oleh: PIC, tanggalJadwal: '2026-08-20', jamJadwal: '10:00' }, konteks(1, '2026-08-11T08:00'));
    expect(hasil.ok).toBe(true);
    if (hasil.ok) {
      expect(hasil.pengajuan.status).toBe('APPROVED');
      expect(hasil.notifikasi).toHaveLength(2);
      expect(hasil.notifikasi[0].isi).toContain('20/08/2026');
      expect(hasil.notifikasi[0].isi).toContain('10:00');
    }
  });

  it('T6 PIC_REJECT (alasan terisi): WAIT_PIC -> REJ_PIC, 2 notifikasi memuat alasan', () => {
    const p = sampaiWaitPic();
    const hasil = jalankanAksi(p, { tipe: 'PIC_REJECT', oleh: PIC, alasan: 'TPS penuh.' }, konteks(1, '2026-08-11T08:00'));
    expect(hasil.ok).toBe(true);
    if (hasil.ok) {
      expect(hasil.pengajuan.status).toBe('REJ_PIC');
      expect(hasil.notifikasi).toHaveLength(2);
      expect(hasil.notifikasi.every((n) => n.isi.includes('TPS penuh.'))).toBe(true);
    }
  });

  it('T7 PIC_WEIGH: APPROVED -> WEIGHED, maksSimpan terhitung dari tambahHari', () => {
    const p = sampaiWaitPic();
    const approved = jalankanAksi(p, { tipe: 'PIC_APPROVE', oleh: PIC, tanggalJadwal: '2026-08-20', jamJadwal: '10:00' }, konteks(1, '2026-08-11T08:00'));
    if (!approved.ok) throw new Error('setup gagal');
    const isiTimbang: IsiTimbang = {
      berat: { [approved.pengajuan.items[0].id]: 35 },
      tanggalTimbang: '2026-08-15',
      tanggalBuang: '2026-08-15',
      tujuan: 'PT PLIB',
      noManifest: 'MNF-2608-001',
      pernyataan: true,
    };
    const hasil = jalankanAksi(approved.pengajuan, { tipe: 'PIC_WEIGH', oleh: PIC, isi: isiTimbang }, konteks(1, '2026-08-15T08:00'));
    expect(hasil.ok).toBe(true);
    if (hasil.ok) {
      expect(hasil.pengajuan.status).toBe('WEIGHED');
      expect(hasil.pengajuan.items[0].maksSimpan).toBe('2027-02-16');
      expect(hasil.pengajuan.items[0].beratKg).toBe(35);
    }
  });
});

// --- 3.2 "Semua kombinasi lain ditolak" - guard peran+status (jaring pengaman kedua) ---

describe('jalankanAksi - transisi terlarang ditolak dengan E_GUARD', () => {
  const E_GUARD = 'Aksi tidak diizinkan untuk status atau peran saat ini.';

  it('SUBMIT oleh SUPERVISOR ditolak', () => {
    const hasil = jalankanAksi(null, { tipe: 'SUBMIT', oleh: SUPERVISOR, isi: isiValid() }, konteks(1, '2026-08-10T08:00'));
    expect(hasil).toEqual({ ok: false, errors: [E_GUARD] });
  });

  it('PIC_APPROVE saat status masih WAIT_SUP ditolak (guard reducer, bukan hanya guard UI)', () => {
    const submit = jalankanAksi(null, { tipe: 'SUBMIT', oleh: USER, isi: isiValid() }, konteks(1, '2026-08-10T08:00'));
    if (!submit.ok) throw new Error('setup gagal');
    const hasil = jalankanAksi(submit.pengajuan, { tipe: 'PIC_APPROVE', oleh: PIC, tanggalJadwal: '2026-08-20', jamJadwal: '10:00' }, konteks(1, '2026-08-10T09:00'));
    expect(hasil).toEqual({ ok: false, errors: [E_GUARD] });
  });

  it('SUP_APPROVE oleh peran USER ditolak (peran salah meski status benar)', () => {
    const submit = jalankanAksi(null, { tipe: 'SUBMIT', oleh: USER, isi: isiValid() }, konteks(1, '2026-08-10T08:00'));
    if (!submit.ok) throw new Error('setup gagal');
    const hasil = jalankanAksi(submit.pengajuan, { tipe: 'SUP_APPROVE', oleh: USER }, konteks(1, '2026-08-10T09:00'));
    expect(hasil).toEqual({ ok: false, errors: [E_GUARD] });
  });

  it('SUP_APPROVE dua kali (status sudah WAIT_PIC) ditolak', () => {
    const submit = jalankanAksi(null, { tipe: 'SUBMIT', oleh: USER, isi: isiValid() }, konteks(1, '2026-08-10T08:00'));
    if (!submit.ok) throw new Error('setup gagal');
    const approve = jalankanAksi(submit.pengajuan, { tipe: 'SUP_APPROVE', oleh: SUPERVISOR }, konteks(1, '2026-08-10T09:00'));
    if (!approve.ok) throw new Error('setup gagal');
    const hasil = jalankanAksi(approve.pengajuan, { tipe: 'SUP_APPROVE', oleh: SUPERVISOR }, konteks(1, '2026-08-10T10:00'));
    expect(hasil).toEqual({ ok: false, errors: [E_GUARD] });
  });

  it('RESUBMIT saat status WAIT_SUP (belum ditolak) ditolak', () => {
    const submit = jalankanAksi(null, { tipe: 'SUBMIT', oleh: USER, isi: isiValid() }, konteks(1, '2026-08-10T08:00'));
    if (!submit.ok) throw new Error('setup gagal');
    const hasil = jalankanAksi(submit.pengajuan, { tipe: 'RESUBMIT', oleh: USER, isi: isiValid() }, konteks(1, '2026-08-10T09:00'));
    expect(hasil).toEqual({ ok: false, errors: [E_GUARD] });
  });

  it('PIC_WEIGH saat status WEIGHED (terminal, tidak ada transisi keluar) ditolak', () => {
    const submit = jalankanAksi(null, { tipe: 'SUBMIT', oleh: USER, isi: isiValid() }, konteks(1, '2026-08-10T08:00'));
    if (!submit.ok) throw new Error('setup gagal');
    const approve1 = jalankanAksi(submit.pengajuan, { tipe: 'SUP_APPROVE', oleh: SUPERVISOR }, konteks(1, '2026-08-10T09:00'));
    if (!approve1.ok) throw new Error('setup gagal');
    const approve2 = jalankanAksi(approve1.pengajuan, { tipe: 'PIC_APPROVE', oleh: PIC, tanggalJadwal: '2026-08-20', jamJadwal: '10:00' }, konteks(1, '2026-08-11T08:00'));
    if (!approve2.ok) throw new Error('setup gagal');
    const isiTimbang: IsiTimbang = { berat: { [approve2.pengajuan.items[0].id]: 35 }, tanggalTimbang: '2026-08-15', tanggalBuang: '2026-08-15', tujuan: 'PT PLIB', noManifest: 'MNF-001', pernyataan: true };
    const weighed = jalankanAksi(approve2.pengajuan, { tipe: 'PIC_WEIGH', oleh: PIC, isi: isiTimbang }, konteks(1, '2026-08-15T08:00'));
    if (!weighed.ok) throw new Error('setup gagal');
    const hasil = jalankanAksi(weighed.pengajuan, { tipe: 'PIC_WEIGH', oleh: PIC, isi: isiTimbang }, konteks(1, '2026-08-16T08:00'));
    expect(hasil).toEqual({ ok: false, errors: [E_GUARD] });
  });

  it('SUP_REJECT tanpa alasan (WAIT_SUP, peran benar) ditolak dengan pesan validasi, bukan E_GUARD', () => {
    const submit = jalankanAksi(null, { tipe: 'SUBMIT', oleh: USER, isi: isiValid() }, konteks(1, '2026-08-10T08:00'));
    if (!submit.ok) throw new Error('setup gagal');
    const hasil = jalankanAksi(submit.pengajuan, { tipe: 'SUP_REJECT', oleh: SUPERVISOR, alasan: '   ' }, konteks(1, '2026-08-10T09:00'));
    expect(hasil).toEqual({ ok: false, errors: ['Alasan penolakan wajib diisi.'] });
  });
});
