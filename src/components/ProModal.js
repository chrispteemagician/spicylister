import React from 'react';

const ProModal = ({ show, onClose, onCoffee, onPremium }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-2xl"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4">Go Pro & Support SpicyLister!</h2>
        <p className="mb-4">
          <span className="font-semibold">Unlock all features</span> (unlimited images, video upload, faster AI) and help me keep this app online, bug-free, and totally ad-free!
        </p>
        <div className="space-y-3 mt-2 mb-4">
          <button
            onClick={onCoffee}
            className="w-full py-2 px-4 rounded bg-yellow-400 hover:bg-yellow-300 text-black font-semibold flex items-center justify-center gap-2"
          >
            <span role="img" aria-label="Coffee">☕</span>
            1 Month Pro (Buy Me a Coffee)
          </button>
          <button
            onClick={onPremium}
            className="w-full py-2 px-4 rounded bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center justify-center gap-2"
          >
            <span role="img" aria-label="Crown">👑</span>
            Lifetime Pro (Premium)
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Thank you for supporting a neurodivergent creator and helping me fund my little van adventures & magic show touring dream!
        </p>
      </div>
    </div>
  );
};

export default ProModal;
