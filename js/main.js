const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem('bab3:' + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('bab3:' + key, JSON.stringify(value)); } catch (err) {}
  }
};
const fmt = (n, digits = 2) => Number(n).toLocaleString('id-ID', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits
});
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/* ---------- reading progress ---------- */
const readbar = $('#readbar');
function paintReadbar() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  const pct = max > 0 ? clamp(doc.scrollTop / max, 0, 1) : 0;
  readbar.style.width = (pct * 100) + '%';
}
document.addEventListener('scroll', paintReadbar, { passive: true });
window.addEventListener('resize', paintReadbar);
paintReadbar();

/* ---------- study route tabs ---------- */
const tabs = $$('.tab');
const panels = $$('.panel');
function selectTab(id, focus) {
  tabs.forEach(tab => {
    const on = tab.dataset.tab === id;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
    if (on && focus) tab.focus();
  });
  panels.forEach(panel => {
    panel.dataset.active = String(panel.id === 'panel-' + id);
  });
}
tabs.forEach(tab => {
  tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
  tab.addEventListener('click', () => selectTab(tab.dataset.tab));
});
$('.tabs').addEventListener('keydown', event => {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const ids = tabs.map(tab => tab.dataset.tab);
  const current = ids.indexOf(tabs.find(tab => tab.getAttribute('aria-selected') === 'true').dataset.tab);
  let next = current;
  if (event.key === 'ArrowRight') next = (current + 1) % ids.length;
  if (event.key === 'ArrowLeft') next = (current - 1 + ids.length) % ids.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = ids.length - 1;
  selectTab(ids[next], true);
});

/* ---------- Altman lab ---------- */
const sliderIds = ['x1', 'x2', 'x3', 'x4'];
const sliderDefaults = { x1: 0.12, x2: 0.08, x3: 0.15, x4: 1.1 };
const zOut = $('#zOut');
const zVerdict = $('#zVerdict');
const zMarker = $('#zMarker');
const gauge = $('.gauge');

function updateZ() {
  const values = {};
  sliderIds.forEach(id => {
    const input = $('#' + id);
    values[id] = Number(input.value);
    $('#' + id + 'o').textContent = fmt(values[id], 2);
  });
  const z = 6.56 * values.x1 + 3.26 * values.x2 + 6.72 * values.x3 + 1.05 * values.x4;
  zOut.textContent = fmt(z, 2);

  let verdict, color;
  if (z < 1.1) { verdict = 'zona distress'; color = '#F2A7BC'; }
  else if (z < 2.6) { verdict = 'zona abu-abu'; color = '#F3D9A6'; }
  else { verdict = 'zona sehat'; color = '#9CC7A5'; }
  zVerdict.textContent = verdict;
  zVerdict.style.color = color;
  zMarker.style.left = clamp((z + 1) / 7 * 100, 0, 100) + '%';
  gauge.setAttribute('aria-label', 'Skala Z-Score. Nilai sekarang ' + fmt(z, 2) + ', ' + verdict + '.');
}
sliderIds.forEach(id => $('#' + id).addEventListener('input', updateZ));
updateZ();

const cAssets = $('#cAssets');
const cLiab = $('#cLiab');
const cProfit = $('#cProfit');
const darOut = $('#darOut');
const roaOut = $('#roaOut');

function updateRatios() {
  const assets = Number.parseFloat(cAssets.value);
  const liab = Number.parseFloat(cLiab.value);
  const profit = Number.parseFloat(cProfit.value);
  const valid = Number.isFinite(assets) && assets > 0;
  darOut.textContent = valid && Number.isFinite(liab) ? fmt(liab / assets * 100, 2) + '%' : '—';
  roaOut.textContent = valid && Number.isFinite(profit) ? fmt(profit / assets * 100, 2) + '%' : '—';
}
[cAssets, cLiab, cProfit].forEach(input => input.addEventListener('input', updateRatios));
updateRatios();

$('#labReset').addEventListener('click', () => {
  sliderIds.forEach(id => { $('#' + id).value = sliderDefaults[id]; });
  cAssets.value = 100000;
  cLiab.value = 45000;
  cProfit.value = 8000;
  updateZ();
  updateRatios();
});

