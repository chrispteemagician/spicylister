/**
 * SpicyLister v2.5 - Multi-API Fallback System
 * 
 * Tries Claude API first, falls back to Gemini if Claude fails
 * Includes dimension estimation, weight, materials, and fragility
 * 
 * Built with 💚 for the neurodivergent community
 */

const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { images, extraInfo, isSpicyMode = true, region = 'UK' } = JSON.parse(event.body);

    if (!images || images.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No images provided' }),
      };
    }

    // Get API keys from environment
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const googleKey = process.env.GOOGLE_API_KEY;

    if (!anthropicKey && !googleKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'No API keys configured' }),
      };
    }

    // Build the system prompt
    const systemPrompt = buildSystemPrompt(region, extraInfo, isSpicyMode);

    let result;
    let apiUsed = 'none';
    let lastError;

    // Try Claude first
    if (anthropicKey) {
      try {
        console.log('🤖 Attempting Claude API...');
        result = await callClaudeAPI(anthropicKey, images, systemPrompt);
        apiUsed = 'claude';
        console.log('✅ Successfully used Claude API');
      } catch (claudeError) {
        console.warn('⚠️ Claude failed:', claudeError.message);
        lastError = claudeError;
      }
    }

    // Fallback to Gemini if Claude failed or unavailable
    if (!result && googleKey) {
      try {
        console.log('🤖 Falling back to Gemini API...');
        result = await callGeminiAPI(googleKey, images, systemPrompt);
        apiUsed = 'gemini';
        console.log('✅ Successfully used Gemini API (fallback)');
      } catch (geminiError) {
        console.error('❌ Gemini also failed:', geminiError.message);
        if (lastError) {
          throw new Error(`All AI services failed. Claude: ${lastError.message}, Gemini: ${geminiError.message}`);
        } else {
          throw geminiError;
        }
      }
    }

    if (!result) {
      throw new Error('No AI service available or all failed');
    }

    // Add API metadata
    result.apiUsed = apiUsed;
    result.timestamp = new Date().toISOString();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('Analysis error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to analyze item', 
        details: error.message 
      }),
    };
  }
};

/**
 * Call Claude (Anthropic) API
 */
async function callClaudeAPI(apiKey, images, systemPrompt) {
  const anthropic = new Anthropic({ apiKey });

  // Convert images to Claude format
  const imageContent = images.map(img => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: img.mimeType,
      data: img.data,
    },
  }));

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: systemPrompt,
          },
        ],
      },
    ],
  });

  const responseText = response.content[0].text;
  return parseAndValidateResponse(responseText);
}

/**
 * Call Gemini API (fallback)
 */
async function callGeminiAPI(apiKey, images, systemPrompt) {
  const contents = [{
    parts: [
      { text: systemPrompt },
      ...images.map(image => ({
        inline_data: {
          mime_type: image.mimeType,
          data: image.data,
        },
      })),
    ],
  }];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const aiResponse = await response.json();

  if (!aiResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Unexpected Gemini response structure');
  }

  const responseText = aiResponse.candidates[0].content.parts[0].text;
  return parseAndValidateResponse(responseText);
}

/**
 * Parse and validate AI response
 */
