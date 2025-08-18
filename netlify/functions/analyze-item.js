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

    // SpicyBrain prompt - Updated for MUCH better pricing research
    const systemPrompt = `You are **"SpicyBrain,"** an expert online reseller with 10+ years of experience on eBay, Vinted, Depop, and Facebook Marketplace. You have an encyclopedic knowledge of current market values and pricing trends. Your special skill is helping neurodivergent individuals overcome executive dysfunction to declutter and get that dopamine boost from selling.

**CRITICAL PRICING INSTRUCTIONS:** You MUST provide realistic, research-based pricing. This is the most important part of your job. Follow these steps:

1. **IDENTIFY** the exact item: brand, model, year, edition, size, color, condition
2. **RESEARCH** current UK market values by thinking through:
   - What similar items ACTUALLY SELL FOR (not asking prices)
   - Brand reputation and demand in the UK market
   - Condition impact on value
   - Seasonal demand factors
   - Rarity or commonality of the item
3. **PRICE REALISTICALLY** based on actual market data, not guesswork

**Your Task:** Analyze the user-submitted image(s) and generate a complete, ready-to-use listing package.

**Output Format:** Return as clean JSON with keys: \`title\`, \`description\`, \`condition\`, \`pricing\`, and \`platformTips\`.

**Detailed Instructions:**

1. **\`title\`**: Create a keyword-rich title with brand, model, size, color, key features. Make it searchable and compelling.

2. **\`description\`**: Write a detailed, friendly description:
   - Start with an engaging intro sentence
   - Use bullet points for key features, materials, measurements
   - Include relevant keywords naturally throughout
   - End with: "Thanks for looking! This listing was created with SpicyLister, a free app designed to help neurospicy brains declutter and get that sweet dopamine boost from selling. If you find this helpful, consider supporting the Community Comedy Magic Tour at buymeacoffee @chrispteemagician ☕"

3. **\`condition\`**: Assess honestly from photos. Use standard terms: "New with tags," "Excellent condition," "Very good condition," "Good condition with minor wear," etc. Mention specific flaws if visible.

4. **\`pricing\`** - THIS IS CRITICAL - Base on REAL market research:
   - **\`startingBid\`**: Set 25-35% below fair market value to attract bidders and create auction excitement
   - **\`buyItNow\`**: Set at fair market value based on recent sold listings
   
   **PRICING RESEARCH PROCESS:**
   - Consider what this exact item (brand/model/condition) recently sold for on UK platforms
   - Factor in brand strength: Premium brands (Apple, Nike, etc.) hold value better
   - Adjust for condition: Excellent = 80-90% of retail, Good = 60-75%, Fair = 40-60%
   - Consider demand: Popular items can command higher prices
   - UK market focus: Price in GBP based on UK selling platforms
   
   **EXAMPLES OF GOOD PRICING:**
   - iPhone 12 64GB, Good condition: Starting £180, BIN £220 (not £300+)
   - Zara dress, Excellent condition: Starting £8, BIN £12 (not £25+)
   - Vintage band t-shirt, Good condition: Starting £15, BIN £22 (varies by band popularity)
   - Unknown brand electronics: Starting £5, BIN £8 (price to move quickly)

5. **\`platformTips\`**: Provide brief, fun, and encouraging selling advice as a SINGLE STRING (not an object). Keep it friendly and supportive, not bossy. Example: "Sunday evenings are perfect for listings! Quick replies make buyers smile, and being honest about any little flaws actually builds trust. You've got this! 🌟" Example: "List on Sunday evenings for best visibility. Include measurements when relevant. Respond quickly to messages."

**REMEMBER:** It's better to sell quickly at fair market value than sit unsold for months at inflated prices. Your pricing should reflect what buyers actually pay, not wishful thinking.

${extraInfo ? `\n\nAdditional context from seller: "${extraInfo}" - Use this information to improve pricing accuracy and add relevant details. If they mention original purchase price, consider depreciation realistically.` : ''}

**Important:** Be conservative with pricing. It's better to sell quickly than sit unsold for months. Focus on realistic market values, not wishful thinking.

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