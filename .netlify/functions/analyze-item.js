const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { image, spicyMode, proMode } = JSON.parse(event.body || '{}');

    if (!image) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image required' }),
      };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const anthropic = new Anthropic({ apiKey });

    const BASIC_PROMPT = `You are SpicyLister AI, an expert at creating compelling marketplace listings.

Analyze this item photo and create a listing with:

1. **Title** (60 chars max, keyword-rich, SEO-optimized)
2. **Description** (engaging, detailed, honest condition assessment)
3. **Price Range** (realistic UK market prices in GBP)
4. **Category** (eBay/Vinted category)
5. **Condition** (New/Like New/Good/Fair/Poor)
6. **Rarity Tier** (Common/Uncommon/Rare/Epic/Legendary/God-Tier)
${spicyMode ? '7. **Spicy Comment** (funny, cheeky observation about the item)' : ''}
8. **Dimensions** (estimated L×W×H in cm with confidence 0-100%)
9. **Weight** (estimated grams with confidence 0-100%)
10. **Material** (what it's made of)
11. **Fragility** (low/medium/high)

Return ONLY valid JSON:
{
  "title": "string",
  "description": "string",
  "priceLow": number,
  "priceHigh": number,
  "category": "string",
  "condition": "string",
  "rarity": "Common|Uncommon|Rare|Epic|Legendary|God-Tier",
  ${spicyMode ? '"spicyComment": "string",' : ''}
  "dimensions": {
    "length": number,
    "width": number,
    "height": number,
    "confidence": number
  },
  "weight": {
    "grams": number,
    "confidence": number
  },
  "material": "string",
  "fragility": "low|medium|high"
}`;

    const PRO_PROMPT = `

**PRO FEATURES ENABLED:**
- More detailed condition analysis
- Authentication tips (if applicable)
- Selling strategy recommendations
- Best marketplace suggestions (eBay vs Vinted vs Facebook)
- Optimal listing time advice`;

    const fullPrompt = proMode ? BASIC_PROMPT + PRO_PROMPT : BASIC_PROMPT;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: proMode ? 2000 : 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image,
              },
            },
            {
              type: 'text',
              text: fullPrompt,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent) {
      throw new Error('No text response from Claude');
    }

    // Parse JSON from response
    let jsonText = textContent.text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const data = JSON.parse(jsonText);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('Analysis error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: err.message || 'Analysis failed',
        details: err.toString()
      }),
    };
  }
};
