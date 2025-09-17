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
    const { images, extraInfo } = JSON.parse(event.body);

    if (!images || images.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No images provided' }),
      };
    }

    // Get API key from environment
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured' }),
      };
    }

    // --- PROMPT ---
    const systemPrompt = `
You are "SpicyBrain," an expert online reseller with 10+ years experience across UK platforms (eBay, Vinted, Depop, Facebook Marketplace, Gumtree).
You help neurodivergent users get real-world, confidence-building valuations and dopamine boosts!

CRITICAL PRICING INSTRUCTIONS: Your goal is to use actual UK "Sold" data, but encourage sellers to aim for the higher end of typical prices:
- For "Buy It Now": Use the highest sold price for similar condition, NOT the lowest! If unsure, aim a bit above average (buyers expect to make offers or ask for discounts).
- For "Starting Bid": Set at 10–20% below "Buy It Now", but never super-low unless the item is worn/very common.
- If the item doesn't sell first time, the seller can always lower price or enable "Best Offer"—never undercut yourself from the start!
- Give confident, positive pricing advice. You're helping users avoid underpricing.

Your Task: Analyze the images (and optional user notes), and return all of the following as a clean JSON object:
- title: keyword-rich, platform-friendly
- description: detailed, believable, positive, SEO-aware, and ends with "Thanks for looking! Created with SpicyLister 🌶️"
- condition: honest UK-standard grading incl. any visible flaws
- pricing:
  - startingBid: 10–20% below BIN, but never ultra-low
  - buyItNow: top end of sold prices for this type/condition
- platformTips: SINGLE friendly string, e.g. "Start high, drop later. Enable offers. You control your value!"

Add relevant info provided by the user for even better accuracy:${extraInfo ? ` (Seller notes: "${extraInfo}")` : ''}

Examples:
- iPhone 12 64GB, Good: BIN £260, Start £215
- Brand dress, Excellent: BIN £23, Start £17
- Vintage tee: BIN £30, Start £24

Only return valid JSON, never markdown or extra text!
`;

    // Prepare content for Gemini
    const contents = [{
      parts: [
        { text: systemPrompt },
        ...images.map(image => ({
          inline_data: {
            mime_type: image.mimeType,
            data: image.data,
          }
        }))
      ]
    }];

    // Call Gemini API
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
      console.error('Gemini API error:', response.status, errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'AI analysis failed',
          details: `Gemini API returned ${response.status}`,
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
          error: 'Unexpected AI response format',
        }),
      };
    }

    let responseText = aiResponse.candidates[0].content.parts[0].text;
    responseText = responseText.replace(/``````/g, "").trim();

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

    // Validate required fields
    const requiredFields = ['title', 'description', 'condition', 'pricing', 'platformTips'];
    const missingFields = requiredFields.filter(field => !parsedResult[field]);
    if (missingFields.length > 0) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: `Missing required fields: ${missingFields.join(', ')}`
        }),
      };
    }

    // Validate pricing structure
    if (!parsedResult.pricing.startingBid || !parsedResult.pricing.buyItNow) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Pricing must include both startingBid and buyItNow values'
        }),
      };
    }

    // Optional: bump prices another 10% just in case
    try {
      parsedResult.pricing.buyItNow = (parseFloat(parsedResult.pricing.buyItNow) * 1.10).toFixed(2);
      parsedResult.pricing.startingBid = (parseFloat(parsedResult.pricing.startingBid) * 1.10).toFixed(2);
    } catch { /* ignore parse errors */}

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
        details: error.message,
      }),
    };
  }
};
