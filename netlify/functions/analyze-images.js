// netlify/functions/analyze-images.js - Complete enhanced version

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
        maxOutputTokens: 3000, // Increased for more detailed responses
        temperature: 0.7,
      }
    });

    const createResearchPrompt = (labels, context) => {
      const labelText = labels && labels.length > 0 
        ? labels.map((label, i) => `Image ${i + 1}: ${label}`).join('\n')
        : '';
      
      return `You are "SpicyBrain," an expert UK reseller with deep knowledge of specialist markets. You help people identify items accurately and celebrate valuable finds.

**CRITICAL RESEARCH METHODOLOGY:**
1. **IDENTIFY PRECISELY**: Read ALL visible text, model numbers, brand names, serial numbers
2. **RESEARCH THOROUGHLY**: Consider specialist markets, collector values, original retail prices
3. **WHEN UNCERTAIN**: State "Need clarification on [specific detail]" rather than guess
4. **SPECIALIST AREAS**: Amateur radio (Xiegu, Yaesu, Icom, Kenwood), vintage electronics, designer goods, collectibles
5. **HIGH-VALUE DETECTION**: Flag items potentially worth £300+ as treasures

**TREASURE CELEBRATION**: If item worth £300+, start description with: "🎉 TREASURE ALERT! You've found something special! 🎉"

Analyze these ${images.length} images carefully:

${labelText ? `Image Context:\n${labelText}\n` : ''}
${context ? `Additional Context: ${context}\n` : ''}

**SPECIFIC IDENTIFICATION FOCUS:**
- Read exact model numbers (e.g., X5105 vs VX-5R)
- Check frequency displays for radio equipment  
- Look for serial numbers, manufacturing dates
- Identify condition issues accurately
- Research current UK market values

**OUTPUT FORMAT (JSON only):**
{
  "title": "Precise brand, model, key features - 80+ characters for searchability",
  "description": "Start with treasure alert if valuable. Include accurate specs, honest condition, end with: 'This listing created with SpicyLister - the AI tool that turns your clutter into cash! 🌶️ IMPORTANT: This is AI guidance only. You control all listing decisions. SpicyLister collects no personal data.'",
  "estimatedPrice": "Research-based UK market price range",
  "condition": "Honest assessment with specific flaws noted",
  "category": "Specific category",
  "tags": ["accurate", "searchable", "keywords"],
  "confidenceLevel": "High/Medium/Low - certainty of identification",
  "researchNotes": "Any uncertainties or clarification needed",
  "valueCategory": "Standard/Valuable/Treasure/Uncertain",
  "specialistNotes": "Market context for this item type"
}

**EXAMPLES OF CAREFUL IDENTIFICATION:**
- Amateur Radio: Xiegu X5105 (£350-450) vs Yaesu VX-5R (£80-120) - completely different
- Vintage Audio: Exact model crucial for pricing
- Designer Items: Authentication details matter

**PRICING PHILOSOPHY:** "You can always list again for less, you can't go up in price" - err on higher side when confident.

REMEMBER: Accuracy over speed. Ask questions when uncertain. Celebrate valuable discoveries!`;
    };

    const prompt = createResearchPrompt(imageLabels, additionalContext);
    
    const content = [
      { text: prompt },
      ...images.slice(0, 5)
    ];

    console.log(`Processing ${images.length} images (${Math.round(totalSize/1000)}KB total)`);
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 30000) // Extended timeout
    );

    const generatePromise = model.generateContent(content);
    
    const result = await Promise.race([generatePromise, timeoutPromise]);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini response received:', text.substring(0, 200) + '...');
    
    let parsedResult;
    try {
      const cleanedText = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^\s*[\r\n]/gm, '')
        .trim();
      
      parsedResult = JSON.parse(cleanedText);
      
      // Process for value detection
      const priceMatch = parsedResult.estimatedPrice?.match(/£(\d+)/);
      const estimatedValue = priceMatch ? parseInt(priceMatch[1]) : 0;
      
      if (estimatedValue >= 300) {
        parsedResult.isValuableItem = true;
        parsedResult.valueAlert = "🎉 HIGH-VALUE ITEM DETECTED! Consider specialist selling platforms or expert appraisal before listing.";
      }
      
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.log('Raw response:', text);
      
      // Enhanced fallback with uncertainty handling
      parsedResult = {
        title: "Item Requiring Manual Identification - Please Check Model Numbers",
        description: `AI analysis uncertain. Visible details: ${text.substring(0, 300)}...\n\nIMPORTANT: Please verify exact model numbers and research current market values before listing.\n\nThis listing created with SpicyLister - the AI tool that turns your clutter into cash! 🌶️\n\nIMPORTANT: This is AI guidance only. You control all listing decisions. SpicyLister collects no personal data.`,
        estimatedPrice: "£25-50 (uncertain - please research)",
        condition: "Condition assessment needed - see photos",
        category: "Requires Classification",
        tags: ["manual-identification-needed"],
        confidenceLevel: "Low",
        researchNotes: "AI unable to identify precisely - manual research recommended",
        valueCategory: "Uncertain"
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        ...parsedResult,
        imagesAnalyzed: images.length,
        processingTime: new Date().toISOString(),
        privacyNote: "No personal data collected or stored by SpicyLister"
      })
    };

  } catch (error) {
    console.error('Error in analyze-images function:', error);
    
    let errorMessage = 'Analysis failed';
    let statusCode = 500;
    
    if (error.message.includes('timeout')) {
      errorMessage = 'Analysis timeout - please try with simpler images or add manual details';
      statusCode = 408;
    } else if (error.message.includes('stack')) {
      errorMessage = 'Images too complex for processing - consider manual listing';
      statusCode = 413;
    }
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        message: error.message,
        suggestion: "For specialist items, consider adding manual details or consulting expert forums"
      })
    };
  }
};