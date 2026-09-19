import { config } from 'dotenv';

/**
 * Script'ler ve toplayıcı için ortam değişkeni yükleme.
 *
 * Next.js `.env.local` dosyasını kendisi okur, ama `tsx` ile çalışan
 * script'ler okumaz — `dotenv/config` yalnızca `.env` arar. Bu yüzden
 * ikisini de burada açıkça yüklüyoruz.
 *
 * Öncelik `.env.local`: dotenv zaten tanımlı bir değişkenin üzerine yazmaz,
 * dolayısıyla önce okunan kazanır. CI'da (GitHub Actions) hiçbir dosya yoktur;
 * değişkenler zaten process.env içinde gelir ve bu çağrılar sessizce geçer.
 */
config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });
