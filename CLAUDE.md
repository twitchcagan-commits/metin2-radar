# Metin2 Radar

Türkiye'deki Metin2 PVP (özel) sunucuları için **ölçüm ve takip** platformu.

Rakipler (metin2pvp.com, epvpserverler, pvpler.net) sıralamayı para karşılığı satıyor.
**Bizim farkımız: sıralama satılmaz, ölçülen veriye göre belirlenir.** Reklam ayrı ve
"Reklam" etiketli; sıralamaya hiçbir etkisi yok.

Cevapladığımız soru "kaç kişi var" değil: **"bu sunucu yaşıyor mu, ne kadar dayanacak"**.
Sunucu sahipleri online sayaçlarını 10-100x şişiriyor. Bu bizim için sorun değil, çünkü
mutlak sayıyı değil **trendi** ve **manipülasyon sinyallerini** yayınlıyoruz.

---

## Mutlak kısıtlar — ihlal etme

- **Hiçbir ücretli servis, plan veya API yok.** Kredi kartı istenen hiçbir şey kullanılmaz.
- İzinli servisler: Vercel Hobby, Supabase Free, GitHub Actions (private repo ücretsiz
  kotası), Discord Developer, Cloudflare ücretsiz katman.
- **Periyodik iş asla Vercel cron'a konmaz** — Hobby'de günde 1 kez çalışır.
  Tüm periyodik işler GitHub Actions workflow'u.
- Supabase Free 500MB. Veri büyümesi baştan sınırlı (aşağıda retention).
- Ücretli/şüpheli scraping servisi, proxy servisi, ücretli veri sağlayıcı yok.
- **Sırlar repoya girmez.** `.env.local` gitignore'da, CI sırları repository secrets'tan.
- Teknik bir kısıt bu kuralla çelişmeye zorlarsa **dur ve sor**. Sessizce ücretliye geçme.

## Stack

| Katman | Seçim |
| --- | --- |
| Web | Next.js 15 App Router, TypeScript strict, Tailwind 3 |
| Veri | Supabase (Postgres + Auth + Storage), RLS açık |
| Toplayıcı | `collector/` altında ayrı TS script, GitHub Actions `*/10 * * * *` |
| Discord | HTTP Interactions endpoint (ed25519 imza). **Websocket/gateway bot YOK.** |
| Grafik | recharts (varsayılan görünüm kullanılmaz) |
| Font | `geist` paketi, self-hosted, next/font |
| Deploy | Vercel Hobby |

## Klasör yapısı

```
app/                    Next.js App Router sayfaları ve route handler'ları
  globals.css           Tasarım token'ları — TEK KAYNAK, hex/px başka yerde yazılmaz
  api/discord/          Discord HTTP interactions (Faz 5)
components/             Paylaşılan UI bileşenleri
collector/              10 dakikalık toplayıcı (Discord widget, site sayacı, oyun portu)
lib/
  constants.ts          Enum'lar, retention/timeout sabitleri
  env.ts                Zod ile ortam değişkeni doğrulama
  format.ts             Tarih/sayı/yüzde biçimleme (Europe/Istanbul)
  i18n/tr.ts            TÜM kullanıcı metinleri — bileşene string gömme
  supabase/             types.ts (şema tipleri), server.ts (read/service istemci)
scripts/                seed.ts, register-commands.ts (Faz 5)
supabase/migrations/    SQL migration'ları
docs/PLAN.md            Faz planı ve tamamlanma kriterleri
.github/workflows/      collect.yml, daily.yml, announce.yml
```

## Komutlar

```bash
npm run dev            # geliştirme sunucusu
npm run check          # typecheck + lint + test — her faz sonunda YEŞİL olmalı
npm run seed           # 5 örnek sunucu + 2 sahip ekler
npm run collect:once   # toplayıcıyı yerelde tek seferlik çalıştırır (Faz 1)
```

## Veri modeli özeti

- `servers` — sunucu kaydı, `owner_key` ile `owners`'a bağlı, `counter_url`/`counter_selector`
  site sayacını kazımak için.
- `metrics_raw` — 10 dakikalık ham örnek. **30 günden eskisi silinir.**
  Tavan: 100 sunucu × 144 örnek/gün × 30 gün ≈ 430k satır. Bunu aşacak tasarım yapma.
- `metrics_daily` — kalıcı günlük özet. 30 günden eski grafikler buradan okunur.
  Silmeden **önce** `rollup_metrics_daily()` çağrılır (`prune_metrics_raw()` bunu yapar).
- `clicks` — kendi tıklama verimiz, en güvenilir sinyal. `ip_hash = sha256(ip + günlük tuz)`,
  **ham IP saklanmaz**. Ham satırlar RLS ile kapalı; sayımlar `clicks_daily` görünümünden.
