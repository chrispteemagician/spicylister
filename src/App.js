import React, { useState } from 'react';
import { Camera, Copy, Check, Coffee, Sparkles } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Global currency detection (invisible to user)
const globalRegions = {
  'US': { currency: 'USD', symbol: '$', multiplier: 1.27 },
  'UK': { currency: 'GBP', symbol: '£', multiplier: 1.0 },
  'DE': { currency: 'EUR', symbol: '€', multiplier: 1.17 },
  'AU': { currency: 'AUD', symbol: 'A$', multiplier: 1.91 },
  'CA': { currency: 'CAD', symbol: 'C$', multiplier: 1.71 },
  'FR': { currency: 'EUR', symbol: '€', multiplier: 1.17 },
  'IT': { currency: 'EUR', symbol: '€', multiplier: 1.17 },
  'ES': { currency: 'EUR', symbol: '€', multiplier: 1.17 }
};

const detectUserRegion = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone.includes('America/New_York') || timezone.includes('America/Los_Angeles') || timezone.includes('America/Chicago')) return 'US';
    if (timezone.includes('Europe/Berlin')) return 'DE';
    if (timezone.includes('Australia')) return 'AU';
    if (timezone.includes('America/Toronto')) return 'CA';
    if (timezone.includes('Europe/Paris')) return 'FR';
    if (timezone.includes('Europe/Rome')) return 'IT';
    if (timezone.includes('Europe/Madrid')) return 'ES';
    return 'UK';
  } catch {
    return 'UK';
  }
};

