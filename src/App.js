import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Sparkles, Coffee, Heart, CheckCircle, Copy, Download, MessageCircle, RotateCcw, Search, X, AlertCircle } from 'lucide-react';

const SpicyLister = () => {
  const [images, setImages] = useState([]);
  const [extraInfo, setExtraInfo] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedSection, setCopiedSection] = useState('');
  const [processingImages, setProcessingImages] = useState(false);
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

  const analyzeImages = async () => {
    if (images.length === 0) {
      setError("Upload at least one photo first! 📸");
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

      // Call your existing Netlify function
      const response = await fetch('/.netlify/functions/analyze-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          images: imageData,
          extraInfo: extraInfo.trim()
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

  const copyToClipboard = async (text, section = '') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
const downloadAsText = () => {
    if (!result) return;
    const content = `TITLE: ${result.title}\n\nDESCRIPTION:\n${result.description}\n\nCONDITION: ${result.condition}\n\nPRICING:\nStarting Bid: £${result.pricing.startingBid}\nBuy It Now: £${result.pricing.buyItNow}\n\nPLATFORM TIPS:\n${result.platformTips}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spicylister-listing.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      analyzeImages();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Hero Header - v1.1 Priority 1: Make Purpose Obvious */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="text-orange-500 w-8 h-8" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              SpicyLister
            </h1>
            <Sparkles className="text-red-500 w-8 h-8" />
          </div>
          
          {/* THE MAGIC TAGLINE - Priority 1 */}
          <div className="bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300 rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              🌶️ Sell Your Clutter without a Stutter
            </h2>
            <p className="text-lg text-gray-700 font-medium">
              For when your Brain says No
            </p>
            <p className="text-gray-600 mt-2">
              Zero stress selling on eBay, Vinted and More! • AI-powered listings in 60 seconds • Perfect for neurospicy brains ✨
            </p>
          </div>
        </div>

        <div className="space-y-6">
          
          {/* Image Upload Section - Optimized */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Camera className="w-6 h-6 text-orange-500" />
              Step 1: Snap Some Photos (Max 3)
            </h2>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
              <p className="text-blue-800 font-medium mb-1">📱 Pro Tips for Better Results:</p>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• <strong>Front view</strong> - clear shot of the main item</li>
                <li>• <strong>Back/detail view</strong> - labels, serial numbers, condition</li>
                <li>• <strong>Bonus shot</strong> - accessories, packaging, or damage</li>
                <li>• <strong>Good lighting</strong> helps the AI see details better!</li>
              </ul>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={processingImages || images.length >= 3}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mb-4 transform hover:scale-105 disabled:scale-100"
            >
              {processingImages ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Optimizing images...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  {images.length === 0 ? 'Choose Photos' : `Add More (${3 - images.length} left)`}
                </>
              )}
            </button>

            {images.length > 0 && (
              <div className="space-y-3">
                {images.map((image, index) => (
                  <div key={image.id} className="flex items-center gap-4 bg-gray-50 rounded-lg p-3">
                    <img
                      src={image.preview}
                      alt={`Upload ${index + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border-2 border-orange-200"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">Photo {index + 1}</p>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(image.originalSize)} → {formatFileSize(image.compressedSize)}
                        <span className="text-green-600 ml-2">
                          ✓ Optimized for AI
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => removeImage(image.id)}
                      className="bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Extra Info Section */}
          <div className="bg-yellow-50 rounded-2xl shadow-lg p-6 border border-yellow-200">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-yellow-600" />
              Step 2: Any Extra Details? (Optional)
            </h2>
            
            <textarea
              value={extraInfo}
              onChange={(e) => setExtraInfo(e.target.value)}
              placeholder="Tell us anything that helps with pricing or description:
• 'Paid £300 new, barely used'
• 'All original accessories included'  
• 'Really popular model, hard to find'
• 'Minor scratch on back but doesn't affect use'
• 'Bought from John Lewis last year'

Just chat naturally - we'll make it sound professional! ✨"
              className="w-full h-32 p-4 border border-yellow-300 rounded-lg resize-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
            
            {result && extraInfo && (
              <button
                onClick={regenerateWithInfo}
                className="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Update Listing with New Info
              </button>
            )}
          </div>

          {/* Generate Button */}
          <div className="text-center">
            <button
              onClick={analyzeImages}
              disabled={isAnalyzing || images.length === 0}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mx-auto transform hover:scale-105 disabled:scale-100"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  SpicyBrain is analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate My Listing! ✨
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Results Section - v1.1 Priority 2: Improved Copy Workflow */}
          {result && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  Your Listing is Ready! 🎉
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={searchEbayWithTitle}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    Search eBay
                  </button>
                  <button
                    onClick={downloadAsText}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download All
                  </button>
                  <button
                    onClick={startNewListing}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    New Listing
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Title Section - Individual Copy Button */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-orange-800">📝 Title</h3>
                    <button
                      onClick={() => copyToClipboard(result.title, 'title')}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedSection === 'title' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-gray-800 font-medium">{result.title}</p>
                </div>

                {/* Description Section */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-blue-800">📋 Description</h3>
                    <button
                      onClick={() => copyToClipboard(result.description, 'description')}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedSection === 'description' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="text-gray-800 whitespace-pre-line">{result.description}</div>
                </div>

                {/* Condition Section */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-yellow-800">🔍 Condition</h3>
                    <button
                      onClick={() => copyToClipboard(result.condition, 'condition')}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedSection === 'condition' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-gray-800">{result.condition}</p>
                </div>

                {/* Pricing Section */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-green-800">💰 Pricing</h3>
                    <button
                      onClick={() => copyToClipboard(`Starting Bid: £${result.pricing.startingBid}\nBuy It Now: £${result.pricing.buyItNow}`, 'pricing')}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedSection === 'pricing' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Starting Bid</p>
                      <p className="text-xl font-bold text-green-700">£{result.pricing.startingBid}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Buy It Now</p>
                      <p className="text-xl font-bold text-green-700">£{result.pricing.buyItNow}</p>
                    </div>
                  </div>
                </div>

                {/* Platform Tips Section */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-purple-800">💡 General Tips</h3>
                    <button
                      onClick={() => copyToClipboard(result.platformTips, 'tips')}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedSection === 'tips' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-gray-800">{result.platformTips}</p>
                </div>

                {/* Platform-Specific Tips - Optional Section */}
                <div className="bg-gray-50 rounded-lg p-4 border-t-4 border-gray-300">
                  <h3 className="font-semibold text-gray-700 mb-3">📱 Platform-Specific Tips (Optional)</h3>
                  <p className="text-sm text-gray-600 mb-4">Want platform-specific advice? Here's how to optimize for each:</p>
                  
                  <div className="space-y-3">
                    {/* eBay Tips */}
                    <div className="bg-blue-50 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-blue-800 text-sm">🛒 eBay</h4>
                        <button
                          onClick={() => copyToClipboard(`eBay Tips: Use both auction and Buy It Now for maximum visibility. Start auctions at £0.99 to attract bidders. Include "Free P&P" to rank higher in search. List on Sunday evenings for best visibility.`, 'ebay')}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedSection === 'ebay' ? '✓' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-blue-700 text-sm">Use both auction and Buy It Now for maximum visibility. Start auctions at £0.99 to attract bidders. Include "Free P&P" to rank higher in search. List on Sunday evenings for best visibility.</p>
                    </div>

                    {/* Vinted Tips */}
                    <div className="bg-pink-50 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-pink-800 text-sm">👗 Vinted</h4>
                        <button
                          onClick={() => copyToClipboard(`Vinted Tips: Be honest about condition - buyers appreciate transparency. Use all available photo slots. Offer bundle discounts for multiple items. Respond quickly to messages for better seller ratings.`, 'vinted')}
                          className="bg-pink-500 hover:bg-pink-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedSection === 'vinted' ? '✓' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-pink-700 text-sm">Be honest about condition - buyers appreciate transparency. Use all available photo slots. Offer bundle discounts for multiple items. Respond quickly to messages for better seller ratings.</p>
                    </div>

                    {/* Facebook Marketplace Tips */}
                    <div className="bg-green-50 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-green-800 text-sm">📘 Facebook Marketplace</h4>
                        <button
                          onClick={() => copyToClipboard(`Facebook Marketplace Tips: Include "collection only" or "can deliver locally" in title. Be specific about location. Join local selling groups for wider reach. Price competitively as buyers expect bargains.`, 'facebook')}
                          className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedSection === 'facebook' ? '✓' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-green-700 text-sm">Include "collection only" or "can deliver locally" in title. Be specific about location. Join local selling groups for wider reach. Price competitively as buyers expect bargains.</p>
                    </div>

                    {/* Depop Tips */}
                    <div className="bg-yellow-50 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-yellow-800 text-sm">✨ Depop</h4>
                        <button
                          onClick={() => copyToClipboard(`Depop Tips: Use trendy hashtags and keywords. Aesthetic photos perform better. Include brand names and style descriptors. Engage with the community by liking and following others.`, 'depop')}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedSection === 'depop' ? '✓' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-yellow-700 text-sm">Use trendy hashtags and keywords. Aesthetic photos perform better. Include brand names and style descriptors. Engage with the community by liking and following others.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Coffeeware Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Coffee className="w-6 h-6 text-orange-500" />
              <Heart className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Coffeeware & Community ☕</h3>
            <p className="text-gray-600 mb-4">
              SpicyLister is free forever! If it helps you declutter and get that dopamine hit, 
              consider supporting the Chris P Tee Community Comedy Magic Tour.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a
                href="https://www.comedymagic.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Comedy Magic Tour
              </a>
              <a
                href="https://buymeacoffee.com/chrispteemagician"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Buy Me a Coffee
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpicyLister;