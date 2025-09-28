// netlify/functions/analyze-images.js - Working version for evening listing
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { images, additionalContext } = JSON.parse(event.body);
    
    if (!images || images.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No images provided' })
      };
    }

    if (!process.env.GOOGLE_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7,
      }
    });

    // Simple, reliable prompt
    const prompt = `Analyze this item for online selling. Provide JSON response:

${additionalContext ? `Context: ${additionalContext}` : ''}

{
  "title": "Clear selling title with brand/type",
  "description": "Honest description of condition and features. End with: 'Listed with SpicyLister!'",
  "estimatedPrice": "UK price range (£X-Y)", 
  "condition": "Condition assessment",
  "category": "Item category",
  "isValuableItem": false
}

Be concise and practical.`;
    
    const content = [
      { text: prompt },
      images[0] // Use only first image to prevent overload
    ];

    const result = await model.generateContent(content);
    const response = await result.response;
    const text = response.text();
    
    let parsedResult;
    try {
      const cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsedResult = JSON.parse(cleanedText);
      
      // Simple value check
      if (parsedResult.estimatedPrice && parsedResult.estimatedPrice.includes('£')) {
        const numbers = parsedResult.estimatedPrice.match(/\d+/g);
        if (numbers && Math.max(...numbers.map(n => parseInt(n))) >= 300) {
          parsedResult.isValuableItem = true;
        }
      }
      
    } catch (parseError) {
      // Fallback response
      parsedResult = {
        title: "Item for Sale - Check Details",
        description: "Please add manual description for best results.\n\nListed with SpicyLister!",
        estimatedPrice: "£10-30",
        condition: "See photos",
        category: "General",
        isValuableItem: false
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        ...parsedResult
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Analysis failed',
        message: error.message
      })
    };
  }
};
