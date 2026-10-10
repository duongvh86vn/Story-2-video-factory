import type {NativeMouthRegistration} from './body-view-mouth.js';

export const BASIC_BODY_SPEECH_SELECTION='registered-basic-mouth-v1' as const;
export const BASIC_BODY_MOUTH_VERSION='forest-basic-view-mouth-1';
export const BASIC_MOUTH_VIEWS=['front','left','right'] as const;
export type BasicMouthView=typeof BASIC_MOUTH_VIEWS[number];
export function isBasicMouthView(view:unknown):view is BasicMouthView{return BASIC_MOUTH_VIEWS.some(v=>v===view);}
/** Independent source-canvas authoring, never another view's ROI or plate.
 * Only the mouth region is reconstructed. Nose, beard rim, eyes and hair are
 * outside these clips. Coordinates/skin strips/contours need visual review;
 * no measured anatomy, yaw, identity, optical or production acceptance. */
export const bodyViewBasicMouthRegistration={
  lila:{
    front:{view:'front',file:'library/topics/prehistoric-life/body-views/lila-front-v1.png',sourceHash:'f25c96337a4afbee79a9ed2650e1f065d43a5bb92eade24201cafe30acff36ce',sourceSize:[939,1675],kind:'skin-strip',sourceErase:true,resting:'source-closed',bounds:{x:420,y:425,width:145,height:60},
      clip:'M425 430C439 421 447 442 470 449C504 462 536 444 548 430C559 424 566 435 558 445C541 470 505 478 470 465C447 459 432 447 425 442Z',
      top:[{x:434,y:438},{x:465,y:470},{x:530,y:470},{x:552,y:435}],depth:26,lift:7,stroke:5,curvedTeeth:true,strip:{x:460,y:485,width:70,height:3}},
    left:{view:'left',file:'library/topics/prehistoric-life/body-views/lila-left-v2.png',sourceHash:'aa8ef7e30b11bf8f34b85ca7de211d20c0900a09437ba3a10e76aab7eee0afee',sourceSize:[1173,1341],kind:'skin-strip',sourceErase:true,resting:'source-closed',bounds:{x:440,y:344,width:60,height:46},
      clip:'M442 354C454 360 474 355 483 347C494 340 501 352 491 363C477 377 458 382 445 372Z',
      top:[{x:447,y:363},{x:463,y:372},{x:482,y:364},{x:489,y:353}],depth:14,lift:3,stroke:4,curvedTeeth:true,strip:{x:462,y:390,width:28,height:3}},
    right:{view:'right',file:'library/topics/prehistoric-life/body-views/lila-right-v3.png',sourceHash:'4ee7c232a489162159542d58f06ae16a72fadb9bc1382170b5c07a6ca3c4e311',sourceSize:[1024,1536],kind:'skin-strip',sourceErase:true,resting:'source-closed',bounds:{x:655,y:365,width:85,height:53},
      clip:'M659 369C669 359 678 378 693 384C705 390 722 389 730 388C742 386 742 398 731 404C707 415 680 402 664 386Z',
      top:[{x:667,y:378},{x:680,y:394},{x:711,y:404},{x:726,y:395}],depth:18,lift:5,stroke:5,curvedTeeth:true,strip:{x:670,y:421,width:40,height:3}},
  },
  karo:{
    front:{view:'front',file:'library/topics/prehistoric-life/body-views/karo-front-v1.png',sourceHash:'51dbffa390baea557b569d293bb9e7d87ad53948da17c253d060cc9efb5b1f9e',sourceSize:[1024,1536],kind:'skin-strip',sourceErase:true,resting:'closed-overlay',bounds:{x:450,y:382,width:135,height:54},
      clip:'M453 383C480 389 550 389 580 383C576 407 550 432 519 433C489 434 463 413 453 383Z',
      top:[{x:458,y:393},{x:484,y:402},{x:546,y:402},{x:574,y:393}],depth:27,lift:4,stroke:4,curvedTeeth:true,strip:{x:485,y:440,width:45,height:3}},
    left:{view:'left',file:'library/topics/prehistoric-life/body-views/karo-left-v1.png',sourceHash:'9d000f6134385eebba1b79aaff8cb07b266bca9b87e16f3bd3529b379a2a8e6b',sourceSize:[910,1728],kind:'skin-strip',sourceErase:true,resting:'closed-overlay',bounds:{x:259,y:461,width:52,height:42},
      clip:'M262 468C275 475 293 471 305 464C306 482 290 499 270 501L263 489Z',
      top:[{x:266,y:473},{x:276,y:482},{x:291,y:478},{x:303,y:471}],depth:15,lift:2,stroke:3,curvedTeeth:true,strip:{x:279,y:506,width:16,height:3}},
    right:{view:'right',file:'library/topics/prehistoric-life/body-views/karo-right-v2.png',sourceHash:'d3bf00b107d07c12a7384610a9181d6aa2ca14f9e5e160ff133f69aece3f37d8',sourceSize:[910,1727],kind:'skin-strip',sourceErase:true,resting:'closed-overlay',bounds:{x:599,y:411,width:80,height:48},
      clip:'M602 413C621 418 656 419 675 416C671 436 653 453 636 451C619 449 607 433 602 413Z',
      top:[{x:606,y:420},{x:621,y:430},{x:654,y:431},{x:672,y:421}],depth:18,lift:3,stroke:3,curvedTeeth:true,strip:{x:626,y:460,width:23,height:3}},
  },
} as const satisfies Record<'lila'|'karo',Record<BasicMouthView,NativeMouthRegistration&{view:BasicMouthView;file:string}>>;
