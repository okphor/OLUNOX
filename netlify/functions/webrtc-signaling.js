// Simple in-memory storage for WebRTC signaling
// In production, you'd want to use a database or Redis
const signalingData = new Map();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const { httpMethod, body } = event;
    const data = body ? JSON.parse(body) : {};

    if (httpMethod === 'POST') {
      const { type, gameId, from, to, payload } = data;
      
      // Store signaling message for the target peer
      const key = `${gameId}-${to}`;
      if (!signalingData.has(key)) {
        signalingData.set(key, []);
      }
      
      signalingData.get(key).push({
        type,
        from,
        payload,
        timestamp: Date.now()
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true })
      };
    } else if (httpMethod === 'GET') {
      const { gameId, playerId } = event.queryStringParameters || {};
      const key = `${gameId}-${playerId}`;
      
      const messages = signalingData.get(key) || [];
      // Clear messages after retrieving them
      signalingData.delete(key);
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ messages })
      };
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found' })
    };
  } catch (error) {
    console.error('Signaling error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};