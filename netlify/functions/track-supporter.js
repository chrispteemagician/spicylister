// Netlify Function: track-supporter.js
// This replaces expensive n8n automation with FREE Google Sheets

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, timestamp, type, amount } = JSON.parse(event.body);
    
    // Google Sheets API (free!)
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    
    // Append to Google Sheet
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Supporters!A:E:append?valueInputOption=RAW&key=${API_KEY}`;
    
    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [[
          timestamp,
          email,
          type,
          amount || '1.99',
          'pending' // status: pending, confirmed, cancelled
        ]]
      })
    });

    if (response.ok) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true })
      };
    }

    throw new Error('Sheet update failed');

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};