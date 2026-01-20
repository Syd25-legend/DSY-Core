/**
 * Smart Title Generator
 * Extracts a meaningful 3-4 word title from user prompts without using AI
 */

// Common words to filter out (stop words)
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for', 'on', 'with',
  'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once',
  'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'also', 'now', 'that', 'this', 'these',
  'those', 'what', 'which', 'who', 'whom', 'it', 'its', 'i', 'me', 'my', 'we',
  'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their',
  'create', 'build', 'make', 'design', 'generate', 'add', 'use', 'using', 'want',
  'need', 'like', 'please', 'help', 'show', 'give', 'get', 'put', 'take',
  'website', 'webpage', 'page', 'site', 'web', 'html', 'css', 'code', 'style',
  'styles', 'section', 'component', 'element', 'include', 'including', 'based',
  'inspired', 'similar', 'something', 'thing', 'things', 'way', 'look', 'looks',
  'looking', 'feel', 'feels', 'really', 'actually', 'basically', 'simple',
  'complex', 'good', 'great', 'nice', 'cool', 'awesome', 'amazing', 'beautiful'
]);

// Priority keywords that indicate the type of project
const TYPE_KEYWORDS = {
  'portfolio': 'Portfolio',
  'landing': 'Landing',
  'dashboard': 'Dashboard',
  'ecommerce': 'Ecommerce',
  'e-commerce': 'Ecommerce',
  'shop': 'Shop',
  'store': 'Store',
  'blog': 'Blog',
  'gallery': 'Gallery',
  'contact': 'Contact',
  'about': 'About',
  'pricing': 'Pricing',
  'login': 'Login',
  'signup': 'Signup',
  'register': 'Register',
  'profile': 'Profile',
  'settings': 'Settings',
  'hero': 'Hero',
  'navbar': 'Navbar',
  'footer': 'Footer',
  'sidebar': 'Sidebar',
  'modal': 'Modal',
  'form': 'Form',
  'card': 'Card',
  'cards': 'Cards',
  'testimonial': 'Testimonial',
  'testimonials': 'Testimonials',
  'features': 'Features',
  'services': 'Services',
  'team': 'Team',
  'faq': 'FAQ',
  'newsletter': 'Newsletter',
  'checkout': 'Checkout',
  'cart': 'Cart',
  'product': 'Product',
  'products': 'Products',
  'social': 'Social',
  'dark': 'Dark',
  'light': 'Light',
  'modern': 'Modern',
  'minimal': 'Minimal',
  'glassmorphism': 'Glass',
  'neumorphism': 'Neumorph',
  'gradient': 'Gradient',
  'animated': 'Animated',
  'responsive': 'Responsive',
  'mobile': 'Mobile',
  'app': 'App',
  'saas': 'SaaS',
  'startup': 'Startup',
  'agency': 'Agency',
  'restaurant': 'Restaurant',
  'food': 'Food',
  'fitness': 'Fitness',
  'gym': 'Gym',
  'music': 'Music',
  'video': 'Video',
  'travel': 'Travel',
  'hotel': 'Hotel',
  'booking': 'Booking',
  'real': 'Real',
  'estate': 'Estate',
  'medical': 'Medical',
  'health': 'Health',
  'education': 'Education',
  'course': 'Course',
  'finance': 'Finance',
  'banking': 'Banking',
  'crypto': 'Crypto',
  'nft': 'NFT',
  'game': 'Game',
  'gaming': 'Gaming',
  'weather': 'Weather',
  'news': 'News',
  'magazine': 'Magazine',
};

// Common suffixes for project types
const PROJECT_SUFFIXES = ['Page', 'Site', 'UI', 'Design', 'Layout', 'Template'];

/**
 * Extract meaningful keywords from a prompt
 * @param {string} prompt - The user's prompt
 * @returns {string[]} - Array of meaningful keywords
 */
function extractKeywords(prompt) {
  if (!prompt || typeof prompt !== 'string') return [];
  
  // Normalize the prompt
  const normalized = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')  // Remove special chars except hyphens
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .trim();
  
  // Split into words
  const words = normalized.split(' ');
  
  // Filter and map keywords
  const keywords = [];
  const seenWords = new Set();
  
  for (const word of words) {
    // Skip short words, stop words, and duplicates
    if (word.length < 3) continue;
    if (STOP_WORDS.has(word)) continue;
    if (seenWords.has(word)) continue;
    
    seenWords.add(word);
    
    // Check if it's a type keyword (priority)
    if (TYPE_KEYWORDS[word]) {
      keywords.unshift(TYPE_KEYWORDS[word]); // Add to front
    } else {
      // Capitalize first letter
      const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
      keywords.push(capitalized);
    }
  }
  
  return keywords;
}

/**
 * Generate a smart project title from prompt
 * @param {string} prompt - The user's prompt or optimized prompt
 * @returns {string} - A 3-4 word title suitable for file naming
 */
export function generateProjectTitle(prompt) {
  const keywords = extractKeywords(prompt);
  
  // If we have no keywords, return a default
  if (keywords.length === 0) {
    return 'DSY_Project';
  }
  
  // Take first 3-4 meaningful words
  let titleWords = keywords.slice(0, 4);
  
  // If we have fewer than 2 words, add a suffix
  if (titleWords.length < 2) {
    const randomSuffix = PROJECT_SUFFIXES[Math.floor(Math.random() * PROJECT_SUFFIXES.length)];
    titleWords.push(randomSuffix);
  }
  
  // Join with underscores for file naming
  return titleWords.join('_');
}

/**
 * Create a sanitized filename from a title
 * @param {string} title - The project title
 * @returns {string} - A sanitized filename
 */
export function sanitizeFilename(title) {
  return title
    .replace(/[^a-zA-Z0-9_-]/g, '_')  // Replace invalid chars
    .replace(/_+/g, '_')               // Remove multiple underscores
    .replace(/^_|_$/g, '')             // Remove leading/trailing underscores
    .substring(0, 50);                 // Limit length
}

export default { generateProjectTitle, sanitizeFilename };
