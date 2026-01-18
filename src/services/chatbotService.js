/**
 * AI Code Analyzer Chatbot Service
 * Dedicated service for analyzing HTML/CSS files and explaining/modifying code
 * Uses separate API key pool from the main code generation service
 */

// Load chatbot-specific API keys from environment (comma-separated)
const CHATBOT_API_KEYS_RAW = import.meta.env.VITE_CHATBOT_API_KEYS || '';
const CHATBOT_API_KEYS = CHATBOT_API_KEYS_RAW.split(',').map(k => k.trim()).filter(k => k.length > 0);
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash';

// Track temporarily failed keys
let failedChatbotKeys = new Set();
let currentKeyIndex = 0;

/**
 * Check if chatbot API keys are configured
 * @returns {boolean}
 */
export function isChatbotConfigured() {
  return CHATBOT_API_KEYS.length > 0;
}

/**
 * Get the count of available chatbot API keys
 * @returns {number}
 */
export function getChatbotKeyCount() {
  return CHATBOT_API_KEYS.length;
}

/**
 * Get a random available API key
 * @returns {string|null}
 */
function getRandomKey() {
  if (CHATBOT_API_KEYS.length === 0) return null;
  
  const availableKeys = CHATBOT_API_KEYS.filter(k => !failedChatbotKeys.has(k));
  
  if (availableKeys.length === 0) {
    console.log('⚠️ All chatbot keys exhausted, resetting...');
    failedChatbotKeys.clear();
    return CHATBOT_API_KEYS[0];
  }
  
  return availableKeys[Math.floor(Math.random() * availableKeys.length)];
}

/**
 * Mark a key as failed
 * @param {string} key
 */
function markKeyFailed(key) {
  failedChatbotKeys.add(key);
  console.log(`🔄 Chatbot key marked as failed, ${CHATBOT_API_KEYS.length - failedChatbotKeys.size} keys remaining`);
}

// System prompt for the code analyzer chatbot
const CHATBOT_SYSTEM_PROMPT = `You are a friendly and helpful AI assistant that specializes in explaining and modifying HTML/CSS code. Your job is to:

1. **Explain code in simple terms**: When the user asks about their code, explain it like you're talking to a friend who's learning web development. Use everyday analogies and avoid jargon.

2. **Answer questions clearly**: Be direct and helpful. If something is complex, break it down into simple steps.

3. **Modify code when asked**: When the user wants changes, generate the COMPLETE modified file(s) with the changes applied.

PERSONALITY:
- Friendly and encouraging
- Use simple, everyday language
- Give examples when helpful
- Be concise but thorough

WHEN EXPLAINING CODE:
- Describe what each section does in plain English
- Explain WHY things are done a certain way
- Point out any interesting or important parts

WHEN MODIFYING CODE:
- Always output the COMPLETE modified file(s)
- Use these EXACT markers for code output:
  \`\`\`html:index.html
  (complete HTML file content here)
  \`\`\`
  
  \`\`\`css:styles.css
  (complete CSS file content here)
  \`\`\`
- Explain what you changed and why
- If you only modify one file, only include that file's code block

IMPORTANT: When outputting modified code, include the ENTIRE file content, not just the changed parts. This allows direct file replacement.`;

/**
 * Analyze project files and generate context for the AI
 * @param {Object} files - Object containing html and css file contents
 * @returns {string} Context string for AI
 */
function buildProjectContext(files) {
  let context = '=== CURRENT PROJECT FILES ===\n\n';
  
  if (files.html) {
    context += '📄 index.html:\n```html\n' + files.html + '\n```\n\n';
  }
  
  if (files.css) {
    context += '🎨 styles.css:\n```css\n' + files.css + '\n```\n\n';
  }
  
  if (!files.html && !files.css) {
    context += '(No files generated yet - user can ask general HTML/CSS questions)\n\n';
  }
  
  context += '=== END PROJECT FILES ===\n\n';
  return context;
}

/**
 * Send a message to the chatbot and get a response
 * @param {string} userMessage - The user's message
 * @param {Object} files - Current project files {html, css}
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<Object>} Response object
 */
