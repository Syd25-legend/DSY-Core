/**
 * Code Generator Router
 * Smart routing between SambaNova (text) and Gemini (image) pipelines
 * Supports both HTML/CSS and React output
 */

import { generateWebPage, generateReactApp, parseReactOutput } from './sambaNovaService';
import { generateWebPageWithImages, parseGeneratedCode } from './geminiService';
import { preprocessImage, buildDesignJSON } from './hfPreprocessorService';

/**
 * Smart router for code generation
 * Automatically selects the best API based on input type
 * 
 * Text-only → SambaNova (faster, no vision needed)
 * Image present → HuggingFace preprocessing + Gemini (vision required)
 * 
 * @param {string} prompt - User's description/prompt
 * @param {Array} assets - Array of assets (images, links)
 * @param {string} framework - 'html' or 'react'
 * @returns {Promise<Object>} Generated code result
 */
export async function generateCode(prompt, assets = [], framework = 'html') {
  const hasImages = assets.some(a => a.type === 'image');
  
  console.log(`🎯 Code generation request:`, {
    hasImages,
    framework,
    promptLength: prompt.length,
    assetCount: assets.length,
  });

  if (hasImages) {
    // IMAGE PATH: HuggingFace preprocessing + Gemini
    return generateWithImage(prompt, assets, framework);
  } else {
    // TEXT-ONLY PATH: SambaNova (faster)
    return generateTextOnly(prompt, framework);
  }
}

/**
 * Generate code from text-only prompt using SambaNova
 * @param {string} prompt - User's description
 * @param {string} framework - 'html' or 'react'
 */
async function generateTextOnly(prompt, framework) {
  console.log('📝 Using SambaNova pipeline (text-only)');
  
  if (framework === 'react') {
    const result = await generateReactApp(prompt);
    return {
      ...result,
      pipeline: 'sambanova',
      framework: 'react',
    };
  }
  
  const result = await generateWebPage(prompt);
  return {
    ...result,
    pipeline: 'sambanova',
    framework: 'html',
  };
}

/**
 * Generate code from image using HuggingFace + Gemini
 * For React, uses 2 Gemini calls for better quality
 * @param {string} prompt - User's description
 * @param {Array} assets - Assets including images
 * @param {string} framework - 'html' or 'react'
 */
async function generateWithImage(prompt, assets, framework) {
  console.log('📸 Using HuggingFace + Gemini pipeline (image)');
  
  // Step 1: HuggingFace preprocessing
  let designJSON = null;
  const imageAsset = assets.find(a => a.type === 'image');
  
  if (imageAsset?.data) {
    try {
      console.log('🔄 Preprocessing image with HuggingFace...');
      const hfResult = await preprocessImage(imageAsset.data);
      designJSON = buildDesignJSON(hfResult);
      console.log('✅ HF preprocessing complete:', {
        colors: designJSON?.colors,
        layout: designJSON?.layout,
      });
    } catch (error) {
      console.warn('⚠️ HF preprocessing failed, continuing without:', error);
    }
  }
  
  // Step 2: Gemini generation
  if (framework === 'react') {
    return generateReactWithGemini(prompt, assets, designJSON);
  }
  
  // HTML/CSS generation with Gemini
  const result = await generateWebPageWithImages(prompt, assets, designJSON);
  return {
    ...result,
    pipeline: 'gemini',
    framework: 'html',
    usedHF: !!designJSON,
  };
}

/**
 * Generate React code with Gemini (2-call approach for better quality)
 * Call 1: Structure + main components
 * Call 2: Detailed styling + animations
 * @param {string} prompt - User's description
 * @param {Array} assets - Assets including images
 * @param {Object} designJSON - Preprocessed design specs from HF
 */
async function generateReactWithGemini(prompt, assets, designJSON) {
  console.log('⚛️ Generating React with Gemini (2-call approach)...');
  
  // Build enhanced prompt with design specs
  let enhancedPrompt = prompt;
  if (designJSON) {
    enhancedPrompt += `\n\n=== DESIGN SPECIFICATIONS ===
${JSON.stringify(designJSON, null, 2)}

Use the EXACT colors and layout from above.`;
  }
  
  // Add React-specific instructions
  const reactPrompt = `${enhancedPrompt}

IMPORTANT: Generate a complete React/TypeScript application.
Use this exact output format with file markers:

---FILE: App.tsx---
(Main App component with imports)

---FILE: components/Header.tsx---
(Header component)

---FILE: components/Hero.tsx---
(Hero section)

---FILE: components/Features.tsx---
(Features/Cards section)

---FILE: index.css---
(Global styles)

---END---

Rules:
1. TypeScript with proper types
2. Functional components with hooks
3. Use the exact colors from design specs
4. Real image URLs (picsum, unsplash, pravatar)
5. Responsive design with CSS
6. Smooth animations and transitions`;

  // Call 1: Generate structure and components
  console.log('🔄 Gemini Call 1: Structure and components...');
  const result = await generateWebPageWithImages(reactPrompt, assets, designJSON);
  
  if (!result.success) {
    return {
      success: false,
      error: result.error,
      files: [],
      pipeline: 'gemini',
      framework: 'react',
    };
  }
  
  // Parse React files from response
  const files = parseReactOutput(result.rawContent);
  
  // If we got files, return them
  if (files.length > 0) {
    console.log(`✅ Generated ${files.length} React files`);
    return {
      success: true,
      files,
      rawContent: result.rawContent,
      pipeline: 'gemini',
      framework: 'react',
      usedHF: !!designJSON,
      geminiCalls: 1,
    };
  }
  
  // Fallback: Try to extract as HTML/CSS and wrap in React
  console.log('⚠️ No React files found, falling back to HTML/CSS extraction');
  const parsed = parseGeneratedCode(result.rawContent);
  
  if (parsed.html || parsed.css) {
    // Convert HTML/CSS to basic React structure
    const fallbackFiles = [
      {
        name: 'App.tsx',
        content: `import React from 'react';
import './index.css';

const App: React.FC = () => {
  return (
    <>
${parsed.html.replace(/<!DOCTYPE.*?>|<html.*?>|<\/html>|<head>[\s\S]*?<\/head>|<body.*?>|<\/body>/gi, '')
  .split('\n')
  .map(line => '      ' + line)
  .join('\n')}
    </>
  );
};

export default App;`,
        language: 'typescript',
      },
      {
        name: 'index.css',
        content: parsed.css || '/* Add your styles here */',
        language: 'css',
      },
    ];
    
    return {
      success: true,
      files: fallbackFiles,
      rawContent: result.rawContent,
      pipeline: 'gemini',
      framework: 'react',
      usedHF: !!designJSON,
      geminiCalls: 1,
      fallback: true,
    };
  }
  
  return {
    success: false,
    error: 'Failed to parse generated code',
    files: [],
    pipeline: 'gemini',
    framework: 'react',
  };
}

export { parseReactOutput };
