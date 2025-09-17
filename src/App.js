import React, { useState, useRef } from 'react';
import axios from 'axios';

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const MAX_IMAGES_FREE = 3;

// Image compression function
const compressImage = (file, maxDimension = 1024, quality = 0.8) =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new window.FileReader();
    reader.onload = e => {
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const scale = maxDimension / Math.max(width, height);
          width *= scale;
          height *= scale;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error("Compress failed")),
          'image/jpeg', quality
        );
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });

const SpicyLister = () => {
  // STATE
  const [images, setImages] = useState([]);
  const [extraInfo, setExtraInfo] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const imgInputRef = useRef();

  // IMAGE UPLOAD
  const handleImages = async e => {
    setError('');
    const files = Array.from(e.target.files);
    if (images.length + files.length > MAX_IMAGES_FREE) {
      setError(`Max ${MAX_IMAGES_FREE} images. You can upgrade for more soon!`);
      return;
    }
    const compressed = await Promise.all(
      files.map(file => compressImage(file).then(
        blob => ({
          file: blob,
          name: file.name,
          preview: URL.createObjectURL(blob),
          id: Date.now() + Math.random()
        }),
        err => null
      ))
    );
    setImages(old => [...old, ...compressed.filter(f => f)]);
  };

  const removeMedia = id => setImages(imgs => imgs.filter(i => i.id !== id));

  // AI - Gemini Vision if images, fallback Gemini Pro text
  const analyzeMedia = async () => {
    setError('');
    setResult(null);
    if (images.length < 1 && !extraInfo.trim()) {
      setError('Upload at least one image or describe your item.');
      return;
    }
    setProcessing(true);

    // 1. Try Gemini Vision if there are images
    if (images.length > 0 && GEMINI_API_KEY) {
      try {
        const reader = new window.FileReader();
        reader.onloadend = async () => {
          const base64img = reader.result.split(',')[1];
          const visionPrompt =
            `Write a perfect UK eBay listing, with a title, engaging description, suggested price, and 5-10 keywords. 
             Only use what can be seen in the image. Respond in JSON with "title", "description", "keywords", "price". 
             Do not hallucinate—and warn if some details might be missing.`;

          const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`,
            {
              contents: [
                {
                  parts: [
                    { text: visionPrompt + (extraInfo ? "\nExtra details: " + extraInfo : "") },
                    { inlineData: { mimeType: 'image/jpeg', data: base64img } }
                  ]
                }
              ]
            }
          );
          const raw = response.data.candidates[0].content.parts[0].text;
          const clean = raw.replace(/^``````$/g, '').trim();
          const listing = JSON.parse(clean);
          setResult({
            title: listing.title,
            description: listing.description,
            keywords: Array.isArray(listing.keywords) ? listing.keywords : (listing.keywords ? listing.keywords.split(/, ?/) : []),
            price: listing.price
          });
          setProcessing(false);
        };
        reader.readAsDataURL(images[0].file);
        return;
      } catch (er) {
        // Vision failed, fallback
      }
    }

    // 2. Fallback: Gemini Pro (text only)
    if (extraInfo.trim() && GEMINI_API_KEY) {
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
          {
            contents: [
              {
                parts: [
                  { text: `Write the best possible UK eBay listing for: "${extraInfo}". JSON response only, keys: title, description, keywords, price. Warn if details/images are missing. Positive, fun, neurodivergent-friendly tone. Never guess images.` }
                ]
              }
            ]
          }
        );
        const raw = response.data.candidates[0].content.parts[0].text;
        const clean = raw.replace(/^``````$/g, '').trim();
        const listing = JSON.parse(clean);

        setResult({
          title: listing.title,
          description: listing.description,
          keywords: Array.isArray(listing.keywords) ? listing.keywords : (listing.keywords ? listing.keywords.split(/, ?/) : []),
          price: listing.price
        });
        setProcessing(false);
        return;
      } catch (er) {
        setError("AI failed: " + (er.response?.data?.error?.message || er.message));
      }
    }

    // 3. Ultimate fallback
    setProcessing(false);
    setError("Sorry, AI could not process this item—try simpler text, a different image, or ask Chris for help!");
  };

  // TOP TIPS modal
  const showTips = () => alert(
    "TOP TIPS:\n- Clean, clear photos help AI get it right!\n- Include measurements, brand, condition, and all flaws\n- BE HONEST in extra details to avoid returns\n- Use specific words: not 'old mug' but 'Emma Bridgewater 2007 Polka Dot Large Mug'\n- Price below sold listings if you want a quick sale!\n- You can edit the output to match your style/kudos vibe!"
  );

  // PRO unlock (just shows thank you, upgrade not implemented yet)
  const handleCoffeeSupport = () => {
    window.open('https://buymeacoffee.com/chrispteemagician', '_blank');
    setTimeout(() => alert("Thank you so much! In future, this will activate Pro and shout you out in the FeelFamous Kudos system!"), 6000);
  };

  return (
    <div style={{ fontFamily:'sans-serif',background:'#fffaf5',minHeight:'100vh',paddingBottom:80 }}>
      {/* HEADER */}
      <div style={{ display:'flex',alignItems:'center',gap:12,marginTop:16,marginBottom:8 }}>
        <img src="/spicylister-logo.png" alt="SpicyLister Logo"
             style={{height:54,width:54,borderRadius:16,boxShadow:'0 1px 12px #e87413',background:'#fffbe7'}} />
        <div>
          <h1 style={{margin:0,color:'#e87413',fontFamily:'cursive',letterSpacing:1}}>🌶️ SpicyLister</h1>
          <div style={{fontWeight:700,color:'#633202'}}>Sell Your Clutter Without a Stutter!</div>
        </div>
      </div>
      <div style={{color:'#b4561f',fontSize:16,marginBottom:8}}>Photo. Details. AI Listing. Done. Not a food or selling site. Images never saved.</div>
      {/* Upload/images */}
      <div style={{
        border:"2px dashed #e87413",background:"#fff8f2",borderRadius:14,
        padding:20,margin:"18px 0 12px 0"
      }}>
        <b>Upload up to 3 images (jpg/png):</b>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:7,marginBottom:10,minHeight:56}}>
          {images.map(img=>(
            <div key={img.id} style={{position:"relative"}}>
              <img src={img.preview} alt="" style={{height:46,width:46,borderRadius:7,border:"1px solid #ffa75c"}} />
              <button title="Remove" onClick={()=>removeMedia(img.id)}
                style={{position:"absolute",top:-7,right:-7,background:"#fa5027",color:"#fff",border:"none",borderRadius:"50%",width:21,height:21,cursor:"pointer"}}>✖</button>
            </div>
          ))}
          {images.length < MAX_IMAGES_FREE &&
            <button onClick={()=>imgInputRef.current.click()} style={{
              height:46,width:46,borderRadius:7,border:"2px dashed #e87413",fontSize:26,background:"#fffbe9",color:"#e87413",cursor:"pointer"
            }}>+</button>
          }
          <input ref={imgInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleImages} />
        </div>
        <div style={{marginBottom:8}}>Add extra details (opt): <i style={{color:"#a67c44"}}>brand, size, condition, flaws, age, etc.</i></div>
        <textarea
          style={{ width:"100%", minHeight: 56, fontSize:16, borderRadius:7, border:"1.5px solid #dab28a", marginBottom:7, padding:7, lineHeight:1.3 }}
          placeholder="e.g. 1960s enamel mug, made in England, chipped rim, well used, festival vanlife classic."
          value={extraInfo} onChange={e=>setExtraInfo(e.target.value)}
        />
        {error && <div style={{ color:'red', fontWeight:700,margin:'8px 0 0 0' }}>{error}</div>}
      </div>
      {/* Buttons */}
      <div style={{margin:'22px 0'}}>
        <button style={{
            fontSize: 22, padding: "13px 32px", background:"linear-gradient(90deg,#ff9001,#fa3b38,#fcb900)",
            color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontWeight:700,boxShadow:"0 1px 10px #e87413",display:"flex",alignItems:"center"
          }} onClick={analyzeMedia} disabled={processing}>
          <img src="/spicylister-logo.png" alt="" style={{height:28,width:28,borderRadius:7,marginRight:8}}/> Generate!
        </button>
        <button onClick={showTips}
                style={{marginLeft:16,padding:"10px 22px",background:"#fee7b4",color:"#684212",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer"}}>Top Tips</button>
        <button onClick={handleCoffeeSupport}
                style={{marginLeft:16,padding:"10px 22px",background:"#fd0",color:"#222",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer"}}>Get Pro for a Coffee</button>
        <a href="https://ko-fi.com/zoom" target="_blank" rel="noopener noreferrer"
           style={{marginLeft:14,background:"#e74c3c",color:"#fff",padding:"10px 21px",borderRadius:9,fontWeight:"bold",textDecoration:"none"}}>Ko-fi</a>
      </div>
      {processing && <div style={{fontWeight:"bold",color:"#fa5027",margin:"24px 0",fontSize:19}}>Analyzing with AI…</div>}
      {result &&
        <div style={{
           margin:"28px 0",background:"#ffefd5",borderRadius:14,padding:"18px 21px",boxShadow:"0 2px 10px #ffe7b0"
        }}>
          <h2 style={{color:"#b4561f",marginTop:0}}>📝 Listing & Valuation:</h2>
          <input value={result.title} readOnly style={{
            width:"100%",fontWeight:700,fontSize:21,margin:"7px 0",borderRadius:7,padding:"6px 9px",border:"1px solid #e5c180",background:"#fffbe3"
          }}/>
          <textarea value={result.description} readOnly style={{
            width:"100%",minHeight:60,fontSize:17,margin:"7px 0",borderRadius:7,padding:"7px 9px",border:"1px solid #e5c180",background:"#fffbe3"
          }}/>
          <div><span style={{background:"#232",color:"#fff",borderRadius:7,padding:"2px 10px",marginRight:10}}>Keywords:</span>
            {result.keywords && result.keywords.map(kw=>(
              <span key={kw} style={{background:"#faedbe",borderRadius:4,padding:"2px 9px",margin:"0 4px",color:"#884f04"}}>{kw}</span>
            ))}
          </div>
          {result.price && <div style={{margin:"14px 0 6px 0",fontWeight:"bold",fontSize:18,background:"#fae7b4",display:"inline-block",padding:"5px 16px",borderRadius:7}}>
            Valuation: {result.price}
          </div>}
          <div style={{fontSize:13,color:"#555",marginTop:10}}>AI may summarize or miss hidden details—always check and edit as you wish!</div>
        </div>
      }
      {/* Footer */}
      <div style={{
        position: "fixed", width: "100%", left: 0, bottom: 0, background: "#fff3e8", padding: "11px 0",
        color: "#7b3a0b", fontWeight: 600, textAlign: "center", fontFamily: "monospace", fontSize: 16, borderTop: "1px solid #ffb56b"
      }}>
        Made with <span style={{color:"#e74c3c"}}>❤️</span> by Chris P Tee – Vanlife + Comedy + Magic + Code
      </div>
    </div>
  );
};

export default SpicyLister;
