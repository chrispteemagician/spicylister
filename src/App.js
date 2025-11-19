import React, { useState, useRef } from 'react';
import { Camera, Copy, Check, Coffee, Sparkles, Share2, Zap, Trash2, Info } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { toPng } from 'html-to-image';

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

// --- LOOT BOX COMPONENT ---
const LootBox = ({ onOpen }) => (
  <motion.div 
    className="flex flex-col items-center justify-center py-12 cursor-pointer z-50"
    onClick={onOpen}
    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0, opacity: 0 }}
  >
    <motion.div
      className="text-9xl mb-4 filter drop-shadow-2xl"
      animate={{ rotate: [-5, 5, -5], scale: [1, 1.05, 1] }}
      transition={{ repeat: Infinity, duration: 0.5 }}
    >
      🎁
    </motion.div>
    <motion.p className="text-2xl font-black text-white uppercase tracking-widest animate-pulse drop-shadow-md">
      Tap to Reveal!
    </motion.p>
  </motion.div>
);

export default function App() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [isSpicyMode, setIsSpicyMode] = useState(true);
  const [showLootBox, setShowLootBox] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);

  const resultCardRef = useRef(null);
  const userRegion = detectUserRegion();
  const userCurrency = GLOBAL_REGIONS[userRegion];

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
      if (!apiKey) throw new Error("Missing API Key. Check Netlify settings.");

      const genAI = new GoogleGenerativeAI(apiKey);
      // Using 1.5-flash because it is stable and cheap. 
      // If you have access to 2.0, you can change this string.
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

      const base64Data = imagePreview.split(',')[1];
      const imagePart = {
        inlineData: { data: base64Data, mimeType: 'image/jpeg' }
      };

      const systemPrompt = isSpicyMode 
        ? `You are SpicyLister, a hilarious, high-energy auctioneer. 
           Analyze this image.
           1. Assign a "Rarity Tier" (Common, Uncommon, Rare, Epic, Legendary, God-Tier).
           2. Roast it if it's junk, Hype it if it's valuable. Be British, witty.
           3. Give eBay pricing for ${userRegion} in ${userCurrency.currency}.
           
           Return ONLY valid JSON:
           {
             "title": "SEO optimized title",
             "rarity": "Tier Name",
             "spicyComment": "Roast or hype comment",
             "description": "Sales description",
             "category": "eBay Category",
             "priceLow": 10,
             "priceHigh": 20,
             "format": "Buy It Now"
           }`
        : `Act as a professional reseller. Analyze for ${userRegion} market (${userCurrency.currency}).
           Return ONLY valid JSON:
           {
             "title": "SEO optimized title",
             "rarity": "Standard",
             "spicyComment": "Item analyzed.",
             "description": "Professional description",
             "category": "eBay Category",
             "priceLow": 10,
             "priceHigh": 20,
             "format": "Buy It Now"
           }`;

      const result = await model.generateContent([systemPrompt, imagePart]);
      const response = await result.response;
      const text = response.text().replace(/```json\n?|```/g, "").trim();
      
      try {
        const data = JSON.parse(text);
        setResults(data);
        if (isSpicyMode) setShowLootBox(true);
      } catch (e) {
        throw new Error("AI response wasn't valid JSON. Try again.");
      }

    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLootOpen = () => {
    setShowLootBox(false);
    if (['Legendary', 'God-Tier', 'Epic'].includes(results.rarity)) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  const shareResult = async () => {
    if (resultCardRef.current) {
      try {
        const dataUrl = await toPng(resultCardRef.current, { cacheBust: true });
        const link = document.createElement('a');
        link.download = `spicylister-find.png`;
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

  const getRarityStyle = (tier) => RARITY_TIERS[tier] || RARITY_TIERS['Common'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-yellow-50 font-sans">
      {showConfetti && <Confetti numberOfPieces={200} recycle={false} />}

      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-600 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 text-9xl transform translate-x-10 -translate-y-10">🌶️</div>
          <div className="relative z-10 text-center">
            <h1 className="text-3xl font-black tracking-tighter">SpicyLister</h1>
            <p className="font-bold text-orange-100">Sell your clutter without a stutter</p>
            <p className="text-xs opacity-90 mt-1">List in 60 seconds • eBay • Vinted</p>
          </div>
          
          {/* MODE TOGGLE */}
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2 bg-black/20 p-1 rounded-full">
              <button onClick={() => setIsSpicyMode(false)} className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${!isSpicyMode ? 'bg-white text-orange-600' : 'text-orange-100'}`}>Boring</button>
              <button onClick={() => setIsSpicyMode(true)} className={`px-4 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${isSpicyMode ? 'bg-yellow-400 text-red-900' : 'text-orange-100'}`}>
                <Zap size={12} /> SPICY
              </button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 p-6 flex flex-col gap-6 relative">
          
          {/* STATE: UPLOAD */}
          {!image && (
            <div className="flex-1 flex flex-col justify-center">
              <label className="group relative flex flex-col items-center justify-center w-full h-72 border-4 border-dashed border-orange-300 rounded-3xl bg-orange-50 cursor-pointer hover:bg-orange-100 transition-all">
                <div className="flex flex-col items-center text-center p-6">
                  <Camera className="w-16 h-16 text-orange-500 mb-4" />
                  <p className="text-xl font-black text-gray-700">Snap It.</p>
                  <p className="text-sm text-gray-500 mt-2">One photo.<br/>That's all we need.</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          )}

          {/* STATE: PREVIEW & ACTION */}
          {image && !results && !loading && (
            <div className="flex flex-col gap-6 animate-in fade-in">
              <div className="relative rounded-3xl overflow-hidden shadow-xl border-4 border-white aspect-square bg-gray-100">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                <button onClick={resetApp} className="absolute top-4 right-4 bg-white/90 text-red-500 p-2 rounded-full shadow-sm hover:bg-red-50">
                  <Trash2 size={20} />
                </button>
              </div>
              <button onClick={analyzeItem} className="w-full py-4 bg-black text-white rounded-2xl font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                <Sparkles /> {isSpicyMode ? "ROAST MY JUNK" : "GENERATE LISTING"}
              </button>
            </div>
          )}

          {/* STATE: LOADING */}
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4"></div>
              <h3 className="text-xl font-bold text-gray-800">{isSpicyMode ? "Summoning the Spirits..." : "Analyzing..."}</h3>
            </div>
          )}

          {/* STATE: LOOT BOX */}
          <AnimatePresence>
            {results && showLootBox && (
              <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center rounded-3xl">
                <LootBox onOpen={handleLootOpen} />
              </div>
            )}
          </AnimatePresence>

          {/* STATE: RESULTS */}
          {results && !showLootBox && (
            <div className="flex flex-col gap-6 animate-in zoom-in duration-300">
              <div ref={resultCardRef} className={`bg-white rounded-3xl shadow-xl overflow-hidden border-4 ${isSpicyMode ? getRarityStyle(results.rarity).color : 'border-gray-100'}`}>
                <div className="relative h-56 bg-gray-50 flex items-center justify-center">
                  <img src={imagePreview} alt="Item" className="h-full object-contain" />
                  {isSpicyMode && (
                    <div className={`absolute bottom-3 left-3 px-3 py-1 rounded-lg text-xs font-black uppercase border bg-white ${getRarityStyle(results.rarity).text}`}>
                      {getRarityStyle(results.rarity).emoji} {results.rarity}
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 bg-black text-white px-3 py-1 rounded-lg font-black text-sm shadow-lg">
                    {userCurrency.symbol}{results.priceLow} - {results.priceHigh}
                  </div>
                </div>

                <div className={`p-5 ${isSpicyMode ? getRarityStyle(results.rarity).bg : 'bg-white'}`}>
                  <h2 className="text-xl font-black leading-tight text-gray-900 mb-2">{results.title}</h2>
                  {isSpicyMode && <div className="mb-4 p-3 bg-white/80 rounded-xl text-sm italic text-gray-700 border border-black/5">"{results.spicyComment}"</div>}
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button onClick={() => copyText('title', results.title)} className="col-span-2 flex items-center justify-center gap-2 bg-white border border-gray-200 py-3 rounded-xl font-bold text-sm text-gray-700 active:bg-gray-50">
                      {copiedSection === 'title' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />} Copy Title
                    </button>
                    <button onClick={() => copyText('desc', results.description)} className="flex items-center justify-center gap-2 bg-white border border-gray-200 py-3 rounded-xl font-bold text-sm text-gray-700 active:bg-gray-50">
                      {copiedSection === 'desc' ? <Check size={16} className="text-green-500" /> : <Info size={16} />} Desc
                    </button>
                    <button onClick={shareResult} className="flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl font-bold text-sm active:scale-95">
                      <Share2 size={16} /> Share
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={resetApp} className="text-gray-400 font-bold text-sm hover:text-orange-500 transition-colors">Scan Another Item</button>
            </div>
          )}
        </div>

        {/* FOOTER - RESTORED COFFEEWARE */}
        <div className="p-6 bg-white border-t border-gray-100 text-center space-y-4">
          <div className="text-4xl mb-2">☕✨</div>
          <h3 className="text-xl font-bold text-gray-800">This is Coffeeware!</h3>
          <p className="text-sm text-gray-600">Built by <span className="font-bold text-orange-500">Chris P Tee</span> for AuDHD brains.<br/>Use it free, forever.</p>
          
          <div className="flex flex-col gap-3">
            <a href="https://buymeacoffee.com/chrispteemagician" target="_blank" rel="noreferrer" className="w-full bg-yellow-400 text-gray-900 py-3 rounded-xl font-bold shadow-sm hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2">
              <Coffee size={20} /> Buy Me a Coffee
            </a>
            <a href="https://www.tiktok.com/@chrispteemagician" target="_blank" rel="noreferrer" className="w-full bg-black text-white py-3 rounded-xl font-bold shadow-sm hover:bg-gray-800 transition-colors">
              📱 @chrispteemagician
            </a>
          </div>
          
          <div className="pt-4 border-t border-gray-100">
             <p className="text-xs text-gray-500">Support the <span className="font-bold text-purple-600">Community Comedy Magic Tour</span></p>
             <a href="https://comedymagic.co.uk" target="_blank" rel="noreferrer" className="text-xs font-bold text-gray-400 hover:text-gray-600 block mt-1">comedymagic.co.uk</a>
          </div>
        </div>

      </div>
    </div>
  );
}