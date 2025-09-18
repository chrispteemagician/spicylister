import React, { useState, useCallback, useRef } from 'react';
import { Camera, Upload, X, RotateCcw, Zap, AlertCircle, CheckCircle } from 'lucide-react';

const ImageCompressor = ({ onImagesProcessed, maxImages = 3 }) => {
  const [images, setImages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const compressImage = useCallback((file, targetSizeKB = 500, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const maxDimension = 1024;
        let { width, height } = img;
        
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        const tryCompress = (currentQuality) => {
          canvas.toBlob((blob) => {
            const sizeKB = blob.size / 1024;
            
            if (sizeKB <= targetSizeKB || currentQuality <= 0.3) {
              const reader = new FileReader();
              reader.onload = (e) => {
                resolve({
                  originalFile: file,
                  compressedBlob: blob,
                  previewUrl: e.target.result,
                  originalSize: (file.size / 1024).toFixed(1),
                  compressedSize: sizeKB.toFixed(1),
                  compressionRatio: ((1 - sizeKB / (file.size / 1024)) * 100).toFixed(1)
                });
              };
              reader.readAsDataURL(blob);
            } else {
              tryCompress(currentQuality - 0.1);
            }
          }, 'image/jpeg', currentQuality);
        };
        
        tryCompress(quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const processFiles = useCallback(async (files) => {
    setProcessing(true);
    const fileArray = Array.from(files).slice(0, maxImages - images.length);
    
    try {
      const processedImages = await Promise.all(
        fileArray.map(async (file, index) => {
          if (!file.type.startsWith('image/')) {
            throw new Error(`File ${file.name} is not an image`);
          }
          
          const compressed = await compressImage(file);
          return {
            id: Date.now() + index,
            ...compressed,
            label: images.length + index === 0 ? 'Main Photo' : 
                   images.length + index === 1 ? 'Back/Detail' : 
                   'Condition Shot'
          };
        })
      );
      
      const newImages = [...images, ...processedImages];
      setImages(newImages);
      onImagesProcessed(newImages);
      
    } catch (error) {
      console.error('Error processing images:', error);
      alert(`Error processing images: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }, [images, compressImage, onImagesProcessed, maxImages]);

  const handleFileChange = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const removeImage = useCallback((id) => {
    const newImages = images.filter(img => img.id !== id);
    setImages(newImages);
    onImagesProcessed(newImages);
  }, [images, onImagesProcessed]);

  const clearAll = useCallback(() => {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    onImagesProcessed([]);
  }, [images, onImagesProcessed]);

  // Separate handlers for camera and file upload
  const handleCameraCapture = useCallback(() => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  }, []);

  const handleFileUpload = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
          dragActive 
            ? 'border-orange-400 bg-orange-50' 
            : 'border-gray-300 bg-gray-50'
        } ${images.length >= maxImages ? 'opacity-50 pointer-events-none' : 'hover:border-orange-300'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {processing && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-lg">
            <div className="flex items-center space-x-2 text-orange-600">
              <Zap className="w-5 h-5 animate-spin" />
              <span className="font-medium">Compressing images...</span>
            </div>
          </div>
        )}
        
        <div className="text-center">
          <div className="flex justify-center space-x-4 mb-4">
            <button
              onClick={handleCameraCapture}
              disabled={images.length >= maxImages}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Camera className="w-5 h-5" />
              <span>Take Photo</span>
            </button>
            <button
              onClick={handleFileUpload}
              disabled={images.length >= maxImages}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>Upload</span>
            </button>
          </div>
          
          <p className="text-sm text-gray-600">
            {images.length >= maxImages 
              ? `Maximum ${maxImages} images reached`
              : `Add ${maxImages - images.length} more photo${maxImages - images.length !== 1 ? 's' : ''} (drag & drop or click)`
            }
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Images auto-compressed for optimal AI analysis
          </p>
        </div>
        
        {/* Separate inputs for camera and file upload */}
        <input
          ref={cameraInputRef}
          type="file"
          multiple
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">
              Selected Images ({images.length}/{maxImages})
            </h3>
            <button
              onClick={clearAll}
              className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <div key={image.id} className="relative bg-white border border-gray-200 rounded-lg p-3">
                <div className="relative">
                  <img
                    src={image.previewUrl}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                    {image.label}
                  </div>
                </div>
                
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Size:</span>
                    <span className="flex items-center space-x-1">
                      <span className="line-through">{image.originalSize}KB</span>
                      <span>→</span>
                      <span className="font-medium text-green-600">{image.compressedSize}KB</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Compressed:</span>
                    <span className="flex items-center space-x-1 text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      <span>{image.compressionRatio}%</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {images.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Pro Tips for Best AI Recognition:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• <strong>Main photo:</strong> Clear, well-lit front view</li>
                <li>• <strong>Back/detail:</strong> Text, labels, model numbers</li>
                <li>• <strong>Condition shot:</strong> Any damage or wear</li>
                <li>• Images are auto-compressed to ~500KB for optimal processing</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCompressor; 
