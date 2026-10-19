# DECISIONS.md — Catatan Keputusan Arsitektur (ADR)

## ADR-01: Pemisahan Kanvas Backdrop Preview dan Kanvas Alpha Murni
- **Konteks**: Operator membutuhkan latar belakang pengujian (`Checkerboard`, `Hitam`, `Putih`, `Merah`, `Stage Grid`) untuk memeriksa keterbacaan lirik, tetapi output NDI ke Resolume wajib 100% transparan (`alpha = 0` di luar teks/efek).
- **Keputusan**: Menggunakan dua elemen `<canvas>` bertumpuk. Kanvas bawah (`drawPreviewBackdrop`) hanya menggambar latar bantu visual di UI, sedangkan kanvas atas (`renderLyricAlphaFrame`) selalu diawali `ctx.clearRect(0, 0, width, height)` dan hanya menggambar glyph lirik beserta glow/outline/shadow.
- **Dampak**: Buffer piksel dari kanvas atas dapat langsung dibaca (`getImageData` / shared texture) oleh sender NDI pada Tahap B atau diunduh sebagai PNG transparan tanpa risiko checkerboard ikut terkirim ke Resolume.

## ADR-02: State Machine Murni Berbasis Monotonic Timestamp (`nowMs`)
- **Konteks**: Animasi UI yang bergantung pada `setInterval` rentan meleset ketika tab tidak fokus atau frame drop.
- **Keputusan**: `LiveEngine` dan `renderLyricAlphaFrame` menerima parameter waktu monotonik (`performance.now()`), menghitung `elapsedMs = nowMs - phaseStartedAtMs`, dan menentukan transisi fase (`Entering` → `Holding`, `Exiting` → `Entering`/`Blank`) secara deterministik.
- **Dampak**: State machine dapat diuji secara instan dalam unit test tanpa menunggu timer nyata, dan siap dijalankan oleh *ticker* native di belakang layar saat jendela diminimalkan pada Tahap B.

## ADR-03: Tanpa Dependency State/Router Eksternal Berat (Prinsip YAGNI)
- **Konteks**: Aplikasi membutuhkan latensi interaksi rendah dan portabilitas tinggi antara web dan host desktop.
- **Keputusan**: Menggunakan React hooks standar + kelas TypeScript murni (`LiveEngine`, `PreviewOutputAdapter`, `BrowserStorageAdapter`) tanpa Redux, router eksternal, atau library animasi DOM berat.
- **Dampak**: Ukuran bundle sangat ringan, nol ketergantungan pada DOM untuk perhitungan animasi teks, dan mudah diintegrasikan ke Electron atau WebView2 di Windows.
