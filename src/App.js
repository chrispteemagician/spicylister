import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  AlertTriangle,
  Crown,
  Rocket,
  Zap,
  Coffee,
  Gift,
  Shield,
  Video,
  Camera,
  PlayCircle,
  CheckCircle,
  Copy,
  RotateCcw,
  MessageCircle,
  Heart
} from 'lucide-react';
import ImageCompressor from './ImageCompressor';

const SpicyLister = () => {
  // Core State
  const [selectedImages, setSelectedImages] = useState([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [generatedListing, setGeneratedListing] = useState(null);
  const [error, setError] = useState('');
  
  const [videos, setVideos] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [copiedSection, setCopiedSection] = useState('');
  
  // Pro/Premium State
  const [isPro, setIsPro] = useState(false);
  const [proExpiryDate, setProExpiryDate] = useState(null);
  const [showProModal, setShowProModal] = useState(false);
  const [supporterType, setSupporterType] = useState(null);
  
  // Refs
  const videoInputRef = useRef(null);

  // Load saved state on mount
  useEffect(() => {
    const savedPro = localStorage.getItem('spicylister_pro');
    const savedExpiry = localStorage.getItem('spicylister_pro_expiry');
    const savedSupporter = localStorage.getItem('spicylister_supporter_type');
    
    if (savedPro === 'true' && savedExpiry) {
      const expiryDate = new Date(savedExpiry);
      if (expiryDate > new Date()) {
        setIsPro(true);
        setProExpiryDate(expiryDate);
      } else {
        localStorage.removeItem('spicylister_pro');
        localStorage.removeItem('spicylister_pro_expiry');
      }
    }
    
    if (savedSupporter) setSupporterType(savedSupporter);
  }, []);

  // Multi-image handler
  const handleImagesProcessed = useCallback((processedImages) => {
    setSelectedImages(processedImages);
    console.log('Images processed:', processedImages.length);
  }, []);

  // Analyze images with Gemini
  const analyzeWithGemini = async (images, additionalContext = '') => {
    setIsProcessingImages(true);
    
    try {
      const imageData = await Promise.all(
        images.map(async (img) => {
          const arrayBuffer = await img.compressedBlob.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          
          return {
            inlineData: {
              data: base64,
              mimeType: 'image/jpeg'
            }
          };
        })
      );

      const response = await fetch('/.netlify/functions/analyze-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: imageData,
          additionalContext,
          imageLabels: images.map(img => img.label)
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Error analyzing images:', error);
      throw error;
    } finally {
      setIsProcessingImages(false);
    }
  };

  // Generate listing with AI
  const generateListing = async () => {
    if (selectedImages.length === 0) {
      setError('Please add at least one image first!');
      return;
    }

    setIsGenerating(true);
    setError('');
    
    try {
      const result = await analyzeWithGemini(selectedImages, additionalInfo);
      
      setGeneratedListing({
        title: result.title || 'Generated Listing',
        description: result.description || '',
        price: result.estimatedPrice || '',
        condition: result.condition || '',
        category: result.category || '',
        tags: result.tags || []
      });

      // Also set as current result for existing UI
      setCurrentResult({
        ...result,
        isPro: isPro,
        pricing: {
          startingBid: "0.99",
          buyItNow: result.estimatedPrice?.replace(/[£$]/g, '') || "99.99",
          marketAverage: null,
          priceConfidence: null
        }
      });

    } catch (error) {
      setError(`Failed to generate listing: ${error.message}`);
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
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
    }
  };

  // Remove video
  const removeVideo = (id) => {
    setVideos(prev => {
      const videoToRemove = prev.find(vid => vid.id === id);
      if (videoToRemove?.preview) URL.revokeObjectURL(videoToRemove.preview);
      return prev.filter(vid => vid.id !== id);
    });
  };

  // Handle Coffee Supporter (1 month Pro)
  const handleCoffeeSupport = async () => {
    const email = prompt("Enter your email for 1 MONTH FREE PRO + updates:");
    if (!email || !email.includes('@')) {
      alert("Please enter a valid email to unlock Pro features");
      return;
    }
    
    localStorage.setItem('spicylister_email', email);
    
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    
    setIsPro(true);
    setProExpiryDate(expiryDate);
    setSupporterType('coffee');
    
    localStorage.setItem('spicylister_pro', 'true');
    localStorage.setItem('spicylister_pro_expiry', expiryDate.toISOString());
    localStorage.setItem('spicylister_supporter_type', 'coffee');
    
    window.open('https://buymeacoffee.com/chrispteemagician', '_blank');
    setShowProModal(false);
    
    setTimeout(() => {
      alert(`Pro activated! Valid until ${expiryDate.toLocaleDateString()}. Thank you for supporting the van life dream!`);
    }, 500);
  };

  // Handle Premium Upgrade (Lifetime)
  const handlePremiumUpgrade = async () => {
    const email = prompt("Enter your email for LIFETIME PRO access:");
    if (!email || !email.includes('@')) {
      alert("Please enter a valid email");
      return;
    }
    
    localStorage.setItem('spicylister_email', email);
    
    window.open('https://paypal.me/chrisptee/9.99', '_blank');
    
    setTimeout(() => {
      setIsPro(true);
      setProExpiryDate(null);
      setSupporterType('premium');
      localStorage.setItem('spicylister_pro', 'true');
      localStorage.setItem('spicylister_pro_expiry', 'lifetime');
      localStorage.setItem('spicylister_supporter_type', 'premium');
      setShowProModal(false);
      setTimeout(() => {
        alert(`Lifetime Pro activated! Thank you for supporting the van life dream!`);
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
    videos.forEach(vid => {
      if (vid.preview) URL.revokeObjectURL(vid.preview);
    });
    
    setSelectedImages([]);
    setVideos([]);
    setAdditionalInfo('');
    setCurrentResult(null);
    setGeneratedListing(null);
    setError('');
    setCopiedSection('');
  };

  // Pro Modal Component
  const ProModal = () => {
    if (!showProModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown className="w-12 h-12 text-yellow-500" />
              <Rocket className="w-10 h-10 text-purple-500" />
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
            
            <h3 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Unlock SpicyLister PRO!
            </h3>
            
            <p className="text-xl text-gray-700 font-semibold mb-6">
              Stop leaving money on the table - Get REAL pricing data!
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
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
                <button
                  onClick={handleCoffeeSupport}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-yellow-600 hover:to-yellow-700"
                >
                  Buy Coffee = 1 Month Pro
                </button>
              </div>

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
                <button
                  onClick={handlePremiumUpgrade}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700"
                >
                  Get Lifetime Pro
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowProModal(false)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    );
  };

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
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-orange-500" />
                <span className="font-semibold text-gray-800">Get 1 MONTH FREE PRO!</span>
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

        {/* Image Upload Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Add Photos
            </h2>
            
            <ImageCompressor 
              onImagesProcessed={handleImagesProcessed}
              maxImages={isPro ? 10 : 3}
            />
            
            {selectedImages.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 text-green-800">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} ready for AI analysis
                  </span>
                </div>
                <div className="text-xs text-green-700 mt-1">
                  Total size: {selectedImages.reduce((acc, img) => acc + parseFloat(img.compressedSize), 0).toFixed(1)}KB
                </div>
              </div>
            )}
          </div>

          {/* Video Upload (Pro) */}
          {isPro && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Video className="w-5 h-5 mr-2" />
                Add Videos (Pro Feature)
              </h2>
              
              <div className="border-2 border-dashed border-purple-200 hover:border-purple-300 rounded-lg p-6">
                <input
                  ref={videoInputRef}
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                
                <div 
                  onClick={() => videoInputRef.current?.click()}
                  className="cursor-pointer text-center"
                >
                  <Video className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-700 mb-1">Upload Videos</h3>
                  <p className="text-sm text-gray-500">Show it working! (Max 2 videos, 100MB each)</p>
                </div>
              </div>

              {videos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {videos.map((video) => (
                    <div key={video.id} className="relative bg-purple-50 rounded-lg p-2">
                      <div className="w-full h-24 bg-purple-100 rounded flex items-center justify-center">
                        <PlayCircle className="w-8 h-8 text-purple-500" />
                      </div>
                      <button
                        onClick={() => removeVideo(video.id)}
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
              )}
            </div>
          )}
          
          {/* Additional Details */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Additional Details (Optional)</h2>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Any extra details about condition, history, etc."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows="3"
            />
          </div>
          
          {/* Generate Button */}
          <button
            onClick={generateListing}
            disabled={selectedImages.length === 0 || isProcessingImages || isGenerating}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center space-x-2">
                <Zap className="w-5 h-5 animate-spin" />
                <span>AI Analyzing Images...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Generate Listing with AI</span>
              </div>
            )}
          </button>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Error</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          )}

          {/* Results Display */}
          {(currentResult || generatedListing) && (
            <div className="space-y-6">
              {/* Title */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">📝 Listing Title</h3>
                  <button
                    onClick={() => copyToClipboard((currentResult?.title || generatedListing?.title), 'title')}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
                  >
                    {copiedSection === 'title' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copiedSection === 'title' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-gray-700 font-medium">{currentResult?.title || generatedListing?.title}</p>
              </div>

              {/* Description */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">📋 Description</h3>
                  <button
                    onClick={() => copyToClipboard((currentResult?.description || generatedListing?.description), 'description')}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
                  >
                    {copiedSection === 'description' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copiedSection === 'description' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-gray-700 whitespace-pre-line">{currentResult?.description || generatedListing?.description}</p>
              </div>

              {/* Pricing & Condition */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">💰 Pricing & Condition</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Condition</div>
                    <div className="font-semibold">{currentResult?.condition || generatedListing?.condition}</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Estimated Price</div>
                    <div className="font-semibold text-green-700">
                      {currentResult?.pricing?.buyItNow ? `£${currentResult.pricing.buyItNow}` : generatedListing?.price}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Category</div>
                    <div className="font-semibold text-blue-700">
                      {currentResult?.category || generatedListing?.category}
                    </div>
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
                  onClick={generateListing}
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
        </div>

        {/* Footer */}
        <div className="text-center mt-12 py-8 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="text-gray-600">SpicyLister - Free forever, Pro perks available!</span>
            <Heart className="w-5 h-5 text-red-500" />
          </div>
          
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
            Made with love by Chris P Tee • Van Life + Comedy + Magic + Code
            <br />
            Version 1.2 • Multi-image support • Auto-compression • Real AI analysis
          </p>
        </div>

        {/* Pro Modal */}
        <ProModal />
      </div>
    </div>
  );
};

function App() {
  return <SpicyLister />;
}

export default App;