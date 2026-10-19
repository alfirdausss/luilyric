# TASKS.md — Daftar Tiket Lanjutan untuk Agent Windows (Tahap B)

Gunakan satu tiket per sesi kerja sesuai aturan pada Bagian 32 spesifikasi utama.

---

### Tiket LL-B01: Proof of Concept Native NDI Alpha ke Resolume
- **Tujuan**: Membangun pengirim frame native NDI dengan kanal alpha (`BGRA`/`RGBA`) pada Windows dan memvalidasi hasilnya di Resolume Arena.
- **Baca**: `HANDOFF.md`, `CONTRACTS.md`, dan Bagian 10 & 21 spesifikasi.
- **Scope**: `native/ndi/` dan adapter baru `src/adapters/nativeNdiAdapter.ts`.
- **Perilaku**:
  - Mengirim frame 1920×1080 30fps bernama `LuiLyric - Main` dengan alpha=0 di area kosong.
  - Saat `Blank`, sender tetap hidup dan mengirim frame transparan penuh.
- **Jangan ubah**: Schema proyek JSON dan logika `src/core/liveEngine.ts`.
- **Selesai jika**: Teks putih, hitam, dan glow cyan tampil bersih di atas layer visual Resolume tanpa kotak hitam dan lulus uji kontras.

---

### Tiket LL-B02: Server Kontrol Lokal (HTTP + WebSocket) & Pairing QR HP
- **Tujuan**: Mengaktifkan kontrol HP lintas perangkat pada jaringan Wi-Fi/Hotspot lokal yang sama.
- **Baca**: `CONTRACTS.md` dan Bagian 14 & 15 spesifikasi.
- **Scope**: `apps/desktop/remoteServer.ts` dan koneksi klien WebSocket pada mode HP.
- **Perilaku**:
  - Menyediakan rute `GET /remote`, `POST /api/pair` (kode sekali pakai berumur pendek + rate limit), `GET /api/state`, `WS /ws/control`, dan `POST /api/session/revoke`.
  - Meneruskan `ControlCommand` ke `LiveEngine.dispatch` dan mengirim `ControlAck` + broadcast state terbaru.
  - Membuang antrean command lokal jika koneksi HP terputus (tidak ada replay command usang saat reconnect).
- **Selesai jika**: HP dapat melakukan pairing via QR/kode, mengendalikan `NEXT`/`PREV`/`BLANK`, dan disconnect HP tidak menghentikan output live.

---

### Tiket LL-B03: Host Desktop Windows & Adapter Penyimpanan File Sistem
- **Tujuan**: Membungkus aplikasi dalam host desktop Windows (Electron / Tauri / C++ Host) dengan penyimpanan atomik di direktori AppData pengguna.
- **Baca**: Bagian 11, 16, dan 19 spesifikasi.
- **Scope**: `apps/desktop/` dan `src/adapters/desktopStorageAdapter.ts`.
- **Perilaku**:
  - Menyimpan proyek dan backup bergilir di `%APPDATA%/LuiLyric/`.
  - Memastikan loop render dan pengiriman NDI tetap berjalan meskipun jendela aplikasi diminimalkan.
- **Selesai jika**: Aplikasi berjalan mandiri tanpa browser eksternal, tetap mengirim NDI saat minimize, dan memulihkan proyek terakhir setelah restart tanpa otomatis menayangkan cue ke live.

---

### Tiket LL-B04: Packaging Installer Windows `.exe` & Uji Stabilitas 2 Jam
- **Tujuan**: Membuat installer `.exe` bernomor versi dan menyelesaikan matriks pengujian akhir bersama Resolume.
- **Baca**: Bagian 18, 20, 22, dan 23 spesifikasi.
- **Scope**: Konfigurasi builder installer dan dokumentasi hasil benchmark.
- **Selesai jika**: Installer `.exe` berhasil dipasang pada mesin Windows bersih, tidak menghapus proyek pengguna saat update, dan lulus uji stabilitas 2 jam bersama Resolume Arena.
