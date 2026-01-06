/**
 * SpicyLister Global Counter
 *
 * Tracks total listings generated across ALL users
 * Privacy-friendly: no personal data, just a number going up!
 *
 * GET  /.netlify/functions/counter  - Get current count
 * POST /.netlify/functions/counter  - Increment and get new count
 */

const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const store = getStore("spicylister-stats");
    const COUNTER_KEY = "global-listing-count";

    if (event.httpMethod === "GET") {
      // Get current count
      const countData = await store.get(COUNTER_KEY, { type: "json" });
      const count = (countData && countData.count) || 0;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ count }),
      };
    }

    if (event.httpMethod === "POST") {
      // Increment count
      const countData = await store.get(COUNTER_KEY, { type: "json" });
      const currentCount = (countData && countData.count) || 0;
      const newCount = currentCount + 1;

      await store.setJSON(COUNTER_KEY, { count: newCount });

      retu
