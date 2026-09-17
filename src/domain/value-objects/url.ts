export function canonicalUrl(
  value: string,
  trustedDomains?: readonly string[],
): string {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443')
  ) {
    throw new Error('Only credential-free HTTPS URLs on port 443 are allowed');
  }
  if (trustedDomains && !trustedDomains.includes(url.hostname))
    throw new Error('Untrusted source domain');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.toString();
}
