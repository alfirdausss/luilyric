# LuiLyric (Tahap A — Build Web Portabel)

Aplikasi operator lirik satu baris per tampilan dengan animasi tipografi panggung dan renderer alpha transparan untuk Resolume Arena. Identitas visual mengacu pada **LUI VISUAL** (`luifierey.my.id`).

## Daftar Berkas Utama
- `HANDOFF.md` — Panduan jalankan, arsitektur modul, batasan Tahap A, dan instruksi kelanjutan untuk Agent Windows.
- `STATUS.md` — Matriks fitur `tested` vs `planned` dan laporan hasil pengujian unit otomatis.
- `CONTRACTS.md` — Kontrak schema JSON v1, command/acknowledgement, dan interface `OutputAdapter`.
- `DECISIONS.md` — Catatan keputusan arsitektur (ADR).
- `TASKS.md` — Tiket kerja terstruktur (`LL-B01` s.d. `LL-B04`) untuk Tahap B (Agent Windows Native).

## Struktur Kode Sumber (`src/`)
- `src/contracts/` — Tipe data proyek, cue, animasi, state machine, command, dan adapter.
- `src/core/` — Parser lirik `.txt`/Unicode, kalkulator auto-shrink satu baris, resolver pewarisan preset/override, dan `LiveEngine` state machine.
- `src/renderer/` — Renderer Canvas 2D RGBA alpha murni (`alpha=0` di luar teks) untuk fase `IN`, `HOLD`, dan `OUT`.
- `src/adapters/` — `PreviewOutputAdapter` (dengan status jujur `Unavailable in web preview`) dan `BrowserStorageAdapter` (validasi schema + checksum + backup).
- `src/ui/` — Antarmuka Desktop Operator, Dual Monitor (Preview vs Live Output), Inspector 4-Tab, dan Panel Kontrol HP responsif.
- `tests/core.test.ts` — Unit test otomatis.
