import React, { useState, useRef, useCallback } from 'react';
import { Upload, Sparkles, Coffee, X } from 'lucide-react';

// Alert message component
function AlertMsg({ children }) {
  if (!children) return null;
  return (
    <div style={{
      background: '#ffe082', color: '#222', padding: '12px',
      margin: '16px 0', borderRadius: 8, fontWeight: 600
    }}>{children}</div>
  );
}

// Drag-and-drop batch UI
function GroupingArea({ groups, images, setGroups, onRemove }) {
  const [dragId, setDragId] = useState(null);

  function handleDrop(e, groupIdx) {
    e.preventDefault();
    const imageId = dragId;
    if (!imageId) return;
    let imgObj;
    for (const g of groups) {
      const i = g.images.findIndex(img => img.id === imageId);
      if (i > -1) {
        imgObj = g.images[i];
        g.images.splice(i, 1);
        break;
      }
    }
    if (imgObj && groupIdx !== undefined && groupIdx < groups.length) {
      groups[groupIdx].images.push(imgObj);
      setGroups([...groups]);
    }
    setDragId(null);
  }

  function dragStart(e, imageId) {
    setDragId(imageId);
  }

  function removeGroup(idx) {
    groups.splice(idx, 1);
    setGroups([...groups]);
  }

  function createGroupFromImage(imageObj) {
    setGroups([...groups, { name: `New listing #${groups.length + 1}`, images: [imageObj] }]);
  }

  const groupedIds = new Set(groups.flatMap(g => g.images.map(img => img.id)));
  const ungrouped = images.filter(img => !groupedIds.has(img.id));

  return (
    <div>
      <div style={{ marginTop: 14, marginBottom: 18, fontWeight: 500 }}>
        <Sparkles /> Drag images into listing groups below!
      </div>
      {groups.map((group, idx) =>
        <div key={idx} style={{
          display: 'flex', alignItems: 'center', background: '#f0f4c3', padding: 12,
          borderRadius: 8, marginBottom: 10
        }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, idx)}
        >
          <div style={{ fontWeight: 700, fontSize: 17 }}>
            {group.name}
            <span style={{ marginLeft: 12, fontSize: 13, color: '#777' }}>
              ({group.images.length} image{group.images.length !== 1 && 's'})
            </span>
            <X style={{
              marginLeft: 10, cursor: 'pointer', color: '#bb1111'
            }} onClick={() => removeGroup(idx)} />
          </div>
          <div style={{ display: 'flex', marginLeft: 22 }}>
            {group.images.map(img =>
              <div key={img.id} draggable
                onDragStart={e => dragStart(e, img.id)}
                style={{ marginRight: 8, marginTop: 7 }}
              >
                <img src={img.preview} alt=""
                  style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 7, border: '1px solid #ccc' }} />
                <X style={{ fontSize: 19, color: '#810', cursor: 'pointer' }} onClick={() => onRemove(img.id)} />
              </div>
            )}
          </div>
        </div>
      )}
      {!!ungrouped.length &&
        <div>
          <div style={{ marginTop: 12, fontWeight: 500 }}>Not grouped yet:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 8 }}>
            {ungrouped.map(img =>
              <div key={img.id} style={{ marginRight: 14, marginBottom: 10, position: 'relative' }}>
                <img
                  src={img.preview}
                  alt=""
                  draggable
                  onDragStart={e => dragStart(e, img.id)}
                  onDoubleClick={() => createGroupFromImage(img)}
                  style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 7, border: '2px solid #e91e63' }}
                />
                <span style={{
                  position: 'absolute', right: 2, top: 2, background: '#fffadc', borderRadius: '50%',
                  fontWeight: 800, padding: '0 4px'
                }} title="Double click to new group">+</span>
                <X style={{ fontSize: 18, color: '#810', cursor: 'pointer', position: 'absolute', bottom: 2, right: 2 }}
                  onClick={() => onRemove(img.id)} />
              </div>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>
            (Double-click an image to create a new group for it)
          </div>
        </div>
      }
    </div>
  );
}

