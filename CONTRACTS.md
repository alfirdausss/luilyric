# CONTRACTS.md — Kontrak Modul, Schema Proyek, dan Protokol Kontrol

Dokumen ini mengunci kontrak antara **Tahap A (Web Portabel)** dan **Tahap B (Agent Windows Native)**. Implementasi sumber berada di `src/contracts/index.ts`.

---

## 1. Aturan Invarian Core

1. **Satu Cue = Satu Baris (`REQ-01`)**: Setiap objek `Cue` hanya memuat satu baris teks tanpa karakter newline. Jika teks melebihi `maxWidthRatio` kanvas, renderer mengecilkan ukuran font hingga `minFontSize` dan menampilkan indikator peringatan.
2. **Pemisahan Preview vs Live (`Bagian 6 & 12`)**:
   - `selectedCueId` hanya mengubah kanvas **Preview** dan panel **Inspector**.
   - `liveCueId` dan `liveSnapshot` hanya berubah melalui command eksplisit: `GO_CUE`, `NEXT`, `PREVIOUS`, `BLANK`, `RESTORE`, atau `APPLY_TO_LIVE`.
   - Menghapus cue yang sedang tayang dari daftar editor tidak menghapus `liveSnapshot` sampai operator mengirim command live berikutnya.
3. **Kejujuran Status Output (`Bagian 10 & 29`)**:
   - `PreviewOutputAdapter` wajib mengembalikan `nativeNdi: false` dan `status: 'unavailable'`.
   - `NativeNdiAdapter` (Tahap B) hanya boleh mengembalikan `status: 'running'` setelah `NDIlib_send_create` berhasil membuat instance sender aktif.

---

## 2. Kontrak Command & Acknowledgement (`Bagian 14`)

Semua input kontrol (baik dari tombol Desktop, shortcut keyboard, maupun WebSocket HP) wajib dikirim ke `LiveEngine.dispatch(project, command, nowMs)` menggunakan format berikut:

```json
{
  "type": "command",
  "id": "cmd-mobile-m2k9x-8f1a",
  "sessionId": "paired-session-id",
  "expectedRevision": 12,
  "action": "NEXT",
  "payload": {}
}
```

Respons sinkron dari `LiveEngine.dispatch`:

```json
{
  "type": "ack",
  "commandId": "cmd-mobile-m2k9x-8f1a",
  "accepted": true,
  "revision": 13,
  "liveCueId": "cue-002",
  "phase": "Exiting"
}
```

- **Deduplikasi**: Jika `command.id` sudah pernah diterima dalam jendela 64 command terakhir, engine mengembalikan `accepted: true` dengan `revision` saat ini tanpa memicu aksi kedua kali.
- **Revisi Usang**: Jika `expectedRevision` disertakan dan tidak sama dengan `state.revision`, engine menolak command (`accepted: false`) agar klien HP segera menyelaraskan state terbaru.

---

## 3. Kontrak Output Adapter (`Bagian 31`)

Pada Tahap B, buat `NativeNdiOutputAdapter` yang mengimplementasikan `OutputAdapter` dari `src/contracts/index.ts`:

- Format piksel yang direkomendasikan untuk NDI SDK: `NDIlib_FourCC_video_type_BGRA` atau `NDIlib_FourCC_video_type_RGBA` dengan konversi *premultiplied* / *straight alpha* yang diverifikasi langsung di Resolume Arena.
- Gunakan ring buffer terbatas (2–3 slot frame) antara proses renderer offscreen dan thread native NDI sender; buang frame lama jika sender tertinggal agar tidak menumpuk latensi.
