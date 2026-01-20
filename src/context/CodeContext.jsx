import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { openDB } from 'idb';
import * as sambaNovaService from '../services/sambaNovaService';
import * as geminiService from '../services/geminiService';
import * as chatbotService from '../services/chatbotService';
import { generateCode as routerGenerateCode, parseReactOutput } from '../services/codeGeneratorRouter';
import * as sessionService from '../services/sessionService';

const CodeContext = createContext(null);

// Database configuration
const DB_NAME = 'dsy-core-db';
const DB_VERSION = 3;

// BroadcastChannel for cross-tab sync
const PREVIEW_CHANNEL = 'dsy-preview-sync';

// Default project structure (empty - user will add files)
const DEFAULT_PROJECT = {
  id: 'default',
  name: 'My Project',
  files: [],
};

// Initialize IndexedDB
async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Store for assets
      if (!db.objectStoreNames.contains('assets')) {
        db.createObjectStore('assets', { keyPath: 'id' });
      }
      // Store for app state (session ID, preferences, etc.)
      if (!db.objectStoreNames.contains('appState')) {
        db.createObjectStore('appState', { keyPath: 'key' });
      }
      // Store for code/projects
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      // Store for chat history (new in version 3)
      if (!db.objectStoreNames.contains('chats')) {
        const chatsStore = db.createObjectStore('chats', { keyPath: 'id' });
        chatsStore.createIndex('createdAt', 'createdAt');
      }
    },
  });
}

