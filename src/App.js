import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, Sparkles, Coffee, CheckCircle, Copy,
  RotateCcw, Search, AlertCircle, Crown, Video, Camera
} from 'lucide-react';

const SpicyLister = () => {
  // State
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [extraInfo, setExtraInfo] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedSection, setCopiedSection] = useState('');
  const [processingMedia, setProcessingMedia] = useState(false);

  const [isPro, setIsPro] = useState(false);
  const [proExpiryDate, setProExpiryDate] = useState(null);
  const [showProModal, setShowProModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [supporterType, setSupporterType] = useState(null);

  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Restore Pro state if previously set
  useEffect(() => {
    const savedPro = localStorage.getItem('spicylister_pro');
    const savedExpiry = localStorage.getItem('spicylister_pro_expiry');
    const savedEmail = localStorage.getItem('spicylister_email');
    const savedSupporter = localStorage.getItem('spicylister_supporter_type');
    if (savedPro === 'true' && savedExpiry) {
      const expiryDate = new Date(savedExpiry);
      if (expiryDate > new Date()) {
        setIsPro(true); setProExpiryDate(expiryDate);
      } else {
        localStorage.removeItem('spicylister_pro');
        localStorage.removeItem('spicylister_pro_expiry');
      }
    }
    if (savedEmail) setUserEmail(savedEmail);
    if (savedSupporter) setSupporterType(savedSupporter);
  }, []);

  // Image compression
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
          width *= scale; height *= scale;
        }
        canvas.width = width; canvas.height = height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Failed to compress image')), 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Image upload
  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    const maxImages = isPro ? 10 : 3;
    if (images.length + files.length > maxImages) {
      setError(`Max ${maxImages} photos${isPro ? ' per item' : ''}!`);
      return;
    }
    setProcessingMedia(true); setError(null);
    try {
      const imgs = await Promise.all(files.map(async file => {
        if (!file.type.startsWith('image/')) throw new Error("Not an image");
        if (file.size > 20 * 1024 * 1024) throw new Error("Too large (max 20MB)");
        const compressed = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressed);
        return { file: compressed, originalName: file.name, preview: previewUrl, id: Date.now() + Math.random(), type: 'image' };
      }));
      setImages(prev => [...prev, ...imgs]);
    } catch (e) { setError(e.message); }
    finally { setProcessingMedia(false); }
  };

  // Video upload (Pro only)
  const handleVideoUpload = async (event) => {
    if (!isPro) return setShowProModal(true);
    const files = Array.from(event.target.files);
    if (videos.length + files.length > 2) { setError("Max 2 videos per listing!"); return; }
    setProcessingMedia(true); setError(null);
    try {
      const vids = await Promise.all(files.map(async file => {
        if (!file.type.startsWith('video/')) throw new Error("Not a video");
        if (file.size > 100 * 1024 * 1024) throw new Error("Too large (max 100MB)");
        const previewUrl = URL.createObjectURL(file);
        return { file, originalName: file.name, preview: previewUrl, id: Date.now() + Math.random(), type: 'video' };
      }));
      setVideos(prev => [...prev, ...vids]);
    } catch (e) { setError(e.message); }
    finally { setProcessingMedia(false); }
  };

  const removeMedia = (id, type) => {
    if (type === 'image') setImages(prev => {
      const toRemove = prev.find(img => img.id === id);
      if (toRemove?.preview) URL.revokeObjectURL(toRemove.preview);
      return prev.filter(img => img.id !== id);
    });
    else setVideos(prev => {
      const toRemove = prev.find(vid => vid.id === id);
      if (toRemove?.preview) URL.revokeObjectURL(toRemove.preview);
      return prev.filter(vid => vid.id !== id);
    });
  };

  // AI/Gemini Integration
  const analyzeMedia = async () => {
    if (images.length === 0 && videos.length === 0) { setError("Upload at least one photo or video!"); return; }
    setIsAnalyzing(true); setError(null);
    try {
      const imageData = await Promise.all(
        images.map(async img => new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => resolve({ data: e.target.result.split(',')[1], mimeType: img.file.type });
          reader.readAsDataURL(img.file);
        }))
      );
      const videoData = await Promise.all(
        videos.map(async vid => new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => resolve({ data: e.target.result.split(',')[1], mimeType: vid.file.type });
          reader.readAsDataURL(vid.file);
        }))
      );
      const response = await fetch('/.netlify/functions/analyze-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imageData, videos: videoData, extraInfo: extraInfo.trim(), isPro }),
      });
      if (!response.ok) throw new Error(`AI analysis failed (${response.status})`);
      setCurrentResult(await response.json());
    } catch (err) { setError(`Analysis failed: ${err.message}`); }
    finally { setIsAnalyzing(false); }
  };

  // Pro upgrade logic (no confirm)
  function activateLifetimePro() {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 100);
    setIsPro(true);
    setProExpiryDate(expiryDate);
    setSupporterType('premium');
    localStorage.setItem('spicylister_pro', 'true');
    localStorage.setItem('spicylister_pro_expiry', expiryDate.toISOString());
    localStorage.setItem('spicylister_supporter_type', 'premium');
    setShowProModal(false);
    alert("Thanks, supporter! Lifetime Pro is now unlocked in this browser. Reach out if you need help—you're legendary! 🙏");
  }

  function activateMonthPro() {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    setIsPro(true);
    setProExpiryDate(expiryDate);
    setSupporterType('coffee');
    localStorage.setItem('spicylister_pro', 'true');
    localStorage.setItem('spicylister_pro_expiry', expiryDate.toISOString());
    localStorage.setItem('spicylister_supporter_type', 'coffee');
    setShowProModal(false);
    alert("Thank you! SpicyLister Pro unlocked for 1 month—enjoy advanced features, and much love for supporting open source! 😊");
  }

  // Utility
  const copyToClipboard = async (text, section = '') => {
    try { await navigator.clipboard.writeText(text); setCopiedSection(section); setTimeout(() => setCopiedSection(''), 2000); } catch (err) { }
  };
  const searchEbayWithTitle = () => {
    if (currentResult?.title) window.open(`https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(currentResult.title)}`, '_blank');
  };
  const startNewListing = () => {
    images.forEach(img => { if (img.preview) URL.revokeObjectURL(img.preview); });
    videos.forEach(vid => { if (vid.preview) URL.revokeObjectURL(vid.preview); });
    setImages([]); setVideos([]); setExtraInfo(''); setCurrentResult(null); setError(null); setCopiedSection('');
  };

  // Pro Modal UI
  const ProModal = () => showProModal && (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#0008",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
    }}>
      <div style={{
        background: "#fff", borderRadius: 22, maxWidth: 520, width: "95%", padding: 30
      }}>
        <h3 style={{
          fontSize: 25, background: "linear-gradient(45deg,#8f62d1,#eb89b6)", WebkitBackgroundClip: "text",
          color: "transparent", marginBottom: 14
        }}>Unlock SpicyLister PRO!</h3>
        <p>🪄 Batch, Video, AI pricing and more…</p>
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: 17 }}>
          <button
            onClick={() => { window.open('https://buymeacoffee.com/chrispteemagician', '_blank'); activateMonthPro(); }}
            style={{ border: "none", background: "#fd9e2f", color: "#fff", fontWeight: 700, padding: "12px", borderRadius: 11, fontSize: 17 }}>
            <Coffee /> 1 Month Pro (£3)
          </button>
          <button
            onClick={() => { window.open('https://paypal.me/chrisptee/9.99', '_blank'); activateLifetimePro(); }}
            style={{ border: "none", background: "#8736e9", color: "#fff", fontWeight: 700, padding: "12px", borderRadius: 11, fontSize: 17 }}>
            <Crown /> Lifetime Pro (£9.99)
          </button>
        </div>
        <div>
          <button onClick={() => setShowProModal(false)} style={{ background: "none", border: "none", color: "#a98c3d", marginTop: 23 }}>Maybe later</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#fffdfa", minHeight: "100vh" }}>
      <ProModal />
      <div style={{ maxWidth: 700, margin: "0 auto", padding: 24 }}>
        <header style={{ textAlign: "center" }}>
          <h1 style={{ fontWeight: 800, fontSize: 27 }}>🌶️ SpicyLister</h1>
          <span style={{ color: "#ad5e21" }}>Forever free, Pro for supporters</span>
        </header>
        {isPro && (
          <div style={{ padding: 12, background: "#f6edfc", borderRadius: 12, marginBottom: 17 }}>
            <Crown style={{ verticalAlign: "-2px", color: "#a36bf7" }} /> <b>PRO ACTIVE</b>
            &nbsp;{supporterType === 'premium' ? '(Lifetime)' : `until ${proExpiryDate?.toLocaleDateString()}`}
            &nbsp;<span style={{ color: "#666" }}>{userEmail}</span>
          </div>
        )}
        {error && <div style={{ marginBottom: 10, color: "#d03" }}><AlertCircle style={{ verticalAlign: "-3px" }} />{error}</div>}

        {/* Media upload UI */}
        <div style={{ padding: 16, background: "#fff", borderRadius: 12, marginBottom: 12, boxShadow: "0 2px 8px #0001" }}>
          <label>
            <Camera style={{ verticalAlign: "-3px", marginRight: 8 }} />
            <b>Images ({isPro ? "up to 10" : "up to 3"})</b>
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImageUpload} disabled={processingMedia} />
            <button type="button" style={{ marginLeft: 14, background: "#f97e3c", border: "none", color: "#fff", padding: "7px 17px", borderRadius: 8 }}
              onClick={() => fileInputRef.current?.click()} disabled={processingMedia}>Upload Image</button>
          </label>
          <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
            {images.map((img, i) => <span key={img.id} style={{ position: "relative" }}>
              <img alt={`Img${i + 1}`} src={img.preview} width={62} height={62} style={{ borderRadius: "50%", border: "2px solid #fd9e2f" }} />
              <button aria-label="Remove image"
                onClick={() => removeMedia(img.id, "image")}
                style={{ position: "absolute", top: -8, right: -8, background: "#e33", color: "#fff", border: "none", borderRadius: "50%", width: 21, height: 21, fontWeight: 900, fontSize: 15 }}>×</button>
            </span>)}
          </div>
          <hr style={{ margin: "13px 0" }} />
          <label>
            <Video style={{ verticalAlign: "-3px", marginRight: 8 }} />
            <b>Video {isPro ? "(pro only)" : "(upgrade for videos)"}</b>
            <input ref={videoInputRef} type="file" accept="video/*" multiple style={{ display: "none" }} onChange={handleVideoUpload} disabled={processingMedia || !isPro} />
            <button type="button" style={{ marginLeft: 12, background: "#915eff", border: "none", color: "#fff", padding: "7px 14px", borderRadius: 8 }}
              onClick={() => videoInputRef.current?.click()} disabled={processingMedia || !isPro}>Upload Video</button>
          </label>
          <div style={{ display: "flex", gap: 9, marginTop: 6 }}>
            {videos.map((vid, i) => <span key={vid.id} style={{ position: "relative" }}>
              <video src={vid.preview} width={65} height={55} style={{ borderRadius: 7, border: "2px solid #ab8ff7" }} controls/>
              <button aria-label="Remove video"
                onClick={() => removeMedia(vid.id, "video")}
                style={{ position: "absolute", top: -6, right: -7, background: "#5446ee", color: "#fff", border: "none", borderRadius: "50%", width: 21, height: 21, fontWeight: 900, fontSize: 15 }}>×</button>
            </span>)}
          </div>
          <div style={{ marginTop: 12 }}>
            <input type="text" value={extraInfo} onChange={e => setExtraInfo(e.target.value)}
              placeholder="Extra info (brand, condition, etc)?" style={{ padding: 7, border: "1px solid #eee", borderRadius: 7, fontSize: 15, minWidth: 168 }} />
          </div>
          <button onClick={analyzeMedia} disabled={isAnalyzing || processingMedia}
            style={{ background: "#07b650", color: "#fff", marginTop: 14, fontWeight: 700, padding: "10px 22px", border: "none", borderRadius: 8, fontSize: 17 }}>
            {isAnalyzing ? <span><Sparkles /> Generating…</span> : <span><Sparkles /> Generate Listing</span>}
          </button>
        </div>

        {/* AI Listing Result */}
        {currentResult && (
          <div style={{ background: "#f0f7ef", borderRadius: 13, padding: 21, margin: "21px 0" }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#21a242", marginBottom: 9 }}>
              <CheckCircle style={{ verticalAlign: "-2px", color: "#30cc70" }} /> Listing Ready
            </h3>
            <div style={{ whiteSpace: "pre-wrap", background: "#fff", padding: 13, borderRadius: 8, border: "1px solid #dbefe4", fontFamily: "inherit", fontSize: 16, marginBottom: 13 }}>
              <strong>{currentResult.title}</strong>{"\n"}
              {currentResult.description}
            </div>
            <div style={{ display: "flex", gap: 13 }}>
              <button onClick={() => copyToClipboard(currentResult.title + "\n\n" + currentResult.description, "result")}
                style={{ background: "#3082f4", color: "#fff", padding: "7px 18px", borderRadius: 8, border: "none" }}>
                <Copy /> Copy{copiedSection === 'result' ? " ✓" : ""}
              </button>
              <button onClick={searchEbayWithTitle}
                style={{ background: "#fd9e2f", color: "#fff", padding: "7px 18px", borderRadius: 8, border: "none" }}>
                <Search /> Search eBay
              </button>
              <button onClick={startNewListing}
                style={{ background: "#bbb", color: "#fff", padding: "7px 18px", borderRadius: 8, border: "none" }}>
                <RotateCcw /> New
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpicyLister;
