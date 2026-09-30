/** Runs in an opaque-origin sandbox. Only seeking/scaling is allowed by the bridge. */
export const PREVIEW_BRIDGE = `(() => {
  let time = 0;
  const timelines = () => {
    const value = window.__timelines;
    if (value && typeof value === 'object') return Object.values(value);
    return [window.__timeline, window.timeline, window.masterTimeline].filter(Boolean);
  };
  function seek(ms) {
    time = ms;
    const seconds = ms / 1000;
    for (const timeline of timelines()) if (typeof timeline.pause === 'function') timeline.pause(seconds, false);
    if (typeof window.__seek === 'function') window.__seek(seconds);
    for (const frame of document.querySelectorAll('iframe')) {
      const wrapper = frame.closest('[data-start]');
      const start = Number(frame.dataset.start ?? wrapper?.dataset.start ?? 0);
      frame.contentWindow?.postMessage({ type: 'studio:seek', timeMs: Math.max(0, ms - start * 1000) }, '*');
    }
    for (const media of document.querySelectorAll('video,audio')) {
      media.pause();
      if (Number.isFinite(media.duration)) media.currentTime = Math.min(seconds, media.duration);
    }
  }
  function scale() {
    const composition = document.querySelector('[data-composition-id]');
    if (!composition) return;
    const width = Number(composition.dataset.width), height = Number(composition.dataset.height);
    if (!width || !height) return;
    const ratio = Math.min(innerWidth / width, innerHeight / height);
    document.documentElement.style.cssText = 'width:100%;height:100%;overflow:hidden;background:#101010';
    document.body.style.cssText = 'margin:0;width:100%;height:100%;overflow:hidden;background:#101010';
    composition.style.transformOrigin = '0 0';
    composition.style.transform = 'translate(' + Math.max(0,(innerWidth-width*ratio)/2) + 'px,' + Math.max(0,(innerHeight-height*ratio)/2) + 'px) scale(' + ratio + ')';
  }
  addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'studio:seek' || typeof event.data.timeMs !== 'number' || !Number.isFinite(event.data.timeMs)) return;
    seek(Math.max(0, Math.min(event.data.timeMs, 86400000)));
  });
  addEventListener('resize', scale);
  addEventListener('load', () => { scale(); seek(time); parent.postMessage({ type: 'studio:ready' }, '*'); });
  if (document.readyState === 'complete') { scale(); seek(time); }
})();`;

export function withPreviewBridge(html: string): string {
  const tag = '<script src="/preview-bridge.js"></script>';
  return /<\/body\s*>/i.test(html) ? html.replace(/<\/body\s*>/i, `${tag}</body>`) : html + tag;
}