// Generate a chat title from prompt (4-5 words max)
function generateChatTitle(prompt) {
  if (!prompt) return 'Untitled Design';
  
  // Remove special characters and extra spaces
  const cleanPrompt = prompt
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Get first 5 meaningful words (skip common words)
  const skipWords = ['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'for', 'of', 'with', 'in', 'on', 'at', 'by', 'as', 'it', 'that', 'this', 'i', 'me', 'my'];
  const words = cleanPrompt.split(' ').filter(w => !skipWords.includes(w.toLowerCase()) && w.length > 0);
  
  // Take first 4-5 words and capitalize first letters
  const titleWords = words.slice(0, 5);
  if (titleWords.length === 0) return 'Untitled Design';
  
  return titleWords
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Generate unique chat ID
function generateChatId() {
  return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate a unique DSY ID
function generateDSYId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `DSY-${id}`;
}

export function CodeProvider({ children }) {
  const [code, setCode] = useState('');
  const [prompt, setPrompt] = useState('');
  const [assets, setAssets] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [activeTab, setActiveTab] = useState('canvas'); // 'canvas' or 'code'
  const [isLoading, setIsLoading] = useState(true);
  const [db, setDb] = useState(null);
  
  // Project state
  const [project, setProject] = useState(DEFAULT_PROJECT);
  const [activeFileId, setActiveFileId] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState([]);

  // AI state
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [activeView, setActiveView] = useState('home'); // 'home', 'syllabus', 'boxmodel'

  // Gemini AI - Prompt Optimization & Code Generation state
  const [optimizedPrompt, setOptimizedPrompt] = useState('');
  const [designJSON, setDesignJSON] = useState(null); // Hidden JSON for code generation
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState({ html: '', css: '' });
  const [livePreviewCode, setLivePreviewCode] = useState('');
  const [framework, setFramework] = useState('html'); // 'html' or 'react'
  const [streamingContent, setStreamingContent] = useState('');
  const [projectTitle, setProjectTitle] = useState(''); // AI-generated project title

  // Chat history state
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Chatbot (AI Code Analyzer) state
  const [chatbotMessages, setChatbotMessages] = useState([]);
  const [chatbotLoading, setChatbotLoading] = useState(false);
  const [pendingCodeChanges, setPendingCodeChanges] = useState(null);

  // BroadcastChannel ref for cross-tab communication
  const broadcastChannelRef = useRef(null);


  // Initialize database and load persisted state
  useEffect(() => {
    async function init() {
      try {
        const database = await initDB();
        setDb(database);

        // Load or generate session ID
        const storedSession = await database.get('appState', 'sessionId');
        if (storedSession) {
          setSessionId(storedSession.value);
        } else {
          const newId = generateDSYId();
          await database.put('appState', { key: 'sessionId', value: newId });
          setSessionId(newId);
        }

        // Load assets
        const storedAssets = await database.getAll('assets');
        setAssets(storedAssets || []);

        // Load project
        const storedProject = await database.get('projects', 'default');
        if (storedProject) {
          setProject(storedProject);
        } else {
          // Save default project
          await database.put('projects', DEFAULT_PROJECT);
        }

        // Load last code
        const storedCode = await database.get('appState', 'lastCode');
        if (storedCode) {
          setCode(storedCode.value);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        // Generate a temporary session ID if DB fails
        setSessionId(generateDSYId());
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Persist code changes
  useEffect(() => {
    if (db && code) {
      db.put('appState', { key: 'lastCode', value: code }).catch(console.error);
    }
  }, [db, code]);

  // Persist project changes
  useEffect(() => {
    if (db && project) {
      db.put('projects', project).catch(console.error);
    }
  }, [db, project]);

  // Initialize BroadcastChannel for cross-tab communication
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannelRef.current = new BroadcastChannel(PREVIEW_CHANNEL);
      
      // Listen for messages from preview tabs
      broadcastChannelRef.current.onmessage = (event) => {
        if (event.data.type === 'REQUEST_CODE') {
          // Send current code to requesting tab
          broadcastChannelRef.current.postMessage({
            type: 'CODE_UPDATE',
            code: livePreviewCode,
          });
        }
      };
    }
    
    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, []);

  // Broadcast code updates to other tabs
  useEffect(() => {
    if (broadcastChannelRef.current && livePreviewCode) {
      broadcastChannelRef.current.postMessage({
        type: 'CODE_UPDATE',
        code: livePreviewCode,
      });
    }
  }, [livePreviewCode]);

  // Load chat history from IndexedDB
  useEffect(() => {
    async function loadChats() {
      if (!db) return;
      try {
        const chats = await db.getAll('chats');
        // Sort by createdAt descending (newest first)
        chats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setChatHistory(chats);
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }
    loadChats();
  }, [db]);

  // Live preview sync - recompile when project files change
  useEffect(() => {
    // Debounce timer ref
    const debounceTimer = setTimeout(() => {
      // Find HTML and CSS files
      const htmlFile = project.files.find(f => f.name === 'index.html' || f.name?.endsWith('.html'));
      const cssFile = project.files.find(f => f.name === 'styles.css' || f.name?.endsWith('.css'));
      
      if (htmlFile?.content || cssFile?.content) {
        const html = htmlFile?.content || '';
        const css = cssFile?.content || '';
        
        // Compile for live preview
        const compiled = geminiService.compileLivePreview(html, css);
        setLivePreviewCode(compiled);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimer);
  }, [project.files]);

  // Find file by ID (recursive)
  const findFileById = useCallback((files, id) => {
    for (const file of files) {
      if (file.id === id) return file;
      if (file.type === 'folder' && file.children) {
        const found = findFileById(file.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Get active file content
  const getActiveFileContent = useCallback(() => {
    const file = findFileById(project.files, activeFileId);
    return file?.content || '';
  }, [project.files, activeFileId, findFileById]);

  // Get active file
  const getActiveFile = useCallback(() => {
    return findFileById(project.files, activeFileId);
  }, [project.files, activeFileId, findFileById]);

  // Update file content
  const updateFileContent = useCallback((fileId, content) => {
    const updateFiles = (files) => {
      return files.map(file => {
        if (file.id === fileId) {
          return { ...file, content };
        }
        if (file.type === 'folder' && file.children) {
          return { ...file, children: updateFiles(file.children) };
        }
        return file;
      });
    };

    setProject(prev => ({
      ...prev,
      files: updateFiles(prev.files),
    }));
  }, []);

  // Open file
  const openFile = useCallback((fileId) => {
    const file = findFileById(project.files, fileId);
    if (file && file.type === 'file') {
      setActiveFileId(fileId);
      setOpenFiles(prev => prev.includes(fileId) ? prev : [...prev, fileId]);
    }
  }, [project.files, findFileById]);

  // Close file
  const closeFile = useCallback((fileId) => {
    setOpenFiles(prev => {
      const newOpenFiles = prev.filter(id => id !== fileId);
      
      // If we're closing the active file
      if (activeFileId === fileId) {
        if (newOpenFiles.length > 0) {
          // Switch to the last remaining open file
          setActiveFileId(newOpenFiles[newOpenFiles.length - 1]);
        } else {
          // No more files open - clear active file ID
          setActiveFileId(null);
        }
      }
      
      return newOpenFiles;
    });
  }, [activeFileId]);

  // Toggle folder
  const toggleFolder = useCallback((folderId) => {
    setExpandedFolders(prev => 
      prev.includes(folderId) 
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  }, []);

  // Add new file - uses counter to ensure unique IDs even when called synchronously
  const fileIdCounter = useRef(0);
  const addNewFile = useCallback((parentPath, fileName, content = '') => {
    fileIdCounter.current += 1;
    const id = `file-${Date.now()}-${fileIdCounter.current}`;
    const extension = fileName.split('.').pop();
    const languageMap = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
    };

    const newFile = {
      id,
      name: fileName,
      path: parentPath === '/' ? `/${fileName}` : `${parentPath}/${fileName}`,
      type: 'file',
      language: languageMap[extension] || 'text',
      content,
    };

    // Add to root or find parent folder
    if (parentPath === '/') {
      setProject(prev => ({
        ...prev,
        files: [...prev.files, newFile],
      }));
    } else {
      // Find parent folder and add
      const addToFolder = (files) => {
        return files.map(file => {
          if (file.type === 'folder' && file.path === parentPath) {
            return {
              ...file,
              children: [...(file.children || []), newFile],
            };
          }
          if (file.type === 'folder' && file.children) {
            return { ...file, children: addToFolder(file.children) };
          }
          return file;
        });
      };
      
      setProject(prev => ({
        ...prev,
        files: addToFolder(prev.files),
      }));
    }

    return id;
  }, []);

  // Add asset
  const addAsset = useCallback(async (asset) => {
    if (assets.length >= 15) {
      alert('Maximum 15 assets allowed');
      return false;
    }

    const newAsset = {
      id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...asset,
      createdAt: new Date().toISOString(),
    };

    setAssets(prev => [...prev, newAsset]);

    if (db) {
      await db.put('assets', newAsset).catch(console.error);
    }

    return true;
  }, [assets.length, db]);

  // Remove asset
  const removeAsset = useCallback(async (assetId) => {
    setAssets(prev => prev.filter(a => a.id !== assetId));

    if (db) {
      await db.delete('assets', assetId).catch(console.error);
    }
  }, [db]);

  // Clear all assets
  const clearAssets = useCallback(async () => {
    setAssets([]);

    if (db) {
      const tx = db.transaction('assets', 'readwrite');
      await tx.objectStore('assets').clear();
      await tx.done;
    }
  }, [db]);

  // Copy session ID to clipboard
  const copySessionId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      return false;
    }
  }, [sessionId]);

  // Send prompt to AI
  const sendPromptToAI = useCallback(async (userPrompt, taskType = 'explanation', context = {}) => {
    setAiLoading(true);
    setAiError(null);
    
    try {
      const response = await sambaNovaService.chat(userPrompt, taskType, context);
      
      if (response.success) {
        setAiResponse(response);
      } else {
        setAiError(response.error || 'Failed to get AI response');
      }
      
      return response;
    } catch (error) {
      const errorMessage = error.message || 'An error occurred while calling AI';
      setAiError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setAiLoading(false);
    }
  }, []);

  // Analyze syllabus
  const analyzeSyllabusContent = useCallback(async (syllabusText) => {
    return sendPromptToAI(syllabusText, 'syllabus');
  }, [sendPromptToAI]);

  // Analyze Box Model
  const analyzeBoxModelContent = useCallback(async (cssCode, imageDescription = '') => {
    return sendPromptToAI('', 'boxmodel', { cssCode, imageDescription });
  }, [sendPromptToAI]);

  // Clear AI response
  const clearAIResponse = useCallback(() => {
    setAiResponse(null);
    setAiError(null);
  }, []);

  // Optimize prompt with Gemini AI
  const optimizePromptWithGemini = useCallback(async () => {
    if (!prompt.trim()) {
      return { success: false, error: 'Please enter a prompt first' };
    }

    if (!geminiService.isGeminiConfigured()) {
      return { success: false, error: 'Gemini API keys not configured. Please add VITE_GEMINI_API_KEYS to your .env file.' };
    }

    setIsOptimizing(true);
    setOptimizedPrompt('');
    setDesignJSON(null);
    setAiError(null);

    try {
      const result = await geminiService.optimizePrompt(prompt, assets);
      
      if (result.success) {
        setOptimizedPrompt(result.optimizedPrompt);
        // Store the hidden JSON for code generation
        if (result.designJSON) {
          setDesignJSON(result.designJSON);
          console.log('📋 Design JSON stored for code generation');
        }
      } else {
        setAiError(result.error);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to optimize prompt';
      setAiError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsOptimizing(false);
    }
  }, [prompt, assets]);

  // Generate code with AI - Uses smart router (SambaNova for text, Gemini for images)
  const generateCodeWithAI = useCallback(async () => {
    const promptToUse = optimizedPrompt || prompt;
    
    if (!promptToUse.trim()) {
      return { success: false, error: 'No prompt available' };
    }

    // Check if at least one AI service is configured
    if (!geminiService.isGeminiConfigured() && !sambaNovaService.isSambaNovaConfigured()) {
      return { success: false, error: 'No AI keys configured. Please add API keys to your .env file.' };
    }

    setIsGenerating(true);
    setStreamingContent('');
    setGeneratedCode({ html: '', css: '' });
    setLivePreviewCode('');
    setAiError(null);

    try {
      // Use the smart router - it selects SambaNova or Gemini based on input
      console.log('🚀 Generating code with framework:', framework);
      const result = await routerGenerateCode(promptToUse, assets, framework);

      console.log('📦 Code generation result:', result);
      console.log('🔀 Pipeline used:', result.pipeline);
      console.log('📐 Framework:', result.framework);

      if (result.success) {
        // Handle React output (multi-file)
        if (framework === 'react' && result.files && result.files.length > 0) {
          console.log('⚛️ React files generated:', result.files.length);
          
          // Clear existing project files and add React files
          const newFiles = result.files.map((file, index) => {
            const id = addNewFile('/', file.name, file.content);
            return { id, name: file.name, content: file.content, language: file.language };
          });
          
          // Open all files
          const fileIds = newFiles.map(f => f.id);
          setOpenFiles(fileIds);
          
          // Set App.tsx as active
          const appFile = newFiles.find(f => f.name === 'App.tsx' || f.name.includes('App'));
          if (appFile) {
            setActiveFileId(appFile.id);
          } else if (fileIds.length > 0) {
            setActiveFileId(fileIds[0]);
          }
          
          // For React, we can't show live preview directly (would need bundler)
          // Show a message or the main component code
          setLivePreviewCode('<!-- React components generated. Check Code tab for files. -->');
          
          // Store generated code
          setGeneratedCode({ 
            html: '', 
            css: '', 
            files: result.files,
            framework: 'react' 
          });
          
        } else {
          // Handle HTML/CSS output
          setGeneratedCode({ html: result.html, css: result.css });
          
          // Compile for live preview
          const compiled = geminiService.compileLivePreview(result.html, result.css);
          setLivePreviewCode(compiled);

          // Update project files - check if files already exist
          const existingHtmlFile = project.files.find(f => f.name === 'index.html');
          const existingCssFile = project.files.find(f => f.name === 'styles.css');

          let htmlFileId = existingHtmlFile?.id || null;
          let cssFileId = existingCssFile?.id || null;

          if (result.html) {
            if (existingHtmlFile) {
              updateFileContent(existingHtmlFile.id, result.html);
            } else {
              htmlFileId = addNewFile('/', 'index.html', result.html);
            }
          }
          if (result.css) {
            if (existingCssFile) {
              updateFileContent(existingCssFile.id, result.css);
            } else {
              cssFileId = addNewFile('/', 'styles.css', result.css);
            }
          }

          // Open BOTH files as separate tabs
          setOpenFiles(prev => {
            const newOpenFiles = [...prev];
            if (htmlFileId && !newOpenFiles.includes(htmlFileId)) {
              newOpenFiles.push(htmlFileId);
            }
            if (cssFileId && !newOpenFiles.includes(cssFileId)) {
              newOpenFiles.push(cssFileId);
            }
            return newOpenFiles;
          });
          
          // Set HTML as the active file
          if (htmlFileId) {
            setActiveFileId(htmlFileId);
          }
        }

        // Auto-switch to Canvas view
        setActiveTab('canvas');

        // Generate AI-powered project title
        const promptForTitle = prompt || optimizedPrompt || '';
        try {
          const titleResult = await geminiService.generateProjectTitle(promptForTitle);
          if (titleResult.success && titleResult.title) {
            setProjectTitle(titleResult.title);
            console.log('🏷️ Project title generated:', titleResult.title);
          } else {
            // Fallback to chat title generation
            setProjectTitle(generateChatTitle(promptForTitle));
          }
        } catch (titleError) {
          console.warn('Title generation failed, using fallback:', titleError);
          setProjectTitle(generateChatTitle(promptForTitle));
        }

        // Auto-save to chat history
        if (db) {
          const chat = {
            id: generateChatId(),
            title: generateChatTitle(prompt),
            prompt: prompt || '',
            optimizedPrompt: optimizedPrompt || '',
            assets: assets || [],
            generatedCode: framework === 'react' 
              ? { files: result.files, framework: 'react' }
              : { html: result.html, css: result.css },
            framework: framework,
            createdAt: new Date().toISOString(),
          };
          
          db.put('chats', chat).then(() => {
            setChatHistory(prev => [chat, ...prev]);
            setCurrentChatId(chat.id);
            console.log('💬 Chat auto-saved:', chat.title);
          }).catch(console.error);
        }
      } else {
        setAiError(result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to generate code';
      setAiError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsGenerating(false);
    }
  }, [optimizedPrompt, prompt, assets, designJSON, framework, project.files, addNewFile, updateFileContent, db]);

  // Reset generation state
  const resetGeneration = useCallback(() => {
    setOptimizedPrompt('');
    setStreamingContent('');
    setGeneratedCode({ html: '', css: '' });
    setLivePreviewCode('');
    setAiError(null);
  }, []);

  // Save a new chat to history
  const saveChat = useCallback(async (chatData) => {
    if (!db) return null;
    
    try {
      const chat = {
        id: generateChatId(),
        title: generateChatTitle(chatData.prompt),
        prompt: chatData.prompt || '',
        optimizedPrompt: chatData.optimizedPrompt || '',
        assets: chatData.assets || [],
        generatedCode: chatData.generatedCode || { html: '', css: '' },
        createdAt: new Date().toISOString(),
      };
      
      await db.put('chats', chat);
      
      // Update local state
      setChatHistory(prev => [chat, ...prev]);
      setCurrentChatId(chat.id);
      
      console.log('💬 Chat saved:', chat.title);
      return chat;
    } catch (error) {
      console.error('Failed to save chat:', error);
      return null;
    }
  }, [db]);

  // Load a specific chat from history
  const loadChat = useCallback(async (chatId) => {
    if (!db) return null;
    
    try {
      const chat = await db.get('chats', chatId);
      if (chat) {
        // Restore the chat state
        setPrompt(chat.prompt);
        setOptimizedPrompt(chat.optimizedPrompt);
        setGeneratedCode(chat.generatedCode);
        setCurrentChatId(chat.id);
        
        // Rebuild live preview from saved code
        if (chat.generatedCode?.html || chat.generatedCode?.css) {
          const compiled = geminiService.compileLivePreview(
            chat.generatedCode.html || '',
            chat.generatedCode.css || ''
          );
          setLivePreviewCode(compiled);
          
          // Update project files and open them as tabs
          let htmlFileId = null;
          let cssFileId = null;
          const existingHtmlFile = project.files.find(f => f.name === 'index.html');
          const existingCssFile = project.files.find(f => f.name === 'styles.css');
          
          if (chat.generatedCode.html) {
            if (existingHtmlFile) {
              updateFileContent(existingHtmlFile.id, chat.generatedCode.html);
              htmlFileId = existingHtmlFile.id;
            } else {
              htmlFileId = addNewFile('/', 'index.html', chat.generatedCode.html);
            }
          }
          if (chat.generatedCode.css) {
            if (existingCssFile) {
              updateFileContent(existingCssFile.id, chat.generatedCode.css);
              cssFileId = existingCssFile.id;
            } else {
              cssFileId = addNewFile('/', 'styles.css', chat.generatedCode.css);
            }
          }
          
          // Open both files as tabs
          if (htmlFileId) openFile(htmlFileId);
          if (cssFileId) openFile(cssFileId);
          // Set HTML as the active file
          if (htmlFileId) setActiveFileId(htmlFileId);
        }
        
        // Close the drawer
        setIsHistoryDrawerOpen(false);
        
        console.log('📂 Chat loaded:', chat.title);
      }
      return chat;
    } catch (error) {
      console.error('Failed to load chat:', error);
      return null;
    }
  }, [db, project.files, updateFileContent, addNewFile, openFile]);

  // Delete a chat from history
  const deleteChat = useCallback(async (chatId) => {
    if (!db) return false;
    
    try {
      await db.delete('chats', chatId);
      setChatHistory(prev => prev.filter(c => c.id !== chatId));
      
      // If deleted current chat, clear current chat ID
      if (currentChatId === chatId) {
        setCurrentChatId(null);
      }
      
      console.log('🗑️ Chat deleted:', chatId);
      return true;
    } catch (error) {
      console.error('Failed to delete chat:', error);
      return false;
    }
  }, [db, currentChatId]);

  // Sync current session to cloud
  const syncToCloud = useCallback(async () => {
    if (!sessionId) return { success: false, error: 'No session ID' };
    
    try {
      // Prepare full session object
      const sessionData = {
        project,
        assets,
        chatHistory,
        lastActive: new Date().toISOString(),
      };
      
      await sessionService.syncSessionToCloud(sessionId, sessionData);
      console.log('☁️ Session synced to cloud:', sessionId);
      return { success: true };
    } catch (error) {
      console.error('Cloud Sync Failed:', error);
      return { success: false, error: error.message };
    }
  }, [sessionId, project, assets, chatHistory]);

  // Switch to a remote session (Login)
  const switchSession = useCallback(async (targetId) => {
    if (!db) return { success: false, error: 'Database not initialized' };
    if (!targetId) return { success: false, error: 'Invalid ID' };
    
    setIsLoading(true);
    
    try {
      // 1. Fetch remote session data
      const remoteSession = await sessionService.retrieveSessionFromCloud(targetId);
      
      if (!remoteSession) {
        throw new Error('Session not found');
      }
      
      console.log('📥 Retrieved remote session:', remoteSession);
      
      // 2. Kill current session (Clear IndexedDB stores)
      const stores = ['assets', 'projects', 'chats', 'appState'];
      const tx = db.transaction(stores, 'readwrite');
      
      await Promise.all([
        tx.objectStore('assets').clear(),
        tx.objectStore('projects').clear(),
        tx.objectStore('chats').clear(),
        tx.objectStore('appState').clear()
      ]);
      
      // 3. Hydrate IndexedDB with new data
      // Restore Projects
      if (remoteSession.project) {
        await await db.put('projects', remoteSession.project);
      } else {
        await db.put('projects', DEFAULT_PROJECT);
      }
      
      // Restore Assets
      if (remoteSession.assets && Array.isArray(remoteSession.assets)) {
        for (const asset of remoteSession.assets) {
          await db.put('assets', asset);
        }
      }
      
      // Restore Chats
      if (remoteSession.chatHistory && Array.isArray(remoteSession.chatHistory)) {
        for (const chat of remoteSession.chatHistory) {
          await db.put('chats', chat);
        }
      }
      
      // Set new Session ID
      await db.put('appState', { key: 'sessionId', value: targetId });
      
      await tx.done;
      
      // 4. Update React State
      setSessionId(targetId);
      setProject(remoteSession.project || DEFAULT_PROJECT);
      setAssets(remoteSession.assets || []);
      setChatHistory(remoteSession.chatHistory || []);
      setOpenFiles([]); // Reset open files
      setActiveFileId(null);
      
      // If code was in the project, maybe load it? 
      // For now, reset generation state
      setCode('');
      setGeneratedCode({ html: '', css: '' });
      setLivePreviewCode('');
      
      console.log('✅ Switched to session:', targetId);
      return { success: true };
      
    } catch (error) {
      console.error('Failed to switch session:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [db]);



  // Start a new chat (clear current state)
  const startNewChat = useCallback(() => {
    setPrompt('');
    setOptimizedPrompt('');
    setDesignJSON(null);
    setGeneratedCode({ html: '', css: '' });
    setLivePreviewCode('');
    setStreamingContent('');
    setAiError(null);
    setCurrentChatId(null);
    
    // Clear project files
    setProject(DEFAULT_PROJECT);
    setActiveFileId(null);
    setOpenFiles([]);
    
    console.log('✨ New chat started');
  }, []);

  // Toggle history drawer
  const toggleHistoryDrawer = useCallback(() => {
    setIsHistoryDrawerOpen(prev => !prev);
  }, []);

  // ============================================================================
  // CHATBOT (AI Code Analyzer) FUNCTIONS
  // ============================================================================

  // Get current project files for chatbot context
  const getChatbotFiles = useCallback(() => {
    const htmlFile = project.files.find(f => f.name === 'index.html' || f.name?.endsWith('.html'));
    const cssFile = project.files.find(f => f.name === 'styles.css' || f.name?.endsWith('.css'));
    return {
      html: htmlFile?.content || '',
      css: cssFile?.content || ''
    };
  }, [project.files]);

  // Send message to chatbot
  const sendChatbotMessage = useCallback(async (message) => {
    if (!message.trim()) return;

    // Add user message to history
    const userMessage = { role: 'user', content: message };
    setChatbotMessages(prev => [...prev, userMessage]);
    setChatbotLoading(true);
    setPendingCodeChanges(null);

    try {
      const files = getChatbotFiles();
      const result = await chatbotService.sendChatMessage(
        message,
        files,
        chatbotMessages
      );

      if (result.success) {
        // Add AI response to history
        const aiMessage = { role: 'assistant', content: result.message };
        setChatbotMessages(prev => [...prev, aiMessage]);

        // Store pending code changes if AI suggested modifications
        if (result.hasCodeChanges) {
          setPendingCodeChanges({
            html: result.modifiedHtml,
            css: result.modifiedCss
          });
        }
      } else {
        // Add error message
        const errorMessage = { role: 'assistant', content: `❌ Error: ${result.error}` };
        setChatbotMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage = { role: 'assistant', content: `❌ Error: ${error.message}` };
      setChatbotMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatbotLoading(false);
    }
  }, [chatbotMessages, getChatbotFiles]);

  // Apply pending code changes from chatbot
  const applyChatbotCodeChanges = useCallback(() => {
    if (!pendingCodeChanges) return;

    const existingHtmlFile = project.files.find(f => f.name === 'index.html');
    const existingCssFile = project.files.find(f => f.name === 'styles.css');
    
    let htmlFileId = null;
    let cssFileId = null;

    // Apply HTML changes
    if (pendingCodeChanges.html) {
      if (existingHtmlFile) {
        updateFileContent(existingHtmlFile.id, pendingCodeChanges.html);
        htmlFileId = existingHtmlFile.id;
      } else {
        htmlFileId = addNewFile('/', 'index.html', pendingCodeChanges.html);
      }
    }

    // Apply CSS changes
    if (pendingCodeChanges.css) {
      if (existingCssFile) {
        updateFileContent(existingCssFile.id, pendingCodeChanges.css);
        cssFileId = existingCssFile.id;
      } else {
        cssFileId = addNewFile('/', 'styles.css', pendingCodeChanges.css);
      }
    }

    // Open both files as separate tabs
    if (htmlFileId) {
      setOpenFiles(prev => prev.includes(htmlFileId) ? prev : [...prev, htmlFileId]);
    }
    if (cssFileId) {
      setOpenFiles(prev => prev.includes(cssFileId) ? prev : [...prev, cssFileId]);
    }
    
    // Set HTML as active file (or CSS if only CSS was modified)
    if (htmlFileId) {
      setActiveFileId(htmlFileId);
    } else if (cssFileId) {
      setActiveFileId(cssFileId);
    }

    // Clear pending changes
    setPendingCodeChanges(null);

    // Update live preview
    if (pendingCodeChanges.html || pendingCodeChanges.css) {
      const htmlFile = project.files.find(f => f.name === 'index.html');
      const cssFile = project.files.find(f => f.name === 'styles.css');
      const compiled = geminiService.compileLivePreview(
        pendingCodeChanges.html || htmlFile?.content || '',
        pendingCodeChanges.css || cssFile?.content || ''
      );
      setLivePreviewCode(compiled);
    }
    
    // Switch to code tab to show the changes
    setActiveTab('code');

    console.log('✅ Chatbot code changes applied');
  }, [pendingCodeChanges, project.files, updateFileContent, addNewFile]);

  // Clear chatbot history
  const clearChatbotHistory = useCallback(() => {
    setChatbotMessages([]);
    setPendingCodeChanges(null);
  }, []);

  const value = {
    // State
    code,
    setCode,
    prompt,
    setPrompt,
    assets,
    sessionId,
    activeTab,
    setActiveTab,
    isLoading,

    // Project state
    project,
    activeFileId,
    openFiles,
    expandedFolders,

    // AI state
    aiResponse,
    aiLoading,
    aiError,
    activeView,
    setActiveView,

    // Project actions
    getActiveFile,
    getActiveFileContent,
    updateFileContent,
    openFile,
    closeFile,
    toggleFolder,
    addNewFile,
    findFileById,

    // AI actions
    sendPromptToAI,
    analyzeSyllabusContent,
    analyzeBoxModelContent,
    clearAIResponse,

    // AI - Prompt Optimization (Gemini) & Code Generation (SambaNova)
    optimizedPrompt,
    isOptimizing,
    isGenerating,
    generatedCode,
    livePreviewCode,
    streamingContent,
    framework,
    setFramework,
    optimizePromptWithGemini,
    generateCodeWithAI,
    resetGeneration,
    projectTitle, // AI-generated project title for downloads

    // Actions
    addAsset,
    removeAsset,
    clearAssets,
    copySessionId,
    syncToCloud,
    switchSession,

    // Chat history state and actions
    chatHistory,
    currentChatId,
    isHistoryDrawerOpen,
    saveChat,
    loadChat,
    deleteChat,
    startNewChat,
    toggleHistoryDrawer,

    // Chatbot (AI Code Analyzer) state and actions
    chatbotMessages,
    chatbotLoading,
    pendingCodeChanges,
    sendChatbotMessage,
    applyChatbotCodeChanges,
    clearChatbotHistory,

    // New tab preview support
    broadcastChannelRef,
  };

  return (
    <CodeContext.Provider value={value}>
      {children}
    </CodeContext.Provider>
  );
}

export function useCode() {
  const context = useContext(CodeContext);
  if (!context) {
    throw new Error('useCode must be used within a CodeProvider');
  }
  return context;
}

export default CodeContext;
