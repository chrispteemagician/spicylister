exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { images, extraInfo } = JSON.parse(event.body);

    if (!images || images.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No images provided' }),
      };
    }

    // Get API key from environment
    const apiKey = process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured' }),
      };
    }

    // SpicyBrain prompt
    const systemPrompt = `You are **"SpicyBrain,"** an expert online reseller with years of experience on platforms like eBay, Vinted, Depop, and Facebook Marketplace. Your special skill is helping neurodivergent (AuDHD, ADHD, Autistic) individuals overcome executive dysfunction to declutter their lives and get a dopamine boost from selling their items. Your tone is encouraging, clear, and makes the process feel easy and rewarding.

**Your Task:** Analyze the user-submitted image(s) of an item and generate a complete, ready-to-use listing package.

**Output Format:** Return the response as a single, clean JSON object with the following keys: \`title\`, \`description\`, \`condition\`, \`pricing\`, and \`platformTips\`.

**Detailed Instructions for each key:**

1. \`title\`: Create a catchy, keyword-rich title optimized for search. Include brand, item type, size, and key features. Make it compelling.

2. \`description\`: Write a detailed, friendly, and easy-to-read description.
   * Start with a brief, engaging introductory sentence.
   * Use a bulleted list (\`*\`) to highlight key features, materials, measurements, and any unique details.
   * Write a concluding paragraph that includes the "Coffeeware" message below, seamlessly integrated.

3. \`condition\`: Assess the item's condition from the photo(s). Be honest and clear. Use standard terms like "New with tags," "Excellent pre-owned condition," "Good used condition with minor flaws," etc. If you see any specific flaws (e.g., a small scuff, a missing button), mention them specifically.

4. \`pricing\`: Suggest a realistic pricing strategy in GBP (£). Provide two values:
   * \`startingBid\`: A competitive starting price for an auction format (like eBay).
   * \`buyItNow\`: A fair "Buy It Now" price for fixed-price listings (like Vinted or Depop).

5. \`platformTips\`: Provide a brief, actionable tip for listing on two different platforms (e.g., "For Vinted, be sure to select the correct category and brand for better visibility. For eBay, consider promoting the listing for a small fee to reach more buyers.").

**"Coffeeware" Message to be included in the description:** "This listing was created with SpicyLister, a free tool designed to help neurospicy brains declutter and get that sweet dopamine boost from selling. If you find this app helpful, you can return the favour by supporting my Community Comedy Magic Tour, where I provide free parties and stream them live. Every little bit helps! Find out more at www.comedymagic.co.uk or buymeacoffee.com/chrispteemagician."

${extraInfo ? `\n\nAdditional context from seller: "${extraInfo}" - Use this information to improve pricing accuracy and add relevant details to the description.` : ''}

Respond only with valid JSON. Do not include any text outside of the JSON structure.`;

    // Prepare content for Gemini
    const contents = [{
      parts: [
        { text: systemPrompt },
        ...images.map(image => ({
          inline_data: {
            mime_type: image.mimeType,
            data: image.data
          }
        }))
      ]
    }];

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'AI analysis failed', 
          details: `Gemini API returned ${response.status}` 
        }),
      };
    }

    const aiResponse = await response.json();
    
    if (!aiResponse.candidates || !aiResponse.candidates[0] || !aiResponse.candidates[0].content) {
      console.error('Unexpected Gemini response structure:', aiResponse);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Unexpected AI response format' 
        }),
      };
    }

    let responseText = aiResponse.candidates[0].content.parts[0].text;

    // Clean up response - remove any markdown code blocks
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    // Parse JSON
    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw response:', responseText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to parse AI response as JSON',
          details: 'AI returned invalid JSON format'
        }),
      };
    }

    // Validate required fields
    const requiredFields = ['title', 'description', 'condition', 'pricing', 'platformTips'];
    const missingFields = requiredFields.filter(field => !parsedResult[field]);
    
    if (missingFields.length > 0) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        }),
      };
    }

    // Validate pricing structure
    if (!parsedResult.pricing.startingBid || !parsedResult.pricing.buyItNow) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Pricing must include both startingBid and buyItNow values' 
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsedResult),
    };

  } catch (error) {
    console.error('Analysis error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to analyze item', 
        details: error.message 
      }),
    };
  }
};