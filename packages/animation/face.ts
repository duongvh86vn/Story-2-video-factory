/** All faces are authored in the same rig; animation only selects/blends layers. */
export function faceLayers(x: number, eyeY: number, mouthY: number, ink: string, shell: string, spacing: number | readonly [number,number] = 21, gaze = 0): string {
  const eyes = (['left', 'right'] as const).map((side, i) => {
    const at = typeof spacing==='number'?x+(i?spacing:-spacing):spacing[i]!;
    return `<g id="eye-${side}" transform="translate(${gaze} 0)"><ellipse cx="${at}" cy="${eyeY}" rx="5" ry="7" fill="${ink}" stroke="none"/></g>`
      + `<g id="lid-${side}" opacity="0"><path d="M${at-7} ${eyeY-4}Q${at} ${eyeY-9} ${at+7} ${eyeY-4}" stroke="${shell}" stroke-width="7"/></g>`
      + `<g id="brow-${side}"><path d="M${at-8} ${eyeY-14}Q${at} ${eyeY-18} ${at+8} ${eyeY-14}" stroke="${ink}" stroke-width="3" fill="none"/></g>`;
  }).join('');
  return eyes + `<g id="mouth"><g id="mouth-talk"><ellipse cx="${x}" cy="${mouthY}" rx="9" ry="3" fill="${ink}" stroke="none"/></g></g>`
    + `<g id="mouth-smile" opacity="0"><path d="M${x-10} ${mouthY-2}Q${x} ${mouthY+9} ${x+10} ${mouthY-2}" stroke="${ink}" stroke-width="3" fill="none"/></g>`
    + `<g id="mouth-round" opacity="0"><ellipse cx="${x}" cy="${mouthY}" rx="6" ry="9" fill="${ink}" stroke="none"/></g>`;
}
