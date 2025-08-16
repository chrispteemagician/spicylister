// netlify/functions/generate-listing.js

// We need node-fetch to make the API call from the serverless function
// You'll need to install it: npm install node-fetch
import fetch from 'node-fetch';

// The handler function is the entry point for the serverless function
exports.handler = async (event) => {
  // 1. Check for the correct HTTP method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405, // Method Not Allowed
      body: JSON.stringify({ error: 'Only POST requests are allowed' }),
    };
  }

  // 2. Securely get the API key from Netlify's environment variables
  // This is set in the Netlify UI, NOT in your code.
  const API_KEY = process.env.GOOGLE_API_KEY;
  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key is not configured on the server' }),
    };
  }

  try {
    // 3. Parse the incoming image data from the frontend
    const { image, mimeType } = JSON.parse(event.body);
    if (!image || !mimeType) {
      return {
        statusCode: 400, // Bad Request
        body: JSON.stringify({ error: 'Missing image data or mimeType' }),
      };
    }

    // 4. Construct the prompt and payload for the Gemini API
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
    
    // 5. Make the API call to Google
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Google API Error:", errorData);
        throw new Error(errorData.error.message || `Google API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // 6. Clean up and parse the response from Google
    // The response might be wrapped in markdown, so we clean it.
    const rawText = data.candidates[0].content.parts[0].text;
    const jsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const details = JSON.parse(jsonText);

    // 7. Send the successful result back to the frontend
    return {
      statusCode: 200,
      body: JSON.stringify(details),
    };

  } catch (err) {
    // 8. Handle any errors that occurred
    console.error('Function Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `An internal error occurred. ${err.message}` }),
    };
  }
};
