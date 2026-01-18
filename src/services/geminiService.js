/**
 * Gemini AI Service
 * Integrates with Google Gemini 2.5 Flash API for prompt optimization and code generation
 * Features:
 * - Multi-key rotation (up to 11 keys) with auto-failover on rate limits
 * - JSON extraction for precise design specifications
 * - Image analysis for accurate code replication
 */

// ============================================================================
// DUAL API KEY SYSTEM - Separate keys for optimization vs code generation
// ============================================================================

// Load API keys from environment (comma-separated)
const GEMINI_API_KEYS_RAW = import.meta.env.VITE_GEMINI_API_KEYS || '';
const GEMINI_API_KEYS = GEMINI_API_KEYS_RAW.split(',').map(k => k.trim()).filter(k => k.length > 0);
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash';

// Track temporarily failed keys (rate limited)
let failedKeys = new Set();

/**
 * Get a random API key from the available pool (excluding failed keys)
 * @param {string|null} excludeKey - Optional key to exclude (for getting a different key)
 * @returns {string|null} API key or null if all exhausted
 */
function getRandomKey(excludeKey = null) {
  if (GEMINI_API_KEYS.length === 0) return null;
  
  // Filter out failed keys and the excluded key
  const availableKeys = GEMINI_API_KEYS.filter(k => !failedKeys.has(k) && k !== excludeKey);
  
  if (availableKeys.length === 0) {
    // All keys failed, reset and try again
    console.log('⚠️ All keys exhausted, resetting failed keys list');
    failedKeys.clear();
    const resetKeys = GEMINI_API_KEYS.filter(k => k !== excludeKey);
    if (resetKeys.length === 0) return GEMINI_API_KEYS[0];
    return resetKeys[Math.floor(Math.random() * resetKeys.length)];
  }
  
  // Return a random key from available pool
  return availableKeys[Math.floor(Math.random() * availableKeys.length)];
}

/**
 * Get two different API keys - one for optimization, one for code generation
 * @returns {{optimizationKey: string|null, generationKey: string|null}}
 */
function getDualKeys() {
  const optimizationKey = getRandomKey();
  const generationKey = getRandomKey(optimizationKey);
  
  console.log(`🔑 Dual keys selected: Optimization key #${GEMINI_API_KEYS.indexOf(optimizationKey) + 1}, Generation key #${GEMINI_API_KEYS.indexOf(generationKey) + 1}`);
  
  return { optimizationKey, generationKey };
}

/**
 * Mark a key as failed (rate limited)
 * @param {string} key - The API key that failed
 */
function markKeyFailed(key) {
  failedKeys.add(key);
  console.log(`🔄 Key marked as failed, ${GEMINI_API_KEYS.length - failedKeys.size} keys remaining`);
}

/**
 * Reset all failed keys (call periodically or after cooldown)
 */
export function resetFailedKeys() {
  failedKeys.clear();
  console.log('✅ All API keys reset');
}

// ============================================================================
// DEBUG FUNCTIONS (for testing API keys)
// ============================================================================

/**
 * Get the total number of API keys configured
 * @returns {number}
 */
export function getKeyCount() {
  return GEMINI_API_KEYS.length;
}

/**
 * Get count of currently failed keys
 * @returns {number}
 */
export function getFailedKeyCount() {
  return failedKeys.size;
}

/**
 * Test a specific API key with a simple request
 * @param {number} keyIndex - Index of the key to test
 * @returns {Promise<Object>} Test result
 */
