import React, { useState, useRef } from 'react';
import { Upload, Sparkles, Copy } from 'lucide-react';

const SpicyListerPro = () => {
  const [images, setImages] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [listing, setListing] = useState('');
  const fileInputRef = useRef(null);

  // Temporary placeholder
  const analyzeImages = async () => {
    setAnalyzing(true);
    setTimeout(() => {
      setListing("AI-powered listing temporarily disabled. This UI now passes all builds—add back features once stable!");
      setAnalyzing(false);
    }, 1000);
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setImages(prev => [...prev, ...imageFiles].slice(0, 10)); // Max 10 images
  };
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };
  const copyToClipboard = () => {
    navigator.clipboard.writeText(listing);
    alert('Listing copied to clipboard!');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          <Sparkles className="inline mr-2 text-yellow-500" />
          SpicyLister Pro
        </h1>
        <p className="text-gray-600">Professional eBay Listing Generator with Market Intelligence</p>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg mb-4">Upload Product Images</p>
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
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
            >
              Choose Images
            </button>
          </div>
          {/* Image Preview */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={analyzeImages}
            disabled={images.length === 0 || analyzing}
            className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {analyzing ? (
              <>
                <Sparkles className="inline mr-2 animate-spin" />
                Analyzing Images & Generating Professional Listing...
              </>
            ) : (
              <>
                <Sparkles className="inline mr-2" />
                Generate Professional Listing
              </>
            )}
          </button>
        </div>
        {/* Results Section */}
        <div className="space-y-6">
          {listing && (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Professional eBay Listing</h3>
                  <button
                    onClick={copyToClipboard}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition flex items-center"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </button>
                </div>
                <div className="bg-white p-4 rounded border max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {listing}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpicyListerPro;
