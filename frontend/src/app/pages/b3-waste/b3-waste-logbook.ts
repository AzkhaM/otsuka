// Proyeksi Logbook & Neraca dari Pengajuan berstatus WEIGHED. MURNI - NOL impor Angular.
//
// P-1 (02-architecture.md #14): "Logbook & Neraca bukan input terpisah, melainkan
// proyeksi dari transaksi yang sama". Dilarang keras ada signal<LogbookEntry[]> atau
// signal<Neraca> di mana pun dalam folder b3-waste/ - satu-satunya pintu masuk data
// adalah bangunLogbook(pengajuan) yang dipanggil dari computed() di b3-waste.ts (18.1).
import { type IsiTimbang, type Pengajuan, terapkanTimbang } from './b3-waste-model';

/** Satu baris tabel Logbook = satu ItemLimbah dari satu Pengajuan berstatus WEIGHED.
 *  SEMUA field di bawah adalah TURUNAN - tidak ada satu pun yang diinput manual di sini
 *  (pemetaan lengkap: 02-architecture.md 15.2). */
export interface LogbookEntry {
  pengajuanId: number;
  nomorPengajuan: string;
  itemId: string;
  jenis: string;
  kode: string;
  tanggalMasuk: string;
  sumber: string;
  jumlahMasukKg: number;
  maksSimpan: string | null;
  petugasMasuk: string;
  tanggalKeluar: string;
  jumlahKeluarKg: number;
  tujuan: string;
  noManifest: string;
  sisaKg: number;
  petugasSisa: string;
}

/** Satu blok = satu "lembar" dokumen Logbook (satu jenis limbah, dikunci per `kode` - 15.3). */
export interface BlokLogbook {
  kode: string;
  jenis: string;
  entries: LogbookEntry[];
  totalMasukKg: number;
  totalKeluarKg: number;
  sisaKg: number;
}

export type KategoriPerlakuan =
  | 'DISIMPAN'
  | 'DIMANFAATKAN'
  | 'DIOLAH'
  | 'DITIMBUN'
  | 'DISERAHKAN PIHAK KE-3'
  | 'EKSPORT'
  | 'PERLAKUAN LAINNYA';

export interface NeracaBarisAwal {
  no: number;
  jenis: string;
  kode: string;
  jumlahTon: number;
  satuan: 'Ton';
  catatan: string;
}

export interface NeracaBarisPerlakuan {
  jenis: string;
  kode: string;
  jumlahTon: number;
  izinKlh: 'ADA' | '-';
}

export interface NeracaPerlakuan {
  kategori: KategoriPerlakuan;
  subLabel: string;
  jumlahTon: number;
  satuan: 'Ton';
  baris: NeracaBarisPerlakuan[]; // DIJAMIN panjang >= 1 (placeholder bila kosong)
}

export interface Neraca {
  periodeLabel: string;
  tanggalLaporan: string;
  bagianI: NeracaBarisAwal[];
  totalATon: number;
  perlakuan: NeracaPerlakuan[]; // SELALU 7 elemen, urutan tetap KATEGORI_PERLAKUAN
  totalBTon: number;
  residuCTon: number;
  belumTerkelolaDTon: number;
  totalCDTon: number;
  kinerjaPersen: number | null; // null -> render '-'
  totalAKg: number;
  totalBKg: number;
}

export const KATEGORI_PERLAKUAN: readonly KategoriPerlakuan[] = [
  'DISIMPAN',
  'DIMANFAATKAN',
  'DIOLAH',
  'DITIMBUN',
  'DISERAHKAN PIHAK KE-3',
  'EKSPORT',
  'PERLAKUAN LAINNYA',
];
export const PERLAKUAN_AKTIF: KategoriPerlakuan = 'DISERAHKAN PIHAK KE-3'; // P-3
export const KG_PER_TON = 1000;
export const BULAN: readonly string[] = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function bulatkan2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** kg -> Ton, 4 desimal (16.1). 173 kg -> 0.173 ; 120.5 kg -> 0.1205 */
export function keTon(kg: number): number {
  return Math.round((kg / KG_PER_TON) * 10000) / 10000;
}

/** 0.173 -> '0,1730' (selalu 4 desimal, koma - DILARANG DecimalPipe/Intl, 14.1) */
export function formatTon(ton: number): string {
  return ton.toFixed(4).replace('.', ',');
}

