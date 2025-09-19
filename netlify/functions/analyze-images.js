// netlify/functions/analyze-images.js - Enhanced with better prompting

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

    // Validate image data size
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
        maxOutputTokens: 2048,
        temperature: 0.7,
      }
    });

    const createEnhancedPrompt = (labels, context) => {
      const labelText = labels && labels.length > 0 
        ? labels.map((label, i) => `Image ${i + 1}: ${label}`).join('\n')
        : '';
      
      return `You are "SpicyBrain," an expert UK online reseller with 10+ years of eBay, Vinted, Depop, and Facebook Marketplace experience. You help people turn clutter into cash with realistic pricing and engaging listings.

Analyze these ${images.length} images and create a ready-to-use marketplace listing.

${labelText ? `Image Context:\n${labelText}\n` : ''}
${context ? `Additional Info: ${context}\n` : ''}

**CRITICAL REQUIREMENTS:**

1. **TITLE**: Create keyword-rich, searchable title (80+ characters) with brand, model, size, color, condition, key features. Make every character count for search visibility.

2. **DESCRIPTION**: Write engaging, detailed description:
   - Hook readers with opening line
   - Use bullet points for features, materials, measurements  
   - Include relevant keywords naturally
   - Mention any flaws honestly
   - End with: "This listing created with SpicyLister - the AI tool that turns your clutter into cash! 🌶️"

3. **PRICING**: Base on REAL UK market values:
   - Research what this exact item sells for (not asking prices)
   - Factor in brand strength, condition, and demand
   - UK market focus with GBP pricing
   - Better to sell quickly at fair price than sit unsold

4. **CONDITION**: Honest assessment using standard terms

Respond with JSON only:
{
  "title": "Detailed keyword-rich title with brand, model, size, condition",
  "description": "Engaging description with personality and SpicyLister mention",
  "estimatedPrice": "Realistic price range (e.g. '£25-35')",
  "condition": "Honest condition assessment",
  "category": "Product category",
  "tags": ["relevant", "search", "keywords"],
  "keyFeatures": ["notable features from images"],
  "flaws": ["any damage or wear visible"],
  "marketInsights": "Brief UK market context for this item type"
}

Focus on: Brand/model ID, realistic pricing, searchable keywords, honest condition, engaging personality.`;
    };

    const prompt = createEnhancedPrompt(imageLabels, additionalContext);
    
    const content = [
      { text: prompt },
      ...images.slice(0, 5)
    ];

    console.log(`Processing ${images.length} images (${Math.round(totalSize/1000)}KB total)`);
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 25000)
    );

    const generatePromise = model.generateContent(content);
    
    const result = await Promise.race([generatePromise, timeoutPromise]);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini response received:', text.substring(0, 100) + '...');
    
    let parsedResult;
    try {
      const cleanedText = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^\s*[\r\n]/gm, '')
        .trim();
      
      parsedResult = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.log('Raw response:', text);
      
      // Enhanced fallback that tries to extract useful info
      const fallbackTitle = text.match(/title[":]\s*["']([^"']+)["']/i);
      const fallbackPrice = text.match(/price|£[\d.-]+/i);
      
      parsedResult = {
        title: fallbackTitle ? fallbackTitle[1] : "Unique Item for Sale - Great Condition",
        description: `${text.substring(0, 400)}...\n\nThis listing created with SpicyLister - the AI tool that turns your clutter into cash! 🌶️`,
        estimatedPrice: fallbackPrice ? fallbackPrice[0] : "£15-25",
        condition: "Good condition - see photos for details",
        category: "General",
        tags: ["quality-item", "great-condition"],
        keyFeatures: ["See detailed photos"],
        flaws: ["Condition as shown in photos"],
        marketInsights: "Popular item type with steady UK demand"
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