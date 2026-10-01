import type { Beat, Storyboard } from '../core/schemas.js';
import { timestamp } from '../core/utils.js';

const inline = (text: string): string => text.replace(/\r?\n/g, ' ').replace(/[\\`*_\[\]<>#]/g, '\\$&');
export function storyboardMarkdown(storyboard: Storyboard, beats: Beat[]): string {
  const byId = new Map(beats.map(beat => [beat.id, beat]));
  const sections = ['# Storyboard', `\n${storyboard.shots.length} shots. All times use the immutable narration clock.\n`];
  for (const shot of storyboard.shots) {
    const narration = shot.beatIds.map(id => {
      const beat = byId.get(id);
      if (!beat) throw new Error(`Cannot export shot ${shot.id}: unknown beat ${id}`);
      return beat.narrationText;
    }).join('\n');
    sections.push(`## ${inline(shot.id)} — ${timestamp(shot.startMs)} → ${timestamp(shot.endMs)}`,
      `\nNarration (referenced beats):\n\n${narration.split(/\r?\n/).map(line => `> ${inline(line)}`).join('\n')}`,
      `\nVisual:\n\n${shot.visualDescription}`,
      ...(shot.host && shot.visualization ? [
        `\n| Narration | Giải thích | Hành động host |\n|---|---|---|\n| ${inline(narration).replaceAll('|', '\\|')} | ${inline(shot.explanationGoal ?? '').replaceAll('|', '\\|')} | ${shot.host.actions.map(a => `${a.type} → ${a.target?.partId ?? 'viewer'}`).join('; ')} |`,
        `\nHost: ${inline(shot.host.id)} v${shot.host.profileVersion}; rig ${inline(shot.host.rigHash)}; ${shot.host.presence}`,
        `\nVisualization: ${shot.visualization.type}; conceptual. Parts: ${shot.visualization.parts.map(p => inline(p.label)).join(', ')}`,
      ] : []),
      `\nScene type: ${shot.sceneType}\n\nSubject: ${inline(shot.subject)}`,
      `\nCharacters: ${shot.characters.length ? shot.characters.map(inline).join(', ') : 'None'}`,
      `\nCamera: ${inline(shot.camera.shotSize)}; ${inline(shot.camera.angle)}; ${inline(shot.camera.movement)}`,
      `\nAnimation:\n\n${shot.motion.length ? shot.motion.map(item => `- ${inline(item)}`).join('\n') : '- Intentional static composition'}`,
      `\nTransitions: ${inline(shot.transitionIn)} → ${inline(shot.transitionOut)}`,
      `\nAssets:\n\n${shot.assetNeeds.length ? shot.assetNeeds.map(asset => `- ${inline(asset.id)} (${asset.type}${asset.required ? ', required' : ''}): ${inline(asset.description)}${asset.characterId ? `; character ${inline(asset.characterId)}` : ''}${asset.localPath ? `; ${inline(asset.localPath)}` : ''}`).join('\n') : '- Code visuals; no external asset required'}`,
      `\nOn-screen text: ${shot.textOnScreen ? inline(shot.textOnScreen) : 'None'}`,
      `\nRenderer: HyperFrames\n\nRecipe: ${shot.recipeId ? inline(shot.recipeId) : 'Custom code visual'}\n\nLocked: ${shot.locked ? 'yes' : 'no'}`,
      ...(shot.sfx.length ? [`\nSFX:\n\n${shot.sfx.map(effect => `- ${timestamp(effect.timeMs)}: ${inline(effect.type)} (${effect.intensity})`).join('\n')}`] : []), '\n---\n');
  }
  return sections.join('\n') + '\n';
}
