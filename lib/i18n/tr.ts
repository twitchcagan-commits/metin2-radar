/**
 * Tüm kullanıcıya görünen metinler burada. Bileşen içine string gömme.
 */
export const tr = {
  site: {
    name: 'Metin2 Radar',
    tagline: 'Sıralama satılmaz. Ölçülür.',
    description:
      'Türkiye Metin2 PVP sunucuları için bağımsız ölçüm ve takip platformu. Sunucu yaşıyor mu, ne kadar dayanır?',
  },

  nav: {
    home: 'Ana sayfa',
    calendar: 'Takvim',
    graveyard: 'Mezarlık',
    owners: 'Sahipler',
    admin: 'Yönetim',
  },

  // VERİ SUNUM KURALI: her sayının yanında kaynağı yazar.
  source: {
    declared: 'sunucunun beyanı, doğrulanmadı',
    declaredShort: 'beyan',
    measured: 'bağımsız ölçüm',
    measuredShort: 'ölçüm',
    explainDeclared:
      'Bu sayıyı sunucunun kendi sayacından okuduk. Doğruluğunu kontrol edemeyiz; sunucular bu sayıyı şişirebilir.',
    explainMeasured:
      'Bu sayıyı sunucudan bağımsız olarak biz ölçtük: Discord API, oyun portu bağlantısı ve kendi tıklama verimiz.',
  },

  metric: {
    trend7d: '7 günlük trend',
    trend30d: '30 günlük trend',
    siteOnline: 'Site sayacı',
    discordOnline: 'Discord aktif',
    discordMembers: 'Discord üye',
    uptime: 'Erişilebilirlik',
    score: 'Radar skoru',
    lifespan: 'Yaşam süresi',
    peak: 'Zirve',
    lastSeen: 'Son görülme',
    dayUnit: 'gün',
  },

  score: {
    title: 'Radar skoru',
    outOf: '/ 100',
    breakdown: 'Skor kırılımı',
    parts: {
      trend: 'Trend',
      clicks: 'Tıklama ilgisi',
      discord: 'Discord aktivitesi',
      uptime: 'Erişilebilirlik',
      lifespan: 'Yaşam süresi',
      penalty: 'Flag cezası',
    },
    note: 'Sunucunun kendi beyan ettiği online sayısı skora girmez.',
  },

  flag: {
    title: 'Manipülasyon sinyalleri',
    none: 'Şu an aktif bir manipülasyon sinyali yok.',
    kinds: {
      flatline: 'Düz çizgi sayaç',
      no_diurnal: 'Gün/gece döngüsü yok',
      step_jump: 'Ani basamak sıçraması',
      round_numbers: 'Yuvarlak sayı deseni',
      counter_offline: 'Sayaç okunamıyor',
    },
    explain: {
      flatline:
        'Sunucunun online sayacı 24 saattir neredeyse hiç değişmiyor. Gerçek oyuncu sayısı gün içinde dalgalanır.',
      no_diurnal:
        'Gerçek sunucularda gece dip, akşam zirve olur. Bu sunucuda o desen yok.',
      step_jump:
        'Sayaç bir anda sıçrayıp o seviyede kaldı. Çarpan elle değiştirilmiş olabilir.',
      round_numbers:
        'Örneklerin çoğu 50nin katı. Sayı hesaplanmıyor, uyduruluyor olabilir.',
      counter_offline:
        'Sunucunun sayacına erişemiyoruz. Site kapalı ya da sayaç kaldırılmış olabilir.',
    },
  },

  status: {
    upcoming: 'Açılacak',
    active: 'Açık',
    dead: 'Kapandı',
  },

  serverType: {
    emek: 'Emek',
    orta_emek: 'Orta emek',
    zor_emek: 'Zor emek',
    wslik: 'WSlik',
    farm: 'Farm',
    global: 'Global',
    official: 'Resmî',
  },

  action: {
    download: 'İndir',
    website: 'Siteye git',
    discord: 'Discord',
    details: 'Detay',
    retry: 'Tekrar dene',
  },

  ad: {
    label: 'Reklam',
    note: 'Reklamlar sıralamayı etkilemez.',
  },

  empty: {
    noServers: {
      title: 'Henüz sunucu yok',
      line: 'Takip edilmesini istediğin sunucuyu Discordumuzdan bildirebilirsin.',
    },
    noData: {
      title: 'Yeterli ölçüm yok',
      line: 'Bu sunucuyu yeni izlemeye aldık. İlk grafik birkaç saat içinde oluşur.',
    },
    noCalendar: {
      title: 'Yaklaşan açılış yok',
      line: 'Yeni açılış duyurulduğunda burada geri sayımıyla görünür.',
    },
    noGraveyard: {
      title: 'Mezarlık boş',
      line: 'İzlediğimiz sunucuların hiçbiri henüz kapanmadı.',
    },
  },

  error: {
    generic: 'Bir şeyler ters gitti.',
    notFound: 'Aradığın sayfa yok.',
  },

  time: {
    countdownDays: 'g',
    countdownHours: 's',
    countdownMinutes: 'd',
    countdownSeconds: 'sn',
    timezoneNote: 'Tüm saatler Türkiye saatidir.',
  },
} as const;

export type Tr = typeof tr;