export async function sendChatMessage(userMessage, files = {}, conversationHistory = []) {
  const apiKey = getRandomKey();
  
  if (!apiKey) {
    return {
      success: false,
      error: 'No chatbot API keys configured. Please add VITE_CHATBOT_API_KEYS to your .env file.',
      message: null
    };
  }

  // Build the conversation contents
  const contents = [];
  
  // Add project context as the first user message
  const projectContext = buildProjectContext(files);
  
  // Add conversation history (limited to last 10 messages for context window)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  }
  
  // Add current user message with project context
  contents.push({
    role: 'user',
    parts: [{ text: projectContext + 'User question: ' + userMessage }]
  });

  const maxAttempts = Math.min(3, CHATBOT_API_KEYS.length);
  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentKey = attempt === 0 ? apiKey : getRandomKey();
    if (!currentKey) break;

    try {
      console.log(`💬 Chatbot request attempt ${attempt + 1}/${maxAttempts}`);
      
      const response = await fetch(`${GEMINI_API_URL}:generateContent?key=${currentKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: CHATBOT_SYSTEM_PROMPT }]
          },
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          }
        })
      });

      if (response.status === 429) {
        console.log('⚠️ Rate limited, trying next chatbot key...');
        markKeyFailed(currentKey);
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      console.log('✅ Chatbot response received, length:', reply.length);

      // Parse response for code modifications
      const codeModifications = parseCodeModifications(reply);

      return {
        success: true,
        message: reply,
        hasCodeChanges: codeModifications.hasChanges,
        modifiedHtml: codeModifications.html,
        modifiedCss: codeModifications.css
      };
    } catch (error) {
      lastError = error;
      console.error(`Chatbot attempt ${attempt + 1} failed:`, error.message);
    }
  }

  return {
    success: false,
    error: lastError?.message || 'All chatbot API keys exhausted',
    message: null
  };
}

/**
 * Parse AI response for code modification blocks
 * @param {string} response - AI response text
 * @returns {Object} Parsed code modifications
 */
function parseCodeModifications(response) {
  const result = {
    hasChanges: false,
    html: null,
    css: null
  };

  // Look for HTML code blocks with filename marker
  const htmlMatch = response.match(/```html:index\.html\s*\n([\s\S]*?)```/);
  if (htmlMatch && htmlMatch[1]) {
    result.html = htmlMatch[1].trim();
    result.hasChanges = true;
  }

  // Also try without filename marker
  if (!result.html) {
    const htmlFallback = response.match(/```html\s*\n([\s\S]*?)```/);
    if (htmlFallback && htmlFallback[1] && htmlFallback[1].includes('<!DOCTYPE')) {
      result.html = htmlFallback[1].trim();
      result.hasChanges = true;
    }
  }

  // Look for CSS code blocks with filename marker
  const cssMatch = response.match(/```css:styles\.css\s*\n([\s\S]*?)```/);
  if (cssMatch && cssMatch[1]) {
    result.css = cssMatch[1].trim();
    result.hasChanges = true;
  }

  // Also try without filename marker
  if (!result.css) {
    const cssFallback = response.match(/```css\s*\n([\s\S]*?)```/);
    if (cssFallback && cssFallback[1] && cssFallback[1].length > 100) {
      result.css = cssFallback[1].trim();
      result.hasChanges = true;
    }
  }

  return result;
}

/**
 * Quick prompts for the chatbot UI
 */
export const QUICK_PROMPTS = [
  { label: 'Explain HTML', prompt: 'Explain what this HTML file does in simple terms' },
  { label: 'Explain CSS', prompt: 'Explain what the CSS styles do and how they affect the page' },
  { label: 'Explain Structure', prompt: 'What is the overall structure and layout of this page?' },
  { label: 'Find Issues', prompt: 'Are there any potential issues or improvements I could make?' },
  { label: 'Add Animation', prompt: 'Add a subtle fade-in animation to the main content' },
  { label: 'Change Colors', prompt: 'I want to change the color scheme. What colors are being used?' },
];
