export const FRONT_BODY_MANIPULATION_SELECTION='registered-front-manipulation-v1' as const;
export const FRONT_BODY_MANIPULATION_VERSION='native-front-manipulation-1';
export const isFrontManipulationView=(view:unknown):view is 'front'=>view==='front';
/** Exact own front sources. Body shoulders/rest branches/depth come from the
 * original front registration; same-person canonical bones/cuff/palm remain.
 * This registers no articulated fingers, spear, turn or accepted anatomy. */
export const frontManipulationBindings={
  lila:{file:'library/topics/prehistoric-life/body-views/lila-front-v1.png',sha256:'f25c96337a4afbee79a9ed2650e1f065d43a5bb92eade24201cafe30acff36ce',width:939,height:1675},
  karo:{file:'library/topics/prehistoric-life/body-views/karo-front-v1.png',sha256:'51dbffa390baea557b569d293bb9e7d87ad53948da17c253d060cc9efb5b1f9e',width:1024,height:1536},
} as const;
