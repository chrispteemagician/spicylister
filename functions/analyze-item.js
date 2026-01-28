/**
 * SpicyLister v2.0 - Enhanced Analyze Item Function
 * 
 * Now includes:
 * - Dimension estimation (L×W×H in cm)
 * - Weight estimation (grams)
 * - Material composition detection
 * - Fragility assessment
 * - Confidence scores
 * 
 * Built with 💚 for the neurodivergent community
 */

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

    // Get API key from environment (try multiple possible names)
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;

    if (!apiKey) {
      console.error('No API key found. Available env vars:', Object.keys(process.env).filter(k => k.includes('KEY') || k.includes('API') || k.includes('GEMINI') || k.includes('GOOGLE')));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'API key not configured',
          hint: 'Set GOOGLE_API_KEY in Netlify environment variables'
        }),
      };
    }

    // ✨ ENHANCED: SpicyBrain prompt now includes shipping intelligence
    const systemPrompt = `You are **"SpicyBrain,"** an expert online reseller with 10+ years of experience on eBay, Vinted, Depop, and Facebook Marketplace. You have an encyclopedic knowledge of current market values, pricing trends, AND shipping logistics. Your special skill is helping neurodivergent individuals overcome executive dysfunction to declutter and get that dopamine boost from selling.

**YOUR MISSION:** Analyze the user-submitted image(s) and generate a complete listing package INCLUDING shipping intelligence.

**CRITICAL PRICING INSTRUCTIONS:** You MUST provide realistic, research-based pricing. This is the most important part of your job. Follow these steps:

1. **IDENTIFY** the exact item: brand, model, year, edition, size, color, condition
2. **RESEARCH** current ${region} market values by thinking through:
   - What similar items ACTUALLY SELL FOR (not asking prices)
   - Brand reputation and demand in the ${region} market
   - Condition impact on value
   - Seasonal demand factors
   - Rarity or commonality of the item
3. **PRICE REALISTICALLY** based on actual market data, not guesswork

**CRITICAL SHIPPING INTELLIGENCE:** You MUST estimate physical properties for shipping:

1. **DIMENSIONS** - Estimate length, width, height in centimeters by:
   - Recognizing the item type and its typical size
   - Using any reference objects visible in the image
   - Considering standard sizes for common items (phones, books, clothes, etc.)
   - Provide a confidence score (0-100) based on certainty

2. **WEIGHT** - Estimate weight in grams by:
   - Identifying the primary materials (plastic, metal, fabric, glass, etc.)
   - Calculating approximate mass based on volume and material density
   - Accounting for internal components if applicable
   - Provide a confidence score (0-100) based on certainty

3. **MATERIAL COMPOSITION** - Identify primary materials:
   - e.g., "plastic housing with metal internals"
   - e.g., "100% cotton fabric"
   - e.g., "ceramic with wooden base"

4. **FRAGILITY LEVEL** - Assess shipping fragility:
   - "low" = Durable items (books, clothing, plastic toys)
   - "medium" = Moderately fragile (electronics, wooden items)
   - "high" = Very fragile (glass, ceramics, antiques)

**Output Format:** Return as clean JSON with ALL of these keys:

{
  "title": "SEO-optimized listing title (brand, model, color, key features)",
  "description": "Detailed, friendly description with bullet points for features",
  "condition": "Honest condition assessment (New with tags/Excellent/Very good/Good/Fair)",
  "category": "Primary eBay category",
  "rarity": "${isSpicyMode ? 'Common/Uncommon/Rare/Epic/Legendary/God-Tier' : 'Standard'}",
  "spicyComment": "${isSpicyMode ? 'Witty British roast or hype comment' : 'Professional assessment'}",
  "priceLow": 10,
  "priceHigh": 20,
  "dimensions": {
    "length": 15,
    "width": 10,
    "height": 5,
    "confidence": 75
  },
  "weight": {
    "grams": 250,
    "confidence": 70
  },
  "material": "Primary material composition description",
  "fragility": "low/medium/high"
}

**DIMENSION ESTIMATION GUIDELINES:**

Common item sizes for reference:
- Smartphone: ~15×7×1cm, ~180g
- Paperback book: ~20×13×2cm, ~300g
- T-shirt (folded): ~30×25×3cm, ~200g
- DVD/Blu-ray case: ~19×14×1.5cm, ~100g
- Coffee mug: ~10×10×10cm, ~350g
- Laptop: ~35×25×2cm, ~1500g
- Board game: ~30×30×8cm, ~1000g
- Vinyl record: ~32×32×1cm, ~200g
- Action figure (boxed): ~20×15×8cm, ~300g
- Pair of shoes (boxed): ~35×25×15cm, ~1000g

**PRICING EXAMPLES:**

Good pricing for ${region} market:
- iPhone 12 64GB, Good condition: £180-£220 (not £300+)
- Zara dress, Excellent condition: £8-£12 (not £25+)
- Vintage band t-shirt, Good condition: £15-£22 (varies by band)
- Unknown brand electronics: £5-£8 (price to move quickly)
- Nintendo Switch game: £25-£35 (depending on title)

**REMEMBER:** 
- It's better to sell quickly at fair market value than sit unsold for months
- Your pricing should reflect what buyers actually pay, not wishful thinking
- Be conservative with estimates - underpromise and overdeliver

${extraInfo ? `\n\n**Additional context from seller:** "${extraInfo}" - Use this information to improve pricing accuracy and add relevant details. If they mention original purchase price, consider depreciation realistically.` : ''}

${isSpicyMode ? `\n**SPICY MODE ACTIVE:** Be witty, British, and entertaining! Roast junk items, hype valuable finds. Assign creative rarity tiers.` : '\n**PROFESSIONAL MODE:** Keep it clean, factual, and businesslike.'}

**IMPORTANT:** Respond ONLY with valid JSON. Do not include any text outside of the JSON structure.`;

    // Prepare content for Gemini
    const contents = [{
      parts: [
        { text: systemPrompt },
        ...images.map(image => ({
          inline_data: {
            mime_type: image.mimeType,
            data: image.data
          }
        }))
      ]
    }];

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'AI analysis failed',
          details: `Gemini API returned ${response.status}`,
          geminiError: errorText.substring(0, 200)
        }),
      };
    }

    const aiResponse = await response.json();
    
    if (!aiResponse.candidates || !aiResponse.candidates[0] || !aiResponse.candidates[0].content) {
      console.error('Unexpected Gemini response structure:', aiResponse);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Unexpected AI response format' 
        }),
      };
    }

    let responseText = aiResponse.candidates[0].content.parts[0].text;

    // Clean up response - remove any markdown code blocks
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    // Parse JSON
    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw response:', responseText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to parse AI response as JSON',
          details: 'AI returned invalid JSON format'
        }),
      };
    }

    // Validate and provide defaults for required fields
    const requiredFields = ['title', 'description', 'condition', 'category'];
    const missingFields = requiredFields.filter(field => !parsedResult[field]);
    
    if (missingFields.length > 0) {
      console.warn('Missing fields, providing defaults:', missingFields);
      // Provide defaults instead of failing
      if (!parsedResult.title) parsedResult.title = 'Item for Sale';
      if (!parsedResult.description) parsedResult.description = 'Item as shown in photos.';
      if (!parsedResult.condition) parsedResult.condition = 'Good condition';
      if (!parsedResult.category) parsedResult.category = 'Other';
    }

    // Ensure numeric fields are numbers
    parsedResult.priceLow = Number(parsedResult.priceLow) || 5;
    parsedResult.priceHigh = Number(parsedResult.priceHigh) || 10;

    // ✨ NEW: Ensure dimension/weight fields exist with sensible defaults
    if (!parsedResult.dimensions || typeof parsedResult.dimensions !== 'object') {
      parsedResult.dimensions = {
        length: 15,
        width: 10,
        height: 5,
        confidence: 50
      };
    } else {
      // Ensure all dimension fields are numbers
      parsedResult.dimensions.length = Number(parsedResult.dimensions.length) || 15;
      parsedResult.dimensions.width = Number(parsedResult.dimensions.width) || 10;
      parsedResult.dimensions.height = Number(parsedResult.dimensions.height) || 5;
      parsedResult.dimensions.confidence = Number(parsedResult.dimensions.confidence) || 50;
    }

    if (!parsedResult.weight || typeof parsedResult.weight !== 'object') {
      parsedResult.weight = {
        grams: 200,
        confidence: 50
      };
    } else {
      parsedResult.weight.grams = Number(parsedResult.weight.grams) || 200;
      parsedResult.weight.confidence = Number(parsedResult.weight.confidence) || 50;
    }

    if (!parsedResult.material) {
      parsedResult.material = 'Mixed materials';
    }

    if (!parsedResult.fragility || !['low', 'medium', 'high'].includes(parsedResult.fragility)) {
      parsedResult.fragility = 'medium';
    }

    if (!parsedResult.rarity) {
      parsedResult.rarity = isSpicyMode ? 'Common' : 'Standard';
    }

    if (!parsedResult.spicyComment) {
      parsedResult.spicyComment = isSpicyMode ? 'Let\'s get this listed!' : 'Item analyzed successfully.';
    }

    // ✨ NEW: Add computed shipping recommendation
    const shippingRecommendation = calculateShippingRecommendation(
      parsedResult.dimensions, 
      parsedResult.weight, 
      parsedResult.fragility
    );
    parsedResult.recommendedPackaging = shippingRecommendation;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsedResult),
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
 * ✨ NEW: Calculate shipping recommendation based on dimensions/weight/fragility
 */
