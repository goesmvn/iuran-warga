export interface Resident {
    id: string;
    nomorRumah: string;
    namaKepalaKeluarga: string;
    noHp?: string;
    status: 'Aktif' | 'Pindah';
    tanggalMasuk: string; // ISO date string
}

export interface Category {
    id: string;
    name: string;
    type: 'Pemasukan' | 'Pengeluaran';
    periode?: 'Bulanan' | 'Tahunan' | 'Insidental'; // For Iuran Wajib
    waktuPenagihan?: 'Di Awal Periode' | 'Di Akhir Periode';
    tanggalMulaiPenagihan?: string; // ISO Date String
    mataUang?: string;
    defaultNominal?: number; // Optional default amount, useful for fixed dues like "Iuran Wajib"
    description?: string;
    showInPayment?: boolean;
}

export interface Transaction {
    id: string;
    date: string; // ISO date string
    categoryId: string;
    type: 'Pemasukan' | 'Pengeluaran';
    nominal: number;
    description: string;
    kasLocationId?: string; // If undefined, assume default Cash location
    // Fields specific to Pemasukan (Iuran Warga)
    residentId?: string;
    periodeBulan?: number; // 1-12
    periodeTahun?: number;
}

export interface User {
    id: string;
    username: string;
    password?: string;
    name: string;
    role: 'Admin' | 'Staff';
    token?: string; // JWT token returned after auth
}

export interface KasLocation {
    id: string;
    name: string;
    type: 'Tunai' | 'Bank' | 'E-Wallet';
    description?: string;
}

