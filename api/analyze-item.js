// Vercel Serverless Function for SpicyLister
// Multi-API fallback: Claude → Gemini

import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { images, extraInfo, isSpicyMode = true, region = 'UK' } = req.body;

    if (!images || images.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const googleKey = process.env.GOOGLE_API_KEY;

    if (!anthropicKey && !googleKey) {
      return res.status(500).json({ error: 'No API keys configured' });
    }

    const systemPrompt = buildSystemPrompt(region, extraInfo, isSpicyMode);

    let result;
    let apiUsed = 'none';

    // Try Claude first
    if (anthropicKey) {
      try {
        console.log('🤖 Trying Claude...');
        result = await callClaudeAPI(anthropicKey, images, systemPrompt);
        apiUsed = 'claude';
      } catch (err) {
        console.warn('⚠️ Claude failed:', err.message);
      }
    }

    // Fallback to Gemini
    if (!result && googleKey) {
      try {
        console.log('🤖 Fallback to Gemini...');
        result = await callGeminiAPI(googleKey, images, systemPrompt);
        apiUsed = 'gemini';
      } catch (err) {
        console.error('❌ All APIs failed');
        return res.status(500).json({ error: 'AI services unavailable' });
      }
    }

    if (!result) {
      return res.status(500).json({ error: 'No AI service available' });
    }

    result.apiUsed = apiUsed;
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
}

async function callClaudeAPI(apiKey, images, prompt) {
  const anthropic = new Anthropic({ apiKey });
  const imageContent = images.map(img => ({
    type: 'image',
    source: { type: 'base64', media_type: img.mimeType, data: img.data }
  }));

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [{ role: 'user', content: [...imageContent, { type: 'text', text: prompt }] }]
  });

  return parseResponse(response.content[0].text);
}

async function callGeminiAPI(apiKey, images, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            ...images.map(img => ({ inline_data: { mime_type: img.mimeType, data: img.data } }))
          ]
        }]
      })
    }
  );

  if (!res.ok) throw new Error('Gemini API failed');
  const data = await res.json();
  return parseResponse(data.candidates[0].content.parts[0].text);
}

function parseResponse(text) {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  
  return {
    title: parsed.title || 'Item for Sale',
    description: parsed.description || 'As shown',
    condition: parsed.condition || 'Good',
    category: parsed.category || 'Other',
    rarity: parsed.rarity || 'Common',
    spicyComment: parsed.spicyComment || 'Ready to list!',
    priceLow: Number(parsed.priceLow) || 5,
    priceHigh: Number(parsed.priceHigh) || 10,
    dimensions: parsed.dimensions || { length: 15, width: 10, height: 5, confidence: 50 },
    weight: parsed.weight || { grams: 200, confidence: 50 },
    material: parsed.material || 'Mixed',
    fragility: parsed.fragility || 'medium'
  };
}

function buildSystemPrompt(region, extraInfo, isSpicyMode) {
  return `You're SpicyBrain, an expert reseller. Analyze the image and return ONLY valid JSON with: title, description, condition, category, rarity, spicyComment, priceLow, priceHigh, dimensions{length,width,height,confidence}, weight{grams,confidence}, material, fragility(low/medium/high). Price realistically for ${region} market.${extraInfo ? ` Notes: ${extraInfo}` : ''}${isSpicyMode ? ' Be witty!' : ''}`;
}
