import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, Copy, Check, Coffee, Sparkles, Share2, Trash2, Flame, IceCream,
  Info, ExternalLink, Ruler, Package, Scale, Crown, Gift, Edit3, X, AlertCircle
} from 'lucide-react';
import { toPng } from 'html-to-image';
import Confetti from 'react-confetti';

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

const GLOBAL_REGIONS = {
  'US': { currency: 'USD', symbol: '$' },
  'UK': { currency: 'GBP', symbol: '£' },
  'DE': { currency: 'EUR', symbol: '€' },
  'AU': { currency: 'AUD', symbol: 'A$' },
  'CA': { currency: 'CAD', symbol: 'C$' },
  'EU': { currency: 'EUR', symbol: '€' }
};

// ✨ NEW: SpicyLister Branded Packaging Sizes
const SPICYLISTER_PACKAGING = {
  'large-letter': {
    dimensions: '24×16×3cm',
    maxDimensions: { length: 24, width: 16, height: 3 },
    maxWeight: 750,
    price: 0.85,
    name: 'SpicyLister Large Letter',
    icon: '📬',
    description: 'Perfect for flat items'
  },
  'small-parcel': {
    dimensions: '45×35×16cm',
    maxDimensions: { length: 45, width: 35, height: 16 },
    maxWeight: 2000,
    price: 1.20,
    name: 'SpicyLister Small Box',
    icon: '📦',
    description: 'Most popular size'
  },
  'medium-parcel': {
    dimensions: '61×46×46cm',
    maxDimensions: { length: 61, width: 46, height: 46 },
    maxWeight: 20000,
    price: 2.50,
    name: 'SpicyLister Medium Box',
    icon: '📦',
    description: 'For larger items'
  },
  'large-parcel': {
    dimensions: 'Custom',
    maxDimensions: { length: 999, width: 999, height: 999 },
    maxWeight: 30000,
    price: 4.00,
    name: 'SpicyLister Large Box',
    icon: '📦',
    description: 'Heavy duty protection'
  }
};

// ✨ NEW: Savings Calculator Constants
const SAVINGS_PER_LISTING = {
  time: 18, // minutes saved vs manual listing
  cost: 3.50 // pounds saved vs listing service
};

// BULK PROCESSING: Fun waiting messages (rotate during processing)
const WAITING_MESSAGES = [
  // Dad jokes
  { type: 'joke', text: "Why did the eBay seller go to therapy? Too many unresolved listings." },
  { type: 'joke', text: "What do you call a fake noodle? An impasta. (Like fake designer gear on eBay)" },
  { type: 'joke', text: "I told my wife I was going to sell everything... She said 'List me first, I'm vintage.'" },
  { type: 'joke', text: "Why don't scientists trust atoms? Because they make up everything. Like 'mint condition' sellers." },
  { type: 'joke', text: "What's the difference between a photo of your item and your ex? Your item actually has value." },
  { type: 'joke', text: "I've got a great joke about postage... but it'll cost you £3.99 delivery." },
  { type: 'joke', text: "My decluttering is going great. I've sold 3 things and bought 7 on eBay." },
  { type: 'joke', text: "What did one listing say to the other? 'You're a steal at that price!'" },
  // QI-style facts
  { type: 'fact', text: "The most expensive item ever sold on eBay was a yacht for $168 million in 2006." },
  { type: 'fact', text: "eBay was originally called AuctionWeb and the first item sold was a broken laser pointer for $14.83." },
  { type: 'fact', text: "There are approximately 1.7 billion listings on eBay at any given time." },
  { type: 'fact', text: "The word 'vintage' technically means between 20-100 years old. Everything else is just 'used'." },
  { type: 'fact', text: "Royal Mail delivers to 31 million addresses in the UK. Yours is about to get busier." },
  { type: 'fact', text: "The average UK household has over £1,000 worth of unused items. You're sitting on gold." },
  { type: 'fact', text: "eBay's 'Buy It Now' feature wasn't added until 2000 - three years after launch." },
  { type: 'fact', text: "The most watched eBay category in the UK? Electronics. The most fun? Collectibles." },
  { type: 'fact', text: "A 2023 study found decluttering reduces cortisol (stress hormone) by up to 25%." },
  { type: 'fact', text: "In Japan, there's a word 'tsundoku' - buying books and letting them pile up unread. Sound familiar?" },
  // Top tips
  { type: 'tip', text: "Top tip: End your auctions on Sunday evenings - that's when most eBay buyers are browsing." },
  { type: 'tip', text: "Top tip: Include measurements in your listings. Returns drop by 50% when buyers know the size." },
  { type: 'tip', text: "Top tip: Clean your items before photographing. A quick wipe adds perceived value." },
  { type: 'tip', text: "Top tip: Natural daylight makes the best product photos. No flash needed." },
  { type: 'tip', text: "Top tip: Start auctions at 99p for maximum watchers. Trust the market." },
  { type: 'tip', text: "Top tip: Bundle similar items together. '5 books for £12' sells faster than 5 separate listings." },
  { type: 'tip', text: "Top tip: Mention brand names in your title. Buyers search for brands, not descriptions." },
  { type: 'tip', text: "Top tip: Ship within 24 hours for top-rated seller status. Speed = good reviews." },
  { type: 'tip', text: "Top tip: Reuse packaging from your own deliveries. Free, eco-friendly, and it works." },
  { type: 'tip', text: "Top tip: Take photos on a white background. Even a bedsheet works." },
  // Encouragement
  { type: 'hype', text: "You're literally making money while sitting down. This is the dream." },
  { type: 'hype', text: "Every item you list is space reclaimed and money earned. Double win." },
  { type: 'hype', text: "Somewhere out there, someone is searching for exactly what you're selling right now." },
  { type: 'hype', text: "You've got this. The hardest part was taking the photos. AI's got the rest." },
  { type: 'hype', text: "Fun fact: You're faster than 99% of eBay sellers right now. They're still writing titles." },
  { type: 'hype', text: "Your clutter is someone else's treasure. And you're about to find out how much treasure." },
  { type: 'hype', text: "Remember: done is better than perfect. A listed item sells. An unlisted one doesn't." },
  { type: 'hype', text: "This is the bit where normal people give up. But you? You've got SpicyLister." },
];

const getWaitingMessage = () => {
  return WAITING_MESSAGES[Math.floor(Math.random() * WAITING_MESSAGES.length)];
};

const MESSAGE_TYPE_EMOJI = {
  joke: '😂',
  fact: '🧠',
  tip: '💡',
  hype: '🔥'
};

// ✨ NEW: Reward Suggestions (dopamine boosters!)
const REWARDS = [
  '☕ A nice brew and biscuit',
  '🚶 A 20-minute walk in fresh air',
  '📖 A chapter of your book',
  '🎮 A quick gaming session',
  '🛀 A relaxing bath',
  '📱 Catch up on TikTok',
  '🎵 Listen to your favorite album',
  '🌳 Sit in nature for 15 minutes',
  '🧘 A short meditation break',
  '🎨 Doodle or color for fun',
  '☀️ Ten minutes in the sunshine',
  '💬 Text a friend you\'ve been meaning to reach',
  '🐕 Extra playtime with your pet',
  '🍫 Treat yourself to something nice'
];

// ✨ NEW: Kudos Actions (for future FeelFamous integration)
const KUDOS_ACTIONS = {
  listing_created: { kudos: 5, coins: 2 },
  item_sold: { kudos: 10, coins: 5 },
  helped_user: { kudos: 15, coins: 5 },
  shared_tip: { kudos: 5, coins: 0 }
};

