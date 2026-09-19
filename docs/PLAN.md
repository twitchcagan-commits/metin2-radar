# Faz planı

Fazlar sırayla yapılır. Birleştirme ve atlama yok. Her fazın sonunda `npm run check`
yeşil olmadan faz kapanmaz.

Durum işaretleri: `[ ]` yapılmadı · `[~]` sürüyor · `[x]` bitti

---

## Faz 0 — İskelet, şema, tasarım sistemi `[x]`

| # | Görev | Tamamlanma kriteri |
| --- | --- | --- |
| 0.1 | Next.js 15 + TS strict + Tailwind kurulumu | `npm run typecheck` hatasız; `tsconfig.json` içinde `strict: true` ve `noUncheckedIndexedAccess` açık |
| 0.2 | `CLAUDE.md` | Stack, kısıtlar, klasör yapısı, komutlar, veri sunum kuralı, görsel kalite kuralları yazılı |
| 0.3 | `docs/PLAN.md` | Tüm fazlar görev listesi hâlinde, her görevin ölçülebilir kriteri var |
| 0.4 | `.env.example` + `.gitignore` | Tüm değişkenler örnekli; `.env.local` ignore'da; repoda hiçbir gerçek sır yok |
| 0.5 | Ortam değişkeni doğrulama (`lib/env.ts`) | Eksik değişkende anlaşılır Türkçe hata; public/service ayrımı var |
| 0.6 | Supabase migration — tüm tablolar | `supabase/migrations/0001_init.sql` içinde servers, owners, metrics_raw, metrics_daily, clicks, flags, scores, ads, votes tam |
| 0.7 | RLS politikaları | Her tabloda RLS açık; public sadece SELECT; `clicks` için SELECT politikası yok; reklamlar sadece yayındayken görünür |
| 0.8 | Retention + rollup SQL fonksiyonları | `rollup_metrics_daily(date)` ve `prune_metrics_raw(int)` tanımlı; prune silmeden önce rollup yapıyor |
| 0.9 | Şema TypeScript tipleri + Supabase istemcileri | `lib/supabase/types.ts` migration ile uyumlu; `readClient()` anon, `serviceClient()` service_role |
| 0.10 | Seed script | `npm run seed` 2 sahip + 5 sunucu (upcoming/active/dead karışık) yazar |
| 0.11 | Türkçe metin tablosu | `lib/i18n/tr.ts` var; bileşenlerde gömülü string yok |
| 0.12 | **Tasarım sistemi** (`app/globals.css`) | Renk/aralık/radius/gölge/süre/easing CSS değişkenleri tanımlı; koyu tema; tabular-nums; `:focus-visible` halkası; `prefers-reduced-motion` bloğu; skeleton shimmer |
| 0.13 | `npm run check` yeşil | typecheck + lint + test üçü de hatasız |

---

## Faz 1 — Toplayıcı `[x]`

| # | Görev | Tamamlanma kriteri |
| --- | --- | --- |
| 1.1 | Discord widget okuyucu | `GET /api/guilds/{id}/widget.json` zod ile doğrulanır; widget kapalıysa hata kaydedilir, sunucu düşürülmez |
| 1.2 | Site sayacı kazıyıcı | `counter_url` + `counter_selector` ile cheerio; selector tutmazsa `counter_offline` flag adayı üretilir, job patlamaz |
| 1.3 | Oyun portu kontrolü | `game_host:game_port`'a 3sn timeout'lu TCP denemesi → up/down |
| 1.4 | Eşzamanlılık ve dayanıklılık | Sunucu başına sıralı, toplam eşzamanlılık 10; her istek timeout'lu; tek sunucunun hatası job'ı düşürmez |
| 1.5 | Nezaket kuralları | Dürüst User-Agent; `robots.txt` kontrolü; aynı hedefe 10 dakikadan sık istek yok |
| 1.6 | `metrics_raw` yazımı | `status != 'dead'` her sunucu için tek satır; bir kaynak patlasa diğer alanlar yine yazılır; hatalar `source_errors` jsonb'de |
| 1.7 | Yerel çalıştırma | `npm run collect:once` uçtan uca çalışır ve kaç satır yazdığını raporlar |
| 1.8 | `.github/workflows/collect.yml` | `*/10 * * * *`; concurrency group var; sırlar repository secrets'tan |
| 1.9 | `npm run check` yeşil | — |

