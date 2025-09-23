// netlify/functions/analyze-images.js - Simplified version to prevent stack overflow

const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { images, additionalContext, imageLabels } = JSON.parse(event.body);
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one image is required' })
      };
    }

    // Validate image data size (keep this check)
    const totalSize = images.reduce((acc, img) => {
      if (img.inlineData && img.inlineData.data) {
        return acc + img.inlineData.data.length;
      }
      return acc;
    }, 0);

    if (totalSize > 2000000) {
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({ 
          error: 'Images too large for processing. Please use smaller images.',
          totalSize: Math.round(totalSize / 1000) + 'KB'
        })
      };
    }

    if (!process.env.GOOGLE_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Google API key not configured' })
      };
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 1000,  // Reduced from 3000
        temperature: 0.7,
      }
    });

    // Simplified prompt - no complex specialist knowledge
    const createSimplePrompt = (context) => {
      return `Analyze this item for online selling. Be concise and practical.

${context ? `Additional info: ${context}` : ''}

Provide a JSON response with:
{
  "title": "Clear, searchable title with brand and item type",
  "description": "Honest description including visible condition details. End with: 'Listed with SpicyLister - AI that turns clutter into cash!'",
  "estimatedPrice": "UK market price range (£X-Y)",
  "condition": "Honest condition assessment",
  "category": "Item category",
  "tags": ["relevant", "keywords"],
  "isValuableItem": false
}

Focus on what you can clearly see. Be honest about condition. Price competitively for UK market.`;
    };

    const prompt = createSimplePrompt(additionalContext);
    
    const content = [
      { text: prompt },
      ...images.slice(0, 3)  // Limit to 3 images max to prevent overflow
    ];

    console.log(`Processing ${images.length} images (${Math.round(totalSize/1000)}KB total)`);
    
    // Shorter timeout to prevent stack overflow
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 15000)
    );

    const generatePromise = model.generateContent(content);
    
    const result = await Promise.race([generatePromise, timeoutPromise]);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini response received:', text.substring(0, 200) + '...');
    
    let parsedResult;
    try {
      // Clean up the response
      const cleanedText = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^\s*[\r\n]/gm, '')
        .trim();
      
      parsedResult = JSON.parse(cleanedText);
      
      // Simple value detection (no complex parsing)
      if (parsedResult.estimatedPrice && parsedResult.estimatedPrice.includes('£')) {
        const numbers = parsedResult.estimatedPrice.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          const maxPrice = Math.max(...numbers.map(n => parseInt(n)));
          if (maxPrice >= 300) {
            parsedResult.isValuableItem = true;
          }
        }
      }
      
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      
      // Simple fallback - no complex processing
      parsedResult = {
        title: "Item for Sale - Please Add Details",
        description: "AI analysis incomplete. Please add manual description.\n\nListed with SpicyLister - AI that turns clutter into cash!",
        estimatedPrice: "£10-50 (please research current prices)",
        condition: "See photos for condition",
        category: "General",
        tags: ["item", "for", "sale"],
        isValuableItem: false
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        ...parsedResult,
        imagesAnalyzed: images.length,
        processingTime: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error in analyze-images function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Analysis failed - please try again',
        suggestion: "Try with fewer images or simpler photos"
      })
    };
  }
};
