import React, { useState, useRef, useCallback } from 'react';
import { Upload, Sparkles, Coffee, Heart, CheckCircle, Copy, MessageCircle, RotateCcw, Search, X, AlertCircle, Crown, TrendingUp, Zap, Target, TrendingDown, Share2, Facebook, Twitter, Mail } from 'lucide-react';

const SpicyLister = () => {
  const [images, setImages] = useState([]);
  const [extraInfo, setExtraInfo] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedSection, setCopiedSection] = useState('');
  const [processingImages, setProcessingImages] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const fileInputRef = useRef(null);

  const compressImage = useCallback((file, maxDimension = 1024, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const maxSize = Math.max(width, height);
        if (maxSize > maxDimension) {
          const scale = maxDimension / maxSize;
          width *= scale;
          height *= scale;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (images.length + files.length > 3) {
      setError("Max 3 photos please! 📸 (Perfect for front, back & condition shots)");
      return;
    }
    setProcessingImages(true);
    setError(null);
    try {
      const imagePromises = files.map(async (file) => {
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} isn't an image file 🤔`);
        }
        if (file.size > 20 * 1024 * 1024) {
          throw new Error(`${file.name} is huge! Try a smaller photo 📱`);
        }
        const compressedFile = await compressImage(file);
        if (compressedFile.size > 2 * 1024 * 1024) {
          throw new Error(`${file.name} is still too large after compression`);
        }
        const previewUrl = URL.createObjectURL(compressedFile);
        return { file: compressedFile, originalName: file.name, originalSize: file.size, compressedSize: compressedFile.size, preview: previewUrl, id: Date.now() + Math.random() };
      });
      const newImages = await Promise.all(imagePromises);
      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessingImages(false);
    }
  };

  const removeImage = (id) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove?.preview) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const analyzeImages = async (usePremium = false) => {
    if (images.length === 0) {
      setError("Upload at least one photo first! 📸");
      return;
    }
    if (usePremium && !isPremium) {
      setShowPremiumModal(true);
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
              resolve({ data: base64, mimeType: img.file.type });
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
        body: JSON.stringify({ images: imageData, extraInfo: extraInfo.trim(), isPremium: usePremium || isPremium }),
      });
      if (!response.ok) {
        throw new Error(`Analysis failed (${response.status})`);
      }
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(`Hmm, that didn't work: ${err.message} 😅`);
    } finally {
      setIsAnalyzing(false);
    }
  };

