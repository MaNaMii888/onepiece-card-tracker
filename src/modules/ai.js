/**
 * Gemini AI Vision Service Layer
 * Dynamic Model Discovery & Fallback Cascade
 */
import { getGeminiApiKey } from './state.js';

async function findUsableModel(apiKeyString) {
  try {
    const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKeyString}`);
    if (!listResponse.ok) return null;
    const modelDirectory = await listResponse.json();
    const candidateList = (modelDirectory.models || []).filter(singleModel => {
      const isGenerateSupported = singleModel.supportedGenerationMethods?.includes('generateContent');
      const isTextOrVision = !singleModel.name.includes('tts') && !singleModel.name.includes('embedding');
      return isGenerateSupported && isTextOrVision;
    });

    const matchedFlash = candidateList.find(singleModel => singleModel.name.includes('flash'));
    if (matchedFlash) {
      return matchedFlash.name.replace(/^models\//, '');
    }
    if (candidateList.length > 0) {
      return candidateList[0].name.replace(/^models\//, '');
    }
  } catch (directoryError) {
    return null;
  }
  return null;
}

export async function scanCardWithGemini(base64Content, imageMimeType) {
  const apiKeyString = getGeminiApiKey();
  if (!apiKeyString) {
    throw new Error('MISSING_API_KEY');
  }

  const promptText = `Analyze this trading card image (likely One Piece Card Game, or other TCG).
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

  const dynamicModel = await findUsableModel(apiKeyString);
  const prioritizedModels = [
    dynamicModel,
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash'
  ].filter(Boolean);

  let caughtFailure = null;

  for (const modelIdentifier of prioritizedModels) {
    try {
      const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelIdentifier}:generateContent?key=${apiKeyString}`;
      const apiResponse = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText },
              {
                inline_data: {
                  mime_type: imageMimeType,
                  data: base64Content
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

      if (!apiResponse.ok) {
        const errorJson = await apiResponse.json().catch(() => ({}));
        caughtFailure = new Error(errorJson.error?.message || `Model ${modelIdentifier} error ${apiResponse.status}`);
        continue;
      }

      const parsedResponse = await apiResponse.json();
      const generatedText = parsedResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) continue;

      return JSON.parse(generatedText);
    } catch (networkException) {
      caughtFailure = networkException;
    }
  }

  throw caughtFailure || new Error('ไม่สามารถเชื่อมต่อโมเดล AI ได้');
}
