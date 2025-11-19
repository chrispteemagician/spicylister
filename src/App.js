import React, { useState, useRef } from 'react';
import { Camera, Copy, Check, Coffee, Sparkles, Share2, Zap, Trash2, Info } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { toPng } from 'html-to-image';

// --- CONFIGURATION & CONSTANTS ---

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

// --- HELPER FUNCTIONS ---

const detectUserRegion = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone.includes('Europe/London')) return 'UK';
    if (timezone.includes('America')) return 'US';
    if (timezone.includes('Australia')) return 'AU';
    if (timezone.includes('Europe')) return 'EU';
    return 'UK'; // Default
  } catch {
    return 'UK';
  }
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
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

// --- COMPONENTS ---

const LootBox = ({ onOpen }) => {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center py-12 cursor-pointer"
      onClick={onOpen}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0, opacity: 0 }}
    >
      <motion.div
        className="text-9xl mb-4 filter drop-shadow-2xl"
        animate={{ 
          rotate: [-5, 5, -5], 
          scale: [1, 1.05, 1] 
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 0.5 
        }}
      >
        🎁
      </motion.div>
      <motion.p 
        className="text-2xl font-black text-white uppercase tracking-widest animate-pulse"
      >
        Tap to Reveal!
      </motion.p>
    </motion.div>
  );
};

