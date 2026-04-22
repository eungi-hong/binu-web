/* Lexicon-based sentiment classifier, on-device.
 * Mirrors the Swift app: positive / negative / neutral. */

const LEX = {
  pos: ["love","great","amazing","happy","joy","grateful","safe","proud","calm","relief","hope","better","supported","wonderful","kind","strong","healed","confident","peaceful","excited","thank","brave"],
  neg: ["sad","pain","hurt","scared","anxious","anxiety","depressed","alone","lonely","angry","afraid","panic","worried","worry","cramp","cramps","bleeding","worst","stress","tired","exhausted","ashamed","embarrassed","confused","overwhelmed","sick","terrible","awful","hate","crying","cry"]
};

export function classify(text) {
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  let score = 0;
  for (const w of words) {
    if (LEX.pos.includes(w)) score += 1;
    if (LEX.neg.includes(w)) score -= 1;
  }
  const norm = words.length ? score / Math.sqrt(words.length) : 0;
  if (norm > 0.25) return { label: "positive", score: norm };
  if (norm < -0.25) return { label: "negative", score: norm };
  return { label: "neutral", score: norm };
}