/* ---------- decision tree ---------- */
const treeBody = $('#treeBody');
const treeTrail = $('#treeTrail');
let trail = ['Mulai: Uji Chow'];

function paintTrail() {
  treeTrail.innerHTML = trail.map((item, index) =>
    '<span>' + item + '</span>' + (index < trail.length - 1 ? '<span class="sep">→</span>' : '')
  ).join('');
}

function treeQuestion(title, subtitle, choices) {
  treeBody.innerHTML =
    '<h4 class="tree-q">' + title + '</h4>' +
    '<p class="tree-sub">' + subtitle + '</p>' +
    '<div class="tree-choices">' +
      choices.map(choice =>
        '<button type="button" data-tree="' + choice.value + '">' + choice.label + '</button>'
      ).join('') +
    '</div>';
}

function treeResult(model, explanation, extra) {
  treeBody.innerHTML =
    '<div class="tree-result">' +
      '<p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--sage);margin-bottom:2px">Model terpilih</p>' +
      '<p class="model">' + model + '</p>' +
      '<p>' + explanation + '</p>' +
      (extra ? '<p style="margin-top:8px">' + extra + '</p>' : '') +
    '</div>';
}

function stepChow() {
  treeQuestion('Uji Chow: p-value-nya berapa?', 'Chow membandingkan Common Effect Model dengan Fixed Effect Model.', [
    { value: 'gt', label: 'p > 0,05' },
    { value: 'lt', label: 'p < 0,05' }
  ]);
}

function stepHausman() {
  treeQuestion('Uji Hausman: p-value-nya berapa?', 'Hausman membandingkan Fixed Effect Model dengan Random Effect Model.', [
    { value: 'lt', label: 'p < 0,05' },
    { value: 'gt', label: 'p > 0,05' }
  ]);
}

function stepLM() {
  treeQuestion('Uji Lagrange Multiplier: p-value-nya berapa?', 'LM membandingkan Common Effect Model dengan Random Effect Model.', [
    { value: 'lt', label: 'p < 0,05' },
    { value: 'gt', label: 'p > 0,05' }
  ]);
}

function resetTree() {
  trail = ['Mulai: Uji Chow'];
  paintTrail();
  stepChow();
}

treeBody.addEventListener('click', event => {
  const button = event.target.closest('[data-tree]');
  if (!button) return;
  const value = button.dataset.tree;
  const step = treeTrail.querySelectorAll('span:not(.sep)').length;

  if (step === 1) {
    if (value === 'gt') {
      trail.push('Chow: p > 0,05');
      paintTrail();
      treeResult('CEM', 'Chow tidak menolak Common Effect Model. Model ini menganggap tidak ada perbedaan karakteristik antarperusahaan.',
        'Jika ingin lebih yakin, uji LM masih bisa dipakai untuk membandingkan CEM dengan REM.');
    } else {
      trail.push('Chow: p < 0,05');
      paintTrail();
      stepHausman();
    }
    return;
  }

  if (step === 2) {
    if (value === 'lt') {
      trail.push('Hausman: p < 0,05');
      paintTrail();
      treeResult('FEM', 'Hausman menolak Random Effect Model. Fixed Effect Model dipilih karena efek individu dianggap berkorelasi dengan variabel independen.',
        'Lanjutkan uji asumsi klasik pada model FEM, lalu uji t, F, dan R².');
    } else {
      trail.push('Hausman: p > 0,05');
      paintTrail();
      stepLM();
    }
    return;
  }

  if (value === 'lt') {
    trail.push('LM: p < 0,05');
    paintTrail();
    treeResult('REM', 'LM menolak Common Effect Model, sehingga Random Effect Model lebih sesuai.',
      'Lanjutkan uji asumsi klasik, lalu uji t, F, dan R².');
  } else {
    trail.push('LM: p > 0,05');
    paintTrail();
    treeResult('CEM', 'LM tidak menolak Common Effect Model, sehingga CEM tetap dipakai.',
      'Lanjutkan uji asumsi klasik, lalu uji t, F, dan R².');
  }
});

$('#treeReset').addEventListener('click', resetTree);
resetTree();