// eslint-disable-next-line no-restricted-globals
const confirmed = window.confirm("Did you complete the PayPal payment? Click OK if yes.");


  // PAYPAL/PREMIUM FLOW -- ESLint-SAFE
  const handlePayPalUpgrade = async () => {
    const email = prompt("Enter your email for premium access & SpicyLister updates:");
    if (!email || !email.includes('@')) {
      alert("Please enter a valid email address");
      return;
    }
    setUserEmail(email);
    localStorage.setItem('spicylister_email', email);
    try {
      await fetch('/.netlify/functions/track-supporter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, timestamp: new Date().toISOString(), type: 'premium_intent', amount: '1.99' })
      });
    } catch (err) { console.log('Tracking failed:', err); }
    window.open('https://paypal.me/chrisptee/1.99', '_blank');
    setTimeout(() => {
      // eslint-disable-next-line no-restricted-globals
      const confirmed = window.confirm("Did you complete the PayPal payment? Click OK if yes.");
      if (confirmed) { handlePayPalSuccess(email); }
    }, 10000);
  };

  const handlePayPalSuccess = async (email = userEmail) => {
    setIsPremium(true);
    setShowPremiumModal(false);
    localStorage.setItem('spicylister_premium', 'true');
    try {
      await fetch('/.netlify/functions/track-supporter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, timestamp: new Date().toISOString(), type: 'premium_confirmed', amount: '1.99' })
      });
    } catch (err) { console.log('Success tracking failed:', err); }
    analyzeImages(true);
  };

  React.useEffect(() => {
    const premiumStatus = localStorage.getItem('spicylister_premium');
    const storedEmail = localStorage.getItem('spicylister_email');
    if (premiumStatus === 'true') {
      setIsPremium(true);
    }
    if (storedEmail) {
      setUserEmail(storedEmail);
    }
  }, []);

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
    if (result?.title) {
      const searchUrl = `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(result.title)}`;
      window.open(searchUrl, '_blank');
    }
  };

  const regenerateWithInfo = () => {
    if (images.length > 0) {
      analyzeImages(isPremium);
    }
  };

  const startNewListing = () => {
    images.forEach(img => {
      if (img.preview) URL.revokeObjectURL(img.preview);
    });
    setImages([]);
    setExtraInfo('');
    setResult(null);
    setError(null);
    setCopiedSection('');
  };

  // Social sharing functions
  const shareToFacebook = () => {
    const url = encodeURIComponent('https://spicylister.netlify.app');
    const text = encodeURIComponent('Check out SpicyLister - AI-powered eBay listings in 60 seconds! Perfect for neurospicy brains 🌶️');
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}"e=${text}`, '_blank');
  };
  const shareToTwitter = () => {
    const url = encodeURIComponent('https://spicylister.netlify.app');
    const text = encodeURIComponent('Sell Your Clutter without a Stutter! 🎯 SpicyLister makes eBay listings in 60 seconds with AI. Perfect for ADHD/neurospicy brains! 🌶️✨');
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
  };
  const shareByEmail = () => {
    const subject = encodeURIComponent('Check out SpicyLister - AI eBay Listings!');
    const body = encodeURIComponent(`Hey! I found this amazing tool called SpicyLister that creates eBay listings in 60 seconds using AI. Check it out: https://spicylister.netlify.app`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  // Modal Components
  const ShareModal = () => (
    showShareModal && (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.22)", zIndex: 1000 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 30, maxWidth: 370, margin: "70px auto", boxShadow: "0 6px 42px #2228" }}>
          <h2 style={{ marginTop: 0 }}>Share SpicyLister</h2>
          <button onClick={shareToFacebook}><Facebook /> Facebook</button>
          <button onClick={shareToTwitter}><Twitter /> Twitter / X</button>
          <button onClick={shareByEmail}><Mail /> Email</button>
          <button onClick={() => setShowShareModal(false)}><X /> Close</button>
        </div>
      </div>
    )
  );

  return (
    <div style={{ maxWidth: 600, margin: "20px auto", padding: 18, borderRadius: 12, boxShadow: "0 7px 24px #2623" }}>
      <h1 style={{ fontSize: 32, marginBottom: 6 }}>
        <Sparkles /> SpicyLister
      </h1>
      <div style={{ fontSize: 17, color: "#333" }}>AI-powered eBay listing generator for neurospicy brains 🌶️</div>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
      <button style={{ margin: "21px 0", background: "#f94", color: "#111", fontWeight: 900, fontSize: 22, border: 0, borderRadius: 8, padding: "12px 24px", cursor: "pointer" }} onClick={() => fileInputRef.current.click()}>
        <Upload /> Upload Photo{images.length !== 1 ? "s" : ""}
      </button>
      <div>
        {images.length > 0 && (
          <div style={{ margin: "14px 0" }}>
            {images.map(img => (
              <span key={img.id} style={{ display: "inline-block", marginRight: 8, verticalAlign: "middle", position: "relative" }}>
                <img src={img.preview} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "2px solid #f94" }} />
                <X style={{ position: "absolute", right: 2, top: 2, background: "#fff", borderRadius: "50%", cursor: "pointer", color: "#d11", fontSize: 17 }} onClick={() => removeImage(img.id)} />
                <div style={{ fontSize: 11, color: "#98999f", textAlign: 'center' }}>{formatFileSize(img.compressedSize || img.originalSize)}</div>
              </span>
            ))}
          </div>
        )}
      </div>
      {images.length > 0 && (
        <div>
          <textarea
            placeholder="Add extra item info (brand, notes, flaws, etc)"
            value={extraInfo}
            onChange={e => setExtraInfo(e.target.value)}
            style={{ width: "100%", padding: 12, fontSize: 16, borderRadius: 6, border: "1px solid #aaa", marginBottom: 12, marginTop: 7 }}
            rows={2}
          ></textarea>
          <br />
          <button style={{ background: "#1479fd", color: "#fff", fontSize: 21, fontWeight: 900, border: 0, borderRadius: 7, padding: "13px 20px", cursor: "pointer", marginBottom: 0 }} disabled={isAnalyzing} onClick={() => analyzeImages(false)}>
            <Zap /> Analyze Item
          </button>
          <span style={{ marginLeft: 14 }}>
            or <button style={{ color: "#fd1919", fontWeight: 600, border: 0, background: "none", textDecoration: "underline", cursor: "pointer" }} onClick={() => analyzeImages(true)} disabled={isPremium}>Analyze as <Crown /> Premium</button>
          </span>
        </div>
      )}
      {processingImages && <div style={{ color: "#585", margin: "6px 0", fontWeight: 600 }}>Processing Images...</div>}
      {error && <div style={{ color: "#d11", background: "#fee", padding: 9, borderRadius: 7, marginTop: 10, fontWeight: 700 }}>{error}</div>}
      {isAnalyzing && <div style={{ color: "#1479fd", margin: "10px 0", fontWeight: 700 }}>Analyzing item... Please wait.</div>}
      {result && (
        <div style={{ marginTop: 18, padding: 14, background: "#fff9ee", borderRadius: 9 }}>
          <div style={{ fontWeight: 800, fontSize: 21 }}><Sparkles /> {result.title || "AI Result"}</div>
          <div style={{ color: "#525", margin: "10px 0 7px 0" }}>{result.description}</div>
          {result.condition && <div><strong>Condition:</strong> {result.condition}</div>}
          {result.pricing && (
            <div>
              <strong>Pricing:</strong> <span style={{ color: "#333" }}>Starting Bid: £{result.pricing.startingBid} | Buy It Now: £{result.pricing.buyItNow}</span>
            </div>
          )}
          {result.marketInsights && <div><TrendingUp /> <strong>Insights:</strong> {result.marketInsights}</div>}
          {result.platformTips && <div style={{ fontStyle: "italic", color: "#777" }}><MessageCircle /> {result.platformTips}</div>}
          <div style={{ marginTop: 10 }}>
            <button onClick={searchEbayWithTitle}><Search /> eBay Search</button>
            <button onClick={regenerateWithInfo} style={{ marginLeft: 10 }}><RotateCcw /> Re-Analyze</button>
            <button onClick={() => copyToClipboard(result.description, 'desc')} style={{ marginLeft: 10 }}>
              <Copy /> {copiedSection === 'desc' ? "Copied!" : "Copy Description"}
            </button>
          </div>
          <button style={{ marginTop: 15, background: "#fafafa", color: "#333", border: "1px solid #ddd", borderRadius: 6, padding: "10px 19px", cursor: "pointer" }} onClick={startNewListing}><RotateCcw /> New Listing</button>
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <button style={{ background: "#ffa755", color: "#282", fontWeight: 600, fontSize: 18, borderRadius: 7, border: 0, padding: "10px 20px", marginTop: 24 }} onClick={() => setShowShareModal(true)}><Share2 /> Share</button>
        <button style={{ background: "#e0e1e7", color: "#444", fontWeight: 400, fontSize: 15, borderRadius: 7, border: 0, padding: "7px 15px", marginLeft: 16 }} onClick={() => setShowPrivacyModal(true)}>Privacy</button>
        <button style={{ background: "#e1e0e7", color: "#444", fontWeight: 400, fontSize: 15, borderRadius: 7, border: 0, padding: "7px 15px", marginLeft: 10 }} onClick={() => setShowTermsModal(true)}>T&Cs</button>
      </div>
      {ShareModal()}
      {showPremiumModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.39)", zIndex: 9999 }}>
          <div style={{ background: "#fff", borderRadius: 17, padding: 35, maxWidth: 470, margin: "80px auto", fontSize: 18, boxShadow: "0 8px 46px #1117" }}>
            <h2>Unlock Premium</h2>
            <div style={{ fontSize: 21, color: "#B30", fontWeight: 700, marginBottom: 14 }}>
              <Crown /> For a one-time payment of <b>£1.99</b> get lifetime access:
            </div>
            <ul>
              <li>Premium pricing analysis using eBay sold data</li>
              <li>Batch listing suggestions</li>
              <li>Exclusive market insights</li>
              <li>Supports the Comedy Magic Tour 🚐</li>
            </ul>
            <button style={{ background: "#fdc41a", border: 0, borderRadius: 8, padding: "10px 26px", fontWeight: 800, fontSize: 18, marginTop: 10 }} onClick={handlePayPalUpgrade}>
              <Coffee /> Upgrade for £1.99
            </button>
            <button style={{ marginLeft: 14, border: 0, background: "#eee", color: "#222", fontWeight: 500, borderRadius: 8, padding: "10px 17px" }} onClick={() => setShowPremiumModal(false)}><X /> Cancel</button>
            <div style={{ fontSize: 13, color: "#777", marginTop: 12 }}>30-day money-back guarantee</div>
          </div>
        </div>
      )}
      {showPrivacyModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#111a" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 30, maxWidth: 540, margin: "70px auto", boxShadow: "0 6px 42px #2228" }}>
            <h2>Privacy Policy</h2>
            <p>We only ever store your email (for upgrade tracking). No uploaded photos or listing data is ever saved.</p>
            <button onClick={() => setShowPrivacyModal(false)} style={{ background: "#eee", color: "#111", fontSize: 17, borderRadius: 8, marginTop: 15 }}><X /> Close</button>
          </div>
        </div>
      )}
      {showTermsModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#111a" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 30, maxWidth: 540, margin: "70px auto", boxShadow: "0 6px 42px #2228" }}>
            <h2>Terms &amp; Conditions</h2>
            <p>Use this tool at your own risk. We recommend reviewing all AI-generated suggestions and prices before listing.</p>
            <button onClick={() => setShowTermsModal(false)} style={{ background: "#eee", color: "#111", fontSize: 17, borderRadius: 8, marginTop: 15 }}><X /> Close</button>
          </div>
        </div>
      )}
      <footer style={{ marginTop: 36, textAlign: "center", color: "#555", fontWeight: 500, fontSize: 17 }}>
        Made with <Heart style={{ color: "#f55", verticalAlign: "middle" }} /> by Chris P Tee • Van Life + Comedy + Magic + Code
        <br />
        <a href="mailto:privacy@spicylister.com" style={{ color: "#229", fontSize: 14 }}>privacy@spicylister.com</a>
      </footer>
    </div>
  );
};

export default SpicyLister;
