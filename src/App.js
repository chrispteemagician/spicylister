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
  Heart,
  TrendingUp,
  Award
} from 'lucide-react';
import ImageCompressor from './ImageCompressor';

// Progress Tracker Component - Healthy Dopamine
const ProgressTracker = ({ currentStep, totalSteps }) => {
  const steps = [
    { id: 1, name: 'Add Photos', icon: Camera },
    { id: 2, name: 'AI Analysis', icon: Zap },
    { id: 3, name: 'Ready to List', icon: Award }
  ];

  return (
    <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isComplete = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          
          return (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                isComplete 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : isCurrent 
                    ? 'bg-orange-500 border-orange-500 text-white animate-pulse' 
                    : 'bg-gray-100 border-gray-300 text-gray-400'
              }`}>
                {isComplete ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isComplete 
                  ? 'text-green-600' 
                  : isCurrent 
                    ? 'text-orange-600' 
                    : 'text-gray-400'
              }`}>
                {step.name}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-4 transition-all duration-300 ${
                  isComplete ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Achievement Celebration Component
const AchievementCelebration = ({ achievement, onClose }) => {
  if (!achievement) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 text-center">
        <div className="text-6xl mb-4">{achievement.icon}</div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{achievement.title}</h3>
        <p className="text-gray-600 mb-4">{achievement.message}</p>
        <button
          onClick={onClose}
          className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600"
        >
          Keep Going!
        </button>
      </div>
    </div>
  );
};

// Selling Tips Modal Component
const SellingTipsModal = ({ tips, isOpen, onClose }) => {
  if (!isOpen || !tips) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Platform Tips</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 p-3 rounded-r">
            <h4 className="font-semibold text-blue-900">eBay</h4>
            <p className="text-sm text-blue-800">{tips.ebay}</p>
          </div>
          
          <div className="border-l-4 border-pink-500 pl-4 bg-pink-50 p-3 rounded-r">
            <h4 className="font-semibold text-pink-900">Vinted</h4>
            <p className="text-sm text-pink-800">{tips.vinted}</p>
          </div>
          
          <div className="border-l-4 border-green-500 pl-4 bg-green-50 p-3 rounded-r">
            <h4 className="font-semibold text-green-900">Facebook Marketplace</h4>
            <p className="text-sm text-green-800">{tips.facebook}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SpicyLister = () => {
  // Core State
  const [selectedImages, setSelectedImages] = useState([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [generatedListing, setGeneratedListing] = useState(null);
  const [error, setError] = useState('');
  
  // Progress & Achievement State
  const [currentStep, setCurrentStep] = useState(1);
  const [achievement, setAchievement] = useState(null);
  const [totalListingsCreated, setTotalListingsCreated] = useState(0);
  
  const [videos, setVideos] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [copiedSection, setCopiedSection] = useState('');
  const [showSellingTips, setShowSellingTips] = useState(false);
  
  // Pro/Premium State
  const [isPro, setIsPro] = useState(false);
  const [proExpiryDate, setProExpiryDate] = useState(null);
  const [showProModal, setShowProModal] = useState(false);
  
  // Refs
  const videoInputRef = useRef(null);

  // Load saved state on mount
  useEffect(() => {
    const savedPro = localStorage.getItem('spicylister_pro');
    const savedExpiry = localStorage.getItem('spicylister_pro_expiry');
    const savedListings = localStorage.getItem('spicylister_total_listings');
    
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
    
    if (savedListings) {
      setTotalListingsCreated(parseInt(savedListings));
    }
  }, []);

  // Multi-image handler with progress tracking
  const handleImagesProcessed = useCallback((processedImages) => {
    setSelectedImages(processedImages);
    
    if (processedImages.length > 0) {
      setCurrentStep(2);
      // Achievement for first image
      if (processedImages.length === 1 && totalListingsCreated === 0) {
        setAchievement({
          icon: '📸',
          title: 'First Photo Added!',
          message: 'Great start! AI can now analyze your item.'
        });
      }
    } else {
      setCurrentStep(1);
    }
  }, [totalListingsCreated]);

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

  // Generate listing with AI and progress tracking
  const generateListing = async () => {
    if (selectedImages.length === 0) {
      setError('Please add at least one image first!');
      return;
    }

    setIsGenerating(true);
    setError('');
    setCurrentStep(2);
    
    try {
      const result = await analyzeWithGemini(selectedImages, additionalInfo);
      
      setGeneratedListing({
        title: result.title || 'Generated Listing',
        description: result.description || '',
        price: result.estimatedPrice || '',
        condition: result.condition || '',
        category: result.category || '',
        tags: result.tags || [],
        sellingTips: result.sellingTips || null,
        isValuableFind: result.isValuableFind || false
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

      // Progress to step 3 and achievement
      setCurrentStep(3);
      const newTotal = totalListingsCreated + 1;
      setTotalListingsCreated(newTotal);
      localStorage.setItem('spicylister_total_listings', newTotal.toString());

      // Achievement celebrations
      if (newTotal === 1) {
        setAchievement({
          icon: '🎉',
          title: 'First Listing Created!',
          message: 'You\'ve turned clutter into potential cash!'
        });
      } else if (newTotal === 5) {
        setAchievement({
          icon: '🔥',
          title: 'Serial Seller!',
          message: 'Five listings created! You\'re on fire!'
        });
      } else if (newTotal % 10 === 0) {
        setAchievement({
          icon: '🏆',
          title: 'Listing Legend!',
          message: `${newTotal} listings created! You're unstoppable!`
        });
      }

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

  // Simplified Coffee Support
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
    
    localStorage.setItem('spicylister_pro', 'true');
    localStorage.setItem('spicylister_pro_expiry', expiryDate.toISOString());
    
    window.open('https://buymeacoffee.com/chrispteemagician', '_blank');
    setShowProModal(false);
    
    setTimeout(() => {
      alert(`Pro activated! Valid until ${expiryDate.toLocaleDateString()}. Thank you for supporting the van life dream!`);
    }, 500);
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
    setShowSellingTips(false);
    setCurrentStep(1);
  };

  // Simplified Pro Modal - Just Coffee Support
  const ProModal = () => {
    if (!showProModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-lg w-full p-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Coffee className="w-12 h-12 text-orange-500" />
              <Heart className="w-8 h-8 text-red-500" />
            </div>
            
            <h3 className="text-3xl font-bold text-gray-900 mb-3">
              Love SpicyLister?
            </h3>
            
            <p className="text-lg text-gray-700 mb-6">
              Buy Chris a coffee and get 1 month Pro as a thank you!
            </p>

            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Coffee className="w-8 h-8 text-orange-600" />
                <Gift className="w-6 h-6 text-red-500" />
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-2">£3</div>
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold mb-3">
                1 MONTH PRO INCLUDED!
              </div>
              <button
                onClick={handleCoffeeSupport}
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600"
              >
                Buy Chris a Coffee ☕
              </button>
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
          </div>
          
          <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-lg p-4 mb-4 border border-orange-200">
            <p className="text-xl font-bold text-gray-800 mb-2">
              🎯 Sell Your Clutter without a Stutter!
            </p>
            <p className="text-lg text-gray-700">
              Turn overwhelming piles into profit in 60 seconds flat!
            </p>
            {totalListingsCreated > 0 && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  {totalListingsCreated} listing{totalListingsCreated !== 1 ? 's' : ''} created!
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Tracker */}
        <ProgressTracker currentStep={currentStep} totalSteps={3} />

        {/* Pro Status Banner */}
        {isPro ? (
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-300 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-purple-800">
                  PRO ACTIVE until {proExpiryDate?.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-orange-500" />
                <span className="font-semibold text-gray-800">Love SpicyLister? Buy Chris a coffee!</span>
              </div>
              <button
                onClick={() => setShowProModal(true)}
                className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:from-orange-600 hover:to-yellow-600 font-semibold flex items-center gap-1"
              >
                <Coffee className="w-4 h-4" />
                Get 1 Month Pro (£3)
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {/* Image Upload Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Add Photos
              {selectedImages.length > 0 && (
                <CheckCircle className="w-5 h-5 ml-2 text-green-500" />
              )}
            </h2>
            
            <ImageCompressor 
              onImagesProcessed={handleImagesProcessed}
              maxImages={isPro ? 10 : 3}
            />
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
              {/* Treasure Alert */}
              {(currentResult?.isValuableFind || generatedListing?.isValuableFind) && (
                <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-400 rounded-xl p-6">
                  <div className="text-center">
                    <div className="text-4xl mb-3">🏆✨</div>
                    <h3 className="text-2xl font-bold text-amber-800 mb-2">
                      Treasure Found!
                    </h3>
                    <p className="text-amber-700 text-lg">
                      This could be worth serious money! Research it further before listing.
                    </p>
                  </div>
                </div>
              )}

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