/* ---------- flashcards ---------- */
const flashcards = [
  { deck: 'dasar', q: 'Judul & variabel', a: 'Y: audit delay (dependen — yang dipengaruhi). X₁ financial distress, X₂ leverage, X₃ profitabilitas (independen — yang diduga memengaruhi).' },
  { deck: 'dasar', q: 'Pendekatan penelitian', a: 'Kuantitatif: penelitian yang bekerja dengan angka — data sampel tertentu dianalisis dengan statistik untuk menguji hipotesis. Dipakai karena data laporan keuangan memang angka.' },
  { deck: 'dasar', q: 'Jenis penelitian', a: 'Asosiatif kausal: menguji hubungan sebab-akibat antara dua variabel atau lebih — apakah naik-turunnya X mengubah Y.' },
  { deck: 'dasar', q: 'Data sekunder', a: 'Data yang sudah tersedia, bukan dikumpulkan lewat kuesioner: laporan keuangan dan laporan tahunan dari IDX serta situs resmi perusahaan, 2021–2025.' },
  { deck: 'dasar', q: 'Skala rasio', a: 'Skala pengukuran dengan nol absolut, jadi nilainya bisa dikali, dibagi, dan dijadikan persentase. Dipilih karena semua variabelnya diukur begitu.' },
  { deck: 'dasar', q: '22 → 16 → 80', a: '22 perusahaan populasi, 16 lolos purposive sampling, 16 × 5 tahun = 80 observasi.' },

  { deck: 'variabel', q: 'Audit delay', a: 'Jangka waktu penyelesaian audit: dihitung sejak tanggal berakhirnya periode pelaporan sampai laporan auditor independen terbit — menunjukkan cepat atau lambatnya pemeriksaan.' },
  { deck: 'variabel', q: 'Altman Z-Score', a: 'Model yang menggabungkan empat rasio keuangan untuk mengklasifikasi kemungkinan kegagalan keuangan; Z rendah = makin dekat tekanan keuangan. Rumus: Z = 6,56X₁ + 3,26X₂ + 6,72X₃ + 1,05X₄.' },
  { deck: 'variabel', q: 'X₁–X₄ Altman', a: 'X₁ modal kerja/aset · X₂ saldo laba/aset · X₃ EBIT/aset · X₄ ekuitas/liabilitas.' },
  { deck: 'variabel', q: 'DAR', a: 'Leverage: membandingkan total utang dengan total aset untuk menunjukkan proporsi aset yang dibiayai utang — DAR 50% = setengah aset didanai liabilitas. Rumus: total liabilitas ÷ total aset × 100%.' },
  { deck: 'variabel', q: 'ROA', a: 'Profitabilitas: menunjukkan kemampuan perusahaan menghasilkan laba bersih dengan memanfaatkan keseluruhan aset. Rumus: laba bersih setelah pajak ÷ total aset × 100%.' },
  { deck: 'variabel', q: 'Kenapa nonmanufaktur?', a: 'Model empat variabel tidak membutuhkan sales to total assets, jadi cocok untuk telekomunikasi.' },

  { deck: 'analisis', q: 'CEM', a: 'Common Effect Model: semua perusahaan dianggap punya karakteristik yang sama, tanpa efek individu.' },
  { deck: 'analisis', q: 'FEM', a: 'Fixed Effect Model: tiap perusahaan punya intersep sendiri; perbedaan individu dianggap tetap.' },
  { deck: 'analisis', q: 'REM', a: 'Random Effect Model: perbedaan antarperusahaan diperlakukan sebagai komponen acak.' },
  { deck: 'analisis', q: 'Uji Chow', a: 'Pemilihan model panel part 1: menguji CEM vs FEM. p < 0,05 → lanjut FEM dan Hausman; p > 0,05 → CEM.' },
  { deck: 'analisis', q: 'Uji Hausman', a: 'Pemilihan model panel part 2: menguji FEM vs REM. p < 0,05 → FEM; p > 0,05 → REM, lalu uji LM.' },
  { deck: 'analisis', q: 'Uji LM', a: 'Pemilihan model panel part 3: menguji CEM vs REM. p < 0,05 → REM; p > 0,05 → CEM.' },
  { deck: 'analisis', q: 'Normalitas', a: 'Mengecek apakah residual regresi berdistribusi normal, syarat biar hasil uji bisa dipercaya. Uji Jarque-Bera: aman jika probabilitas > 0,05.' },
  { deck: 'analisis', q: 'Multikolinearitas', a: 'Mendeteksi korelasi tinggi antar variabel independen yang bisa mengacaukan estimasi koefisien. Aman jika Tolerance > 0,10 dan VIF < 10.' },
  { deck: 'analisis', q: 'Heteroskedastisitas', a: 'Mengetahui apakah varians residual berubah-ubah antar pengamatan; yang diinginkan tetap (homoskedastisitas). Uji Glejser: aman jika sig. > 0,05.' },
  { deck: 'analisis', q: 'Uji t', a: 'Parsial: menguji apakah masing-masing X sendiri-sendiri berpengaruh signifikan terhadap audit delay. p < 0,05 → signifikan.' },
  { deck: 'analisis', q: 'Uji F', a: 'Simultan: menguji apakah ketiga X bersama-sama berpengaruh terhadap audit delay. p < 0,05 → signifikan.' },
  { deck: 'analisis', q: 'R²', a: 'Mengukur kemampuan ketiga X menjelaskan variasi audit delay. Rentang 0–1, makin dekat 1 makin besar. Pada panel, lihat Adjusted R².' }
];

