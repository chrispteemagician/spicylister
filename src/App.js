import React, { useState, useEffect, useCallback } from 'react';
import { SpicyListerGlobalFeature } from './components/GlobalFeature';
import { 
  Upload, 
  Sparkles, 
  Copy, 
  CheckCircle, 
  X, 
  Zap, 
  Crown, 
  ImageIcon,
  Camera,
  RotateCw,
  Trash2,
  Download,
  Star,
  Gift,
  Clock,
  TrendingUp,
  Users,
  Target,
  Award,
  Heart,
  Smile
} from 'lucide-react';

// Constants
const API_ENDPOINT = '/.netlify/functions/generateListing';
const MAX_FREE_LISTINGS = 5;
const MAX_PRO_LISTINGS = 200;
const PRO_PRICE = 4.99;

// Utility function for copying text
const copyToClipboard = async (text, sectionName) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  }
};

// Image processing utilities
const compressImage = (file, maxSizeMB = 1) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const maxWidth = 800;
      const maxHeight = 600;
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Image Upload Component
const ImageUpload = ({ onImagesProcessed, isGenerating }) => {
  const [dragActive, setDragActive] = useState(false);
  const [images, setImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = async (files) => {
    setIsProcessing(true);
    const processedImages = [];
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        continue;
      }
      
      try {
        const compressedFile = await compressImage(file);
        const reader = new FileReader();
        
        await new Promise((resolve) => {
          reader.onload = (e) => {
            processedImages.push({
              id: Date.now() + Math.random(),
              file: compressedFile,
              preview: e.target.result,
              name: file.name
            });
            resolve();
          };
          reader.readAsDataURL(compressedFile);
        });
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }
    
    const newImages = [...images, ...processedImages];
    setImages(newImages);
    onImagesProcessed(newImages);
    setIsProcessing(false);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const removeImage = (id) => {
    const newImages = images.filter(img => img.id !== id);
    setImages(newImages);
    onImagesProcessed(newImages);
  };

  return (
    <div className="space-y-4">
      <div 
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
          dragActive 
            ? 'border-orange-400 bg-orange-50' 
            : 'border-gray-300 hover:border-orange-300 hover:bg-gray-50'
        } ${isGenerating ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isGenerating}
        />
        
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-orange-100 rounded-full">
            <Camera className="w-8 h-8 text-orange-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Add Your Items
            </h3>
            <p className="text-gray-600 mb-4">
              Drag & drop photos or click to browse
            </p>
            <p className="text-sm text-gray-500">
              PNG, JPG up to 10MB each
            </p>
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <img
                src={image.preview}
                alt={image.name}
                className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
              />
              <button
                onClick={() => removeImage(image.id)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isGenerating}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isProcessing && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2 text-orange-600">
            <RotateCw className="w-4 h-4 animate-spin" />
            <span>Processing images...</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Progress Tracker Component
const ProgressTracker = ({ currentStep, totalListings }) => {
  const steps = [
    { id: 1, name: 'Add Photos', icon: Camera },
    { id: 2, name: 'Generate Listing', icon: Sparkles },
    { id: 3, name: 'Copy & List', icon: Copy }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Your Progress</h3>
        <div className="text-sm text-gray-600">
          <Star className="w-4 h-4 inline mr-1 text-yellow-500" />
          {totalListings} listings created
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isComplete = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                isComplete 
                  ? 'bg-green-500 border-green-500' 
                  : isCurrent 
                    ? 'bg-orange-500 border-orange-500' 
                    : 'bg-gray-100 border-gray-300'
              }`}>
                {isComplete ? <CheckCircle className="w-5 h-5 text-white" /> : <Icon className="w-5 h-5 text-white" />}
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

// Main SpicyLister Component
const SpicyLister = () => {
  // Core State
  const [selectedImages, setSelectedImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [generatedListing, setGeneratedListing] = useState(null);
  const [error, setError] = useState('');
  
  // Progress State
  const [currentStep, setCurrentStep] = useState(1);
  const [totalListingsCreated, setTotalListingsCreated] = useState(0);
  
  const [copiedSection, setCopiedSection] = useState('');
  const [showProActivation, setShowProActivation] = useState(false);
  
  // Pro State
  const [isPro, setIsPro] = useState(false);
  const [proExpiryDate, setProExpiryDate] = useState(null);
  const [showProModal, setShowProModal] = useState(false);

  // Load saved state
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

  // Handle images processed
  const handleImagesProcessed = useCallback((processedImages) => {
    setSelectedImages(processedImages);
    
    if (processedImages.length > 0) {
      setCurrentStep(2);
    } else {
      setCurrentStep(1);
    }
  }, []);

  // Generate listing
  const generateListing = async () => {
    if (selectedImages.length === 0) {
      setError('Please add at least one image first!');
      return;
    }

    // Check limits
    if (!isPro && totalListingsCreated >= MAX_FREE_LISTINGS) {
      setShowProModal(true);
      return;
    }

    if (isPro && totalListingsCreated >= MAX_PRO_LISTINGS) {
      setError('You\'ve reached your Pro limit of 200 listings this month!');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedListing(null);

    try {
      const formData = new FormData();
      
      selectedImages.forEach((image, index) => {
        formData.append(`image${index}`, image.file);
      });
      
      if (additionalInfo.trim()) {
        formData.append('additionalInfo', additionalInfo.trim());
      }

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedListing(data);
      setCurrentStep(3);
      
      // Update listings count
      const newCount = totalListingsCreated + 1;
      setTotalListingsCreated(newCount);
      localStorage.setItem('spicylister_total_listings', newCount.toString());

    } catch (error) {
      console.error('Error generating listing:', error);
      setError(error.message || 'Failed to generate listing. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy function
  const handleCopy = async (text, sectionName) => {
    const success = await copyToClipboard(text, sectionName);
    if (success) {
      setCopiedSection(sectionName);
      setTimeout(() => setCopiedSection(''), 2000);
    }
  };

  // Pro activation
  const activatePro = () => {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    
    setIsPro(true);
    setProExpiryDate(expiryDate);
    setShowProModal(false);
    
    localStorage.setItem('spicylister_pro', 'true');
    localStorage.setItem('spicylister_pro_expiry', expiryDate.toISOString());
  };

  // Start over
  const startOver = () => {
    setSelectedImages([]);
    setGeneratedListing(null);
    setAdditionalInfo('');
    setError('');
    setCurrentStep(1);
    setCopiedSection('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-orange-500 p-3 rounded-full mr-3">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">
              🌶️ SpicyLister
            </h1>
            {isPro && (
              <Crown className="w-6 h-6 text-yellow-500 ml-2" />
            )}
          </div>
          
          <p className="text-xl text-gray-600 mb-2">
            Turn your clutter into cash with AI magic
          </p>
          <p className="text-sm text-gray-500">
            Perfect for ADHD brains - no overwhelm, just results! ✨
          </p>
        </div>

        {/* Global Feature */}
        <div className="mb-8">
          <SpicyListerGlobalFeature />
        </div>

        {/* Pro Status */}
        {isPro && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Crown className="w-5 h-5 mr-2" />
                <span className="font-semibold">Pro Active</span>
              </div>
              <div className="text-sm">
                {totalListingsCreated}/{MAX_PRO_LISTINGS} listings • 
                Expires {proExpiryDate?.toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        {/* Progress Tracker */}
        <ProgressTracker currentStep={currentStep} totalListings={totalListingsCreated} />

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Step 1: Add Your Items
              </h2>
              <ImageUpload 
                onImagesProcessed={handleImagesProcessed}
                isGenerating={isGenerating}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Step 2: Generate Your Listing
              </h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Add any extra details about condition, brand, size, etc..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows="3"
                  disabled={isGenerating}
                />
              </div>

              <button
                onClick={generateListing}
                disabled={isGenerating || selectedImages.length === 0}
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {isGenerating ? (
                  <>
                    <RotateCw className="w-5 h-5 mr-2 animate-spin" />
                    Creating magic...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Listing
                  </>
                )}
              </button>
            </div>
          )}

          {currentStep === 3 && generatedListing && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Step 3: Your Listing is Ready!
                </h2>
                <button
                  onClick={startOver}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Start Over
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Title</h3>
                    <button
                      onClick={() => handleCopy(generatedListing.title, 'title')}
                      className="flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      {copiedSection === 'title' ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-gray-700">{generatedListing.title}</p>
                </div>

                {/* Description */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Description</h3>
                    <button
                      onClick={() => handleCopy(generatedListing.description, 'description')}
                      className="flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      {copiedSection === 'description' ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap">{generatedListing.description}</div>
                </div>

                {/* Price & Category */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">Suggested Price</h3>
                      <button
                        onClick={() => handleCopy(generatedListing.price, 'price')}
                        className="flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        {copiedSection === 'price' ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-2xl font-bold text-green-600">£{generatedListing.price}</p>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">Category</h3>
                      <button
                        onClick={() => handleCopy(generatedListing.category, 'category')}
                        className="flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        {copiedSection === 'category' ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-gray-700 text-sm">{generatedListing.category}</p>
                  </div>
                </div>

                {/* Copy All Button */}
                <button
                  onClick={() => {
                    const fullListing = `${generatedListing.title}\n\n${generatedListing.description}\n\nPrice: £${generatedListing.price}\nCategory: ${generatedListing.category}`;
                    handleCopy(fullListing, 'all');
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-200 flex items-center justify-center"
                >
                  {copiedSection === 'all' ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      All Details Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 mr-2" />
                      Copy All Details
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <X className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-8">
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <div className="flex items-center justify-center mb-4">
              <Heart className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-gray-700 font-medium">Made with love for neurodivergent entrepreneurs</span>
              <Smile className="w-5 h-5 text-yellow-500 ml-2" />
            </div>
            <p className="text-gray-600 text-sm mb-4">
              If it helps you declutter and get that dopamine hit, 
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