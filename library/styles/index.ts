import type { FactoryConfig } from '../../packages/core/config.js';

export interface VisualStyle { id: string; background: string; foreground: string; accent: string; muted: string; panel: string; titleFont: string; bodyFont: string; ease: string; borderRadius: number; }
/** System font stacks keep the authored compositions fully offline. */
export const styles: readonly VisualStyle[] = [
  { id:'historical-cinematic', background:'#171310', foreground:'#E8DFCF', accent:'#D4B483', muted:'#B9AC94', panel:'#302820', titleFont:'Georgia, serif', bodyFont:'Arial, sans-serif', ease:'power2.inOut', borderRadius:2 },
  { id:'technical-clean', background:'#F3F6FA', foreground:'#102237', accent:'#005BBB', muted:'#526779', panel:'#FFFFFF', titleFont:'Arial, sans-serif', bodyFont:'Arial, sans-serif', ease:'power2.out', borderRadius:12 },
  { id:'industrial-documentary', background:'#202729', foreground:'#F4F1E8', accent:'#FFC857', muted:'#B9C6C9', panel:'#344044', titleFont:'Arial, sans-serif', bodyFont:'Arial, sans-serif', ease:'power1.inOut', borderRadius:4 },
  { id:'watercolor-story', background:'#FAF1E4', foreground:'#45352D', accent:'#9F413B', muted:'#746058', panel:'#ECDDCB', titleFont:'Georgia, serif', bodyFont:'Georgia, serif', ease:'sine.inOut', borderRadius:28 },
  { id:'dark-tech', background:'#090F1F', foreground:'#E9F4FF', accent:'#63D6E8', muted:'#A9BAD0', panel:'#172640', titleFont:'Arial, sans-serif', bodyFont:'Arial, sans-serif', ease:'power3.out', borderRadius:10 },
  { id:'educational-flat', background:'#FFFDF5', foreground:'#1B3149', accent:'#B6380E', muted:'#4B6073', panel:'#EFEAD9', titleFont:'Arial, sans-serif', bodyFont:'Arial, sans-serif', ease:'power2.out', borderRadius:24 }
];
export function getStyle(config: FactoryConfig): VisualStyle {
  const base = styles.find(style => style.id === config.style.preset);
  if (!base) throw new Error(`Unknown style preset: ${config.style.preset}`);
  const result = { ...base };
  for (const [key,value] of Object.entries(config.style.overrides)) {
    if (['background','foreground','accent','muted','panel'].includes(key)) {
      if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) throw new Error(`Invalid style color: ${key}`);
      (result as unknown as Record<string,unknown>)[key]=value;
    } else if (key === 'borderRadius') {
      if (typeof value !== 'number' || value < 0 || value > 100) throw new Error('Invalid borderRadius');
      result.borderRadius=value;
    } else if (key === 'ease') {
      if (typeof value !== 'string' || !/^(?:power[1-4]|sine|expo|circ)\.(?:in|out|inOut)$/.test(value)) throw new Error('Invalid GSAP ease');
      result.ease=value;
    } else throw new Error(`Unsupported offline style override: ${key}`);
  }
  return result;
}
