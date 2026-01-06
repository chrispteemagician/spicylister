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
                href="https://buymeacoffee.com/chrisp