- `flags` — manipülasyon sinyalleri, sunucu sayfasında açıkça gösterilir.
- `scores` — günlük 0-100 skor + `breakdown` jsonb.
- `ads` — reklam envanteri. **Sıralamayı etkilemez.**
- `votes` — Discord girişi zorunlu, hesap yaşı < 30 gün ise oy sayılmaz.

**RLS**: public tablolar sadece SELECT. Yazma yalnızca `service_role` (collector, job'lar)
ve admin. `clicks` tablosunun SELECT politikası yoktur.

## Manipülasyon tespiti (günlük)

| Sinyal | Kural |
| --- | --- |
| `flatline` | Son 24s `site_online` std sapma / ortalama < 0.02 |
| `no_diurnal` | Son 7 günün saatlik ortalamasında gece(04-06)/zirve(21-00) oranı > 0.85 |
| `step_jump` | Ardışık iki örnekte %50+ artış ve sonrasında o seviyede kalma |
| `round_numbers` | Son 100 örneğin %80+'ı 50'nin katı |

## Skor (0-100, günlük)

Trend %30 · kendi tıklama verimiz %25 · Discord aktivitesi %20 · uptime %15 ·
yaşam süresi %10 (logaritmik). Aktif her flag **-15p**, taban 0.
**Sunucunun beyan ettiği sayı skora girmez** — sadece trend hesabında kullanılır.

## Veri sunum kuralı — asla bozma

Her sayının yanında kaynağı ve doğrulanma durumu yazar:

- Sunucunun kendi sayacı → `⚠ sunucunun beyanı, doğrulanmadı`
- Discord / port / tıklama → `✅ bağımsız ölçüm`

Ana metrik **mutlak online sayısı değil, yüzde trend**.

## Görsel kalite — zorunlu

Varsayılan Tailwind görünümü kabul edilmez. Hedef his: **karanlık, teknik, ölçüm aleti**.
Ruh: Vercel dashboard, Linear, Battlemetrics. Oyun sitesi kitsch'i (parlak gradyan, glow,
neon çerçeve) yok.

- Tüm renk/aralık/radius/gölge/süre/easing değerleri `app/globals.css` içindeki CSS
  değişkenlerinde. Bileşende ham hex veya rastgele px yazma, 4px skalasını kullan.
- Easing: `--ease-out: cubic-bezier(0.16,1,0.3,1)` (ana),
  `--ease-spring: cubic-bezier(0.34,1.56,0.64,1)` (vurgu).
- Süreler: hover 150ms, bileşen girişi 400ms, sayfa geçişi 300ms. Dışına çıkma.
- **`transition: all` yasak.** Hangi property'nin geçeceğini yaz.
- Animasyon sadece `transform` ve `opacity`. Layout tetikleyen property animasyonu yok.
- Her hover en az iki katmanlı (ör. kart kalkar + kenarlık aydınlanır + ok kayar).
- `prefers-reduced-motion: reduce` ile tüm hareket kapanır. Opsiyonel değil.
- Yükleme durumunda spinner yok; gerçek içerikle **aynı boyutta** skeleton.
- Boş durumda "veri yok" yazıp geçme: ikon + ne yapılacağını söyleyen bir satır.
- `:focus-visible` ile net halka. `outline: none` yazıp bırakma.
- Yasak: kütüphane varsayılanı görünümü (özellikle recharts tooltip), mor-mavi gradyan,
  glassmorphism, emoji ikon (lucide-react kullan), gereksiz glow, aynı anda 3'ten fazla
  hareket eden şey, bilgi taşımayan animasyon.

## Kalite kuralları

- TypeScript strict, **`any` yok**. Dış veri (Discord API, kazıma sonucu) **zod** ile doğrulanır.
- Skor, flag tespiti ve rollup fonksiyonlarının vitest birim testleri olacak — sentetik veriyle:
  düz çizgi flatline **yakalanmalı**, gerçekçi sinüs eğrisi **yakalanmamalı**.
- Mobil öncelikli. Kullanıcıların çoğu telefondan gelecek. 360px'te taşma olmayacak.
- Arayüz Türkçe. Tarih/saat `Europe/Istanbul`.
- Her faz sonunda `npm run check` çalıştır; hepsi geçmeden "bitti" deme.

## Çalışma şekli

Fazlar sırayla yapılır, birleştirilmez, atlanmaz. Her faz sonunda 10 satırlık özet:
ne yapıldı, ne çalışıyor, nasıl test edilir, sıradaki faz ne.
Emin olunmayan **ürün** kararında varsayım yazılıp devam edilir.
Emin olunmayan **ücretsizlik** kısıtında durulur ve sorulur.
