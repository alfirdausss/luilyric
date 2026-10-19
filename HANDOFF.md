# HANDOFF.md — LuiLyric (Tahap A → Tahap B Agent Windows)

Versi Aplikasi: `0.1.0-alpha.1`  
Tanggal Handoff: 16 Oktober 2026  
Tahap Selesai: **Tahap A (Build Web Portabel — React + TypeScript + Vite)**  
Tahap Berikutnya: **Tahap B (Integrasi Native NDI Alpha, Server Kontrol LAN, dan Host Windows .exe)**

---

## 1. Cara Menjalankan & Menguji Proyek

```bash
# 1. Pasang dependency (pada mesin pengembangan dengan akses npm)
npm install

# 2. Jalankan unit test otomatis (Parser, State Machine, Deduplikasi Command, Validasi JSON)
npm test

# 3. Jalankan server development Vite
npm run dev

# 4. Build produksi web
npm run build
```

---

## 2. Struktur Direktori & Pemisahan Modul (Bagian 24 & 31)

Seluruh kode sumber dipisahkan berdasarkan tanggung jawab agar **Core**, **Contracts**, dan **Renderer** dapat langsung dipakai oleh host desktop Windows (Electron / Sidecar Native C++) tanpa menulis ulang UI:

- `src/contracts/index.ts` — Kontrak TypeScript untuk `ProjectFile`, `Song`, `Cue`, `CueStyle`, `CueAnimation`, `LiveEngineState`, `ControlCommand`, `ControlAck`, `OutputAdapter`, dan `StorageAdapter`.
- `src/core/defaults.ts` — Design token LuiLyric (Bagian 28: `#07090e`, `#0c101b`, `#00f0ff`, Plus Jakarta Sans, Orbitron, JetBrains Mono), daftar font panggung, 5 preset bawaan, dan proyek setlist contoh.
- `src/core/lyricParser.ts` — Parser lirik `.txt`/paste satu baris per cue, normalisasi `CRLF`/`LF`, pelestarian karakter Unicode/aksen, ekstraksi header `[Verse]`/`[Chorus]`, kalkulasi auto-shrink ukuran font satu baris (`evaluateSingleLineFit`), dan fungsi pembagi baris panjang (`splitCueIntoTwo`).
- `src/core/styleResolver.ts` — Engine pewarisan style & animasi berurutan: `APP_DEFAULT` → `Song Default Preset` → `Cue Preset` → `Cue Override`.
- `src/core/liveEngine.ts` — State machine live murni (`Ready` → `Entering` → `Holding` → `Exiting` → `Blank`), pemisahan `selectedCueId` (Preview) dari `liveCueId` (Live Output), kebijakan transisi (`strict-single`, `cut`, `crossfade`), deduplikasi `command.id`, dan validasi `expectedRevision`.
- `src/renderer/alphaRenderer.ts` — Renderer Canvas 2D offscreen/alpha murni (`clearRect` RGBA transparan), mendukung 9 tipe animasi IN (`fade`, `slideUp`, `slideLeft`, `zoom`, `wordReveal`, `charReveal`, `blurReveal`, `trackingExpand`, `none`), 5 tipe HOLD (`static`, `gentleFloat`, `pulse`, `glowBreath`, `charWave`), dan 4 tipe OUT (`fade`, `slideDown`, `shrink`, `cut`).
- `src/adapters/outputAdapter.ts` — Implementasi `PreviewOutputAdapter` untuk browser yang secara eksplisit melaporkan `nativeNdi: false` dan status `Unavailable in web preview`.
- `src/adapters/storageAdapter.ts` — Implementasi `BrowserStorageAdapter` dengan validasi schema JSON, checksum `FNV-1a`, autosave lokal, dan riwayat backup bergilir.
- `src/ui/App.tsx` — Antarmuka operator desktop (Setlist, Cue List, Dual Monitor Preview & Live Output, Transport Bar, Inspector 4-Tab) serta Panel Kontrol HP responsif (mode simulasi lokal).
- `tests/core.test.ts` — Suite pengujian otomatis untuk parser, state machine, deduplikasi command, dan validasi JSON.

---

## 3. Fitur yang Sudah Selesai di Tahap A

1. **Tema & Identitas Visual LuiLyric (Bagian 28)**: Mengikuti token warna `luifierey.my.id` (`#07090e`, `#0c101b`, `#00f0ff`, `#10b981`, `#f59e0b`, `#38bdf8`) serta hierarki font `Plus Jakarta Sans`, `Orbitron`, dan `JetBrains Mono`.
2. **Alur Lirik Satu Baris per Cue (Bagian 4 & 5)**: Impor file `.txt` UTF-8 atau tempel teks, normalisasi newline, opsi baris kosong (`section-break`, `ignore`, `blank-cue`), deteksi otomatis baris terlalu panjang (auto-shrink hingga `minFontSize`), peringatan overflow, dan tombol **Bagi 2 Cue**.
3. **Kontrol Live & State Machine (Bagian 6, 9, 12)**: Tombol dan shortcut keyboard (`Enter` GO, `→`/`PgDn` Next, `←`/`PgUp` Previous, `R` Replay, `B` Blank, `Shift+B` Restore, `Ctrl+S` Simpan) dengan proteksi fokus input teks.
4. **Pemisahan Preview vs Live Output**: Memilih atau mengedit cue di editor hanya mengubah monitor **Preview**. Tayangan **Live** mempertahankan `liveSnapshot` sampai operator menekan **GO** atau **Apply to Live**.
5. **Preview & Ekspor Frame Alpha Murni**: Latar belakang pengujian (`Checkerboard`, `Hitam`, `Putih`, `Merah`, `Stage Grid`) digambar pada kanvas terpisah di belakang kanvas alpha sehingga buffer output tetap 100% RGBA transparan (`alpha = 0` di luar teks). Tersedia tombol **PNG Alpha** untuk mengunduh frame transparan murni.
6. **Panel Kontrol HP Responsif (Bagian 7 & 29)**: Tersedia dalam mode `Panel Kontrol HP` maupun `Split + HP`, lengkap dengan tombol `NEXT BARIS` ukuran ibu jari, indikator baris tayang & baris berikutnya, serta simulasi tombol `Connected / Disconnected` untuk menguji fail-safe saat HP terputus.

---

## 4. Batasan Tahap A & Kejujuran Status (Bagian 29 & 33)

- **NDI Native Belum Aktif di Browser**: Header dan tab Output menampilkan status jujur **`NDI: Unavailable in web preview`**. Tidak ada klaim palsu "Connected to Resolume".
- **Kontrol HP Masih Simulasi Satu Perangkat**: Panel HP di Tahap A terhubung ke instance `LiveEngine` di memori browser yang sama. Sinkronisasi lintas perangkat melalui jaringan Wi-Fi/Hotspot lokal memerlukan server HTTP + WebSocket yang akan dibangun pada Tahap B.

---

## 5. Instruksi untuk Agent Windows (Tahap B)

1. **Jangan menulis ulang UI atau mengubah schema JSON (`src/contracts/index.ts`)** kecuali ditemukan bug spesifik.
2. Jalankan `npm test` terlebih dahulu untuk memastikan seluruh 8 kelompok unit test baseline lulus.
3. Kerjakan tiket secara berurutan mulai dari **LL-B01 (Proof of Concept Native NDI Alpha ke Resolume)** sesuai daftar di `TASKS.md`.
