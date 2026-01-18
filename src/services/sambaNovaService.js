/**
 * SambaNova AI Service
 * Integrates with SambaNova Cloud API for AI-powered features
 */

// Environment configuration
const SAMBANOVA_API_KEY = import.meta.env.VITE_SAMBANOVA_API_KEY || '';
const SAMBANOVA_BASE_URL = import.meta.env.VITE_SAMBANOVA_BASE_URL || 'https://api.sambanova.ai/v1';

// Model configuration - Updated for 2026
const MODELS = {
  EXPLANATION: 'Meta-Llama-3.3-70B-Instruct',
  CODE_GENERATION: 'Qwen3-32B',
};

// Hidden System Prompt - DSY Core Academic Mentor Persona
const SYSTEM_PROMPTS = {
  ACADEMIC_MENTOR: `You are DSY Core Academic Mentor, a specialized AI assistant designed for Indian college lab environments. Your expertise includes:

- **HTML5**: Semantic markup, accessibility, forms, modern HTML features
- **CSS3**: Flexbox, Grid, animations, responsive design, Box Model
- **React.js**: Components, hooks, state management, best practices
- **Node.js**: Server-side JavaScript, Express, APIs, npm ecosystem

Your teaching style:
1. Explain concepts clearly with real-world examples relevant to Indian college curricula
2. Provide code examples that are clean, well-commented, and follow best practices
3. Include "Viva Tips" - key points students should remember for oral examinations
4. Use simple English that's easy to understand for non-native speakers
5. Reference common lab manual requirements and university examination patterns

When explaining code, always break down:
- What each part does
- Why it's written that way
- Common mistakes to avoid
- Viva questions professors typically ask

Be encouraging, patient, and thorough in your explanations.`,

  CODE_GENERATOR: `You are DSY Core Web Page Generator, an expert at creating beautiful, modern, premium web pages using HTML and CSS only.

Your code generation principles:
1. Write clean, semantic HTML5 with proper structure
2. Use modern CSS features (flexbox, grid, custom properties, gradients, animations)
3. Create visually stunning designs with:
   - Beautiful color schemes (prefer dark themes with accent colors like gold #C5A059)
   - Glassmorphism effects (backdrop-filter, transparency, blur)
   - Smooth transitions and hover animations
   - Gradient backgrounds and text effects
   - Modern typography with Google Fonts (Inter, Outfit, Poppins)
4. Ensure responsive design that works on all screen sizes
5. Add hover effects and micro-interactions using CSS only
6. Use CSS custom properties for easy theming

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

CRITICAL: You MUST output your code in EXACTLY this format with markdown code blocks:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<!-- Your complete HTML here -->
</html>
\`\`\`

\`\`\`css
/* Your complete CSS here */
\`\`\`

Do not include any explanations before or after the code blocks. Output ONLY the two code blocks.`,
};

/**
 * Make an API call to SambaNova
 * @param {string} model - Model to use
 * @param {Array} messages - Chat messages array
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Response data
 */
