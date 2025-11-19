import React, { useState } from 'react';
import { Camera, Copy, Check, Coffee, Sparkles, Trash2, Zap } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- CONFIGURATION ---
const GLOBAL_REGIONS = {
  'US': { currency: 'USD', symbol: '$' },
  'UK': { currency: 'GBP', symbol: '£' },
  'EU': { currency: 'EUR', symbol: '€' },
  'AU': { currency: 'AUD', symbol: 'A$' }
};

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
  const [isSpicy, setIsSpicy] = useState(false); // Default to normal
  const [copied, setCopied] = useState(null);

  const userRegion = detectUserRegion();
  const userCurrency = GLOBAL_REGIONS[userRegion];

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
      if (!apiKey) throw new Error("API Key missing.");

      const genAI = new GoogleGenerativeAI(apiKey);
      // ROBUST MODEL: gemini-pro (Stable, older, reliable)
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const base64Data = imagePreview.split(',')[1];
      const imagePart = {
        inlineData: { data: base64Data, mimeType: 'image/jpeg' }
      };

      const prompt = isSpicy 
        ? `You are a rude, funny British antique dealer. 
           Analyze this image. 
           1. Identify it.
           2. Roast it. Make a funny comment about why someone bought it.
           3. Give me a realistic eBay price range in ${userCurrency.currency} for ${userRegion}.
           4. Give me a title for the listing.
           
           Format your response as JSON:
           { "title": "...", "description": "...", "roast": "...", "price": "..." }`
        : `You are an expert eBay seller.
           Analyze this image.
           1. Create a SEO optimized title.
           2. Write a professional description.
           3. Estimate price in ${userCurrency.currency} for ${userRegion}.
           
           Format your response as JSON:
           { "title": "...", "description": "...", "roast": "", "price": "..." }`;

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      // Clean JSON
      const cleanText = text.replace(/```json|```/g, '').trim();
      setResults(JSON.parse(cleanText));

    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyText = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-orange-50 p-4 font-sans text-slate-800">
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-orange-100">
        
        {/* HEADER */}
        <div className="bg-orange-500 p-6 text-white text-center">
          <h1 className="text-3xl font-black">SpicyLister</h1>
          <p className="text-orange-100 font-bold">Sell your clutter without a stutter</p>
          
          <button 
            onClick={() => setIsSpicy(!isSpicy)}
            className={`mt-4 px-4 py-1 rounded-full text-xs font-bold flex items-center gap-2 mx-auto transition-colors ${isSpicy ? 'bg-yellow-400 text-red-900' : 'bg-white/20 text-white'}`}
          >
            <Zap size={14} /> {isSpicy ? "SPICY MODE ON 🔥" : "Enable Spicy Mode"}
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* UPLOAD */}
          {!image && (
            <label className="flex flex-col items-center justify-center h-64 border-4 border-dashed border-orange-200 rounded-2xl cursor-pointer hover:bg-orange-50">
              <Camera size={48} className="text-orange-400 mb-2" />
              <span className="font-bold text-gray-400">Tap to Snap</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          )}

          {/* PREVIEW */}
          {image && !results && (
            <div className="space-y-4">
              <div className="relative h-64 bg-black rounded-2xl overflow-hidden">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                <button onClick={() => {setImage(null); setResults(null);}} className="absolute top-2 right-2 bg-white p-2 rounded-full text-red-500">
                  <Trash2 size={20} />
                </button>
              </div>
              <button 
                onClick={analyzeItem} 
                disabled={loading}
                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
              >
                {loading ? "Analyzing..." : <><Sparkles size={20} /> Generate Listing</>}
              </button>
            </div>
          )}

          {/* RESULTS */}
          {results && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              {isSpicy && results.roast && (
                <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-r text-red-800 italic">
                  "{results.roast}"
                </div>
              )}
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Title</span>
                  <button onClick={() => copyText('title', results.title)} className="text-orange-500">
                    {copied === 'title' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="font-bold text-lg leading-tight">{results.title}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Description</span>
                  <button onClick={() => copyText('desc', results.description)} className="text-orange-500">
                    {copied === 'desc' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{results.description}</p>
              </div>

              <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-center">
                <p className="text-sm text-green-600 font-bold uppercase">Estimated Value</p>
                <p className="text-3xl font-black text-green-700">{results.price}</p>
              </div>

              <button onClick={() => {setImage(null); setResults(null);}} className="w-full text-gray-400 font-bold py-2">
                Scan Another
              </button>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-gray-50 p-6 text-center border-t border-gray-200">
          <h3 className="font-bold text-gray-700 mb-1">☕ This is Coffeeware</h3>
          <p className="text-xs text-gray-500 mb-4">Built by Chris P Tee for AuDHD brains.</p>
          
          <div className="space-y-2">
            <a href="https://buymeacoffee.com/chrispteemagician" target="_blank" rel="noreferrer" className="block w-full bg-yellow-400 py-3 rounded-xl font-bold text-sm hover:bg-yellow-500 transition-colors">
              Buy Me a Coffee
            </a>
            <a href="https://comedymagic.co.uk" target="_blank" rel="noreferrer" className="block text-xs text-gray-400 font-bold hover:text-orange-500">
              Support the Comedy Magic Tour
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
