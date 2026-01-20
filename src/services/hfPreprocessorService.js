/**
 * HuggingFace Space Preprocessor Service
 * Uses Gradio client to connect to DSY-Core Space for image preprocessing
 * Extracts colors, layout information before Gemini code generation
 */

import { Client } from "@gradio/client";

// HuggingFace Space identifier
const HF_SPACE_ID = "Souhardyo/DSY-Core";

/**
 * Convert base64 data URL to Blob
 * @param {string} dataUrl - Base64 data URL (data:image/png;base64,...)
 * @returns {Blob} Image blob
 */
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const base64 = parts[1];
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  
  return new Blob([array], { type: mime });
}

/**
 * Preprocess an image using HuggingFace Space
 * Extracts colors and layout information
 * @param {string} imageDataUrl - Base64 data URL of the image
 * @returns {Promise<Object>} Preprocessed data with colors and layout
 */
export async function preprocessImage(imageDataUrl) {
  try {
    console.log('🔄 Connecting to HF Space:', HF_SPACE_ID);
    
    // Convert data URL to blob
    const imageBlob = dataUrlToBlob(imageDataUrl);
    
    // Connect to Gradio Space
    const client = await Client.connect(HF_SPACE_ID);
    
    // Call the preprocess endpoint
    const result = await client.predict("/preprocess", {
      image_data: imageBlob,
    });
    
    console.log('✅ HF preprocessing complete');
    
    // Parse the result
    const data = typeof result.data === 'string' 
      ? JSON.parse(result.data) 
      : result.data;
    
    return {
      success: true,
      ...data
    };
  } catch (error) {
    console.error('❌ HF preprocessing failed:', error);
    return {
      success: false,
      error: error.message,
      // Return default values so generation can still proceed
      colors: {
        primary: '#3b82f6',
        secondary: '#1e40af',
        accent: '#60a5fa',
        background: '#1e1e2e',
        text: '#ffffff',
        is_dark_theme: true,
      },
      layout: {
        type: 'landing',
        sections: ['navbar', 'hero', 'features', 'footer'],
        estimated_columns: 3,
      }
    };
  }
}

/**
 * Build design JSON from HF preprocessed data
 * This is used to enhance Gemini prompts with extracted design specs
 * @param {Object} hfData - Data from HF preprocessing
 * @returns {Object} Design JSON for Gemini prompt
 */
export function buildDesignJSON(hfData) {
  if (!hfData) {
    return null;
  }
  
  return {
    layout: {
      type: hfData.layout?.type || 'landing',
      sections: hfData.layout?.sections || ['header', 'hero', 'features', 'footer'],
      columns: hfData.layout?.estimated_columns || 3,
    },
    colors: {
      background: hfData.colors?.background || '#1e1e2e',
      primary: hfData.colors?.primary || '#3b82f6',
      secondary: hfData.colors?.secondary || '#1e40af',
      accent: hfData.colors?.accent || '#60a5fa',
      text: hfData.colors?.text || '#ffffff',
    },
    effects: hfData.colors?.is_dark_theme 
      ? ['glassmorphism', 'gradient', 'shadows'] 
      : ['shadows', 'subtle-gradient'],
    isDarkTheme: hfData.colors?.is_dark_theme ?? true,
  };
}

/**
 * Check if HF Space preprocessing is available
 * @returns {boolean} Always true since Space ID is hardcoded
 */
export function isHFConfigured() {
  return true;
}
