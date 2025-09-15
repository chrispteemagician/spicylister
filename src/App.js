// Enhanced SpicyLister Pro - Professional eBay Listing Generator
import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, Copy, Download } from 'lucide-react';

const SpicyListerPro = () => {
  const [images, setImages] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [listing, setListing] = useState('');
  const [itemDetails, setItemDetails] = useState({
    brand: '',
    model: '',
    category: '',
    condition: '',
    color: '',
    size: ''
  });
  
  const fileInputRef = useRef(null);

  // Enhanced AI Analysis Function
  const analyzeImages = async () => {
    if (images.length === 0) return;
    
    setAnalyzing(true);
    
    try {
      // Convert images to base64 for AI analysis
      const imagePromises = images.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      });
      
      const base64Images = await Promise.all(imagePromises);
      
      // Call enhanced AI analysis
      const analysisResult = await performAdvancedAnalysis(base64Images);
      
      // Generate professional listing
      const professionalListing = await generateProfessionalListing(analysisResult);
      
      setListing(professionalListing);
      setItemDetails(analysisResult.itemDetails);
      
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Advanced AI Analysis with Market Intelligence
  const performAdvancedAnalysis = async (images) => {
    const prompt = `
    Analyze these product images and provide detailed information for a professional eBay listing.
    
    Extract:
    1. BRAND (exact brand name if visible)
    2. MODEL/STYLE (specific model number or style name)
    3. CATEGORY (specific product category)
    4. CONDITION (assess condition from images)
    5. COLOR (accurate color description)
    6. SIZE (if applicable and visible)
    7. KEY FEATURES (list 4-6 selling points)
    8. MATERIAL (if identifiable)
    9. UNIQUE SELLING POINTS
    10. TARGET MARKET (who would buy this?)
    
    Format response as JSON with clear categories.
    `;

    // Call your preferred AI service (OpenAI, Claude, etc.)
    // This is a placeholder - you'll need to implement your AI service call
    const response = await callAIService(prompt, images);
    
    return JSON.parse(response);
  };

  // Professional Listing Generator
  const generateProfessionalListing = async (analysis) => {
    const { brand, model, category, condition, color, features, material } = analysis;
    
    // Get market pricing data
    const pricingData = await getMarketPricing(`${brand} ${model}`);
    
    // Generate professional listing
    const listing = `
# **${brand} ${model} ${category} ${color} Premium Quality**

## **Item Description**

**Authentic ${brand} ${model}** in ${condition.toLowerCase()} condition. ${generateIntroDescription(analysis)}

**Key Features:**
${features.map(feature => `- **${feature.title}:** ${feature.description}`).join('\n')}
- **Condition:** ${condition}
- **Material:** ${material}
- **Versatile styling:** ${generateStylingTips(analysis)}

${generateDetailedDescription(analysis)}

**Condition Notes:**
- In ${condition.toLowerCase()} working order and condition as described
- ${generateConditionNotes(analysis)}

***

**📊 UK Market Pricing Guide:**
- **Average Sold Price:** £${pricingData.averagePrice}
- **Cheapest Recently Sold:** £${pricingData.minPrice}
- **Most Expensive:** £${pricingData.maxPrice}

**🏷️ Recommended Pricing:**
- **Auction Starting Price:** £${Math.round(pricingData.averagePrice * 0.4)}
- **Buy It Now Price:** £${Math.round(pricingData.averagePrice * 0.85)} with Best Offer option

***

**📂 Best UK eBay Category:** 
${generateEbayCategory(analysis)}

**📦 Terms:**
- No Returns
- Sold as Seen
- UK postage available

*${generateClosingLine(analysis)}*
    `;
    
    return listing.trim();
  };

  // Helper functions for professional copy
  const generateIntroDescription = (analysis) => {
    const templates = [
      `These premium quality ${analysis.category.toLowerCase()} feature ${analysis.brand}'s signature craftsmanship with ${analysis.keySellingPoint}.`,
      `This exceptional ${analysis.category.toLowerCase()} showcases ${analysis.brand}'s renowned quality construction and contemporary styling.`,
      `Premium ${analysis.brand} ${analysis.category.toLowerCase()} offering superior quality and modern design.`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  };

  const generateStylingTips = (analysis) => {
    const tips = {
      'clothing': 'Perfect for dressing up with heels or down with trainers',
      'electronics': 'Ideal for home, office, or travel use',
      'accessories': 'Complements any outfit or style',
      'default': 'Versatile for multiple occasions and uses'
    };
    return tips[analysis.category.toLowerCase()] || tips.default;
  };

  const generateEbayCategory = (analysis) => {
    const categoryMap = {
      'jeans': "Women's Clothing, Shoes & Accessories > Women's Clothing > Jeans",
      'electronics': "Consumer Electronics > [Specific Subcategory]",
      'books': "Books, Comics & Magazines > Books",
      'magic': "Collectables > Magic & Wizardry > Tricks & Sets"
    };
    return categoryMap[analysis.category.toLowerCase()] || "Please select appropriate category";
  };

  const generateClosingLine = (analysis) => {
    const lines = [
      `Grab this authentic ${analysis.brand} at a fraction of the retail price!`,
      `Don't miss this premium ${analysis.brand} ${analysis.category.toLowerCase()}!`,
      `Exceptional value for this quality ${analysis.brand} piece!`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  };

  // Market Pricing Intelligence
  const getMarketPricing = async (searchTerm) => {
    try {
      // Call pricing API or web scraping service
      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: searchTerm })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Pricing data failed:', error);
    }
    
    // Fallback pricing (you can enhance this)
    return {
      averagePrice: "50-80",
      minPrice: "25-35", 
      maxPrice: "90-120"
    };
  };

  // Image handling
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setImages(prev => [...prev, ...imageFiles].slice(0, 10)); // Max 10 images
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(listing);
    alert('Listing copied to clipboard!');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          <Sparkles className="inline mr-2 text-yellow-500" />
          SpicyLister Pro
        </h1>
        <p className="text-gray-600">Professional eBay Listing Generator with Market Intelligence</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg mb-4">Upload Product Images</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
            >
              Choose Images
            </button>
          </div>

          {/* Image Preview */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={analyzeImages}
            disabled={images.length === 0 || analyzing}
            className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {analyzing ? (
              <>
                <Sparkles className="inline mr-2 animate-spin" />
                Analyzing Images & Generating Professional Listing...
              </>
            ) : (
              <>
                <Sparkles className="inline mr-2" />
                Generate Professional Listing
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {listing && (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Professional eBay Listing</h3>
                  <button
                    onClick={copyToClipboard}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition flex items-center"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </button>
                </div>
                <div className="bg-white p-4 rounded border max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {listing}
                  </pre>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">✅ Professional Features Included:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• SEO-optimized title with power words</li>
                  <li>• Structured description with key features</li>
                  <li>• Market pricing intelligence</li>
                  <li>• Strategic pricing recommendations</li>
                  <li>• Best eBay category suggestions</li>
                  <li>• Professional marketing copy</li>
                  <li>• Condition assessment</li>
                  <li>• Terms and conditions</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpicyListerPro;
