const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { text } = JSON.parse(event.body);
    
    if (!text) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Text is required' })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.log('Gemini API key not configured - summarization feature disabled');
      return {
        statusCode: 503,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Summarization service not available',
          message: 'AI summarization feature is not configured. Please contact the administrator to enable this feature.',
          originalText: text
        })
      };
    }

    console.log('Summarizing text with Gemini:', text.substring(0, 50) + '...');

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Please create a concise, engaging summary of this conversation prompt that maintains its essence while being shorter and more conversational. Keep it under 30 words and make it sound natural for text-to-speech. Original prompt: "${text}"`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 100,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      let errorMessage = 'Failed to summarize text';
      if (response.status === 401) {
        errorMessage = 'Invalid API key';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request parameters';
      }
      
      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: errorMessage,
          details: errorText,
          originalText: text
        })
      };
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Unexpected Gemini response format:', data);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Unexpected response format from AI service',
          originalText: text
        })
      };
    }

    const summarizedText = data.candidates[0].content.parts[0].text.trim();
    
    console.log('Text summarized successfully:', {
      originalLength: text.length,
      summarizedLength: summarizedText.length,
      summary: summarizedText.substring(0, 50) + '...'
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        originalText: text,
        summarizedText: summarizedText,
        originalLength: text.length,
        summarizedLength: summarizedText.length
      })
    };

  } catch (error) {
    console.error('Summarization error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        originalText: JSON.parse(event.body || '{}').text || ''
      })
    };
  }
};