const deckNames = { dasar: 'Dasar', variabel: 'Variabel', analisis: 'Analisis' };
const fcGrid = $('#fcGrid');
const fcHint = $('#fcHint');
const flipped = new Set();
let currentDeck = 'semua';
let fcOrder = [];

function deckIndices() {
  return flashcards.map((_, index) => index).filter(index =>
    currentDeck === 'semua' || flashcards[index].deck === currentDeck
  );
}

function paintCards() {
  flipped.clear();
  fcGrid.innerHTML = fcOrder.map(index => {
    const card = flashcards[index];
    return '<button class="fc" type="button" data-i="' + index + '" aria-pressed="false" aria-label="Kartu: ' + card.q + '. Klik untuk membalik.">' +
      '<span class="fc-inner">' +
        '<span class="fc-face fc-front">' +
          '<span><small>' + deckNames[card.deck] + '</small><strong>' + card.q + '</strong></span>' +
          '<span class="fc-tap">Klik untuk jawaban</span>' +
          '<svg class="fc-flower" aria-hidden="true"><use href="#flower"/></svg>' +
        '</span>' +
        '<span class="fc-face fc-back" aria-hidden="true"><span>' + card.a + '</span></span>' +
      '</span>' +
    '</button>';
  }).join('');
  fcHint.textContent = fcOrder.length + ' kartu · klik untuk jawaban.';
}

function renderCards() {
  fcOrder = deckIndices();
  paintCards();
}

fcGrid.addEventListener('click', event => {
  const card = event.target.closest('.fc');
  if (!card) return;
  const index = Number(card.dataset.i);
  const pressed = card.getAttribute('aria-pressed') === 'true';
  card.setAttribute('aria-pressed', String(!pressed));
  $('.fc-back', card).setAttribute('aria-hidden', String(pressed));
  card.setAttribute('aria-label', 'Kartu: ' + flashcards[index].q + '. ' + (pressed ? 'Klik untuk melihat jawaban.' : 'Klik untuk melihat istilah.'));
  if (pressed) flipped.delete(index); else flipped.add(index);
  fcHint.textContent = flipped.size === fcOrder.length
    ? 'Semua kartu di dek ini sudah dibuka. Tutup dan ulangi tanpa melihat.'
    : flipped.size + ' dari ' + fcOrder.length + ' kartu sudah dibuka.';
});

$$('.filter').forEach(button => {
  button.addEventListener('click', () => {
    currentDeck = button.dataset.deck;
    $$('.filter').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    renderCards();
  });
});

$('#fcShuffle').addEventListener('click', () => {
  for (let i = fcOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fcOrder[i], fcOrder[j]] = [fcOrder[j], fcOrder[i]];
  }
  paintCards();
  fcHint.textContent = 'Kartu di dek ini sudah diacak. Mulai dari mana saja.';
});
renderCards();

