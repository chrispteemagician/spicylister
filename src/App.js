import React, { useState, useEffect, useRef } from 'react';
import { Upload, Sparkles, Search, Copy, Check, RotateCcw, MessageCircle, Heart, Coffee } from 'lucide-react';

// Global eBay regions and currencies (invisible to user)
const globalRegions = {
  'US': { currency: 'USD', symbol: '$', multiplier: 1.27, domain: 'ebay.com' },
  'UK': { currency: 'GBP', symbol: '£', multiplier: 1.0, domain: 'ebay.co.uk' },
  'DE': { currency: 'EUR', symbol: '€', multiplier: 1.17, domain: 'ebay.de' },
  'AU': { currency: 'AUD', symbol: 'A$', multiplier: 1.91, domain: 'ebay.com.au' },
  'CA': { currency: 'CAD', symbol: 'C$', multiplier: 1.71, domain: 'ebay.ca' },
  'FR': { currency: 'EUR', symbol: '€', multiplier: 1.17, domain: 'ebay.fr' },
  'IT': { currency: 'EUR', symbol: '€', multiplier: 1.17, domain: 'ebay.it' },
  'ES': { currency: 'EUR', symbol: '€', multiplier: 1.17, domain: 'ebay.es' }
};

// Auto-detect user's region from timezone (invisible)
const detectUserRegion = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    if (timezone.includes('America/New_York') || timezone.includes('America/Los_Angeles') || timezone.includes('America/Chicago')) {
      return 'US';
    } else if (timezone.includes('Europe/Berlin')) {
      return 'DE';
    } else if (timezone.includes('Australia')) {
      return 'AU';
    } else if (timezone.includes('America/Toronto')) {
      return 'CA';
    } else if (timezone.includes('Europe/Paris')) {
      return 'FR';
    } else if (timezone.includes('Europe/Rome')) {
      return 'IT';
    } else if (timezone.includes('Europe/Madrid')) {
      return 'ES';
    } else {
      return 'UK'; // Default to UK
    }
  } catch {
    return 'UK'; // Fallback
  }
};

// Convert price to local currency (invisible)
const convertPrice = (gbpPrice, region) => {
  if (!gbpPrice || !region || !globalRegions[region]) return gbpPrice;
  
  const converted = gbpPrice * globalRegions[region].multiplier;
  return Math.round(converted * 100) / 100; // Round to 2 decimal places
};

// Get eBay search URL for user's region (invisible)
const getEbaySearchUrl = (title, region) => {
  const domain = globalRegions[region]?.domain || 'ebay.co.uk';
  return `https://www.${domain}/sch/i.html?_nkw=${encodeURIComponent(title)}`;
};

