import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Star, 
  AlertTriangle 
  // Remove: Upload, Sparkles, X, Target, TrendingDown
} from 'lucide-react';

const SpicyLister = () => {
  // Core State
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [extraInfo, setExtraInfo] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState([]); // Array for batch results
  const [currentResult, setCurrentResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedSection, setCopiedSection] = useState('');
  const [processingMedia, setProcessingMedia] = useState(false);
  
  // Pro/Premium State
  const [isPro, setIsPro] = useState(false);
  const [proExpiryDate, setProExpiryDate] = useState(null);
  const [showProModal, setShowProModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [supporterType, setSupporterType] = useState(null); // 'coffee' or 'premium'
  
  // Batch State
  const [batchMode, setBatchMode] = useState(false);
  const [batchItems, setBatchItems] = useState([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  
  // Refs
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Load saved state on mount
  useEffect(() => {
    const savedPro = localStorage.getItem('spicylister_pro');
    const savedExpiry = localStorage.getItem('spicylister_pro_expiry');
    const savedEmail = localStorage.getItem('spicylister_email');
    const savedSupporter = localStorage.getItem('spicylister_supporter_type');
    
    if (savedPro === 'true' && savedExpiry) {
      const expiryDate = new Date(savedExpiry);
      if (expiryDate > new Date()) {
        setIsPro(true);
        setProExpiryDate(expiryDate);
      } else {
        // Pro expired, clean up
        localStorage.removeItem('spicylister_pro');
        localStorage.removeItem('spicylister_pro_expiry');
      }
    }
    
    if (savedEmail) setUserEmail(savedEmail);
    if (savedSupporter) setSupporterType(savedSupporter);
  }, []);

  // Smart media compression optimized for AI
  const compressImage = useCallback((file, maxDimension = 1024, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        const maxSize = Math.max(width, height);
        
        if (maxSize > maxDimension) {
          const scale = maxDimension / maxSize;
          width *= scale;
          height *= scale;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        }, 'image/jpeg', quality);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Handle image upload
  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    const maxImages = isPro ? 10 : 3;
    
    if (images.length + files.length > maxImages) {
      setError(`Max ${maxImages} photos${isPro ? ' per item' : ''}! ${isPro ? '(Pro allows 10)' : '(Upgrade to Pro for 10)'}`);
      return;
    }

    setProcessingMedia(true);
    setError(null);

    try {
      const imagePromises = files.map(async (file) => {
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} isn't an image file`);
        }

        if (file.size > 20 * 1024 * 1024) {
          throw new Error(`${file.name} is too large (max 20MB)`);
        }

        const compressedFile = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressedFile);

        return {
          file: compressedFile,
          originalFile: file,
          originalName: file.name,
          originalSize: file.size,
          compressedSize: compressedFile.size,
          preview: previewUrl,
          type: 'image',
          id: Date.now() + Math.random()
        };
      });

      const newImages = await Promise.all(imagePromises);
      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessingMedia(false);
    }
  };

  // Handle video upload (Pro only)
  const handleVideoUpload = async (event) => {
    if (!isPro) {
      setShowProModal(true);
      return;
    }

    const files = Array.from(event.target.files);
    
    if (videos.length + files.length > 2) {
      setError("Max 2 videos per listing!");
      return;
    }

    setProcessingMedia(true);
    setError(null);

    try {
      const videoPromises = files.map(async (file) => {
        if (!file.type.startsWith('video/')) {
          throw new Error(`${file.name} isn't a video file`);
        }

        if (file.size > 100 * 1024 * 1024) {
          throw new Error(`${file.name} is too large (max 100MB)`);
        }

        const previewUrl = URL.createObjectURL(file);

        return {
          file: file,
          originalName: file.name,
          size: file.size,
          preview: previewUrl,
          type: 'video',
          id: Date.now() + Math.random()
        };
      });

      const newVideos = await Promise.all(videoPromises);
      setVideos(prev => [...prev, ...newVideos]);
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessingMedia(false);
    }
  };

  // Remove media
  const removeMedia = (id, type) => {
    if (type === 'image') {
      setImages(prev => {
        const imageToRemove = prev.find(img => img.id === id);
        if (imageToRemove?.preview) URL.revokeObjectURL(imageToRemove.preview);
        return prev.filter(img => img.id !== id);
      });
    } else {
      setVideos(prev => {
        const videoToRemove = prev.find(vid => vid.id === id);
        if (videoToRemove?.preview) URL.revokeObjectURL(videoToRemove.preview);
        return prev.filter(vid => vid.id !== id);
      });
    }
  };

  // Analyze media with AI
  const analyzeMedia = async (usePro = false) => {
    if (images.length === 0 && videos.length === 0) {
      setError("Upload at least one photo or video first!");
      return;
    }

    if (usePro && !isPro) {
      setShowProModal(true);
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // For demo purposes - simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate results based on Pro status
      const mockResult = {
        title: isPro 
          ? "Premium Vintage Canon AE-1 35mm Film Camera w/ 50mm f/1.8 Lens - Tested Working"
          : "Vintage Canon Camera with Lens - Film Photography",
        
        description: isPro
          ? `🔥 PROFESSIONAL PHOTOGRAPHER'S VINTAGE TREASURE 🔥

📸 What You're Getting:
• Canon AE-1 35mm SLR Camera Body (Serial: 1234567)
• Canon FD 50mm f/1.8 Lens (Crystal Clear Glass)
• Original Leather Neck Strap
• Body Cap & Lens Cap Included

✨ CONDITION DETAILS:
Body: Excellent condition with minimal wear. Light scuff marks on bottom plate from normal use. All controls smooth and responsive.
Lens: Glass is pristine - no fungus, haze, or scratches. Aperture blades clean and snappy.
Functionality: Fully tested and working! Light meter accurate, shutter speeds crisp, film advance smooth.

🎯 PERFECT FOR:
• Film photography enthusiasts
• Photography students
• Vintage camera collectors
• Instagram-worthy analog photography

📊 MARKET RESEARCH (Pro Analysis):
Similar units selling: £150-£280
This condition typically: £220-£250
Recent eBay sales: £235 average

⚡ WHY BUY FROM ME:
✓ Fast same-day dispatch
✓ Carefully packaged in bubble wrap
✓ 100+ happy customers
✓ Questions? Message me!

🚚 SHIPPING: 
UK: £4.95 Royal Mail 48 Tracked
International: Ask for quote

Don't miss this classic camera that started the photography revolution!`
          : `Vintage Canon camera for sale. Good condition, includes lens. Perfect for film photography enthusiasts or collectors. Some signs of wear consistent with age. Tested and working. Check photos for condition. Any questions, please ask!`,

        condition: isPro ? "Excellent - Professionally Assessed" : "Good/Used",
        
        pricing: {
          startingBid: isPro ? "0.99" : "29.99",
          buyItNow: isPro ? "249.99" : "99.99",
          marketAverage: isPro ? "235.00" : null,
          priceConfidence: isPro ? "95%" : null
        },

        marketInsights: isPro ? `📈 HOT MARKET: Film cameras up 40% this year! 
        Peak selling: Sunday 8pm. Your item matches trending "vintage aesthetic" searches.
        Competitor at £280 has 12 watchers - you could undercut at £249.99 for quick sale.` : null,

        competitorAnalysis: isPro ? [
          { title: "Canon AE-1 w/ 50mm - MINT", price: "280.00", status: "12 watchers", condition: "Mint" },
          { title: "Canon AE-1 Body Only", price: "145.00", status: "Sold yesterday", condition: "Good" },
          { title: "Canon AE-1 Program Kit", price: "320.00", status: "3 bids", condition: "Excellent" }
        ] : null,

        platformTips: isPro 
          ? "List on Sunday evening for 40% more views. Use 'FILM TESTED' in title for 3x engagement. Price at £249.99 BIN with Best Offer enabled - expect offers around £220."
          : "Consider adding more photos and detail for better results",

        keywords: isPro 
          ? ["canon ae-1", "35mm camera", "film camera", "vintage camera", "slr camera", "fd lens", "film tested", "lomography", "analog photography", "retro camera"]
          : ["camera", "vintage", "canon"],

        categoryId: isPro ? "15230" : "625",
        itemSpecifics: isPro ? {
          Brand: "Canon",
          Model: "AE-1",
          Type: "SLR",
          "Film Format": "35mm",
          "Focus Type": "Manual",
          "Country/Region": "Japan",
          Era: "1970s"
        } : null,

        isPro: isPro || usePro
      };

      if (batchMode && batchItems.length > 0) {
        // Store result for current batch item
        setResults(prev => [...prev, mockResult]);
        
        // Move to next batch item or finish
        if (currentBatchIndex < batchItems.length - 1) {
          setCurrentBatchIndex(prev => prev + 1);
          // Auto-process next item
          setTimeout(() => {
            analyzeMedia(isPro);
          }, 1000);
        } else {
          // Batch complete
          setBatchMode(false);
          setCurrentBatchIndex(0);
        }
      } else {
        setCurrentResult(mockResult);
      }

    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle Coffee Supporter (1 month Pro)
  const handleCoffeeSupport = async () => {
    const email = prompt("Enter your email for 1 MONTH FREE PRO + updates:");
    if (!email || !email.includes('@')) {
      alert("Please enter a valid email to unlock Pro features");
      return;
    }
    
    setUserEmail(email);
    localStorage.setItem('spicylister_email', email);
    
    // Set Pro for 1 month
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    
    setIsPro(true);
    setProExpiryDate(expiryDate);
    setSupporterType('coffee');
    
    localStorage.setItem('spicylister_pro', 'true');
    localStorage.setItem('spicylister_pro_expiry', expiryDate.toISOString());
    localStorage.setItem('spicylister_supporter_type', 'coffee');
    
    // Open Buy Me a Coffee
    window.open('https://buymeacoffee.com/chrispteemagician', '_blank');
    
    setShowProModal(false);
    
    // Show success message
    setTimeout(() => {
      alert(`🎉 PRO ACTIVATED! Valid until ${expiryDate.toLocaleDateString()}. Thank you for supporting the van life dream! 🚐`);
    }, 500);
  };

  // Handle Premium Upgrade (Lifetime)
  const handlePremiumUpgrade = async () => {
    const email = prompt("Enter your email for LIFETIME PRO access:");
    if (!email || !email.includes('@')) {
      alert("Please enter a valid email");
      return;
    }
    
    setUserEmail(email);
    localStorage.setItem('spicylister_email', email);
    
    // Open PayPal
    window.open('https://paypal.me/chrisptee/9.99', '_blank');
    
// For demo, auto-activate after delay
setTimeout(() => {
  // Simulate activation after payment
  setIsPro(true);
  setProExpiryDate(null); // Lifetime
  setSupporterType('premium');
  localStorage.setItem('spicylister_pro', 'true');
  localStorage.setItem('spicylister_pro_expiry', 'lifetime');
  localStorage.setItem('spicylister_supporter_type', 'premium');
  setShowProModal(false);
  setTimeout(() => {
    alert(`🎉 LIFETIME PRO ACTIVATED! Thank you for supporting the van life dream! 🚐`);
  }, 500);
}, 2000);

  };

  const copyToClipboard = async (text, section = '') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  };

  const searchEbayWithTitle = () => {
    if (currentResult?.title) {
      const searchUrl = `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(currentResult.title)}`;
      window.open(searchUrl, '_blank');
    }
  };

  const startNewListing = () => {
    // Clean up media URLs
    images.forEach(img => {
      if (img.preview) URL.revokeObjectURL(img.preview);
    });
    videos.forEach(vid => {
      if (vid.preview) URL.revokeObjectURL(vid.preview);
    });
    
    setImages([]);
    setVideos([]);
    setExtraInfo('');
    setCurrentResult(null);
    setResults([]);
    setError(null);
    setCopiedSection('');
    setBatchMode(false);
    setBatchItems([]);
    setCurrentBatchIndex(0);
  };

  // Export batch results
  const exportBatchResults = () => {
    if (results.length === 0) return;
    
    const csv = results.map((r, i) => ({
      "Item": i + 1,
      "Title": r.title,
      "Description": r.description,
      "Condition": r.condition,
      "Start Price": r.pricing?.startingBid,
      "BIN Price": r.pricing?.buyItNow,
      "Market Avg": r.pricing?.marketAverage || 'N/A'
    }));
    
    // Convert to CSV string
    const csvString = [
      Object.keys(csv[0]).join(','),
      ...csv.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');
    
    // Download
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spicylister-batch-${Date.now()}.csv`;
    a.click();
  };

  // Pro Modal Component
  const ProModal = () => (
    showProModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="text-center">
            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown className="w-12 h-12 text-yellow-500" />
              <Rocket className="w-10 h-10 text-purple-500" />
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
            
            <h3 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Unlock SpicyLister PRO! 🚀
            </h3>
            
            <p className="text-xl text-gray-700 font-semibold mb-6">
              Stop leaving money on the table - Get REAL pricing data!
            </p>

            {/* Two Options */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* Coffee Option */}
              <div className="border-2 border-yellow-400 rounded-xl p-4 bg-yellow-50">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Coffee className="w-8 h-8 text-yellow-600" />
                  <Gift className="w-6 h-6 text-red-500" />
                </div>
                <h4 className="text-2xl font-bold text-yellow-700 mb-2">Buy Me a Coffee</h4>
                <div className="text-3xl font-bold text-gray-800 mb-2">£3</div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold mb-3">
                  1 MONTH FREE PRO!
                </div>
                <ul className="text-sm text-gray-700 text-left space-y-1 mb-4">
                  <li>✅ All Pro features for 30 days</li>
                  <li>✅ Support van life journey</li>
                  <li>✅ Karma points: 1000+</li>
                  <li>✅ My eternal gratitude</li>
                </ul>
                <button
                  onClick={handleCoffeeSupport}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-yellow-600 hover:to-yellow-700"
                >
                  ☕ Buy Coffee = 1 Month Pro
                </button>
              </div>

              {/* Lifetime Option */}
              <div className="border-2 border-purple-400 rounded-xl p-4 bg-purple-50">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Crown className="w-8 h-8 text-purple-600" />
                  <Shield className="w-6 h-6 text-blue-500" />
                </div>
                <h4 className="text-2xl font-bold text-purple-700 mb-2">Lifetime Pro</h4>
                <div className="text-3xl font-bold text-gray-800 mb-2">£9.99</div>
                <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold mb-3">
                  ONE TIME - FOREVER!
                </div>
                <ul className="text-sm text-gray-700 text-left space-y-1 mb-4">
                  <li>✅ Lifetime Pro access</li>
                  <li>✅ All future features</li>
                  <li>✅ Priority support</li>
                  <li>✅ Fund the tour properly!</li>
                </ul>
                <button
                  onClick={handlePremiumUpgrade}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700"
                >
                  👑 Get Lifetime Pro
                </button>
              </div>
            </div>

            {/* Pro Features List */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
              <h4 className="font-bold text-gray-800 mb-4 text-lg">🔥 What You Unlock with PRO:</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span>Real market pricing (not guesses!)</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Live competitor analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-purple-600" />
                  <span>Video uploads (show items working)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-600" />
                  <span>Batch processing (10+ items)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-pink-600" />
                  <span>10 photos per item (vs 3)</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>CSV export for bulk upload</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-600" />
                  <span>Best timing recommendations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-600" />
                  <span>Premium templates library</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-green-800 mb-2">📊 Pro Users Report:</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">47%</div>
                  <div className="text-xs text-gray-600">Higher sales</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">3x</div>
                  <div className="text-xs text-gray-600">Faster listings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">£127</div>
                  <div className="text-xs text-gray-600">Avg extra/month</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowProModal(false)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Maybe later (but you're losing money...)
            </button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
              <span className="text-2xl">🌶️</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              SpicyLister
            </h1>
            {isPro && (
              <div className="flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full">
                <Crown className="w-4 h-4" />
                <span className="text-sm font-bold">PRO</span>
              </div>
            )}
            <span className="text-xs text-gray-500">v1.2</span>
          </div>
          
          <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-lg p-4 mb-4 border border-orange-200">
            <p className="text-xl font-bold text-gray-800 mb-2">
              🎯 Sell Your Clutter without a Stutter!
            </p>
            <p className="text-lg text-gray-700">
              Turn overwhelming piles into profit in 60 seconds flat! ⚡
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-600 mt-2">
              <span>✨ Built by neurospicy, for neurospicy</span>
              <span>•</span>
              <span>🚐 Funding van life adventures</span>
              <span>•</span>
              <span>💰 Free forever (Pro perks available)</span>
            </div>
          </div>
        </div>

        {/* Pro Status Banner */}
        {isPro ? (
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-300 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-purple-800">
                  PRO ACTIVE {supporterType === 'premium' ? '(Lifetime!)' : `until ${proExpiryDate?.toLocaleDateString()}`}
                </span>
                <span className="text-purple-700">All features unlocked!</span>
              </div>
              {userEmail && (
                <span className="text-sm text-purple-600">{userEmail}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-orange-500" />
                <span className="font-semibold text-gray-800">Get 1 MONTH FREE PRO!</span>
                <span className="text-gray-600">Buy me a coffee = Full Pro access 🎉</span>
              </div>
              <button
                onClick={() => setShowProModal(true)}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:from-yellow-600 hover:to-orange-600 font-semibold flex items-center gap-1"
              >
                <Coffee className="w-4 h-4" />
                Unlock Pro (£3)
              </button>
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">📸 Quick Tips:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Bright, clear photos = better AI results</li>
                <li>• Show front, back & any flaws honestly</li>
                <li>• {isPro ? "Pro: Upload videos to show items working!" : "Upgrade to Pro for video uploads"}</li>
                <li>• {isPro ? "Pro: Process up to 50 items in batch mode!" : "Free: 3 photos max per listing"}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Batch Mode Toggle (Pro) */}
        {isPro && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-purple-800">Batch Mode</span>
                <span className="text-purple-600 text-sm">(Process multiple items at once!)</span>
              </div>
              <button
                onClick={() => setBatchMode(!batchMode)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  batchMode 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {batchMode ? 'ON' : 'OFF'}
              </button>
            </div>
            {batchMode && (
              <div className="mt-3 text-sm text-purple-700">
                📦 Add items one by one, then process all at once! 
                Current batch: {batchItems.length} items
              </div>
            )}
          </div>
        )}

        {/* Media Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Image Upload */}
            <div className="border-2 border-dashed border-gray-200 hover:border-orange-300 transition-all duration-200 rounded-lg p-6">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer text-center"
              >
                <Camera className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-700 mb-1">
                  Upload Photos
                </h3>
                <p className="text-sm text-gray-500">
                  {isPro ? '10 photos max' : '3 photos max'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Click or drag & drop
                </p>
              </div>
            </div>

            {/* Video Upload (Pro) */}
            <div className={`border-2 border-dashed ${isPro ? 'border-gray-200 hover:border-purple-300' : 'border-gray-100'} transition-all duration-200 rounded-lg p-6 relative`}>
              {!isPro && (
                <div className="absolute inset-0 bg-white bg-opacity-90 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-700">Pro Feature</p>
                  </div>
                </div>
              )}
              
              <input
                ref={videoInputRef}
                type="file"
                multiple
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
                disabled={!isPro}
              />
              
              <div 
                onClick={() => isPro ? videoInputRef.current?.click() : setShowProModal(true)}
                className="cursor-pointer text-center"
              >
                <Video className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-700 mb-1">
                  Upload Videos
                </h3>
                <p className="text-sm text-gray-500">
                  Show it working!
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  2 videos max (100MB)
                </p>
              </div>
            </div>
          </div>

          {/* Media Previews */}
          {(images.length > 0 || videos.length > 0) && (
            <div className="mt-6">
              <h4 className="font-semibold text-gray-700 mb-3">Uploaded Media:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {images.map((image) => (
                  <div key={image.id} className="relative bg-gray-50 rounded-lg p-2">
                    <img 
                      src={image.preview} 
                      alt="Preview"
                      className="w-full h-24 object-cover rounded"
                    />
                    <button
                      onClick={() => removeMedia(image.id, 'image')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    >
                      ×
                    </button>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatFileSize(image.compressedSize)}
                    </div>
                  </div>
                ))}
                
                {videos.map((video) => (
                  <div key={video.id} className="relative bg-purple-50 rounded-lg p-2">
                    <div className="w-full h-24 bg-purple-100 rounded flex items-center justify-center">
                      <PlayCircle className="w-8 h-8 text-purple-500" />
                    </div>
                    <button
                      onClick={() => removeMedia(video.id, 'video')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    >
                      ×
                    </button>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatFileSize(video.size)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Extra Info */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Details (Optional but helpful!)
          </label>
          <textarea
            value={extraInfo}
            onChange={(e) => setExtraInfo(e.target.value)}
            placeholder="e.g., 'Vintage Leica from 1960s, leather case included, slight wear on strap'"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => analyzeMedia(false)}
            disabled={(images.length === 0 && videos.length === 0) || isAnalyzing || processingMedia}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {processingMedia ? (
              <>Processing Media... 🔄</>
            ) : isAnalyzing ? (
              <>AI Analyzing... 🤖</>
            ) : (
              <>✨ Generate Listing</>
            )}
          </button>

          {!isPro && (
            <button
              onClick={() => setShowProModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center gap-2"
            >
              <Crown className="w-5 h-5" />
              Get Pro
            </button>
          )}

          {isPro && batchMode && batchItems.length > 0 && (
            <button
              onClick={() => analyzeMedia(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
            >
              Process Batch ({batchItems.length})
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Results Display */}
        {currentResult && (
          <div className="space-y-6">
            {/* Title */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">📝 Listing Title</h3>
                <button
                  onClick={() => copyToClipboard(currentResult.title, 'title')}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
                >
                  {copiedSection === 'title' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copiedSection === 'title' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-gray-700 font-medium">{currentResult.title}</p>
              {currentResult.isPro && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentResult.keywords?.map((keyword, i) => (
                    <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">📋 Description</h3>
                <button
                  onClick={() => copyToClipboard(currentResult.description, 'description')}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
                >
                  {copiedSection === 'description' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copiedSection === 'description' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-gray-700 whitespace-pre-line">{currentResult.description}</p>
            </div>

            {/* Pricing & Condition */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">💰 Pricing & Condition</h3>
                {currentResult.isPro && <Crown className="w-5 h-5 text-yellow-500" />}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Condition</div>
                  <div className="font-semibold">{currentResult.condition}</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">
                    {currentResult.isPro ? '🎯 Start Price' : 'Starting Bid'}
                  </div>
                  <div className="font-semibold text-green-700">
                    £{currentResult.pricing?.startingBid}
                  </div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">
                    {currentResult.isPro ? '💎 Optimal BIN' : 'Buy It Now'}
                  </div>
                  <div className="font-semibold text-blue-700">
                    £{currentResult.pricing?.buyItNow}
                  </div>
                </div>
                
                {currentResult.isPro && currentResult.pricing?.marketAverage && (
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">📊 Market Avg</div>
                    <div className="font-semibold text-purple-700">
                      £{currentResult.pricing.marketAverage}
                    </div>
                    <div className="text-xs text-purple-600">
                      {currentResult.pricing.priceConfidence} confidence
                    </div>
                  </div>
                )}
              </div>
              
              {currentResult.isPro && currentResult.marketInsights && (
                <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">📈 Market Intelligence</h4>
                  <p className="text-sm text-yellow-700">{currentResult.marketInsights}</p>
                </div>
              )}
            </div>

            {/* Competitor Analysis (Pro) */}
            {currentResult.isPro && currentResult.competitorAnalysis && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-purple-800">Live Competitor Analysis</h3>
                </div>
                <div className="space-y-3">
                  {currentResult.competitorAnalysis.map((comp, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-purple-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-800">{comp.title}</div>
                          <div className="text-sm text-gray-600">{comp.condition}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-800">£{comp.price}</div>
                          <div className="text-xs text-gray-500">{comp.status}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Platform Tips */}
            {currentResult.platformTips && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 Platform Strategy</h3>
                <p className="text-gray-700">{currentResult.platformTips}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={searchEbayWithTitle}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Search className="w-4 h-4" />
                Search eBay
              </button>
              
              <button
                onClick={() => analyzeMedia(isPro)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                <RotateCcw className="w-4 h-4" />
                Regenerate
              </button>
              
              <button
                onClick={startNewListing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <MessageCircle className="w-4 h-4" />
                New Listing
              </button>
              
              {isPro && results.length > 0 && (
                <button
                  onClick={exportBatchResults}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <FileText className="w-4 h-4" />
                  Export CSV
                </button>
              )}
            </div>
          </div>
        )}

        {/* Batch Results (Pro) */}
        {isPro && results.length > 0 && (
          <div className="mt-6 bg-purple-50 rounded-xl border border-purple-200 p-6">
            <h3 className="text-lg font-semibold text-purple-800 mb-4">
              📦 Batch Results ({results.length} items processed)
            </h3>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="bg-white rounded-lg p-3 border border-purple-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Item {index + 1}</div>
                      <div className="text-sm text-gray-600 mt-1">{result.title}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-800">£{result.pricing?.buyItNow}</div>
                      <button
                        onClick={() => setCurrentResult(result)}
                        className="text-xs text-purple-600 hover:text-purple-800 mt-1"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 py-8 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="text-gray-600">SpicyLister - Free forever, Pro perks available!</span>
            <Heart className="w-5 h-5 text-red-500" />
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            Built with love from a 2013 Transit van touring UK and EU 🚐
            <br />
            Turning clutter into comedy tour fuel, one listing at a time!
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <a 
              href="https://buymeacoffee.com/chrispteemagician"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition-colors"
            >
              <Coffee className="w-4 h-4" />
              Buy Me a Coffee = 1 Month Pro!
            </a>
          </div>
          
          <p className="text-xs text-gray-400 mt-4">
            Made with ❤️ by Chris P Tee • Van Life + Comedy + Magic + Code
            <br />
            Version 1.2 • Real pricing data • Video support • Batch processing
          </p>
        </div>
      </div>

      {/* Pro Modal */}
      <ProModal />
    </div>
  );
}

export default SpicyLister;