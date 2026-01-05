import React, { useState, useRef, useEffect } from 'react';
import { Camera, Sparkles, Copy, Check, RefreshCw, Settings, Coffee, Zap, Package } from 'lucide-react';

function App() {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [isPro, setIsPro] = useState(false);
    const fileInputRef = useRef(null);

    // Load API key and Pro status from localStorage
    useEffect(() => {
        const savedKey = localStorage.getItem('geminiApiKey');
        const proStatus = localStorage.getItem('spicyListerPro');
        const proExpiry = localStorage.getItem('spicyListerProExpiry');

        if (savedKey) setApiKey(savedKey);

        // Check if Pro is still valid
        if (proStatus === 'true' && proExpiry) {
            const expiryDate = new Date(proExpiry);
            if (expiryDate > new Date()) {
                setIsPro(true);
            } else {
                // Pro expired
                localStorage.removeItem('spicyListerPro');
                localStorage.removeItem('spicyListerProExpiry');
            }
        }
    }, []);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(file);
            setListing(null);
        }
    };

    const generateListing = async () => {
        if (!image) return;

        if (!apiKey) {
            alert('Please add your Gemini API key in settings first! 🔑\n\nGet one free at: https://aistudio.google.com/apikey');
            setShowSettings(true);
            return;
        }

        setLoading(true);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(image);
            reader.onloadend = async () => {
                const base64Image = reader.result.split(',')[1];

                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    {
                                        text: `You are SpicyLister - an expert eBay listing generator with a friendly, neurodivergent-friendly approach.

Analyze this item photo and create a compelling eBay listing with:

**TITLE** (80 chars max, keyword-rich, searchable)

**DESCRIPTION** (Well-formatted with:)
- Engaging opening line
- Key features & condition
- Measurements/specs if visible
- Any flaws noted honestly
- Why someone would love this item

**CATEGORY SUGGESTION** (Best eBay category)

**STARTING PRICE** (Conservative estimate in £)

**CONDITION** (New, Used - Like New, Used - Good, Used - Acceptable, For Parts)

**SHIPPING NOTES** (Suggested packaging & any special handling)

Keep it friendly, honest, and optimized for search. Make me want to buy it!`
                                    },
                                    {
                                        inline_data: {
                                            mime_type: image.type,
                                            data: base64Image
                                        }
                                    }
                                ]
                            }],
                            generationConfig: {
                                temperature: 0.7,
                                maxOutputTokens: 1000
                            }
                        })
                    }
                );

                const data = await response.json();

                if (data.candidates && data.candidates[0]) {
                    const generatedText = data.candidates[0].content.parts[0].text;
                    setListing(generatedText);
                } else {
                    throw new Error('No response from Gemini');
                }
            };
        } catch (error) {
            console.error('Error:', error);
            alert('Oops! Something went wrong. Check your API key and try again. 🌶️');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (listing) {
            navigator.clipboard.writeText(listing);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const saveApiKey = () => {
        localStorage.setItem('geminiApiKey', apiKey);
        setShowSettings(false);
        alert('API key saved! 🎉');
    };

    const startOver = () => {
        setImage(null);
        setPreview(null);
        setListing(null);
        setCopied(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50">
            <div className="container mx-auto px-4 py-8 max-w-4xl">

                {/* HEADER */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <Zap className="text-orange-500 w-10 h-10" />
                        <h1 className="text-5xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                            SpicyLister
                        </h1>
                        <Zap className="text-orange-500 w-10 h-10" />
                    </div>
                    <p className="text-xl text-gray-600 font-medium">
                        From Clutter to Cash in 60 Seconds 🌶️
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        Take a photo → Get a perfect eBay listing → List it!
                    </p>
                </div>

                {/* SETTINGS BUTTON */}
                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200"
                    >
                        <Settings className="w-4 h-4" />
                        <span className="text-sm font-medium">Settings</span>
                    </button>
                </div>

                {/* SETTINGS PANEL */}
                {showSettings && (
                    <div className="mb-6 p-6 bg-white rounded-2xl shadow-lg border-2 border-orange-200">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-orange-500" />
                            Settings
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Gemini API Key {!apiKey && <span className="text-red-500">*Required</span>}
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="AIza..."
                                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Get your free API key at{' '}
                                    <a
                                        href="https://aistudio.google.com/apikey"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-orange-500 hover:underline"
                                    >
                                        aistudio.google.com/apikey
                                    </a>
                                </p>
                            </div>
                            <button
                                onClick={saveApiKey}
                                className="w-full bg-orange-500 text-white font-bold py-2 px-4 rounded-xl hover:bg-orange-600 transition-colors"
                            >
                                Save Settings
                            </button>
                        </div>
                    </div>
                )}

                {/* UPGRADE MODAL */}
                {showUpgradeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                            <div className="text-center mb-6">
                                <Sparkles className="w-16 h-16 text-yellow-500 mx-auto mb-3" />
                                <h2 className="text-2xl font-black text-gray-800 mb-2">
                                    SpicyLister Pro
                                </h2>
                                <p className="text-gray-600">
                                    Coming Soon: One-Click eBay Integration! 🚀
                                </p>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-start gap-3">
                                    <Check className="text-green-500 flex-shrink-0 mt-1" />
                                    <p className="text-gray-700"><strong>Direct eBay Listing</strong> - One click and it's live!</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="text-green-500 flex-shrink-0 mt-1" />
                                    <p className="text-gray-700"><strong>Batch Upload</strong> - List multiple items at once</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="text-green-500 flex-shrink-0 mt-1" />
                                    <p className="text-gray-700"><strong>Smart Pricing Assistant</strong> - AI-powered price suggestions</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="text-green-500 flex-shrink-0 mt-1" />
                                    <p className="text-gray-700"><strong>Template Library</strong> - Save & reuse your best listings</p>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-4">
                                <p className="text-center text-2xl font-black text-gray-800 mb-1">
                                    £4.99/month
                                </p>
                                <p className="text-center text-sm text-gray-600">
                                    Unlimited listings • Cancel anytime
                                </p>
                            </div>

                            <p className="text-xs text-center text-gray-500 mb-4">
                                💚 Buy me a coffee to get 7 days of Pro features when they launch!
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowUpgradeModal(false)}
                                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Maybe Later
                                </button>
                                <a
                                    href="https://buymeacoffee.com/chrispteemagician"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 bg-yellow-400 text-yellow-900 font-bold py-2 px-4 rounded-xl hover:bg-yellow-500 transition-colors text-center"
                                    onClick={() => setShowUpgradeModal(false)}
                                >
                                    Get Early Access ☕
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* MAIN CARD */}
                <div className="bg-white rounded-3xl shadow-2xl border-4 border-orange-200 overflow-hidden">

                    {/* UPLOAD SECTION */}
                    {!preview && (
                        <div className="p-8">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-4 border-dashed border-orange-300 rounded-2xl p-16 text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all"
                            >
                                <Camera className="w-20 h-20 text-orange-400 mx-auto mb-4" />
                                <p className="text-xl font-bold text-gray-700 mb-2">
                                    Snap a Photo of Your Item
                                </p>
                                <p className="text-gray-500">
                                    Click to upload or drag & drop
                                </p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>
                    )}

                    {/* PREVIEW & GENERATE */}
                    {preview && !listing && (
                        <div className="p-8">
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-full max-h-96 object-contain rounded-xl mb-6 border-2 border-gray-200"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={startOver}
                                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
                                >
                                    Choose Different Photo
                                </button>
                                <button
                                    onClick={generateListing}
                                    disabled={loading}
                                    className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-lg rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            Generate Listing
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* LISTING RESULT */}
                    {listing && (
                        <div className="p-8">
                            <div className="mb-6">
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="w-full max-h-64 object-contain rounded-xl border-2 border-gray-200"
                                />
                            </div>

                            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 mb-6 border-2 border-orange-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                        <Sparkles className="text-orange-500" />
                                        Your Listing
                                    </h3>
                                    <button
                                        onClick={copyToClipboard}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${copied
                                                ? 'bg-green-500 text-white'
                                                : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                                            }`}
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4" />
                                                Copy
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="bg-white rounded-xl p-4 border-2 border-orange-100">
                                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                                        {listing}
                                    </pre>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={startOver}
                                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Start Over
                                </button>
                                <button
                                    onClick={generateListing}
                                    className="flex-1 px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Regenerate
                                </button>
                            </div>

                            {/* PRO UPGRADE PROMPT */}
                            {!isPro && (
                                <div className="mt-6 bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300 rounded-2xl p-4 flex items-center gap-4">
                                    <Zap className="text-yellow-500 flex-shrink-0 w-8 h-8" />
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-800">Want one-click listing?</p>
                                        <p className="text-sm text-gray-600">SpicyLister Pro coming soon!</p>
                                    </div>
                                    <button
                                        onClick={() => setShowUpgradeModal(true)}
                                        className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:from-yellow-500 hover:to-orange-600 transition-colors whitespace-nowrap"
                                    >
                                        Learn More
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="mt-12 text-center space-y-6 pb-12">
                    <div className="inline-block bg-white px-6 py-4 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center justify-center gap-2">
                            <Coffee className="text-yellow-500" /> This is Coffeeware
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Free to use. Support if it helps you.</p>
                        <a
                            href="https://buymeacoffee.com/chrispteemagician"
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 block bg-yellow-400 text-yellow-900 font-bold py-2 px-4 rounded-xl hover:bg-yellow-500 transition-colors"
                        >
                            Buy Chris a Coffee ☕
                        </a>
                        <p className="text-xs text-gray-500 mt-2">
                            💚 Coffee supporters get 7 days of Pro when it launches!
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-2 text-sm text-gray-400">
                        <a href="https://comedymagic.co.uk" target="_blank" rel="noreferrer" className="hover:text-purple-500 transition-colors">
                            Built by <strong>Chris P Tee</strong> - UK Children's Entertainer of the Year 2018
                        </a>
                        <a href="https://www.tiktok.com/@chrispteemagician" target="_blank" rel="noreferrer" className="hover:text-black transition-colors flex items-center gap-1">
                            Follow on TikTok for tips & tricks
                        </a>
                        <p className="text-xs opacity-50 mt-4">SpicyLister v2.0 • Powered by Gemini Flash • Free Forever 💚</p>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default App;