export async function testApiKey(keyIndex) {
  if (keyIndex < 0 || keyIndex >= GEMINI_API_KEYS.length) {
    return { success: false, error: 'Invalid key index' };
  }

  const key = GEMINI_API_KEYS[keyIndex];
  const maskedKey = key.slice(0, 8) + '...' + key.slice(-4);

  try {
    console.log(`🧪 Testing API key ${keyIndex + 1}/${GEMINI_API_KEYS.length}: ${maskedKey}`);
    
    const response = await fetch(`${GEMINI_API_URL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say "OK" in one word.' }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    });

    if (response.status === 429) {
      return { success: false, error: 'Rate limited', keyIndex, maskedKey };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.error?.message || `Status ${response.status}`,
        keyIndex,
        maskedKey
      };
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log(`✅ Key ${keyIndex + 1} working: "${reply.trim()}"`);
    return { success: true, reply: reply.trim(), keyIndex, maskedKey };
  } catch (error) {
    return { success: false, error: error.message, keyIndex, maskedKey };
  }
}

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const SYSTEM_PROMPTS = {
  // Generates both readable text AND hidden JSON for precise code generation
  PROMPT_OPTIMIZER: `You are an Expert Design Analyst. Your task is to analyze images and prompts to create detailed specifications for web page generation.

You MUST output in this EXACT format with both sections:

---TEXT---
[Write a detailed, readable description (200-400 words) covering layout, colors, typography, components, and design style. This is for the user to read.]

---JSON---
{
  "layout": {
    "type": "single-page|multi-section|dashboard|landing",
    "sections": ["header", "hero", "features", "footer"],
    "columns": 1
  },
  "colors": {
    "background": "#hex",
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "text": "#hex"
  },
  "typography": {
    "headingFont": "Font Name",
    "bodyFont": "Font Name",
    "headingSize": "48px",
    "bodySize": "16px"
  },
  "components": [
    {"type": "navbar", "style": "fixed|sticky|static"},
    {"type": "hero", "hasImage": true, "hasButton": true},
    {"type": "cards", "count": 3, "style": "glassmorphism"}
  ],
  "effects": ["glassmorphism", "gradient", "shadows", "animations"],
  "spacing": {
    "sectionPadding": "80px",
    "cardGap": "24px"
  }
}

Be as precise as possible. Extract exact colors, fonts, and layouts from any provided images.`,

  CODE_GENERATOR: `You are DSY Core Code Generator. Generate pixel-perfect HTML and CSS based on the design specifications.

CRITICAL OUTPUT REQUIREMENTS:
1. You MUST output EXACTLY TWO separate code blocks: one for HTML, one for CSS
2. The HTML file MUST link to an external stylesheet using: <link rel="stylesheet" href="styles.css">
3. Do NOT include inline <style> tags in the HTML - ALL styles go in the CSS block
4. The HTML must be a complete document with <!DOCTYPE html>, <html>, <head>, and <body>

DESIGN RULES:
1. Follow the JSON specifications EXACTLY for colors, fonts, and layout
2. Match any provided reference images as closely as possible
3. Use modern CSS (flexbox, grid, custom properties)
4. Include responsive breakpoints
5. Add smooth transitions and hover effects

IMAGE REQUIREMENTS (CRITICAL - ALWAYS USE REAL ONLINE IMAGES):
- Hero/Banner images: https://picsum.photos/1920/1080 or https://source.unsplash.com/1920x1080/?[topic]
- Card images: https://picsum.photos/seed/[unique-seed]/400/300 (use different seeds like card1, card2, card3)
- Profile/Avatar images: https://i.pravatar.cc/150?img=[1-70] (use different numbers for each avatar)
- Product images: https://source.unsplash.com/400x400/?product,[keyword]
- Background images: https://picsum.photos/seed/bg/1920/1080?blur=3
- Testimonial photos: https://i.pravatar.cc/100?img=[number]
- Team member photos: https://i.pravatar.cc/200?img=[number]
- Feature/Icon images: Use Material Icons (span with class material-icons-round) or inline SVGs
- NEVER use placeholder.com, empty src attributes, or placeholder text like "image.jpg"
- ALWAYS include descriptive alt text for accessibility

OUTPUT FORMAT - Use these EXACT markers:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>
  <link rel="stylesheet" href="styles.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <!-- Complete HTML content here -->
</body>
</html>
\`\`\`

\`\`\`css
/* Complete CSS styles here - this will be saved as styles.css */
\`\`\`

NO explanations before or after the code blocks. Output ONLY the two code blocks.`
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if Gemini API is configured
 * @returns {boolean}
 */
export function isGeminiConfigured() {
  return GEMINI_API_KEYS.length > 0;
}

/**
 * Alias for backward compatibility
 */
export function isGeminiCodeConfigured() {
  return isGeminiConfigured();
}

/**
 * Check if any images exist in assets
 * @param {Array} assets
 * @returns {boolean}
 */
export function hasImages(assets = []) {
  return assets.some(a => a.type === 'image');
}

/**
 * Optimize a user prompt using Gemini AI with image analysis
 * Returns both readable text (for display) and JSON (for code generation)
 * JSON extraction is MANDATORY - will retry if extraction fails
 * @param {string} userPrompt - The user's original prompt
 * @param {Array} assets - Array of attached assets (images, links)
 * @returns {Promise<Object>} Optimized prompt result with text and JSON
 */
export async function optimizePrompt(userPrompt, assets = []) {
  // Get dedicated optimization key (separate from generation key)
  const apiKey = getRandomKey();
  if (!apiKey) {
    throw new Error('No Gemini API keys configured. Please set VITE_GEMINI_API_KEYS in your .env file.');
  }

  // Separate image assets from other assets
  const imageAssets = assets.filter(a => a.type === 'image');
  const linkAssets = assets.filter(a => a.type === 'link');
  
  // Build the content parts array
  const contentParts = [];
  
  // Add images first (Gemini supports up to ~16 images)
  for (const imageAsset of imageAssets.slice(0, 5)) {
    if (imageAsset.data && imageAsset.data.startsWith('data:')) {
      const matches = imageAsset.data.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        contentParts.push({
          inline_data: {
            mime_type: matches[1],
            data: matches[2]
          }
        });
      }
    }
  }

  // Build the text prompt
  let textPrompt = `Analyze and optimize this web development prompt:

"${userPrompt}"`;

  if (imageAssets.length > 0) {
    textPrompt += `

I have attached ${imageAssets.length} reference image(s). Analyze these images carefully and extract:
- Exact color codes used
- Layout structure
- Typography styles
- All UI components
- Design effects (gradients, shadows, etc.)`;
  }

  if (linkAssets.length > 0) {
    textPrompt += `

Reference links: ${linkAssets.map(a => a.data).join(', ')}`;
  }

  contentParts.push({ text: textPrompt });

  // Mandatory JSON extraction with retry logic
  const maxJsonRetries = 3;
  let lastError = null;
  let lastDisplayText = '';
  let lastRawOutput = '';

  for (let jsonAttempt = 0; jsonAttempt < maxJsonRetries; jsonAttempt++) {
    // Get a fresh key for each retry (excluding previously used key on retry)
    const currentKey = jsonAttempt === 0 ? apiKey : getRandomKey(apiKey);
    if (!currentKey) break;

    try {
      console.log(`🔑 Optimization attempt ${jsonAttempt + 1}/${maxJsonRetries} (Mandatory JSON extraction)`);
      
      const response = await fetch(`${GEMINI_API_URL}:generateContent?key=${currentKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPTS.PROMPT_OPTIMIZER }]
          },
          contents: [{ parts: contentParts }],
          generationConfig: {
            temperature: 0.5, // Slightly lower for more consistent JSON
            maxOutputTokens: 4096, // Increased for reliable JSON
          }
        })
      });

      if (response.status === 429) {
        console.log('⚠️ Rate limited, trying next key...');
        markKeyFailed(currentKey);
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      lastRawOutput = rawOutput;

      // Parse the dual output (TEXT and JSON sections)
      const { displayText, designJSON } = parseOptimizationOutput(rawOutput);
      lastDisplayText = displayText;

      // MANDATORY: Check if JSON was successfully extracted
      if (!designJSON) {
        console.warn(`⚠️ JSON extraction failed on attempt ${jsonAttempt + 1}, retrying...`);
        continue; // Retry with different key
      }

      // Validate JSON has required fields
      if (!designJSON.layout || !designJSON.colors) {
        console.warn(`⚠️ JSON missing required fields on attempt ${jsonAttempt + 1}, retrying...`);
        continue;
      }

      console.log('✅ Optimization complete with valid JSON');
      console.log('📝 Display text length:', displayText.length);
      console.log('📋 Design JSON:', 'extracted successfully');

      return {
        success: true,
        optimizedPrompt: displayText,
        designJSON: designJSON,
        originalPrompt: userPrompt,
        imagesAnalyzed: imageAssets.length,
        rawOutput: rawOutput,
      };
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${jsonAttempt + 1} failed:`, error.message);
    }
  }

  // All retries exhausted - return with available text but indicate JSON failure
  console.error('🚨 Mandatory JSON extraction failed after all attempts');
  return {
    success: false,
    error: 'Failed to extract design JSON after multiple attempts. Please try again.',
    optimizedPrompt: lastDisplayText || '',
    designJSON: null,
    originalPrompt: userPrompt,
    rawOutput: lastRawOutput,
  };
}

/**
 * Parse the optimization output to extract TEXT and JSON sections
 * @param {string} rawOutput - The raw AI response
 * @returns {Object} { displayText, designJSON }
 */
function parseOptimizationOutput(rawOutput) {
  let displayText = rawOutput;
  let designJSON = null;

  // Try to find ---TEXT--- and ---JSON--- markers
  const textMatch = rawOutput.match(/---TEXT---\s*([\s\S]*?)(?:---JSON---|$)/i);
  const jsonMatch = rawOutput.match(/---JSON---\s*([\s\S]*?)$/i);

  if (textMatch && textMatch[1]) {
    displayText = textMatch[1].trim();
  }

  if (jsonMatch && jsonMatch[1]) {
    try {
      // Extract JSON from the response (might be wrapped in code blocks)
      let jsonStr = jsonMatch[1].trim();
      jsonStr = jsonStr.replace(/```json?\s*/gi, '').replace(/```\s*$/g, '').trim();
      designJSON = JSON.parse(jsonStr);
    } catch (e) {
      console.warn('Could not parse design JSON:', e.message);
      // Try to find JSON in the raw output as fallback
      const jsonBlockMatch = rawOutput.match(/\{[\s\S]*"layout"[\s\S]*\}/);
      if (jsonBlockMatch) {
        try {
          designJSON = JSON.parse(jsonBlockMatch[0]);
        } catch (e2) {
          console.warn('Fallback JSON parsing also failed');
        }
      }
    }
  }

  return { displayText, designJSON };
}

/**
 * Generate web page HTML/CSS with Gemini using IMAGES + JSON for accurate replication
 * Uses dedicated generation key (separate from optimization key)
 * @param {string} prompt - The optimized text prompt
 * @param {Array} assets - Array of attached assets (images will be sent to AI)
 * @param {Object} designJSON - Design specifications JSON (required for best results)
 * @param {string} excludeKey - Optional key to exclude (used for dual-key separation)
 * @returns {Promise<Object>} Generated code result
 */
export async function generateWebPageWithImages(prompt, assets = [], designJSON = null, excludeKey = null) {
  // Get dedicated generation key (different from any optimization key used)
  const apiKey = getRandomKey(excludeKey);
  if (!apiKey) {
    throw new Error('No Gemini API keys configured. Please set VITE_GEMINI_API_KEYS in your .env file.');
  }

  console.log(`🔑 Code generation using separate key #${GEMINI_API_KEYS.indexOf(apiKey) + 1}`);

  // Build the content parts array - include images for visual replication
  const contentParts = [];
  const imageAssets = assets.filter(a => a.type === 'image');
  
  // Add images first so Gemini can SEE them while generating code
  for (const imageAsset of imageAssets.slice(0, 5)) {
    if (imageAsset.data && imageAsset.data.startsWith('data:')) {
      const matches = imageAsset.data.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        contentParts.push({
          inline_data: {
            mime_type: matches[1],
            data: matches[2]
          }
        });
      }
    }
  }

  // Build the code generation prompt with JSON specs
  let codePrompt = `Generate complete HTML and CSS code for this web page:

${prompt}`;

  // Include design JSON specifications (should always be present now)
  if (designJSON) {
    codePrompt += `

=== DESIGN SPECIFICATIONS (FOLLOW EXACTLY) ===
${JSON.stringify(designJSON, null, 2)}
=== END SPECIFICATIONS ===

Use the EXACT colors, fonts, and spacing from the specifications above.
REMEMBER: Output two separate code blocks - HTML with <link rel="stylesheet" href="styles.css"> and CSS separately.`;
  } else {
    codePrompt += `

REMEMBER: Output two separate code blocks - HTML with <link rel="stylesheet" href="styles.css"> and CSS separately.`;
  }

  if (imageAssets.length > 0) {
    codePrompt += `

IMPORTANT: ${imageAssets.length} reference image(s) attached. You can SEE these images.
Create code that EXACTLY REPLICATES the design. Match all colors, layouts, and effects.`;
  }

  contentParts.push({ text: codePrompt });

  // Retry logic with validation for complete output
  let lastError = null;
  const maxAttempts = Math.min(3, GEMINI_API_KEYS.length);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentKey = attempt === 0 ? apiKey : getRandomKey(apiKey);
    if (!currentKey) break;

    try {
      console.log(`🔑 Code gen attempt ${attempt + 1}/${maxAttempts}`);
      
      const response = await fetch(`${GEMINI_API_URL}:generateContent?key=${currentKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPTS.CODE_GENERATOR }]
          },
          contents: [{ parts: contentParts }],
          generationConfig: {
            temperature: 0.2, // Lower for more consistent output
            maxOutputTokens: 16384, // Increased for complete pages
          }
        })
      });

      if (response.status === 429) {
        console.log('⚠️ Rate limited, trying next key...');
        markKeyFailed(currentKey);
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      console.log('📦 Raw content length:', content.length);
      
      // Parse the generated code
      const parsedCode = parseGeneratedCode(content);

      // Validate both HTML and CSS were extracted
      if (!parsedCode.html || parsedCode.html.length < 100) {
        console.warn(`⚠️ HTML extraction incomplete on attempt ${attempt + 1} (${parsedCode.html?.length || 0} chars), retrying...`);
        continue;
      }

      if (!parsedCode.css || parsedCode.css.length < 50) {
        console.warn(`⚠️ CSS extraction incomplete on attempt ${attempt + 1} (${parsedCode.css?.length || 0} chars), retrying...`);
        continue;
      }

      console.log('✅ Code generation complete');
      console.log('📄 HTML length:', parsedCode.html.length);
      console.log('🎨 CSS length:', parsedCode.css.length);

      return {
        success: true,
        ...parsedCode,
        rawContent: content,
        usedImages: imageAssets.length,
        usedJSON: !!designJSON,
      };
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed:`, error.message);
    }
  }

  console.error('Code generation failed after all attempts:', lastError);
  return {
    success: false,
    error: lastError?.message || 'All API keys exhausted',
    html: '',
    css: '',
    rawContent: '',
  };
}