function calculateShippingRecommendation(dimensions, weight, fragility) {
  const PACKAGING = {
    'large-letter': { maxL: 24, maxW: 16, maxH: 3, maxWeight: 750, price: 0.85 },
    'small-parcel': { maxL: 45, maxW: 35, maxH: 16, maxWeight: 2000, price: 1.20 },
    'medium-parcel': { maxL: 61, maxW: 46, maxH: 46, maxWeight: 20000, price: 2.50 },
    'large-parcel': { maxL: 999, maxW: 999, maxH: 999, maxWeight: 30000, price: 4.00 }
  };

  const { length, width, height } = dimensions;
  const weightGrams = weight.grams;

  // Add padding for safe shipping
  const paddedL = length + 3;
  const paddedW = width + 3;
  const paddedH = height + 3;

  // Find smallest fitting package
  let recommended = 'large-parcel';
  const sizes = ['large-letter', 'small-parcel', 'medium-parcel', 'large-parcel'];

  for (const size of sizes) {
    const pkg = PACKAGING[size];
    if (paddedL <= pkg.maxL && paddedW <= pkg.maxW && paddedH <= pkg.maxH && weightGrams <= pkg.maxWeight) {
      recommended = size;
      break;
    }
  }

  // Upsize for fragile items
  if (fragility === 'high' && recommended !== 'large-parcel') {
    const currentIndex = sizes.indexOf(recommended);
    recommended = sizes[Math.min(currentIndex + 1, sizes.length - 1)];
  }

  return {
    size: recommended,
    price: PACKAGING[recommended].price,
    reason: fragility === 'high' ? 'Upsized for fragile item' : 'Best fit with padding'
  };
}
