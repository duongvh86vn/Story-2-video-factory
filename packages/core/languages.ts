/** Narration language is independent of the Studio interface language. */
export const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
export const NARRATION_LANGUAGES = [
  { id: 'en', locale: 'en-US', name: 'English', azureVoices: ['en-US-JennyNeural', 'en-US-GuyNeural'] },
  { id: 'vi', locale: 'vi-VN', name: 'Tiếng Việt', azureVoices: ['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural'] },
  { id: 'ja', locale: 'ja-JP', name: '日本語 · Tiếng Nhật', azureVoices: ['ja-JP-NanamiNeural', 'ja-JP-KeitaNeural'] },
  { id: 'ko', locale: 'ko-KR', name: '한국어 · Tiếng Hàn', azureVoices: ['ko-KR-SunHiNeural', 'ko-KR-InJoonNeural'] },
] as const;
export function primaryLanguage(language: string): string { return language.split('-')[0]!.toLowerCase(); }
export function speechLocale(language: string): string {
  return language.includes('-') ? language : NARRATION_LANGUAGES.find(item => item.id === language)?.locale ?? language;
}
export function captionFonts(font:string,language:string):string[]{
  const fallback=primaryLanguage(language)==='ja'?['Yu Gothic','MS Gothic','Noto Sans CJK JP']
    :primaryLanguage(language)==='ko'?['Malgun Gothic','Noto Sans CJK KR']:[];
  return [...new Set([font,...fallback])];
}
