/** Namespace definitions and every local reference together. Embedded data URLs
 * remain untouched; an actor's masks/use elements cannot borrow another actor. */
export function namespaceRigSvg(svg:string,prefix:string):string {
  return svg.replace(/(^|\s)id="([^"]+)"/g,(_,space:string,id:string)=>`${space}id="${prefix}${id}"`)
    .replace(/url\(#([^)]+)\)/g,(_,id:string)=>`url(#${prefix}${id})`)
    .replace(/\b(href|xlink:href)="#([^"]+)"/g,(_,attribute:string,id:string)=>`${attribute}="#${prefix}${id}"`);
}
