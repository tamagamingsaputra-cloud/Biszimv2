// Parameter simulasi, bukan data institusi atau kurikulum resmi.
const RULES={version:'EDU-1.0',termDays:28,studyDays:20,midDay:7,finalDay:18,minAttendance:75,minTasks:70,pass:65,studySeconds:12,examSeconds:600,maxStudyHours:3,guardianPerTerm:500000,weights:{exam:0.50,tasks:0.25,mastery:0.15,attendance:0.10}};
const institutions=[
{id:'sd-negeri',name:'SD Negeri Harapan',stage:'SD',city:'Pacitan',type:'Negeri',quality:76,tag:'Jalur awal terjangkau',programs:['Umum'],fees:{registration:0,entry:0,tuition:0,books:120000,transport:60000,exam:0,practicum:0},aid:1},
{id:'sd-cendekia',name:'SD Cendekia Nusantara',stage:'SD',city:'Pacitan',type:'Swasta',quality:88,tag:'Kelas kecil & perpustakaan',programs:['Umum'],fees:{registration:150000,entry:1500000,tuition:900000,books:250000,transport:120000,exam:50000,practicum:0},aid:0.5},
{id:'smp-negeri',name:'SMP Negeri Tunas Bangsa',stage:'SMP',city:'Pacitan',type:'Negeri',quality:78,tag:'Akademik & eksplorasi',programs:['Umum'],fees:{registration:0,entry:0,tuition:0,books:180000,transport:90000,exam:25000,practicum:30000},aid:1},
{id:'smp-insan',name:'SMP Insan Mandiri',stage:'SMP',city:'Malang',type:'Swasta',quality:89,tag:'Pendampingan belajar',programs:['Umum'],fees:{registration:200000,entry:2000000,tuition:1200000,books:300000,transport:150000,exam:75000,practicum:50000},aid:0.5},
{id:'sma-negeri',name:'SMA Negeri Puspa',stage:'SMA',city:'Pacitan',type:'Negeri',quality:80,tag:'Persiapan akademik',programs:['Sains','Sosial'],fees:{registration:50000,entry:0,tuition:300000,books:220000,transport:100000,exam:50000,practicum:50000},aid:1},
{id:'smk-bina',name:'SMK Bina Karya',stage:'SMK',city:'Pacitan',type:'Kejuruan',quality:81,tag:'Keterampilan & jalur magang',programs:['Rekayasa Perangkat Lunak','Akuntansi','Teknik Otomotif'],fees:{registration:75000,entry:200000,tuition:450000,books:200000,transport:100000,exam:75000,practicum:200000},aid:0.75},
{id:'sma-mandiri',name:'SMA Mandiri Cendekia',stage:'SMA',city:'Malang',type:'Swasta',quality:91,tag:'Riset & persiapan kampus',programs:['Sains','Sosial'],fees:{registration:250000,entry:3000000,tuition:1800000,books:350000,transport:160000,exam:100000,practicum:120000},aid:0.5},
{id:'politeknik',name:'Politeknik BizSim',stage:'PT',city:'Malang',type:'Diploma',quality:82,degree:'D3',semesters:6,tag:'Terapan · 6 semester',programs:['Teknologi Informasi','Akuntansi Terapan'],fees:{registration:200000,entry:1000000,tuition:2500000,books:300000,transport:180000,exam:100000,practicum:250000},aid:0.75},
{id:'universitas',name:'Universitas Nusantara Simulasi',stage:'PT',city:'Sleman',type:'Sarjana',quality:87,degree:'S1',semesters:8,tag:'Sarjana · 8 semester',programs:['Informatika','Manajemen','Akuntansi'],fees:{registration:300000,entry:2000000,tuition:3500000,books:400000,transport:200000,exam:150000,practicum:300000},aid:0.75}
];
const feeLabels={registration:'Pendaftaran',entry:'Uang pangkal',tuition:'SPP / semester',books:'Buku & perlengkapan',transport:'Transportasi periode',exam:'Biaya ujian',practicum:'Praktikum'};
function hash(seed,...keys){let h=2166136261;for(const c of [seed,...keys].join('|')){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967296;}
function subjects(stage,grade,program,semester){
 const basic= stage==='SD' ? [{id:'math',name:'Matematika',skill:'keuangan',label:grade<3?'Bilangan & operasi dasar':grade<5?'Perkalian & pembagian':'Pecahan & persen'},{id:'indo',name:'Bahasa Indonesia',skill:'komunikasi',label:grade<3?'Kata & kalimat sederhana':grade<5?'Membaca & memahami teks':'Teks informasi & simpulan'},{id:'science',name:grade<4?'Lingkungan Sekitar':'IPAS',skill:'teknologi',label:grade<4?'Kebiasaan sehat & lingkungan':'Makhluk hidup & energi'}] : stage==='SMP' ? [{id:'math',name:'Matematika',skill:'keuangan',label:'Aljabar & perbandingan'},{id:'indo',name:'Bahasa Indonesia',skill:'komunikasi',label:'Teks & informasi'},{id:'science',name:'IPA',skill:'teknologi',label:'Sistem kehidupan & energi'}] : stage==='PT' ? [{id:'quant',name:'Metode Kuantitatif',skill:'keuangan',label:grade<3?'Statistika dasar':'Analisis data & probabilitas'},{id:'writing',name:'Komunikasi Akademik',skill:'komunikasi',label:grade<3?'Argumen & sumber informasi':'Etika penelitian & evaluasi bukti'},{id:'major',name:program,skill:/Informat|Teknologi/.test(program)?'teknologi':'keuangan',label:/Informat|Teknologi/.test(program)?(grade<3?'Algoritma & struktur data':'Basis data & kompleksitas'):(grade<3?'Persamaan akuntansi & biaya':'Analisis keuangan & keputusan')}] : [{id:'math',name:'Matematika',skill:'keuangan',label:'Fungsi, peluang & statistika'},{id:'indo',name:'Bahasa Indonesia',skill:'komunikasi',label:'Argumen & literasi informasi'},{id:'major',name:stage==='SMK'?program:(program==='Sosial'?'Ekonomi':'Sains Terapan'),skill:/Perangkat/.test(program)?'teknologi':program==='Teknik Otomotif'?'teknis':'keuangan',label:/Perangkat/.test(program)?'Logika pemrograman':program==='Teknik Otomotif'?'Keselamatan & sistem mesin':program==='Sains'?'Energi & metode ilmiah':'Biaya, produksi & pencatatan'}];
 return basic.map(s=>{ const items=bank(stage,grade,program,semester,s);
  return {...s,modules:[1,2,3].map((n)=>({id:`${s.id}-m${n}`,name:[`Dasar: ${s.label}`,`Penerapan: ${s.label}`,`Latihan terpadu: ${s.label}`][n-1],difficulty:n,minutes:60,body:lesson(stage,grade,s.id,program,n),
   points:[...new Set(items.filter(q=>q.module===`${s.id}-m${n}`).map(q=>q.explanation))].slice(0,4),bankSize:items.filter(q=>q.module===`${s.id}-m${n}`).length}))}; });
}
function lesson(stage,g,id,p,m){
 if(id==='math'&&stage==='SD'){if(g<=2)return 'Bilangan menunjukkan banyak benda. Penjumlahan menggabungkan dua kelompok: 3 + 2 = 5. Pengurangan mengambil sebagian benda: 5 − 2 = 3. Hitung satu per satu dan periksa kembali hasilmu.';if(g<=4)return 'Perkalian adalah penjumlahan berulang. Contoh: 4 × 3 = 12. Pembagian membagi sama banyak: 12 ÷ 3 = 4. Perkalian dan pembagian saling berhubungan.';return 'Pecahan a/b adalah a bagian dari b bagian sama besar. Setengah = 1/2 = 50%. Untuk mencari 25% dari 200, hitung 25/100 × 200 = 50. Samakan penyebut sebelum menjumlahkan pecahan.';}
 if(id==='math'&&stage==='SMP')return 'Persamaan menjaga keseimbangan dua ruas. Pada 2x + 4 = 10, kurangi kedua ruas dengan 4, lalu bagi dengan 2 sehingga x = 3. Perbandingan a:b menyatakan hubungan dua besaran. Substitusikan jawabanmu untuk memeriksa.';
 if(id==='math'||id==='quant')return g<3?'Rata-rata adalah jumlah semua nilai dibagi banyak data. Median adalah nilai tengah setelah data diurutkan. Peluang suatu kejadian = banyak hasil yang mendukung / banyak seluruh hasil yang sama mungkin. Korelasi tidak membuktikan sebab-akibat.':'Fungsi linear y = ax + b memiliki gradien a. Rata-rata = jumlah nilai / banyak data. Peluang = hasil yang mendukung / seluruh hasil. Dalam analisis data, sampel harus mewakili populasi; korelasi saja tidak membuktikan sebab-akibat.';
 if(id==='indo'||id==='writing'){if(stage==='SD'&&g<3)return 'Kalimat diawali huruf kapital dan diakhiri tanda baca. Kata benda menamai benda, orang, atau tempat. Kata kerja menunjukkan tindakan. Contoh: Rani membaca buku. Membaca adalah kata kerja.';if(stage==='SD')return 'Gagasan utama adalah pokok pembicaraan teks. Simpulan dirumuskan dari informasi yang ada, bukan dugaan baru. Kata tanya siapa untuk orang, di mana untuk tempat, dan mengapa untuk alasan.';return 'Argumen yang baik berisi klaim, bukti yang relevan, dan alasan yang menghubungkan keduanya. Bedakan fakta terverifikasi dengan opini. Parafrasa tetap membutuhkan penyebutan sumber. Korelasi tidak cukup untuk menyimpulkan sebab-akibat.';}
 if(id==='science'){if(stage==='SD'&&g<4)return 'Cuci tangan dengan sabun membantu menjaga kesehatan. Tanaman memerlukan air dan cahaya matahari. Sampah dipilah dan dibuang pada tempatnya. Mematikan lampu yang tidak dipakai menghemat energi.';return 'Tumbuhan membuat makanan melalui fotosintesis dengan bantuan cahaya, air, dan karbon dioksida. Akar menyerap air. Energi dapat berubah bentuk, misalnya energi listrik menjadi panas pada setrika. Uji ilmiah mengubah satu variabel agar pengaruhnya dapat diamati.';}
 if(/Perangkat|Informat|Teknologi/.test(p))return stage==='PT'&&g>=3?'Basis data relasional menyimpan data dalam tabel. Primary key mengidentifikasi baris secara unik. Transaksi yang atomik dijalankan seluruhnya atau dibatalkan seluruhnya. Parameterized query membantu mencegah injeksi SQL. Pencarian linear berkompleksitas O(n).':'Algoritma adalah urutan langkah untuk menyelesaikan masalah. Variabel menyimpan nilai. Percabangan memilih tindakan berdasarkan kondisi. Perulangan mengulang instruksi. Uji kasus membantu menemukan kesalahan; tidak membuktikan program bebas dari semua kesalahan.';
 if(/Otomotif/.test(p))return 'Utamakan keselamatan sebelum memperbaiki kendaraan: matikan mesin, gunakan alat pelindung, dan pastikan kendaraan stabil. Oli melumasi komponen untuk mengurangi gesekan. Sistem rem memperlambat kendaraan. Perawatan mengikuti jadwal dan spesifikasi, bukan tebakan.';
 if(p==='Sains')return 'Metode ilmiah menguji hipotesis dengan bukti. Variabel bebas sengaja diubah dan variabel terikat diamati. Energi tidak hilang, melainkan berubah bentuk. Percobaan memerlukan kelompok pembanding dan pengukuran yang konsisten.';
 return 'Persamaan dasar akuntansi adalah aset = liabilitas + ekuitas. Pendapatan dikurangi beban menghasilkan laba atau rugi. Biaya tetap tidak berubah ketika volume produksi berubah dalam rentang relevan. Laba tidak sama dengan saldo kas; transaksi harus dicatat dengan bukti.';
}
// Bank soal: setiap butir terikat ke jenjang, kelas/semester, mata pelajaran, materi (modul) dan tingkat kesulitan.
// Format butir: [modul 1–3, pertanyaan, opsi[], indeks benar, pembahasan]  · opsi ['Benar','Salah'] = soal benar/salah.
const T = ['Benar', 'Salah'];
const FACTS = {
 indoLow: [
  [1,'Mana kalimat dengan penulisan yang tepat?',['Rani membaca buku.','rani membaca buku','Rani membaca buku','rani membaca buku.'],0,'Kalimat diawali huruf kapital dan diakhiri tanda titik.'],
  [1,'Huruf pertama nama orang ditulis dengan …',['Huruf kapital','Huruf kecil','Angka','Tanda tanya'],0,'Nama orang selalu diawali huruf kapital.'],
  [1,'Kalimat tanya diakhiri tanda tanya (?).',T,0,'Tanda tanya dipakai di akhir kalimat tanya.'],
  [2,'Dalam “Budi makan nasi”, kata kerja adalah …',['makan','Budi','nasi','Budi makan'],0,'Makan menyatakan tindakan.'],
  [2,'Kata benda di antara pilihan ini adalah …',['buku','berlari','membaca','tidur'],0,'Buku menamai sebuah benda.'],
  [2,'“Melompat” adalah kata benda.',T,1,'Melompat menyatakan tindakan, jadi termasuk kata kerja.'],
  [3,'Susunan kata yang membentuk kalimat runtut adalah …',['Ibu memasak sayur di dapur.','Dapur sayur ibu di memasak.','Memasak di ibu sayur dapur.','Sayur dapur memasak ibu di.'],0,'Kalimat runtut: pelaku, tindakan, objek, keterangan.'],
  [3,'Lawan kata “besar” adalah …',['kecil','tinggi','luas','berat'],0,'Antonim besar adalah kecil.'],
  [3,'Persamaan kata “senang” adalah “gembira”.',T,0,'Senang dan gembira bermakna sama.']],
 indoHigh: [
  [1,'“Dina menyiram tanaman setiap pagi agar tidak layu.” Mengapa Dina menyiram tanaman?',['Agar tanaman tidak layu','Agar hujan turun','Karena tidak punya buku','Untuk membuat malam'],0,'Alasan tertulis langsung: agar tidak layu.'],
  [1,'Kata tanya untuk menanyakan tempat adalah …',['Di mana','Siapa','Mengapa','Berapa'],0,'Di mana digunakan untuk lokasi.'],
  [1,'Kata tanya “siapa” dipakai untuk menanyakan orang.',T,0,'Siapa menanyakan pelaku atau orang.'],
  [2,'Gagasan utama paragraf adalah …',['Pokok pembicaraan paragraf','Kalimat terpanjang','Kata pertama','Judul buku'],0,'Gagasan utama adalah inti yang dibahas.'],
  [2,'Kalimat yang memuat gagasan utama disebut …',['Kalimat utama','Kalimat tanya','Kalimat seru','Kalimat langsung'],0,'Kalimat utama memuat gagasan pokok.'],
  [2,'Gagasan utama selalu berada di kalimat terakhir.',T,1,'Gagasan utama bisa di awal, akhir, atau keduanya.'],
  [3,'Simpulan harus didasarkan pada …',['Informasi dalam teks','Dugaan tanpa bukti','Keinginan pembaca saja','Judul saja'],0,'Simpulan merangkum informasi yang didukung teks.'],
  [3,'Teks yang menjelaskan cara membuat sesuatu disebut teks …',['Prosedur','Puisi','Dongeng','Pantun'],0,'Teks prosedur berisi langkah-langkah.'],
  [3,'Fakta adalah informasi yang dapat dibuktikan kebenarannya.',T,0,'Fakta dapat diperiksa; opini adalah pendapat.']],
 indoUpper: [
  [1,'Argumen paling kuat didukung oleh …',['Bukti relevan yang dapat diperiksa','Opini paling populer','Kalimat paling panjang','Pengulangan klaim'],0,'Bukti relevan mendukung hubungan antara alasan dan klaim.'],
  [1,'Bagian argumen yang berisi pendapat yang dibela disebut …',['Klaim','Daftar pustaka','Judul','Lampiran'],0,'Klaim adalah posisi yang ingin dibuktikan.'],
  [1,'Opini adalah pernyataan yang selalu dapat dibuktikan dengan data.',T,1,'Opini adalah pandangan; fakta yang dapat dibuktikan.'],
  [2,'Saat memparafrasa tulisan orang lain, kita …',['Tetap mencantumkan sumber','Tidak perlu sumber','Mengaku sebagai karya sendiri','Hanya mengganti judul'],0,'Gagasan orang lain tetap perlu atribusi.'],
  [2,'Sumber informasi paling dapat dipercaya biasanya …',['Memiliki penulis, tanggal, dan rujukan jelas','Tanpa nama penulis','Hanya berupa potongan gambar','Dibagikan paling banyak'],0,'Kredibilitas dinilai dari kejelasan asal dan rujukan.'],
  [2,'Menyalin tulisan tanpa menyebut sumber termasuk plagiarisme.',T,0,'Plagiarisme adalah memakai karya orang lain tanpa atribusi.'],
  [3,'Dua variabel berkorelasi. Apakah ini membuktikan sebab-akibat?',['Tidak, perlu bukti tambahan','Ya, selalu','Ya, jika judulnya menarik','Ya, tanpa penelitian'],0,'Korelasi bisa terjadi karena variabel lain atau kebetulan.'],
  [3,'Kesalahan logika “semua orang melakukannya, jadi pasti benar” disebut …',['Argumentum ad populum','Silogisme sahih','Parafrasa','Hipotesis'],0,'Kepopuleran bukan bukti kebenaran.'],
  [3,'Kesimpulan yang baik boleh melampaui data tanpa menyebut keterbatasannya.',T,1,'Kesimpulan harus sesuai bukti dan menyebut keterbatasan.']],
 sciLow: [
  [1,'Sebelum makan, sebaiknya …',['Mencuci tangan dengan sabun','Bermain lumpur','Membuang makanan','Memegang sampah'],0,'Cuci tangan membantu menjaga kebersihan.'],
  [1,'Gigi sebaiknya disikat minimal …',['Dua kali sehari','Sebulan sekali','Seminggu sekali','Tidak perlu'],0,'Menyikat gigi pagi dan malam menjaga kesehatan gigi.'],
  [1,'Tidur cukup membantu tubuh tetap sehat.',T,0,'Istirahat cukup membantu pertumbuhan dan konsentrasi.'],
  [2,'Tanaman memerlukan …',['Air dan cahaya','Plastik dan cat','Bensin','Minyak goreng'],0,'Air dan cahaya membantu tanaman hidup.'],
  [2,'Hewan yang hidup di air dan bernapas dengan insang adalah …',['Ikan','Kucing','Ayam','Sapi'],0,'Ikan bernapas dengan insang.'],
  [2,'Tanaman dapat tumbuh baik tanpa air sama sekali.',T,1,'Tanaman membutuhkan air.'],
  [3,'Lampu yang tidak digunakan sebaiknya …',['Dimatikan','Dinyalakan terus','Dirusak','Dibuang'],0,'Mematikan lampu menghemat energi.'],
  [3,'Sampah plastik sebaiknya …',['Dipilah dan didaur ulang','Dibuang ke sungai','Dibakar di kelas','Ditimbun di halaman sekolah'],0,'Memilah sampah memudahkan daur ulang.'],
  [3,'Membuang sampah ke sungai dapat menyebabkan banjir.',T,0,'Sampah menyumbat aliran air.']],
 sciHigh: [
  [1,'Bagian tumbuhan yang menyerap air adalah …',['Akar','Bunga','Buah','Biji'],0,'Akar menyerap air dari tanah.'],
  [1,'Fungsi daun yang utama adalah …',['Tempat fotosintesis','Menyerap air tanah','Menyimpan biji','Menarik serangga saja'],0,'Daun mengandung klorofil untuk fotosintesis.'],
  [1,'Batang membantu mengangkut air dari akar ke daun.',T,0,'Batang memiliki jaringan pengangkut.'],
  [2,'Fotosintesis memerlukan …',['Cahaya, air, dan karbon dioksida','Bensin','Plastik','Hanya tanah'],0,'Tumbuhan menggunakan cahaya untuk membuat makanan.'],
  [2,'Hasil fotosintesis yang dilepaskan ke udara adalah …',['Oksigen','Karbon monoksida','Asap','Nitrogen cair'],0,'Fotosintesis menghasilkan glukosa dan oksigen.'],
  [2,'Hewan pemakan tumbuhan disebut herbivora.',T,0,'Herbivora memakan tumbuhan.'],
  [3,'Pada setrika, energi listrik berubah menjadi …',['Panas','Bunyi saja','Kimia','Tidak berubah'],0,'Elemen setrika mengubah listrik menjadi panas.'],
  [3,'Dalam percobaan yang adil, kita mengubah …',['Satu variabel saja','Semua variabel sekaligus','Tidak ada variabel','Hasil pengamatan'],0,'Mengubah satu variabel membuat pengaruhnya dapat diamati.'],
  [3,'Energi dapat hilang begitu saja tanpa berubah bentuk.',T,1,'Energi berubah bentuk, tidak hilang.']],
 itLow: [
  [1,'Algoritma adalah …',['Urutan langkah penyelesaian masalah','Gambar hiasan','Nama perangkat','Biaya listrik'],0,'Algoritma menyusun instruksi secara terurut.'],
  [1,'Variabel digunakan untuk …',['Menyimpan nilai','Menjamin program benar','Menambah RAM fisik','Menyimpan kabel'],0,'Variabel mengacu pada nilai yang digunakan program.'],
  [1,'Urutan langkah dalam algoritma tidak berpengaruh pada hasil.',T,1,'Urutan langkah menentukan hasil.'],
  [2,'Percabangan digunakan untuk …',['Memilih tindakan berdasarkan kondisi','Menghapus semua data','Menggambar selalu','Mematikan komputer'],0,'If/else memilih berdasarkan kondisi.'],
  [2,'Perulangan (loop) berguna untuk …',['Mengulang instruksi','Menghentikan listrik','Menghapus variabel','Mengganti monitor'],0,'Loop menjalankan blok kode berulang kali.'],
  [2,'Kondisi pada percabangan bernilai benar atau salah.',T,0,'Kondisi bernilai boolean.'],
  [3,'Uji kasus (test case) membantu …',['Menemukan kesalahan program','Membuktikan program bebas semua kesalahan','Mempercepat internet','Menambah warna'],0,'Pengujian menemukan kesalahan, tetapi tidak membuktikan ketiadaan semua kesalahan.'],
  [3,'Jika x = 3 lalu x = x + 2, nilai x menjadi …',['5','3','2','32'],0,'x baru = 3 + 2 = 5.'],
  [3,'Program yang lolos satu uji kasus pasti benar untuk semua input.',T,1,'Satu uji tidak mewakili semua kemungkinan input.']],
 itHigh: [
  [1,'Primary key dipakai untuk …',['Mengidentifikasi baris secara unik','Mewarnai tabel','Menghapus semua baris','Memperbesar layar'],0,'Primary key harus mengidentifikasi record unik.'],
  [1,'Foreign key menghubungkan …',['Dua tabel melalui kolom referensi','Dua monitor','Kabel jaringan','Dua font'],0,'Foreign key merujuk primary key tabel lain.'],
  [1,'Dua baris boleh memiliki primary key yang sama.',T,1,'Primary key harus unik.'],
  [2,'Transaksi atomik berarti …',['Semua langkah berhasil atau seluruhnya dibatalkan','Sebagian langkah selalu disimpan','Tidak perlu validasi','Selalu lebih cepat'],0,'Atomisitas mencegah perubahan setengah jadi.'],
  [2,'Pencegahan injeksi SQL menggunakan …',['Parameterized query','Konkatenasi input mentah','Menyembunyikan tombol','Memperbesar font'],0,'Parameter memisahkan data input dari perintah SQL.'],
  [2,'Validasi di sisi server tetap diperlukan walau ada validasi di browser.',T,0,'Input dari klien tidak bisa dipercaya sepenuhnya.'],
  [3,'Kompleksitas waktu pencarian linear adalah …',['O(n)','O(1)','O(log n)','O(n²) selalu'],0,'Setiap elemen dapat diperiksa satu per satu.'],
  [3,'Pencarian biner memerlukan data yang …',['Terurut','Acak','Kosong','Berisi teks saja'],0,'Binary search membagi data terurut menjadi dua.'],
  [3,'Indeks database selalu mempercepat operasi tulis.',T,1,'Indeks mempercepat baca tetapi menambah beban tulis.']],
 auto: [
  [1,'Sebelum memperbaiki mesin, langkah aman adalah …',['Matikan mesin dan gunakan pelindung','Biarkan mesin menyala','Lepas semua baut tanpa urutan','Abaikan petunjuk'],0,'Keselamatan adalah langkah pertama.'],
  [1,'Alat pelindung diri di bengkel antara lain …',['Sarung tangan dan kacamata kerja','Sandal jepit','Perhiasan','Pakaian longgar'],0,'APD melindungi dari cedera.'],
  [1,'Kendaraan harus stabil sebelum dikerjakan di bawahnya.',T,0,'Gunakan penyangga yang sesuai.'],
  [2,'Oli berfungsi utama untuk …',['Mengurangi gesekan','Membersihkan kaca','Mengisi ban','Mengganti bahan bakar'],0,'Pelumasan mengurangi gesekan komponen.'],
  [2,'Penggantian oli mengikuti …',['Jadwal dan spesifikasi pabrikan','Tebakan','Warna kendaraan','Harga termurah saja'],0,'Ikuti spesifikasi agar mesin terawat.'],
  [2,'Oli bekas boleh dibuang ke selokan.',T,1,'Oli bekas adalah limbah yang harus dikelola.'],
  [3,'Sistem rem digunakan untuk …',['Memperlambat kendaraan','Mengisi aki','Mendinginkan kabin','Menambah volume audio'],0,'Rem mengurangi kecepatan.'],
  [3,'Tekanan ban yang kurang dapat menyebabkan …',['Boros bahan bakar dan ban cepat aus','Mesin lebih dingin','Rem lebih pakem','Lampu lebih terang'],0,'Ban kempis meningkatkan hambatan gulir.'],
  [3,'Minyak rem yang bocor tidak memengaruhi keselamatan.',T,1,'Kebocoran mengurangi daya pengereman.']],
 sains: [
  [1,'Variabel bebas dalam percobaan adalah yang …',['Sengaja diubah','Selalu hasil akhir','Tidak dicatat','Selalu sama'],0,'Variabel bebas diubah untuk mengamati pengaruhnya.'],
  [1,'Variabel terikat adalah …',['Yang diamati/diukur sebagai hasil','Yang selalu tetap','Nama percobaan','Alat ukur'],0,'Variabel terikat berubah sebagai akibat.'],
  [1,'Variabel kontrol dijaga tetap selama percobaan.',T,0,'Agar perbandingan adil.'],
  [2,'Hipotesis perlu diuji menggunakan …',['Bukti hasil pengamatan','Popularitas','Tebakan saja','Selera'],0,'Kesimpulan ilmiah didasarkan pada bukti.'],
  [2,'Pengulangan percobaan bertujuan …',['Meningkatkan keandalan data','Menghapus data','Memperindah laporan','Mengganti hipotesis'],0,'Hasil yang konsisten lebih dapat dipercaya.'],
  [2,'Satu percobaan tanpa ulangan cukup untuk kesimpulan pasti.',T,1,'Data perlu konsisten dan dapat direplikasi.'],
  [3,'Energi dalam sistem berubah …',['Bentuknya, bukan hilang begitu saja','Menjadi tidak ada','Tanpa sebab','Selalu menjadi uang'],0,'Energi dapat berubah bentuk.'],
  [3,'Satuan SI untuk energi adalah …',['Joule','Newton','Watt','Kelvin'],0,'Energi diukur dalam joule.'],
  [3,'Daya adalah energi per satuan waktu.',T,0,'P = E / t.']],
 econ: [
  [1,'Persamaan akuntansi adalah …',['Aset = liabilitas + ekuitas','Aset = beban','Ekuitas = pendapatan','Kas = laba selalu'],0,'Aset dibiayai liabilitas dan ekuitas.'],
  [1,'Utang usaha termasuk …',['Liabilitas','Aset','Pendapatan','Ekuitas'],0,'Utang adalah kewajiban.'],
  [1,'Setiap transaksi perlu didukung bukti transaksi.',T,0,'Bukti transaksi dasar pencatatan.'],
  [2,'Laba dihitung dari …',['Pendapatan dikurangi beban','Aset ditambah utang','Semua kas masuk','Harga dikali stok saja'],0,'Laba adalah pendapatan dikurangi beban.'],
  [2,'Jika pendapatan Rp 5 juta dan beban Rp 3,2 juta, laba adalah …',['Rp 1,8 juta','Rp 8,2 juta','Rp 3,2 juta','Rp 5 juta'],0,'5 − 3,2 = 1,8 juta.'],
  [2,'Laba selalu sama dengan saldo kas.',T,1,'Laba berbasis akrual; kas bisa berbeda.'],
  [3,'Biaya tetap dalam rentang relevan …',['Tidak berubah saat volume berubah','Selalu nol','Selalu sama dengan laba','Selalu naik per unit'],0,'Biaya tetap total konstan dalam rentang relevan.'],
  [3,'Titik impas tercapai ketika …',['Pendapatan = total biaya','Laba maksimum','Kas nol','Harga nol'],0,'Pada titik impas laba = 0.'],
  [3,'Biaya tetap per unit turun ketika volume produksi naik.',T,0,'Biaya tetap dibagi ke lebih banyak unit.']],
};
function mathItems(stage, g, semester, m) {
  const out = [], add = (q, opts, exp) => out.push([m, q, opts, 0, exp]);
  for (let k = 1; k <= 4; k++) {
    const r = k + semester * 2 + m;
    if (stage === 'SD' && g <= 2) { const a = g * 3 + r, b = m + k; if (m < 3) add(`${a} ${m === 1 ? '+' : '−'} ${b} = …`, m === 1 ? [`${a + b}`, `${a + b + 1}`, `${a + b - 1}`, `${a - b}`] : [`${a - b}`, `${a + b}`, `${a - b + 1}`, `${a - b - 1}`], m === 1 ? `${a} ditambah ${b} = ${a + b}.` : `${a} dikurangi ${b} = ${a - b}.`); else add(`Ani punya ${a} kelereng, diberi ${b}, lalu memberikan ${k} ke adik. Sisa kelereng Ani …`, [`${a + b - k}`, `${a + b}`, `${a - b + k}`, `${a + k}`], `${a} + ${b} − ${k} = ${a + b - k}.`); }
    else if (stage === 'SD' && g <= 4) { const a = g + r, b = semester + 1 + k; if (m === 1) add(`${a} × ${b} = …`, [`${a * b}`, `${a + b}`, `${a * b + 2}`, `${a * b - 1}`], `${a} dijumlahkan ${b} kali = ${a * b}.`); else if (m === 2) add(`${a * b} ÷ ${b} = …`, [`${a}`, `${b}`, `${a + 1}`, `${a * b - b}`], `Karena ${a} × ${b} = ${a * b}, maka ${a * b} ÷ ${b} = ${a}.`); else add(`Ada ${b} kotak, tiap kotak berisi ${a} kue. Jika ${k} kue dimakan, sisa kue …`, [`${a * b - k}`, `${a * b}`, `${a + b - k}`, `${a * b + k}`], `${b} × ${a} − ${k} = ${a * b - k}.`); }
    else if (stage === 'SD') { const a = (r + 1) * 20; if (m === 1) add(`Bentuk persen dari 1/4 adalah …`.replace('1/4', ['1/2', '1/4', '3/4', '1/5'][k - 1]), [['50%', '25%', '75%', '20%'][k - 1], ['25%', '50%', '25%', '50%'][k - 1], ['5%', '4%', '34%', '15%'][k - 1], ['12%', '40%', '7,5%', '2%'][k - 1]], 'Ubah pecahan ke per seratus.'); else if (m === 2) add(`25% dari ${a} adalah …`, [`${a / 4}`, `${a / 2}`, `${a}`, `${a * 4}`], `25% = 1/4. ${a} ÷ 4 = ${a / 4}.`); else add(`Harga buku Rp ${a * 100}. Diskon 25%, harga bayar …`, [`Rp ${a * 75}`, `Rp ${a * 25}`, `Rp ${a * 100}`, `Rp ${a * 125}`], `Diskon ${a * 25}, jadi bayar ${a * 100} − ${a * 25} = ${a * 75}.`); }
    else if (stage === 'SMP') { const x = r + g - 6, b = semester + k; if (m === 1) add(`Jika x + ${b} = ${x + b}, nilai x adalah …`, [`${x}`, `${x + b}`, `${b}`, `${x - 1}`], `Kurangi kedua ruas dengan ${b}: x = ${x}.`); else if (m === 2) add(`Jika 2x + ${b} = ${2 * x + b}, nilai x adalah …`, [`${x}`, `${x + 1}`, `${x * 2}`, `${x + 2}`], `Kurangi ${b}, lalu bagi 2: x = ${x}.`); else add(`Perbandingan uang A : B = 2 : 3. Jika total Rp ${5 * x * 1000}, uang B adalah …`, [`Rp ${3 * x * 1000}`, `Rp ${2 * x * 1000}`, `Rp ${5 * x * 1000}`, `Rp ${x * 1000}`], `Bagian B = 3/5 × ${5 * x * 1000} = ${3 * x * 1000}.`); }
    else { const a = r + g; if (m === 1) add(`Rata-rata dari ${a}, ${a + 2}, dan ${a + 4} adalah …`, [`${a + 2}`, `${a + 1}`, `${3 * a + 6}`, `${a + 4}`], `Jumlah ${3 * a + 6} dibagi 3 = ${a + 2}.`); else if (m === 2) add(`Median dari ${a + 6}, ${a}, ${a + 9}, ${a + 3}, ${a + 1} adalah …`, [`${a + 3}`, `${a + 1}`, `${a + 6}`, `${a + 4}`], `Urutkan: ${a}, ${a + 1}, ${a + 3}, ${a + 6}, ${a + 9}. Nilai tengah ${a + 3}.`); else add(`Sebuah kotak berisi ${k + 1} bola merah dan ${a} bola biru. Peluang terambil bola merah adalah …`, [`${k + 1}/${a + k + 1}`, `${a}/${a + k + 1}`, `${k + 1}/${a}`, `1/${a + k + 1}`], `Peluang = hasil mendukung / seluruh hasil = ${k + 1}/${a + k + 1}.`); }
  }
  if (m === 2) out.push([m, stage === 'SD' && g <= 2 ? `${g + 5} + 0 = ${g + 5}` : stage === 'SD' && g <= 4 ? 'Perkalian dengan 1 menghasilkan bilangan itu sendiri.' : stage === 'SD' ? '1/2 sama dengan 50%.' : stage === 'SMP' ? 'Menambah bilangan yang sama ke kedua ruas tidak mengubah penyelesaian persamaan.' : 'Korelasi kuat antara dua variabel membuktikan sebab-akibat.', T, stage === 'PT' || !['SD', 'SMP'].includes(stage) ? 1 : 0, 'Periksa kembali sifat operasi pada materi.']);
  return out;
}
function bank(stage, g, program, semester, sub) {
  let items;
  if (sub.id === 'math' || sub.id === 'quant') items = [1, 2, 3].flatMap(m => mathItems(stage, g, semester, m));
  else if (sub.id === 'indo' || sub.id === 'writing') items = FACTS[stage === 'SD' ? (g < 3 ? 'indoLow' : 'indoHigh') : 'indoUpper'];
  else if (sub.id === 'science') items = FACTS[stage === 'SD' && g < 4 ? 'sciLow' : 'sciHigh'];
  else if (/Perangkat|Informat|Teknologi/.test(program)) items = FACTS[stage === 'PT' && g >= 3 ? 'itHigh' : 'itLow'];
  else if (/Otomotif/.test(program)) items = FACTS.auto;
  else if (program === 'Sains') items = FACTS.sains;
  else items = FACTS.econ;
  return items.map(([m, q, options, correct, explanation], i) => ({ q, options, correct, explanation, id: `${stage}-${g}-${semester}-${program}-${sub.id}-m${m}-${i}`, stage, grade: g, semester, subject: sub.id, module: `${sub.id}-m${m}`, difficulty: m, type: options === T ? 'benar-salah' : 'pilihan-ganda' }));
}
module.exports={RULES,institutions,feeLabels,hash,subjects,bank};
