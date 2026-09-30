import { escapeHtml } from '../../packages/core/utils.js';
export const label = (text: string, className='label'): string => `<div class="${className}">${escapeHtml(text)}</div>`;
export const svg = (content: string): string => `<svg class="graphic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 650" aria-hidden="true">${content}</svg>`;
export function sourceLabels(description: string, subject: string): string[] {
  const labels=description.split(/\s*(?:→|\n|;|(?<=[.!?])\s+)\s*/u).map(s=>s.trim()).filter(Boolean);
  return (labels.length > 1 ? labels : [subject,description]).filter(Boolean).slice(0,4);
}
