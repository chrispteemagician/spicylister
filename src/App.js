import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, Coffee, Heart, CheckCircle, Copy, Download, MessageCircle } from 'lucide-react';

const SpicyLister = () => {
  const [images, setImages] = useState([]);
  const [extraInfo, setExtraInfo] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const imagePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({
          file,
          preview: e.target.result,
          name: file.name
        });
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(newImages => {
      setImages(prev => [...prev, ...newImages]);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeImages = async () => {
    if (images.length === 0) {
      setError("Please upload at least one image first! 📸");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Convert images to base64 for API
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

      // Call our Netlify function with extra info
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
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(`Oops! ${err.message} 😅 Try again in a moment!`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadAsText = () => {
    if (!result) return;
    
    const content = `TITLE: ${result.title}

DESCRIPTION:
${result.description}

CONDITION: ${result.condition}

PRICING:
Starting Bid: £${result.pricing.startingBid}
Buy It Now: £${result.pricing.buyItNow}

PLATFORM TIPS:
${result.platformTips}`;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="text-orange-500 w-8 h-8" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              SpicyLister
            </h1>
            <Sparkles className="text-red-500 w-8 h-8" />
          </div>
          <p className="text-gray-600 text-lg mb-2">The NeuroSpicy Listing App 🌶️</p>
          <p className="text-gray-500 mb-4">Listing things online when your brain says no.</p>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 mb-4">
            <p className="text-gray-700 font-medium">
              ✨ <strong>SpicyLister is for EVERYONE who wants to list without stress!</strong> ✨
            </p>
            <p className="text-gray-600 text-sm mt-1">
              Whether you're neurospicy, busy, or just want AI to do the hard work - we've got you! 🤗
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Camera className="w-6 h-6 text-orange-500" />
              Step 1: Snap Some Photos
            </h2>
            
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
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mb-4 transform hover:scale-105"
            >
              <Upload className="w-5 h-5" />
              Choose Images
            </button>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.preview}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-orange-200"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
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
              Step 2: Got More to Share? (Optional)
            </h2>
            
            <div className="bg-white rounded-lg p-4 mb-4 border border-yellow-300">
              <p className="text-gray-700 mb-2 font-medium">
                💬 <strong>Speak naturally - we've got you!</strong>
              </p>
              <p className="text-gray-600 text-sm">
                If the AI description isn't perfect, add more info here as you normally speak. 
                Don't worry about perfect wording - SpicyLister will make it sound professional! ✨
              </p>
            </div>
            
            <textarea
              value={extraInfo}
              onChange={(e) => setExtraInfo(e.target.value)}
              placeholder="Examples of what helps:
• 'Paid £300 new, barely used'
• 'All original accessories included'  
• 'Really popular model, hard to find'
• 'Works perfectly, upgrading to newer version'
• 'Minor scratch on back but doesn't affect use'
• 'Bought from John Lewis last year'

Just tell us anything buyers should know - in your own words! 😊"
              className="w-full h-32 p-4 border border-yellow-300 rounded-lg resize-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent placeholder-gray-500"
            />
            
            <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              This helps get better pricing and descriptions - but totally optional!
            </p>
          </div>

          <div className="text-center">
            <button
              onClick={analyzeImages}
              disabled={isAnalyzing || images.length === 0}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mx-auto transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  SpicyBrain is thinking...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate My Listing! ✨
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-700 text-center">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  Your Listing is Ready! 🎉
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy JSON'}
                  </button>
                  <button
                    onClick={downloadAsText}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-800 mb-2">📋 Quick Listing Tips</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Copy the title</strong> to start your eBay/Vinted listing</li>
                  <li>• <strong>Copy sections as needed</strong> - description, condition, etc.</li>
                  <li>• <strong>Want more money?</strong> Just ask for it! You can change any prices</li>
                  <li>• <strong>Take photos from multiple angles</strong> for most accurate descriptions</li>
                </ul>
              </div>

              <div className="space-y-6">
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-800 mb-2">📝 Title</h3>
                  <p className="text-gray-800 font-medium">{result.title}</p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">📋 Description</h3>
                  <div className="text-gray-800 whitespace-pre-line">{result.description}</div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">🔍 Condition</h3>
                  <p className="text-gray-800">{result.condition}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">💰 Pricing</h3>
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

                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-800 mb-2">💡 Platform Tips</h3>
                  <p className="text-gray-800">{result.platformTips}</p>
                </div>
              </div>
            </div>
          )}

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