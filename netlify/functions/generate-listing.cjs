// netlify/functions/generate-listing.cjs

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Only POST requests are allowed' }),
    };
  }

  const API_KEY = process.env.GOOGLE_API_KEY;
  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key is not configured on the server' }),
    };
  }

  try {
    const { image, mimeType } = JSON.parse(event.body);
    if (!image || !mimeType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing image data or mimeType' }),
      };
    }

    const prompt = `You are an expert eBay seller. Based on this image of an item, generate a compelling and concise eBay listing. Provide a catchy title, a detailed but easy-to-read description using bullet points for key features, and suggest a starting auction price and a "Buy It Now" price in GBP (£). Return the response as a JSON object with the keys: "title", "description", "auctionPrice", "buyNowPrice".`;

    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType, data: image } }
        ]
      }]
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${API_KEY}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google API Error:', errorData);
      throw new Error(errorData.error?.message || `Google API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const jsonText = rawText.replace(/``````/g, '').trim();
    const details = JSON.parse(jsonText);

    return {
      statusCode: 200,
      body: JSON.stringify(details),
    };

  } catch (err) {
    console.error('Function Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `An internal error occurred. ${err.message}` }),
    };
  }
};
