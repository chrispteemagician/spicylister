// src/App.js - SpicyLister Complete Fixed Version
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  AlertTriangle,
  Crown,
  Zap,
  Coffee,
  Gift,
  Camera,
  CheckCircle,
  Copy,
  RotateCcw,
  MessageCircle,
  Heart,
  TrendingUp,
  Award
} from 'lucide-react';
import ImageCompressor from './ImageCompressor';

// Progress Tracker Component
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

    setIsGenerating(true);
    setError('');
    setCurrentStep(2);
    
    try {
      const imageData = await Promise.all(
        selectedImages.map(async (img) => {
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
          additionalContext: additionalInfo,
          imageLabels: selectedImages.map(img => img.label)
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      
      setGeneratedListing({
        title: result.title || 'Generated Listing',
        description: result.description || '',
        price: result.estimatedPrice || '',
        condition: result.condition || '',
        category: result.category || '',
        isValuableFind: result.isValuableItem || false
      });

      // Progress to step 3
      setCurrentStep(3);
      const newTotal = totalListingsCreated + 1;
      setTotalListingsCreated(newTotal);
      localStorage.setItem('spicylister_total_listings', newTotal.toString());

    } catch (error) {
      setError(`Failed to generate listing: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Coffee support
  const handleCoffeeSupport = () => {
    window.open('https://buymeacoffee.com/chrispteemagician', '_blank');
    setShowProModal(false);
    
    setTimeout(() => {
      setShowProActivation(true);
    }, 3000);
  };

  // Handle Pro activation after coffee
  const handleProActivation = () => {
    const email = prompt("Enter your email to activate Pro:");
    if (email && email.includes('@')) {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      
      setIsPro(true);
      setProExpiryDate(expiryDate);
      
      localStorage.setItem('spicylister_pro', 'true');
      localStorage.setItem('spicylister_pro_expiry', expiryDate.toISOString());
      localStorage.setItem('spicylister_email', email);
      
      alert(`Pro activated until ${expiryDate.toLocaleDateString()}! Thank you for supporting the van life dream!`);
    }
    setShowProActivation(false);
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

  const searchEbayWithTitle = () => {
    if (generatedListing?.title) {
      const searchUrl = `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(generatedListing.title)}`;
      window.open(searchUrl, '_blank');
    }
  };

  const startNewListing = () => {
    setSelectedImages([]);
    setAdditionalInfo('');
    setGeneratedListing(null);
    setError('');
    setCopiedSection('');
    setCurrentStep(1);
  };

  // Pro Activation Modal
  const ProActivationModal = () => {
    if (!showProActivation) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6 text-center">
          <div className="text-4xl mb-4">☕</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Thanks for the coffee!</h3>
          <p className="text-gray-700 mb-6">
            Would you like to activate 1 month of Pro features as a thank you?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowProActivation(false)}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Maybe Later
            </button>
            <button
              onClick={handleProActivation}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Activate Pro
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Pro Modal
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
              <div className="text-3xl font-bold text-gray-800 mb-2">£3</div>
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold mb-3">
                1 MONTH PRO INCLUDED!
              </div>
              <button
                onClick={handleCoffeeSupport}
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600"
              >
                Buy Chris a Coffee
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
            <div className="w-12 h-12 rounded-full bg-g