/** 173 -> '173' ; 120.5 -> '120,5' (maks 2 desimal, tanpa nol ekor, koma) */
export function formatKg(kg: number): string {
  return String(Math.round(kg * 100) / 100).replace('.', ',');
}

/** 100 -> '100,00' ; null -> '-' */
export function formatPersen(p: number | null): string {
  return p === null ? '-' : p.toFixed(2).replace('.', ',');
}

/** Proyeksi seluruh pengajuan -> baris logbook. Satu-satunya pintu lahirnya LogbookEntry. */
export function bangunLogbook(daftar: Pengajuan[]): LogbookEntry[] {
  const entries: LogbookEntry[] = [];
  for (const p of daftar) {
    if (p.status !== 'WEIGHED' || !p.penyerahan) continue;
    const pe = p.penyerahan;
    for (const it of p.items) {
      const beratKg = it.beratKg ?? 0; // tidak menyaring null - jalur preview & final tetap identik
      entries.push({
        pengajuanId: p.id,
        nomorPengajuan: p.nomor,
        itemId: it.id,
        jenis: it.jenis,
        kode: it.kode,
        tanggalMasuk: pe.tanggalTimbang,
        sumber: it.sumber,
        jumlahMasukKg: beratKg,
        maksSimpan: it.maksSimpan,
        petugasMasuk: pe.olehPic,
        tanggalKeluar: pe.tanggalBuang,
        jumlahKeluarKg: beratKg, // P-3: keluar = masuk (satu event timbang=penyerahan)
        tujuan: pe.tujuan,
        noManifest: pe.noManifest,
        sisaKg: 0, // P-3
        petugasSisa: pe.olehPic,
      });
    }
  }
  entries.sort((a, b) => {
    if (a.tanggalMasuk !== b.tanggalMasuk) return a.tanggalMasuk.localeCompare(b.tanggalMasuk);
    if (a.nomorPengajuan !== b.nomorPengajuan) return a.nomorPengajuan.localeCompare(b.nomorPengajuan);
    return a.itemId.localeCompare(b.itemId);
  });
  return entries;
}

/** Kunci blok = kode (bukan nama - 15.3): dua nama beda dengan kode sama (B107d) tergabung satu lembar. */
export function kelompokkanLogbook(entries: LogbookEntry[]): BlokLogbook[] {
  const map = new Map<string, LogbookEntry[]>();
  for (const e of entries) {
    const list = map.get(e.kode);
    if (list) list.push(e);
    else map.set(e.kode, [e]);
  }
  const blok: BlokLogbook[] = [];
  for (const [kode, list] of map) {
    const totalMasukKg = bulatkan2(list.reduce((s, e) => s + e.jumlahMasukKg, 0));
    const totalKeluarKg = bulatkan2(list.reduce((s, e) => s + e.jumlahKeluarKg, 0));
    blok.push({
      kode,
      jenis: list[0].jenis,
      entries: list,
      totalMasukKg,
      totalKeluarKg,
      sisaKg: bulatkan2(totalMasukKg - totalKeluarKg),
    });
  }
  blok.sort((a, b) => a.kode.localeCompare(b.kode));
  return blok;
}

/** Amandemen 3 #2/#3: gabungkan seluruh blok jadi SATU daftar baris flat terurut (urutan
 *  pengelompokan per-kode dari kelompokkanLogbook() dipertahankan), lalu pecah per `kapasitas`
 *  baris jadi "halaman" render. Murni - kembalikan data ASLI tanpa baris kosong; padding baris
 *  kosong sampai genap `kapasitas` adalah urusan template (b3-dokumen.html), bukan fungsi ini. */
export function halamanLogbook(blok: BlokLogbook[], kapasitas = 20): LogbookEntry[][] {
  const flat = blok.flatMap((b) => b.entries);
  if (flat.length === 0) return [];
  const halaman: LogbookEntry[][] = [];
  for (let i = 0; i < flat.length; i += kapasitas) {
    halaman.push(flat.slice(i, i + kapasitas));
  }
  return halaman;
}

