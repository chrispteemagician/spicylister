import React, { useState, useRef, useCallback } from 'react';
import { Upload, Sparkles, Heart, Copy, RotateCcw, X, Zap, Share2, Facebook as Fb, ShoppingCart } from 'lucide-react';

const LOGO_URL = "/spicylister-logo.png";
const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/chrispteemagician";

const SpicyLister = () => {
  const [images, setImages] = useState([]);
  const [extraInfo, setExtraInfo] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedSection, setCopiedSection] = useState('');
  const [tipsExpanded, setTipsExpanded] = useState(false);
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
      setError("Max 3 photos for best results!");
      return;
    }
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
        return { file: compressedFile, preview: previewUrl, id: Date.now() + Math.random() };
      });
      const newImages = await Promise.all(imagePromises);
      setImages(prev => [...prev, ...newImages]);
    } catch (err) {
      setError(err.message);
    }
  };

  const removeImage = (id) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove?.preview) URL.revokeObjectURL(imageToRemove.preview);
      return prev.filter(img => img.id !== id);
    });
  };

  const analyzeImages = async () => {
    if (images.length === 0) {
      setError("Please upload at least one photo!");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const imageData = await Promise.all(
        images.map(img =>
          new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target.result.split(',')[1];
              resolve({ data: base64, mimeType: img.file.type });
            };
            reader.readAsDataURL(img.file);
          })
        )
      );
      const response = await fetch('/.netlify/functions/analyze-item', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ images: imageData, extraInfo: extraInfo.trim(), isPremium: false })
      });
      if (!response.ok) throw new Error(`Analysis failed (${response.status})`);
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(`SpicyBrain had a wobble: ${err.message} 😅`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startNewListing = () => {
    images.forEach(img => { if (img.preview) URL.revokeObjectURL(img.preview); });
    setImages([]); setExtraInfo(''); setResult(null); setError(null);
  };

  const copyToClipboard = async (text, section = '') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(''), 2000);
    } catch {}
  };

  const tips = [
    "List on Sunday evenings for best visibility—especially for auctions.",
    "Use clear, honest descriptions. Small flaws? Mention them: buyers trust you more.",
    "Take photos from several angles (front, back, close-up).",
    "Use keywords: brand, size, model, colour, condition.",
    "Send quick, friendly replies to enquiries. People buy from people they like!",
    "For Facebook Marketplace: include your area, accept sensible offers."
  ];

  const platforms = [
    { name: "eBay", icon: <ShoppingCart />, color: "#3f6be0" },
    { name: "Facebook Marketplace", icon: <Fb />, color: "#1671f5" },
    { name: "Gumtree", icon: <span style={{fontWeight:700}}>GT</span>, color: "#29a400" },
    { name: "Vinted", icon: <span style={{fontWeight:700}}>V</span>, color: "#00bfae" },
    { name: "Copy All", icon: <Copy />, color: "#fa573b" }
  ];

  function formatOutput(platform) {
    if (!result) return "";
    let out = `Title: ${result.title}\n\n${result.description}\nCondition: ${result.condition}\nStarting Bid: £${result.pricing?.startingBid} | Buy It Now: £${result.pricing?.buyItNow}\n\n${result.platformTips || ''}`;
    if (platform.name === "Copy All") return out;
    return out + `\n\n(Listed via SpicyLister for ${platform.name})`;
  }

  return (
    <div style={{ maxWidth: 630, margin: "36px auto", padding: 22, borderRadius: 15, background: "#fffdfa", boxShadow: "0 9px 36px #fe573c20" }}>
      <div style={{textAlign:"center", marginBottom: 9}}>
        <img src={LOGO_URL} alt="SpicyLister Logo" style={{width: 120, margin: "0 auto", borderRadius: 16, boxShadow:"0 2px 16px #fea82a42"}}/>
      </div>
      <h1 style={{ fontSize: 38, marginBottom: 7, color: "#fe632c", fontFamily: "Baloo 2, Arial, sans-serif", letterSpacing:2 }}>
        <Sparkles /> SpicyLister <Zap style={{ color: "#e84118" }}/> 
      </h1>
      <div style={{ fontSize: 20, color: "#593", marginBottom:8, fontWeight: 700 }}>Dopamine Hits for Decluttering Heroes! 🌶️</div>
      <div style={{ fontSize: 17, color: "#984", fontWeight: 500, marginBottom: 11 }}>
        One-click. Three photos max. SpicyBrain gives you a researched price, title, and description—ready for eBay, Facebook, Gumtree, Vinted and more!
      </div>
      <div style={{ background: "#ffe3b1", color: "#a42b0a", border: "2px solid #fcad43", borderRadius: 10, margin: "17px 0", padding: "16px 21px", fontSize: 17, fontWeight: "bold" }}>
        ⚠️ <b>Don't lose your work!</b><br />
        SpicyLister doesn't save it—copy your result before leaving or refreshing.
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
      <div style={{textAlign:"center"}}>
        <button style={{ margin: "18px 0", background: "#fa9547", color: "#171527", fontWeight: 900, fontSize: 24, border: 0, borderRadius: 12, padding: "14px 27px", cursor: "pointer", letterSpacing: 1 }} onClick={() => fileInputRef.current.click()}>
          <Upload /> SpicyLister: Upload Photo{images.length !== 1 ? "s" : ""}
        </button>
      </div>
      <div>
        {images.length > 0 && (
          <div style={{ margin: "14px 0" }}>
            {images.map(img => (
              <span key={img.id} style={{ display: "inline-block", marginRight: 8, verticalAlign: "middle", position: "relative" }}>
                <img src={img.preview} alt="" style={{ width: 86, height: 86, objectFit: "cover", borderRadius: 9, border: "2px solid #f94" }} />
                <X style={{ position: "absolute", right: 2, top: 2, background: "#fff", borderRadius: "50%", cursor: "pointer", color: "#d11", fontSize: 18 }} onClick={() => removeImage(img.id)} />
              </span>
            ))}
          </div>
        )}
      </div>
      {images.length > 0 && (
        <div>
          <textarea
            placeholder="Add extra notes? (brand, size, flaws...)"
            value={extraInfo}
            onChange={e => setExtraInfo(e.target.value)}
            style={{ width: "100%", padding: 13, fontSize: 17, borderRadius: 7, border: "1px solid #faa264", marginBottom: 11, marginTop: 8, background:"#fff6eb" }}
            rows={2}
          ></textarea>
          <div style={{textAlign:"center"}}>
            <button style={{ background: "#1779fd", color: "#fff", fontSize: 21, fontWeight: 900, border: 0, borderRadius: 11, padding: "13px 27px", cursor: "pointer" }} disabled={isAnalyzing} onClick={analyzeImages}>
              <Zap /> Analyze
            </button>
          </div>
        </div>
      )}
      {error && <div style={{ color: "#d11", background: "#fee", padding: 8, borderRadius: 7, marginTop: 10, fontWeight: 700 }}>{error}</div>}
      {isAnalyzing && <div style={{ color: "#e66300", fontWeight: 800, fontSize: 19, marginTop:14, textAlign:"center" }}>🌶️ SpicyBrain is analyzing your item… Dopamine incoming!</div>}
      {result && (
        <div style={{ marginTop: 18, padding: 15, background: "#fff9ee", borderRadius: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#ec572e"}}><Sparkles /> {result.title || "AI Result"}</div>
          <div style={{ color: "#444", margin: "11px 0 7px 0", fontSize: 17 }}>{result.description}</div>
          {result.condition && <div style={{ fontWeight: 600, color: "#653" }}>Condition: <span style={{fontWeight:400}}>{result.condition}</span></div>}
          {result.pricing && (
            <div>
              <strong>Pricing:</strong> <span style={{ color: "#2c3" }}>Starting Bid: £{result.pricing.startingBid}</span> | BIN: <span style={{ color:'#0070ae'}}>£{result.pricing.buyItNow}</span>
            </div>
          )}
          <div style={{marginTop:7}}>
            <strong>Copy for:</strong>
            <div style={{display:"flex", flexWrap:"wrap",gap:8, marginTop: 6}}>
              {platforms.map((p, idx) => (
                <button key={p.name} onClick={()=>copyToClipboard(formatOutput(p), p.name)} style={{background:p.color, color:'#fff',border:0,borderRadius:7,padding:"8px 14px",display:'flex',alignItems:'center',fontWeight:700,fontSize:15}}>
                  {p.icon}&nbsp;{p.name} {copiedSection===p.name?"(Copied!)":""}
                </button>
              ))}
            </div>
          </div>
          <button style={{ marginTop: 17, background: "#fafafa", color: "#333", border: "1px solid #ddd", borderRadius: 7, padding: "10px 23px", cursor: "pointer" }} onClick={startNewListing}><RotateCcw /> New Listing</button>
          {result.platformTips &&
            <div style={{marginTop:13, fontStyle:"italic", color:"#987", fontSize:16}}>
              <Share2 /> {result.platformTips}
            </div>
          }
          <div style={{marginTop:12, fontWeight:700, color:"#1a8"}}>
            🎉 Well Done! You’re making it happen. Every photo is a win!
          </div>
          <div style={{marginTop:9, fontSize:15}}>
            If this helped, <a href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noopener noreferrer" style={{color:"#f4840a",fontWeight:700}}>buy me a coffee & get Pro free for a month!</a>
          </div>
        </div>
      )}

      <div style={{ margin:"27px 0" }}>
        <button 
          style={{background:"#f6e29b", border:0, color:"#8a5d07",padding:"13px 20px",borderRadius:8, fontWeight:600, fontSize:17}}
          onClick={()=>setTipsExpanded(!tipsExpanded)}
        >
          {tipsExpanded ? "Hide Selling Tips" : "Need a boost? Show dopamine-friendly selling tips!"}
        </button>
        {tipsExpanded && (
          <ul style={{ background:"#fff5df", borderRadius:6, padding:"17px 18px", marginTop:8, fontSize:16, color:"#652", boxShadow:"0 1px 6px #fe7a0c15"}}>
            {tips.map((t,i)=><li style={{marginBottom:7}} key={i}>{t}</li>)}
            <li style={{color:"#26b48f",fontWeight:600}}>Remember: You’re awesome! Your stuff deserves good buyers and you deserve the sale.</li>
            <li style={{color:"#f55"}}>Give yourself a pat on the back, neurospicy superstar! 🌶️👏</li>
          </ul>
        )}
      </div>

      {/* AdWords or display ads slot */}
      <div id="adsense-spicy" style={{padding:"8px 0 4px 0", margin:"20px auto 0", textAlign:"center", minHeight:42, borderRadius:10, background:"#f8f8fc"}}>
        {/* Place your Google AdSense code or leave blank if not using ads */}
        <span style={{fontSize:12, color:"#bbb"}}>Support keeps SpicyLister free. 💸 Ads help fund the project.</span>
      </div>
      <footer style={{ marginTop: 30, textAlign: "center", color: "#555", fontWeight: 500, fontSize: 17 }}>
        Made with <Heart style={{ color: "#f55", verticalAlign: "middle" }}/> for neurospicy declutterers
        <br />
        <a href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#f4840a", fontSize: 15, marginLeft:7, fontWeight:700}}>Buy Me a Coffee</a>
      </footer>
    </div>
  );
}

export default SpicyLister;
