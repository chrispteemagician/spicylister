import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, Coffee, Heart, CheckCircle, Copy, Download, MessageCircle, Lightbulb } from 'lucide-react';

const SpicyLister = () => {
  const [images, setImages] = useState([]);
  const [extraInfo, setExtraInfo] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedSection, setCopiedSection] = useState('');
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
      setError(`Hmm, that didn't work: ${err.message} 💔 Let's try again!`);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Coffee className="text-orange-600 w-6 h-6" />
            <p className="text-gray-600 font-medium">I love a coffee when helping others ☕</p>
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="text-orange-500 w-8 h-8" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              SpicyLister
            </h1>
            <Sparkles className="text-red-500 w-8 h-8" />
          </div>
          
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
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Camera className="w-6 h-6 text-orange-500" />
              Step 1: Snap Some Photos (Max 3)
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
              Choose Photos
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

          <div className="bg-yellow-50 rounded-2xl shadow-lg p-6 border border-yellow-200">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-yellow-600" />
              Step 2: Want to add optional details for accuracy?
            </h2>
            
            <textarea
              value={extraInfo}
              onChange={(e) => setExtraInfo(e.target.value)}
              placeholder="Tell us anything that helps with pricing or description:
- 'Paid £300 new, barely used'
- 'All original accessories included'  
- 'Really popular model, hard to find'
- 'Minor scratch on back but doesn't affect use'
- 'Bought from John Lewis last year'

Just chat naturally - we'll make it sound professional! ✨"
              className="w-full h-32 p-4 border border-yellow-300 rounded-lg resize-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
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
                <button
                  onClick={downloadAsText}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download All
                </button>
              </div>

              <div className="space-y-4">
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
                  <h3 className="font-semibold text-purple-800 mb-2">🎉 General Tips</h3>
                  <p className="text-gray-800">{result.platformTips}</p>
                </div>

                {/* Coffeeware & Community Section */}
                <div className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded-lg p-6 border-2 border-orange-200 text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Coffee className="w-6 h-6 text-orange-600" />
                    <Heart className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Coffeeware & Community ☕</h3>
                  <p className="text-gray-700 mb-4">
                    That's your listing sorted! You don't need to go past this point, unless you're interested in adventure...
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center mb-4">
                    
                      href="https://www.comedymagic.co.uk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      Comedy Magic Tour
                    </a>
                    
                      href="https://buymeacoffee.com/chrispteemagician"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      Buy Me a Coffee
                    </a>
                    <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Suggestions
                    </button>
                  </div>
                  
                  <div className="border-t border-orange-300 pt-4 text-sm text-gray-600">
                    <p className="mb-2">© 2025 SpicyLister.com • I love a coffee when I'm helping others ☕</p>
                    <p className="mb-2">
                      <a href="https://buymeacoffee.com/chrispteemagician" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline">
                        buymeacoffee @chrispteemagician
                      </a>
                      {" • "}
                      <a href="https://www.comedymagic.co.uk" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline">
                        Community Comedy Magic Tour
                      </a>
                    </p>
                    <p>
                      More free apps & plugins: 
                      <a href="https://github.com/chrispteemagician" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline ml-1">
                        github.com/chrispteemagician
                      </a>
                    </p>
                  </div>
                </div>

                {/* Adventure Zone */}
                <div className="bg-gray-50 rounded-lg p-4 border-t-4 border-gray-300">
                  <h3 className="font-semibold text-gray-700 mb-3">🚀 Adventure Zone: Extra Tips (Optional)</h3>
                  <p className="text-sm text-gray-600 mb-4">Still here? Here are some fun extras for the adventurous:</p>
                  
                  <div className="space-y-3">
                    <div className="bg-yellow-50 rounded p-3">
                      <h4 className="font-medium text-yellow-800 text-sm mb-2">📸 Photo Magic</h4>
                      <p className="text-yellow-700 text-sm">Window light is your friend! Harsh shadows? Use a white sheet as a backdrop. Flash creates glare on shiny things - natural light wins every time.</p>
                    </div>

                    <div className="bg-blue-50 rounded p-3">
                      <h4 className="font-medium text-blue-800 text-sm mb-2">🎨 Background Vibes</h4>
                      <p className="text-blue-700 text-sm">Plain backgrounds make your item the star. Dark items love light backgrounds, light items love dark ones. Remove the clutter - let your item shine!</p>
                    </div>

                    <div className="bg-green-50 rounded p-3">
                      <h4 className="font-medium text-green-800 text-sm mb-2">💫 Selling Secrets</h4>
                      <p className="text-green-700 text-sm">Sunday evenings are golden for listings! Quick replies make buyers happy. Measurements help avoid returns. Honesty about flaws builds trust.</p>
                    </div>

                    <div className="bg-pink-50 rounded p-3">
                      <h4 className="font-medium text-pink-800 text-sm mb-2">🕵️ Research Ninja</h4>
                      <p className="text-pink-700 text-sm">Check sold listings, not asking prices. Bundle deals create excitement. Seasonal timing matters - Christmas jumpers in July won't fly!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpicyLister;