export type ForestLight='day'|'sunset'|'night';
export type ForestSetting='forest'|'camp'|'cave'|'river';
/** Reusable illustrated set. No story object or actor action is asserted here. */
export function forestBackground(width=1280,height=720,light:ForestLight='day',setting:ForestSetting='forest'):string {
  const colors=light==='day'?['#71CFF0','#D4ED8B','#D8B65E','#1E542D','#3F8D35','#95C54C']:
    light==='sunset'?['#F58C46','#FFE28E','#AF633B','#2A4E32','#6E8638','#D4BB53']:
    ['#15264C','#345680','#385446','#101F2A','#254C40','#457D59'];
  const [sky,horizon,ground,dark,leaf,highlight]=colors,gy=height*.785;
  const tree=(x:number,scale:number,index:number,depth:number)=>{
    const y=gy-depth*height*.12,trunk='#674127',sx=width/1280,sy=height/720;
    const leaves=Array.from({length:34},(_,i)=>{const a=i*2.4,cx=Math.cos(a)*(44+i%4*13),cy=-218+Math.sin(a)*(38+i%3*12);return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${28+i%5*3}" ry="${18+i%4*2}" fill="${i%4===0?highlight:i%3===0?dark:leaf}" transform="rotate(${i%7*9} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;}).join('');
    return `<g transform="translate(${x} ${y}) scale(${scale*sx} ${scale*sy})" opacity="${depth?'.64':'1'}"><path d="M-17 4Q-10 -83 -24 -153L-54 -204 -36 -195 -15 -167 -11 -214 4 -220 3 -155 35 -189 49 -195 20 -148 13 -50 22 7Z" fill="${trunk}" stroke="${dark}" stroke-width="4"/><path d="M-6 -7Q0 -70 -5 -135M-2 -111L22 -151M-13 -141L-34 -177" stroke="#A57137" stroke-width="5" fill="none"/>${leaves}<path d="M-24 4Q-2 -5 31 7" fill="none" stroke="${dark}" stroke-width="6"/></g>`;
  };
  const distant=Array.from({length:10},(_,i)=>tree(width*(i/9),.9+(i%3)*.12,i,1)).join('');
  const near=tree(width*.03,2.5,1,0)+tree(width*.95,2.55,2,0);
  const plants=Array.from({length:30},(_,i)=>{
    const x=width*i/29,y=gy+height*.025+(i%4)*height*.021;
    return `<g transform="translate(${x} ${y})"><path d="M0 2Q-10 -17 -22 -18Q-13 -2 0 2M0 2Q2 -24 10 -31Q16 -12 0 2M0 2Q19 -17 26 -12Q16 4 0 2" fill="${i%3?leaf:highlight}" stroke="${dark}" stroke-width="1.5"/></g>`;
  }).join('');
  const set=setting==='cave'?`<path d="M0 0H${width*.44}Q${width*.34} ${height*.32} ${width*.40} ${gy}L0 ${height}Z" fill="#513F30"/><path d="M0 0H${width*.33}Q${width*.24} ${height*.39} ${width*.29} ${gy}L0 ${height}Z" fill="#302B25"/><path d="M0 ${height*.4}Q${width*.16} ${height*.37} ${width*.28} ${gy}" fill="none" stroke="#7C6951" stroke-width="9"/>`:
    setting==='river'?`<path d="M${width*.57} ${gy-height*.21}Q${width*.38} ${gy-height*.1} ${width*.68} ${gy-height*.06}Q${width*.93} ${gy} ${width*.64} ${height}H${width}V${height*.72}Q${width*.73} ${gy-height*.06} ${width*.68} ${gy-height*.21}Z" fill="#40B4CF"/><path d="M${width*.55} ${gy-height*.14}Q${width*.49} ${gy-height*.05} ${width*.73} ${gy}" fill="none" stroke="#A4E5E6" stroke-width="5"/>`:
    setting==='camp'?`<g transform="translate(${width*.12} ${gy})"><path d="M-58 0L3 -145 76 0Z" fill="#C99C4A" stroke="#573A20" stroke-width="4"/><path d="M-30 0L3 -104 33 0Z" fill="#593D29"/><path d="M-38 -35L-5 -121M-17 -29L8 -118M42 -24L15 -113M59 -9L26 -89" stroke="#9A6B32" stroke-width="4"/></g>`:'';
  const stars=light==='night'?Array.from({length:26},(_,i)=>`<circle cx="${width*(.08+((i*37)%83)/100)}" cy="${height*(.02+((i*13)%30)/100)}" r="${1+i%2}" fill="#E3F2DC" opacity=".8"/>`).join(''):'';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="forest-sky" x2="0" y2="1"><stop stop-color="${sky}"/><stop offset="1" stop-color="${horizon}"/></linearGradient><linearGradient id="forest-floor" x2="0" y2="1"><stop stop-color="${ground}"/><stop offset="1" stop-color="${light==='night'?'#182D2B':'#A56832'}"/></linearGradient><radialGradient id="forest-sun"><stop stop-color="${light==='night'?'#B3CBEE':'#FFF5A1'}" stop-opacity=".7"/><stop offset="1" stop-color="${horizon}" stop-opacity="0"/></radialGradient></defs><rect width="${width}" height="${height}" fill="url(#forest-sky)"/>${stars}<circle cx="${width*.53}" cy="${height*.23}" r="${height*.33}" fill="url(#forest-sun)"/><path d="M0 ${height*.48}Q${width*.22} ${height*.2} ${width*.49} ${height*.51}Q${width*.7} ${height*.22} ${width} ${height*.49}V${height}H0Z" fill="${dark}" opacity=".35"/>${distant}<path d="M0 ${gy-height*.02}Q${width*.2} ${gy-height*.05} ${width*.43} ${gy}Q${width*.75} ${gy-height*.03} ${width} ${gy}V${height}H0Z" fill="url(#forest-floor)"/>${set}${near}${plants}<path d="M${width*.27} ${gy+height*.015}Q${width*.49} ${gy+height*.008} ${width*.71} ${gy+height*.019}" stroke="${light==='night'?'#5A775C':'#ECCC71'}" stroke-width="5" fill="none" opacity=".55"/></svg>`;
}
