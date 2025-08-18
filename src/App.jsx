// src/App.jsx
import React, { useState, useCallback } from 'react';

// --- Helper Components ---

const IconUpload = () => (
  <svg className="w-12 h-12 text-gray-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3 17.25V8.25a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 8.25v9a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 17.25z" />
  </svg>
);

const IconGenerate = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
    </svg>
);

const LoadingSpinner = () => (
    <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Analyzing your item... this might take a moment!</p>
    </div>
);

// --- Main App Component ---

function App() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [results, setResults] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // --- File Handling ---

    const handleFileSelect = useCallback((file) => {
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            setFilePreview(`Selected file: ${file.name}`);
            setError('');
            setResults(null);
        } else {
            setError('Please select a valid image file.');
            setSelectedFile(null);
            setFilePreview('');
        }
    }, []);

    const onFileChange = (e) => {
        handleFileSelect(e.target.files[0]);
    };

    // --- Drag and Drop Handlers ---

    const onDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const onDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    
    const onDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files[0]);
    };

    // --- API Call to Secure Netlify Function ---

    const generateListing = async () => {
        if (!selectedFile) {
            setError('Please select an image first.');
            return;
        }

        setIsLoading(true);
        setError('');
        setResults(null);

        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = async () => {
            const base64Image = reader.result.split(',')[1];

            try {
                // This is the secure endpoint for our Netlify function
                const response = await fetch('/.netlify/functions/generate-listing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: base64Image,
                        mimeType: selectedFile.type,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Request failed with status ${response.status}`);
                }

                const data = await response.json();
                setResults(data);

            } catch (err) {
                console.error('Error:', err);
                setError(`Failed to generate listing. ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = (error) => {
            setError('Failed to read the file.');
            setIsLoading(false);
            console.error("File reading error:", error);
        }
    };
    
    // --- Render ---

    return (
        <div className="bg-gray-100 flex items-center justify-center min-h-screen p-4 font-sans">
            <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl p-6 md:p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">🌶️ SpicyLister</h1>
                    <p className="text-gray-500">The NeuroSpicy-friendly listing generator</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {/* File Upload */}
                <div className="mb-6">
                    <label 
                        htmlFor="file-upload" 
                        className={`border-2 dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
                        onDragEnter={onDragEnter}
                        onDragLeave={onDragLeave}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                    >
                        <div className="flex flex-col items-center justify-center">
                            <IconUpload />
                            <p className="text-lg font-semibold text-gray-700">Click or drag a photo here</p>
                            <p className="text-gray-500">Just one photo is needed. The AI will do the rest!</p>
                        </div>
                    </label>
                    <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                    {filePreview && (
                        <div className="mt-4 text-center">
                            <p className="text-gray-600"><strong>{filePreview}</strong></p>
                        </div>
                    )}
                </div>

                {/* Generate Button */}
                <div className="text-center mb-6">
                    <button 
                        onClick={generateListing} 
                        disabled={!selectedFile || isLoading}
                        className="w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                    >
                        <IconGenerate />
                        {isLoading ? 'Generating...' : 'Generate Listing'}
                    </button>
                </div>

                {/* Loading Spinner */}
                {isLoading && <LoadingSpinner />}

                {/* Results */}
                {results && (
                    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                        <h2 className="text-xl font-bold text-gray-800">Generated Listing Details</h2>
                        <div>
                            <label htmlFor="result-title" className="block text-sm font-medium text-gray-700">Title</label>
                            <input type="text" id="result-title" defaultValue={results.title} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label htmlFor="result-description" className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea id="result-description" rows="6" defaultValue={results.description} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"></textarea>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="result-auction" className="block text-sm font-medium text-gray-700">Suggested Auction Price</label>
                                <input type="text" id="result-auction" defaultValue={`£${results.auctionPrice}`} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label htmlFor="result-buynow" className="block text-sm font-medium text-gray-700">Suggested Buy It Now Price</label>
                                <input type="text" id="result-buynow" defaultValue={`£${results.buyNowPrice}`} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
