import React, { useState } from 'react';

const SpicyLister = () => {
  const [showProModal, setShowProModal] = useState(false);
  const [showCoffeeConfirm, setShowCoffeeConfirm] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [proExpiryDate, setProExpiryDate] = useState(null);

  const handleCoffeeSupport = () => {
    window.open('https://buymeacoffee.com/chrispteemagician', '_blank');
    setTimeout(() => setShowCoffeeConfirm(true), 7000);
  };

  const handleCoffeeConfirm = (confirmed) => {
    setShowCoffeeConfirm(false);
    if (confirmed) {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      setIsPro(true);
      setProExpiryDate(expiryDate);
      alert(`🎉 PRO ACTIVATED! Valid until ${expiryDate.toLocaleDateString()}! Thank you for supporting my van life!`);
      setShowProModal(false);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', margin: 16, minHeight: '100vh', background: "#fff9ef" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
        <img
          src="/spicylister-logo.png"
          alt="SpicyLister Logo"
          style={{ height: 56, width: 56, borderRadius: 14, boxShadow: '0 1px 12px #e87413' }}
        />
        <div>
          <h1 style={{ margin: 0, color: "#e87413", fontFamily: "cursive", letterSpacing: 2 }}>🌶️ SpicyLister 1.2</h1>
          <div style={{ fontWeight: "bold", color: "#633202" }}>
            Sell Your Clutter Without a Stutter!
          </div>
          <div style={{ color: "#b4561f", fontSize: 15, marginTop: 4 }}>
            Dopamine hits in 60 seconds – By the NeuroSpicy for anyone who needs a hand listing stuff and making a few bob
          </div>
        </div>
      </div>

      <div style={{ margin: '26px 0' }}>
        <button
          style={{
            fontSize: 20,
            padding: "14px 34px",
            background: 'linear-gradient(90deg,#ff9001,#fa3b38,#fcb900,#f74d12)', color:'#fff',
            border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: "bold", letterSpacing: 1,
            boxShadow: "0 1px 12px #e87413", display: "flex", alignItems: "center", gap: 10
          }}
          onClick={() => setShowProModal(true)}>
          <img src="/spicylister-logo.png" alt="" style={{height:32, width:32, borderRadius:5, marginRight: 8}}/>
          Generate!
        </button>
      </div>
      {isPro && proExpiryDate && (
        <div style={{ color: 'green', marginBottom: 24, fontWeight: 'bold', fontSize: 18 }}>
          ⭐ PRO is active until {proExpiryDate.toLocaleDateString()}!
        </div>
      )}
      {/* PRO MODAL */}
      {showProModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 32, maxWidth: 400, textAlign: 'center', boxShadow:'0 2px 22px #b95c27'
          }}>
            <h2 style={{color:"#d85901"}}>Support the Van Life, Unlock PRO!</h2>
            <p>
              Buy me a coffee (or use Ko-fi below) at any amount<br/>
              to get 1 month of Pro features.<br/><br/>
              After donating, click "Yes" on the next pop-up!
            </p>
            <button
              onClick={handleCoffeeSupport}
              style={{margin: 18, padding: 18, borderRadius: 8, background: '#fd0', fontSize: 16, fontWeight:"bold"}}>
              ☕ Buy Me a Coffee (1mo Pro)
            </button>
            <br />
            <a
              href="https://ko-fi.com/zoom"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', margin: 18, color: "#29abe0", fontWeight: 600, textDecoration: "underline", fontSize: 16}}
            >
              Or support on Ko-fi (click here)
            </a>
            <br /><br />
            <button
              onClick={() => setShowProModal(false)}
              style={{marginTop: 24, fontSize: 16}}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* COFFEE CONFIRM MODAL */}
      {showCoffeeConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'white', padding: 24, borderRadius: 8, width: 340, textAlign: 'center', boxShadow: '0 6px 28px #fdbd2c'
          }}>
            <div style={{ marginBottom: 18, fontWeight: 'bold', fontSize:18, color: "#b4561f" }}>
              Did you buy me a coffee or support?
            </div>
            <button
              style={{ margin: '0 18px', fontSize: 16, padding: 10, background: "#fd0", fontWeight:"bold", border:"none", borderRadius:5 }}
              onClick={() => handleCoffeeConfirm(true)}>
              Yes
            </button>
            <button
              style={{ margin: '0 18px', fontSize: 16, padding: 10, background: "#fa5027", color:"#fff",border:"none", borderRadius:5 }}
              onClick={() => handleCoffeeConfirm(false)}>
              No
            </button>
          </div>
        </div>
      )}
      {/* Footer */}
      <div style={{
        position: "fixed", width: "100%", left: 0, bottom: 0, background: "#fff1e3", padding: "10px 0",
        color: "#7b3a0b", fontWeight: 500, textAlign: "center", fontFamily: "monospace", fontSize: 15, borderTop: "1px solid #ffb56b"
      }}>
        Made with <span style={{color:"#e74c3c"}}>❤️</span> by Chris P Tee – Vanlife + Comedy + Magic + Code
      </div>
    </div>
  );
};

export default SpicyLister;