export default function App() {
  // State
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [isSpicyMode, setIsSpicyMode] = useState(true); // Default to FUN
  const [showLootBox, setShowLootBox] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);

  // Refs
  const resultCardRef = useRef(null);
  
  // Derived
  const userRegion = detectUserRegion();
  const userCurrency = GLOBAL_REGIONS[userRegion];

  // Handlers
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const compressed = await compressImage(file);
      setImagePreview(compressed);
      setResults(null);
      setShowLootBox(false);
      setShowConfetti(false);
    }
  };

  const resetApp = () => {
    setImage(null);
    setImagePreview(null);
    setResults(null);
    setShowLootBox(false);
    setShowConfetti(false);
  };

  const analyzeItem = async () => {
    if (!image) return;
    setLoading(true);
    
    try {
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // 1.5 is standard now

      const base64Data = imagePreview.split(',')[1];
      const imagePart = {
        inlineData: { data: base64Data, mimeType: 'image/jpeg' }
      };

      // THE SPICY PROMPT 🌶️
      const systemPrompt = isSpicyMode 
        ? `You are a hilarious, high-energy auctioneer and appraiser. 
           Analyze this image. 
           1. Determine its "Rarity Tier" (Common, Uncommon, Rare, Epic, Legendary, God-Tier).
           2. Roast the item if it's junk, or Hype it up if it's valuable. Be British, witty, and concise.
           3. Provide accurate eBay pricing for ${userRegion} in ${userCurrency.currency}.
           
           Return STRICT JSON:
           {
             "title": "SEO optimized title",
             "rarity": "Tier Name",
             "spicyComment": "Your roast or hype comment here",
             "description": "Sales description",
             "category": "eBay Category",
             "priceLow": 10,
             "priceHigh": 20,
             "format": "Buy It Now"
           }`
        : `You are a professional eBay listing assistant.
           Analyze this image for the ${userRegion} market (${userCurrency.currency}).
           Return STRICT JSON:
           {
             "title": "SEO optimized title",
             "rarity": "Standard",
             "spicyComment": "Item analyzed successfully.",
             "description": "Professional description",
             "category": "eBay Category",
             "priceLow": 10,
             "priceHigh": 20,
             "format": "Buy It Now"
           }`;

      const result = await model.generateContent([systemPrompt, imagePart]);
      const response = await result.response;
      const text = response.text().replace(/```json\n?|```/g, "").trim();
      const data = JSON.parse(text);

      setResults(data);
      setLoading(false);
      
      // Trigger Loot Box Phase
      if (isSpicyMode) {
        setShowLootBox(true);
      }

    } catch (error) {
      console.error(error);
      alert("The AI got confused. Try a clearer photo!");
      setLoading(false);
    }
  };

  const handleLootOpen = () => {
    setShowLootBox(false);
    // Trigger confetti if it's valuable or rare
    if (results.rarity === 'Legendary' || results.rarity === 'God-Tier' || results.rarity === 'Epic') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  const shareResult = async () => {
    if (resultCardRef.current) {
      try {
        const dataUrl = await toPng(resultCardRef.current, { cacheBust: true });
        const link = document.createElement('a');
        link.download = `spicylister-${results.title.substring(0, 10)}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to share', err);
      }
    }
  };

  const copyText = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Rarity Styles Helper
  const getRarityStyle = (tier) => RARITY_TIERS[tier] || RARITY_TIERS['Common'];

  return (
    <div className="min-h-screen bg-slate-100 font-sans selection:bg-orange-200">
      {showConfetti && <Confetti numberOfPieces={200} recycle={false} />}

      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-600 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 text-9xl transform translate-x-10 -translate-y-10">🌶️</div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2">
              SpicyLister <span className="text-sm bg-white text-orange-600 px-2 py-0.5 rounded-full">BETA</span>
            </h1>
            <p className="text-orange-100 text-sm font-medium">Turn your clutter into dopamine.</p>
          </div>
          
          {/* MODE TOGGLE */}
          <div className="mt-4 flex items-center gap-3 bg-black/20 p-1 rounded-full w-fit">
            <button 
              onClick={() => setIsSpicyMode(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${!isSpicyMode ? 'bg-white text-orange-600 shadow-lg' : 'text-orange-100'}`}
            >
              Boring
            </button>
            <button 
              onClick={() => setIsSpicyMode(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${isSpicyMode ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg' : 'text-orange-100'}`}
            >
              <Zap size={12} fill="currentColor" /> SPICY
            </button>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 p-6 flex flex-col gap-6 relative">
          
          {/* STATE: UPLOAD */}
          {!image && (
            <div className="flex-1 flex flex-col justify-center">
              <label className="group relative flex flex-col items-center justify-center w-full h-80 border-4 border-dashed border-gray-300 rounded-3xl bg-gray-50 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all overflow-hidden">
                <div className="absolute inset-0 bg-orange-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl transform scale-0 group-hover:scale-100"></div>
                <div className="relative z-10 flex flex-col items-center text-center p-6">
                  <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Camera className="w-10 h-10 text-orange-500" />
                  </div>
                  <p className="text-xl font-black text-gray-700">Snap It.</p>
                  <p className="text-sm text-gray-500 mt-2">List in 60 seconds.<br/>Don't overthink it.</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          )}

          {/* STATE: PREVIEW & ACTION */}
          {image && !results && !loading && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="relative rounded-3xl overflow-hidden shadow-xl border-4 border-white aspect-square">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={resetApp}
                  className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-red-500 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <button
                onClick={analyzeItem}
                className="w-full py-4 bg-black text-white rounded-2xl font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                <Sparkles className="group-hover:animate-spin" />
                {isSpicyMode ? "ROAST MY JUNK" : "GENERATE LISTING"}
              </button>
            </div>
          )}

          {/* STATE: LOADING */}
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 border-8 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-6"></div>
              <h3 className="text-xl font-bold text-gray-800">
                {isSpicyMode ? "Summoning the Spirits..." : "Analyzing Image..."}
              </h3>
              <p className="text-gray-500 mt-2">
                {isSpicyMode ? "Comparing to 50,000 other pieces of clutter." : "Identifying details..."}
              </p>
            </div>
          )}

          {/* STATE: LOOT BOX REVEAL */}
          <AnimatePresence>
            {results && showLootBox && (
              <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center">
                <LootBox onOpen={handleLootOpen} />
              </div>
            )}
          </AnimatePresence>

          {/* STATE: RESULTS (TRADING CARD) */}
          {results && !showLootBox && (
            <div className="flex flex-col gap-6 animate-in zoom-in duration-300">
              
              {/* TRADING CARD COMPONENT */}
              <div 
                ref={resultCardRef}
                className={`bg-white rounded-3xl shadow-2xl overflow-hidden border-4 ${isSpicyMode ? getRarityStyle(results.rarity).color : 'border-gray-200'}`}
              >
                {/* Image Area */}
                <div className="relative h-64 bg-gray-100">
                  <img src={imagePreview} alt="Item" className="w-full h-full object-cover" />
                  
                  {/* Rarity Badge */}
                  {isSpicyMode && (
                    <div className={`absolute bottom-4 left-4 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border-2 bg-white ${getRarityStyle(results.rarity).color} ${getRarityStyle(results.rarity).text}`}>
                      {getRarityStyle(results.rarity).emoji} {results.rarity}
                    </div>
                  )}
                  
                  {/* Price Tag */}
                  <div className="absolute bottom-4 right-4 bg-black text-white px-4 py-2 rounded-xl font-black shadow-lg">
                    {userCurrency.symbol}{results.priceLow} - {results.priceHigh}
                  </div>
                </div>

                {/* Card Body */}
                <div className={`p-6 ${isSpicyMode ? getRarityStyle(results.rarity).bg : 'bg-white'}`}>
                  <h2 className="text-2xl font-black leading-tight text-gray-800 mb-2">
                    {results.title}
                  </h2>
                  
                  {/* Spicy Comment */}
                  {isSpicyMode && (
                    <div className="mb-4 p-3 bg-white/60 rounded-xl border border-black/5 italic text-gray-700 text-sm">
                      "{results.spicyComment}"
                    </div>
                  )}

                  {/* Actions Grid */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button 
                      onClick={() => copyText('title', results.title)}
                      className="col-span-2 flex items-center justify-center gap-2 bg-white border-2 border-gray-200 py-3 rounded-xl font-bold text-gray-700 active:bg-gray-50 transition-colors"
                    >
                      {copiedSection === 'title' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                      Copy Title
                    </button>

                    <button 
                      onClick={() => copyText('desc', results.description)}
                      className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 py-3 rounded-xl font-bold text-gray-700 active:bg-gray-50 transition-colors"
                    >
                      {copiedSection === 'desc' ? <Check size={18} className="text-green-500" /> : <Info size={18} />}
                      Desc
                    </button>

                    <button 
                      onClick={shareResult}
                      className="flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl font-bold active:bg-gray-800 transition-colors"
                    >
                      <Share2 size={18} />
                      Share
                    </button>
                  </div>
                </div>
              </div>

              {/* Next Step */}
              <button 
                onClick={resetApp}
                className="text-gray-400 font-semibold text-sm hover:text-gray-600 transition-colors text-center"
              >
                Scan Another Item
              </button>
            </div>
          )}
        </div>

        {/* FOOTER - The "Feel Famous" Link */}
        <div className="p-4 bg-white border-t border-gray-100 text-center">
          <a 
            href="https://buymeacoffee.com/chrispteemagician" 
            target="_blank" 
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-orange-500 transition-colors"
          >
            <Coffee size={16} />
            Fuel the Van Life
          </a>
        </div>
      </div>
    </div>
  );
}