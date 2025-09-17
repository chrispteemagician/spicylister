exports.handler = async (event, context) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { images, extraInfo = '', isPremium = false } = JSON.parse(event.body);

    if (!images || !Array.isArray(images) || images.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'No images provided' })
      };
    }

    // Get Google API key from Netlify environment (NOT frontend env!)
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    // Build prompt
    const basePrompt = `Identify the item shown in these images. Provide a concise, one-sentence description suitable for an eBay title. Also, provide a longer, detailed description for the eBay listing body, highlighting key features visible across all images. Assess the condition of the item based on what you can see. ${extraInfo ? `Additional context: ${extraInfo}` : ''}`;
    const premiumPrompt = isPremium
      ? `${basePrompt}
      
PREMIUM ANALYSIS REQUIRED:
- Research UK eBay market pricing for similar items
- Provide realistic pricing based on condition and market demand
- Include competitor analysis insights and listing tips

Format as JSON with keys: 'title', 'description', 'condition', 'pricing', 'marketInsights', 'competitorAnalysis', 'listingStrategy', 'isPremium'`
      : `${basePrompt}
Format as JSON with keys: 'title', 'description', 'condition', 'pricing'`;

    // Prepares image parts for Gemini
    const imageParts = images.map(img => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data
      }
    }));

    // Call Gemini API (Node 18+ fetch supported)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: premiumPrompt },
              ...imageParts
            ]
          }]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return {
        statusCode: geminiResponse.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: `AI analysis failed: ${geminiResponse.status}`,
          details: errorText
        })
      };
    }

    const geminiData = await geminiResponse.json();
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiResponse) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'No response from AI' })
      };
    }

   // ... same as your previous code ...
// Parse AI response
let cleanedResponse = aiResponse.replace(/``````/g, '').trim();
let aiResult;
try {
  aiResult = JSON.parse(cleanedResponse);
} catch (parseError) {
  return {
    statusCode: 500,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      error: 'Failed to parse AI response',
      rawResponse: cleanedResponse
    })
  };
}

    // Final result adjustment
    let result = {
      title: aiResult.title || 'Item for Sale',
      description: aiResult.description || 'Quality item in good condition.',
      condition: aiResult.condition || 'Used',
      pricing: aiResult.pricing || {
        startingBid: (Math.random() * 15 + 10).toFixed(2),
        buyItNow: (Math.random() * 35 + 25).toFixed(2)
      },
      isPremium
    };

    // Premium enhancements if needed
    if (isPremium) {
      result.marketInsights = aiResult.marketInsights || '';
      result.competitorAnalysis = aiResult.competitorAnalysis || [];
      result.listingStrategy = aiResult.listingStrategy || '';
      result.platformTips = `PREMIUM INSIGHTS: ${result.listingStrategy} Best time: Sunday evening for max views.`;
    } else {
      result.platformTips = "Start with competitive pricing and clear photos for best results!";
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