/* ---------- quiz ---------- */
const questions = [
  {
    q: 'Pendekatan yang digunakan dalam penelitian ini adalah…',
    options: ['Kualitatif', 'Kuantitatif', 'Campuran', 'Etnografi'],
    answer: 1,
    why: 'Penelitian berlandaskan positivisme, memakai data angka, dan menguji hipotesis dengan statistik.',
    ref: '#pendekatan', refLabel: 'Bagian A — pendekatan'
  },
  {
    q: 'Jenis penelitian ini adalah…',
    options: ['Deskriptif', 'Komparatif', 'Asosiatif kausal', 'Eksperimen'],
    answer: 2,
    why: 'Asosiatif kausal menguji hubungan sebab-akibat antara variabel independen dan dependen.',
    ref: '#pendekatan', refLabel: 'Bagian A — jenis penelitian'
  },
  {
    q: 'Variabel dependen dalam penelitian ini adalah…',
    options: ['Audit delay', 'Financial distress', 'Leverage', 'Profitabilitas'],
    answer: 0,
    why: 'Audit delay adalah Y. Tiga lainnya adalah variabel independen X1, X2, dan X3.',
    ref: '#variabel', refLabel: 'Bagian C — variabel'
  },
  {
    q: 'Skala pengukuran yang dipakai adalah…',
    options: ['Nominal', 'Ordinal', 'Interval', 'Rasio'],
    answer: 3,
    why: 'Skala rasio punya nilai nol absolut, sehingga bisa dikali, dibagi, dan dijadikan persentase.',
    ref: '#variabel', refLabel: 'Bagian C — skala'
  },
  {
    q: 'Dalam Altman Z-Score, X₁ dihitung dari…',
    options: ['Saldo laba ÷ total aset', 'Modal kerja ÷ total aset', 'EBIT ÷ total aset', 'Ekuitas ÷ total liabilitas'],
    answer: 1,
    why: 'X₁ = working capital ÷ total assets. Urutan berikutnya: X₂ saldo laba, X₃ EBIT, X₄ ekuitas.',
    ref: '#variabel', refLabel: 'Bagian C — Altman'
  },
  {
    q: 'Rasio leverage yang dipakai dalam penelitian ini adalah…',
    options: ['DER', 'LTDER', 'DAR', 'TIE'],
    answer: 2,
    why: 'DAR = total liabilitas ÷ total aset. Draft masih menulis DER di satu kalimat — itu yang perlu diperbaiki.',
    ref: '#variabel', refLabel: 'Bagian C — leverage'
  },
  {
    q: 'ROA dihitung dengan rumus…',
    options: ['Laba bersih ÷ ekuitas', 'EBIT ÷ aset', 'Liabilitas ÷ aset', 'Laba bersih setelah pajak ÷ total aset'],
    answer: 3,
    why: 'ROA mengukur kemampuan total aset menghasilkan laba bersih setelah pajak.',
    ref: '#variabel', refLabel: 'Bagian C — ROA'
  },
  {
    q: 'Audit delay dihitung sejak…',
    options: ['Tanggal audit dimulai sampai selesai', 'Tanggal tutup buku sampai tanggal laporan audit', 'Tanggal laporan keuangan sampai RUPS', 'Tanggal tutup buku sampai tanggal publikasi'],
    answer: 1,
    why: 'Awalnya tanggal tutup buku, akhirnya tanggal laporan auditor independen. Selisihnya dinyatakan dalam hari.',
    ref: '#variabel', refLabel: 'Bagian C — audit delay'
  },
  {
    q: 'Populasi penelitian berjumlah…',
    options: ['16 perusahaan', '22 perusahaan', '80 perusahaan', '110 perusahaan'],
    answer: 1,
    why: 'Ada 22 perusahaan subsektor telekomunikasi yang terdaftar di BEI selama 2021–2025.',
    ref: '#sampel', refLabel: 'Bagian D — populasi'
  },
  {
    q: 'Jumlah observasi sampel penelitian adalah…',
    options: ['16', '22', '80', '110'],
    answer: 2,
    why: '16 perusahaan lolos kriteria, dikali 5 tahun pengamatan, menghasilkan 80 observasi.',
    ref: '#sampel', refLabel: 'Bagian D — sampel'
  },
  {
    q: 'Uji Chow memilih antara…',
    options: ['FEM dan REM', 'CEM dan REM', 'CEM dan FEM', 'Uji t dan uji F'],
    answer: 2,
    why: 'Chow membandingkan Common Effect Model dengan Fixed Effect Model.',
    ref: '#analisis', refLabel: 'Bagian G — uji Chow'
  },
  {
    q: 'Jika Uji Hausman menghasilkan p < 0,05, model yang dipilih adalah…',
    options: ['REM', 'CEM', 'FEM', 'LM'],
    answer: 2,
    why: 'H₀ Hausman adalah REM. Nilai p < 0,05 menolak H₀, sehingga FEM yang dipakai.',
    ref: '#analisis', refLabel: 'Bagian G — uji Hausman'
  },
  {
    q: 'Multikolinearitas dianggap tidak terjadi jika…',
    options: ['Tolerance < 0,10 dan VIF > 10', 'Signifikansi > 0,05', 'R² > 0,5', 'Tolerance > 0,10 dan VIF < 10'],
    answer: 3,
    why: 'Ambangnya Tolerance di atas 0,10 dan VIF di bawah 10.',
    ref: '#analisis', refLabel: 'Bagian G — asumsi klasik'
  },
  {
    q: 'Uji F digunakan untuk menguji pengaruh…',
    options: ['Parsial', 'Simultan', 'Masing-masing variabel', 'Mediasi'],
    answer: 1,
    why: 'Uji F menguji pengaruh seluruh variabel independen secara bersama-sama terhadap variabel dependen.',
    ref: '#analisis', refLabel: 'Bagian G — uji F'
  }
];

