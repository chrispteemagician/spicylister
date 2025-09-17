// netlify/functions/analyze-images.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  // Enable CORS
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

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Create enhanced prompt for multiple images
    const createMultiImagePrompt = (labels, context) => {
      const labelText = labels && labels.length > 0 
        ? labels.map((label, i) => `Image ${i + 1}: ${label}`).join('\n')
        : '';
      
      return `Analyze these ${images.length} images of an item for sale and create a detailed marketplace listing.

${labelText ? `Image Context:\n${labelText}\n` : ''}
${context ? `Additional Context: ${context}\n` : ''}

Please provide a comprehensive analysis in JSON format:

{
  "title": "Clear, specific product title with brand/model if visible",
  "description": "Detailed description incorporating details from all images",
  "estimatedPrice": "Realistic market price range (e.g., '$25-35')",
  "condition": "Condition assessment based on all images (Mint/Excellent/Good/Fair/Poor)",
  "category": "Product category (Electronics/Vinyl/Collectibles/etc.)",
  "tags": ["relevant", "searchable", "keywords"],
  "keyFeatures": ["notable features visible in the images"],
  "flaws": ["any damage or wear visible"],
  "authenticity": "Assessment of authenticity if applicable",
  "marketInsights": "Brief market context or demand info"
}

Focus on:
- Brand/model identification from any visible text or labels
- Condition assessment from all angles shown
- Unique features or selling points
- Any visible damage or wear
- Market value estimation based on condition and rarity

Be specific and accurate. If multiple images show different aspects, incorporate all visible details.`;
    };

    const prompt = createMultiImagePrompt(imageLabels, additionalContext);
    
    // Prepare content array with prompt and all images
    const content = [
      { text: prompt },
      ...images
    ];

    console.log(`Processing ${images.length} images with Gemini Vision API`);
    
    const result = await model.generateContent(content);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini response received:', text.substring(0, 200) + '...');
    
    // Parse JSON response
    let parsedResult;
    try {
      // Clean up the response text (remove markdown code blocks if present)
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResult = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      // Fallback: return raw text if JSON parsing fails
      parsedResult = {
        title: "AI Analysis Complete",
        description: text,
        estimatedPrice: "Price analysis included in description",
        condition: "See description for condition details",
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
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};