// BizSim 7.1.0: free-text interview questions. Maps free text to intents and reuses the v700 interview route for answers.
import { route as v700Route } from './v700.mjs';
import { TRAITS } from './v700-data.mjs';
export const VERSION = '7.1.0';
const INTENTS = [
  ['exp', /pengalaman|riwayat|sebelumnya|pernah kerja|bekerja di|experience/], ['why', /kenapa|mengapa|alasan|tertarik|bergabung|melamar/], ['press', /tekanan|stres|stress|target|deadline|lembur|sibuk/],
  ['weak', /kelemahan|kekurangan|lemah|kurangnya/], ['sal', /gaji|salary|bayaran|upah|ekspektasi|bertahan|jangka panjang|lama kerja/], ['case', /komplain|pelanggan|studi kasus|skill|kemampuan|keahlian|bisa apa|mahir/],
  ['age', /umur|usia|berapa tahun|pendidikan|lulusan|sekolah|kuliah|kampus/], ['trait', /sifat|karakter|kepribadian|orang yang seperti apa|gaya kerja/], ['team', /tim|kerja sama|rekan|kolaborasi|konflik/]
];
export async function route({ p, m, s, user, req, h }) {
  if (p !== '/api/v710/hr/ask' || m !== 'POST') return null;
  const { json, body, clean, save } = h, b = await body(req), v = s.v700, c = v?.hr?.cand?.find(x => x.id === b.candId);
  if (!c) return json({ error: 'Kandidat tidak ditemukan.' }, 404);
  const text = clean(b.text, 140).toLowerCase(), hit = INTENTS.find(([, rx]) => rx.test(text));
  if (!hit) return json({ ok: true, understood: false, answer: 'Maaf, saya kurang paham maksud pertanyaan itu. Bisa diulang dengan kalimat lain? Pertanyaan ini tidak mengurangi jatah Anda.', remaining: 3 - (c.asked || []).length });
  const id = hit[0];
  if (['exp', 'why', 'press', 'weak', 'sal', 'case'].includes(id)) {
    const r = await v700Route({ p: '/api/v700/hr/interview', m: 'POST', s, user, req: new Request('http://local/x', { method: 'POST', body: JSON.stringify({ candId: c.id, q: id }) }), h });
    const d = await r.json(); return json(r.status === 200 ? { ...d, understood: true } : d, r.status);
  }
  if (!c.asked.includes(id)) { if (c.asked.length >= 3) return json({ error: 'Maksimal 3 pertanyaan per kandidat. Gunakan tes skill atau cek referensi untuk informasi lain.' }, 400); c.asked.push(id); }
  const tr = TRAITS[c.trait], t2 = TRAITS[c.trait2], honest = c.honesty >= 45;
  const answer = { age: `Saya ${c.age} tahun, lulusan ${c.edu}.`, trait: `Rekan-rekan biasanya bilang saya ${tr.txt}. Di sisi lain, saya juga ${t2.txt}.`, team: c.loyalty > 65 || c.trait === 'social' ? 'Saya nyaman bekerja dalam tim dan biasanya menyelesaikan konflik lewat obrolan langsung.' : honest ? 'Saya bisa bekerja sama, tetapi saya lebih produktif bila tugasnya jelas dan tidak terlalu banyak rapat.' : 'Saya tidak pernah punya masalah dengan rekan kerja.' }[id];
  await save(user, s); return json({ ok: true, understood: true, answer, remaining: 3 - c.asked.length });
}