const quizApp = $('#quizApp');
let qIndex = 0;
let qScore = 0;
let qAnswered = false;
let qMissed = [];
let quizStarted = false;

function quizProgress() {
  return Math.round((qIndex / questions.length) * 100);
}

function renderQuestion() {
  const item = questions[qIndex];
  quizApp.innerHTML =
    '<div class="quiz-top"><span>Soal ' + (qIndex + 1) + ' dari ' + questions.length + '</span>' +
    '<span class="score">Skor ' + qScore + '</span></div>' +
    '<div class="quiz-bar" aria-hidden="true"><i style="width:' + quizProgress() + '%"></i></div>' +
    '<h3 class="qtext">' + item.q + '</h3>' +
    '<div class="opts" role="group" aria-label="Pilihan jawaban">' +
      item.options.map((option, index) =>
        '<button class="opt" type="button" data-opt="' + index + '">' +
          '<span class="key" aria-hidden="true">' + (index + 1) + '</span>' +
          '<span>' + option + '</span>' +
        '</button>'
      ).join('') +
    '</div>' +
    '<div class="fb" id="quizFeedback" aria-live="polite" hidden></div>' +
    '<div class="quiz-foot">' +
      '<span class="kbd-hint">Tekan <kbd>1</kbd>–<kbd>4</kbd> untuk memilih.</span>' +
      '<button class="btn small-btn" type="button" id="nextBtn" hidden>Soal berikutnya</button>' +
    '</div>';
  qAnswered = false;
  if (quizStarted) {
    const heading = quizApp.querySelector('.qtext');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }
}

function answerQuestion(chosen, button) {
  if (qAnswered) return;
  qAnswered = true;
  const item = questions[qIndex];
  const options = $$('.opt', quizApp);
  options.forEach((optionButton, index) => {
    optionButton.disabled = true;
    if (index === item.answer) optionButton.dataset.state = 'correct';
  });
  const correct = chosen === item.answer;
  if (!correct) {
    button.dataset.state = 'wrong';
    qMissed.push({ question: item.q, ref: item.ref, refLabel: item.refLabel });
  } else {
    qScore += 1;
  }
  const feedback = $('#quizFeedback');
  feedback.hidden = false;
  feedback.className = 'fb ' + (correct ? 'ok' : 'no');
  feedback.innerHTML = '<b>' + (correct ? 'Tepat.' : 'Belum tepat.') + '</b> ' + item.why;
  $('.score', quizApp).textContent = 'Skor ' + qScore;

  const nextButton = $('#nextBtn');
  nextButton.hidden = false;
  nextButton.textContent = qIndex === questions.length - 1 ? 'Lihat hasil' : 'Soal berikutnya';
  requestAnimationFrame(() => nextButton.focus());
}

