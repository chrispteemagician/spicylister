import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, Sparkles, Coffee, Heart, CheckCircle, Copy, 
  MessageCircle, RotateCcw, Search, X, AlertCircle, Crown, 
  TrendingUp, Zap, Target, TrendingDown, Video, Package,
  DollarSign, Clock, Gift, Star, Layers, PlayCircle,
  FileText, Camera, Shield, Rocket
} from 'lucide-react';

const SpicyLister = () => {
  // Core State
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [extraInfo, setExtraInfo] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedSection, setCopiedSection] = useState('');
  const [processingMedia, setProcessingMedia] = useState(false);

  // Pro/Premium State
  const [isPro, setIsPro] = useState(false);
  const [proExpiryDate, setProExpiryDate] = useState(null);
  const [showProModal, setShowProModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [supporterType, setSupporterType] = useState(null); // 'coffee' or 'premium'

  // Batch State
  const [batchMode, setBatchMode] = useState(false);
  const [batchItems, setBatchItems] = useState([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);

  // Modal for PayPal confirmation (NEW!)
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [onPaymentConfirm, setOnPaymentConfirm] = useState(() => () => {});

  // Refs
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Load saved state on mount
  useEffect(() => {
    const savedPro = localStorage.getItem('spicylister_pro');
    const savedExpiry = localStorage.getItem('spicylister_pro_expiry');
    const savedEmail = localStorage.getItem('spicylister_email');
    const savedSupporter = localStorage.getItem('spicylister_supporter_type');
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
    if (savedEmail) setUserEmail(savedEmail);
    if (savedSupporter) setSupporterType(savedSupporter);
  }, []);

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
    const maxImages = isPro ? 10 : 3;
    if (images.length + files.length > maxImages) {
      setError(`Max ${maxImages} photos${isPro ? ' per item' : ''}! ${isPro ? '(Pro allows 10)' : '(Upgrade to Pro for 10)'}`);
      return;
    }
    setProcessingMedia(true);
    setError(null);
    try {
      const imagePromises = files.map(async (file) => {
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} isn't an image file`);
        }
        if (file.size > 20 * 1024 * 1024) {
          throw new Error(`${file.name} is too large (max 20MB)`);
        }
        const compressedFile = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressedFile);
        return { file: compressedFile, originalFile: file, originalName: file.name, originalSize: file.size, compressedSize: compressedFile.size, preview: previewUrl, type: 'image', id: Date.now() + Math.random() };
      });
      const newImages = await Promise.all(imagePromises);
      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessingMedia(false);
    }
  };

  const handleVideoUpload = async (event) => {
    if (!isPro) {
      setShowProModal(true);
      return;
    }
    const files = Array.from(event.target.files);
    if (videos.length + files.length > 2) {
      setError("Max 2 videos per listing!");
      return;
    }
    setProcessingMedia(true);
    setError(null);
    try {
      const videoPromises = files.map(async (file) => {
        if (!file.type.startsWith('video/')) {
          throw new Error(`${file.name} isn't a video file`);
        }
        if (file.size > 100 * 1024 * 1024) {
          throw new Error(`${file.name} is too large (max 100MB)`);
        }
        const previewUrl = URL.createObjectURL(file);
        return { file: file, originalName: file.name, size: file.size, preview: previewUrl, type: 'video', id: Date.now() + Math.random() };
      });
      const newVideos = await Promise.all(videoPromises);
      setVideos(prev => [...prev, ...newVideos]);
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessingMedia(false);
    }
  };

  const removeMedia = (id, type) => {
    if (type === 'image') {
      setImages(prev => {
        const imageToRemove = prev.find(img => img.id === id);
        if (imageToRemove?.preview) URL.revokeObjectURL(imageToRemove.preview);
        return prev.filter(img => img.id !== id);
      });
    } else {
      setVideos(prev => {
        const videoToRemove = prev.find(vid => vid.id === id);
        if (videoToRemove?.preview) URL.revokeObjectURL(videoToRemove.preview);
        return prev.filter(vid => vid.id !== id);
      });
    }
  };

  const analyzeMedia = async (usePro = false) => {
    if (images.length === 0 && videos.length === 0) {
      setError("Upload at least one photo or video first!");
      return;
    }
    if (usePro && !isPro) {
      setShowProModal(true);
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockResult = {
        title: isPro ? "Premium Vintage Canon AE-1 35mm Film Camera w/ 50mm f/1.8 Lens - Tested Working" : "Vintage Canon Camera with Lens - Film Photography",
        description: isPro
          ? `🔥 PROFESSIONAL PHOTOGRAPHER'S VINTAGE TREASURE 🔥 ...` // Truncated for brevity
          : `Vintage Canon camera for sale. Good condition, includes lens. Perfect for film photography enthusiasts or collectors.`,
        condition: isPro ? "Excellent - Professionally Assessed" : "Good/Used",
        pricing: {
          startingBid: isPro ? "0.99" : "29.99",
          buyItNow: isPro ? "249.99" : "99.99",
          marketAverage: isPro ? "235.00" : null,
          priceConfidence: isPro ? "95%" : null
        },
        marketInsights: isPro ? "📈 HOT MARKET: Film cameras up 40% this year! ..." : null,
        competitorAnalysis: isPro
          ? [
              { title: "Canon AE-1 w/ 50mm - MINT", price: "280.00", status: "12 watchers", condition: "Mint" },
              { title: "Canon AE-1 Body Only", price: "145.00", status: "Sold yesterday", condition: "Good" }
            ]
          : null,
        platformTips: isPro ? "List on Sunday evening for 40% more views. ..." : "Consider adding more photos and detail for better results",
        keywords: isPro
          ? ["canon ae-1", "35mm camera", "film camera"]
          : ["camera", "vintage", "canon"],
        categoryId: isPro ? "15230" : "625",
        itemSpecifics: isPro
          ? { Brand: "Canon", Model: "AE-1", Type: "SLR" }
          : null,
        isPro: isPro || usePro
      };
      setCurrentResult(mockResult);
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCoffeeSupport = async () => {
    const email = prompt("Enter your email for 1 MONTH FREE PRO + updates:");
    if (!email || !email.includes('@')) {
      alert("Please enter a valid email to unlock Pro features");
      return;
    }
    setUserEmail(email);
    localStorage.setItem('spicylister_email', email);
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    setIsPro(true);
    setProExpiryDate(expiryDate);
    setSupporterType('coffee');
    localStorage.setItem('spicylister_pro', 'true');
    localStorage.setItem('spicylister_pro_expiry', expiryDate.toISOString());
    localStorage.setItem('spicylister_supporter_type', 'coffee');
    window.open('https://buymeacoffee.com/chrispteemagician', '_blank');
    setShowProModal(false);
    setTimeout(() => {
      alert(`🎉 PRO ACTIVATED! Valid until ${expiryDate.toLocaleDateString()}. Thank you for supporting the van life dream! 🚐`);
    }, 500);
  };

  // CUSTOM MODAL INSTEAD OF confirm
  const handlePremiumUpgrade = async () => {
    const email = prompt("Enter your email for LIFETIME PRO access:");
    if (!email || !email.includes('@')) {
      alert("Please enter a valid email");
      return;
    }
    setUserEmail(email);
    localStorage.setItem('spicylister_email', email);
    window.open('https://paypal.me/chrisptee/9.99', '_blank');
    setTimeout(() => {
      setOnPaymentConfirm(() => (confirmed) => {
        if (confirmed) {
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 100);
          setIsPro(true);
          setProExpiryDate(expiryDate);
          setSupporterType('premium');
          localStorage.setItem('spicylister_pro', 'true');
          localStorage.setItem('spicylister_pro_expiry', expiryDate.toISOString());
          localStorage.setItem('spicylister_supporter_type', 'premium');
          setShowProModal(false);
          alert("🎉 LIFETIME PRO ACTIVATED! Thank you for your amazing support!");
        }
      });
      setShowPaymentConfirm(true);
    }, 10000);
  };

  // ...rest of your helper functions...

  // Example UI for the main return (replace with your actual UI)
  return (
    <div style={{fontFamily: 'sans-serif', margin: 16}}>
      <h1>SpicyLister v1.2 🌶️🚀</h1>
      {/* Place your UI/inputs here */}
      {/* For brevity, UI elements are omitted—add your upload buttons etc. */}
      {/* Modals */}
      {/* PRO MODAL */}
      {showProModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 32, maxWidth: 370, textAlign: 'center', margin: 'auto'
          }}>
            <h2 style={{margin: 0}}>Stop leaving money on the table - Get REAL pricing data!</h2>
            <p style={{margin: 0, marginTop: 16, fontSize: 18, fontWeight: 600}}>Two Options</p>
            <button onClick={handleCoffeeSupport} style={{margin: 12, padding: 12, borderRadius: 8, background: '#fd0'}}>☕ 1 Month Pro</button>
            <button onClick={handlePremiumUpgrade} style={{margin: 12, padding: 12, borderRadius: 8, background: '#c0f'}}>⭐ Lifetime Pro</button>
            <button onClick={()=>setShowProModal(false)} style={{marginTop: 24}}>Cancel</button>
          </div>
        </div>
      )}
      {/* PAYPAL CONFIRM MODAL */}
      {showPaymentConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: 'white', padding: 24, borderRadius: 8, width: 300, textAlign: 'center', boxShadow: '0 4px 24px #0003',
          }}>
            <div style={{ marginBottom: 16, fontWeight: 'bold' }}>Did you complete the PayPal payment?</div>
            <button style={{ margin: '0 8px' }} onClick={() => { setShowPaymentConfirm(false); onPaymentConfirm(true); }}>Yes</button>
            <button style={{ margin: '0 8px' }} onClick={() => { setShowPaymentConfirm(false); onPaymentConfirm(false); }}>No</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpicyLister;
