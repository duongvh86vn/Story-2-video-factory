import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import path from 'node:path';
import type { FactoryConfig } from '../core/config.js';
import { AssetResolutionError, extensionFits, inspectMedia, maxAssetBytes } from './files.js';
import type { AssetRequest } from './providers.js';

/** Credential-bearing URLs must never enter manifests or persisted error logs. */
export function publicSourceUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new AssetResolutionError('invalid-source-url'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new AssetResolutionError('unsafe-source-url');
  for (const key of url.searchParams.keys()) {
    if (/(?:token|secret|signature|credential|password|authorization|api[_-]?key|access[_-]?key|^key$|^sig$|^auth$)/i.test(key)) throw new AssetResolutionError('credential-bearing-source-url');
  }
  let decodedPath: string;
  try { decodedPath = decodeURIComponent(url.pathname); } catch { throw new AssetResolutionError('invalid-source-url'); }
  if (/[\\\u0000]/.test(decodedPath) || /%2f|%5c|%2e/i.test(decodedPath) || /%2f|%5c/i.test(url.pathname) || decodedPath.split('/').includes('..')) throw new AssetResolutionError('ambiguous-source-path');
  url.hash = '';
  return url;
}

export function licensedSource(request: AssetRequest, config: FactoryConfig): URL {
  if (!config.research.enabled || !request.sourceUrl || !request.license?.trim()) throw new AssetResolutionError('remote-not-authorized', request.id);
  if (/^(?:unknown|unspecified|none|n\/a|pending|unlicensed)$|all rights reserved/i.test(request.license.trim())) throw new AssetResolutionError('license-not-approved', request.id);
  const url = publicSourceUrl(request.sourceUrl);
  const approved = config.research.sources.some(value => {
    const source = publicSourceUrl(value);
    if (source.href === url.href) return true;
    if (source.origin !== url.origin || source.search) return false;
    // A source directory authorizes descendants only on its own origin.
    // A source page/file authorizes that exact URL, never sibling downloads.
    if (!source.pathname.endsWith('/')) return false;
    return url.pathname.startsWith(source.pathname);
  });
  if (!approved) throw new AssetResolutionError('source-not-approved', request.id);
  return url;
}

function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a = 0, b = 0, c = 0] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 2))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
  // Restrict IPv6 to global unicast; reject mapped/private/tunnel/documentation addresses.
  return isIP(address) === 6 && /^[23][\da-f]{3}:/i.test(address) &&
    !/^2001:(?:0:|db8:)/i.test(address) && !/^2002:/i.test(address);
}

const mimeExtensions: Record<string, string> = {
  'image/svg+xml': '.svg', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp',
  'image/gif': '.gif', 'image/avif': '.avif', 'video/mp4': '.mp4', 'video/quicktime': '.mov',
  'video/webm': '.webm', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/mpeg': '.mp3',
  'audio/flac': '.flac', 'audio/x-flac': '.flac', 'audio/ogg': '.ogg', 'audio/mp4': '.m4a',
  'application/pdf': '.pdf', 'text/plain': '.txt', 'text/markdown': '.md',
};

/** HTTPS is pinned to an inspected DNS address; redirects and ambient credentials are disabled. */
export async function downloadAsset(url: URL, type: AssetRequest['type'], signal: AbortSignal): Promise<{ bytes: Buffer; extension: string }> {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  let addresses: Awaited<ReturnType<typeof lookup>>[];
  if (isIP(hostname)) addresses = [{ address: hostname, family: isIP(hostname) }];
  else {
    const resolution = lookup(hostname, { all: true, verbatim: true });
    addresses = await new Promise((resolve, reject) => {
      const aborted = () => reject(new AssetResolutionError('remote-timeout'));
      if (signal.aborted) return aborted();
      signal.addEventListener('abort', aborted, { once: true });
      resolution.then(resolve, reject).finally(() => signal.removeEventListener('abort', aborted)).catch(() => undefined);
    });
  }
  if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw new AssetResolutionError('private-source-address');
  const selected = addresses[0]!;
  const limit = maxAssetBytes(type);
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (code: string) => {
      if (settled) return;
      settled = true;
      reject(new AssetResolutionError(code));
    };
    const request = httpsRequest(url, {
      method: 'GET',
      signal,
      agent: false,
      family: selected.family,
      headers: { Accept: 'image/*,video/*,audio/*,application/pdf,text/plain,text/markdown', 'Accept-Encoding': 'identity' },
      lookup: (_name, _options, callback) => callback(null, selected.address, selected.family),
    }, response => {
      void (async () => {
        if (response.statusCode !== 200) { response.destroy(); fail('remote-http-status'); return; }
        const length = Number(response.headers['content-length']);
        if ((Number.isFinite(length) && length > limit) || (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity')) {
          response.destroy(); fail('remote-size-or-encoding'); return;
        }
        const contentType = response.headers['content-type']?.split(';')[0]?.trim().toLowerCase() ?? '';
        const urlExtension = path.posix.extname(url.pathname).toLowerCase();
        const extension = mimeExtensions[contentType] ?? (contentType === 'application/octet-stream' && extensionFits(type, urlExtension) ? urlExtension : undefined);
        if (!extension || !extensionFits(type, extension)) { response.destroy(); fail('remote-format-mismatch'); return; }
        const chunks: Buffer[] = [];
        let bytesRead = 0;
        for await (const chunk of response) {
          const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
          bytesRead += bytes.length;
          if (bytesRead > limit) { response.destroy(); fail('asset-size-limit'); return; }
          chunks.push(bytes);
        }
        const bytes = Buffer.concat(chunks);
        inspectMedia(bytes, type, extension);
        if (!settled) { settled = true; resolve({ bytes, extension }); }
      })().catch(error => fail(error instanceof AssetResolutionError ? error.code : 'remote-download-failed'));
    });
    request.on('error', () => fail(signal.aborted ? 'remote-timeout' : 'remote-download-failed'));
    request.end();
  });
}