async function callSambaNova(model, messages, options = {}) {
  if (!SAMBANOVA_API_KEY) {
    throw new Error('SambaNova API key not configured. Please set VITE_SAMBANOVA_API_KEY in your environment.');
  }

  const response = await fetch(`${SAMBANOVA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SAMBANOVA_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      top_p: options.topP ?? 0.9,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Generate an educational explanation using Meta-Llama model
 * @param {string} userPrompt - User's question or topic
 * @param {string} context - Optional additional context
 * @returns {Promise<Object>} AI response with explanation
 */
export async function generateExplanation(userPrompt, context = '') {
  const messages = [
    {
      role: 'system',
      content: SYSTEM_PROMPTS.ACADEMIC_MENTOR,
    },
    {
      role: 'user',
      content: context ? `Context: ${context}\n\nQuestion: ${userPrompt}` : userPrompt,
    },
  ];

  try {
    const response = await callSambaNova(MODELS.EXPLANATION, messages, {
      temperature: 0.7,
      maxTokens: 4096,
    });

    return {
      success: true,
      content: response.choices[0]?.message?.content || '',
      model: MODELS.EXPLANATION,
      usage: response.usage,
    };
  } catch (error) {
    console.error('Explanation generation error:', error);
    return {
      success: false,
      error: error.message,
      content: '',
    };
  }
}

/**
 * Generate code using Qwen Coder model
 * @param {string} codePrompt - Description of code to generate
 * @param {string} language - Target language (html, css, javascript, etc.)
 * @returns {Promise<Object>} AI response with generated code
 */
export async function generateCode(codePrompt, language = 'javascript') {
  const messages = [
    {
      role: 'system',
      content: SYSTEM_PROMPTS.CODE_GENERATOR,
    },
    {
      role: 'user',
      content: `Generate ${language} code for the following requirement:\n\n${codePrompt}\n\nProvide clean, well-commented code suitable for a college lab submission.`,
    },
  ];

  try {
    const response = await callSambaNova(MODELS.CODE_GENERATION, messages, {
      temperature: 0.3, // Lower temperature for more consistent code
      maxTokens: 4096,
    });

    return {
      success: true,
      content: response.choices[0]?.message?.content || '',
      model: MODELS.CODE_GENERATION,
      usage: response.usage,
    };
  } catch (error) {
    console.error('Code generation error:', error);
    return {
      success: false,
      error: error.message,
      content: '',
    };
  }
}

/**
 * Check if SambaNova API is configured
 * @returns {boolean}
 */
export function isSambaNovaConfigured() {
  return Boolean(SAMBANOVA_API_KEY);
}

/**
 * Generate a complete web page (HTML + CSS) using Qwen Coder model
 * @param {string} prompt - Detailed prompt describing the web page
 * @returns {Promise<Object>} Generated HTML and CSS code
 */
export async function generateWebPage(prompt) {
  const messages = [
    {
      role: 'system',
      content: SYSTEM_PROMPTS.CODE_GENERATOR,
    },
    {
      role: 'user',
      content: `Create a complete, beautiful, premium web page based on this description:\n\n${prompt}\n\nGenerate complete, production-ready HTML and CSS code. Remember to output the code in the exact format with \`\`\`html and \`\`\`css code blocks.`,
    },
  ];

  try {
    const response = await callSambaNova(MODELS.CODE_GENERATION, messages, {
      temperature: 0.4,
      maxTokens: 8192,
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Parse HTML and CSS from response
    const { html, css } = parseGeneratedCode(content);

    return {
      success: true,
      html,
      css,
      rawContent: content,
      model: MODELS.CODE_GENERATION,
      usage: response.usage,
    };
  } catch (error) {
    console.error('Web page generation error:', error);
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
 * @param {string} content - Raw AI response
 * @returns {Object} Parsed HTML and CSS
 */
export function parseGeneratedCode(content) {
  let html = '';
  let css = '';

  // Extract HTML code block
  const htmlMatch = content.match(/```html\s*([\s\S]*?)```/i);
  if (htmlMatch) {
    html = htmlMatch[1].trim();
  }

  // Extract CSS code block
  const cssMatch = content.match(/```css\s*([\s\S]*?)```/i);
  if (cssMatch) {
    css = cssMatch[1].trim();
  }

  // If no code blocks found, try to find inline HTML
  if (!html && !css) {
    const htmlInlineMatch = content.match(/<(!DOCTYPE|html|head|body)[\s\S]*<\/html>/i);
    if (htmlInlineMatch) {
      html = htmlInlineMatch[0];
    }
  }

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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; }
    ${css}
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
}

/**
 * Analyze syllabus and generate a structured learning roadmap
 * @param {string} syllabusText - Raw syllabus content
 * @returns {Promise<Object>} Structured roadmap with topics, timeline, and tips
 */
export async function analyzeSyllabus(syllabusText) {
  const messages = [
    {
      role: 'system',
      content: SYSTEM_PROMPTS.ACADEMIC_MENTOR,
    },
    {
      role: 'user',
      content: `Analyze this syllabus and create a structured learning roadmap for a student:

${syllabusText}

Please provide:
1. **Topic Breakdown**: List all major topics with brief descriptions
2. **Learning Timeline**: Suggested study schedule with time estimates
3. **Prerequisites**: What students should know before each topic
4. **Key Concepts**: Most important points for each topic
5. **Lab Exercise Suggestions**: Practical exercises for each topic
6. **Viva Tips**: Common questions and points to remember for oral examinations
7. **Resources**: Recommended study materials and references

Format your response in a clear, structured manner that's easy to follow.`,
    },
  ];

  try {
    const response = await callSambaNova(MODELS.EXPLANATION, messages, {
      temperature: 0.5,
      maxTokens: 6000,
    });

    return {
      success: true,
      content: response.choices[0]?.message?.content || '',
      model: MODELS.EXPLANATION,
      usage: response.usage,
    };
  } catch (error) {
    console.error('Syllabus analysis error:', error);
    return {
      success: false,
      error: error.message,
      content: '',
    };
  }
}

/**
 * Analyze CSS code and explain Box Model properties
 * @param {string} cssCode - CSS code to analyze
 * @param {string} imageDescription - Optional description of the UI image
 * @returns {Promise<Object>} Detailed Box Model analysis
 */
export async function analyzeBoxModel(cssCode, imageDescription = '') {
  const messages = [
    {
      role: 'system',
      content: SYSTEM_PROMPTS.ACADEMIC_MENTOR,
    },
    {
      role: 'user',
      content: `Analyze this CSS code and explain the Box Model properties in detail:

${cssCode ? `CSS Code:\n\`\`\`css\n${cssCode}\n\`\`\`` : ''}
${imageDescription ? `\nUI Description: ${imageDescription}` : ''}

Please provide:
1. **Box Model Breakdown**: Explain margin, border, padding, and content areas
2. **Property Analysis**: Detail each box-model related property used
3. **Visual Representation**: Describe how the box model affects the layout
4. **Common Issues**: Potential problems with the current CSS
5. **Best Practices**: Suggestions for improvement
6. **Viva Tips**: Key points about CSS Box Model for oral examinations, including:
   - Definition of Box Model
   - Difference between content-box and border-box
   - How margins collapse
   - Box-sizing property importance
   - Common interview questions

Be thorough and educational in your explanation.`,
    },
  ];

  try {
    const response = await callSambaNova(MODELS.EXPLANATION, messages, {
      temperature: 0.5,
      maxTokens: 4096,
    });

    return {
      success: true,
      content: response.choices[0]?.message?.content || '',
      model: MODELS.EXPLANATION,
      usage: response.usage,
    };
  } catch (error) {
    console.error('Box Model analysis error:', error);
    return {
      success: false,
      error: error.message,
      content: '',
    };
  }
}

/**
 * Unified chat interface with automatic model selection
 * @param {string} message - User message
 * @param {string} taskType - 'explanation' | 'code' | 'syllabus' | 'boxmodel'
 * @param {Object} context - Additional context (cssCode, imageDescription, etc.)
 * @returns {Promise<Object>} AI response
 */
export async function chat(message, taskType = 'explanation', context = {}) {
  switch (taskType) {
    case 'code':
      return generateCode(message, context.language);
    case 'syllabus':
      return analyzeSyllabus(message);
    case 'boxmodel':
      return analyzeBoxModel(context.cssCode || message, context.imageDescription);
    case 'explanation':
    default:
      return generateExplanation(message, context.additionalContext);
  }
}

/**
 * Check if the API is configured and accessible
 * @returns {Promise<boolean>} Whether the API is available
 */
export async function checkApiStatus() {
  if (!SAMBANOVA_API_KEY) {
    return { available: false, reason: 'API key not configured' };
  }

  try {
    // Simple test call
    const response = await fetch(`${SAMBANOVA_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${SAMBANOVA_API_KEY}`,
      },
    });

    return { 
      available: response.ok, 
      reason: response.ok ? 'API accessible' : `API returned status ${response.status}` 
    };
  } catch (error) {
    return { available: false, reason: error.message };
  }
}

// Export models and prompts for reference
export const AI_MODELS = MODELS;
export const PROMPTS = SYSTEM_PROMPTS;