// ✨ Pro Tier Configuration - Early Adopter Pricing
const TIER_LIMITS = {
  free: {
    listingsPerMonth: 5,
    features: ['Single photo', 'Basic AI', 'Packaging recommendations']
  },
  pro: {
    price: 4.95,
    regularPrice: 9.90,
    listingsPerMonth: 200,
    founderSlots: 1000,
    stripeLink: 'https://buy.stripe.com/aFabJ1fJ10Vw6zT89NfrW00',
    features: [
      'Video assessment',
      'Batch processing (10+ items)',
      'Advanced material analysis',
      'Market trend insights',
      'Priority support'
    ]
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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

// ✨ NEW: Category Mapping for Store Integration
const CATEGORY_MAP = {
  'Electronics': 'Electronics',
  'Electronics > Phones': 'Electronics',
  'Fashion': 'Fashion',
  'Fashion > Clothing': 'Fashion',
  'Home': 'Home & Garden',
  'Books': 'Books, Comics & Magazines',
  'Collectibles': 'Collectibles',
  'Collectables': 'Collectibles',
  'Art': 'Art',
  'Toys': 'Toys & Games',
  'Sports': 'Sports & Outdoors',
  'Antiques': 'Antiques'
};

const mapCategory = (category) => {
  if (!category) return 'Other';
  if (CATEGORY_MAP[category]) return CATEGORY_MAP[category];
  const mainCategory = category.split('>')[0].trim();
  if (CATEGORY_MAP[mainCategory]) return CATEGORY_MAP[mainCategory];
  // Fuzzy match
  const lowerCat = category.toLowerCase();
  if (lowerCat.includes('electronic') || lowerCat.includes('phone') || lowerCat.includes('computer')) return 'Electronics';
  if (lowerCat.includes('fashion') || lowerCat.includes('cloth') || lowerCat.includes('shoe')) return 'Fashion';
  if (lowerCat.includes('book') || lowerCat.includes('comic') || lowerCat.includes('magazine')) return 'Books, Comics & Magazines';
  if (lowerCat.includes('collect')) return 'Collectibles';
  if (lowerCat.includes('toy') || lowerCat.includes('game')) return 'Toys & Games';
  if (lowerCat.includes('home') || lowerCat.includes('garden') || lowerCat.includes('kitchen')) return 'Home & Garden';
  return 'Other';
};

// ✨ NEW: Condition Mapping for Store Integration
const CONDITION_MAP = {
  'New with tags': 'new',
  'New': 'new',
  'Like new': 'like-new',
  'Excellent condition': 'excellent',
  'Excellent': 'excellent',
  'Very good condition': 'excellent',
  'Good condition': 'good',
  'Good': 'good',
  'Fair condition': 'fair',
  'Fair': 'fair',
  'Used': 'good'
};

const mapCondition = (condition) => {
  if (!condition) return 'good';
  if (CONDITION_MAP[condition]) return CONDITION_MAP[condition];
  const lowerCond = condition.toLowerCase();
  if (lowerCond.includes('new')) return 'new';
  if (lowerCond.includes('excellent') || lowerCond.includes('like new') || lowerCond.includes('mint')) return 'excellent';
  if (lowerCond.includes('good') || lowerCond.includes('very good')) return 'good';
  if (lowerCond.includes('fair') || lowerCond.includes('acceptable')) return 'fair';
  return 'good';
};

// ✨ NEW: Smart Packaging Recommendation
const recommendPackaging = (dimensions, weight, fragility) => {
  if (!dimensions || !weight) {
    return {
      recommended: 'small-parcel',
      details: SPICYLISTER_PACKAGING['small-parcel'],
      reasoning: 'Default recommendation - dimensions not available',
      alternatives: [SPICYLISTER_PACKAGING['medium-parcel']]
    };
  }

  const { length, width, height } = dimensions;
  const weightGrams = weight.grams || weight;

  // Add safety padding (3cm)
  const paddedLength = length + 3;
  const paddedWidth = width + 3;
  const paddedHeight = height + 3;

  // Determine smallest fitting package
  let recommended = 'large-parcel';
  let reasoning = 'Fits safely with protective padding';

  const packagingOrder = ['large-letter', 'small-parcel', 'medium-parcel', 'large-parcel'];

  for (const size of packagingOrder) {
    const pkg = SPICYLISTER_PACKAGING[size];
    const max = pkg.maxDimensions;
    
    if (paddedLength <= max.length && paddedWidth <= max.width && paddedHeight <= max.height && weightGrams <= pkg.maxWeight) {
      recommended = size;
      break;
    }
  }

  // If high fragility, go up one size for extra protection
  if (fragility === 'high') {
    const currentIndex = packagingOrder.indexOf(recommended);
    if (currentIndex < packagingOrder.length - 1 && recommended !== 'large-parcel') {
      recommended = packagingOrder[currentIndex + 1];
      reasoning = 'Upsized for fragile item protection';
    }
  }

  // Build alternatives list
  const currentIndex = packagingOrder.indexOf(recommended);
  const alternatives = [];
  if (currentIndex < packagingOrder.length - 1) {
    alternatives.push(SPICYLISTER_PACKAGING[packagingOrder[currentIndex + 1]]);
  }

  return {
    recommended,
    details: SPICYLISTER_PACKAGING[recommended],
    reasoning,
    alternatives
  };
};

// ✨ NEW: Savings Calculator
const calculateSavings = () => {
  const saved = JSON.parse(localStorage.getItem('spicylister_savings') || '{"count": 0, "time": 0, "cost": 0}');
  saved.count += 1;
  saved.time += SAVINGS_PER_LISTING.time;
  saved.cost += SAVINGS_PER_LISTING.cost;
  localStorage.setItem('spicylister_savings', JSON.stringify(saved));
  return saved;
};

const getCumulativeSavings = () => {
  return JSON.parse(localStorage.getItem('spicylister_savings') || '{"count": 0, "time": 0, "cost": 0}');
};

// ✨ NEW: Random Reward Suggestion
const getRandomReward = () => {
  return REWARDS[Math.floor(Math.random() * REWARDS.length)];
};

// ✨ NEW: Milestone Checker
const checkMilestones = (count) => {
  const milestones = [1, 5, 10, 25, 50, 100];
  if (milestones.includes(count)) {
    return {
      show: true,
      message: `🎊 ${count} listing${count > 1 ? 's' : ''} created! You're crushing it!`,
      confetti: true
    };
  }
  return { show: false };
};

// ✨ NEW: Kudos Award Function (local-only for now, FeelFamous integration coming soon)
const awardKudos = async (action, setShowKudosNotification) => {
  // Local kudos celebration (FeelFamous integration coming in future update)
  const { kudos, coins } = KUDOS_ACTIONS[action] || { kudos: 5, coins: 2 };
  setShowKudosNotification({ kudos, coins });
  setTimeout(() => setShowKudosNotification(null), 3000);
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function App() {
  // Existing state
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [isSpicyMode, setIsSpicyMode] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);
  const [copiedStore, setCopiedStore] = useState(false);

  // ✨ NEW: Dimension editing state
  const [editingDimensions, setEditingDimensions] = useState(false);
  const [editedDimensions, setEditedDimensions] = useState(null);
  const [dimensionWarning, setDimensionWarning] = useState(null);

  // ✨ NEW: Packaging state
  const [packaging, setPackaging] = useState(null);
  const [hasOwnPackaging, setHasOwnPackaging] = useState(false);

  // ✨ NEW: Savings & Rewards state
  const [currentSavings, setCurrentSavings] = useState(null);
  const [currentReward, setCurrentReward] = useState(null);
  const [milestone, setMilestone] = useState(null);

  // ✨ NEW: Pro tier state
  const [isPro, setIsPro] = useState(false);
  const [listingCount, setListingCount] = useState(() => {
    const saved = localStorage.getItem('spicylister_count');
    return saved ? parseInt(saved) : 0;
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // ✨ NEW: Kudos notification state
  const [showKudosNotification, setShowKudosNotification] = useState(null);

  // ✨ NEW: Global counter state
  const [globalCount, setGlobalCount] = useState(null);

  // BULK MODE state
  const [items, setItems] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [bulkContext, setBulkContext] = useState('');
  const [waitingMessage, setWaitingMessage] = useState(null);

  const resultCardRef = useRef(null);
  const userRegion = detectUserRegion();
  const userCurrency = GLOBAL_REGIONS[userRegion];

  // Load cumulative savings on mount
  useEffect(() => {
    const saved = getCumulativeSavings();
    if (saved.count > 0) {
      setCurrentSavings(saved);
    }
  }, []);

  // ✨ NEW: Fetch global counter on mount
  useEffect(() => {
    const fetchGlobalCount = async () => {
      try {
        const response = await fetch('/.netlify/functions/counter');
        const data = await response.json();
        setGlobalCount(data.count);
      } catch (err) {
        console.log('Could not fetch global count:', err);
        setGlobalCount(null);
      }
    };
    fetchGlobalCount();
  }, []);

  // Oracle import: detect #oracle= in URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#oracle=')) return;
    try {
      const encoded = hash.slice(8); // remove '#oracle='
      const json = decodeURIComponent(escape(atob(encoded)));
      const oracle = JSON.parse(json);
      if (oracle.source !== 'oracle') return;

      // Parse price range like "£50-£100" or "£50 - £100"
      let priceLow = 0, priceHigh = 0;
      if (oracle.priceRange) {
        const prices = oracle.priceRange.match(/[\d,.]+/g);
        if (prices && prices.length >= 2) {
          priceLow = parseFloat(prices[0].replace(',', ''));
          priceHigh = parseFloat(prices[1].replace(',', ''));
        } else if (prices && prices.length === 1) {
          priceLow = parseFloat(prices[0].replace(',', ''));
          priceHigh = priceLow;
        }
      }

      // Map Oracle condition to SpicyLister format
      const conditionMap = { 'mint': 'New', 'excellent': 'Excellent', 'very good': 'Very good', 'good': 'Good', 'fair': 'Fair', 'poor': 'Fair' };
      const rawCondition = (oracle.condition || '').toLowerCase();
      const condition = conditionMap[rawCondition] || oracle.condition || 'Good';

      // Build SpicyLister results object from Oracle data
      const oracleResults = {
        title: oracle.itemName || oracle.title || 'Oracle Import',
        description: oracle.description || '',
        condition: condition,
        category: 'Collectables & Art',
        rarity: oracle.rarity || 'Uncommon',
        spicyComment: oracle.era ? `${oracle.era}${oracle.manufacturer ? ' by ' + oracle.manufacturer : ''} — identified by the Magic-Oid Oracle` : 'Identified by the Magic-Oid Oracle',
        priceLow: priceLow,
        priceHigh: priceHigh,
        dimensions: null,
        weight: null,
        material: null,
        fragility: 'medium',
        recommendedPackaging: null
      };

      // Create a pre-filled item
      const oracleItem = {
        id: Date.now() + Math.random(),
        file: null,
        preview: null,
        status: 'done',
        results: oracleResults,
        packaging: null,
        error: null,
        oracleImport: true
      };

      setItems([oracleItem]);
      setShowGrid(true);

      // Clear the hash
      window.history.replaceState(null, '', window.location.pathname);
    } catch (e) {
      console.log('Oracle import failed:', e);
    }
  }, []);

  const getRarityStyle = (tier) => {
    return RARITY_TIERS[tier] || RARITY_TIERS['Common'];
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Single file: existing flow
    if (files.length === 1) {
      const file = files[0];
      if (!file.type.startsWith('image/')) return;
      setImage(file);
      const compressed = await compressImage(file);
      setImagePreview(compressed);
      setResults(null);
      setShowConfetti(false);
      setPackaging(null);
      setCurrentSavings(null);
      setCurrentReward(null);
      setMilestone(null);
      setEditingDimensions(false);
      setEditedDimensions(null);
      setHasOwnPackaging(false);
      setItems([]);
      setShowGrid(false);
      return;
    }

    // Multiple files: bulk mode
    const newItems = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const compressed = await compressImage(file);
      newItems.push({
        id: Date.now() + Math.random(),
        file,
        preview: compressed,
        status: 'pending',
        results: null,
        packaging: null,
        error: null
      });
    }
    setItems(newItems);
    setShowGrid(true);
    setImage(null);
    setImagePreview(null);
    setResults(null);
    setShowConfetti(false);
  };

  const resetApp = () => {
    setImage(null);
    setImagePreview(null);
    setResults(null);
    setShowConfetti(false);
    setPackaging(null);
    setCurrentSavings(null);
    setCurrentReward(null);
    setMilestone(null);
    setEditingDimensions(false);
    setEditedDimensions(null);
    setHasOwnPackaging(false);
    setDimensionWarning(null);
    setItems([]);
    setShowGrid(false);
    setBulkProcessing(false);
    setProcessProgress({ current: 0, total: 0 });
    setBulkContext('');
    setWaitingMessage(null);
  };

  const analyzeItem = async () => {
    if (!image) return;
    setLoading(true);

    try {
      // Get base64 data from the compressed image preview
      const base64Data = imagePreview.split(',')[1];

      // Call the serverless function (API key is kept server-side for security)
      const response = await fetch('/.netlify/functions/analyze-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: [{
            mimeType: 'image/jpeg',
            data: base64Data
          }],
          isSpicyMode: isSpicyMode,
          region: userRegion
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const data = await response.json();

      // Ensure all required fields exist with defaults
      data.priceLow = Number(data.priceLow) || 0;
      data.priceHigh = Number(data.priceHigh) || 0;

      if (!data.dimensions) {
        data.dimensions = { length: 15, width: 10, height: 5, confidence: 50 };
      }
      if (!data.weight) {
        data.weight = { grams: 200, confidence: 50 };
      }
      if (!data.fragility) {
        data.fragility = 'medium';
      }
      if (!data.material) {
        data.material = 'Mixed materials';
      }
      if (!data.condition) {
        data.condition = 'Good condition';
      }

      setResults(data);
      setEditedDimensions(data.dimensions);

      // ✨ NEW: Calculate packaging recommendation
      const packagingRec = recommendPackaging(data.dimensions, data.weight, data.fragility);
      setPackaging(packagingRec);

      // ✨ NEW: Calculate and display savings
      const savings = calculateSavings();
      setCurrentSavings(savings);
      setCurrentReward(getRandomReward());

      // ✨ NEW: Increment listing count and check for milestones
      const newCount = listingCount + 1;
      setListingCount(newCount);
      localStorage.setItem('spicylister_count', newCount.toString());
      
      const milestoneCheck = checkMilestones(newCount);
      if (milestoneCheck.show) {
        setMilestone(milestoneCheck);
      }

      // ✨ NEW: Award kudos
      await awardKudos('listing_created', setShowKudosNotification);

      // ✨ NEW: Increment global counter
      try {
        const response = await fetch('/.netlify/functions/counter', { method: 'POST' });
        const data = await response.json();
        setGlobalCount(data.count);
      } catch (err) {
        console.log('Could not increment global count:', err);
      }

      // Confetti for high-value or rare items
      if (isSpicyMode && (data.priceHigh > 50 || ['Rare', 'Legendary', 'God-Tier', 'Epic'].includes(data.rarity))) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }

      // Also confetti for milestones
      if (milestoneCheck.confetti) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }

      // ✨ NEW: Check if free tier limit reached
      if (!isPro && newCount >= TIER_LIMITS.free.listingsPerMonth) {
        setTimeout(() => setShowUpgradeModal(true), 2000);
      }

    } catch (error) {
      console.error(error);
      let msg = "Something went wrong.";
      if (error.message.includes("429")) msg = "Too many requests! The AI is overwhelmed. Try again in a moment.";
      if (error.message.includes("API")) msg = "API issue. The server might be busy.";
      if (error.message.includes("network") || error.message.includes("fetch")) msg = "Network error. Check your connection.";
      alert(msg + "\nTechnical detail: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // BULK PROCESSING
  // ==========================================================================

  const processAllItems = async () => {
    if (items.length === 0) return;
    setBulkProcessing(true);
    setProcessProgress({ current: 0, total: items.length });
    setWaitingMessage(getWaitingMessage());

    let delay = 4000; // Start with 4s between items (safe for 15 RPM)
    let consecutiveErrors = 0;

    // Rotate fun messages every few seconds
    const messageInterval = setInterval(() => {
      setWaitingMessage(getWaitingMessage());
    }, 8000);

    for (let i = 0; i < items.length; i++) {
      // Skip already-done items
      if (items[i].status === 'done') {
        setProcessProgress({ current: i + 1, total: items.length });
        continue;
      }

      setItems(prev => prev.map((item, idx) =>
        idx === i ? { ...item, status: 'processing' } : item
      ));
      setProcessProgress({ current: i + 1, total: items.length });

      try {
        const base64Data = items[i].preview.split(',')[1];
        const response = await fetch('/.netlify/functions/analyze-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: [{ mimeType: 'image/jpeg', data: base64Data }],
            isSpicyMode: isSpicyMode,
            region: userRegion,
            extraInfo: bulkContext || undefined
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error || `Server returned ${response.status}`;

          // Dynamic backoff on rate limits
          if (response.status === 429 || errorMsg.includes('Too many requests')) {
            consecutiveErrors++;
            delay = Math.min(delay * 2, 30000); // Double delay, max 30s
            setWaitingMessage({
              type: 'tip',
              text: `Slowing down to avoid rate limits... (${Math.round(delay / 1000)}s between items)`
            });
            // Don't throw - retry this item after backoff
            await new Promise(r => setTimeout(r, delay));
            i--; // Retry this index
            continue;
          }

          throw new Error(errorMsg);
        }

        const data = await response.json();
        data.priceLow = Number(data.priceLow) || 0;
        data.priceHigh = Number(data.priceHigh) || 0;
        if (!data.dimensions) data.dimensions = { length: 15, width: 10, height: 5, confidence: 50 };
        if (!data.weight) data.weight = { grams: 200, confidence: 50 };
        if (!data.fragility) data.fragility = 'medium';
        if (!data.material) data.material = 'Mixed materials';
        if (!data.condition) data.condition = 'Good condition';

        const packagingRec = recommendPackaging(data.dimensions, data.weight, data.fragility);

        setItems(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'done', results: data, packaging: packagingRec } : item
        ));

        // Success - gradually reduce delay back to normal
        consecutiveErrors = 0;
        if (delay > 4000) {
          delay = Math.max(delay - 2000, 4000);
        }

        // Wait between items
        if (i < items.length - 1) {
          await new Promise(r => setTimeout(r, delay));
        }
      } catch (err) {
        console.error(`Error processing item ${i}:`, err);
        consecutiveErrors++;

        // If too many consecutive errors, increase delay
        if (consecutiveErrors >= 3) {
          delay = Math.min(delay * 2, 30000);
          setWaitingMessage({
            type: 'tip',
            text: `Hit a few bumps - taking it easy... (${Math.round(delay / 1000)}s between items)`
          });
        }

        setItems(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'error', error: err.message } : item
        ));

        // Still wait before next item even on error
        if (i < items.length - 1) {
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    clearInterval(messageInterval);
    setBulkProcessing(false);
    setWaitingMessage(null);

    // Update savings for all successful items
    const doneCount = items.filter(it => it.results).length;
    if (doneCount > 0) {
      const saved = JSON.parse(localStorage.getItem('spicylister_savings') || '{"count": 0, "time": 0, "cost": 0}');
      saved.count += doneCount;
      saved.time += doneCount * SAVINGS_PER_LISTING.time;
      saved.cost += doneCount * SAVINGS_PER_LISTING.cost;
      localStorage.setItem('spicylister_savings', JSON.stringify(saved));
      setCurrentSavings(saved);
      setCurrentReward(getRandomReward());
    }

    // Increment global counter for all done items
    try {
      for (let j = 0; j < doneCount; j++) {
        await fetch('/.netlify/functions/counter', { method: 'POST' });
      }
      const counterRes = await fetch('/.netlify/functions/counter');
      const counterData = await counterRes.json();
      setGlobalCount(counterData.count);
    } catch (err) {
      console.log('Could not update global count:', err);
    }
  };

  // BULK: Retry a single failed item
  const retryItem = async (index) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, status: 'processing', error: null } : item
    ));

    try {
      const base64Data = items[index].preview.split(',')[1];
      const response = await fetch('/.netlify/functions/analyze-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [{ mimeType: 'image/jpeg', data: base64Data }],
          isSpicyMode: isSpicyMode,
          region: userRegion,
          extraInfo: bulkContext || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const data = await response.json();
      data.priceLow = Number(data.priceLow) || 0;
      data.priceHigh = Number(data.priceHigh) || 0;
      if (!data.dimensions) data.dimensions = { length: 15, width: 10, height: 5, confidence: 50 };
      if (!data.weight) data.weight = { grams: 200, confidence: 50 };
      if (!data.fragility) data.fragility = 'medium';
      if (!data.material) data.material = 'Mixed materials';
      if (!data.condition) data.condition = 'Good condition';

      const packagingRec = recommendPackaging(data.dimensions, data.weight, data.fragility);

      setItems(prev => prev.map((item, idx) =>
        idx === index ? { ...item, status: 'done', results: data, packaging: packagingRec } : item
      ));
    } catch (err) {
      setItems(prev => prev.map((item, idx) =>
        idx === index ? { ...item, status: 'error', error: err.message } : item
      ));
    }
  };

  // BULK: View item detail from grid
  const viewItemDetail = (index) => {
    const item = items[index];
    if (!item.results) return;
    setImage(item.file);
    setImagePreview(item.preview);
    setResults(item.results);
    setPackaging(item.packaging);
    setEditedDimensions(item.results.dimensions);
    setShowGrid(false);
  };

  // BULK: Back to grid from detail view
  const backToGrid = () => {
    setImage(null);
    setImagePreview(null);
    setResults(null);
    setPackaging(null);
    setEditingDimensions(false);
    setEditedDimensions(null);
    setHasOwnPackaging(false);
    setShowGrid(true);
  };

  // BULK: Remove item from grid
  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // BULK: Export eBay CSV
  const exportCSV = () => {
    const doneItems = items.filter(item => item.status === 'done' && item.results);
    if (doneItems.length === 0) return;

    const headers = [
      '*Action(SiteID=UK|Country=GB|Currency=GBP|Version=1193)',
      '*Title',
      '*ConditionID',
      '*C:Condition',
      'Description',
      '*StartPrice',
      '*Quantity',
      '*Format',
      '*Duration',
      'ShippingType',
      'ShippingService-1:Option',
      'ShippingService-1:Cost'
    ];

    const conditionIdMap = {
      'new': '1000',
      'like-new': '3000',
      'excellent': '3000',
      'good': '4000',
      'fair': '5000'
    };

    const rows = doneItems.map(item => {
      const r = item.results;
      const condKey = mapCondition(r.condition);
      const conditionId = conditionIdMap[condKey] || '3000';
      const cleanDesc = (r.description || '').replace(/"/g, '""');
      const cleanTitle = (r.title || '').replace(/"/g, '""').substring(0, 80);
      const price = r.priceLow || 0.99;

      return [
        'Add',
        cleanTitle,
        conditionId,
        r.condition || 'Good condition',
        cleanDesc,
        price.toFixed(2),
        '1',
        'FixedPrice',
        'GTC',
        'Flat',
        'UK_RoyalMailSecondClassStandard',
        '0.00'
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spicylister-bulk-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // BULK: Apply bulk action to all done items
  const applyBulkCondition = (condition) => {
    setItems(prev => prev.map(item =>
      item.status === 'done' && item.results
        ? { ...item, results: { ...item.results, condition } }
        : item
    ));
  };

  const applyBulkNote = (note) => {
    if (!note.trim()) return;
    setItems(prev => prev.map(item =>
      item.status === 'done' && item.results
        ? { ...item, results: { ...item.results, description: item.results.description + '\n\n' + note } }
        : item
    ));
  };

  const applyPriceAdjust = (percent) => {
    const multiplier = 1 + (percent / 100);
    setItems(prev => prev.map(item =>
      item.status === 'done' && item.results
        ? {
            ...item,
            results: {
              ...item.results,
              priceLow: Math.round(item.results.priceLow * multiplier * 100) / 100,
              priceHigh: Math.round(item.results.priceHigh * multiplier * 100) / 100
            }
          }
        : item
    ));
  };

  // ✨ NEW: Enhanced Store Integration with full shipping data
  const sendToStore = () => {
    if (!results) return;
    
    const dimensions = editedDimensions || results.dimensions;
    
    const storeData = {
      title: results.title,
      description: results.description,
      category: mapCategory(results.category),
      priceGbp: Math.round(results.priceLow * 100), // Convert £ to pence
      condition: mapCondition(results.condition),
      
      // Shipping data
      dimensions: `${dimensions.length}x${dimensions.width}x${dimensions.height}`,
      weight: results.weight.grams,
      recommendedPackaging: packaging?.recommended || 'small-parcel',
      packagingPrice: packaging?.details?.price || 1.20,
      shippingMethod: 'royal-mail-48-tracked',
      shippingCost: 500 // £5 flat rate in pence (Fiver Flat Rate!)
    };
    
    const encoded = encodeURIComponent(JSON.stringify(storeData));
    window.open(`https://spicylisterstore.manus.space/list?import=${encoded}`, '_blank');
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

  const copyForStore = async () => {
    if (!results) return;
    const dimensions = editedDimensions || results.dimensions;
    const storeText = `${results.title}

${results.description}

Condition: ${results.condition || 'Good condition'}

VALUE: ${userCurrency.symbol}${results.priceLow} - ${results.priceHigh}
CATEGORY: ${results.category}

DIMENSIONS: ${dimensions.length}×${dimensions.width}×${dimensions.height}cm
WEIGHT: ~${results.weight.grams}g
PACKAGING: ${packaging?.details?.name || 'SpicyLister Small Box'}`;
    
    try {
      await navigator.clipboard.writeText(storeText);
      setCopiedStore(true);
      setTimeout(() => setCopiedStore(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // ✨ NEW: Dimension editing handlers
  const handleDimensionChange = (field, value) => {
    const numValue = parseInt(value) || 0;
    const newDimensions = { ...editedDimensions, [field]: numValue };
    setEditedDimensions(newDimensions);

    // Check if significantly different from AI estimate
    if (results?.dimensions) {
      const originalValue = results.dimensions[field];
      const diff = Math.abs(numValue - originalValue);
      const percentDiff = (diff / originalValue) * 100;
      
      if (percentDiff > 50 && numValue > 0) {
        setDimensionWarning(`That's quite different from the AI estimate (${originalValue}cm). Are you sure?`);
      } else {
        setDimensionWarning(null);
      }
    }

    // Recalculate packaging with new dimensions
    if (results?.weight && results?.fragility) {
      const newPackaging = recommendPackaging(newDimensions, results.weight, results.fragility);
      setPackaging(newPackaging);
    }
  };

  const saveDimensionEdits = () => {
    setEditingDimensions(false);
    setDimensionWarning(null);
    // Recalculate packaging
    if (results?.weight && results?.fragility) {
      const newPackaging = recommendPackaging(editedDimensions, results.weight, results.fragility);
      setPackaging(newPackaging);
    }
  };

  // Format time for display
  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}hr ${mins}min` : `${hours}hr`;
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-yellow-50 font-sans p-4">
      {showConfetti && <Confetti numberOfPieces={250} recycle={false} />}

      {/* ✨ NEW: Kudos Notification */}
      {showKudosNotification && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-2xl shadow-lg">
            <p className="font-bold text-lg">+{showKudosNotification.kudos} Kudos! 🌟</p>
            <p className="text-xs opacity-90">You're helping build the community! 💚</p>
          </div>
        </div>
      )}

      {/* ✨ NEW: Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            
            <div className="text-center">
              <h2 className="text-2xl font-black text-gray-800 mb-2">✨ You're on fire!</h2>
              <p className="text-gray-600 mb-4">You've created {listingCount} listings this month!</p>

              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-2xl mb-4 text-left">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <Crown className="text-yellow-500" size={20} />
                  SpicyLister Pro Unlocks:
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>📹 Video assessment (scan from all angles)</li>
                  <li>⚡ Batch processing (10+ items at once)</li>
                  <li>🔬 Advanced material analysis</li>
                  <li>📊 Market trend insights</li>
                  <li>💬 Priority support</li>
                </ul>
              </div>

              <div className="bg-green-50 p-3 rounded-xl mb-4 border border-green-200">
                <p className="text-xs text-green-700 font-bold uppercase tracking-wider">🎉 Early Adopter Pricing</p>
                <p className="text-green-800 text-sm">First 1000 Founder Villagers get <strong>half price forever</strong></p>
              </div>

              <a
                href={TIER_LIMITS.pro.stripeLink}
                target="_blank"
                rel="noreferrer"
                className="block w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-3 rounded-xl font-bold mb-3 hover:from-yellow-500 hover:to-orange-600 transition-colors text-center"
              >
                Become a Founder Villager - £4.95/month
              </a>
              <p className="text-xs text-gray-400 mb-3">Regular price £9.90/month after first 1000</p>

              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-500 text-sm hover:text-gray-700"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">

        {/* HEADER & LOGO */}
        <div className="text-center mb-8 pt-4">
          <div className="flex justify-center mb-4">
            <img
              src={process.env.PUBLIC_URL + '/logo.png'}
              alt="SpicyLister Logo"
              className="w-24 h-24 object-contain drop-shadow-md"
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <div className="text-6xl" style={{ display: 'none' }}>🌶️</div>
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

          {!image && !showGrid && (
            <div className="flex flex-col items-center justify-center w-full py-8">
              <Camera className="w-16 h-16 mb-4 text-orange-300" />
              <p className="font-bold text-xl mb-2 text-gray-700">📸 Snap Something to Sell!</p>
              <p className="text-sm text-gray-500 px-4 text-center mb-6">Photo an item you want to flog and I'll write the listing for you</p>
              
              <div className="flex gap-3 w-full max-w-xs">
                <label className="flex-1 bg-gradient-to-r from-orange-400 to-red-500 text-white py-4 px-4 rounded-2xl font-bold text-center cursor-pointer hover:from-orange-500 hover:to-red-600 transition-all shadow-lg hover:scale-[1.02] active:scale-95">
                  <span className="text-2xl block mb-1">📷</span>
                  Camera
                  <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
                </label>
                
                <label className="flex-1 bg-white border-2 border-orange-300 text-orange-600 py-4 px-4 rounded-2xl font-bold text-center cursor-pointer hover:bg-orange-50 transition-all shadow-md hover:scale-[1.02] active:scale-95">
                  <span className="text-2xl block mb-1">🖼️</span>
                  Gallery
                  <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                </label>
              </div>
            </div>
          )}

          {image && !results && !showGrid && (
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

          {/* BULK GRID VIEW */}
          {showGrid && items.length > 0 && (
            <div className="space-y-4">
              {/* Bulk Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {items.some(i => i.oracleImport)
                      ? `🔮 ${items.length} item${items.length > 1 ? 's' : ''} from Oracle`
                      : `${items.length} items uploaded`
                    }
                  </h2>
                  <p className="text-sm text-gray-500">
                    {items.filter(i => i.status === 'done').length} done
                    {items.filter(i => i.status === 'error').length > 0 && (
                      <span className="text-red-500 ml-2">
                        {items.filter(i => i.status === 'error').length} failed
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={resetApp}
                  className="text-gray-400 hover:text-red-500 p-2"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Progress Bar + Fun Messages */}
              {bulkProcessing && (
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-orange-700">
                      Processing {processProgress.current} of {processProgress.total}...
                    </span>
                    <span className="text-xs text-orange-500">
                      {Math.round((processProgress.current / processProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-orange-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-orange-400 to-red-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(processProgress.current / processProgress.total) * 100}%` }}
                    ></div>
                  </div>

                  {/* Fun waiting message */}
                  {waitingMessage && (
                    <div className="bg-white p-4 rounded-xl border border-orange-100 text-center transition-all">
                      <span className="text-2xl block mb-2">{MESSAGE_TYPE_EMOJI[waitingMessage.type] || '✨'}</span>
                      <p className="text-sm text-gray-700 leading-relaxed font-medium">
                        {waitingMessage.text}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wider">
                        {waitingMessage.type === 'joke' && 'Dad Joke Break'}
                        {waitingMessage.type === 'fact' && 'Did You Know?'}
                        {waitingMessage.type === 'tip' && 'Seller Pro Tip'}
                        {waitingMessage.type === 'hype' && 'You Got This'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Items Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => item.status === 'done' ? viewItemDetail(index) : null}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                      item.status === 'done'
                        ? 'border-green-400 cursor-pointer hover:scale-[1.03] hover:shadow-md'
                        : item.status === 'processing'
                        ? 'border-orange-400 animate-pulse'
                        : item.status === 'error'
                        ? 'border-red-400'
                        : 'border-gray-200'
                    }`}
                  >
                    {item.preview ? (
                      <img
                        src={item.preview}
                        alt={`Item ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
                        <span className="text-3xl mb-1">🔮</span>
                        <span className="text-xs font-bold">Oracle</span>
                      </div>
                    )}

                    {/* Status Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {item.status === 'done' && (
                        <div className="bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                          <Check size={16} />
                        </div>
                      )}
                      {item.status === 'processing' && (
                        <div className="bg-white rounded-full p-2 shadow-lg">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
                        </div>
                      )}
                      {item.status === 'error' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); retryItem(index); }}
                          className="bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600"
                        >
                          <AlertCircle size={16} />
                        </button>
                      )}
                    </div>

                    {/* Price badge for done items */}
                    {item.status === 'done' && item.results && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs font-bold px-2 py-1 text-center">
                        {userCurrency.symbol}{item.results.priceLow}-{item.results.priceHigh}
                      </div>
                    )}

                    {/* Remove button */}
                    {!bulkProcessing && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeItem(index); }}
                        className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-0.5 hover:bg-opacity-80"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Extra Context Box */}
              {!bulkProcessing && items.some(i => i.status === 'pending') && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-wider block mb-2">
                    Extra context (optional)
                  </label>
                  <textarea
                    value={bulkContext}
                    onChange={(e) => setBulkContext(e.target.value)}
                    placeholder="e.g. These are all books, from a smoke-free home, bought in 2020..."
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
                    rows={2}
                  />
                  <p className="text-xs text-gray-400 mt-1">This info helps the AI write better descriptions for all items</p>
                </div>
              )}

              {/* Generate All Button */}
              {!bulkProcessing && items.some(i => i.status === 'pending') && (
                <button
                  onClick={processAllItems}
                  className="w-full py-5 rounded-2xl font-bold text-xl text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 bg-gradient-to-r from-orange-400 to-red-500"
                >
                  <Sparkles size={24} />
                  {isSpicyMode
                    ? `Generate ${items.filter(i => i.status === 'pending').length} Spicy Listings`
                    : `Generate ${items.filter(i => i.status === 'pending').length} Listings`
                  }
                </button>
              )}

              {/* Bulk Actions (when items are done) */}
              {items.some(i => i.status === 'done') && !bulkProcessing && (
                <div className="space-y-3">
                  {/* CSV Export - Primary Action */}
                  <button
                    onClick={exportCSV}
                    className="w-full py-4 rounded-2xl font-bold text-lg text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600"
                  >
                    <Package size={22} />
                    Export eBay CSV ({items.filter(i => i.status === 'done').length} items)
                  </button>

                  {/* Quick Bulk Actions */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                    <p className="text-xs font-bold uppercase text-gray-500 tracking-wider">Bulk Actions</p>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => applyBulkCondition('Excellent condition')}
                        className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100"
                      >
                        All "Excellent"
                      </button>
                      <button
                        onClick={() => applyBulkCondition('Very good condition')}
                        className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100"
                      >
                        All "Very Good"
                      </button>
                      <button
                        onClick={() => applyBulkCondition('Good condition')}
                        className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100"
                      >
                        All "Good"
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => applyPriceAdjust(10)}
                        className="flex-1 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-100"
                      >
                        Prices +10%
                      </button>
                      <button
                        onClick={() => applyPriceAdjust(-10)}
                        className="flex-1 bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100"
                      >
                        Prices -10%
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => applyBulkNote('From a smoke-free, pet-free home.')}
                        className="flex-1 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100"
                      >
                        + Smoke-free home
                      </button>
                      <button
                        onClick={() => applyBulkNote('Happy to combine postage on multiple items.')}
                        className="flex-1 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100"
                      >
                        + Combine postage
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl border-2 border-green-200 text-center">
                    <p className="text-sm text-green-700 mb-1">Total estimated value</p>
                    <p className="text-3xl font-black text-green-600">
                      {userCurrency.symbol}
                      {items.filter(i => i.results).reduce((sum, i) => sum + (i.results.priceLow || 0), 0).toFixed(0)}
                      {' - '}
                      {items.filter(i => i.results).reduce((sum, i) => sum + (i.results.priceHigh || 0), 0).toFixed(0)}
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      Time saved: ~{items.filter(i => i.results).length * SAVINGS_PER_LISTING.time} minutes
                    </p>
                  </div>
                </div>
              )}

              {/* All Done Celebration */}
              {!bulkProcessing && items.length > 0 && items.every(i => i.status === 'done' || i.status === 'error') && items.some(i => i.status === 'done') && (
                <div className="text-center p-4">
                  <p className="text-sm text-gray-500">
                    Click any item to view/edit details. Export CSV to upload to eBay File Exchange.
                  </p>
                </div>
              )}
            </div>
          )}

          {results && !showGrid && (
            <div className="space-y-6">

              {/* Back to Grid button (when viewing from bulk) */}
              {items.length > 0 && (
                <button
                  onClick={backToGrid}
                  className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium text-sm mb-2"
                >
                  <span>&larr;</span> Back to all {items.length} items
                </button>
              )}

              {/* Oracle Import Banner */}
              {items.some(i => i.oracleImport) && !image && (
                <div className="bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200 rounded-2xl p-4 text-center">
                  <p className="text-sm font-bold text-purple-800">🔮 Imported from Magic-Oid Oracle</p>
                  <p className="text-xs text-purple-600 mt-1">Add a photo to include it in your eBay listing</p>
                </div>
              )}

              <div ref={resultCardRef} className="bg-white p-2 rounded-xl">
                {isSpicyMode && (
                  <div className={`mb-6 p-4 rounded-2xl border-2 ${getRarityStyle(results.rarity).bg} ${getRarityStyle(results.rarity).color} text-center`}>
                    <p className="text-lg font-bold italic text-gray-800">"{results.spicyComment}"</p>
                    <span className="text-xs uppercase font-black tracking-widest text-gray-500 mt-2 block">
                      {results.rarity} TIER FIND {getRarityStyle(results.rarity).emoji}
                    </span>
                  </div>
                )}

                {/* Title Card */}
                <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase text-orange-600 tracking-wider">Listing Title</span>
                    <button onClick={() => copyText('title', results.title)} className="text-orange-500 hover:text-orange-700">
                      {copiedSection === 'title' ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">{results.title}</h2>
                </div>

                {/* Description Card */}
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Description</span>
                    <button onClick={() => copyText('desc', results.description)} className="text-gray-400 hover:text-gray-600">
                      {copiedSection === 'desc' ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{results.description}</p>
                </div>

                {/* Price & Category Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-center">
                    <span className="text-xs font-bold uppercase text-green-600">Est. Value</span>
                    <p className="text-2xl font-black text-green-700 mt-1">{userCurrency.symbol}{results.priceLow} - {results.priceHigh}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                    <span className="text-xs font-bold uppercase text-blue-600">Category</span>
                    <p className="text-sm font-bold text-blue-800 mt-2 leading-tight">{results.category}</p>
                  </div>
                </div>

                {/* ✨ NEW: Dimensions Card */}
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Ruler className="text-blue-600" size={20} />
                      <span className="text-xs font-bold uppercase text-blue-600">Dimensions & Weight</span>
                    </div>
                    <button 
                      onClick={() => setEditingDimensions(!editingDimensions)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit3 size={18} />
                    </button>
                  </div>

                  {!editingDimensions ? (
                    <>
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex-1">
                          <p className="text-lg font-bold text-blue-900">
                            📏 {editedDimensions?.length || results.dimensions.length} × {editedDimensions?.width || results.dimensions.width} × {editedDimensions?.height || results.dimensions.height} cm
                          </p>
                          <p className="text-sm text-blue-600 mt-1">
                            <Scale size={14} className="inline mr-1" />
                            Weight: ~{results.weight.grams}g
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 text-xs text-blue-500 mt-2">
                        <span>Confidence: {editedDimensions?.confidence || results.dimensions.confidence}%</span>
                        <span>•</span>
                        <span className="capitalize">{results.material}</span>
                        <span>•</span>
                        <span className="capitalize">{results.fragility} fragility</span>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-blue-600 block mb-1">Length (cm)</label>
                          <input
                            type="number"
                            value={editedDimensions?.length || ''}
                            onChange={(e) => handleDimensionChange('length', e.target.value)}
                            className="w-full p-2 border border-blue-200 rounded-lg text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-blue-600 block mb-1">Width (cm)</label>
                          <input
                            type="number"
                            value={editedDimensions?.width || ''}
                            onChange={(e) => handleDimensionChange('width', e.target.value)}
                            className="w-full p-2 border border-blue-200 rounded-lg text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-blue-600 block mb-1">Height (cm)</label>
                          <input
                            type="number"
                            value={editedDimensions?.height || ''}
                            onChange={(e) => handleDimensionChange('height', e.target.value)}
                            className="w-full p-2 border border-blue-200 rounded-lg text-center font-bold"
                          />
                        </div>
                      </div>
                      
                      {dimensionWarning && (
                        <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-2 rounded-lg">
                          <AlertCircle size={16} />
                          {dimensionWarning}
                        </div>
                      )}
                      
                      <button
                        onClick={saveDimensionEdits}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-bold text-sm"
                      >
                        Save Dimensions
                      </button>
                    </div>
                  )}
                </div>

                {/* ✨ NEW: Packaging Recommendation Card */}
                {packaging && !hasOwnPackaging && (
                  <div className="bg-orange-50 p-5 rounded-2xl border border-orange-200 mb-4">
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
                            {packaging.details.dimensions}, up to {packaging.details.maxWeight >= 1000 ? `${packaging.details.maxWeight / 1000}kg` : `${packaging.details.maxWeight}g`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-orange-600">
                            £{packaging.details.price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-bold text-sm transition-colors">
                        Order This Size
                      </button>
                      <button 
                        onClick={() => setHasOwnPackaging(true)}
                        className="flex-1 bg-white border-2 border-orange-200 text-orange-600 py-2 rounded-lg font-bold text-sm hover:bg-orange-50 transition-colors"
                      >
                        I Have It
                      </button>
                    </div>
                    
                    {packaging.alternatives && packaging.alternatives.length > 0 && (
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        Alternative: {packaging.alternatives[0].name} (£{packaging.alternatives[0].price.toFixed(2)})
                      </p>
                    )}
                    
                    <p className="text-xs text-orange-600 mt-2 text-center italic">
                      {packaging.reasoning}
                    </p>
                  </div>
                )}

                {/* Packaging confirmed message */}
                {hasOwnPackaging && (
                  <div className="bg-green-50 p-4 rounded-2xl border border-green-200 mb-4 text-center">
                    <p className="text-green-700 font-bold flex items-center justify-center gap-2">
                      <Check size={20} /> Using your own packaging
                    </p>
                    <button 
                      onClick={() => setHasOwnPackaging(false)}
                      className="text-green-600 text-sm underline mt-1"
                    >
                      Show recommendations again
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* PRIMARY: Send to Store Button */}
                <button
                  onClick={sendToStore}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg"
                >
                  <ExternalLink size={20} />
                  Send to SpicyLister Store
                </button>

                {/* SECONDARY: Other Actions */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => {
                      const searchQuery = encodeURIComponent(results.title);
                      window.open(`https://www.ebay.co.uk/sch/i.html?_nkw=${searchQuery}`, '_blank');
                    }}
                    className="bg-[#e53238] hover:bg-[#d12d33] text-white py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 text-sm transition-colors"
                  >
                    <span className="text-lg">🛒</span>
                    <span className="text-xs">eBay</span>
                  </button>

                  <button
                    onClick={copyForStore}
                    className="bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 text-sm transition-colors"
                  >
                    {copiedStore ? <Check size={18} /> : <Copy size={18} />}
                    <span className="text-xs">{copiedStore ? 'Copied!' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={shareResult}
                    className="bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 text-sm transition-colors"
                  >
                    <Share2 size={18} />
                    <span className="text-xs">Share</span>
                  </button>

                  <button
                    onClick={resetApp}
                    className="bg-white border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-50 flex flex-col items-center justify-center gap-1 text-sm transition-colors"
                  >
                    <Trash2 size={18} />
                    <span className="text-xs">New</span>
                  </button>
                </div>
              </div>

              {/* ✨ NEW: Savings Celebration Card */}
              {currentSavings && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-3xl border-2 border-green-200 text-center">
                  <h2 className="text-3xl font-black text-green-700 mb-3">
                    {milestone?.show ? milestone.message : '🎉 Well Done!'}
                  </h2>
                  
                  <div className="bg-white p-4 rounded-2xl mb-4">
                    <p className="text-gray-700 mb-2">You've saved:</p>
                    <p className="text-3xl font-black text-green-600">
                      {SAVINGS_PER_LISTING.time} min & £{SAVINGS_PER_LISTING.cost.toFixed(2)}
                    </p>
                  </div>
                  
                  {currentReward && (
                    <div className="bg-green-100 p-4 rounded-2xl mb-4">
                      <p className="text-sm text-green-800 mb-2 font-semibold">
                        You've earned time for:
                      </p>
                      <p className="text-lg font-bold text-green-700">
                        {currentReward}
                      </p>
                    </div>
                  )}
                  
                  <p className="text-xs text-green-600">
                    💚 Total saved: {formatTime(currentSavings.time)}, £{currentSavings.cost.toFixed(2)} across {currentSavings.count} listings
                  </p>
                </div>
              )}

              {/* Pro Tier Teaser (shows after 3 listings) */}
              {!isPro && listingCount >= 3 && listingCount < TIER_LIMITS.free.listingsPerMonth && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-2xl border border-yellow-200 flex items-center gap-3">
                  <Crown size={24} className="text-yellow-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">Become a Founder Villager</p>
                    <p className="text-sm text-gray-600">Half price forever for first 1000</p>
                  </div>
                  <a
                    href={TIER_LIMITS.pro.stripeLink}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:from-yellow-500 hover:to-orange-600 transition-colors whitespace-nowrap"
                  >
                    £4.95/mo
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="mt-12 text-center space-y-6 pb-12">
          
          {/* Retro Hit Counter - GlowGadgets Callback */}
          <div className="inline-block bg-black px-5 py-3 rounded-lg border-2 border-green-500 shadow-lg shadow-green-500/20">
            <p className="text-[10px] text-green-400 uppercase tracking-widest mb-1">🌍 Global Listings Generated</p>
            <div className="font-mono text-3xl text-green-400 tracking-wider" style={{ textShadow: '0 0 10px #22c55e' }}>
              {globalCount !== null ? String(globalCount).padStart(6, '0') : '------'}
            </div>
            <p className="text-[10px] text-green-600 mt-2">
              Your contribution: <span className="text-green-400 font-bold">{listingCount}</span>
            </p>
            <p className="text-[8px] text-green-700 mt-1 opacity-70">~ GlowGadgets Vibes ~</p>
          </div>

          {/* AuDHD Creator Credit - OBVIOUS */}
          <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 p-4 rounded-2xl border-2 border-purple-200">
            <p className="text-lg font-black text-gray-800 mb-1">
              Made with 🧠✨ by <span className="text-purple-600">AuDHD</span> Chris P Tee
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <a
                href="https://www.tiktok.com/@chrispteemagician"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-800 transition-colors"
              >
                <span>🎵</span> @chrispteemagician
              </a>
              <a
                href="https://www.instagram.com/spicylister"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
              >
                <span>📸</span> @spicylister
              </a>
            </div>
          </div>

          {/* Coffeeware Section */}
          <div className="bg-white px-6 py-5 rounded-3xl shadow-md border-2 border-yellow-200">
            <h3 className="text-xl font-black text-gray-800 flex items-center justify-center gap-2 mb-2">
              <Coffee className="text-yellow-500" /> This is Coffeeware
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Free to use forever. If it helps you, pay it forward! 💚
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <a
                href="https://ko-fi.com/zoom"
                target="_blank"
                rel="noreferrer"
                className="bg-[#13C3FF] text-white font-bold py-2 px-5 rounded-xl hover:bg-[#00b4f0] transition-colors flex items-center justify-center gap-2"
              >
                ☕ Ko-fi
              </a>
              <a
                href="https://buymeacoffee.com/chrispteemagician"
                target="_blank"
                rel="noreferrer"
                className="bg-yellow-400 text-yellow-900 font-bold py-2 px-5 rounded-xl hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
              >
                ☕ Buy Me a Coffee
              </a>
            </div>

            <p className="text-sm font-bold text-green-600 bg-green-50 py-2 px-4 rounded-full inline-block">
              🎁 I'll Pay it Forward & You Get the Kudos!
            </p>
          </div>

          {/* Chris P Tee's Recommendations */}
          <div className="bg-white px-6 py-5 rounded-3xl shadow-md border-2 border-gray-200">
            <h3 className="text-lg font-black text-gray-800 mb-4">📚 Chris P Tee Recommends</h3>

            {/* Your Books - Featured */}
            <div className="bg-yellow-50 p-4 rounded-2xl border-2 border-yellow-300 mb-4">
              <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider mb-2">✨ My Books</p>
              <div className="space-y-2 text-sm">
                <a href="https://amzn.to/3NPNm8q" target="_blank" rel="noreferrer" className="block text-gray-700 hover:text-orange-600">
                  📖 The Stress Free Guide to Kids Magic Parties
                </a>
                <a href="https://amzn.eu/d/5JsR1XH" target="_blank" rel="noreferrer" className="block text-gray-700 hover:text-orange-600">
                  📖 Modern Entertainer Insights
                </a>
                <a href="https://amzn.to/3NITj7f" target="_blank" rel="noreferrer" className="block text-gray-700 hover:text-orange-600">
                  📖 More Performer Wisdom
                </a>
              </div>
            </div>

            {/* Coffee Gear - Featured */}
            <div className="bg-orange-50 p-4 rounded-2xl border-2 border-orange-300 mb-4">
              <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2">☕ My Coffee Gear (10+ Years Use)</p>
              <p className="text-xs text-orange-600 mb-2 italic">"ADHD + Coffee = Functional Human"</p>
              <div className="space-y-2 text-sm">
                <a href="https://amzn.to/3LLjx8x" target="_blank" rel="noreferrer" className="block text-gray-700 hover:text-orange-600">
                  ⏰ Bedside Alarm Clock Coffee Maker (on my bedside NOW)
                </a>
                <a href="https://amzn.to/4kcn4cr" target="_blank" rel="noreferrer" className="block text-gray-700 hover:text-orange-600">
                  🏆 Aeropress Classic (10 years old, good as new)
                </a>
                <a href="https://amzn.to/45GzK5B" target="_blank" rel="noreferrer" className="block text-gray-700 hover:text-orange-600">
                  ♻️ Reusable Metal Filter (no more paper!)
                </a>
                <a href="https://amzn.to/4bvlRee" target="_blank" rel="noreferrer" className="block text-gray-700 hover:text-orange-600">
                  🇮🇹 Bialetti Moka Pot (bulletproof Italian coffee)
                </a>
              </div>
            </div>

            {/* Bristol Rave Book */}
            <div className="bg-purple-50 p-4 rounded-2xl border-2 border-purple-300">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">🎵 From a TikTok Friend</p>
              <a href="https://amzn.to/4q6XLd9" target="_blank" rel="noreferrer" className="block text-sm text-gray-700 hover:text-purple-600">
                📖 Rave & Glowgadgets: Bristol 1999-2003 - We were BOTH there!
              </a>
            </div>

            <p className="text-xs text-gray-400 mt-3 text-center">Affiliate links support SpicyLister 💚</p>
          </div>

          {/* Community Links */}
          <div className="flex flex-col items-center gap-2 text-sm text-gray-400">
            <a href="https://comedymagic.co.uk" target="_blank" rel="noreferrer" className="hover:text-purple-500 transition-colors">
              Support the <strong>Community Comedy Magic Tour</strong>
            </a>
            <p className="text-xs opacity-50 mt-4">
              SpicyLister v2.4 • Powered by Gemini Flash • No cookies, just vibes 🌶️
            </p>
            <p className="text-[10px] opacity-30">
              "World domination through kindness" 💚
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
