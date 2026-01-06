import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Copy, Check, Coffee, Sparkles, Share2, Trash2, Flame, IceCream, 
  Info, Ruler, Package, Scale, Crown, Gift, Edit3, X, AlertCircle, ExternalLink
} from 'lucide-react';
import Confetti from 'react-confetti';

// =============================================================================
// STRIPE CHECKOUT LINKS
// =============================================================================

const STRIPE_LINKS = {
  earlyAdopter: 'https://buy.stripe.com/aFabJ1fJ10Vw6zT89NfrW00',
  regular: 'https://buy.stripe.com/8x29ATcwPdIi2jDahVfrW01',
  reseller: 'https://buy.stripe.com/7sY14n40j1ZA3nH3TxfrW02'
};

// =============================================================================
// CONFIGURATION
// =============================================================================

const RARITY_TIERS = {
  'Common': { color: 'border-gray-400', bg: 'bg-gray-50', text: 'text-gray-600', emoji: '🗑️' },
  'Uncommon': { color: 'border-green-400', bg: 'bg-green-50', text: 'text-green-600', emoji: '🍀' },
  'Rare': { color: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-600', emoji: '💎' },
  'Epic': { color: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-600', emoji: '🔮' },
  'Legendary': { color: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-600', emoji: '👑' },
  'God-Tier': { color: 'border-rose-500', bg: 'bg-rose-50', text: 'text-rose-600', emoji: '🔥' }
};

const SPICYLISTER_PACKAGING = {
  'large-letter': {
    dimensions: '24×16×3cm',
    maxDimensions: { length: 24, width: 16, height: 3 },
    maxWeight: 750,
    price: 0.85,
    name: 'Large Letter',
    icon: '📬',
    description: 'Perfect for flat items'
  },
  'small-parcel': {
    dimensions: '45×35×16cm',
    maxDimensions: { length: 45, width: 35, height: 16 },
    maxWeight: 2000,
    price: 1.20,
    name: 'Small Box',
    icon: '📦',
    description: 'Most popular size'
  },
  'medium-parcel': {
    dimensions: '61×46×46cm',
    maxDimensions: { length: 61, width: 46, height: 46 },
    maxWeight: 20000,
    price: 2.50,
    name: 'Medium Box',
    icon: '📦',
    description: 'For larger items'
  },
  'large-parcel': {
    dimensions: 'Custom',
    maxDimensions: { length: 999, width: 999, height: 999 },
    maxWeight: 30000,
    price: 4.00,
    name: 'Large Box',
    icon: '📦',
    description: 'Heavy duty protection'
  }
};

const SAVINGS_PER_LISTING = {
  time: 18, // minutes
  cost: 3.50 // pounds
};

const REWARD_SUGGESTIONS = [
  "☕ A nice brew and biscuit",
  "🎮 20 mins of guilt-free gaming",
  "🛋️ Feet up, telly on",
  "🍫 That fancy chocolate you've been eyeing",
  "📱 Scroll TikTok without shame",
  "🎵 One full album, no interruptions",
  "🌳 A proper walk outside",
  "💤 A cheeky power nap"
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const recommendPackaging = (dimensions, weight, fragility) => {
  if (!dimensions || !weight) return null;
  
  const { length, width, height } = dimensions;
  const maxDim = Math.max(length, width, height);
  const sumDims = length + width + height;
  
  // Add safety padding
  const padding = fragility === 'high' ? 5 : fragility === 'medium' ? 3 : 2;
  const adjustedLength = length + padding;
  const adjustedWidth = width + padding;
  const adjustedHeight = height + padding;
  
  // Large Letter (flat items)
  if (adjustedLength <= 24 && adjustedWidth <= 16 && adjustedHeight <= 3 && weight <= 750) {
    return {
      recommended: 'large-letter',
      details: SPICYLISTER_PACKAGING['large-letter'],
      alternatives: [],
      reasoning: 'Fits as large letter - cheapest option!'
    };
  }
  
  // Small Parcel
  if (adjustedLength <= 45 && adjustedWidth <= 35 && adjustedHeight <= 16 && weight <= 2000) {
    return {
      recommended: 'small-parcel',
      details: SPICYLISTER_PACKAGING['small-parcel'],
      alternatives: fragility === 'high' ? ['medium-parcel'] : [],
      reasoning: fragility === 'high' ? 'Recommended size with extra protection' : 'Perfect fit for this item'
    };
  }
  
  // Medium Parcel
  if (adjustedLength <= 61 && adjustedWidth <= 46 && adjustedHeight <= 46 && weight <= 20000) {
    return {
      recommended: 'medium-parcel',
      details: SPICYLISTER_PACKAGING['medium-parcel'],
      alternatives: [],
      reasoning: 'Best size for this item'
    };
  }
  
  // Large Parcel
  return {
    recommended: 'large-parcel',
    details: SPICYLISTER_PACKAGING['large-parcel'],
    alternatives: [],
    reasoning: 'Large item - needs custom box'
  };
};

const calculateSavings = (listingCount) => {
  const totalTime = listingCount * SAVINGS_PER_LISTING.time;
  const totalCost = listingCount * SAVINGS_PER_LISTING.cost;
  
  return {
    thisListing: { time: SAVINGS_PER_LISTING.time, cost: SAVINGS_PER_LISTING.cost },
    allTime: { time: totalTime, cost: totalCost }
  };
};

const checkMilestone = (count) => {
  const milestones = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
  if (milestones.includes(count)) {
    return {
      show: true,
      message: count === 1 ? "🎉 First listing done!" : `🎉 ${count} listing${count > 1 ? 's' : ''} created! You're crushing it!`,
      confetti: true
    };
  }
  return { show: false };
};

const formatTime = (minutes) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}hr ${mins}min` : `${hours}hr`;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function App() {
  // Core state
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [isSpicyMode, setIsSpicyMode] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);

  // Dimension editing
  const [editingDimensions, setEditingDimensions] = useState(false);
  const [editedDimensions, setEditedDimensions] = useState(null);
  const [dimensionWarning, setDimensionWarning] = useState(null);

  // Packaging
  const [packaging, setPackaging] = useState(null);
  const [hasOwnPackaging, setHasOwnPackaging] = useState(false);

  // Savings & rewards
  const [currentSavings, setCurrentSavings] = useState(null);
  const [currentReward, setCurrentReward] = useState(null);
  const [milestone, setMilestone] = useState(null);

  // Pro tier
  const [isPro, setIsPro] = useState(false);
  const [listingCount, setListingCount] = useState(() => {
    const saved = localStorage.getItem('spicylister_count');
    return saved ? parseInt(saved) : 0;
  });
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [earlyAdopterCount, setEarlyAdopterCount] = useState(347); // You're subscriber #347

  // Saved listings (localStorage)
  const [savedListings, setSavedListings] = useState(() => {
    const saved = localStorage.getItem('spicylister_listings');
    return saved ? JSON.parse(saved) : [];
  });

  const shareCardRef = useRef(null);

  // Check Pro status on mount
  useEffect(() => {
    const proStatus = localStorage.getItem('spicylister_pro');
    const proExpiry = localStorage.getItem('spicylister_pro_expiry');
    
    if (proStatus === 'true') {
      if (proExpiry) {
        const expiryDate = new Date(proExpiry);
        if (new Date() < expiryDate) {
          setIsPro(true);
        } else {
          // Expired
          localStorage.removeItem('spicylister_pro');
          localStorage.removeItem('spicylister_pro_expiry');
        }
      } else {
        // Permanent Pro (Early Adopter/Reseller)
        setIsPro(true);
      }
    }
    
    // Check URL for pro activation
    const params = new URLSearchParams(window.location.search);
    const proParam = params.get('pro');
    if (proParam) {
      activatePro(proParam);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const activatePro = (tier) => {
    localStorage.setItem('spicylister_pro', 'true');
    localStorage.setItem('spicylister_pro_tier', tier);
    
    if (tier === 'coffee') {
      // 7 days trial
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);
      localStorage.setItem('spicylister_pro_expiry', expiry.toISOString());
    }
    // early/regular/reseller = permanent (no expiry)
    
    setIsPro(true);
    setShowPricingModal(false);
    alert('🎉 Pro Activated! Welcome to SpicyLister Pro!');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image too large! Please use an image under 5MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        setImage(file);
        setImagePreview(reader.result);
        setResults(null);
        setPackaging(null);
        setEditingDimensions(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeItem = async () => {
    if (!image) return;

    setLoading(true);
    setResults(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];

        const response = await fetch('/.netlify/functions/analyze-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            spicyMode: isSpicyMode,
            proMode: isPro
          })
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        setResults(data);
        
        // Set initial dimensions
        if (data.dimensions) {
          setEditedDimensions(data.dimensions);
        }
        
        // Calculate packaging
        if (data.dimensions && data.weight) {
          const pkg = recommendPackaging(
            data.dimensions,
            data.weight.grams,
            data.fragility || 'medium'
          );
          setPackaging(pkg);
        }
        
        // Update listing count
        const newCount = listingCount + 1;
        setListingCount(newCount);
        localStorage.setItem('spicylister_count', newCount.toString());
        
        // Calculate savings
        const savings = calculateSavings(newCount);
        setCurrentSavings(savings);
        
        // Random reward
        const randomReward = REWARD_SUGGESTIONS[Math.floor(Math.random() * REWARD_SUGGESTIONS.length)];
        setCurrentReward(randomReward);
        
        // Check milestone
        const ms = checkMilestone(newCount);
        setMilestone(ms);
        if (ms.confetti) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
        }
        
        // Save to localStorage
        const listing = {
          id: Date.now(),
          date: new Date().toISOString(),
          title: data.title,
          description: data.description,
          price: data.priceLow,
          image: imagePreview
        };
        
        const updated = [listing, ...savedListings].slice(0, 50); // Keep last 50
        setSavedListings(updated);
        localStorage.setItem('spicylister_listings', JSON.stringify(updated));
        
      };
      reader.readAsDataURL(image);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Analysis failed! Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyText = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const copyAll = () => {
    if (!results) return;
    
    const allText = `
${results.title}

${results.description}

Price: £${results.priceLow} - £${results.priceHigh}
Category: ${results.category}
Condition: ${results.condition}

${editedDimensions ? `Dimensions: ${editedDimensions.length}×${editedDimensions.width}×${editedDimensions.height}cm` : ''}
${results.weight ? `Weight: ${results.weight.grams}g` : ''}
${packaging ? `Packaging: ${packaging.details.name}` : ''}

Created with SpicyLister - spicylister.com
    `.trim();
    
    navigator.clipboard.writeText(allText);
    setCopiedSection('all');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const openEbay = () => {
    if (!results) return;
    const searchQuery = encodeURIComponent(results.title);
    window.open(`https://www.ebay.co.uk/sch/i.html?_nkw=${searchQuery}`, '_blank');
  };

  const openVinted = () => {
    if (!results) return;
    // Vinted doesn't have direct search URLs, so just open the site
    window.open('https://www.vinted.co.uk/', '_blank');
    alert('💡 Tip: Copy your title and description, then paste them into Vinted!');
  };

  const generateShareImage = async () => {
    if (!shareCardRef.current) return;
    
    try {
      // Create canvas for 1080x1080 Instagram-ready image
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      
      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, 1080);
      gradient.addColorStop(0, '#fed7aa');
      gradient.addColorStop(1, '#fdba74');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 1080);
      
      // SpicyLister branding
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 80px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🌶️ SpicyLister', 540, 100);
      
      // Item photo
      if (imagePreview) {
        const img = new Image();
        img.src = imagePreview;
        await new Promise((resolve) => {
          img.onload = () => {
            const size = 400;
            const x = (1080 - size) / 2;
            const y = 150;
            ctx.drawImage(img, x, y, size, size);
            resolve();
          };
        });
      }
      
      // Title
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      const maxWidth = 900;
      const words = results.title.split(' ');
      let line = '';
      let y = 620;
      
      for (let word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line, 540, y);
          line = word + ' ';
          y += 60;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 540, y);
      
      // Price
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 64px Arial';
      ctx.fillText(`£${results.priceLow} - £${results.priceHigh}`, 540, y + 120);
      
      // Footer
      ctx.fillStyle = '#6b7280';
      ctx.font = '36px Arial';
      ctx.fillText('spicylister.com', 540, 1020);
      
      // Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'spicylister-share.png';
      link.href = dataUrl;
      link.click();
      
    } catch (error) {
      console.error('Share image error:', error);
      alert('Failed to generate share image. Please try again!');
    }
  };

  const updateDimensions = (field, value) => {
    const newDimensions = { ...editedDimensions, [field]: parseInt(value) || 0 };
    setEditedDimensions(newDimensions);
    
    // Check if significantly different from AI estimate
    if (results?.dimensions) {
      const original = results.dimensions;
      const diff = Math.abs(newDimensions[field] - original[field]);
      const percentDiff = (diff / original[field]) * 100;
      
      if (percentDiff > 50) {
        setDimensionWarning(`That's quite different from our estimate (${original[field]}cm). Are you sure?`);
      } else {
        setDimensionWarning(null);
      }
    }
    
    // Recalculate packaging
    if (results?.weight && results?.fragility) {
      const newPackaging = recommendPackaging(newDimensions, results.weight.grams, results.fragility);
      setPackaging(newPackaging);
    }
  };

  const saveDimensionEdits = () => {
    setEditingDimensions(false);
    setDimensionWarning(null);
  };

  const reset = () => {
    setImage(null);
    setImagePreview(null);
    setResults(null);
    setPackaging(null);
    setEditingDimensions(false);
    setHasOwnPackaging(false);
    setCurrentSavings(null);
    setCurrentReward(null);
    setMilestone(null);
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-yellow-50 font-sans p-4">
      {showConfetti && <Confetti numberOfPieces={250} recycle={false} />}

      {/* PRICING MODAL */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowPricingModal(false)}
              className="float-right text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            
            <div className="text-center mb-6">
              <h2 className="text-3xl font-black text-gray-800 mb-2">🌶️ SpicyLister Pro</h2>
              <p className="text-gray-600">Choose your level of support</p>
            </div>

            {/* FREE TIER */}
            <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-200 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-800">🆓 Free Forever</h3>
                <span className="text-2xl font-black text-gray-600">£0</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Perfect for getting started!</p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✅ Unlimited listings</li>
                <li>✅ AI-powered descriptions</li>
                <li>✅ Spicy & Vanilla modes</li>
                <li>✅ Dimensions & packaging advice</li>
                <li>✅ Savings calculator</li>
                <li>✅ eBay & Vinted share buttons</li>
              </ul>
              <p className="text-xs text-gray-500 mt-3">💚 This is genuinely free. Forever. No tricks.</p>
            </div>

            {/* COFFEEWARE */}
            <div className="bg-yellow-50 p-6 rounded-2xl border-2 border-yellow-300 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-800">☕ Buy Me a Coffee</h3>
                <span className="text-2xl font-black text-yellow-600">£3-5</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Try Pro for 7 days!</p>
              <ul className="space-y-2 text-sm text-gray-700 mb-4">
                <li>✅ Everything in Free</li>
                <li>✅ Batch upload (3 items at once)</li>
                <li>✅ Multi-photo support (3 photos per item)</li>
                <li>✅ 30-second video support</li>
                <li>✅ Priority processing</li>
                <li>✅ Pro features across ALL -Oid apps</li>
              </ul>
              <a 
                href="https://buymeacoffee.com/chrispteemagician"
                target="_blank"
                rel="noreferrer"
                className="block bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-3 px-6 rounded-xl text-center transition-colors"
              >
                Buy Me a Coffee → Get 7 Days Pro
              </a>
            </div>

            {/* EARLY ADOPTER */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-300 mb-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 transform rotate-12 translate-x-4 -translate-y-2">
                LIMITED!
              </div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-800">🎯 Early Adopter</h3>
                <div className="text-right">
                  <span className="text-2xl font-black text-purple-600">£4.95</span>
                  <span className="text-sm text-gray-600">/month</span>
                </div>
              </div>
              <p className="text-sm font-bold text-purple-700 mb-2">⚡ LOCKED PRICE FOREVER</p>
              <p className="text-sm text-gray-600 mb-3">First 1,000 subscribers only!</p>
              <ul className="space-y-2 text-sm text-gray-700 mb-4">
                <li>✅ Everything in Pro</li>
                <li>✅ Price stays £4.95 forever (even when others pay £9.95)</li>
                <li>✅ Pro access to ALL future -Oid apps</li>
                <li>✅ Priority support</li>
                <li>✅ Founders badge</li>
              </ul>
              <div className="bg-white p-3 rounded-xl mb-4">
                <p className="text-sm text-gray-600 text-center">
                  You'll be subscriber <strong>#{earlyAdopterCount}</strong>
                  <br />
                  <span className="text-xs">Only {1000 - earlyAdopterCount} spots left!</span>
                </p>
              </div>
              <a 
                href={STRIPE_LINKS.earlyAdopter}
                className="block bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-xl text-center transition-colors"
              >
                Lock In £4.95 Forever
              </a>
            </div>

            {/* REGULAR */}
            <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-200 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-800">💎 Regular Pro</h3>
                <div className="text-right">
                  <span className="text-2xl font-black text-blue-600">£9.95</span>
                  <span className="text-sm text-gray-600">/month</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">After Early Adopter slots fill</p>
              <ul className="space-y-2 text-sm text-gray-700 mb-4">
                <li>✅ Everything Early Adopters get</li>
                <li>✅ Pro across all apps</li>
                <li>✅ Cancel anytime</li>
              </ul>
              <a 
                href={STRIPE_LINKS.regular}
                className="block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl text-center transition-colors"
              >
                Get Pro Access
              </a>
            </div>

            {/* RESELLER */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-800">🏪 Reseller</h3>
                <div className="text-right">
                  <span className="text-2xl font-black text-green-600">£49.95</span>
                  <span className="text-sm text-gray-600">/month</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">For professional sellers</p>
              <ul className="space-y-2 text-sm text-gray-700 mb-4">
                <li>✅ Everything in Pro</li>
                <li>✅ Own storefront on SpicyLister Store</li>
                <li>✅ Zero commission selling</li>
                <li>✅ Bulk upload tools</li>
                <li>✅ API access</li>
                <li>✅ Priority support</li>
              </ul>
              <a 
                href={STRIPE_LINKS.reseller}
                className="block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl text-center transition-colors"
              >
                Get Reseller Access
              </a>
            </div>

            <p className="text-xs text-gray-500 text-center mt-6">
              💚 All subscriptions support Chris P Tee's work and help bring AI tools to the neurodivergent community
            </p>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        
        {/* HEADER */}
        <div className="text-center mb-8 pt-4">
          <div className="flex justify-center mb-4">
            <div className="text-6xl">🌶️</div>
          </div>
          
          <h1 className="text-5xl font-bold mb-2 text-orange-600">
            SpicyLister
          </h1>
          <p className="text-xl font-medium text-gray-700 mb-4">
            Sell your clutter without a stutter
          </p>

          {isPro && (
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-full border border-purple-300 mb-4">
              <Crown className="text-purple-600" size={20} />
              <span className="text-sm font-bold text-purple-700">Pro Active</span>
            </div>
          )}
          
          {/* TOGGLE */}
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
            <p className="text-sm text-gray-600 mt-4 max-w-md mx-auto">
              🔥 SPICY mode adds humor and personality to your listings
            </p>
          ) : (
            <p className="text-sm text-gray-600 mt-4 max-w-md mx-auto">
              Professional, straightforward descriptions perfect for serious selling
            </p>
          )}
        </div>

        {/* UPLOAD SECTION */}
        {!imagePreview && (
          <div className="bg-white p-8 rounded-3xl shadow-lg border-2 border-dashed border-orange-300 text-center mb-6">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Camera className="mx-auto mb-4 text-orange-500" size={64} />
              <p className="text-xl font-bold text-gray-800 mb-2">Snap a pic of your item</p>
              <p className="text-sm text-gray-600 mb-4">We'll do the rest 🌶️</p>
              <div className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl inline-block transition-colors">
                Upload Photo
              </div>
            </label>
            <p className="text-xs text-gray-500 mt-4">Max 5MB • JPG, PNG, WebP</p>
          </div>
        )}

        {/* PREVIEW & ANALYZE */}
        {imagePreview && !results && (
          <div className="bg-white p-6 rounded-3xl shadow-lg mb-6">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="w-full h-64 object-cover rounded-2xl mb-4"
            />
            <button
              onClick={analyzeItem}
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Analyzing your treasure...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Listing
                </>
              )}
            </button>
            <button
              onClick={reset}
              className="w-full mt-3 text-gray-600 hover:text-gray-800 py-2 font-medium text-sm"
            >
              Choose Different Photo
            </button>
          </div>
        )}

        {/* RESULTS */}
        {results && (
          <div ref={shareCardRef} className="space-y-4">
            
            {/* Milestone */}
            {milestone?.show && (
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-2xl border-2 border-purple-300 text-center">
                <p className="text-2xl font-black text-purple-700">{milestone.message}</p>
              </div>
            )}

            {/* Savings */}
            {currentSavings && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="text-green-600" size={20} />
                  <span className="text-xs font-bold uppercase text-green-600">You've Saved</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-black text-green-600">{formatTime(currentSavings.allTime.time)}</p>
                    <p className="text-xs text-gray-600">Time Saved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-green-600">£{currentSavings.allTime.cost.toFixed(2)}</p>
                    <p className="text-xs text-gray-600">Money Saved</p>
                  </div>
                </div>
                {currentReward && (
                  <p className="text-sm text-gray-700 text-center mt-3 bg-white p-2 rounded-lg">
                    You've earned: <strong>{currentReward}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Rarity */}
            {results.rarity && (
              <div className={`${RARITY_TIERS[results.rarity]?.bg || 'bg-gray-50'} p-6 rounded-2xl border-2 ${RARITY_TIERS[results.rarity]?.color || 'border-gray-200'}`}>
                <div className="text-center">
                  <div className="text-5xl mb-2">{RARITY_TIERS[results.rarity]?.emoji}</div>
                  <p className={`text-2xl font-black ${RARITY_TIERS[results.rarity]?.text || 'text-gray-600'}`}>
                    {results.rarity}
                  </p>
                  {results.spicyComment && (
                    <p className="text-sm text-gray-700 mt-2 italic">{results.spicyComment}</p>
                  )}
                </div>
              </div>
            )}

            {/* Title */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-gray-500">Title</span>
                <button
                  onClick={() => copyText('title', results.title)}
                  className="text-orange-500 hover:text-orange-600"
                >
                  {copiedSection === 'title' ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <p className="text-gray-800 font-semibold">{results.title}</p>
            </div>

            {/* Description */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-gray-500">Description</span>
                <button
                  onClick={() => copyText('description', results.description)}
                  className="text-orange-500 hover:text-orange-600"
                >
                  {copiedSection === 'description' ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{results.description}</p>
            </div>

            {/* Price & Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200">
                <p className="text-xs font-bold uppercase text-gray-500 mb-2">Price Range</p>
                <p className="text-2xl font-black text-green-600">£{results.priceLow} - £{results.priceHigh}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200">
                <p className="text-xs font-bold uppercase text-gray-500 mb-2">Category</p>
                <p className="text-lg font-bold text-gray-800">{results.category}</p>
              </div>
            </div>

            {/* Dimensions */}
            {editedDimensions && (
              <div className="bg-orange-50 p-5 rounded-2xl border border-orange-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Ruler className="text-orange-600" size={20} />
                    <span className="text-xs font-bold uppercase text-orange-600">Dimensions</span>
                  </div>
                  {!editingDimensions && (
                    <button
                      onClick={() => setEditingDimensions(true)}
                      className="text-orange-500 hover:text-orange-600"
                    >
                      <Edit3 size={18} />
                    </button>
                  )}
                </div>
                
                {!editingDimensions ? (
                  <div className="bg-white p-4 rounded-xl">
                    <p className="text-2xl font-black text-gray-800">
                      {editedDimensions.length} × {editedDimensions.width} × {editedDimensions.height} cm
                    </p>
                    {results.dimensions?.confidence && (
                      <p className="text-xs text-gray-500 mt-1">Confidence: {results.dimensions.confidence}%</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-600">Length (cm)</label>
                        <input
                          type="number"
                          value={editedDimensions.length}
                          onChange={(e) => updateDimensions('length', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Width (cm)</label>
                        <input
                          type="number"
                          value={editedDimensions.width}
                          onChange={(e) => updateDimensions('width', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Height (cm)</label>
                        <input
                          type="number"
                          value={editedDimensions.height}
                          onChange={(e) => updateDimensions('height', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    
                    {dimensionWarning && (
                      <div className="bg-yellow-50 p-3 rounded-lg flex items-start gap-2">
                        <AlertCircle className="text-yellow-600 flex-shrink-0" size={18} />
                        <p className="text-xs text-yellow-800">{dimensionWarning}</p>
                      </div>
                    )}
                    
                    <button
                      onClick={saveDimensionEdits}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-bold text-sm"
                    >
                      Save Dimensions
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Weight */}
            {results.weight && (
              <div className="bg-white p-5 rounded-2xl border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="text-gray-600" size={20} />
                  <span className="text-xs font-bold uppercase text-gray-500">Weight</span>
                </div>
                <p className="text-xl font-bold text-gray-800">~{results.weight.grams}g</p>
                {results.weight.confidence && (
                  <p className="text-xs text-gray-500 mt-1">Confidence: {results.weight.confidence}%</p>
                )}
              </div>
            )}

            {/* Packaging */}
            {packaging && !hasOwnPackaging && (
              <div className="bg-orange-50 p-5 rounded-2xl border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="text-orange-600" size={20} />
                  <span className="text-xs font-bold uppercase text-orange-600">Recommended Packaging</span>
                </div>
                
                <div className="bg-white p-4 rounded-xl border-2 border-orange-300 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{packaging.details.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{packaging.details.name}</p>
                      <p className="text-sm text-gray-600">{packaging.details.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {packaging.details.dimensions}, up to {packaging.details.maxWeight >= 1000 ? `${packaging.details.maxWeight/1000}kg` : `${packaging.details.maxWeight}g`}
                      </p>
                    </div>
                    <p className="text-xl font-black text-green-600">£{packaging.details.price.toFixed(2)}</p>
                  </div>
                </div>
                
                <p className="text-xs text-gray-600 mb-3">💡 {packaging.reasoning}</p>
                
                <button
                  onClick={() => setHasOwnPackaging(true)}
                  className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-semibold text-sm"
                >
                  I Have My Own Packaging
                </button>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={openEbay}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} />
                Search eBay
              </button>
              
              <button
                onClick={openVinted}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} />
                Open Vinted
              </button>
              
              <button
                onClick={copyAll}
                className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {copiedSection === 'all' ? <Check size={18} /> : <Copy size={18} />}
                Copy All
              </button>
              
              <button
                onClick={generateShareImage}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={18} />
                Share
              </button>
            </div>

            <button
              onClick={reset}
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Camera size={20} />
              Scan Another Item
            </button>

            {/* Pro CTA */}
            {!isPro && listingCount >= 3 && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-300 text-center">
                <Crown className="mx-auto text-purple-600 mb-3" size={48} />
                <h3 className="text-xl font-black text-gray-800 mb-2">You're on fire! 🔥</h3>
                <p className="text-sm text-gray-700 mb-4">
                  You've created {listingCount} listings! Upgrade to Pro for batch uploads, multi-photo support, and more!
                </p>
                <button
                  onClick={() => setShowPricingModal(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                  View Pro Plans
                </button>
              </div>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-12 text-center space-y-6 pb-12">
          <div className="inline-block bg-white px-6 py-4 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 flex items-center justify-center gap-2">
              <Coffee className="text-yellow-500" /> This is Coffeeware
            </h3>
            <p className="text-sm text-gray-500 mt-1 mb-3">Free forever. Support if it helps you.</p>
            <button
              onClick={() => setShowPricingModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-2 px-6 rounded-xl transition-all"
            >
              View Plans
            </button>
          </div>

          <div className="flex flex-col items-center gap-2 text-sm text-gray-400">
            <a href="https://comedymagic.co.uk" target="_blank" rel="noreferrer" className="hover:text-purple-500 transition-colors">
              Support the <strong>Community Comedy Magic Tour</strong>
            </a>
            <a href="https://www.tiktok.com/@chrispteemagician" target="_blank" rel="noreferrer" className="hover:text-black transition-colors">
              Find me on TikTok
            </a>
            <p className="text-xs opacity-50 mt-4">SpicyLister • Powered by Gemini Flash • Made with 💚 by Chris P Tee</p>
          </div>
        </div>

      </div>
    </div>
  );
}
