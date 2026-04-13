const fs = require('fs');

const data = `1\tI Komang Adi Surya Darma\tI
2\tGusti Ngurah Rangga Putra\tI
3\tKomang Sudiarta\tI
4\tGusti Ngurah Rusdianto\tI
5\tKetut Darma\tI
6\tAgus Sanjaya (kontrak)\tI
7\t\tI
8\tNyoman Widiantara\tII
9\t\tII
10\tI Nyoman Widarsana\tII
11\tKadek Adi Sana\tII
12\tGede Yuda\tII
13\tPutu Tarim\tII
14\tIda Bagus Gede Hendra Wiratma\tII
15\t\tIII
16\tUmar Fadeli\tIII
17\tNengah Kertiasa\tIII
18\tWayan Wartana\tIII
19\tWayan Adi Wijaya\tIII
20\tAgus S Artawan\tIII
21\tGede Suryawan\tIII
22\tKadek Ujiana\tIII
23\tIda Bagus Kusuma Wijaya\tIV
24\tGede Arya --> Arie Satrya\tIV
25\t\tIV
26\tGede Astawa\tIV
27\tAnak Agung Adi Susila\tIV
28\tKetut Suardana\tV
29\tKetut Agus Susanta\tV
30\tIda Bagus Ary Indra Iswara\tGang Utama
31\tGede Susana\tV
32\tNyoman Dastra\tV
33\tKadek Wisnawa\tV
34\tNyoman Artawan\tV
35\tNengah Bingin\tV
36\tMade Prema\tV
37\tGusti Ngurah Mahaputra\tV
38\tWayan Sukarma / Alit Wahyu\tV
39\tBu Dewi\tV
40\tMade Sudarna\tV
41\tWayan Putrayasa\tVI
42\tKetut Pantes\tVI
43\tKomang Suradnya\tVI
44\tGede Sudarsa\tVII
45\tMade Suartika\tVIII
46\tNyoman Wirama\tVIII
47\tNyoman Rediawan\tGang Utama
48\tKawitono\tGang Utama
49\tI Made Kota\tGang Utama
50\tI Gst Agung Udayana\tGang Utama
51\tI Made Sudana\tGang Utama
52\tRahadi Utomo\tGang Utama
53\tKomang Pasek Sudiarsa\tGang Utama
54\tGede Wahyu Anggara\tGang Utama
55\tDewa Agung Pratama Wiweka\tGang Utama
56\tI Gede Wahyu Udiyana\tGang Utama
57\tMade Gunawan\tGang Utama
58\tWayan Supadmi\tIX
59\tAdi Santika\tIX
60\tI Gede Eka ananta\tIXA
61\tPutu Eka Putra Sedana\tIXA
62\tWayan Sika\tIXA
63\tI Made Selasa Darmadi\tIXA
64\tI Gede Suryawan\tX
65\tNengah Sudarma\tX
66\tI Komang Astawa\tX
67\tGede Suardana\tX
68\tWayan Suyadnya\tX
69\tKomang landung\tX
70\tKetut Wendra\tXA
71\tGuna Wijaya\tXA
72\tKetut Sudiarta\tXA
73\tI Nengah Cutra Guptha\tXA
74\tWayan Warsi\tXI
75\tI Komang Oka Atmaja\tXI
76\tWayan Suparta\tXI
77\tI wayan Pastika\tXI
78\tGede Dresta\tXI
79\tPutu Budiasa\tXI
80\tMade Sujendra\tXI
81\tPutu Dika\tXI
82\tWayan Dwipa\tXI
83\tNyoman Juliartha\tXI
84\tI Made Angga Wijaya\tXI
85\tPutu Eka wirawan\tXI
86\tNyoman Kartini --> no 120\tXII
87\tI Nyoman Wirata\tXII
88\tKetut Kandi\tXII
89\tKetut Arya Astawa\tXII
90\tGede Tirta\tXII
91\tI Kadek Agus Darmawan\tXII
92\tI Gede Edi Puspadana\tXII
93\tNengah Putra\tXII
94\tAnak Agung Ketut Parwata\tXII
95\tNengah Sarianta\tXII
96\tDewa Gede Adi Pramana\tXII
97\tMade Suanda\tXII
98\tKetut Puspayasa\tXII
99\tNengah kardasi\tXII
100\tI Ketut Agus Sucipta / Pak Pagi\tXII
101\tIda Bagus Widiantara\tXIV
102\tKetut Kasma\tXIV
103\tNengah Kariasa xiv-8\tXIV
104\tWayan Sukarta\tXIV
105\tI Made Sudiana\tXIV
106\tYudi Sudarianto\tXIV-A
107\tI Dewa Gde Galih Mahaputra\tXIV-A
108\tWayan Agus Yudip\tBlm Lnkp
109\tGede Adi Pratama P\tBlm Lnkp
110\tRudi\tGang Utama
111\tMade Alit Restiawan\tGang Utama
112\tMade Primajaya\tGang Utama
113\tAgus Darmadi\tGang Utama
114\tMade Darsana\tGang Utama
115\tPak Komang Yudi\tII
116\tPutu Wicaksana\tGang Utama
117\tI Gede Widiada\t
118\tNyoman Adi Juniarta\t
119\tNyoman Suardana (hanya Iuran Wajib 5rb)\t
120\tI Gede Adi Putra\tXII
121\tI Kadek Subagiartawan\tGang Utama
122\tI Kadek Suryadarma\t
123\tMade Yasa\tXIV
124\tWayan Agus Virgantara\tGang Utama
125\tPutu Arik\tIA
126\tWisnu\tGang Utama
127\tPak Wira\tVII
128\tI Kadek Suardika\tXIV-A
129\tWayan Paji\t
130\tCok\t
131\tPak Priyo AS\tIII
132\tPutu Diana\tV
133\tI Putu Indra Sudarta\tGang Utama
134\tNyoman Sarka\tXIV.A
135\tSurya Dwija Putra\t
136\tDewa Pejeng\t
137\tNyoman Widyanata\tV
138\t\t
139\tKadek Yuda\tGG. 
140\tPak Vito\tGG. 
141\tI Wayan Kari\tGG. 
142\tNanda Ega\tGG. 
143\tGede Satria Adi Darma\tGG. 
144\tIbu Suci\tGG. 
145\tKomang Widana\tGG. 
146\tI Putu Krisnanda\tGG. V
147\tI Ketut Adi Sanjaya\tGang Utama
148\tKomang Astika\tGG. XIV A`;

const rows = data.split('\n');
const parsed = [];

for (const row of rows) {
    const parts = row.split('\t');
    if (parts.length >= 2) {
        let idRaw = parts[0];
        let name = parts[1].trim();
        let gang = parts[2] ? parts[2].trim() : '';
        
        if (!name) continue; // skip empty names
        
        parsed.push({
            id: 'warga-seed-' + idRaw,
            namaKepalaKeluarga: name,
            nomorRumah: gang ? gang + " No. " + idRaw : "No. " + idRaw,
            status: 'Aktif',
            tanggalMasuk: '2025-01-01T00:00:00.000Z'
        });
    }
}

const outStr = "\nexport const DEFAULT_WARGA = " + JSON.stringify(parsed, null, 4) + ";\n";
fs.appendFileSync('./src/utils/constants.ts', outStr);
console.log("Appended " + parsed.length + " warga to constants.ts");