const SpicyLister = () => {
  const [images, setImages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [extraInfo, setExtraInfo] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const fileInputRef = useRef(null);

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    setError(null);
    try {
      const imagePromises = files.map(async (file) => {
        if (!file.type.startsWith('image/')) throw new Error(`${file.name} isn't an image file 🤔`);
        const previewUrl = URL.createObjectURL(file);
        return {
          file, preview: previewUrl, id: Date.now() + Math.random(), name: file.name,
          originalSize: file.size
        };
      });
      const newImages = await Promise.all(imagePromises);
      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      setError(error.message);
    }
  };

  const removeImage = (id) => {
    setImages(prev => {
      const img = prev.find(img => img.id === id);
      if (img?.preview) URL.revokeObjectURL(img.preview);
      return prev.filter(img => img.id !== id);
    });
    setGroups(groups => groups.map(g => ({
      ...g, images: g.images.filter(img => img.id !== id)
    })).filter(g => g.images.length));
  };

  // --- PAYPAL/PRO ACCESS FLOW WHERE CONFIRM IS FIXED ---
  const handlePayPalUpgrade = async () => {
    const email = window.prompt("Enter your email for premium access & SpicyLister updates:");
    if (!email || !email.includes('@')) {
      window.alert("Please enter a valid email address");
      return;
    }
    setUserEmail(email);
    localStorage.setItem('spicylister_email', email);
    try {
      await fetch('/.netlify/functions/track-supporter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          timestamp: new Date().toISOString(),
          type: 'premium_intent',
          amount: '1.99'
        })
      });
    } catch (err) { }
    window.open('https://paypal.me/chrisptee/1.99', '_blank');
    setTimeout(() => {
      // eslint-disable-next-line no-restricted-globals
      const confirmed = window.confirm("Did you complete the PayPal payment? Click OK if yes.");
      if (confirmed) handlePayPalSuccess(email);
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
        body: JSON.stringify({
          email,
          timestamp: new Date().toISOString(),
          type: 'premium_confirmed',
          amount: '1.99'
        })
      });
    } catch (err) { }
  };

  React.useEffect(() => {
    const premiumStatus = localStorage.getItem('spicylister_premium');
    const storedEmail = localStorage.getItem('spicylister_email');
    if (premiumStatus === 'true') setIsPremium(true);
    if (storedEmail) setUserEmail(storedEmail);
  }, []);

  const analyzeBatch = async () => {
    if (!groups.length) {
      setError("No groups found. Drag images to at least one group.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const batchResults = [];
      for (const group of groups) {
        const imageData = await Promise.all(
          group.images.map(async (img) => {
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: imageData,
            extraInfo: extraInfo.trim(),
            isPremium,
          }),
        });
        if (!response.ok) {
          batchResults.push({ error: `Listing "${group.name}": Analysis failed (${response.status})` });
        } else {
          const data = await response.json();
          batchResults.push(data || {});
        }
      }
      setResults(batchResults);
    } catch (err) {
      setError("Batch error: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 860, margin: '0 auto' }}>
      <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>🌶️ SpicyLister - Batch Edition!</h1>
      <AlertMsg>
        <strong>Neurospicy?</strong> Drag-AND-drop your photos into as many groups as you want.
        Each group = a separate listing. No more "Oh no, which pic goes with what?" phobia!
      </AlertMsg>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          background: '#e91e63', color: '#fff', border: 'none', borderRadius: 7,
          padding: '11px 24px', fontSize: 20, cursor: 'pointer', margin: '10px 0'
        }}
      ><Upload style={{ marginRight: 7, verticalAlign: 'middle' }} /> Upload Photos</button>
      {images.length > 0 && (
        <GroupingArea
          groups={groups}
          images={images}
          setGroups={setGroups}
          onRemove={removeImage}
        />
      )}
      {error && <AlertMsg>{error}</AlertMsg>}
      {groups.length > 0 && !isAnalyzing && (
        <button onClick={analyzeBatch}
          style={{
            background: '#69b116', color: '#fff', border: 'none', borderRadius: 7,
            padding: '11px 26px', fontSize: 21, marginTop: 18, marginBottom: 18, cursor: 'pointer'
          }}>AI Analyze ALL Groups</button>
      )}
      {isAnalyzing && <div>Thinking hard... 🔥 Analysing all listings... Please wait.</div>}
      {results.length > 0 &&
        <div>
          <h2 style={{ marginTop: 16, fontWeight: 700 }}>Batch Results:</h2>
          {results.map((res, idx) => (
            <div key={idx} style={{
              background: '#edf7fa', borderRadius: 12, marginTop: 17, padding: 20
            }}>
              <div style={{ fontWeight: 700, marginBottom: 5 }}>{groups[idx]?.name || `(Group ${idx + 1})`}</div>
              {res.error ?
                <div style={{ color: '#c00', fontWeight: 600 }}>{res.error}</div>
                : <pre style={{
                  background: '#eaeaea', padding: 12, borderRadius: 7, fontSize: 16,
                  lineHeight: 1.3, marginTop: 6
                }}>{JSON.stringify(res, null, 2)}</pre>
              }
            </div>
          ))}
        </div>
      }
      <footer style={{ marginTop: 44, color: '#434', fontSize: 17 }}>
        Built by neurospicy, for neurospicy - turning clutter into cash, one dopamine hit at a time! 🌶️
        &nbsp; <a href="https://buymeacoffee.com/chrispteemagician" target="_blank" rel="noopener noreferrer">
          <Coffee style={{ verticalAlign: "middle" }} /> Support the tour & this app!
        </a>
      </footer>
    </div>
  );
};

export default SpicyLister;