const SpicyLister = () => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [generatedListing, setGeneratedListing] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  const [copiedStates, setCopiedStates] = useState({});
  const [totalListingsCreated, setTotalListingsCreated] = useState(0);
  const [error, setError] = useState('');
  const [showProModal, setShowProModal] = useState(false);
  const [showProActivation, setShowProActivation] = useState(false);
  const [isProActive, setIsProActive] = useState(false);
  const [proCode, setProCode] = useState('');
  const fileInputRef = useRef(null);

  // Auto-detect user's region (invisible - happens in background)
  const [userRegion] = useState(() => detectUserRegion());

  // Load saved listings count
  useEffect(() => {
    const saved = localStorage.getItem('spicylister_total_listings');
    if (saved) setTotalListingsCreated(parseInt(saved));

    const proStatus = localStorage.getItem('spicylister_pro_active');
    if (proStatus === 'true') setIsProActive(true);
  }, []);

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsImageGenerating(true);
    setError('');

    Promise.all(
      files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      })
    ).then(images => {
      setSelectedImages(images);
      setIsImageGenerating(false);
    });
  };

  const generateListing = async () => {
    if (selectedImages.length === 0) {
      setError('Please select at least one image first!');
      return;
    }

    // Check Pro limits (invisible to user experience)
    if (!isProActive && totalListingsCreated >= 5) {
      setShowProModal(true);
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/.netlify/functions/generateListing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          images: selectedImages,
          region: userRegion // Pass user's region invisibly
        }),
      });

      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      // Convert price to user's local currency (invisible)
      const localPrice = convertPrice(parseFloat(data.price), userRegion);
      const currencySymbol = globalRegions[userRegion]?.symbol || '£';
      
      setGeneratedListing({
        ...data,
        price: localPrice,
        currencySymbol: currencySymbol,
        region: userRegion
      });

      const newTotal = totalListingsCreated + 1;
      setTotalListingsCreated(newTotal);
      localStorage.setItem('spicylister_total_listings', newTotal.toString());

    } catch (error) {
      setError(error.message || 'Something went wrong. Please try again!');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates({ ...copiedStates, [key]: true });
      setTimeout(() => setCopiedStates({ ...copiedStates, [key]: false }), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const searchEbayWithTitle = () => {
    if (generatedListing?.title) {
      // Use user's local eBay site automatically
      const searchUrl = getEbaySearchUrl(generatedListing.title, userRegion);
      window.open(searchUrl, '_blank');
    }
  };

  const startNewListing = () => {
    setSelectedImages([]);
    setGeneratedListing(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const activatePro = () => {
    const validCodes = ['SPICY2024', 'NEUROSPICY', 'CPTEE2024'];
    if (validCodes.includes(proCode.toUpperCase())) {
      setIsProActive(true);
      localStorage.setItem('spicylister_pro_active', 'true');
      setShowProActivation(false);
      setProCode('');
    } else {
      alert('Invalid code. Try: SPICY2024');
    }
  };

  const ProModal = () => showProModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-8 max-w-md mx-auto">
        <h3 className="text-2xl font-bold mb-4 text-center">🌶️ Upgrade to Pro!</h3>
        <p className="text-gray-600 mb-6 text-center">
          You've used your 5 free listings! Upgrade to Pro for unlimited listings.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setShowProActivation(true)}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Activate Pro
          </button>
          <button
            onClick={() => setShowProModal(false)}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );

  const ProActivationModal = () => showProActivation && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-8 max-w-md mx-auto">
        <h3 className="text-2xl font-bold mb-4 text-center">Enter Pro Code</h3>
        <input
          type="text"
          value={proCode}
          onChange={(e) => setProCode(e.target.value)}
          placeholder="Enter your code"
          className="w-full p-3 border border-gray-300 rounded-lg mb-4"
        />
        <div className="flex gap-3 justify-center">
          <button
            onClick={activatePro}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Activate
          </button>
          <button
            onClick={() => setShowProActivation(false)}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Hint: Try "SPICY2024" 😉
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-orange-600 mb-2">🌶️ SpicyLister</h1>
          <p className="text-xl text-gray-600 mb-1">Turn your clutter into cash with AI magic</p>
          <p className="text-sm text-gray-500">Perfect for ADHD brains - no overwhelm, just results! ✨</p>
          
          {/* Invisible region indicator (for debugging - remove in production) */}
          <p className="text-xs text-gray-400 mt-2">
            🌍 Auto-detected: {userRegion} • Prices in {globalRegions[userRegion]?.currency}
          </p>
        </div>

        {isProActive && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-3 rounded-lg mb-6 text-center">
            <span className="font-semibold">🎉 Pro Active - Unlimited Listings!</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          {!generatedListing ? (
            <div className="text-center">
              <div className="border-4 border-dashed border-gray-300 rounded-2xl p-12 mb-6 transition-colors hover:border-orange-400">
                <Upload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload Your Items</h2>
                <p className="text-gray-600 mb-6">Drag and drop images or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Choose Images
                </label>
              </div>

              {selectedImages.length > 0 && (
                <div className="mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {selectedImages.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                    ))}
                  </div>

                  <button
                    onClick={generateListing}
                    disabled={isGenerating || isImageGenerating}
                    className="w-full bg-gradient-to-r from-orange-600 to-pink-600 text-white py-4 px-8 rounded-xl text-xl font-semibold hover:from-orange-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                  >
                    {isGenerating ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                        Creating Magic...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Sparkles className="mr-3 h-6 w-6" />
                        Generate My Listing!
                      </div>
                    )}
                  </button>
                </div>
              )}

              {isImageGenerating && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Processing images...</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">✨ Your Listing is Ready!</h2>
                <p className="text-gray-600">Copy and paste these details into eBay</p>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-900">Title</h3>
                    <button
                      onClick={() => copyToClipboard(generatedListing.title, 'title')}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                    >
                      {copiedStates.title ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      {copiedStates.title ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="font-medium text-blue-700">{generatedListing.title}</div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-900">Description</h3>
                    <button
                      onClick={() => copyToClipboard(generatedListing.description, 'description')}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                    >
                      {copiedStates.description ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      {copiedStates.description ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap">{generatedListing.description}</div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-gray-900">Suggested Price</h3>
                      <button
                        onClick={() => copyToClipboard(`${generatedListing.currencySymbol}${generatedListing.price}`, 'price')}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                      >
                        {copiedStates.price ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        {copiedStates.price ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      {generatedListing.currencySymbol}{generatedListing.price}
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-gray-900">Category</h3>
                      <button
                        onClick={() => copyToClipboard(generatedListing.category, 'category')}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                      >
                        {copiedStates.category ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        {copiedStates.category ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="font-semibold text-blue-700">{generatedListing.category}</div>
                  </div>
                </div>
              </div>

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

        <div className="text-center mt-12 py-8 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="text-gray-600">SpicyLister - Free forever!</span>
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
             Please Buy Chris a Coffee
            </a>
          </div>
          
          <p className="text-xs text-gray-400 mt-4">
            Made with love by Chris P Tee • Van Life + Comedy + Magic + Code
            <br />
            {totalListingsCreated > 0 && (
              <>You've created {totalListingsCreated} listing{totalListingsCreated !== 1 ? 's' : ''} so far! • </>
            )}
            <span className="text-orange-600 font-medium">Neurospicy selling for when your brain says no</span>
          </p>
        </div>

        <ProModal />
        <ProActivationModal />
      </div>
    </div>
  );
};

function App() {
  return <SpicyLister />;
}

export default App;