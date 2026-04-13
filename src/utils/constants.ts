// Initial Data for Categories if none exist
import type { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
    {
        id: 'cat-iuran-wajib',
        name: 'Iuran Wajib Bulanan',
        type: 'Pemasukan',
        defaultNominal: 50000,
        description: 'Iuran pokok wajib bulanan warga'
    },
    {
        id: 'cat-iuran-sampah',
        name: 'Retribusi Sampah',
        type: 'Pemasukan',
        defaultNominal: 15000,
        description: 'Uang kebersihan bulanan'
    },
    {
        id: 'cat-iuran-jalan',
        name: 'Perawatan Jalan',
        type: 'Pemasukan',
        description: 'Iuran insidental perawatan aspal/jalan'
    },
    {
        id: 'cat-out-kegiatan',
        name: 'Kegiatan Bersama',
        type: 'Pengeluaran',
        description: 'Kegiatan 17an, Kerja Bakti, dll'
    },
    {
        id: 'cat-out-operasional',
        name: 'Operasional RT/RW',
        type: 'Pengeluaran',
        description: 'Listrik Posko, ATK, Mamin Rapat'
    }
];

export const DEFAULT_WARGA = [
    {
        "id": "warga-seed-1",
        "namaKepalaKeluarga": "I Komang Adi Surya Darma",
        "nomorRumah": "I No. 1",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-2",
        "namaKepalaKeluarga": "Gusti Ngurah Rangga Putra",
        "nomorRumah": "I No. 2",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-3",
        "namaKepalaKeluarga": "Komang Sudiarta",
        "nomorRumah": "I No. 3",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-4",
        "namaKepalaKeluarga": "Gusti Ngurah Rusdianto",
        "nomorRumah": "I No. 4",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-5",
        "namaKepalaKeluarga": "Ketut Darma",
        "nomorRumah": "I No. 5",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-6",
        "namaKepalaKeluarga": "Agus Sanjaya (kontrak)",
        "nomorRumah": "I No. 6",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-8",
        "namaKepalaKeluarga": "Nyoman Widiantara",
        "nomorRumah": "II No. 8",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-10",
        "namaKepalaKeluarga": "I Nyoman Widarsana",
        "nomorRumah": "II No. 10",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-11",
        "namaKepalaKeluarga": "Kadek Adi Sana",
        "nomorRumah": "II No. 11",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-12",
        "namaKepalaKeluarga": "Gede Yuda",
        "nomorRumah": "II No. 12",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-13",
        "namaKepalaKeluarga": "Putu Tarim",
        "nomorRumah": "II No. 13",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-14",
        "namaKepalaKeluarga": "Ida Bagus Gede Hendra Wiratma",
        "nomorRumah": "II No. 14",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-16",
        "namaKepalaKeluarga": "Umar Fadeli",
        "nomorRumah": "III No. 16",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-17",
        "namaKepalaKeluarga": "Nengah Kertiasa",
        "nomorRumah": "III No. 17",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-18",
        "namaKepalaKeluarga": "Wayan Wartana",
        "nomorRumah": "III No. 18",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-19",
        "namaKepalaKeluarga": "Wayan Adi Wijaya",
        "nomorRumah": "III No. 19",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-20",
        "namaKepalaKeluarga": "Agus S Artawan",
        "nomorRumah": "III No. 20",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-21",
        "namaKepalaKeluarga": "Gede Suryawan",
        "nomorRumah": "III No. 21",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-22",
        "namaKepalaKeluarga": "Kadek Ujiana",
        "nomorRumah": "III No. 22",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-23",
        "namaKepalaKeluarga": "Ida Bagus Kusuma Wijaya",
        "nomorRumah": "IV No. 23",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-24",
        "namaKepalaKeluarga": "Gede Arya --> Arie Satrya",
        "nomorRumah": "IV No. 24",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-26",
        "namaKepalaKeluarga": "Gede Astawa",
        "nomorRumah": "IV No. 26",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-27",
        "namaKepalaKeluarga": "Anak Agung Adi Susila",
        "nomorRumah": "IV No. 27",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-28",
        "namaKepalaKeluarga": "Ketut Suardana",
        "nomorRumah": "V No. 28",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-29",
        "namaKepalaKeluarga": "Ketut Agus Susanta",
        "nomorRumah": "V No. 29",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-30",
        "namaKepalaKeluarga": "Ida Bagus Ary Indra Iswara",
        "nomorRumah": "Gang Utama No. 30",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-31",
        "namaKepalaKeluarga": "Gede Susana",
        "nomorRumah": "V No. 31",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-32",
        "namaKepalaKeluarga": "Nyoman Dastra",
        "nomorRumah": "V No. 32",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-33",
        "namaKepalaKeluarga": "Kadek Wisnawa",
        "nomorRumah": "V No. 33",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-34",
        "namaKepalaKeluarga": "Nyoman Artawan",
        "nomorRumah": "V No. 34",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-35",
        "namaKepalaKeluarga": "Nengah Bingin",
        "nomorRumah": "V No. 35",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-36",
        "namaKepalaKeluarga": "Made Prema",
        "nomorRumah": "V No. 36",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-37",
        "namaKepalaKeluarga": "Gusti Ngurah Mahaputra",
        "nomorRumah": "V No. 37",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-38",
        "namaKepalaKeluarga": "Wayan Sukarma / Alit Wahyu",
        "nomorRumah": "V No. 38",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-39",
        "namaKepalaKeluarga": "Bu Dewi",
        "nomorRumah": "V No. 39",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-40",
        "namaKepalaKeluarga": "Made Sudarna",
        "nomorRumah": "V No. 40",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-41",
        "namaKepalaKeluarga": "Wayan Putrayasa",
        "nomorRumah": "VI No. 41",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-42",
        "namaKepalaKeluarga": "Ketut Pantes",
        "nomorRumah": "VI No. 42",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-43",
        "namaKepalaKeluarga": "Komang Suradnya",
        "nomorRumah": "VI No. 43",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-44",
        "namaKepalaKeluarga": "Gede Sudarsa",
        "nomorRumah": "VII No. 44",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-45",
        "namaKepalaKeluarga": "Made Suartika",
        "nomorRumah": "VIII No. 45",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-46",
        "namaKepalaKeluarga": "Nyoman Wirama",
        "nomorRumah": "VIII No. 46",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-47",
        "namaKepalaKeluarga": "Nyoman Rediawan",
        "nomorRumah": "Gang Utama No. 47",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-48",
        "namaKepalaKeluarga": "Kawitono",
        "nomorRumah": "Gang Utama No. 48",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-49",
        "namaKepalaKeluarga": "I Made Kota",
        "nomorRumah": "Gang Utama No. 49",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-50",
        "namaKepalaKeluarga": "I Gst Agung Udayana",
        "nomorRumah": "Gang Utama No. 50",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-51",
        "namaKepalaKeluarga": "I Made Sudana",
        "nomorRumah": "Gang Utama No. 51",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-52",
        "namaKepalaKeluarga": "Rahadi Utomo",
        "nomorRumah": "Gang Utama No. 52",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-53",
        "namaKepalaKeluarga": "Komang Pasek Sudiarsa",
        "nomorRumah": "Gang Utama No. 53",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-54",
        "namaKepalaKeluarga": "Gede Wahyu Anggara",
        "nomorRumah": "Gang Utama No. 54",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-55",
        "namaKepalaKeluarga": "Dewa Agung Pratama Wiweka",
        "nomorRumah": "Gang Utama No. 55",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-56",
        "namaKepalaKeluarga": "I Gede Wahyu Udiyana",
        "nomorRumah": "Gang Utama No. 56",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-57",
        "namaKepalaKeluarga": "Made Gunawan",
        "nomorRumah": "Gang Utama No. 57",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-58",
        "namaKepalaKeluarga": "Wayan Supadmi",
        "nomorRumah": "IX No. 58",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-59",
        "namaKepalaKeluarga": "Adi Santika",
        "nomorRumah": "IX No. 59",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-60",
        "namaKepalaKeluarga": "I Gede Eka ananta",
        "nomorRumah": "IXA No. 60",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-61",
        "namaKepalaKeluarga": "Putu Eka Putra Sedana",
        "nomorRumah": "IXA No. 61",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-62",
        "namaKepalaKeluarga": "Wayan Sika",
        "nomorRumah": "IXA No. 62",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-63",
        "namaKepalaKeluarga": "I Made Selasa Darmadi",
        "nomorRumah": "IXA No. 63",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-64",
        "namaKepalaKeluarga": "I Gede Suryawan",
        "nomorRumah": "X No. 64",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-65",
        "namaKepalaKeluarga": "Nengah Sudarma",
        "nomorRumah": "X No. 65",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-66",
        "namaKepalaKeluarga": "I Komang Astawa",
        "nomorRumah": "X No. 66",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-67",
        "namaKepalaKeluarga": "Gede Suardana",
        "nomorRumah": "X No. 67",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-68",
        "namaKepalaKeluarga": "Wayan Suyadnya",
        "nomorRumah": "X No. 68",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-69",
        "namaKepalaKeluarga": "Komang landung",
        "nomorRumah": "X No. 69",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-70",
        "namaKepalaKeluarga": "Ketut Wendra",
        "nomorRumah": "XA No. 70",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-71",
        "namaKepalaKeluarga": "Guna Wijaya",
        "nomorRumah": "XA No. 71",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-72",
        "namaKepalaKeluarga": "Ketut Sudiarta",
        "nomorRumah": "XA No. 72",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-73",
        "namaKepalaKeluarga": "I Nengah Cutra Guptha",
        "nomorRumah": "XA No. 73",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-74",
        "namaKepalaKeluarga": "Wayan Warsi",
        "nomorRumah": "XI No. 74",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-75",
        "namaKepalaKeluarga": "I Komang Oka Atmaja",
        "nomorRumah": "XI No. 75",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-76",
        "namaKepalaKeluarga": "Wayan Suparta",
        "nomorRumah": "XI No. 76",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-77",
        "namaKepalaKeluarga": "I wayan Pastika",
        "nomorRumah": "XI No. 77",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-78",
        "namaKepalaKeluarga": "Gede Dresta",
        "nomorRumah": "XI No. 78",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-79",
        "namaKepalaKeluarga": "Putu Budiasa",
        "nomorRumah": "XI No. 79",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-80",
        "namaKepalaKeluarga": "Made Sujendra",
        "nomorRumah": "XI No. 80",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-81",
        "namaKepalaKeluarga": "Putu Dika",
        "nomorRumah": "XI No. 81",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-82",
        "namaKepalaKeluarga": "Wayan Dwipa",
        "nomorRumah": "XI No. 82",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-83",
        "namaKepalaKeluarga": "Nyoman Juliartha",
        "nomorRumah": "XI No. 83",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-84",
        "namaKepalaKeluarga": "I Made Angga Wijaya",
        "nomorRumah": "XI No. 84",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-85",
        "namaKepalaKeluarga": "Putu Eka wirawan",
        "nomorRumah": "XI No. 85",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-86",
        "namaKepalaKeluarga": "Nyoman Kartini --> no 120",
        "nomorRumah": "XII No. 86",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-87",
        "namaKepalaKeluarga": "I Nyoman Wirata",
        "nomorRumah": "XII No. 87",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-88",
        "namaKepalaKeluarga": "Ketut Kandi",
        "nomorRumah": "XII No. 88",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-89",
        "namaKepalaKeluarga": "Ketut Arya Astawa",
        "nomorRumah": "XII No. 89",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-90",
        "namaKepalaKeluarga": "Gede Tirta",
        "nomorRumah": "XII No. 90",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-91",
        "namaKepalaKeluarga": "I Kadek Agus Darmawan",
        "nomorRumah": "XII No. 91",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-92",
        "namaKepalaKeluarga": "I Gede Edi Puspadana",
        "nomorRumah": "XII No. 92",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-93",
        "namaKepalaKeluarga": "Nengah Putra",
        "nomorRumah": "XII No. 93",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-94",
        "namaKepalaKeluarga": "Anak Agung Ketut Parwata",
        "nomorRumah": "XII No. 94",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-95",
        "namaKepalaKeluarga": "Nengah Sarianta",
        "nomorRumah": "XII No. 95",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-96",
        "namaKepalaKeluarga": "Dewa Gede Adi Pramana",
        "nomorRumah": "XII No. 96",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-97",
        "namaKepalaKeluarga": "Made Suanda",
        "nomorRumah": "XII No. 97",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-98",
        "namaKepalaKeluarga": "Ketut Puspayasa",
        "nomorRumah": "XII No. 98",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-99",
        "namaKepalaKeluarga": "Nengah kardasi",
        "nomorRumah": "XII No. 99",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-100",
        "namaKepalaKeluarga": "I Ketut Agus Sucipta / Pak Pagi",
        "nomorRumah": "XII No. 100",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-101",
        "namaKepalaKeluarga": "Ida Bagus Widiantara",
        "nomorRumah": "XIV No. 101",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-102",
        "namaKepalaKeluarga": "Ketut Kasma",
        "nomorRumah": "XIV No. 102",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-103",
        "namaKepalaKeluarga": "Nengah Kariasa xiv-8",
        "nomorRumah": "XIV No. 103",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-104",
        "namaKepalaKeluarga": "Wayan Sukarta",
        "nomorRumah": "XIV No. 104",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-105",
        "namaKepalaKeluarga": "I Made Sudiana",
        "nomorRumah": "XIV No. 105",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-106",
        "namaKepalaKeluarga": "Yudi Sudarianto",
        "nomorRumah": "XIV-A No. 106",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-107",
        "namaKepalaKeluarga": "I Dewa Gde Galih Mahaputra",
        "nomorRumah": "XIV-A No. 107",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-108",
        "namaKepalaKeluarga": "Wayan Agus Yudip",
        "nomorRumah": "Blm Lnkp No. 108",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-109",
        "namaKepalaKeluarga": "Gede Adi Pratama P",
        "nomorRumah": "Blm Lnkp No. 109",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-110",
        "namaKepalaKeluarga": "Rudi",
        "nomorRumah": "Gang Utama No. 110",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-111",
        "namaKepalaKeluarga": "Made Alit Restiawan",
        "nomorRumah": "Gang Utama No. 111",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-112",
        "namaKepalaKeluarga": "Made Primajaya",
        "nomorRumah": "Gang Utama No. 112",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-113",
        "namaKepalaKeluarga": "Agus Darmadi",
        "nomorRumah": "Gang Utama No. 113",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-114",
        "namaKepalaKeluarga": "Made Darsana",
        "nomorRumah": "Gang Utama No. 114",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-115",
        "namaKepalaKeluarga": "Pak Komang Yudi",
        "nomorRumah": "II No. 115",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-116",
        "namaKepalaKeluarga": "Putu Wicaksana",
        "nomorRumah": "Gang Utama No. 116",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-117",
        "namaKepalaKeluarga": "I Gede Widiada",
        "nomorRumah": "No. 117",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-118",
        "namaKepalaKeluarga": "Nyoman Adi Juniarta",
        "nomorRumah": "No. 118",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-119",
        "namaKepalaKeluarga": "Nyoman Suardana (hanya Iuran Wajib 5rb)",
        "nomorRumah": "No. 119",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-120",
        "namaKepalaKeluarga": "I Gede Adi Putra",
        "nomorRumah": "XII No. 120",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-121",
        "namaKepalaKeluarga": "I Kadek Subagiartawan",
        "nomorRumah": "Gang Utama No. 121",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-122",
        "namaKepalaKeluarga": "I Kadek Suryadarma",
        "nomorRumah": "No. 122",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-123",
        "namaKepalaKeluarga": "Made Yasa",
        "nomorRumah": "XIV No. 123",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-124",
        "namaKepalaKeluarga": "Wayan Agus Virgantara",
        "nomorRumah": "Gang Utama No. 124",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-125",
        "namaKepalaKeluarga": "Putu Arik",
        "nomorRumah": "IA No. 125",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-126",
        "namaKepalaKeluarga": "Wisnu",
        "nomorRumah": "Gang Utama No. 126",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-127",
        "namaKepalaKeluarga": "Pak Wira",
        "nomorRumah": "VII No. 127",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-128",
        "namaKepalaKeluarga": "I Kadek Suardika",
        "nomorRumah": "XIV-A No. 128",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-129",
        "namaKepalaKeluarga": "Wayan Paji",
        "nomorRumah": "No. 129",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-130",
        "namaKepalaKeluarga": "Cok",
        "nomorRumah": "No. 130",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-131",
        "namaKepalaKeluarga": "Pak Priyo AS",
        "nomorRumah": "III No. 131",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-132",
        "namaKepalaKeluarga": "Putu Diana",
        "nomorRumah": "V No. 132",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-133",
        "namaKepalaKeluarga": "I Putu Indra Sudarta",
        "nomorRumah": "Gang Utama No. 133",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-134",
        "namaKepalaKeluarga": "Nyoman Sarka",
        "nomorRumah": "XIV.A No. 134",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-135",
        "namaKepalaKeluarga": "Surya Dwija Putra",
        "nomorRumah": "No. 135",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-136",
        "namaKepalaKeluarga": "Dewa Pejeng",
        "nomorRumah": "No. 136",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-137",
        "namaKepalaKeluarga": "Nyoman Widyanata",
        "nomorRumah": "V No. 137",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-139",
        "namaKepalaKeluarga": "Kadek Yuda",
        "nomorRumah": "GG. No. 139",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-140",
        "namaKepalaKeluarga": "Pak Vito",
        "nomorRumah": "GG. No. 140",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-141",
        "namaKepalaKeluarga": "I Wayan Kari",
        "nomorRumah": "GG. No. 141",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-142",
        "namaKepalaKeluarga": "Nanda Ega",
        "nomorRumah": "GG. No. 142",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-143",
        "namaKepalaKeluarga": "Gede Satria Adi Darma",
        "nomorRumah": "GG. No. 143",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-144",
        "namaKepalaKeluarga": "Ibu Suci",
        "nomorRumah": "GG. No. 144",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-145",
        "namaKepalaKeluarga": "Komang Widana",
        "nomorRumah": "GG. No. 145",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-146",
        "namaKepalaKeluarga": "I Putu Krisnanda",
        "nomorRumah": "GG. V No. 146",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-147",
        "namaKepalaKeluarga": "I Ketut Adi Sanjaya",
        "nomorRumah": "Gang Utama No. 147",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    },
    {
        "id": "warga-seed-148",
        "namaKepalaKeluarga": "Komang Astika",
        "nomorRumah": "GG. XIV A No. 148",
        "status": "Aktif",
        "tanggalMasuk": "2025-01-01T00:00:00.000Z"
    }
];
