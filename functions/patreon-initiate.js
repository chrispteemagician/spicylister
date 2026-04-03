// patreon-initiate.js
// Initiates Patreon OAuth — redirects user to Patreon authorization page

exports.handler = async () => {
  const clientId = process.env.PATREON_CLIENT_ID;
  const redirectUri = process.env.PATREON_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return {
      statusCode: 500,
      body: 'Patreon OAuth not configured. Check PATREON_CLIENT_ID and PATREON_REDIRECT_URI env vars.'
    };
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'identity identity[email]',
    state: 'spicylister'
  });

  return {
    statusCode: 302,
    headers: { Location: `https://www.patreon.com/oauth2/authorize?${params}` }
  };
};
