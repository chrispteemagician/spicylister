const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const processImage = async (imageData, retryCount = 0) => {
  const MAX_RETRIES = 2;
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Compress image if too large
    if (imageData.length > 500000) { // 500KB limit
      imageData = await compressImage(imageData);
    }
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            text: 'Analyze this item for eBay listing. Provide: title, description, category, condition, estimated price range.'
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageData
            }
          }
        ]
      }]
    });
    
    return result.response.text();
    
  } catch (error) {
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        return processImage(imageData, retryCount + 1);
      }
    }
    throw error;
  }
};

const compressImage = async (base64Data) => {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length <= 500000) return base64Data;
    
    // Return first 400KB as emergency fallback
    return buffer.subarray(0, 400000).toString('base64');
  } catch (error) {
    return base64Data;
  }
};

exports.handler = async (event, context) => {
  const timeoutId = setTimeout(() => {
    throw new Error('Function timeout');
  }, 25000);
  
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing request body' })
      };
    }
    
    const { images } = JSON.parse(event.body);
    
    if (!Array.isArray(images) || images.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Images must be a non-empty array' })
      };
    }
    
    if (images.length > 5) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Maximum 5 images per request' })
      };
    }
    
    const results = [];
    
    // Process images sequentially to prevent memory issues
    for (let i = 0; i < images.length; i++) {
      try {
        const result = await processImage(images[i]);
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
      
      // Clear processed image from memory
      images[i] = null;
    }
    
    clearTimeout(timeoutId);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ results })
    };
    
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
