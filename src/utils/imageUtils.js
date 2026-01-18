/**
 * Image URL Generators for DSY Core
 * Free image services that require no API keys
 */

// Lorem Picsum - Random high-quality images
export const picsum = {
  /**
   * Get a random image
   * @param {number} width - Image width
   * @param {number} height - Image height
   */
  random: (width = 800, height = 600) => `https://picsum.photos/${width}/${height}`,
  
  /**
   * Get a seeded image (same seed = same image)
   * @param {string} seed - Unique seed for consistent image
   * @param {number} width - Image width
   * @param {number} height - Image height
   */
  seeded: (seed, width = 800, height = 600) => `https://picsum.photos/seed/${seed}/${width}/${height}`,
  
  /**
   * Get a blurred image
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} blur - Blur level (1-10)
   */
  blurred: (width = 800, height = 600, blur = 2) => `https://picsum.photos/${width}/${height}?blur=${blur}`,
  
  /**
   * Get a grayscale image
   */
  grayscale: (width = 800, height = 600) => `https://picsum.photos/${width}/${height}?grayscale`,
};

// Unsplash Source - Topic-based images
export const unsplash = {
  /**
   * Get an image based on topic/keyword
   * @param {string} topic - Topic keywords (e.g., "nature", "technology,office")
   * @param {number} width - Image width
   * @param {number} height - Image height
   */
  topic: (topic, width = 800, height = 600) => `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(topic)}`,
  
  /**
   * Get a random image
   */
  random: (width = 800, height = 600) => `https://source.unsplash.com/random/${width}x${height}`,
};

// Pravatar - Avatar/profile images
export const avatar = {
  /**
   * Get a random avatar
   * @param {number} size - Avatar size in pixels
   */
  random: (size = 150) => `https://i.pravatar.cc/${size}`,
  
  /**
   * Get a specific avatar by ID (1-70)
   * @param {number} id - Avatar ID (1-70)
   * @param {number} size - Avatar size in pixels
   */
  specific: (id, size = 150) => `https://i.pravatar.cc/${size}?img=${id}`,
};

// DiceBear - Deterministic avatars (SVG)
export const dicebear = {
  /**
   * Generate initials-based avatar
   * @param {string} name - Name for initials
   * @param {number} size - Avatar size
   */
  initials: (name, size = 150) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&size=${size}`,
  
  /**
   * Generate abstract shapes avatar
   * @param {string} seed - Seed for consistent avatar
   * @param {number} size - Avatar size
   */
  shapes: (seed, size = 150) => `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed)}&size=${size}`,
};

/**
 * Generate multiple unique card images
 * @param {number} count - Number of images to generate
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string[]} Array of image URLs
 */
export function generateCardImages(count, width = 400, height = 300) {
  return Array.from({ length: count }, (_, i) => picsum.seeded(`card${i + 1}`, width, height));
}

/**
 * Generate multiple unique avatar images
 * @param {number} count - Number of avatars to generate
 * @param {number} size - Avatar size
 * @returns {string[]} Array of avatar URLs
 */
export function generateAvatars(count, size = 150) {
  return Array.from({ length: count }, (_, i) => avatar.specific((i % 70) + 1, size));
}

/**
 * Get a themed hero image
 * @param {string} theme - Theme keyword (e.g., "technology", "nature", "business")
 * @returns {string} Hero image URL
 */
export function getHeroImage(theme = 'technology') {
  return unsplash.topic(theme, 1920, 1080);
}

/**
 * Get a themed background image with blur
 * @param {string} seed - Seed for consistent background
 * @param {number} blur - Blur level (1-10)
 * @returns {string} Background image URL
 */
export function getBackgroundImage(seed = 'bg', blur = 3) {
  return `https://picsum.photos/seed/${seed}/1920/1080?blur=${blur}`;
}
