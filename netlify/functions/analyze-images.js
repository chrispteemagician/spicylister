import { GoogleGenerativeAI } from '@google/generative-ai';

export async function handler(event, context) {
  console.log('Function started');
  
  // Set CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Validate at least one API key exists
    if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'No API keys configured' })
      };
    }

    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON' })
      };
    }

    const { images, additionalContext, imageLabels } = requestData;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No images provided' })
      };
    }

    console.log('Received images array length:', images.length);

    // Build the prompt
    let prompt = 'Analyze this item and create a compelling listing for selling online. Provide:\n';
    prompt += '1. A catchy, SEO-friendly title (max 80 characters)\n';
    prompt += '2. A detailed description highlighting key features and condition\n';
    prompt += '3. Estimated price range in GBP (£)\n';
    prompt += '4. Condition (New, Like New, Good, Fair, Poor)\n';
    prompt += '5. Suggested category\n';
    prompt += '6. Whether this might be a valuable/collectible item\n';
    
    if (additionalContext) {
      prompt += `\nAdditional context: ${additionalContext}`;
    }
    
    if (imageLabels && imageLabels.length > 0) {
      prompt += `\nImage labels: ${imageLabels.join(', ')}`;
    }
    
    prompt += '\n\nRespond in JSON format with keys: title, description, estimatedPrice, condition, category, isValuableItem';

    let text;
    let aiProvider = 'unknown';

    // Try Gemini first if available
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log('Trying Gemini AI...');
        aiProvider = 'Gemini';
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const contentParts = [{ text: prompt }];
        images.forEach(img => contentParts.push(img));

        const result = await model.generateContent(contentParts);
        const response = await result.response;
        text = response.text();
        
        console.log('Gemini response received successfully');
      } catch (geminiError) {
        console.error('Gemini failed:', geminiError.message);
        
        // Fall back to OpenAI if Gemini fails
        if (process.env.OPENAI_API_KEY) {
          console.log('Falling back to OpenAI...');
          aiProvider = 'OpenAI';
          text = await callOpenAI(images, prompt);
        } else {
          throw geminiError;
        }
      }
    } 
    // Use OpenAI if Gemini key not available
    else if (process.env.OPENAI_API_KEY) {
      console.log('Using OpenAI (Gemini not configured)...');
      aiProvider = 'OpenAI';
      text = await callOpenAI(images, prompt);
    }

    console.log(`AI response received from ${aiProvider}`);

    // Try to parse as JSON
    let parsedResult;
    try {
      // Clean up markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResult = JSON.parse(text);
    } catch (e) {
      console.log('Failed to parse as JSON, using text response');
      parsedResult = {
        title: 'Item for Sale',
        description: text,
        estimatedPrice: '£0-£0',
        condition: 'Unknown',
        category: 'General',
        isValuableItem: false
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        ...parsedResult,
        aiProvider: aiProvider,
        message: 'Analysis completed'
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Analysis failed',
        message: error.message,
        success: false
      })
    };
  }
}

// OpenAI helper function
async function callOpenAI(images, prompt) {
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt }
      ]
    }
  ];

  // Add images to the message
  // OpenAI expects format: data:image/jpeg;base64,{base64_data}
  images.forEach(img => {
    if (img.inlineData && img.inlineData.data && img.inlineData.mimeType) {
      const base64Data = img.inlineData.data;
      const mimeType = img.inlineData.mimeType;
      
      // Ensure proper data URL format
      const imageUrl = base64Data.startsWith('data:') 
        ? base64Data 
        : `data:${mimeType};base64,${base64Data}`;
      
      messages[0].content.push({
        type: 'image_url',
        image_url: {
          url: imageUrl,
          detail: 'high'
        }
      });
    }
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
