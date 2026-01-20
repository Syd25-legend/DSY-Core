import { useState, useRef, useCallback, useEffect } from 'react';
import { CodeProvider, useCode } from './context/CodeContext';
import CodeEditor from './components/CodeEditor';
import AssetPreview from './components/AssetPreview';
import SyllabusRoadmap from './components/SyllabusRoadmap';
import BoxModelInspector from './components/BoxModelInspector';
import GlobalLoader from './components/globalloader';
import LivePreview from './components/LivePreview';
import ChatHistoryDrawer from './components/ChatHistoryDrawer';
import PreviewPage from './components/PreviewPage';
import CodeChatbot from './components/CodeChatbot';
import LoginModal from './components/LoginModal';
import { Map, Box, LogIn, CloudUpload, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateProjectTitle, sanitizeFilename } from './utils/titleGenerator';
import './index.css';

function AppContent() {
  const {
    prompt,
    setPrompt,
    assets,
    addAsset,
    sessionId,
    copySessionId,
    activeTab,
    setActiveTab,
    isLoading,
    activeView,
    setActiveView,
    // Gemini AI states and functions
    optimizedPrompt,
    isOptimizing,
    isGenerating,
    livePreviewCode,
    aiError,
    framework,
    setFramework,
    optimizePromptWithGemini,
    generateCodeWithAI,
    resetGeneration,
    // Chat history
    chatHistory,
    toggleHistoryDrawer,
    // Session Sync
    syncToCloud,
    // Project files
    project,
    // AI-generated project title
    projectTitle,
  } = useCode();

  const [copied, setCopied] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [externalLink, setExternalLink] = useState('');
  const [examplePromptsOpen, setExamplePromptsOpen] = useState(false);
  const [isHoveringUploadZone, setIsHoveringUploadZone] = useState(false);
  const fileInputRef = useRef(null);
  const uploadZoneRef = useRef(null);

  // Example prompts for users
  const EXAMPLE_PROMPTS = [
    { text: "Create a modern portfolio website with a hero section", hasImage: false },
    { text: "Build a pricing page with 3 tiers and glassmorphism cards", hasImage: false },
    { text: "Design a landing page for a SaaS product", hasImage: false },
    { text: "Create a contact form with dark theme and gold accents", hasImage: false },
    { text: "Build a feature showcase section with icons and animations", hasImage: false },
    { text: "Recreate this design as a web page (attach image)", hasImage: true },
    { text: "Convert this UI mockup to HTML/CSS (attach image)", hasImage: true },
    { text: "Build a page inspired by this color palette (attach image)", hasImage: true },
    { text: "Create a testimonials section with cards and profile images", hasImage: false },
    { text: "Design a footer with newsletter signup and social links", hasImage: false },
  ];

  // Handle session ID copy
  const handleCopySession = async () => {
    const success = await copySessionId();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle Cloud Sync
  const handleSync = async () => {
    setIsSyncing(true);
    const result = await syncToCloud();
    setIsSyncing(false);
    
    if (result.success) {
      alert('Session synced to cloud successfully!');
    } else {
      alert('Failed to sync: ' + result.error);
    }
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (files) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        alert(`File type not supported: ${file.name}`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File too large: ${file.name}`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const type = file.type.startsWith('image/') ? 'image' : 'pdf';
        await addAsset({
          name: file.name,
          type,
          data: e.target.result,
          size: file.size,
        });
      };
      reader.readAsDataURL(file);
    }
  }, [addAsset]);

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle paste from clipboard (works on hover)
  useEffect(() => {
    const handleGlobalPaste = (e) => {
      // Only handle paste if hovering over the upload zone
      if (!isHoveringUploadZone) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            // Create a custom name for pasted images
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const extension = file.type.split('/')[1] || 'png';
            const customFile = new File([file], `pasted-image-${timestamp}.${extension}`, { type: file.type });
            imageFiles.push(customFile);
          }
        }
      }
      
      if (imageFiles.length > 0) {
        handleFileUpload(imageFiles);
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [isHoveringUploadZone, handleFileUpload]);

  // Handle external link
  const handleAddLink = async () => {
    if (!externalLink.trim()) return;
    
    try {
      new URL(externalLink); // Validate URL
      await addAsset({
        name: externalLink,
        type: 'link',
        data: externalLink,
      });
      setExternalLink('');
      setLinkModalOpen(false);
    } catch {
      alert('Please enter a valid URL');
    }
  };

  // Handle project download
  const handleDownload = async () => {
    // Get files from current context
    const htmlFile = project?.files?.find(f => f.name === 'index.html');
    const cssFile = project?.files?.find(f => f.name === 'styles.css');
    
    // Check if we have any generated code
    if (!htmlFile?.content && !cssFile?.content && !livePreviewCode) {
      alert('No code to download! Generate some code first.');
      return;
    }
    
    try {
      const zip = new JSZip();
      
      // Use AI-generated title or fallback to prompt-based title
      const downloadTitle = projectTitle || generateProjectTitle(optimizedPrompt || prompt || 'DSY Project');
      // Sanitize for filename (replace spaces with underscores for file, but display with spaces)
      const filenameTitle = sanitizeFilename(downloadTitle.replace(/\s+/g, ' ').trim()) || 'DSY Project';
      
      // Add HTML file
      if (htmlFile?.content) {
        zip.file('index.html', htmlFile.content);
      } else if (livePreviewCode) {
        // Extract HTML from live preview if no separate file exists
        zip.file('index.html', livePreviewCode);
      }
      
      // Add CSS file
      if (cssFile?.content) {
        zip.file('styles.css', cssFile.content);
      }
      
      // Add any other project files
      if (project?.files) {
        for (const file of project.files) {
          if (file.name !== 'index.html' && file.name !== 'styles.css' && file.content) {
            zip.file(file.name, file.content);
          }
        }
      }
      
      // Add a README with project info
      const readme = `# ${downloadTitle}

Generated with DSY Core
Session ID: ${sessionId}
Generated on: ${new Date().toLocaleString()}

## Files included:
${project?.files?.map(f => `- ${f.name}`).join('\n') || '- index.html'}

## How to use:
1. Open index.html in your browser
2. Edit files as needed
3. Enjoy your design!
`;
      zip.file('README.md', readme);
      
      // Generate and download the zip
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `${filenameTitle}.zip`);
      
      console.log('📦 Project downloaded:', filenameTitle);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download project. Please try again.');
    }
  };

  // Handle keyboard shortcuts on textarea
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      if (prompt.trim() && !isOptimizing) {
        handleOptimizePrompt();
      }
    }
  };

  // Handle optimize prompt with Gemini AI
  const handleOptimizePrompt = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt first');
      return;
    }
    const result = await optimizePromptWithGemini();
    if (!result.success) {
      alert(result.error || 'Failed to optimize prompt');
    }
  };

  // Handle send to AI for code generation
  const handleSendToAI = async () => {
    const result = await generateCodeWithAI();
    if (!result.success) {
      alert(result.error || 'Failed to generate code');
    }
  };

  if (isLoading) {
    return <GlobalLoader fullScreen message="Loading DSY Core..." />;
  }

  return (
    <div className="h-screen flex flex-col bg-[#0A090F] text-slate-100 font-sans selection:bg-[#C5A059]/30 overflow-hidden">
      {/* Noise Background */}
      <div className="noise-bg" />
      
      {/* Ambient Glow Effects */}
      <div className="ambient-glow-gold" />
      <div className="ambient-glow-purple" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--color-primary-border)] bg-[var(--color-accent-purple)]/50 backdrop-blur-xl">
          {/* Logo - Left */}
          <div className="flex items-center space-x-3">
            <img 
              src="/logo (1).png" 
              alt="DSY Core Logo" 
              className="w-8 h-8 rounded-lg object-contain"
            />
            <h1 className="font-display text-xl font-bold tracking-tight gold-gradient-text uppercase">
              DSY Core
            </h1>
          </div>

          {/* Navigation Links - Center */}
          <nav className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
            <button
              onClick={() => setActiveView('home')}
              className={`nav-link flex items-center gap-1.5 ${activeView === 'home' ? 'active' : ''}`}
            >
              <span className="material-icons-round text-xs">code</span>
              Coding
            </button>
            <button
              onClick={() => setActiveView('syllabus')}
              className={`nav-link flex items-center gap-1.5 ${activeView === 'syllabus' ? 'active' : ''}`}
            >
              <Map size={12} />
              Syllabus Roadmap
            </button>
            <button
              onClick={() => setActiveView('boxmodel')}
              className={`nav-link flex items-center gap-1.5 ${activeView === 'boxmodel' ? 'active' : ''}`}
            >
              <Box size={12} />
              Box Model
            </button>
          </nav>
          
          {/* Session Badge & Controls - Right */}
          <div className="flex items-center space-x-4">
            {/* Session Badge */}
            <div className="px-3 py-1.5 rounded-full glass-panel flex items-center space-x-2 text-xs">
              <span className="text-slate-400">SESSION:</span>
              <span className="font-mono text-[var(--color-primary)] font-semibold tracking-wider">{sessionId}</span>
              <button 
                onClick={handleCopySession}
                className="hover:text-[var(--color-primary)] transition-colors"
                title="Copy session ID"
              >
                <span className="material-icons-round text-sm">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
            
            {/* Sync Button */}
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400 hover:text-[#C5A059]"
              title="Sync to Cloud"
            >
              {isSyncing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CloudUpload className="w-5 h-5" />
              )}
            </button>

            {/* Login / Retrieve Button */}
            <button 
              onClick={() => setLoginModalOpen(true)}
              className="p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400 hover:text-purple-400"
              title="Retrieve Session (Login)"
            >
              <LogIn className="w-5 h-5" />
            </button>

            {/* History Button */}
            <button 
              onClick={toggleHistoryDrawer}
              className="p-2 rounded-full hover:bg-white/5 transition-colors relative"
              title="Chat History"
            >
              <span className="material-icons-round text-slate-400">history</span>
              {chatHistory.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C5A059] rounded-full text-[8px] font-bold text-[#0A090F] flex items-center justify-center">
                  {chatHistory.length > 9 ? '9+' : chatHistory.length}
                </span>
              )}
            </button>

            {/* Refresh Button */}
            <button 
              onClick={() => window.location.reload()}
              className="p-2 rounded-full hover:bg-white/5 transition-colors"
              title="Refresh"
            >
              <span className="material-icons-round text-slate-400">refresh</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex flex-1 overflow-hidden">
          {/* Conditional View Rendering */}
          {activeView === 'syllabus' ? (
            <section className="flex-1 flex flex-col bg-[#0A090F]/80 relative">
              <div className="center-glow" />
              <SyllabusRoadmap />
            </section>
          ) : activeView === 'boxmodel' ? (
            <section className="flex-1 flex flex-col bg-[#0A090F]/80 relative">
              <div className="center-glow" />
              <BoxModelInspector />
            </section>
          ) : (
            <>
              {/* Left Sidebar - Only shown on home view */}
              <aside className="w-[420px] flex flex-col border-r border-[#C5A059]/10 bg-[#1A1625]/20 overflow-y-auto p-6 space-y-8">
                {/* Interaction Zone */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center">
                      <span className="material-icons-round text-sm mr-2 text-[#C5A059]">bolt</span>
                      Interaction Zone
                    </h2>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Magic Prompt */}
                    <div className="group">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">
                        Magic Prompt
                      </label>
                      <div className="relative rounded-xl overflow-hidden glass-panel group-focus-within:border-[#C5A059]/40 transition-all">
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="w-full h-48 bg-transparent border-none focus:ring-0 p-4 text-sm text-slate-200 placeholder:text-slate-600 resize-none leading-relaxed"
                          placeholder="Describe what you want to create... Be specific about layout, colors, animations. Press Ctrl+Enter to optimize."
                        />
                        <div className="absolute bottom-3 right-4 flex items-center space-x-4">
                          <span className="text-[10px] text-slate-500 font-mono">{prompt.length} characters</span>
                          <span className="text-[10px] text-slate-600 italic">Ctrl+Enter to optimize</span>
                        </div>
                      </div>
                    </div>

                    {/* Optimize Prompt Button with Examples */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleOptimizePrompt}
                        disabled={isOptimizing || !prompt.trim()}
                        className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl luxury-button group ${
                          isOptimizing || !prompt.trim() ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isOptimizing ? (
                          <>
                            <span className="material-icons-round text-sm mr-2 text-[#C5A059] animate-spin">autorenew</span>
                            <span className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Optimizing...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-icons-round text-sm mr-2 text-[#C5A059] group-hover:rotate-12 transition-transform">auto_awesome</span>
                            <span className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Optimize Prompt</span>
                          </>
                        )}
                      </button>
                      
                      {/* Example Prompts Button */}
                      <button 
                        onClick={() => setExamplePromptsOpen(true)}
                        className="p-3 rounded-xl glass-panel hover:bg-white/5 transition-all border border-[#C5A059]/10 hover:border-[#C5A059]/30"
                        title="Example Prompts"
                      >
                        <span className="material-icons-round text-sm text-[#C5A059]">lightbulb</span>
                      </button>
                    </div>

                    {/* Optimized Prompt Display */}
                    {optimizedPrompt && (
                      <div className="space-y-3">
                        <div className="group">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-green-400 mb-2 px-1 flex items-center">
                            <span className="material-icons-round text-xs mr-1">check_circle</span>
                            Optimized Prompt
                          </label>
                          <div className="relative rounded-xl overflow-hidden glass-panel border-green-500/20 bg-green-500/5">
                            <div className="p-4 text-sm text-slate-300 leading-relaxed max-h-40 overflow-y-auto">
                              {optimizedPrompt}
                            </div>
                          </div>
                        </div>
                        
                        {/* Framework Toggle */}
                        <div className="framework-toggle">
                          <span className="toggle-label">Output Format:</span>
                          <div className="toggle-buttons">
                            <button 
                              className={`toggle-btn ${framework === 'html' ? 'active' : ''}`}
                              onClick={() => setFramework('html')}
                            >
                              <span className="material-icons-round text-xs mr-1">code</span>
                              HTML/CSS
                            </button>
                            <button 
                              className={`toggle-btn ${framework === 'react' ? 'active' : ''}`}
                              onClick={() => setFramework('react')}
                            >
                              <span className="material-icons-round text-xs mr-1">widgets</span>
                              React
                            </button>
                          </div>
                        </div>
                        
                        {/* Send to AI Button */}
                        <button 
                          onClick={handleSendToAI}
                          disabled={isGenerating}
                          className={`w-full flex items-center justify-center py-4 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF61] text-[#0A090F] font-bold text-sm uppercase tracking-widest shadow-lg shadow-[#C5A059]/20 hover:shadow-[#C5A059]/40 transition-all ${
                            isGenerating ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02]'
                          }`}
                        >
                          {isGenerating ? (
                            <>
                              <span className="material-icons-round text-sm mr-2 animate-spin">autorenew</span>
                              Generating Code...
                            </>
                          ) : (
                            <>
                              <span className="material-icons-round text-sm mr-2">send</span>
                              Send to AI
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* AI Error Display */}
                    {aiError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <div className="flex items-start">
                          <span className="material-icons-round text-sm mr-2 mt-0.5">error</span>
                          <span>{aiError}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Assets Section */}
                <section className="space-y-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center px-1">
                    <span className="material-icons-round text-sm mr-2 text-[#C5A059]">folder_open</span>
                    Assets (Images, PDFs, Links)
                  </h2>

                  {/* Asset Preview */}
                  <AssetPreview />

                  {/* Upload Zone */}
                  <div 
                    ref={uploadZoneRef}
                    className="group cursor-pointer"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onMouseEnter={() => setIsHoveringUploadZone(true)}
                    onMouseLeave={() => setIsHoveringUploadZone(false)}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className={`relative h-32 w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center space-y-2 transition-all duration-300 ${
                      isHoveringUploadZone 
                        ? 'border-[#C5A059]/40 bg-[#C5A059]/10' 
                        : 'border-[#C5A059]/10 bg-white/5 hover:bg-[#C5A059]/5 hover:border-[#C5A059]/30'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="material-icons-round text-[#C5A059]">upload_file</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="material-icons-round text-[#C5A059]">content_paste</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-slate-300">Drop files here, click to upload, or hover & paste (Ctrl+V)</p>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase">JPG, PNG, GIF, WEBP, PDF [MAX 15 FILES]</p>
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                    />
                  </div>

                  {/* Add External Link Button */}
                  <button 
                    onClick={() => setLinkModalOpen(true)}
                    className="w-full flex items-center justify-center py-3 px-4 rounded-xl glass-panel hover:bg-white/5 transition-all text-slate-400 hover:text-[#C5A059] border-[#C5A059]/5"
                  >
                    <span className="material-icons-round text-sm mr-2">link</span>
                    <span className="text-xs font-bold uppercase tracking-widest">Add External Link</span>
                  </button>
                </section>

                {/* DSY Core Pro Branding */}
                <div className="mt-auto pt-6 opacity-30 flex items-center justify-center">
                  <span className="material-icons-round text-xl mr-2">diamond</span>
                  <span className="font-display font-medium tracking-tighter text-lg uppercase">DSY CORE PRO</span>
                </div>
              </aside>

              {/* Main Output Section */}
              <section className="flex-1 flex flex-col bg-[#0A090F]/80 relative">
                {/* Center Glow */}
                <div className="center-glow" />

                {/* Output Zone Header */}
                <div className="h-14 flex items-center justify-between px-6 border-b border-white/5 z-20">
                  <div className="flex items-center space-x-6">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Output Zone</h2>
                    
                    {/* Canvas/Code Toggle */}
                    <div className="flex p-1 bg-black/40 rounded-lg border border-[#C5A059]/10">
                      <button 
                        onClick={() => setActiveTab('canvas')}
                        className={`flex items-center px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          activeTab === 'canvas' 
                            ? 'bg-[#C5A059] text-[#0A090F]' 
                            : 'text-slate-500 hover:text-slate-200'
                        }`}
                      >
                        <span className="material-icons-round text-xs mr-1.5">dashboard</span>
                        Canvas
                      </button>
                      <button 
                        onClick={() => setActiveTab('code')}
                        className={`flex items-center px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          activeTab === 'code' 
                            ? 'bg-[#C5A059] text-[#0A090F]' 
                            : 'text-slate-500 hover:text-slate-200'
                        }`}
                      >
                        <span className="material-icons-round text-xs mr-1.5">code</span>
                        Code
                      </button>
                      
                      {/* Separator */}
                      <div className="w-px h-4 bg-white/10 mx-1" />
                      
                      {/* AI Chat Button */}
                      <CodeChatbot />
                    </div>
                  </div>

                  {/* Download Button */}
                  <button 
                    onClick={handleDownload}
                    className="flex items-center px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-[#C5A059]/40 hover:bg-white/10 transition-all group"
                  >
                    <span className="material-icons-round text-sm mr-2 text-[#C5A059]">cloud_download</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-200">Download Project</span>
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
                  {activeTab === 'canvas' ? (
                    // Canvas View - LivePreview or Welcome Screen
                    livePreviewCode || isGenerating ? (
                      <div className="w-full h-full p-4">
                        <LivePreview code={livePreviewCode} isLoading={isGenerating} />
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-12">
                        <div className="max-w-2xl text-center space-y-6">
                          <div className="inline-block px-4 py-1.5 rounded-full bg-[#C5A059]/5 border border-[#C5A059]/20 text-[#C5A059] text-[10px] font-bold uppercase tracking-widest mb-4">
                            System Ready
                          </div>
                          
                          <h2 className="text-6xl font-display font-bold gold-gradient-text leading-tight">
                            Welcome to <br /> DSY Core
                          </h2>
                          
                          <p className="text-xl text-slate-400 font-light max-w-lg mx-auto leading-relaxed">
                            Ignite your imagination. Start creating amazing things with your magic prompts.
                          </p>

                          {/* Feature Cards */}
                          <div className="grid grid-cols-3 gap-6 pt-12">
                            <div 
                              className="glass-panel p-6 rounded-2xl flex flex-col items-center space-y-3 group hover:border-[#C5A059]/30 transition-all cursor-pointer"
                              onClick={() => setActiveView('syllabus')}
                            >
                              <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] mb-2">
                                <Map size={24} />
                              </div>
                              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Syllabus Roadmap</h3>
                            </div>

                            <div 
                              className="glass-panel p-6 rounded-2xl flex flex-col items-center space-y-3 group hover:border-[#C5A059]/30 transition-all cursor-pointer"
                              onClick={() => setActiveView('boxmodel')}
                            >
                              <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] mb-2">
                                <Box size={24} />
                              </div>
                              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Box Model Inspector</h3>
                            </div>

                            <div className="glass-panel p-6 rounded-2xl flex flex-col items-center space-y-3 group hover:border-[#C5A059]/30 transition-all cursor-pointer">
                              <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] mb-2">
                                <span className="material-icons-round">rocket_launch</span>
                              </div>
                              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Deploy App</h3>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    // Code Editor
                    <div className="w-full h-full">
                      <CodeEditor />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <footer className="h-8 border-t border-white/5 px-6 flex items-center justify-center text-[10px] text-slate-600 font-medium uppercase tracking-widest">
                  <span>© 2026 DSY CORE</span>
                </footer>
              </section>
            </>
          )}
        </main>
      </div>

      {/* External Link Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-slate-200">Add External Link</h3>
              <button 
                onClick={() => setLinkModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <span className="material-icons-round text-slate-400">close</span>
              </button>
            </div>
            
            <input
              type="url"
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 rounded-xl glass-input text-sm text-slate-200 placeholder:text-slate-600"
              onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
            />
            
            <div className="flex space-x-3">
              <button 
                onClick={() => setLinkModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl glass-panel hover:bg-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddLink}
                className="flex-1 py-2.5 rounded-xl luxury-button text-[#C5A059] text-xs font-bold uppercase tracking-widest"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Example Prompts Modal */}
      {examplePromptsOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setExamplePromptsOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-[#0F0E14] border border-white/10 rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center">
                <span className="material-icons-round text-[#C5A059] mr-2">lightbulb</span>
                Example Prompts
              </h3>
              <button 
                onClick={() => setExamplePromptsOpen(false)}
                className="p-1 hover:bg-white/5 rounded-lg transition-colors"
              >
                <span className="material-icons-round text-slate-400">close</span>
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mb-4">
              Click on any prompt to use it. Prompts marked with 📷 work best with uploaded images.
            </p>
            
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {EXAMPLE_PROMPTS.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setPrompt(item.text);
                    setExamplePromptsOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-[#C5A059]/10 border border-white/5 hover:border-[#C5A059]/30 transition-all group"
                >
                  <div className="flex items-start gap-2">
                    {item.hasImage && (
                      <span className="text-sm flex-shrink-0">📷</span>
                    )}
                    <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">
                      {item.text}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-[10px] text-slate-500 text-center">
                💡 Tip: Upload images for better design replication
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      {/* Chat History Drawer */}
      <ChatHistoryDrawer />
    </div>
  );
}

function App() {
  // Handle hash-based routing for preview page
  const [isPreviewRoute, setIsPreviewRoute] = useState(false);

  useEffect(() => {
    const checkRoute = () => {
      setIsPreviewRoute(window.location.hash === '#/preview');
    };
    
    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    return () => window.removeEventListener('hashchange', checkRoute);
  }, []);

  // If on preview route, show standalone preview page
  if (isPreviewRoute) {
    return <PreviewPage />;
  }

  return (
    <CodeProvider>
      <AppContent />
    </CodeProvider>
  );
}

export default App;
