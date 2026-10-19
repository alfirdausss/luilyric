import { Song } from '../contracts';

/**
 * 21 Lagu Lengkap Sesuai Urutan Sanjaya Music
 * Masing-masing lagu memiliki 1 tema preset panggung yang konsisten dari bait awal sampai akhir.
 */
export const SANJAYA_MUSIC_SETLIST: Song[] = [
  {
    "id": "sanjaya-01-aku-mah-apa",
    "title": "1. Aku Mah Apa",
    "artist": "Cita Citata / Sanjaya Live",
    "bpm": 130,
    "defaultPresetId": "preset-koplo-magenta",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj01-01",
        "text": "",
        "section": "Intro Kendang",
        "isBlankCue": true,
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-02",
        "text": "Aku mah apa atuh cuma selingkuhan kamu",
        "section": "Chorus",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-03",
        "text": "Aku mah apa atuh cuma simpanan kamu",
        "section": "Chorus",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-04",
        "text": "Sakit hatiku kau duakan",
        "section": "Chorus",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-05",
        "text": "Hancur hatiku kau campakkan",
        "section": "Chorus",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-06",
        "text": "",
        "section": "Jeda Srepegan",
        "isBlankCue": true,
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-07",
        "text": "Memang kuakui kamu sangat mempesona",
        "section": "Verse 1",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-08",
        "text": "Memang kuakui kamu banyak yang menyukai",
        "section": "Verse 1",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-09",
        "text": "Tapi sayang kamu sudah ada yang memiliki",
        "section": "Verse 1",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-10",
        "text": "Dan aku terjebak dalam cinta terlarangmu",
        "section": "Verse 1",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-11",
        "text": "Aku tahu ini salah, aku tahu ini dosa",
        "section": "Pre-Chorus",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-12",
        "text": "Tapi ku terlanjur cinta, tak berdaya menghindarinya",
        "section": "Pre-Chorus",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-13",
        "text": "Aku mah apa atuh cuma selingkuhan kamu",
        "section": "Chorus 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-14",
        "text": "Aku mah apa atuh cuma simpanan kamu",
        "section": "Chorus 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-15",
        "text": "Sakit hatiku kau duakan",
        "section": "Chorus 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-16",
        "text": "Hancur hatiku kau campakkan",
        "section": "Chorus 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-17",
        "text": "Bila memang tak cinta lepaskanlah diriku",
        "section": "Chorus 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-18",
        "text": "",
        "section": "Solo Kendang Koplo",
        "isBlankCue": true,
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-19",
        "text": "Kini kusadari semua janji-janjimu",
        "section": "Verse 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-20",
        "text": "Hanyalah dusta untuk merayuku",
        "section": "Verse 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-21",
        "text": "Cukup sudah sandiwaramu",
        "section": "Verse 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-22",
        "text": "Ku tak mau lagi terluka",
        "section": "Verse 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-23",
        "text": "Aku mah apa atuh... lepaskan diriku",
        "section": "Outro",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj01-24",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-02-semerbak",
    "title": "2. Semerbak",
    "artist": "Semerbak Bunga Terate - Rindi Safira",
    "bpm": 125,
    "defaultPresetId": "preset-golden-royal",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj02-01",
        "text": "",
        "section": "Intro Rampak",
        "isBlankCue": true,
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-02",
        "text": "Berasal dari rahim yang tak sama",
        "section": "Verse 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-03",
        "text": "Kami ada dan terus berlipat ganda",
        "section": "Verse 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-04",
        "text": "Dan disatukan oleh rasa yang sama",
        "section": "Verse 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-05",
        "text": "Persaudaraan ini kan kami jaga",
        "section": "Verse 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-06",
        "text": "",
        "section": "Jeda Kendang",
        "isBlankCue": true,
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-07",
        "text": "Berkali-kali kami coba dijatuhkan",
        "section": "Verse 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-08",
        "text": "Lihatlah kami tetap tak tergoyahkan",
        "section": "Verse 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-09",
        "text": "Ribuan kali kami coba dihentikan",
        "section": "Verse 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-10",
        "text": "Percayalah semangat tak akan padam",
        "section": "Verse 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-11",
        "text": "Hancurkan kami bila kau mampu",
        "section": "Pre-Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-12",
        "text": "Mendekatlah kami akan maju!",
        "section": "Pre-Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-13",
        "text": "Semerbak harum bunga terataiku",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-14",
        "text": "Bersemi indah dalam lubuk hati",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-15",
        "text": "Buang kebencian di dadamu",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-16",
        "text": "Mari bersama melangkah tanpa ragu",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-17",
        "text": "",
        "section": "Solo Terate",
        "isBlankCue": true,
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-18",
        "text": "Semerbak harum bunga terataiku",
        "section": "Chorus 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-19",
        "text": "Bersemi indah dalam lubuk hati",
        "section": "Chorus 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-20",
        "text": "Jayalah selalu SH Terate-ku",
        "section": "Outro",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj02-21",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-03-mekarlah",
    "title": "3. Mekarlah",
    "artist": "Mekarlah Bunga Terate - Rindi Safira",
    "bpm": 124,
    "defaultPresetId": "preset-dangdut-pantura",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj03-01",
        "text": "",
        "section": "Intro Rampak",
        "isBlankCue": true,
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-02",
        "text": "Mekarlah bunga teratai di jiwaku",
        "section": "Chorus 1",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-03",
        "text": "Tanamkan rasa persaudaraan hingga nanti",
        "section": "Chorus 1",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-04",
        "text": "Bersama dengan hati bersinar di dada",
        "section": "Chorus 1",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-05",
        "text": "Selamanya hingga hancurnya semesta",
        "section": "Chorus 1",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-06",
        "text": "",
        "section": "Jeda Kendang",
        "isBlankCue": true,
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-07",
        "text": "Selama bumi ini masih berpenghuni",
        "section": "Verse 1",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-08",
        "text": "Di situ kami akan tetap berdiri",
        "section": "Verse 1",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-09",
        "text": "Karena kami adalah saudara",
        "section": "Verse 1",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-10",
        "text": "Terikat dalam satu sumpah bersama",
        "section": "Verse 1",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-11",
        "text": "Berpijak di atas kesetiaan hati",
        "section": "Verse 2",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-12",
        "text": "Bersatu mengarungi hidup ini",
        "section": "Verse 2",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-13",
        "text": "Tanpa pembeda tersebar ke seluruh pelosok negeri",
        "section": "Verse 2",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-14",
        "text": "Saling menjaga merangkul melindungi",
        "section": "Verse 2",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-15",
        "text": "",
        "section": "Interlude Koplo",
        "isBlankCue": true,
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-16",
        "text": "Hitam baju yang selalu melekat",
        "section": "Bridge",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-17",
        "text": "Melambangkan persaudaraan yang kekal dan abadi",
        "section": "Bridge",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-18",
        "text": "Air putih simbol bahwa semua manusia",
        "section": "Bridge",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-19",
        "text": "Kan kembali ke pangkuan ibu pertiwi",
        "section": "Bridge",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-20",
        "text": "Mekarlah bunga teratai di jiwaku",
        "section": "Chorus 2",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-21",
        "text": "Tanamkan rasa persaudaraan hingga nanti",
        "section": "Chorus 2",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-22",
        "text": "Bersama dengan hati bersinar di dada",
        "section": "Chorus 2",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-23",
        "text": "Selamanya hingga hancurnya semesta",
        "section": "Chorus 2",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-24",
        "text": "Mekarlah... abadi selamanya",
        "section": "Outro",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj03-25",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-04-sedulur",
    "title": "4. Sedulur",
    "artist": "SHedulurku / Ireng-Ireng - Rindi Safira",
    "bpm": 130,
    "defaultPresetId": "preset-fire-chili",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj04-01",
        "text": "",
        "section": "Intro Rampak Kendang",
        "isBlankCue": true,
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-02",
        "text": "Iki dino sing ditunggu-tunggu",
        "section": "Verse 1",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-03",
        "text": "Kanggo ketemu njenengan sedulurku",
        "section": "Verse 1",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-04",
        "text": "Etan kidul kulon nganti tekan elor",
        "section": "Verse 1",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-05",
        "text": "Kanggo nyambut calon sedulur sing anyar",
        "section": "Verse 1",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-06",
        "text": "Sampun wancine ugo sampun wayahe",
        "section": "Verse 2",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-07",
        "text": "Ing dino iki kanggo dirayakne",
        "section": "Verse 2",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-08",
        "text": "Wingi ning angenku kanggo dino iki",
        "section": "Verse 2",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-09",
        "text": "Iso kumpul bebarengan dadi siji",
        "section": "Verse 2",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-10",
        "text": "",
        "section": "Senggol Kendang",
        "isBlankCue": true,
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-11",
        "text": "Ireng-ireng kui klambine",
        "section": "Chorus",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-12",
        "text": "Kain mori kui sabuke",
        "section": "Chorus",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-13",
        "text": "Iki PSHT jenenge",
        "section": "Chorus",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-14",
        "text": "Madiun kutho asale",
        "section": "Chorus",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-15",
        "text": "Lahir rahim sing bedo",
        "section": "Chorus",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-16",
        "text": "Ayo podo sing rukun",
        "section": "Chorus",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-17",
        "text": "Sae temen ajaran SH Terate",
        "section": "Chorus",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-18",
        "text": "",
        "section": "Interlude Rampak",
        "isBlankCue": true,
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-19",
        "text": "Ireng-ireng kui klambine",
        "section": "Chorus 2",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-20",
        "text": "Kain mori kui sabuke",
        "section": "Chorus 2",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-21",
        "text": "Sae temen seduluran saklawase",
        "section": "Outro",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj04-22",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-05-cinta-kasih",
    "title": "5. Cinta Kasih",
    "artist": "Cinta Kasih SH Terate - Rindi Safira",
    "bpm": 118,
    "defaultPresetId": "preset-retro-synth",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj05-01",
        "text": "",
        "section": "Intro Melodi",
        "isBlankCue": true,
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-02",
        "text": "Terang bersinar hati ini",
        "section": "Intro",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-03",
        "text": "Cinta batas yang kuingati",
        "section": "Intro",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-04",
        "text": "Janji setia persaudaraan ini harga mati",
        "section": "Intro",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-05",
        "text": "Tekad jiwaku ini rela jatuh berdiri",
        "section": "Verse 1",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-06",
        "text": "Demi sebuah gelar abadi di dunia ini",
        "section": "Verse 1",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-07",
        "text": "Ajaran yang kupatuhi akan terus tertanam di hati",
        "section": "Verse 1",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-08",
        "text": "Ingatkan aku ini arti cinta yang dibatasi",
        "section": "Verse 1",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-09",
        "text": "Hujan panas kuhadapi",
        "section": "Pre-Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-10",
        "text": "Pengabdian yang kujalani",
        "section": "Pre-Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-11",
        "text": "Aku mengerti cinta kasih ini",
        "section": "Pre-Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-12",
        "text": "Terang bersinar hati ini",
        "section": "Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-13",
        "text": "Cinta batas yang kuingati",
        "section": "Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-14",
        "text": "Janji setia persaudaraan ini harga mati",
        "section": "Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-15",
        "text": "Hilang nyawa bukan ilusi",
        "section": "Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-16",
        "text": "Kain mori sudah menanti",
        "section": "Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-17",
        "text": "SH Terate selalu di hati",
        "section": "Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-18",
        "text": "Akan kekal jaya abadi",
        "section": "Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-19",
        "text": "",
        "section": "Outro Melodi",
        "isBlankCue": true,
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj05-20",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-06-satrio-terate",
    "title": "6. Satrio Terate",
    "artist": "Rindi Safira / Admaja Tarantula",
    "bpm": 110,
    "defaultPresetId": "preset-golden-royal",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj06-01",
        "text": "",
        "section": "Intro Gamelan",
        "isBlankCue": true,
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-02",
        "text": "Mangesti mangastuti marem",
        "section": "Verse 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-03",
        "text": "Ono ing rino lawan wengi",
        "section": "Verse 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-04",
        "text": "Dimen ati kroso marem",
        "section": "Verse 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-05",
        "text": "Dadio manungso kang sejati",
        "section": "Verse 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-06",
        "text": "Winastan satrio pilih tanding",
        "section": "Verse 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-07",
        "text": "Sinawang koyo tirtone wening",
        "section": "Verse 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-08",
        "text": "Hanjunjung roso sedulurane",
        "section": "Verse 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-09",
        "text": "Tego lorone ora tego patine",
        "section": "Verse 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-10",
        "text": "",
        "section": "Jeda Gamelan",
        "isBlankCue": true,
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-11",
        "text": "Wong kang suci adoh beboyo pati",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-12",
        "text": "Linambaran tulus jeroning ati",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-13",
        "text": "Ojo dadi sing rumongso biso",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-14",
        "text": "Nanging dadio sing biso rumongso",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-15",
        "text": "Tan ginambar kembange terate",
        "section": "Chorus 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-16",
        "text": "Biso urip ono ing ngendi wae",
        "section": "Chorus 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-17",
        "text": "Dadi kawulo amung sak dermo",
        "section": "Chorus 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-18",
        "text": "Mobah mosik kersane Hyang Sukmo",
        "section": "Chorus 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-19",
        "text": "Satrio Terate sejati... saklawase",
        "section": "Outro",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj06-20",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-07-setia-hati-bersinar",
    "title": "7. Setia Hati Bersinar",
    "artist": "Rindi Safira / Trijati",
    "bpm": 122,
    "defaultPresetId": "preset-lui-cyber",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj07-01",
        "text": "",
        "section": "Intro Rampak",
        "isBlankCue": true,
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-02",
        "text": "Mekarlah bunga teratai di jiwaku",
        "section": "Verse 1",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-03",
        "text": "Tanamkan rasa persaudaraan hingga nanti",
        "section": "Verse 1",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-04",
        "text": "Bersama dengan hati bersinar di dada",
        "section": "Verse 1",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-05",
        "text": "Selamanya hingga hancurnya semesta",
        "section": "Verse 1",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-06",
        "text": "Selama bumi ini masih berpenghuni",
        "section": "Verse 2",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-07",
        "text": "Di situ kami akan tetap berdiri",
        "section": "Verse 2",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-08",
        "text": "Karena kami adalah saudara",
        "section": "Verse 2",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-09",
        "text": "Terikat dalam satu sumpah bersama",
        "section": "Verse 2",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-10",
        "text": "Berpijak di atas kesetiaan hati",
        "section": "Pre-Chorus",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-11",
        "text": "Bersatu mengarungi hidup ini",
        "section": "Pre-Chorus",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-12",
        "text": "Tanpa pembeda tersebar ke seluruh pelosok negeri",
        "section": "Pre-Chorus",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-13",
        "text": "Saling menjaga merangkul melindungi",
        "section": "Pre-Chorus",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-14",
        "text": "Hitam baju yang selalu melekat",
        "section": "Bridge",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-15",
        "text": "Melambangkan persaudaraan yang kekal dan abadi",
        "section": "Bridge",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-16",
        "text": "Air putih simbol bahwa semua manusia",
        "section": "Bridge",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-17",
        "text": "Akan kembali ke pangkuan ibu pertiwi",
        "section": "Bridge",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-18",
        "text": "Ora ono kamulyan tanpo paseduluran",
        "section": "Outro",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-19",
        "text": "PSHT Jaya Selamanya!",
        "section": "Outro",
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      },
      {
        "id": "sj07-20",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-lui-cyber",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-08-bunga-terate",
    "title": "8. Bunga Terate",
    "artist": "Pusaka Bunga Terate PSHT",
    "bpm": 116,
    "defaultPresetId": "preset-ballad-center",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj08-01",
        "text": "",
        "section": "Intro Syahdu",
        "isBlankCue": true,
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj08-02",
        "text": "Mekarlah kembang terate ing telogo",
        "section": "Verse 1",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj08-03",
        "text": "Sanadyan ing banyu lendhut tetep suci warnane",
        "section": "Verse 1",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj08-04",
        "text": "Koyo satrio sejati sing lumaku ing dalan bebener",
        "section": "Verse 1",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj08-05",
        "text": "Ora kegiur dening gemerlap donyo",
        "section": "Verse 1",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj08-06",
        "text": "Lambang paseduluran kang tulus lan murni",
        "section": "Verse 2",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj08-07",
        "text": "Ngiket ati saben wargo ing saindhenging nuswantoro",
        "section": "Verse 2",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj08-08",
        "text": "Tunggal banyu tunggal tekad manunggal rasa",
        "section": "Verse 2",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj08-09",
        "text": "Kembang terate... mekar selawase",
        "section": "Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj08-10",
        "text": "Madhangi roso ing sakjroning dodo",
        "section": "Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj08-11",
        "text": "Urip rukun gotong royong mbangun projo",
        "section": "Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj08-12",
        "text": "Kembang terate pusoko adi luhung",
        "section": "Outro",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj08-13",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-09-anak-kampung",
    "title": "9. Anak Kampung",
    "artist": "Linda Ayunda / Jimmy Palikat",
    "bpm": 132,
    "defaultPresetId": "preset-koplo-magenta",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj09-01",
        "text": "",
        "section": "Intro Ceria Koplo",
        "isBlankCue": true,
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-02",
        "text": "Memang aku ini anak orang miskin",
        "section": "Verse 1",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-03",
        "text": "Tiada apa-apa yang dapat ku berikan",
        "section": "Verse 1",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-04",
        "text": "Engkau memang cantik memang tidak padan",
        "section": "Verse 1",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-05",
        "text": "Dan tidak sepadan",
        "section": "Verse 1",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-06",
        "text": "Aku anak kampung tiada pelajaran",
        "section": "Verse 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-07",
        "text": "Kuli-kuli sahaja memang tidak padan",
        "section": "Verse 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-08",
        "text": "Cantik sangat kau itu banyak yang tergoda",
        "section": "Verse 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-09",
        "text": "Lagi orang kaya",
        "section": "Verse 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-10",
        "text": "",
        "section": "Senggol Kendang",
        "isBlankCue": true,
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-11",
        "text": "Tiada keretaku bawa kau jalan-jalan",
        "section": "Chorus",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-12",
        "text": "Rumahku pun tiada ada pun bapa punya",
        "section": "Chorus",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-13",
        "text": "Apalagi belanja mahu bayar hantaran",
        "section": "Chorus",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-14",
        "text": "Kahwin sama kamu",
        "section": "Chorus",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-15",
        "text": "Bukannya ku tidak suka sama kamu",
        "section": "Chorus 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-16",
        "text": "Tapi aku takut hidup kau kan sengsara",
        "section": "Chorus 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-17",
        "text": "Karena aku cinta",
        "section": "Chorus 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-18",
        "text": "Aku lepaskan kau sama orang lain",
        "section": "Chorus 2",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-19",
        "text": "",
        "section": "Solo Melodi",
        "isBlankCue": true,
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-20",
        "text": "Engkau masih muda cantik lagi menawan",
        "section": "Verse 3",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-21",
        "text": "Janganlah kau cari lelaki macam saya",
        "section": "Verse 3",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-22",
        "text": "Nanti kau menyesal tiada guna",
        "section": "Verse 3",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-23",
        "text": "Aku anak kampung... relakan diriku",
        "section": "Outro",
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      },
      {
        "id": "sj09-24",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-koplo-magenta",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-10-dirantai-digelangi-rindu",
    "title": "10. Dirantai Digelangi Rindu",
    "artist": "Exists / Slow Rock Koplo",
    "bpm": 92,
    "defaultPresetId": "preset-ballad-center",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj10-01",
        "text": "",
        "section": "Intro Slow Rock",
        "isBlankCue": true,
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj10-02",
        "text": "Mekar kelopak mawar di sudut jendela",
        "section": "Verse 1",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj10-03",
        "text": "Membawa bayangmu di dalam ingatanku",
        "section": "Verse 1",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj10-04",
        "text": "Dingin malam yang mencengkam sukma",
        "section": "Verse 1",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj10-05",
        "text": "Menggamit kenangan bersamamu",
        "section": "Verse 1",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj10-06",
        "text": "Bukan ku pinta perpisahan ini",
        "section": "Pre-Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj10-07",
        "text": "Bukan ku rela kau pergi menjauh",
        "section": "Pre-Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj10-08",
        "text": "Namun takdir memisahkan kita berdua",
        "section": "Pre-Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj10-09",
        "text": "Terasa diriku dirantai digelangi rindu",
        "section": "Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj10-10",
        "text": "Menanti saat kita kan bertemu semula",
        "section": "Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj10-11",
        "text": "Biar seribu tahun ku kan tetap setia",
        "section": "Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj10-12",
        "text": "Mengharap kasihmu kembali menyala",
        "section": "Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj10-13",
        "text": "",
        "section": "Solo Gitar Melodi",
        "isBlankCue": true,
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj10-14",
        "text": "Dirantai digelangi rindu... abadi di hatiku",
        "section": "Outro",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj10-15",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-11-siapa-dihatimu",
    "title": "11. Siapa Dihatimu",
    "artist": "Rahmat Ekamatra",
    "bpm": 90,
    "defaultPresetId": "preset-retro-synth",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj11-01",
        "text": "",
        "section": "Intro Melodi Nostalgia",
        "isBlankCue": true,
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj11-02",
        "text": "Di kamar ini ku sendiri lagi",
        "section": "Verse 1",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj11-03",
        "text": "Merenung gambar yang semakin pudar",
        "section": "Verse 1",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj11-04",
        "text": "Terguris luka di dalam hatiku",
        "section": "Verse 1",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj11-05",
        "text": "Bila mengenangkan kasihmu yang lalu",
        "section": "Verse 1",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj11-06",
        "text": "Dulu kau kata akulah segalanya",
        "section": "Pre-Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj11-07",
        "text": "Kini kau ubah pendirianmu",
        "section": "Pre-Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj11-08",
        "text": "Siapa di hatimu yang sebenarnya?",
        "section": "Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj11-09",
        "text": "Mengapa ku yang kau persalahkan?",
        "section": "Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj11-10",
        "text": "Andai ada insan lain menggantikan diriku",
        "section": "Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj11-11",
        "text": "Katakanlah... biar ku undur diri",
        "section": "Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj11-12",
        "text": "",
        "section": "Solo Gitar Melow",
        "isBlankCue": true,
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj11-13",
        "text": "Siapa di hatimu... kini kau sembunyikan...",
        "section": "Outro",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj11-14",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-12-keong-racun",
    "title": "12. Keong Racun",
    "artist": "Lissa / Koplo Horeg",
    "bpm": 135,
    "defaultPresetId": "preset-fire-chili",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj12-01",
        "text": "",
        "section": "Intro Kendang Rampak",
        "isBlankCue": true,
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj12-02",
        "text": "Dasar kau keong racun",
        "section": "Verse 1",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj12-03",
        "text": "Baru kenal udah ngajak tidur",
        "section": "Verse 1",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj12-04",
        "text": "Ngomong nggak sopan santun",
        "section": "Verse 1",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj12-05",
        "text": "Kau pikir aku cewek murahan!",
        "section": "Verse 1",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj12-06",
        "text": "Dasar kau hidung belang",
        "section": "Verse 2",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj12-07",
        "text": "Suka goda setiap wanita",
        "section": "Verse 2",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj12-08",
        "text": "Lirik kanan lirik kiri",
        "section": "Verse 2",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj12-09",
        "text": "Mata keranjang nggak tahu diri!",
        "section": "Verse 2",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj12-10",
        "text": "",
        "section": "Senggol Kendang Mutlak",
        "isBlankCue": true,
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj12-11",
        "text": "Sorry ya jangan samakan aku",
        "section": "Chorus",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj12-12",
        "text": "Dengan cewek-cewek yang gampang kau rayu",
        "section": "Chorus",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj12-13",
        "text": "Mulutmu manis semanis madu",
        "section": "Chorus",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj12-14",
        "text": "Tapi hatimu berbisa seperti racun!",
        "section": "Chorus",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj12-15",
        "text": "Dasar keong racun... minggir sana!",
        "section": "Outro",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj12-16",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-13-mutiara",
    "title": "13. Mutiara",
    "artist": "Mutiara Hidupku - Rhoma Irama",
    "bpm": 98,
    "defaultPresetId": "preset-golden-royal",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj13-01",
        "text": "",
        "section": "Intro Mandolin",
        "isBlankCue": true,
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj13-02",
        "text": "Mutiara hidupku",
        "section": "Verse 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj13-03",
        "text": "Kau perhiasan hatiku",
        "section": "Verse 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj13-04",
        "text": "Betapa ku sayang padamu",
        "section": "Verse 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj13-05",
        "text": "Mutiara kasihku",
        "section": "Verse 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj13-06",
        "text": "Kau belahan jiwaku",
        "section": "Verse 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj13-07",
        "text": "Ku kan selalu menjagamu",
        "section": "Verse 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj13-08",
        "text": "Tiada yang dapat menggantikan dirimu",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj13-09",
        "text": "Di dalam lubuk sanubariku",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj13-10",
        "text": "Engkaulah bidadari duniaku",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj13-11",
        "text": "Penerang di setiap langkah hidupku",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj13-12",
        "text": "",
        "section": "Solo Suling Dangdut",
        "isBlankCue": true,
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj13-13",
        "text": "Mutiara hidupku... selamanya...",
        "section": "Outro",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj13-14",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-14-bukan-ku-tak-sudi",
    "title": "14. Bukan Ku Tak Sudi",
    "artist": "Saleem Iklim",
    "bpm": 94,
    "defaultPresetId": "preset-ballad-center",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj14-01",
        "text": "",
        "section": "Intro Slow Rock",
        "isBlankCue": true,
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj14-02",
        "text": "Bukan ku tak sudi menerima cintamu",
        "section": "Verse 1",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj14-03",
        "text": "Bukan ku membenci ketulusan hatimu",
        "section": "Verse 1",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj14-04",
        "text": "Tetapi diriku tak layak untukmu",
        "section": "Verse 1",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj14-05",
        "text": "Insan kerdil yang tiada berharta",
        "section": "Verse 1",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj14-06",
        "text": "Jalan hidupku berliku dan berduri",
        "section": "Pre-Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj14-07",
        "text": "Tak sanggup ku melihatmu sengsara nanti",
        "section": "Pre-Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj14-08",
        "text": "Bukan ku tak sudi... maafkanlah aku",
        "section": "Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj14-09",
        "text": "Biarlah ku bawa luka ini sendiri",
        "section": "Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj14-10",
        "text": "Cari saja insan yang lebih sempurna",
        "section": "Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj14-11",
        "text": "Yang kan membimbingmu ke puncak bahagia",
        "section": "Chorus",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj14-12",
        "text": "",
        "section": "Solo Gitar Melayu",
        "isBlankCue": true,
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj14-13",
        "text": "Bukan ku tak sudi... relakan diriku pergi",
        "section": "Outro",
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      },
      {
        "id": "sj14-14",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-ballad-center",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-15-tabah",
    "title": "15. Tabah",
    "artist": "Dayu AG",
    "bpm": 96,
    "defaultPresetId": "preset-golden-royal",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj15-01",
        "text": "",
        "section": "Intro Suling Sendu",
        "isBlankCue": true,
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj15-02",
        "text": "Kutabahkan hatiku menerima cobaan ini",
        "section": "Verse 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj15-03",
        "text": "Walau perih kurasa saat kau mendua",
        "section": "Verse 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj15-04",
        "text": "Mengapa janji suci yang pernah kau bina",
        "section": "Verse 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj15-05",
        "text": "Kini hancur lebur tanpa sisa",
        "section": "Verse 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj15-06",
        "text": "Ku ikhlaskan engkau bersamanya",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj15-07",
        "text": "Bila itu membuatmu bahagia",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj15-08",
        "text": "Biar air mata ini menjadi saksi",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj15-09",
        "text": "Betapa tulusnya cinta yang ku beri",
        "section": "Chorus",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj15-10",
        "text": "",
        "section": "Interlude Suling Kendang",
        "isBlankCue": true,
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj15-11",
        "text": "Tabah hatiku... pasrah pada ilahi",
        "section": "Outro",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj15-12",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-16-karmila",
    "title": "16. Karmila",
    "artist": "Farid Hardja",
    "bpm": 130,
    "defaultPresetId": "preset-anthem-punch",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj16-01",
        "text": "",
        "section": "Intro Rock Ceria",
        "isBlankCue": true,
        "presetId": "preset-anthem-punch",
        "styleOverrides": {}
      },
      {
        "id": "sj16-02",
        "text": "Kuingat kembali masa yang telah lalu",
        "section": "Verse 1",
        "presetId": "preset-anthem-punch",
        "styleOverrides": {}
      },
      {
        "id": "sj16-03",
        "text": "Kala ku memandang wajahmu yang manis",
        "section": "Verse 1",
        "presetId": "preset-anthem-punch",
        "styleOverrides": {}
      },
      {
        "id": "sj16-04",
        "text": "Gayamu yang lincah memikat hatiku",
        "section": "Verse 1",
        "presetId": "preset-anthem-punch",
        "styleOverrides": {}
      },
      {
        "id": "sj16-05",
        "text": "Oh Karmila... gadis pujaanku",
        "section": "Verse 1",
        "presetId": "preset-anthem-punch",
        "styleOverrides": {}
      },
      {
        "id": "sj16-06",
        "text": "Karmila... kau membuat daku terlena",
        "section": "Chorus",
        "presetId": "preset-anthem-punch",
        "styleOverrides": {}
      },
      {
        "id": "sj16-07",
        "text": "Karmila... senyumanmu menggoda jiwa",
        "section": "Chorus",
        "presetId": "preset-anthem-punch",
        "styleOverrides": {}
      },
      {
        "id": "sj16-08",
        "text": "Karmila... kini kau ada di mana?",
        "section": "Chorus",
        "presetId": "preset-anthem-punch",
        "styleOverrides": {}
      },
      {
        "id": "sj16-09",
        "text": "Hatiku selalu memanggil namamu",
        "section": "Chorus",
        "presetId": "preset-anthem-punch",
        "styleOverrides": {}
      },
      {
        "id": "sj16-10",
        "text": "",
        "section": "Solo Gitar Ceria",
        "isBlankCue": true,
        "presetId": "preset-anthem-punch",
        "styleOverrides": {}
      },
      {
        "id": "sj16-11",
        "text": "Oh Karmila... kau tetap di hatiku!",
        "section": "Outro",
        "presetId": "preset-anthem-punch",
        "styleOverrides": {}
      },
      {
        "id": "sj16-12",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-anthem-punch",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-17-asmara",
    "title": "17. Asmara",
    "artist": "Setia Band / Charly Van Houten",
    "bpm": 104,
    "defaultPresetId": "preset-retro-synth",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj17-01",
        "text": "",
        "section": "Intro Piano Melodi",
        "isBlankCue": true,
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj17-02",
        "text": "Asmara telah terkalung indah",
        "section": "Verse 1",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj17-03",
        "text": "Dan membuatku tersenyum bahagia",
        "section": "Verse 1",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj17-04",
        "text": "Saat kau genggam erat jemariku",
        "section": "Verse 1",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj17-05",
        "text": "Kini kau pergi meninggalkanku sendiri",
        "section": "Pre-Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj17-06",
        "text": "Tanpa kata tanpa pamit lagi",
        "section": "Pre-Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj17-07",
        "text": "Asmara... kini kau ada di mana?",
        "section": "Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj17-08",
        "text": "Tolong kembalikan rasa cinta yang pernah ada",
        "section": "Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj17-09",
        "text": "Jangan biarkan ku tenggelam dalam duka",
        "section": "Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj17-10",
        "text": "Karna ku masih sangat mencintaimu",
        "section": "Chorus",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj17-11",
        "text": "",
        "section": "Solo Melodi Asmara",
        "isBlankCue": true,
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj17-12",
        "text": "Asmara... pulanglah padaku...",
        "section": "Outro",
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      },
      {
        "id": "sj17-13",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-retro-synth",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-18-mawar-hitam",
    "title": "18. Mawar Hitam",
    "artist": "Tipe-X",
    "bpm": 138,
    "defaultPresetId": "preset-monochrome-stadium",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj18-01",
        "text": "",
        "section": "Intro Terompet Ska",
        "isBlankCue": true,
        "presetId": "preset-monochrome-stadium",
        "styleOverrides": {}
      },
      {
        "id": "sj18-02",
        "text": "Luka itu memang terlalu berat untukmu",
        "section": "Verse 1",
        "presetId": "preset-monochrome-stadium",
        "styleOverrides": {}
      },
      {
        "id": "sj18-03",
        "text": "Terlalu dalam untuk kau rasakan",
        "section": "Verse 1",
        "presetId": "preset-monochrome-stadium",
        "styleOverrides": {}
      },
      {
        "id": "sj18-04",
        "text": "Tak seorang pun mengerti deritamu",
        "section": "Verse 1",
        "presetId": "preset-monochrome-stadium",
        "styleOverrides": {}
      },
      {
        "id": "sj18-05",
        "text": "Kau terpuruk dalam kesunyian malam",
        "section": "Verse 1",
        "presetId": "preset-monochrome-stadium",
        "styleOverrides": {}
      },
      {
        "id": "sj18-06",
        "text": "Jangan menangis lagi mawar hitamku",
        "section": "Chorus",
        "presetId": "preset-monochrome-stadium",
        "styleOverrides": {}
      },
      {
        "id": "sj18-07",
        "text": "Hapuskan air mata dari pipimu",
        "section": "Chorus",
        "presetId": "preset-monochrome-stadium",
        "styleOverrides": {}
      },
      {
        "id": "sj18-08",
        "text": "Bangkitlah dan tatap masa depanmu",
        "section": "Chorus",
        "presetId": "preset-monochrome-stadium",
        "styleOverrides": {}
      },
      {
        "id": "sj18-09",
        "text": "Dunia ini masih indah untukmu!",
        "section": "Chorus",
        "presetId": "preset-monochrome-stadium",
        "styleOverrides": {}
      },
      {
        "id": "sj18-10",
        "text": "",
        "section": "Solo Terompet Ska",
        "isBlankCue": true,
        "presetId": "preset-monochrome-stadium",
        "styleOverrides": {}
      },
      {
        "id": "sj18-11",
        "text": "Mawar hitam... tersenyumlah kembali!",
        "section": "Outro",
        "presetId": "preset-monochrome-stadium",
        "styleOverrides": {}
      },
      {
        "id": "sj18-12",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-monochrome-stadium",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-19-yank",
    "title": "19. Yank",
    "artist": "Wali",
    "bpm": 126,
    "defaultPresetId": "preset-fire-chili",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj19-01",
        "text": "",
        "section": "Intro Wali Melodi",
        "isBlankCue": true,
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj19-02",
        "text": "Yank... coba kau jujur padaku",
        "section": "Verse 1",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj19-03",
        "text": "Yank... foto siapa di dompetmu?",
        "section": "Verse 1",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj19-04",
        "text": "Yank... jangan kau bohong padaku",
        "section": "Verse 1",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj19-05",
        "text": "Yank... aku tahu kau selingkuh!",
        "section": "Verse 1",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj19-06",
        "text": "",
        "section": "Senggol Kendang",
        "isBlankCue": true,
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj19-07",
        "text": "Kurang apa diriku ini?",
        "section": "Chorus",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj19-08",
        "text": "Hingga kau tega menduakan cintaku",
        "section": "Chorus",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj19-09",
        "text": "Kau bersumpah setia tapi kenyataannya",
        "section": "Chorus",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj19-10",
        "text": "Kau main gila di belakangku!",
        "section": "Chorus",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj19-11",
        "text": "",
        "section": "Solo Melodi",
        "isBlankCue": true,
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj19-12",
        "text": "Yank... keterlaluan kamu!",
        "section": "Outro",
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      },
      {
        "id": "sj19-13",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-fire-chili",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-20-emang-dasar",
    "title": "20. Emang Dasar",
    "artist": "Wali",
    "bpm": 130,
    "defaultPresetId": "preset-dangdut-pantura",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj20-01",
        "text": "",
        "section": "Intro Kendang Rampak",
        "isBlankCue": true,
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj20-02",
        "text": "Dari awal ku tak pernah menduga",
        "section": "Verse 1",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj20-03",
        "text": "Kau sungguh tega menduakan cinta",
        "section": "Verse 1",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj20-04",
        "text": "Di depan mataku kau berpura setia",
        "section": "Verse 1",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj20-05",
        "text": "Di belakangku kau main asmara!",
        "section": "Verse 1",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj20-06",
        "text": "Emang dasar kau buaya darat!",
        "section": "Chorus",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj20-07",
        "text": "Emang dasar kau hidung belang!",
        "section": "Chorus",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj20-08",
        "text": "Tak pernah puas dengan satu wanita",
        "section": "Chorus",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj20-09",
        "text": "Kini ku tahu siapa dirimu!",
        "section": "Chorus",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj20-10",
        "text": "",
        "section": "Interlude Solo Kendang",
        "isBlankCue": true,
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj20-11",
        "text": "Emang dasar... pergi kau dari hidupku!",
        "section": "Outro",
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      },
      {
        "id": "sj20-12",
        "text": "",
        "section": "Selesai",
        "isBlankCue": true,
        "presetId": "preset-dangdut-pantura",
        "styleOverrides": {}
      }
    ]
  },
  {
    "id": "sanjaya-21-gusdur",
    "title": "21. Gusdur",
    "artist": "Syiir Tanpo Waton - K.H. Abdurrahman Wahid",
    "bpm": 78,
    "defaultPresetId": "preset-golden-royal",
    "transitionPolicy": "strict-single",
    "cues": [
      {
        "id": "sj21-01",
        "text": "",
        "section": "Intro Sholawat",
        "isBlankCue": true,
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-02",
        "text": "Astaghfirullah robbal baroya",
        "section": "Sholawat",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-03",
        "text": "Astaghfirullah minal khothoya",
        "section": "Sholawat",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-04",
        "text": "Robbi zidni 'ilman nafi'a",
        "section": "Sholawat",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-05",
        "text": "Wawaffiqni 'amalan sholiha",
        "section": "Sholawat",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-06",
        "text": "Ngawiti ingsun nglaras syi'iran",
        "section": "Bait 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-07",
        "text": "Kelawan muji marang Pengeran",
        "section": "Bait 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-08",
        "text": "Kang paring rohmat lan kenikmatan",
        "section": "Bait 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-09",
        "text": "Rino wengine tanpo pitungan",
        "section": "Bait 1",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-10",
        "text": "Akeh kang apal Qur'an Haditse",
        "section": "Bait 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-11",
        "text": "Seneng ngafirke marang liyane",
        "section": "Bait 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-12",
        "text": "Kafir e dewe gak digatekke",
        "section": "Bait 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-13",
        "text": "Yen isih kotor ati akale",
        "section": "Bait 2",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-14",
        "text": "Gampang kabujuk nafsu angkoro",
        "section": "Bait 3",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-15",
        "text": "Ing pepaesan gebyare ndunyo",
        "section": "Bait 3",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-16",
        "text": "Iri lan meri sugihe tonggo",
        "section": "Bait 3",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-17",
        "text": "Mulo atine peteng lan nisto",
        "section": "Bait 3",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-18",
        "text": "Ayo sedulur podo elingo",
        "section": "Bait 4",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-19",
        "text": "Urip ning ndunyo amung sedelo",
        "section": "Bait 4",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-20",
        "text": "Nggoleko sangu kanggo akhirat",
        "section": "Bait 4",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-21",
        "text": "Mumpung isih ono wektu tobat",
        "section": "Bait 4",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-22",
        "text": "Astaghfirullah robbal baroya",
        "section": "Sholawat Penutup",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-23",
        "text": "Astaghfirullah minal khothoya",
        "section": "Sholawat Penutup",
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      },
      {
        "id": "sj21-24",
        "text": "",
        "section": "Doa Selesai",
        "isBlankCue": true,
        "presetId": "preset-golden-royal",
        "styleOverrides": {}
      }
    ]
  }
];
