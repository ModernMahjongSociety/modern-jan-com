export function getSiteUrl(): string {
  return (import.meta.env.SITE || 'https://modern-jan.com').replace(/\/$/, '');
}

export function toSafeJsonLd(schema: Record<string, unknown>): string {
  return JSON.stringify(schema)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
}
