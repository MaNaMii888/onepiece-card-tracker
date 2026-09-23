/**
 * Gemini AI Vision Service Layer
 */
import { getGeminiApiKey } from './state.js';

export async function scanCardWithGemini(base64Data, mimeType) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const prompt = `Analyze this trading card image (likely One Piece Card Game, or other TCG).
Identify and extract:
1. Character/Card name and card code (e.g. "Monkey D. Luffy [OP05-119]").
2. Card set / Booster name (e.g. "OP-05 Awakening of the New Era").
3. Rarity & Condition: Look at the card itself (is it SEC, Manga Rare, Leader Parallel, SP Special, SR, or Normal?) and check if it is graded in a slab (like PSA 10, PSA 9, BGS 9.5) or raw/ungraded.
Match the best option from this list if applicable:
- "Manga Rare (Raw/NM)"
- "SEC Super Secret (PSA 10)"
- "SEC Super Secret (NM)"
- "SP Special (PSA 10)"
- "SP Special (NM)"
- "Leader Parallel (NM)"
- "SR Super Rare (NM)"
- "PSA 10 Gem Mint"
- "PSA 9 Mint"
- "Raw / Near Mint (NM)"
- "Played / Good"

Return STRICT JSON only with this schema:
{
  "cardName": "Card Name with code",
  "cardSet": "Card Set Name",
  "rarityCondition": "Matched condition"
}`;

  // Candidate models from user quota: gemini-2.5-flash, gemini-2.5-flash-lite, gemini-3.1-flash-lite
  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              }
            ]
          }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.2
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        lastError = new Error(errData.error?.message || `Model ${model} returned ${response.status}`);
        continue; // Try next available model in cascade
      }

      const resData = await response.json();
      const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResult) continue;

      return JSON.parse(textResult);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('ไม่สามารถเชื่อมต่อโมเดล AI ได้');
}
