import type {NativeBrowRegistration} from './body-view-expressions.js';

export const BASIC_BODY_EXPRESSIONS_SELECTION='registered-basic-expressions-v1' as const;
export const BASIC_BODY_EXPRESSIONS_VERSION='forest-basic-view-expressions-1';
export const BASIC_EXPRESSION_VIEWS=['front','left','right'] as const;
export type BasicExpressionView=typeof BASIC_EXPRESSION_VIEWS[number];
export function isBasicExpressionView(view:unknown):view is BasicExpressionView{return BASIC_EXPRESSION_VIEWS.some(v=>v===view);}
/** Independent own-source brow ink/skin authoring cues, not measured anatomy.
 * Front has two screen slots; profile has one visible slot, never a guessed
 * hidden brow. Clip, skin and motion cues require actual artistic review. */
export const bodyViewBasicExpressionRegistration={
  lila:{
    front:{view:'front',file:'library/topics/prehistoric-life/body-views/lila-front-v1.png',sourceHash:'f25c96337a4afbee79a9ed2650e1f065d43a5bb92eade24201cafe30acff36ce',sourceSize:[939,1675],brows:[
      {slot:'screen-left',center:{x:422,y:316},bounds:{x:386,y:296,width:68,height:43},clip:'M390 331C399 310 425 298 446 305L448 314C428 311 408 320 398 337Z',strip:{x:414,y:339,width:27,height:3}},
      {slot:'screen-right',center:{x:579,y:305},bounds:{x:546,y:289,width:70,height:43},clip:'M549 300C567 287 592 295 607 316C607 326 599 326 594 317C580 305 567 307 555 306Z',strip:{x:564,y:330,width:27,height:3}},
    ]},
    left:{view:'left',file:'library/topics/prehistoric-life/body-views/lila-left-v2.png',sourceHash:'aa8ef7e30b11bf8f34b85ca7de211d20c0900a09437ba3a10e76aab7eee0afee',sourceSize:[1173,1341],brows:[
      {slot:'screen-left',center:{x:495,y:245},bounds:{x:474,y:229,width:45,height:34},clip:'M477 239C483 228 499 230 508 241L515 256C515 263 507 263 505 255C497 244 488 240 481 243Z',strip:{x:489,y:264,width:22,height:3}},
    ]},
    right:{view:'right',file:'library/topics/prehistoric-life/body-views/lila-right-v3.png',sourceHash:'4ee7c232a489162159542d58f06ae16a72fadb9bc1382170b5c07a6ca3c4e311',sourceSize:[1024,1536],brows:[
      {slot:'screen-right',center:{x:679,y:245},bounds:{x:653,y:224,width:56,height:41},clip:'M657 253C668 232 683 224 697 231C706 235 704 243 697 244C682 241 671 250 665 261Z',strip:{x:677,y:264,width:25,height:3}},
    ]},
  },
  karo:{
    front:{view:'front',file:'library/topics/prehistoric-life/body-views/karo-front-v1.png',sourceHash:'51dbffa390baea557b569d293bb9e7d87ad53948da17c253d060cc9efb5b1f9e',sourceSize:[1024,1536],brows:[
      {slot:'screen-left',center:{x:450,y:237},bounds:{x:408,y:219,width:80,height:38},clip:'M410 242C424 224 451 215 478 225C490 233 486 240 474 240C451 239 428 249 414 256Z',strip:{x:439,y:260,width:27,height:3}},
      {slot:'screen-right',center:{x:606,y:239},bounds:{x:568,y:219,width:78,height:41},clip:'M574 232C576 217 598 218 615 230C630 240 641 248 640 257C636 260 630 255 624 250C605 237 590 235 579 235Z',strip:{x:582,y:262,width:25,height:3}},
    ]},
    left:{view:'left',file:'library/topics/prehistoric-life/body-views/karo-left-v1.png',sourceHash:'9d000f6134385eebba1b79aaff8cb07b266bca9b87e16f3bd3529b379a2a8e6b',sourceSize:[910,1728],brows:[
      {slot:'screen-left',center:{x:319,y:320},bounds:{x:289,y:297,width:63,height:48},clip:'M294 309C299 296 317 301 331 310C342 318 351 329 346 338C340 343 330 331 319 325C307 319 297 321 294 315Z',strip:{x:307,y:342,width:25,height:3}},
    ]},
    right:{view:'right',file:'library/topics/prehistoric-life/body-views/karo-right-v2.png',sourceHash:'d3bf00b107d07c12a7384610a9181d6aa2ca14f9e5e160ff133f69aece3f37d8',sourceSize:[910,1727],brows:[
      {slot:'screen-right',center:{x:603,y:265},bounds:{x:562,y:239,width:78,height:49},clip:'M565 272C580 254 604 240 622 245C634 248 636 259 625 263C605 266 589 274 574 285C566 289 561 281 565 272Z',strip:{x:599,y:288,width:27,height:3}},
    ]},
  },
} as const satisfies Record<'lila'|'karo',Record<BasicExpressionView,{view:BasicExpressionView;file:string;sourceHash:string;sourceSize:readonly[number,number];brows:readonly[NativeBrowRegistration,...NativeBrowRegistration[]]}>>;