function finishQuiz() {
  quizStarted = false;
  const total = questions.length;
  const pct = Math.round(qScore / total * 100);
  let title, message;
  if (pct === 100) {
    title = 'Semua benar.';
    message = 'Besok kamu sudah siap banget, tinggal bawa catatanmu. Tetap baca ulang PR di bawah sekali lagi ya.';
  } else if (pct >= 70) {
    title = 'Sudah kuat.';
    message = 'Tinggal rapikan bagian yang salah. Baca ulang dua bagian yang ditandai, lalu ulangi kuisnya.';
  } else if (pct >= 40) {
    title = 'Setengah jalan.';
    message = 'Belum apa-apa. Kembali ke peta, baca bagian yang ditandai, lalu ulangi. Jangan hafal jawaban kuisnya.';
  } else {
    title = 'Masih dingin.';
    message = 'Dan itu normal untuk percobaan pertama. Mulai dari peta dan bagian C, bukan dari kuis ini.';
  }

  const best = Math.max(store.get('bestQuiz', 0), qScore);
  store.set('bestQuiz', best);

  quizApp.innerHTML =
    '<div class="result-card">' +
      '<span class="score-big">' + qScore + '/' + total + '</span>' +
      '<h3>' + title + '</h3>' +
      '<p>' + message + '</p>' +
      (qMissed.length ? '<div class="missed">' + qMissed.map(item =>
        '<a href="' + item.ref + '"><span aria-hidden="true">→</span><span><b>Baca ulang:</b> ' + item.refLabel + '</span></a>'
      ).join('') + '</div>' : '') +
      '<div class="quiz-foot" style="justify-content:center">' +
        '<button class="btn" type="button" id="quizRestart">Ulangi kuis</button>' +
      '</div>' +
      '<p class="best">Skor terbaikmu: ' + best + ' dari ' + total + '</p>' +
    '</div>';

  $('#quizRestart').addEventListener('click', () => {
    qIndex = 0;
    qScore = 0;
    qMissed = [];
    quizStarted = true;
    renderQuestion();
  });

  if (pct >= 70) burstConfetti();

  const resultCard = quizApp.querySelector('.result-card');
  if (resultCard) {
    resultCard.setAttribute('tabindex', '-1');
    resultCard.focus();
  }
}

quizApp.addEventListener('click', event => {
  const option = event.target.closest('.opt');
  if (option && !qAnswered) {
    answerQuestion(Number(option.dataset.opt), option);
    return;
  }
  const next = event.target.closest('#nextBtn');
  if (next) {
    if (qIndex === questions.length - 1) {
      finishQuiz();
    } else {
      qIndex += 1;
      quizStarted = true;
      renderQuestion();
    }
  }
});

document.addEventListener('keydown', event => {
  if (!quizStarted) return;
  if (event.target.matches('input, textarea, select')) return;
  if (!qAnswered && ['1', '2', '3', '4'].includes(event.key)) {
    const option = $$('.opt', quizApp)[Number(event.key) - 1];
    if (option) option.click();
  }
  if (qAnswered && event.key === 'Enter') {
    const next = $('#nextBtn');
    if (next) { event.preventDefault(); next.click(); }
  }
});

renderQuestion();

