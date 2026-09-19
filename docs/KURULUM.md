# Kurulum — adım adım

Bu rehber yazılım bilmeyen birine göre yazıldı. Sırayla git, atlama.
**Hiçbir adımda kredi kartı istenmez.** İstenirse yanlış yerdesin, dur.

Kodu yazan ben hallettim; aşağıdakiler yalnızca **senin hesabınla** yapılabilecek
işler (hesap açmak, şifre girmek, izin vermek). Onları senin yerine yapamam.

---

## 0. Önce hiçbir şey kurmadan siteye bak

```bash
cd C:\Projeler\metin2-radar
npm run dev
```

Tarayıcıda `http://localhost:3000` aç. Site örnek (uydurma) verilerle çalışır —
**demo modu**. Gerçek veri için aşağıdaki adımlar gerekiyor.

---

## 1. Supabase (veritabanı) — ücretsiz

1. <https://supabase.com> → **Start your project** → GitHub ile giriş yap.
2. **New project**. Ad: `metin2-radar`. Bölge: **Frankfurt** (Türkiye'ye en yakın).
   Bir veritabanı şifresi ister — bir yere kaydet, bir daha lazım olmayacak ama kaybolmasın.
3. Proje açılınca sol menüden **SQL Editor** → **New query**.
4. `supabase/migrations/0001_init.sql` dosyasının **tamamını** kopyala, yapıştır, **Run**.
5. Aynısını `supabase/migrations/0002_announcements.sql` için tekrarla.
6. Sol menü **Project Settings → API**. Buradan üç şeyi kopyalayacaksın:
   - **Project URL**
   - **anon public** anahtarı
   - **service_role** anahtarı (gizli, kimseyle paylaşma)

### Bu bilgileri yerelde kullan

Proje klasöründe `.env.example` dosyasını kopyalayıp adını `.env.local` yap,
içini doldur:

```
NEXT_PUBLIC_SUPABASE_URL=（Project URL）
NEXT_PUBLIC_SUPABASE_ANON_KEY=（anon public）
SUPABASE_URL=（Project URL）
SUPABASE_SERVICE_ROLE_KEY=（service_role）
ADMIN_EMAILS=senin@mailin.com
CLICK_HASH_SALT=（rastgele uzun bir yazı, ne olduğu önemli değil）
```

`.env.local` **asla** repoya girmez, gitignore'da.

Örnek sunucuları eklemek için:

```bash
npm run seed
```

---

## 2. GitHub (kod + zamanlanmış işler) — ücretsiz

1. <https://github.com/new> → repo adı `metin2-radar` → **Private** seç → **Create**.
2. Sonra klasörde:

```bash
git remote add origin https://github.com/KULLANICI_ADIN/metin2-radar.git
git push -u origin master
```

3. Repo sayfasında **Settings → Secrets and variables → Actions → New repository secret**.
   Şunları tek tek ekle (adları birebir aynı olmalı):

| Secret adı | Değeri |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role anahtarı |
| `NEXT_PUBLIC_SITE_URL` | Vercel adresin (3. adımdan sonra) |
| `DISCORD_ANNOUNCE_WEBHOOK_URL` | Discord webhook (5. adım, istersen) |

Bunlar tamam olunca `.github/workflows/` altındaki üç iş kendiliğinden çalışmaya başlar:

- **collect.yml** — 10 dakikada bir ölçüm alır
- **daily.yml** — günde bir kez özetler, temizler, flag ve skor hesaplar
- **announce.yml** — saatte bir yaklaşan açılışları duyurur

> Not: Periyodik işler bilerek Vercel'de değil GitHub'da. Vercel'in ücretsiz planında
> zamanlanmış iş günde 1 kez çalışıyor; bize 10 dakikada bir lazım.

---

## 3. Vercel (siteyi yayına almak) — ücretsiz

1. <https://vercel.com> → GitHub ile giriş → **Add New → Project** → `metin2-radar` repoyu seç.
2. **Environment Variables** kısmına şunları ekle:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `CLICK_HASH_SALT`
3. **Deploy**. Birkaç dakika sonra `https://...vercel.app` adresin hazır.
4. O adresi `NEXT_PUBLIC_SITE_URL` olarak hem Vercel'e hem GitHub secret'larına yaz,
   sonra yeniden deploy et.

**Hobby planında kal.** Pro'ya geçmen gereken hiçbir şey yok.

---

## 4. Yönetim paneline girmek

1. Supabase → **Authentication → Providers → Email** açık olsun.
2. Sitende `/admin/giris` adresine git, e-postanı yaz.
3. Gelen bağlantıya **aynı tarayıcıdan** tıkla.
4. E-postan `ADMIN_EMAILS` içinde değilse panel açılmaz — bu kasıtlı.

Panelde sunucu ekleyebilir, **selector test butonuyla** bir sitenin online sayacını
doğru okuyup okumadığını anında deneyebilir, yanlış flag'leri kapatabilir ve reklam
ekleyebilirsin.

---

## 5. Discord (isteğe bağlı)

1. <https://discord.com/developers/applications> → **New Application**.
2. **General Information** → **Public Key**'i kopyala → Vercel'e `DISCORD_PUBLIC_KEY` olarak ekle.
3. **Interactions Endpoint URL** kutusuna şunu yaz:
   `https://SENIN-ADRESIN.vercel.app/api/discord/interactions` → **Save**.
   Discord burada bir test isteği gönderir; imza doğrulaması çalışıyorsa kaydeder.
4. **Bot** sekmesinden token al → `DISCORD_BOT_TOKEN`, **Application ID** → `DISCORD_APP_ID`.
5. Komutları kaydet:

```bash
npm run discord:register
```

6. Duyurular için: Discord sunucunda bir kanal → **Ayarlar → Entegrasyonlar → Webhook oluştur**
   → adresi kopyala → GitHub secret `DISCORD_ANNOUNCE_WEBHOOK_URL`.

Komutlar: `/acilislar`, `/sv <isim>`, `/mezarlik`

---

## Sık sorulanlar

**Sunucu ekledim ama grafik boş.**
Normal. Toplayıcı 10 dakikada bir ölçüyor, günlük özet gece çalışıyor.
İlk grafiğin oluşması birkaç saat sürer.

**Skor neden düşük?**
`/sunucu/...` sayfasında skor kırılımı yazıyor: hangi bileşenden kaç puan geldiği
açıkça görünür. Aktif her manipülasyon sinyali 15 puan düşürür.

**Bir sunucuya haksız flag takıldı.**
Panelden kapatabilirsin. Ama günlük iş sinyali hâlâ görüyorsa yeniden açar —
kalıcı çözüm için tespit eşiklerinin değişmesi gerekir (`lib/analysis/detect.ts`).

**Ücretli bir şeye geçmem gerekir mi?**
Hayır. 100 sunucuya kadar tasarlandı: `metrics_raw` 30 günden eskisini siler,
tavan ~430 bin satır, Supabase Free 500MB'ın çok altında.