function parseAndValidateResponse(responseText) {
  // Clean up response
  const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${e.message}`);
  }

  // Validate and provide defaults
  const result = {
    title: parsed.title || 'Item for Sale',
    description: parsed.description || 'Item as shown in photos.',
    condition: parsed.condition || 'Good condition',
    category: parsed.category || 'Other',
    rarity: parsed.rarity || 'Common',
    spicyComment: parsed.spicyComment || "Let's get this listed!",
    priceLow: Number(parsed.priceLow) || 5,
    priceHigh: Number(parsed.priceHigh) || 10,
    dimensions: validateDimensions(parsed.dimensions),
    weight: validateWeight(parsed.weight),
    material: parsed.material || 'Mixed materials',
    fragility: ['low', 'medium', 'high'].includes(parsed.fragility) ? parsed.fragility : 'medium',
  };

  // Add shipping recommendation
  result.recommendedPackaging = calculateShippingRecommendation(
    result.dimensions,
    result.weight,
    result.fragility
  );

  return result;
}

function validateDimensions(dims) {
  if (!dims || typeof dims !== 'object') {
    return { length: 15, width: 10, height: 5, confidence: 50 };
  }
  return {
    length: Number(dims.length) || 15,
    width: Number(dims.width) || 10,
    height: Number(dims.height) || 5,
    confidence: Number(dims.confidence) || 50,
  };
}

function validateWeight(weight) {
  if (!weight || typeof weight !== 'object') {
    return { grams: 200, confidence: 50 };
  }
  return {
    grams: Number(weight.grams) || 200,
    confidence: Number(weight.confidence) || 50,
  };
}

function calculateShippingRecommendation(dimensions, weight, fragility) {
  const PACKAGING = {
    'large-letter': { maxL: 24, maxW: 16, maxH: 3, maxWeight: 750, price: 0.85 },
    'small-parcel': { maxL: 45, maxW: 35, maxH: 16, maxWeight: 2000, price: 1.20 },
    'medium-parcel': { maxL: 61, maxW: 46, maxH: 46, maxWeight: 20000, price: 2.50 },
    'large-parcel': { maxL: 999, maxW: 999, maxH: 999, maxWeight: 30000, price: 4.00 },
  };

  const { length, width, height } = dimensions;
  const weightGrams = weight.grams;

  const paddedL = length + 3;
  const paddedW = width + 3;
  const paddedH = height + 3;

  let recommended = 'large-parcel';
  const sizes = ['large-letter', 'small-parcel', 'medium-parcel', 'large-parcel'];

  for (const size of sizes) {
    const pkg = PACKAGING[size];
    if (paddedL <= pkg.maxL && paddedW <= pkg.maxW && paddedH <= pkg.maxH && weightGrams <= pkg.maxWeight) {
      recommended = size;
      break;
    }
  }

  if (fragility === 'high' && recommended !== 'large-parcel') {
    const currentIndex = sizes.indexOf(recommended);
    recommended = sizes[Math.min(currentIndex + 1, sizes.length - 1)];
  }

  return {
    size: recommended,
    price: PACKAGING[recommended].price,
    reason: fragility === 'high' ? 'Upsized for fragile item' : 'Best fit with padding',
  };
}

function buildSystemPrompt(region, extraInfo, isSpicyMode) {
  return `You are **"SpicyBrain,"** an expert online reseller with 10+ years of experience. Analyze images and generate complete listing packages INCLUDING shipping intelligence.

**YOUR MISSION:** Provide realistic, research-based pricing and shipping details.

**CRITICAL PRICING INSTRUCTIONS:**
1. IDENTIFY exact item: brand, model, year, size, color, condition
2. RESEARCH current ${region} market values by considering:
   - What similar items ACTUALLY SELL FOR (not asking prices)
   - Brand reputation and demand
   - Condition impact
   - Seasonal factors
   - Rarity
3. PRICE REALISTICALLY based on actual market data

**SHIPPING INTELLIGENCE:**
1. **DIMENSIONS** - Estimate L×W×H in cm with confidence score
2. **WEIGHT** - Estimate grams with confidence score  
3. **MATERIAL** - Identify primary materials
4. **FRAGILITY** - Assess as low/medium/high

**Output Format:** Return ONLY valid JSON:
{
  "title": "SEO-optimized title",
  "description": "Friendly description with bullet points",
  "condition": "Honest condition",
  "category": "Primary category",
  "rarity": "${isSpicyMode ? 'Common/Rare/Epic/Legendary/God-Tier' : 'Standard'}",
  "spicyComment": "${isSpicyMode ? 'Witty British comment' : 'Professional assessment'}",
  "priceLow": 10,
  "priceHigh": 20,
  "dimensions": { "length": 15, "width": 10, "height": 5, "confidence": 75 },
  "weight": { "grams": 250, "confidence": 70 },
  "material": "Material description",
  "fragility": "low/medium/high"
}

**Common Sizes Reference:**
- Smartphone: ~15×7×1cm, ~180g
- Book: ~20×13×2cm, ~300g
- T-shirt: ~30×25×3cm, ~200g
- Mug: ~10×10×10cm, ~350g
${extraInfo ? `\n\n**Seller notes:** "${extraInfo}"` : ''}
${isSpicyMode ? '\n**SPICY MODE:** Be witty and entertaining!' : '\n**PROFESSIONAL MODE:** Keep it businesslike.'}`;
}
