// Add this to your SpicyLister App.js - Multi-Currency/Multi-Region Feature

import React, { useState, useEffect } from 'react';
import { Globe, DollarSign, TrendingUp, MapPin } from 'lucide-react';

// eBay regions configuration
const eBayRegions = {
  'US': { 
    siteId: 0, 
    currency: 'USD', 
    symbol: '$',
    domain: 'ebay.com',
    flag: '🇺🇸',
    multiplier: 1.25, // US prices typically 25% higher
    name: 'United States'
  },
  'UK': { 
    siteId: 3, 
    currency: 'GBP', 
    symbol: '£',
    domain: 'ebay.co.uk',
    flag: '🇬🇧',
    multiplier: 1.0, // Base currency
    name: 'United Kingdom'
  },
  'DE': { 
    siteId: 77, 
    currency: 'EUR', 
    symbol: '€',
    domain: 'ebay.de',
    flag: '🇩🇪',
    multiplier: 1.15,
    name: 'Germany'
  },
  'AU': { 
    siteId: 15, 
    currency: 'AUD', 
    symbol: 'A$',
    domain: 'ebay.com.au',
    flag: '🇦🇺',
    multiplier: 1.35,
    name: 'Australia'
  },
  'CA': { 
    siteId: 2, 
    currency: 'CAD', 
    symbol: 'C$',
    domain: 'ebay.ca',
    flag: '🇨🇦',
    multiplier: 1.2,
    name: 'Canada'
  },
  'FR': { 
    siteId: 71, 
    currency: 'EUR', 
    symbol: '€',
    domain: 'ebay.fr',
    flag: '🇫🇷',
    multiplier: 1.1,
    name: 'France'
  },
  'IT': { 
    siteId: 101, 
    currency: 'EUR', 
    symbol: '€',
    domain: 'ebay.it',
    flag: '🇮🇹',
    multiplier: 1.05,
    name: 'Italy'
  },
  'ES': { 
    siteId: 186, 
    currency: 'EUR', 
    symbol: '€',
    domain: 'ebay.es',
    flag: '🇪🇸',
    multiplier: 1.08,
    name: 'Spain'
  }
};

// Exchange rates (in production, fetch from API)
const exchangeRates = {
  'USD': 1.27,
  'EUR': 1.17,
  'AUD': 1.91,
  'CAD': 1.71,
  'GBP': 1.0
};

