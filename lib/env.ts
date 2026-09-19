import { z } from 'zod';

/**
 * Sırlar asla repoya girmez. Yerelde .env.local, CI'da repository secrets.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

const serviceSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServiceEnv = z.infer<typeof serviceSchema>;

function fail(where: string, issues: z.ZodError): never {
  const lines = issues.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  throw new Error(
    `Eksik/hatalı ortam değişkeni (${where}):\n${lines.join('\n')}\n` +
      '.env.example dosyasına bak.',
  );
}

/** Tarayıcıya da gidebilen değişkenler. */
export function publicEnv(): PublicEnv {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
  if (!parsed.success) fail('public', parsed.error);
  return parsed.data;
}

/** Sadece sunucu tarafı / collector. Tarayıcıda çağrılmaz. */
export function serviceEnv(): ServiceEnv {
  const parsed = serviceSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) fail('service', parsed.error);
  return parsed.data;
}
