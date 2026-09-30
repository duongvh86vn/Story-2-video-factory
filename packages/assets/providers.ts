import type { FactoryConfig } from '../core/config.js';
import type { Asset, Storyboard } from '../core/schemas.js';

export type AssetRequest = Storyboard['shots'][number]['assetNeeds'][number];
export type AssetProviderKind = 'image' | 'stock' | 'archive' | 'video';

/** Providers describe the explicitly requested URL; the resolver owns downloads. */
export interface LicensedAssetSource {
  sourceUrl: string;
  source: Extract<Asset['source'], 'stock' | 'archive' | 'generated'>;
  author: string;
  license: string;
  usageStatus: 'approved' | 'restricted' | 'unknown';
}

export interface AssetProviderContext {
  projectRoot: string;
  config: FactoryConfig;
  signal: AbortSignal;
}

export interface AssetProvider {
  readonly id: string;
  readonly kind: AssetProviderKind;
  supports(request: Readonly<AssetRequest>): boolean;
  resolve(request: Readonly<AssetRequest>, context: AssetProviderContext): Promise<LicensedAssetSource | undefined>;
}

export interface ImageAssetProvider extends AssetProvider { readonly kind: 'image'; }
export interface StockAssetProvider extends AssetProvider { readonly kind: 'stock'; }
export interface ArchiveAssetProvider extends AssetProvider { readonly kind: 'archive'; }
export interface VideoAssetProvider extends AssetProvider { readonly kind: 'video'; }

const providers = new Map<string, AssetProvider>();

/** Returns an unregister function. Registration never authorizes new URLs. */
export function registerAssetProvider(provider: AssetProvider): () => void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(provider.id)) throw new Error('Invalid asset provider id');
  if (providers.has(provider.id)) throw new Error(`Asset provider already registered: ${provider.id}`);
  providers.set(provider.id, provider);
  return () => { if (providers.get(provider.id) === provider) providers.delete(provider.id); };
}

export function registeredAssetProviders(): readonly AssetProvider[] {
  return [...providers.values()].sort((a, b) => a.id.localeCompare(b.id, 'en'));
}

/** A supplied license is recorded as an owner assertion, never inferred from a host. */
export const explicitUrlProvider: AssetProvider = {
  id: 'explicit-licensed-url',
  kind: 'stock',
  supports: request => Boolean(request.sourceUrl && request.license?.trim()),
  async resolve(request) {
    if (!request.sourceUrl || !request.license?.trim()) return undefined;
    return {
      sourceUrl: request.sourceUrl,
      source: 'stock',
      author: 'Unspecified by the supplied source; attribution must be confirmed by the project owner',
      license: request.license.trim(),
      usageStatus: 'approved',
    };
  },
};
