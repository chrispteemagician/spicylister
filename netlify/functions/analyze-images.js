// netlify/functions/analyze-images.js - Updated with stack overflow prevention

const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  // Set a reasonable timeout
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

    // Validate image data size to prevent stack overflow
    const totalSize = images.reduce((acc, img) => {
      if (img.inlineData && img.inlineData.data) {
        return acc + img.inlineData.data.length;
      }
      return acc;
    }, 0);

    // Limit total base64 data to ~2MB to prevent stack overflow
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
      model: "gemini-1.5-flash", // Use flash model for better performance
      generationConfig: {
        maxOutputTokens: 2048, // Limit response size
        temperature: 0.7,
      }
    });

    const createPrompt = (labels, context) => {
      const labelText = labels && labels.length > 0 
        ? labels.map((label, i) => `Image ${i + 1}: ${label}`).join('\n')
        : '';
      
      return `Analyze these ${images.length} images of an item for sale and create a marketplace listing.

${labelText ? `Image Context:\n${labelText}\n` : ''}
${context ? `Additional Context: ${context}\n` : ''}

Provide analysis in JSON format:

{
  "title": "Specific product title with brand/model",
  "description": "Detailed description from all images",
  "estimatedPrice": "Price range (e.g., '$25-35')",
  "condition": "Condition (Mint/Excellent/Good/Fair/Poor)",
  "category": "Product category",
  "tags": ["relevant", "keywords"],
  "keyFeatures": ["notable features"],
  "flaws": ["any damage visible"]
}

Focus on brand/model identification, condition assessment, and market value.`;
    };

    const prompt = createPrompt(imageLabels, additionalContext);
    
    // Prepare content with size limits
    const content = [
      { text: prompt },
      ...images.slice(0, 5) // Limit to max 5 images to prevent stack overflow
    ];

    console.log(`Processing ${images.length} images (${Math.round(totalSize/1000)}KB total)`);
    
    // Add timeout wrapper
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 25000) // 25 second timeout
    );

    const generatePromise = model.generateContent(content);
    
    const result = await Promise.race([generatePromise, timeoutPromise]);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini response received:', text.substring(0, 100) + '...');
    
    let parsedResult;
    try {
      // Clean response and parse JSON
      const cleanedText = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^\s*[\r\n]/gm, '')
        .trim();
      
      parsedResult = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.log('Raw response:', text);
      
      // Fallback response
      parsedResult = {
        title: "AI Analysis Complete",
        description: text.substring(0, 500) + "...",
        estimatedPrice: "See description for pricing details",
        condition: "See description for condition",
        category: "General",
        tags: ["ai-analyzed"]
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
    
    // Handle specific error types
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout - please try with smaller images';
      statusCode = 408;
    } else if (error.message.includes('stack')) {
      errorMessage = 'Images too complex - please try simpler images';
      statusCode = 413;
    }
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        message: error.message
      })
    };
  }
};