import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Sparkles, Coffee, Heart, CheckCircle, Copy, Download, MessageCircle, RotateCcw, Search, X, AlertCircle, Crown, TrendingUp } from 'lucide-react';

const SpicyLister = () => {
  const [images, setImages] = useState([]);
  const [extraInfo, setExtraInfo] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedSection, setCopiedSection] = useState('');
  const [processingImages, setProcessingImages] = useState(false);
  const [isPremium, setIsPremium] = useState(false); // Premium state
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const fileInputRef = useRef(null);

  // Smart image compression optimized for AI recognition
  const compressImage = useCallback((file, maxDimension = 1024, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Calculate optimal dimensions (keeping aspect ratio)
        const maxSize = Math.max(width, height);
        if (maxSize > maxDimension) {
          const scale = maxDimension / maxSize;
          width *= scale;
          height *= scale;
        }

        canvas.width = width;
        canvas.height = height;

        // Use high-quality image rendering for better AI recognition
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with optimal quality for AI + file size
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

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    // Neurospicy-friendly limits: max 3 images (front, back, detail)
    if (images.length + files.length > 3) {
      setError("Max 3 photos please! 📸 (Perfect for front, back & condition shots)");
      return;
    }

    setProcessingImages(true);
    setError(null);

    try {
      const imagePromises = files.map(async (file) => {
        // Check if it's actually an image
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} isn't an image file 🤔`);
        }

        // Generous size limit for phone photos (20MB raw)
        if (file.size > 20 * 1024 * 1024) {
          throw new Error(`${file.name} is huge! Try a smaller photo 📱`);
        }

        // Compress for optimal AI recognition + speed
        const compressedFile = await compressImage(file);

        // Final size check (should be under 2MB after compression)
        if (compressedFile.size > 2 * 1024 * 1024) {
          throw new Error(`${file.name} is still too large after compression`);
        }

        // Create preview URL
        const previewUrl = URL.createObjectURL(compressedFile);

        return {
          file: compressedFile,
          originalName: file.name,
          originalSize: file.size,
          compressedSize: compressedFile.size,
          preview: previewUrl,
          id: Date.now() + Math.random() // Unique ID for React keys
        };
      });

      const newImages = await Promise.all(imagePromises);
      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessingImages(false);
    }
  };

  const removeImage = (id) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove?.preview) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const analyzeImages = async (usePremium = false) => {
    if (images.length === 0) {
      setError("Upload at least one photo first! 📸");
      return;
    }

    // If premium features requested but not paid, show modal
    if (usePremium && !isPremium) {
      setShowPremiumModal(true);
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Convert optimized images to base64 for Gemini
      const imageData = await Promise.all(
        images.map(async (img) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target.result.split(',')[1];
              resolve({
                data: base64,
                mimeType: img.file.type
              });
            };
            reader.readAsDataURL(img.file);
          });
        })
      );

      // Call your existing Netlify function with premium flag
      const response = await fetch('/.netlify/functions/analyze-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: imageData,
          extraInfo: extraInfo.trim(),
          isPremium: usePremium || isPremium // Pass premium status
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed (${response.status})`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(`Hmm, that didn't work: ${err.message} 😅`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePayPalSuccess = () => {
    setIsPremium(true);
    setShowPremiumModal(false);
    // Store in localStorage for persistence
    localStorage.setItem('spicylister_premium', 'true');
    // Auto-run premium analysis
    analyzeImages(true);
  };

  // Check for premium status on load
  React.useEffect(() => {
    const premiumStatus = localStorage.getItem('spicylister_premium');
    if (premiumStatus === 'true') {
      setIsPremium(true);
    }
  }, []);

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
    if (result?.title) {
      const searchUrl = `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(result.title)}`;
      window.open(searchUrl, '_blank');
    }
  };

  const regenerateWithInfo = () => {
    if (images.length > 0) {
      analyzeImages(isPremium);
    }
  };

  const startNewListing = () => {
    // Clean up image URLs to prevent memory leaks
    images.forEach(img => {
      if (img.preview) URL.revokeObjectURL(img.preview);
    });
    setImages([]);
    setExtraInfo('');
    setResult(null);
    setError(null);
    setCopiedSection('');
  };

  // Premium Modal Component
  const PremiumModal = () => (
    showPremiumModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <div className="text-center">
            <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Go Premium! 🚀</h3>
            <p className="text-gray-600 mb-6">
              Unlock research-based pricing, competitor analysis, and market insights for just £1.99!
            </p>
            
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-800 mb-2">Premium Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1 text-left">
                <li>✅ Real eBay market research pricing</li>
                <li>✅ Competitor analysis & insights</li>
                <li>✅ Optimal listing timing advice</li>
                <li>✅ Advanced condition assessment</li>
                <li>✅ Priority AI processing</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPremiumModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Maybe Later
              </button>
              <a
                href="https://paypal.me/chrisptee/1.99"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg hover:from-yellow-600 hover:to-orange-600 text-center"
                onClick={handlePayPalSuccess}
              >
                Pay £1.99
              </a>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              One-time payment • Lifetime access • 30-day money-back guarantee
            </p>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-orange-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              SpicyLister
            </h1>
            {isPremium && <Crown className="w-6 h-6 text-yellow-500" />}
            <Sparkles className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-xl text-gray-600 mb-2">For when your Brain says No</p>
          <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
            <span>Zero stress selling on eBay, Vinted and More!</span>
            <span>•</span>
            <span>AI-powered listings in 60 seconds</span>
            <span>•</span>
            <span>Perfect for neurospicy brains ✨</span>
          </div>
        </div>

        {/* Premium Status Banner */}
        {isPremium ? (
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-yellow-800">Premium Active!</span>
              <span className="text-yellow-700">Research-based pricing enabled ✨</span>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-800">Want research-based pricing?</span>
              </div>
              <button
                onClick={() => setShowPremiumModal(true)}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:from-yellow-600 hover:to-orange-600"
              >
                Go Premium £1.99
              </button>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">📱 Pro Tips for Better Results:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Clean, bright photos work best</li>
                <li>• Include front, back, and any damage/wear</li>
                <li>• Add any extra details you know (brand, age, condition)</li>
                {isPremium && <li>• Premium: Get real market research & competitor pricing! 🔥</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-dashed border-gray-200 hover:border-orange-300 transition-all duration-200 mb-6">
          <div className="p-8">
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
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {images.length === 0 ? 'Upload Your Item Photos' : `${images.length}/3 Photos Added`}
              </h3>
              <p className="text-gray-500">
                Click here or drag & drop up to 3 images
              </p>
              <p className="text-xs text-gray-400 mt-2">
                JPG, PNG up to 20MB each • We'll optimize them for you
              </p>
            </div>
          </div>
        </div>

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {images.map((image, index) => (
              <div key={image.id} className="relative bg-white rounded-lg border border-gray-200 p-3">
                <img 
                  src={image.preview} 
                  alt={`Photo ${index + 1}`}
                  className="w-full h-32 object-cover rounded-md mb-2"
                />
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    <div>Photo {index + 1}</div>
                    <div>{formatFileSize(image.originalSize)} → {formatFileSize(image.compressedSize)}</div>
                    <div className="text-green-600">✓ Optimized for AI</div>
                  </div>
                  <button
                    onClick={() => removeImage(image.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Extra Info */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Know anything extra about this item? (Optional but helpful!)
          </label>
          <textarea
            value={extraInfo}
            onChange={(e) => setExtraInfo(e.target.value)}
            placeholder="e.g., 'Vintage camera from the 1970s, working condition, slight wear on leather'"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* Analyze Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => analyzeImages(false)}
            disabled={images.length === 0 || isAnalyzing || processingImages}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {processingImages ? (
              <>Processing Images... 🔄</>
            ) : isAnalyzing ? (
              <>Analyzing with AI... 🤖</>
            ) : (
              <>✨ Generate Listing (Free)</>
            )}
          </button>

          {!isPremium && (
            <button
              onClick={() => analyzeImages(true)}
              disabled={images.length === 0 || isAnalyzing || processingImages}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
            >
              <Crown className="w-5 h-5" />
              Premium £1.99
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Title */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">📝 Listing Title</h3>
                <button
                  onClick={() => copyToClipboard(result.title, 'title')}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
                >
                  {copiedSection === 'title' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copiedSection === 'title' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-gray-700 font-medium">{result.title}</p>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">📋 Description</h3>
                <button
                  onClick={() => copyToClipboard(result.description, 'description')}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
                >
                  {copiedSection === 'description' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copiedSection === 'description' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-gray-700 whitespace-pre-line">{result.description}</p>
            </div>

            {/* Condition & Pricing */}
            {result.condition && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">🔍 Condition & Pricing</h3>
                  {result.isPremium && <Crown className="w-5 h-5 text-yellow-500" />}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Condition</div>
                    <div className="font-semibold">{result.condition}</div>
                  </div>
                  {result.pricing && (
                    <>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">
                          {result.isPremium ? 'Market Price' : 'Starting Bid'}
                        </div>
                        <div className="font-semibold text-green-700">
                          £{result.pricing.startingBid}
                          {result.isPremium && <span className="text-xs ml-1">(researched)</span>}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">
                          {result.isPremium ? 'Premium Price' : 'Buy It Now'}
                        </div>
                        <div className="font-semibold text-blue-700">
                          £{result.pricing.buyItNow}
                          {result.isPremium && <span className="text-xs ml-1">(optimized)</span>}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {result.isPremium && result.marketInsights && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">📊 Market Insights</h4>
                    <p className="text-sm text-yellow-700">{result.marketInsights}</p>
                  </div>
                )}
              </div>
            )}

            {/* Premium Competitor Analysis */}
            {result.isPremium && result.competitorAnalysis && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-yellow-800">🏆 Competitor Analysis</h3>
                </div>
                <div className="space-y-3">
                  {result.competitorAnalysis.map((comp, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-yellow-200">
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
            {result.platformTips && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 Platform Tips</h3>
                <p className="text-gray-700">{result.platformTips}</p>
              </div>
            )}

            {/* Platform Specific Advice */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🚀 Platform-Specific Advice</h3>
              <p className="text-gray-600 mb-6">Want platform-specific advice? Here's how to optimize for each:</p>
              
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-blue-700 mb-2">📦 eBay</h4>
                  <p className="text-sm text-gray-600">Use both auction and Buy It Now for maximum visibility. Start auctions at £0.99 to attract bidders. Include "Free P&P" to rank higher in search. List on Sunday evenings for best visibility.</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-purple-700 mb-2">👗 Vinted</h4>
                  <p className="text-sm text-gray-600">Be honest about condition - buyers appreciate transparency. Use all available photo slots. Offer bundle discounts for multiple items. Respond quickly to messages for better seller ratings.</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-green-700 mb-2">📍 Facebook Marketplace</h4>
                  <p className="text-sm text-gray-600">Include "collection only" or "can deliver locally" in title. Be specific about location. Join local selling groups for wider reach. Price competitively as buyers expect bargains.</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-pink-700 mb-2">📸 Depop</h4>
                  <p className="text-sm text-gray-600">Use trendy hashtags and keywords. Aesthetic photos perform better. Include brand names and style descriptors. Engage with the community by liking and following others.</p>
                </div>
              </div>
            </div>

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
                onClick={regenerateWithInfo}
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
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 py-8 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="text-gray-600">SpicyLister is free forever!</span>
            <Heart className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Built by neurospicy, for neurospicy - turning clutter into cash, one dopamine hit at a time! 🌶️
          </p>
          <div className="flex items-center justify-center gap-4">
            <a 
              href="https://buymeacoffee.com/chrispteemagician"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition-colors"
            >
              <Coffee className="w-4 h-4" />
              Support the Tour
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Made with ❤️ by Chris P Tee • Van Life + Comedy + Magic + Code
          </p>
        </div>
      </div>

      {/* Premium Modal */}
      <PremiumModal />
    </div>
  );
};

export default SpicyLister;