export default function App() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [copiedSection, setCopiedSection] = useState(null);

  // Auto-detect user region (invisible)
  const userRegion = detectUserRegion();
  const userCurrency = globalRegions[userRegion];

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;  // Smaller for better API compatibility
          const MAX_HEIGHT = 600;
          
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5); // More compression
          resolve(compressedBase64);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const compressed = await compressImage(file);
      setImagePreview(compressed);
      setResults(null);
    }
  };

  const analyzeItem = async () => {
    if (!image) return;

    setLoading(true);
    
    try {
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
      
      if (!apiKey) {
        alert('API configuration error. Please contact support.');
        setLoading(false);
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const base64Data = imagePreview.split(',')[1];
      
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      };

      // Enhanced prompt with region awareness
      const prompt = `You are an expert in selling on eBay globally. The user is in ${userRegion} and uses ${userCurrency.currency}.

Analyze this image and create a listing with:

1. A keyword-rich title (80 characters max)
2. An honest, compelling description
3. Best eBay category for ${userRegion}
4. Estimated price range based on typical eBay ${userRegion} sold prices for similar items (give low/average/high in ${userCurrency.currency})
5. Recommended starting price (auction) OR Buy It Now price in ${userCurrency.currency}

Assume item is in good working order and condition.

CRITICAL: Format your response EXACTLY as valid JSON with no markdown, no backticks, no extra text:

{
  "title": "your 80 char title here",
  "category": "eBay category path",
  "description": "compelling honest description",
  "priceRange": {
    "low": 10.00,
    "average": 25.00,
    "high": 45.00
  },
  "recommendation": {
    "format": "Auction" or "Buy It Now",
    "startPrice": 15.00,
    "buyItNowPrice": 29.99
  },
  "notes": "any additional pricing guidance"
}

RESPOND ONLY WITH THE JSON OBJECT. NO OTHER TEXT.`;

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      let text = response.text();
      
      text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      const listingData = JSON.parse(text);
      setResults(listingData);
      
    } catch (error) {
      console.error("Error:", error);
      
      // Better error handling with user-friendly messages
      let errorMessage = "Something went wrong. Please try again!";
      
      if (error.message?.includes('quota') || error.message?.includes('limit') || error.message?.includes('429')) {
        errorMessage = "🌶️ High demand right now! Please wait a minute and try again. Your spicy brain deserves the best results!";
      } else if (error.message?.includes('large') || error.message?.includes('size')) {
        errorMessage = "Image is a bit too chunky! Try a smaller image or take a new photo.";
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = "Connection hiccup! Check your internet and try again.";
      } else if (error.message?.includes('API') || error.message?.includes('key')) {
        errorMessage = "API configuration issue. Please contact support or try again later.";
      } else if (error.message?.includes('JSON') || error.message?.includes('parse')) {
        errorMessage = "Got a confused response from the AI. Please try again!";
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copySection = (section, text) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6 pt-4">
          <div className="inline-block mb-4">
            <div className="text-8xl">🌶️📸</div>
          </div>
          <h1 className="text-6xl font-bold mb-3" style={{ color: '#F28B82' }}>
            SpicyLister
          </h1>
          <p className="text-2xl font-bold text-gray-800 mb-2">
            Sell your clutter without a stutter
          </p>
          <p className="text-lg text-gray-700 font-medium mb-1">
            List in 60 seconds
          </p>
          <p className="text-gray-600 text-sm">
            For when your spicy brain says NO. eBay • Vinted • More
          </p>
          {/* Invisible region indicator - remove in production */}
          <p className="text-xs text-gray-400 mt-2">
            🌍 {userRegion} • Prices in {userCurrency.currency}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6 border-2" style={{ borderColor: '#F28B82' }}>
          <div className="mb-6">
            <label className="flex flex-col items-center justify-center w-full h-72 border-4 border-dashed rounded-2xl cursor-pointer transition-all" style={{ borderColor: '#F28B82', backgroundColor: '#FFF5F3' }}>
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="max-h-64 object-contain rounded-lg" />
              ) : (
                <div className="flex flex-col items-center">
                  <Camera className="w-20 h-20 mb-4" style={{ color: '#F28B82' }} />
                  <p className="font-bold text-xl mb-2" style={{ color: '#F28B82' }}>
                    📸 Snap or Upload Your Item
                  </p>
                  <p className="text-gray-500">One picture. That's it.</p>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </label>
          </div>

          {image && !results && (
            <button
              onClick={analyzeItem}
              disabled={loading}
              className="w-full text-white py-5 rounded-2xl font-bold text-xl transition-all shadow-xl flex items-center justify-center gap-3"
              style={{ 
                background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #FFA07A 0%, #F28B82 50%, #FFD700 100%)',
              }}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-7 w-7 border-b-3 border-white"></div>
                  Spicing it up...
                </>
              ) : (
                <>
                  <Sparkles className="w-7 h-7" />
                  Generate My Listing
                </>
              )}
            </button>
          )}
        </div>

        {results && (
          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6 border-2" style={{ borderColor: '#F28B82' }}>
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">💰✨</div>
              <h2 className="text-3xl font-bold text-gray-800">
                Your Listing is Ready!
              </h2>
            </div>

            <div className="space-y-5">
              <div className="p-5 rounded-2xl border-2" style={{ backgroundColor: '#FFF5F3', borderColor: '#F28B82' }}>
                <div className="flex justify-between items-start mb-3">
                  <label className="text-sm font-bold uppercase" style={{ color: '#F28B82' }}>
                    📝 Title
                  </label>
                  <button
                    onClick={() => copySection('title', results.title)}
                    className="flex items-center gap-2 text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-md text-sm"
                    style={{ backgroundColor: '#F28B82' }}
                  >
                    {copiedSection === 'title' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-lg font-semibold text-gray-800 mb-1">{results.title}</p>
                <p className="text-xs text-gray-500">{results.title.length}/80 characters</p>
              </div>

              <div className="p-5 rounded-2xl border-2" style={{ backgroundColor: '#FFF9E6', borderColor: '#FFD700' }}>
                <div className="flex justify-between items-start mb-3">
                  <label className="text-sm font-bold uppercase text-yellow-700">
                    📁 Category
                  </label>
                  <button
                    onClick={() => copySection('category', results.category)}
                    className="flex items-center gap-2 bg-yellow-500 text-gray-900 px-4 py-2 rounded-xl font-semibold transition-all shadow-md text-sm hover:bg-yellow-600"
                  >
                    {copiedSection === 'category' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-gray-800 font-medium">{results.category}</p>
              </div>

              <div className="p-5 rounded-2xl border-2" style={{ backgroundColor: '#F0FFF4', borderColor: '#48BB78' }}>
                <div className="flex justify-between items-start mb-3">
                  <label className="text-sm font-bold text-green-700 uppercase">
                    📄 Description
                  </label>
                  <button
                    onClick={() => copySection('description', results.description)}
                    className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-md text-sm hover:bg-green-600"
                  >
                    {copiedSection === 'description' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{results.description}</p>
              </div>

              <div className="p-5 rounded-2xl border-2" style={{ backgroundColor: '#FAF5FF', borderColor: '#9F7AEA' }}>
                <div className="flex justify-between items-start mb-4">
                  <label className="text-sm font-bold text-purple-700 uppercase">
                    💷 Pricing Guide
                  </label>
                  <button
                    onClick={() => copySection('pricing', `Low: ${userCurrency.symbol}${results.priceRange.low}\nAverage: ${userCurrency.symbol}${results.priceRange.average}\nHigh: ${userCurrency.symbol}${results.priceRange.high}\n\n${results.recommendation.format}\n${results.recommendation.startPrice ? `Start: ${userCurrency.symbol}${results.recommendation.startPrice}` : ''}\n${results.recommendation.buyItNowPrice ? `Buy It Now: ${userCurrency.symbol}${results.recommendation.buyItNowPrice}` : ''}\n\n${results.notes}`)}
                    className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-md text-sm hover:bg-purple-600"
                  >
                    {copiedSection === 'pricing' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-white p-4 rounded-xl text-center border-2 border-purple-200">
                    <p className="text-xs text-gray-600 mb-1 font-semibold">Low</p>
                    <p className="text-2xl font-bold text-purple-600">{userCurrency.symbol}{results.priceRange.low}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl text-center border-2 border-purple-200">
                    <p className="text-xs text-gray-600 mb-1 font-semibold">Average</p>
                    <p className="text-2xl font-bold text-purple-600">{userCurrency.symbol}{results.priceRange.average}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl text-center border-2 border-purple-200">
                    <p className="text-xs text-gray-600 mb-1 font-semibold">High</p>
                    <p className="text-2xl font-bold text-purple-600">{userCurrency.symbol}{results.priceRange.high}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border-2 border-purple-200">
                  <p className="font-bold text-purple-700 mb-2 text-lg">💡 {results.recommendation.format}</p>
                  {results.recommendation.startPrice && (
                    <p className="text-gray-700">Start: <span className="font-semibold">{userCurrency.symbol}{results.recommendation.startPrice}</span></p>
                  )}
                  {results.recommendation.buyItNowPrice && (
                    <p className="text-gray-700">Buy It Now: <span className="font-semibold">{userCurrency.symbol}{results.recommendation.buyItNowPrice}</span></p>
                  )}
                  {results.notes && (
                    <p className="text-sm text-gray-600 mt-3 italic border-t pt-3 border-purple-100">{results.notes}</p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setImage(null);
                setImagePreview(null);
                setResults(null);
              }}
              className="w-full mt-6 bg-gray-700 text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all shadow-lg"
            >
              🌶️ List Another Item
            </button>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center border-2" style={{ borderColor: '#F28B82' }}>
          <div className="text-5xl mb-4">☕✨</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            This is Coffeeware!
          </h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Built by <span className="font-bold" style={{ color: '#F28B82' }}>Chris P Tee</span> for AuDHD brains that struggle with listing.<br />
            Use it as much as you like - completely free!
          </p>
          <p className="text-gray-700 mb-5 leading-relaxed">
            If this helps you turn clutter into cash, consider supporting the<br />
            <span className="font-bold text-purple-600">🎭 Community Comedy Magic Tour 🎩</span> around the UK!
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 mb-5">
            <a
              href="https://buymeacoffee.com/chrispteemagician"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-yellow-400 text-gray-900 px-6 py-3 rounded-full font-bold hover:bg-yellow-500 transition-all shadow-lg text-lg"
            >
              <Coffee className="w-5 h-5" />
              Buy Me a Coffee
            </a>
            <a
              href="https://www.tiktok.com/@chrispteemagician"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-full font-bold transition-all shadow-lg text-lg"
              style={{ backgroundColor: '#F28B82' }}
            >
              📱 @chrispteemagician
            </a>
          </div>

          <a
            href="https://comedymagic.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-800 font-medium mb-4 block transition-colors"
          >
            🌐 comedymagic.co.uk
          </a>

          <div className="border-t-2 pt-4 mt-4" style={{ borderColor: '#F28B82' }}>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Chris P Tee = Comedy + Magic + Vanlife + Code
            </p>
            <p className="text-xs text-gray-600 mb-3 italic max-w-2xl mx-auto">
              ⚠️ This tool provides AI-generated suggestions. Your listing decisions are final - always review before posting!
            </p>
            <div className="flex justify-center gap-3 mb-3">
              <a
                href="mailto:chris@comedymagic.co.uk?subject=SpicyLister Feedback"
                className="text-sm px-4 py-2 rounded-full font-semibold transition-all shadow-md"
                style={{ backgroundColor: '#F28B82', color: 'white' }}
              >
                💬 Send Feedback
              </a>
              <a
                href="https://www.tiktok.com/share?url=https://spicylister.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm bg-purple-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-purple-600 transition-all shadow-md"
              >
                📤 Share SpicyLister
              </a>
            </div>
            <p className="text-xs text-gray-500">
              © 2025 Chris P Tee Entertainments. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}