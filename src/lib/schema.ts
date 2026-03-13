export const SITE_NAME = 'モダンジャン研究会';
export const SITE_DESCRIPTION = '麻雀の戦術・技術について研究するサークル';

export function getSiteUrl(): string {
  return (import.meta.env.SITE || 'https://modern-jan.com').replace(/\/$/, '');
}

export function getOrganization(siteUrl: string) {
  return {
    "@type": "Organization" as const,
    "name": SITE_NAME,
    "url": siteUrl,
  };
}

const JSON_LD_ESCAPE: Record<string, string> = {
  '&': '\\u0026',
  '<': '\\u003c',
  '>': '\\u003e',
};

export function toSafeJsonLd(schema: Record<string, unknown>): string {
  return JSON.stringify(schema)
    .replace(/[&<>]/g, (char) => JSON_LD_ESCAPE[char]);
}