---

## Faz 2 — Rollup, retention, flag tespiti, skor `[x]`

| # | Görev | Tamamlanma kriteri |
| --- | --- | --- |
| 2.1 | Günlük rollup job'ı | Dünün verisi `metrics_daily`'ye yazılır; iki kez çalışınca veri bozulmaz (idempotent) |
| 2.2 | Retention temizliği | 30 günden eski `metrics_raw` satırları, rollup sonrası silinir |
| 2.3 | `flatline` tespiti | std/ortalama < 0.02 → flag |
| 2.4 | `no_diurnal` tespiti | 7 günlük saatlik ortalamada gece/zirve oranı > 0.85 → flag |
| 2.5 | `step_jump` tespiti | %50+ sıçrama ve sonrasında seviyede kalma → flag |
| 2.6 | `round_numbers` tespiti | Son 100 örneğin %80+'ı 50'nin katı → flag |
| 2.7 | Flag yaşam döngüsü | Sinyal geçince flag `is_active=false`; aynı türden ikinci aktif flag oluşmaz |
| 2.8 | Skor hesabı | Trend 30 + tıklama 25 + Discord 20 + uptime 15 + yaşam 10, aktif flag başına -15, taban 0; `breakdown` jsonb'ye yazılır |
| 2.9 | **Birim testler** | Düz çizgi sentetik veri flatline **yakalanır**; gerçekçi sinüs eğrisi **yakalanmaz**; skor kırılımı toplamı skora eşit; şişirilmiş sayaç skoru değiştirmez |
| 2.10 | `.github/workflows/daily.yml` | Günde 1: rollup + retention + flag + skor; concurrency group var |
| 2.11 | `npm run check` yeşil | — |

---

## Faz 3 — Site `[x]`

| # | Görev | Tamamlanma kriteri |
| --- | --- | --- |
| 3.1 | Ana sayfa `/` | Açılış takvimi (bugün/bu hafta/gelecek) + geri sayım; altında skora göre "gerçekten canlı olanlar"; reklam blokları ayrı ve "Reklam" etiketli |
| 3.2 | Takvim `/takvim` | Tür/tarih filtreli açılış listesi |
| 3.3 | Sunucu detayı `/sunucu/[slug]` | 7/30/90 gün grafiği, skor kırılımı, aktif flag uyarıları, sahibin geçmiş sunucuları ve yaşam süreleri |
| 3.4 | Tıklama kaydı | İndir/site/Discord butonları `clicks`'e yazar; `ip_hash = sha256(ip + günlük tuz)`; ham IP saklanmaz |
| 3.5 | Veri sunum kuralı | Her sayının yanında kaynak rozeti; ana metrik yüzde trend, mutlak sayı değil |
| 3.6 | Stagger giriş + scroll reveal | Kartlar 40ms gecikmeli girer; IntersectionObserver hook'u kendi yazımımız (~20 satır), bir kez tetiklenir |
| 3.7 | Sayı animasyonu | `requestAnimationFrame` ile 600ms ease-out, `tabular-nums` açık |
| 3.8 | Grafik | recharts çizgisi `strokeDasharray`/`strokeDashoffset` ile 1200ms soldan sağa çizilir; alan dolgusu opacity ile gelir; **özel tooltip** (recharts varsayılanı yok) |
| 3.9 | Skor halkası | Dairesel progress, dolarken animasyon, skora göre bastırılmış yeşil/sarı/kırmızı |
| 3.10 | Geri sayım | Sadece değişen basamak yukarı/aşağı kayar |
| 3.11 | Sunucu kartı hover | Kalkma + kenarlık aydınlanma + logo scale 1.04 + sparkline belirme, hepsi 150ms |
| 3.12 | Butonlar | Basılırken scale 0.97, bırakınca spring; pending durumu buton içi ilerleme çizgisi (spinner değil) |
| 3.13 | Skeleton'lar | Her liste ve grafiğin kendi skeleton'u, gerçek içerikle aynı boyutta |
| 3.14 | Boş durumlar | Her boşluğun ikonu + yönlendiren bir satırı var |
| 3.15 | **Kabul kriteri raporu** | Lighthouse performans ≥ 90, CLS < 0.05; 360px'te yatay scroll yok; hover'a bağımlı bilgi yok; `prefers-reduced-motion` açıkken sayfa durgun ama kullanılabilir |
| 3.16 | `npm run check` yeşil | — |

