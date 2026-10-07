const ORIGIN = 'https://letters.bodeebooks.com';
export const DEFAULT_HANDWRITING = Object.freeze({ style:'print', letterCase:'lower', letters:'a, b, c', pause:30 });
export function isHandwritingUrl(value) {
  try { const url = new URL(value); return url.origin === ORIGIN && !url.username && !url.password; } catch (_) { return false; }
}
export function handwritingOptions(value) {
  if (!isHandwritingUrl(value)) return null;
  const params = new URLSearchParams(new URL(value).hash.slice(1));
  return params.get('practice') === '1' ? { style:params.get('style'), letterCase:params.get('case'), letters:params.get('letters'), pause:Number(params.get('pause') || 30) } : { ...DEFAULT_HANDWRITING };
}
export function handwritingLink({ style, letterCase, letters, pause }) {
  if (!['print','cursive'].includes(style) || !['lower','upper','digit'].includes(letterCase) || style === 'cursive' && letterCase === 'digit') throw Error('Choose print or cursive letters. Numbers use print.');
  if (typeof letters !== 'string' || letters.length > 100 || !/^[a-zA-Z0-9,\s]+$/.test(letters)) throw Error('Enter the letters to practice, separated by spaces or commas.');
  const characters = letters.replace(/[,\s]/g, '');
  if (!(letterCase === 'digit' ? /^[0-9]+$/ : /^[a-z]+$/i).test(characters)) throw Error('Choose letters for letter practice, or digits for number practice.');
  const normalized = [...new Set(letterCase === 'upper' ? characters.toUpperCase() : characters.toLowerCase())].join(',');
  if (!Number.isInteger(pause) || pause < 15 || pause > 120) throw Error('Choose a paper practice pause from 15 to 120 seconds.');
  // Fragment contains public lesson choices only; no child identity or account
  // credential is sent to the handwriting host, including in request logs.
  return `${ORIGIN}/#${new URLSearchParams({ practice:'1', style, case:letterCase, letters:normalized, pause:String(pause) })}`;
}
