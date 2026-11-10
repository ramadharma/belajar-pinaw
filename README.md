# Web Belajar Bab III

Cheatsheet interaktif Bab III (metode penelitian) untuk persiapan bimbingan skripsi.

## Struktur

```
index.html   — halaman utama
css/style.css — semua styling
js/main.js    — semua interaksi (kartu, kuis, lab, timer)
```

Tanpa build step, tanpa dependency — cukup buka `index.html` di browser.

## Deploy ke GitHub Pages

1. Push folder ini ke repo GitHub (file `index.html` harus di root branch utama).
2. Buka **Settings → Pages** → Source: *Deploy from a branch* → pilih branch `main`, folder `/ (root)`.
3. Tunggu 1–2 menit, lalu buka `https://<username>.github.io/<nama-repo>/`.

File `.nojekyll` sudah disertakan agar GitHub Pages melayani semua file tanpa proses Jekyll.
