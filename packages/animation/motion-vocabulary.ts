/** Capability/cache hints only. A substring never proves a sourced action;
 * the explanation and coverage contracts must still verify the whole cue. */
export const mentionsRunning=(text:string)=>/(?<!\p{L})(?:run(?:s|ning)?|ran|sprint(?:s|ed|ing)?|chạy)(?!\p{L})|走(?:る|り|っ)|달리|달려|뛰어/iu.test(text);
export const mentionsAirborne=(text:string)=>/(?<!\p{L})(?:jump(?:s|ed|ing)?|leap(?:s|ed|ing)?|leapt|hop(?:s|ped|ping)?|drop(?:s|ped|ping)?|nhảy|thả rơi|đánh rơi)(?!\p{L})|跳|飛び|落と|점프|뛰어|떨어/iu.test(text);
