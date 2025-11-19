import React, { useState, useRef } from 'react';
import { Camera, Copy, Check, Coffee, Sparkles, Share2, Trash2, Flame, IceCream } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { toPng } from 'html-to-image';
import Confetti from 'react-confetti';

// --- CONFIGURATION ---
const RARITY_TIERS = {
  'Common': { color: 'border-gray-400', bg: 'bg-gray-50', text: 'text-gray-600', emoji: '🗑️' },
  'Uncommon': { color: 'border-green-400', bg: 'bg-green-50', text: 'text-green-600', emoji: '🍀' },
  'Rare': { color: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-600', emoji: '💎' },
  'Epic': { color: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-600', emoji: '🔮' },
  'Legendary': { color: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-600', emoji: '👑' },
  'God-Tier': { color: 'border-rose-500', bg: 'bg-rose-50', text: 'text-rose-600', emoji: '🔥' }
};

const GLOBAL_REGIONS = {
  'US': { currency: 'USD', symbol: '$' },
  'UK': { currency: 'GBP', symbol: '£' },
  'DE': { currency: 'EUR', symbol: '€' },
  'AU': { currency: 'AUD', symbol: 'A$' },
  'CA': { currency: 'CAD', symbol: 'C$' },
  'EU': { currency: 'EUR', symbol: '€' }
};

// --- HELPERS ---
const detectUserRegion = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone.includes('Europe/London')) return 'UK';
    if (timezone.includes('America')) return 'US';
    if (timezone.includes('Australia')) return 'AU';
    return 'UK'; 
  } catch { return 'UK'; }
};

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export default function App() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [isSpicyMode, setIsSpicyMode] = useState(true); 
  const [showConfetti, setShowConfetti] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);

  const resultCardRef = useRef(null);
  const userRegion = detectUserRegion();
  const userCurrency = GLOBAL_REGIONS[userRegion];

  const getRarityStyle = (tier) => {
    return RARITY_TIERS[tier] || RARITY_TIERS['Common'];
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const compressed = await compressImage(file);
      setImagePreview(compressed);
      setResults(null);
      setShowConfetti(false);
    }
  };

  const resetApp = () => {
    setImage(null);
    setImagePreview(null);
    setResults(null);
    setShowConfetti(false);
  };

  const analyzeItem = async () => {
    if (!image) return;
    setLoading(true);
    
    try {
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing API Key. Please check Netlify settings.");

      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Force the API to use 'v1beta' so we can access the Flash model
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1beta" });

      const base64Data = imagePreview.split(',')[1];
      const imagePart = {
        inlineData: { data: base64Data, mimeType: 'image/jpeg' }
      };

      const systemPrompt = isSpicyMode 
        ? `You are SpicyLister, a hilarious, high-energy auctioneer. 
           Analyze this image for the ${userRegion} market (${userCurrency.currency}).
           
           1. Assign a "Rarity Tier" (Common, Uncommon, Rare, Epic, Legendary, God-Tier).
           2. Roast it if it's junk, Hype it if it's valuable. Be British, witty.
           3. Give a listing title and description.
           4. Give a price range (low/high).
           
           Return ONLY valid JSON:
           {
             "title": "SEO optimized title",
             "rarity": "Tier Name",
             "spicyComment": "Roast or hype comment",
             "description": "Sales description",
             "category": "eBay Category",
             "priceLow": 10,
             "priceHigh": 20
           }`
        : `Act as a professional reseller for the ${userRegion} market (${userCurrency.currency}).
           Return ONLY valid JSON:
           {
             "title": "SEO optimized title",
             "rarity": "Standard",
             "spicyComment": "Item analyzed.",
             "description": "Professional description",
             "category": "eBay Category",
             "priceLow": 10,
             "priceHigh": 20
           }`;

      const result = await model.generateContent([systemPrompt, imagePart]);
      const response = await result.response;
      const text = response.text().replace(/```json\n?|```/g, "").trim();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("JSON Parsing failed, using fallback");
        data = {
          title: "Item Identified (AI Format Issue)",
          category: "Misc",
          description: text.substring(0, 200), 
          priceLow: 0,
          priceHigh: 0,
          spicyComment: "I see the item, but my brain got scrambled formatting the listing. Here is the raw info!",
          rarity: "Common"
        };
      }

      setResults(data);
      
      if (isSpicyMode && (data.priceHigh > 50 || ['Rare', 'Legendary', 'God-Tier', 'Epic'].includes(data.rarity))) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }

    } catch (error) {
      console.error(error);
      let msg = "Something went wrong.";
      if (error.message.includes("404")) msg = "Model not found. Google might be updating the API.";
      if (error.message.includes("429")) msg = "Too many requests! The AI is overwhelmed.";
      if (error.message.includes("API key")) msg = "API Key issue. Check Netlify.";
      alert(msg + "\nTechnical detail: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const shareResult = async () => {
    if (resultCardRef.current) {
      try {
        const dataUrl = await toPng(resultCardRef.current, { cacheBust: true });
        const link = document.createElement('a');
        link.download = `spicylister-share.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) { console.error(err); }
    }
  };

  const copyText = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-yellow-50 font-sans p-4">
      {showConfetti && <Confetti numberOfPieces={200} recycle={false} />}

      <div className="max-w-2xl mx-auto">
        
        {/* HEADER & LOGO */}
        <div className="text-center mb-8 pt-4">
          <div className="flex justify-center mb-4">
             <img 
               src={process.env.PUBLIC_URL + '/logo.png'} 
               alt="SpicyLister Logo" 
               className="w-24 h-24 object-contain drop-shadow-md"
               onError={(e) => {e.target.style.display='none'}} 
             />
             <div className="text-6xl" style={{display: 'none'}}>🌶️</div> 
          </div>
          
          <h1 className="text-5xl font-bold mb-2" style={{ color: '#F28B82' }}>
            SpicyLister
          </h1>
          <p className="text-xl font-medium text-gray-700">
            Sell your clutter without a stutter
          </p>
          
          {/* THE TOGGLE: Vanilla vs Spicy */}
          <div className="flex justify-center mt-6">
            <div className="bg-white p-1.5 rounded-full shadow-md inline-flex border border-orange-100">
              <button 
                onClick={() => setIsSpicyMode(false)}
                className={`px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${!isSpicyMode ? 'bg-blue-100 text-blue-700 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <IceCream size={18} /> Vanilla
              </button>
              <button 
                onClick={() => setIsSpicyMode(true)}
                className={`px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${isSpicyMode ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Flame size={18} /> SPICY
              </button>
            </div>
          </div>
          
          {isSpicyMode ? (
            <p className="text-xs text-orange-600 mt-2 font-medium animate-pulse">🔥 Neurospicy Mode: Engaged</p>
          ) : (
             <p className="text-xs text-blue-500 mt-2 font-medium">🍦 Professional Mode: Clean & Simple</p>
          )}
        </div>

        {/* MAIN CARD */}
        <div className="bg-white rounded-3xl shadow-xl p-6 border-2 border-orange-100">
          
          {!image && (
            <label className="flex flex-col items-center justify-center w-full h-80 border-4 border-dashed rounded-2xl cursor-pointer transition-all hover:bg-orange-50 border-orange-300">
              <Camera className="w-20 h-20 mb-4 text-orange-300" />
              <p className="font-bold text-xl mb-2 text-gray-700">Tap to Snap or Upload</p>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          )}

          {image && !results && (
            <div className="space-y-6">
              <div className="relative rounded-2xl overflow-hidden aspect-square shadow-inner bg-gray-100 border-2 border-orange-100">
                <img src={imagePreview} alt="Item" className="w-full h-full object-contain" />
                <button onClick={resetApp} className="absolute top-4 right-4 bg-white p-3 rounded-full shadow-md text-gray-500 hover:text-red-500">
                  <Trash2 size={24} />
                </button>
              </div>

              <button
                onClick={analyzeItem}
                disabled={loading}
                className="w-full py-5 rounded-2xl font-bold text-xl text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 bg-gradient-to-r from-orange-400 to-red-500"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-4 border-white border-t-transparent"></div>
                    {isSpicyMode ? "Cooking up magic..." : "Analyzing..."}
                  </>
                ) : (
                  <>
                    <Sparkles size={24} />
                    {isSpicyMode ? "Generate Spicy Listing" : "Generate Listing"}
                  </>
                )}
              </button>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              
              <div ref={resultCardRef} className="bg-white p-2 rounded-xl">
                 {isSpicyMode && (
                  <div className={`mb-6 p-4 rounded-2xl border-2 ${getRarityStyle(results.rarity).bg} ${getRarityStyle(results.rarity).color} text-center`}>
                    <p className="text-lg font-bold italic text-gray-800">"{results.spicyComment}"</p>
                    <span className="text-xs uppercase font-black tracking-widest text-gray-500 mt-2 block">
                        {results.rarity} TIER FIND {getRarityStyle(results.rarity).emoji}
                    </span>
                  </div>
                )}

                <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase text-orange-600 tracking-wider">Listing Title</span>
                    <button onClick={() => copyText('title', results.title)} className="text-orange-500 hover:text-orange-700">
                      {copiedSection === 'title' ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">{results.title}</h2>
                </div>

                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mb-4">
                   <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Description</span>
                    <button onClick={() => copyText('desc', results.description)} className="text-gray-400 hover:text-gray-600">
                      {copiedSection === 'desc' ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{results.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-center">
                    <span className="text-xs font-bold uppercase text-green-600">Est. Value</span>
                    <p className="text-2xl font-black text-green-700 mt-1">{userCurrency.symbol}{results.priceLow} - {results.priceHigh}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                    <span className="text-xs font-bold uppercase text-blue-600">Category</span>
                    <p className="text-sm font-bold text-blue-800 mt-2 leading-tight">{results.category}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={shareResult}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800"
                >
                  <Share2 size={18} /> Share
                </button>
                <button 
                  onClick={resetApp}
                  className="flex-1 bg-white border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-50"
                >
                  Scan New Item
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 text-center space-y-6 pb-12">
          <div className="inline-block bg-white px-6 py-4 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 flex items-center justify-center gap-2">
              <Coffee className="text-yellow-500" /> This is Coffeeware
            </h3>
            <p className="text-sm text-gray-500 mt-1">Free to use. Support if it helps you.</p>
            <a 
              href="https://buymeacoffee.com/chrispteemagician" 
              target="_blank" 
              rel="noreferrer"
              className="mt-3 block bg-yellow-400 text-yellow-900 font-bold py-2 px-4 rounded-xl hover:bg-yellow-500 transition-colors"
            >
              Buy Chris a Coffee
            </a>
          </div>

          <div className="flex flex-col items-center gap-2 text-sm text-gray-400">
            <a href="https://comedymagic.co.uk" target="_blank" rel="noreferrer" className="hover:text-purple-500 transition-colors">
              Support the <strong>Community Comedy Magic Tour</strong>
            </a>
            <a href="https://www.tiktok.com/@chrispteemagician" target="_blank" rel="noreferrer" className="hover:text-black transition-colors flex items-center gap-1">
              Find me on TikTok
            </a>
             <p className="text-xs opacity-50 mt-4">SpicyLister v1.2 • Secure & Private</p>
          </div>
        </div>

      </div>
    </div>
  );
}