// Multi-Currency Component
const MultiCurrencySelector = ({ selectedRegion, onRegionChange, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Globe size={16} />
        <span className="text-lg">{eBayRegions[selectedRegion].flag}</span>
        <span className="font-medium">{eBayRegions[selectedRegion].currency}</span>
        <span className="text-gray-600 hidden sm:inline">({eBayRegions[selectedRegion].name})</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[250px]">
          <div className="p-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide p-2 border-b">
              Choose Your eBay Region
            </div>
            {Object.entries(eBayRegions).map(([code, region]) => (
              <button
                key={code}
                onClick={() => {
                  onRegionChange(code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors ${
                  selectedRegion === code ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                }`}
              >
                <span className="text-xl">{region.flag}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium">{region.name}</div>
                  <div className="text-sm text-gray-600">
                    {region.domain} • {region.symbol} {region.currency}
                  </div>
                </div>
                {selectedRegion === code && (
                  <div className="text-purple-600">✓</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Price Display Component
const PriceDisplay = ({ basePrice, selectedRegion, showComparison = false }) => {
  const region = eBayRegions[selectedRegion];
  const exchangeRate = exchangeRates[region.currency];
  const marketMultiplier = region.multiplier;
  
  // Calculate final price: base price * exchange rate * market multiplier
  const convertedPrice = (basePrice * exchangeRate * marketMultiplier).toFixed(2);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{region.flag}</span>
        <span className="text-2xl font-bold text-green-600">
          {region.symbol}{convertedPrice}
        </span>
        <span className="text-gray-600 text-sm">{region.currency}</span>
      </div>
      
      {showComparison && selectedRegion !== 'UK' && (
        <div className="text-sm text-gray-500">
          UK Price: £{basePrice.toFixed(2)} • 
          {marketMultiplier > 1.0 ? (
            <span className="text-green-600 ml-1">
              +{((marketMultiplier - 1) * 100).toFixed(0)}% higher in {region.name}
            </span>
          ) : (
            <span className="text-orange-600 ml-1">
              {((1 - marketMultiplier) * 100).toFixed(0)}% lower in {region.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Global Market Stats Component
const GlobalMarketStats = ({ selectedRegion }) => {
  const marketData = {
    'US': { users: '182M', avgPrice: '+25%', currency: 'USD' },
    'UK': { users: '19M', avgPrice: 'Base', currency: 'GBP' },
    'DE': { users: '28M', avgPrice: '+15%', currency: 'EUR' },
    'AU': { users: '12M', avgPrice: '+35%', currency: 'AUD' },
    'CA': { users: '11M', avgPrice: '+20%', currency: 'CAD' },
    'FR': { users: '15M', avgPrice: '+10%', currency: 'EUR' },
    'IT': { users: '12M', avgPrice: '+5%', currency: 'EUR' },
    'ES': { users: '10M', avgPrice: '+8%', currency: 'EUR' }
  };

  const currentMarket = marketData[selectedRegion];
  const region = eBayRegions[selectedRegion];

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{region.flag}</span>
        <div>
          <h3 className="text-lg font-bold text-gray-800">{region.name} Market</h3>
          <p className="text-sm text-gray-600">{region.domain}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{currentMarket.users}</div>
          <div className="text-xs text-gray-600">Active Buyers</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{currentMarket.avgPrice}</div>
          <div className="text-xs text-gray-600">Avg Price vs UK</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{region.symbol}</div>
          <div className="text-xs text-gray-600">{currentMarket.currency}</div>
        </div>
      </div>
    </div>
  );
};

// Main Region Selector Hook
const useRegionSelector = (defaultRegion = 'UK') => {
  const [selectedRegion, setSelectedRegion] = useState(defaultRegion);

  // Detect user's region from browser/IP (in production)
  useEffect(() => {
    // Auto-detect user region
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    if (timezone.includes('America/New_York') || timezone.includes('America/Los_Angeles')) {
      setSelectedRegion('US');
    } else if (timezone.includes('Europe/Berlin')) {
      setSelectedRegion('DE');
    } else if (timezone.includes('Australia')) {
      setSelectedRegion('AU');
    } else if (timezone.includes('America/Toronto')) {
      setSelectedRegion('CA');
    } else if (timezone.includes('Europe/Paris')) {
      setSelectedRegion('FR');
    } else if (timezone.includes('Europe/Rome')) {
      setSelectedRegion('IT');
    } else if (timezone.includes('Europe/Madrid')) {
      setSelectedRegion('ES');
    }
    // Default to UK if no match
  }, []);

  return [selectedRegion, setSelectedRegion];
};

// Example Integration Component (add this to your main app)
const SpicyListerGlobalFeature = () => {
  const [selectedRegion, setSelectedRegion] = useRegionSelector();
  const [samplePrice] = useState(25.99); // Example item price in GBP

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header with Region Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            🌶️ SpicyLister Global
          </h1>
          <p className="text-gray-600">Sell your clutter worldwide!</p>
        </div>
        <MultiCurrencySelector 
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
        />
      </div>

      {/* Market Stats */}
      <GlobalMarketStats selectedRegion={selectedRegion} />

      {/* Price Example */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Sample Listing Price</h3>
        <div className="flex items-center gap-4">
          <div className="text-gray-600">Item worth £{samplePrice} in UK →</div>
          <PriceDisplay 
            basePrice={samplePrice}
            selectedRegion={selectedRegion}
            showComparison={true}
          />
        </div>
      </div>

      {/* eBay Link */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <MapPin className="text-blue-600" size={20} />
          <div>
            <div className="font-medium">Ready to list on {eBayRegions[selectedRegion].domain}?</div>
            <div className="text-sm text-gray-600">
              SpicyLister will optimize your listings for the {eBayRegions[selectedRegion].name} market
            </div>
          </div>
        </div>
      </div>

      {/* Global Expansion Notice */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <TrendingUp className="text-green-600" size={24} />
          <h3 className="text-lg font-semibold text-gray-800">Global Expansion Complete!</h3>
        </div>
        <p className="text-gray-700 mb-4">
          SpicyLister now supports 8 eBay regions and 5 currencies. Expand your decluttering business worldwide!
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(eBayRegions).map(([code, region]) => (
            <div key={code} className="flex items-center gap-2 text-sm">
              <span>{region.flag}</span>
              <span>{region.currency}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { 
  MultiCurrencySelector, 
  PriceDisplay, 
  GlobalMarketStats, 
  useRegionSelector,
  SpicyListerGlobalFeature,
  eBayRegions,
  exchangeRates 
};