import React from 'react';

const ResultsDisplay = ({
  result,
  isPro,
  copiedSection,
  onCopy,
  onSearchEbay,
  onRegenerate,
  onNewListing
}) => {
  if (!result) return null;

  return (
    <div className="mt-8 bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-bold mb-2">AI Generated Listing</h2>
      <div className="mb-4">
        <strong>Title:</strong>
        <div className="flex items-center gap-2">
          <span>{result.title}</span>
          <button
            className="text-blue-600 text-xs px-2 py-1 border border-blue-200 rounded hover:bg-blue-100"
            onClick={() => onCopy(result.title, 'title')}
          >
            {copiedSection === 'title' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <div className="mb-4">
        <strong>Description:</strong>
        <div className="flex items-center gap-2">
          <span>{result.description}</span>
          <button
            className="text-blue-600 text-xs px-2 py-1 border border-blue-200 rounded hover:bg-blue-100"
            onClick={() => onCopy(result.description, 'desc')}
          >
            {copiedSection === 'desc' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <div className="mb-4">
        <strong>Estimated Price:</strong>
        <span className="ml-2 font-mono text-green-700">{result.estimatedPrice || 'N/A'}</span>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        <button
          className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
          onClick={onSearchEbay}
        >Search eBay</button>
        <button
          className="bg-blue-100 px-3 py-1 text-blue-800 font-semibold rounded hover:bg-blue-200"
          onClick={onRegenerate}
        >Re-run AI</button>
        <button
          className="bg-pink-100 px-3 py-1 text-pink-900 rounded hover:bg-pink-200"
          onClick={onNewListing}
        >Start Over</button>
      </div>
      {isPro &&
        <div className="mt-6 bg-yellow-100 rounded-md px-4 py-3 text-sm text-yellow-800">
          Pro user: Enjoy unlimited images and more features!
        </div>
      }
    </div>
  );
};

export default ResultsDisplay;