---

## Faz 4 — Yönetim, mezarlık, sahip sicili `[x]`

| # | Görev | Tamamlanma kriteri |
| --- | --- | --- |
| 4.1 | Supabase Auth + allowlist | `/admin` sadece `ADMIN_EMAILS` içindeki hesaba açık; diğerleri 403 |
| 4.2 | Sunucu ekle/düzenle | Form zod ile doğrulanır; slug benzersizliği kontrol edilir |
| 4.3 | **Selector test butonu** | Girilen `counter_url` + `counter_selector` anında denenir, bulunan sayı ya da hata gösterilir |
| 4.4 | Flag yönetimi | Yanlış pozitif flag elle kapatılabilir |
| 4.5 | Reklam yönetimi | Yerleşim, tarih aralığı, görsel, hedef; reklamın skora etkisi olmadığı panelde de yazılı |
| 4.6 | Mezarlık `/mezarlik` | Kapanmış sunucular, kaç gün yaşadıkları, zirve ve son online |
| 4.7 | Sahip sicili `/sahipler/[owner_key]` | Açtığı sunucular, ortalama yaşam süresi, hâlâ açık olan sayısı |
| 4.8 | `npm run check` yeşil | — |

---

## Faz 5 — Discord `[ ]`

| # | Görev | Tamamlanma kriteri |
| --- | --- | --- |
| 5.1 | Interactions endpoint | `app/api/discord/interactions/route.ts`; ed25519 imza doğrulaması; doğrulanmayan istek **401** |
| 5.2 | `/acilislar` komutu | Yaklaşan açılışları embed olarak döner |
| 5.3 | `/sv <isim>` komutu | Sunucu özeti: skor, trend, aktif flag'ler, kaynak rozetleri |
| 5.4 | `/mezarlik` komutu | Son kapanan sunucular ve yaşam süreleri |
| 5.5 | Komut kaydı script'i | `scripts/register-commands.ts` üç komutu da kaydeder |
| 5.6 | Açılış duyurusu | `.github/workflows/announce.yml` saatlik; açılışa 30 dk kalan sunucular için webhook'a embed; aynı duyuru iki kez gitmez |
| 5.7 | Kalıcı süreç yok | Websocket/gateway bot yok; her şey HTTP |
| 5.8 | `npm run check` yeşil | — |

---

## Faz 6 — Reklam envanteri, SEO, performans `[ ]`

| # | Görev | Tamamlanma kriteri |
| --- | --- | --- |
| 6.1 | Reklam envanteri | Yerleşimler sitede render olur, hepsi "Reklam" etiketli, sıralamadan tamamen ayrı |
| 6.2 | `sitemap.xml` + `robots.txt` | Tüm sunucu, sahip ve mezarlık sayfaları listeli |
| 6.3 | OG görselleri | Sunucu sayfaları için dinamik OG (skor + trend); ücretsiz Next.js OG üretimi |
| 6.4 | Structured data | Sunucu sayfalarında JSON-LD |
| 6.5 | Performans | Lighthouse performans ≥ 90, CLS < 0.05, mobilde de geçer |
| 6.6 | `npm run check` yeşil | — |

---

## Ölçüm sonuçları (Faz 3 kabul kriteri)

Lighthouse 13.5, mobil form faktörü, üretim derlemesi (`next start`), 2026-09-19:

| Sayfa | Performans | Erişilebilirlik | En iyi pratikler | SEO | CLS |
| --- | --- | --- | --- | --- | --- |
| `/` | 99 | 100 | 100 | 100 | 0 |
| `/sunucu/[slug]` (grafikli) | 96 | 100 | 100 | 100 | 0 |
| `/sunucu/[slug]` (flag'li) | 95 | 100 | 100 | 100 | 0.009 |
| `/takvim` | 99 | 100 | 100 | 100 | 0.001 |

- 360px genişlikte yatay taşma yok (`scrollWidth == innerWidth`, taşan öğe listesi boş).
- `prefers-reduced-motion: reduce` zorlanarak açıldığında sayfa tamamen durgun,
  tüm içerik görünür ve kullanılabilir (Chrome `--force-prefers-reduced-motion`).
- Hover'a bağımlı bilgi yok: sparkline mobilde kalıcı görünür, flag açıklamaları
  detay sayfasında düz metin olarak da yazılı.
