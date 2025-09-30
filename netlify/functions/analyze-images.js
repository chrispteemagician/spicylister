const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const processImage = async (imageData, retryCount = 0) => {
  const MAX_RETRIES = 2;
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Compress image if too large (prevent memory issues)
    if (imageData.length > 500000) {
      imageData = await compressImage(imageData);
    }
    
    const result = await model.generateContent([
      'Analyze this item for eBay listing. Provide: title, description, category, condition, estimated price range.',
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageData.replace(/^data:image/[a-z]+;base64,/, '')
        }
      }
    ]);
    
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error('Processing error:', error);
    
    // Only retry on specific errors, with limited attempts
    if ((error.message.includes('quota') || error.message.includes('rate limit')) && retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
      return processImage(imageData, retryCount + 1);
    }
    
    // Don't retry on other errors - throw immediately
    throw new Error(`Analysis failed: ${error.message}`);
  }
};

const compressImage = async (base64Data) => {
  try {
    // Remove data URL prefix if present
    const cleanBase64 = base64Data.replace(/^data:image/[a-z]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    if (buffer.length <= 500000) return cleanBase64;
    
    // Simple compression by truncating to 400KB
    return buffer.subarray(0, 400000).toString('base64');
  } catch (error) {
    console.error('Compression error:', error);
    return base64Data.replace(/^data:image/[a-z]+;base64,/, '');
  }
};

exports.handler = async (event, context) => {
  // Set strict timeout to prevent hanging
  const timeoutId = setTimeout(() => {
    throw new Error('Function timeout after 25 seconds');
  }, 25000);
  
  try {
    console.log('Function started');
    
    // Validate request method
    if (event.httpMethod !== 'POST') {
      clearTimeout(timeoutId);
      return {
        statusCode: 405,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
    
    // Validate request body
    if (!event.body) {
      clearTimeout(timeoutId);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing request body' })
      };
    }
    
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      clearTimeout(timeoutId);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid JSON in request' })
      };
    }
    
    const { images } = requestData;
    
    if (!Array.isArray(images) || images.length === 0) {
      clearTimeout(timeoutId);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Images must be a non-empty array' })
      };
    }
    
    // Limit to prevent overload
    if (images.length > 3) {
      clearTimeout(timeoutId);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Maximum 3 images per request' })
      };
    }
    
    console.log(`Processing ${images.length} images`);
    const results = [];
    
    // Process images ONE AT A TIME to prevent stack overflow
    for (let i = 0; i < images.length; i++) {
      try {
        console.log(`Processing image ${i + 1}`);
        const result = await processImage(images[i]);
        results.push({ 
          success: true, 
          data: result,
          index: i 
        });
        console.log(`Image ${i + 1} processed successfully`);
      } catch (error) {
        console.error(`Image ${i + 1} failed:`, error);
        results.push({ 
          success: false, 
          error: error.message,
          index: i 
        });
      }
      
      // Clear memory after each image
      images[i] = null;
      
      // Small delay between images
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    clearTimeout(timeoutId);
    console.log('Function completed successfully');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ 
        success: true,
        results: results,
        processed: results.length 
      })
    };
    
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