export function hitungNeraca(entries: LogbookEntry[]): Neraca {
  const agregat = new Map<string, { jenis: string; kode: string; kg: number; manifest: string[] }>();
  for (const e of entries) {
    let a = agregat.get(e.kode);
    if (!a) {
      a = { jenis: e.jenis, kode: e.kode, kg: 0, manifest: [] };
      agregat.set(e.kode, a);
    }
    a.kg += e.jumlahMasukKg;
    if (e.noManifest && !a.manifest.includes(e.noManifest)) a.manifest.push(e.noManifest);
  }
  const kodeUrut = [...agregat.keys()].sort((x, y) => x.localeCompare(y));

  const bagianI: NeracaBarisAwal[] = kodeUrut.map((kode, i) => {
    const a = agregat.get(kode)!;
    return { no: i + 1, jenis: a.jenis, kode: a.kode, jumlahTon: keTon(a.kg), satuan: 'Ton', catatan: a.manifest.join(', ') };
  });

  const totalAKg = [...agregat.values()].reduce((s, a) => s + a.kg, 0);
  const totalATon = keTon(totalAKg);

  const barisAktif: NeracaBarisPerlakuan[] = kodeUrut.map((kode) => {
    const a = agregat.get(kode)!;
    return { jenis: a.jenis, kode: a.kode, jumlahTon: keTon(a.kg), izinKlh: 'ADA' as const };
  });
  const placeholder: NeracaBarisPerlakuan = { jenis: '-', kode: '', jumlahTon: 0, izinKlh: '-' };

  const perlakuan: NeracaPerlakuan[] = KATEGORI_PERLAKUAN.map((kategori) => {
    const aktif = kategori === PERLAKUAN_AKTIF;
    return {
      kategori,
      subLabel: kategori === 'PERLAKUAN LAINNYA' ? '(KEMBALI KE SUPLIER)' : '',
      jumlahTon: aktif ? totalATon : 0,
      satuan: 'Ton' as const,
      baris: aktif && barisAktif.length ? barisAktif : [placeholder],
    };
  });

  const totalBKg = totalAKg; // P-3: seluruh baris masuk satu kategori perlakuan
  const totalBTon = keTon(totalBKg);
  // Kinerja dari kg (16.2) - bukan dari Ton yang sudah dibulatkan, supaya A=B selalu tepat 100.
  const kinerjaPersen = totalAKg === 0 ? null : Math.round((totalBKg / totalAKg) * 100 * 100) / 100;

  let periodeLabel = 'Periode Berjalan';
  let tanggalLaporan = '';
  if (entries.length > 0) {
    const tglMasukUrut = entries.map((e) => e.tanggalMasuk).sort();
    const tglKeluarUrut = entries.map((e) => e.tanggalKeluar).sort();
    tanggalLaporan = tglKeluarUrut[tglKeluarUrut.length - 1];
    const t1 = tglMasukUrut[0];
    const t2 = tglMasukUrut[tglMasukUrut.length - 1];
    const [y1, m1] = t1.split('-').map(Number);
    const [y2, m2] = t2.split('-').map(Number);
    if (y1 === y2 && m1 === m2) periodeLabel = `${BULAN[m1 - 1]} ${y1}`;
    else if (y1 === y2) periodeLabel = `${BULAN[m1 - 1]} - ${BULAN[m2 - 1]} ${y1}`;
    else periodeLabel = `${BULAN[m1 - 1]} ${y1} - ${BULAN[m2 - 1]} ${y2}`;
  }

  return {
    periodeLabel,
    tanggalLaporan,
    bagianI,
    totalATon,
    perlakuan,
    totalBTon,
    residuCTon: 0,
    belumTerkelolaDTon: 0,
    totalCDTon: 0,
    kinerjaPersen,
    totalAKg,
    totalBKg,
  };
}

/** Draft "seandainya divalidasi sekarang" untuk preview Tahap 4 (18.3). Objek BARU,
 *  tidak memutasi `p`, tidak pernah disimpan ke state - hanya argumen bangunLogbook([draft]). */
export function pratinjauPengajuan(p: Pengajuan, isi: IsiTimbang, olehPic: string): Pengajuan {
  return {
    ...p,
    status: 'WEIGHED',
    items: terapkanTimbang(p.items, isi),
    penyerahan: {
      tanggalTimbang: isi.tanggalTimbang,
      tanggalBuang: isi.tanggalBuang,
      tujuan: isi.tujuan,
      noManifest: isi.noManifest,
      olehPic,
      divalidasi: true,
    },
  };
}
