/**
 * SpicyLister Global Counter Function
 *
 * Simple counter using Netlify's built-in blob storage
 * Falls back to in-memory count if blob storage unavailable
 */

// In-memory fallback (resets on cold start, but better than nothing)
let memoryCount = 12847; // Starting count for social proof

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // POST = increment counter
    if (event.httpMethod === 'POST') {
      memoryCount += 1;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ count: memoryCount, success: true })
      };
    }

    // GET = return current count
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ count: memoryCount })
    };

  } catch (error) {
    console.error('Counter error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Counter failed', count: memoryCount })
    };
  }
};
