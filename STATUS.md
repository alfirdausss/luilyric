# STATUS.md — Matriks Status Fitur LuiLyric

Versi: `0.1.0-alpha.1` (Akhir Tahap A — Build Web Portabel)  
Tanggal Pemeriksaan: 16 Oktober 2026  
Lingkungan Uji Tahap A: Node.js `v18.20.4` (Unit Tests Core/Adapters) & Browser Canvas 2D Engine

---

## 1. Ringkasan Status Komponen

| Modul / Fitur | Status | Keterangan & Bukti Pengujian |
| --- | --- | --- |
| **Tema & Token Visual LuiLyric (Bagian 28)** | `tested` | Palet `#07090e`, `#0c101b`, `#00f0ff`, font Plus Jakarta Sans, Orbitron, JetBrains Mono diterapkan. |
| **Parser Lirik & Impor UTF-8 `.txt` (Bagian 4 & 5)** | `tested` | Normalisasi CRLF/LF, pelestarian Unicode, ekstraksi `[Section]`, dan 3 opsi baris kosong diuji di `tests/core.test.ts`. |
| **Satu Baris per Cue & Auto-Shrink (REQ-01)** | `tested` | Teks tidak pernah wrap diam-diam ke 2 baris; otomatis mengecil hingga `minFontSize` + peringatan overflow & tombol **Bagi 2 Cue**. |
| **State Machine Live (`Ready/Entering/Holding/Exiting/Blank`)** | `tested` | Pemisahan `selectedCueId` vs `liveCueId`, `GO`, `Next`, `Previous`, `Replay`, `Blank`, `Restore`, dan `Apply to Live` lulus uji otomatis. |
| **Kebijakan Pergantian (`strict-single`, `cut`, `crossfade`)** | `tested` | Mode default `strict-single` menunggu `OUT` selesai sebelum `IN` baru; `Next` cepat langsung mengganti target terbaru tanpa antrean panjang. |
| **Deduplikasi Command & Revisi State (Bagian 14)** | `tested` | Command dengan ID duplikat diabaikan secara idempoten; `expectedRevision` usang ditolak beserta snapshot terbaru. |
| **Renderer Alpha Canvas 2D (IN / HOLD / OUT)** | `tested` | Render RGBA transparan (`alpha=0` di luar teks), 9 mode IN (`wordReveal`, `charReveal`, `blurReveal`, dll.), 5 mode HOLD, 4 mode OUT, serta unduhan frame PNG transparan. |
| **Pewarisan Style & Preset (Bagian 8)** | `tested` | Urutan `Default` → `Preset Lagu` → `Preset Cue` → `Override Cue` + tombol **Reset Override** dan **Impor Font `.ttf`/`.otf`**. |
| **Simpan, Autosave, Backup, Ekspor/Impor JSON** | `tested` | Validasi schema v1, checksum `FNV-1a`, pembersihan field sensitif, dan rotasi backup lokal diuji di `tests/core.test.ts`. |
| **Panel Kontrol HP Responsif (Simulasi Lokal)** | `tested` | Tombol `NEXT BARIS` besar, status aktif/berikutnya, toggle Portrait/Landscape, dan simulasi fail-safe `Disconnected`. |
| **Output Native NDI Alpha ke Resolume (REQ-06)** | `planned` | Saat ini menggunakan `PreviewOutputAdapter` dengan label jujur **`Unavailable in web preview`**. Dikerjakan pada Tahap B (Tiket `LL-B01`). |
| **Server Lokal HTTP/WS & Pairing QR Lintas Perangkat** | `planned` | Kontrak command/ack sudah siap di `src/contracts/index.ts`. Server Express/WS LAN dikerjakan pada Tahap B (Tiket `LL-B02`). |
| **Host Desktop Windows & Installer `.exe` (REQ-08)** | `planned` | Dikerjakan pada Tahap B setelah PoC NDI Alpha lulus di Resolume Arena (Tiket `LL-B03` & `LL-B04`). |

---

## 2. Hasil Eksekusi Unit Test Otomatis

Perintah: `npm test` (`node scripts/run-tests.cjs`)

- `✓ 1. Parser Lirik: normalisasi CRLF/LF, karakter Unicode, dan ekstraksi [Section]`
- `✓ 2. Parser Lirik: mode baris kosong "blank-cue" membuat cue jeda eksplisit`
- `✓ 3. Evaluasi Satu Baris (Auto-Shrink & Split Cue): deteksi baris panjang dan pembagian 2 cue`
- `✓ 4. Resolusi Pewarisan Style: Default -> Song Preset -> Cue Preset -> Cue Override`
- `✓ 5. State Machine Live: Pemisahan Preview (SELECT_CUE) vs Live (GO_CUE, NEXT, PREVIOUS)`
- `✓ 6. State Machine Live: Next cepat saat transisi tidak menumpuk antrean & batas lagu tidak wrap`
- `✓ 7. State Machine Live: Blank, Restore, Replay, Deduplikasi Command ID, dan Stale Revision`
- `✓ 8. Output & Storage Adapter: Label NDI jujur & Validasi JSON Proyek`

---

## 3. Pekerjaan yang Belum Dilakukan (Wajib Dilanjutkan Agent Windows)

1. **Pengujian End-to-End NDI Alpha di Windows + Resolume Arena**: Lingkungan build Tahap A tidak memiliki Windows/Resolume/NDI SDK native. Agent Windows wajib membangun modul native sender (`BGRA` / `P216` dengan alpha) dan memverifikasi tepi antialias, glow, dan teks hitam di atas visual Resolume.
2. **Pengujian Jaringan Lokal (Hotspot HP / Router Wi-Fi)**: Menguji latensi WebSocket p95 < 100 ms dan ketahanan reconnect tanpa mengeksekusi ulang command lama.
3. **Uji Stabilitas 2 Jam Nonstop**: Mengukur penggunaan memori, frame drop (< 1%), dan perilaku saat jendela aplikasi diminimalkan di Windows.
