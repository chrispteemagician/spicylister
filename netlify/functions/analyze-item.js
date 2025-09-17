// netlify/functions/analyze-item.js

const fetch = require('node-fetch');

exports.handler = async (event) => {
  // CORS headers for preflight and main requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse body
    const { images, extraInfo = '' } = JSON.parse(event.body);
    if (!images || images.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No images provided' })
      };
    }

    // Get Gemini API key from environment
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured in Netlify' })
      };
    }

    // Craft an auction-empowering prompt!
    const prompt = `
You are "SpicyBrain", a champion online seller and pricing expert for UK marketplaces.
Your goal: empower neurodivergent users with confident, data-driven advice and premium, realistic pricing.
Analyze the attached item photos and (optional notes) to generate all of these as a valid JSON object:
- title: A keyword-rich, UK-market-optimized eBay/Vinted title
- description: Honest, positive, and ends with: "Thanks for looking! Created with SpicyLister 🌶️"
- condition: UK-style grade (Excellent, Good, Used, etc, mentioning flaws if visible)
- pricing: { startingBid: £ (10–20% below BIN), buyItNow: £ (high end for the type) }
- platformTips: ONE actionable tip to help the user get more for their item
${extraInfo ? `User notes: "${extraInfo}"` : ''}
Use recent sold prices for real comps, and favor the higher end. Never markdown or extra explanation—JUST valid JSON!
    `.trim();

    // Prepare image data for Gemini API (inlineData format)
    const imageParts = images.map(img => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data
      }
    }));

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }, ...imageParts]
          }]
        })
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
          details: `Gemini API returned ${response.status}: ${errorText}`
        })
      };
    }

    const aiResponse = await response.json();
    const aiText = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      console.error('AI response missing expected structure:', aiResponse);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Unexpected AI response from Gemini'
        })
      };
    }

    // Remove markdown formatting if present
    let cleaned = aiText.replace(/``````/g, '').trim();

    // Parse JSON
    let parsedResult;
    try {
      parsedResult = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'Raw:', cleaned);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to parse AI response as JSON',
          rawResponse: cleaned
        })
      };
    }

    // Validate required fields
    const required = ['title', 'description', 'condition', 'pricing', 'platformTips'];
    const missing = required.filter(field => !parsedResult[field]);
    if (missing.length > 0) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: `AI response missing fields: ${missing.join(', ')}`
        })
      };
    }

    // Validate pricing
    if (!parsedResult.pricing.startingBid || !parsedResult.pricing.buyItNow) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Pricing must include both startingBid and buyItNow'
        })
      };
    }

    // Optionally bump prices
    try {
      parsedResult.pricing.buyItNow = (parseFloat(parsedResult.pricing.buyItNow) * 1.10).toFixed(2);
      parsedResult.pricing.startingBid = (parseFloat(parsedResult.pricing.startingBid) * 1.10).toFixed(2);
    } catch {}

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsedResult)
    };

  } catch (error) {
    console.error('Analysis function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