/* ---------- PR checklist ---------- */
const prInputs = $$('input[data-pr]');
let prChecked = store.get('pr', ['p1', 'p8']);
prInputs.forEach(input => {
  input.checked = prChecked.includes(input.dataset.pr);
  input.addEventListener('change', () => {
    prChecked = prInputs.filter(item => item.checked).map(item => item.dataset.pr);
    store.set('pr', prChecked);
    paintPR();
  });
});
const meterText = $('#meterText');
const meterFill = $('#meterFill');
const mascotMessages = [
  'Aku Bu Mekar. Centang PR persiapanmu, kelopakku mekar mengikutinya.',
  'Satu kelopak mekar. Pelan-pelan aja, PR-nya tinggal sedikit.',
  'Dua kelopak. Kamu mulai masuk ritme.',
  'Tiga kelopak. Ritme persiapanmu sudah kelihatan.',
  'Empat kelopak. Setengah PR beres — titik yang paling bikin lega.',
  'Lima kelopak. Hampir semua sudah kamu sentuh.',
  'Enam kelopak. Tinggal dua, dan bimbingan makin dekat.',
  'Tujuh kelopak. Satu lagi, terus mekar penuh.',
  'Mekar penuh. Besok tinggal percaya diri bawa catatanmu.'
];
function paintPR() {
  const count = prInputs.filter(item => item.checked).length;
  $('#prCount').textContent = count + ' dari ' + prInputs.length + ' beres';
  meterText.textContent = count + '/' + prInputs.length + ' beres';
  meterFill.style.width = (count / prInputs.length * 100) + '%';
  $$('.petal').forEach((petal, index) => petal.classList.toggle('filled', index < count));
  const line = $('#mascotLine');
  if (line) line.textContent = mascotMessages[Math.min(count, mascotMessages.length - 1)];
  if (count === prInputs.length) burstConfetti();
}
paintPR();

/* ---------- panic dialog & timer ---------- */
const dialog = $('#panic');
const clock = $('#clock');
const timerBtn = $('#timerBtn');
const timerReset = $('#timerReset');
const dialogFoot = $('.dialog-foot');
const originalFoot = dialogFoot.textContent;
let secondsLeft = 300;
let timer = null;

function paintClock() {
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  clock.textContent = minutes + ':' + seconds;
}

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null; }
  timerBtn.textContent = 'Mulai';
}

function startTimer() {
  stopTimer();
  if (secondsLeft <= 0) { secondsLeft = 300; paintClock(); }
  timerBtn.textContent = 'Jeda';
  timer = setInterval(() => {
    secondsLeft -= 1;
    paintClock();
    if (secondsLeft <= 0) {
      stopTimer();
      clock.textContent = '00:00';
      dialogFoot.textContent = 'Waktu habis. Tutup dialog, minum air, lalu tidur. Besok kamu sudah cukup siap.';
    }
  }, 1000);
}

$$('[data-open-panic]').forEach(button => button.addEventListener('click', () => {
  dialog.showModal();
  paintClock();
}));
$$('[data-close-panic]').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => {
  stopTimer();
  if (dialogFoot.textContent !== originalFoot) dialogFoot.textContent = originalFoot;
});
timerBtn.addEventListener('click', () => {
  if (timer) stopTimer();
  else startTimer();
});
timerReset.addEventListener('click', () => {
  stopTimer();
  secondsLeft = 300;
  paintClock();
  dialogFoot.textContent = originalFoot;
});
paintClock();

/* ---------- confetti ---------- */
const canvas = $('#confetti');
const ctx = canvas.getContext('2d');
let particles = [];
let raf = null;

function sizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', sizeCanvas);

function burstConfetti() {
  if (reduceMotion.matches) return;
  sizeCanvas();
  const colors = ['#B8436B', '#E48AA6', '#FFF7DD', '#3F684C', '#3B2434'];
  particles = Array.from({ length: 58 }, () => ({
    x: window.innerWidth / 2 + (Math.random() - 0.5) * 240,
    y: window.innerHeight * 0.28,
    vx: (Math.random() - 0.5) * 7,
    vy: -Math.random() * 8 - 2,
    g: 0.19,
    rot: Math.random() * 6.28,
    vr: (Math.random() - 0.5) * 0.34,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 1
  }));
  if (raf) cancelAnimationFrame(raf);
  tickConfetti();
}

function tickConfetti() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  particles.forEach(particle => {
    particle.vy += particle.g;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.rot += particle.vr;
    particle.life -= 0.008;
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rot);
    ctx.globalAlpha = Math.max(particle.life, 0);
    ctx.fillStyle = particle.color;
    ctx.fillRect(-4, -2, 8, 4);
    ctx.restore();
  });
  particles = particles.filter(particle => particle.life > 0 && particle.y < window.innerHeight + 40);
  if (particles.length) {
    raf = requestAnimationFrame(tickConfetti);
  } else {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}