/**
 * Generate code using Gemini AI with streaming
 * @param {string} prompt - The optimized prompt
 * @param {Function} onChunk - Callback for each streamed chunk
 * @param {Array} assets - Array of attached assets
 * @returns {Promise<Object>} Generated code result
 */
export async function generateCodeStream(prompt, onChunk, assets = []) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
  }

  // Build context with assets
  let assetContext = '';
  if (assets.length > 0) {
    const linkAssets = assets.filter(a => a.type === 'link');
    if (linkAssets.length > 0) {
      assetContext += `\n\nReference these links for inspiration: ${linkAssets.map(a => a.data).join(', ')}`;
    }
  }

  const fullPrompt = `Create a complete, beautiful web page based on this description:

${prompt}
${assetContext}

Generate complete, production-ready HTML and CSS code.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPTS.CODE_GENERATOR }]
        },
        contents: [{
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 8192,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6);
            if (jsonStr.trim() === '[DONE]') continue;
            
            const data = JSON.parse(jsonStr);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            if (text) {
              fullContent += text;
              if (onChunk) {
                onChunk(text, fullContent);
              }
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    }

    // Parse the generated code
    const parsedCode = parseGeneratedCode(fullContent);

    return {
      success: true,
      ...parsedCode,
      rawContent: fullContent,
    };
  } catch (error) {
    console.error('Code generation error:', error);
    return {
      success: false,
      error: error.message,
      html: '',
      css: '',
      rawContent: '',
    };
  }
}

/**
 * Parse HTML and CSS from AI-generated response
 * Uses robust regex patterns to extract code blocks reliably
 * @param {string} content - Raw AI response
 * @returns {Object} Parsed HTML and CSS
 */
export function parseGeneratedCode(content) {
  let html = '';
  let css = '';

  if (!content) {
    console.warn('⚠️ No content to parse');
    return { html, css };
  }

  console.log('🔍 Parsing content, length:', content.length);

  // STRATEGY: Find all code blocks first, then identify HTML and CSS blocks
  // This is more reliable than trying to match individual patterns
  
  // Pattern to find ALL code blocks: ```language ... ```
  const codeBlockRegex = /```(\w+)?\s*\n?([\s\S]*?)```/g;
  const codeBlocks = [];
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    codeBlocks.push({
      language: (match[1] || '').toLowerCase(),
      content: match[2],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }

  console.log(`📦 Found ${codeBlocks.length} code blocks`);

  // Find HTML and CSS blocks
  for (const block of codeBlocks) {
    if (block.language === 'html' && !html) {
      html = block.content.trim();
      console.log('✅ Found HTML code block, length:', html.length);
    } else if (block.language === 'css' && !css) {
      css = block.content.trim();
      console.log('✅ Found CSS code block, length:', css.length);
    }
  }

  // If we found blocks but they're missing language tags, try to identify by content
  if (!html || !css) {
    for (const block of codeBlocks) {
      if (!block.language || block.language === '') {
        const trimmedContent = block.content.trim();
        
        // Detect HTML by structure
        if (!html && (
          trimmedContent.includes('<!DOCTYPE') ||
          trimmedContent.includes('<html') ||
          trimmedContent.includes('<head') ||
          trimmedContent.includes('<body')
        )) {
          html = trimmedContent;
          console.log('✅ Identified HTML from unmarked block, length:', html.length);
        }
        // Detect CSS by structure
        else if (!css && (
          trimmedContent.includes('{') && 
          trimmedContent.includes('}') &&
          (trimmedContent.includes(':') || trimmedContent.includes(';'))
        )) {
          // Additional CSS validation: should have selectors
          if (/[\.\#\w\-]+\s*\{/.test(trimmedContent)) {
            css = trimmedContent;
            console.log('✅ Identified CSS from unmarked block, length:', css.length);
          }
        }
      }
    }
  }

  // FALLBACK 1: If no code blocks found, try to extract raw HTML document
  if (!html) {
    console.log('⚠️ No HTML code block found, trying fallback extraction');
    
    // Look for complete HTML document
    const htmlDocMatch = content.match(/<!DOCTYPE\s+html[^>]*>[\s\S]*?<\/html>/i);
    if (htmlDocMatch) {
      html = htmlDocMatch[0].trim();
      console.log('✅ Found complete HTML document via fallback, length:', html.length);
    } else {
      // Try just <html>...</html>
      const htmlTagMatch = content.match(/<html[^>]*>[\s\S]*?<\/html>/i);
      if (htmlTagMatch) {
        html = htmlTagMatch[0].trim();
        console.log('✅ Found HTML via <html> tags, length:', html.length);
      }
    }
  }

  // FALLBACK 2: Extract CSS from <style> tags if no separate CSS block
  if (!css && html) {
    const styleMatches = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    const extractedStyles = [];
    for (const styleMatch of styleMatches) {
      if (styleMatch[1]) {
        extractedStyles.push(styleMatch[1].trim());
      }
    }
    if (extractedStyles.length > 0) {
      css = extractedStyles.join('\n\n');
      console.log('✅ Extracted CSS from style tags, length:', css.length);
    }
  }

  // VALIDATION: Ensure HTML has basic structure
  if (html && !html.includes('<html') && !html.includes('<!DOCTYPE')) {
    // Wrap incomplete HTML
    console.log('⚠️ HTML appears incomplete, may need wrapping');
  }

  // Ensure CSS link exists in HTML (if we have external CSS)
  if (html && css && !html.includes('href="styles.css"') && !html.includes("href='styles.css'")) {
    console.log('⚠️ HTML missing link to styles.css - will be handled by compileLivePreview');
  }

  console.log('📊 Final parse result - HTML:', html.length, 'chars, CSS:', css.length, 'chars');
  return { html, css };
}


/**
 * Compile HTML and CSS into a complete document for live preview
 * @param {string} html - HTML content
 * @param {string} css - CSS content
 * @returns {string} Complete HTML document
 */
export function compileLivePreview(html, css) {
  // Check if HTML already contains full document structure
  if (html.includes('<!DOCTYPE') || html.includes('<html')) {
    // Insert CSS into existing document
    if (css) {
      if (html.includes('</head>')) {
        return html.replace('</head>', `<style>${css}</style></head>`);
      } else if (html.includes('<body')) {
        return html.replace('<body', `<style>${css}</style><body`);
      }
    }
    return html;
  }

  // Create a complete document
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DSY Core Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', sans-serif;
    }
    ${css}
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
}

// Export system prompts for reference
export const PROMPTS = SYSTEM_PROMPTS;
