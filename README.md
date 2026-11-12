# CONTRACTHUB — PT Pelindo Regional 2 Cirebon

Panduan menjalankan aplikasi di server lokal (Windows, macOS, atau Linux) setelah mengunduh proyek.

## Prasyarat
- **Node.js** versi 18 atau terbaru (`node -v`)
- **npm** (`npm -v`)

## Cara Menjalankan di Server Lokal

1. Ekstrak folder proyek hasil unduhan, lalu buka terminal di dalam folder proyek.
2. Instal seluruh dependensi:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan lokal (Express API + Vite):
   ```bash
   npm run dev
   ```
4. Buka browser dan akses:
   ```
   http://localhost:3000
   ```

## Menjalankan Mode Produksi Lokal

```bash
npm run build
npm start
```

- Data aplikasi tersimpan otomatis secara lokal di `data/contracthub-store.json`.
- Untuk mengubah port default (`3000`), buat file `.env` dari `.env.example` dan tambahkan `PORT=3000` (atau port lain sesuai kebutuhan).
