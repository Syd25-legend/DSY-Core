import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useCode } from '../context/CodeContext';

// File icon helper
function getFileIcon(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  const iconMap = {
    'tsx': 'code',
    'ts': 'code',
    'jsx': 'code',
    'js': 'javascript',
    'html': 'html',
    'css': 'style',
    'json': 'data_object',
    'md': 'description',
  };
  return iconMap[extension] || 'description';
}

// File tree item component
function FileTreeItem({ item, level = 0, onFileClick, onFolderToggle, expandedFolders, activeFileId }) {
  const isFolder = item.type === 'folder';
  const isExpanded = expandedFolders.includes(item.id);
  const isActive = item.id === activeFileId;
  const paddingLeft = 12 + level * 16;

  const handleClick = () => {
    if (isFolder) {
      onFolderToggle(item.id);
    } else {
      onFileClick(item.id);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center py-1 px-2 cursor-pointer transition-colors text-[13px] ${
          isActive 
            ? 'bg-[#C5A059]/20 text-[#C5A059]' 
            : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
        }`}
        style={{ paddingLeft }}
      >
        {isFolder ? (
          <>
            <span className="material-icons-round text-sm mr-1.5 text-slate-500">
              {isExpanded ? 'folder_open' : 'folder'}
            </span>
            <span className="material-icons-round text-xs mr-1 text-slate-600">
              {isExpanded ? 'expand_more' : 'chevron_right'}
            </span>
          </>
        ) : (
          <span className="material-icons-round text-sm mr-1.5 text-[#C5A059]/60">
            {getFileIcon(item.name)}
          </span>
        )}
        <span className={`truncate ${isFolder ? 'font-medium' : ''}`}>
          {item.name}
        </span>
      </div>
      
      {isFolder && isExpanded && item.children && (
        <div>
          {item.children.map((child) => (
            <FileTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              onFileClick={onFileClick}
              onFolderToggle={onFolderToggle}
              expandedFolders={expandedFolders}
              activeFileId={activeFileId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// File tabs component
function FileTabs({ openFiles, activeFileId, onTabClick, onTabClose, findFileById, files }) {
  return (
    <div className="flex items-center h-9 bg-[#0A090F] border-b border-white/5 overflow-x-auto">
      {openFiles.map((fileId) => {
        const file = findFileById(files, fileId);
        if (!file) return null;
        
        const isActive = fileId === activeFileId;
        
        return (
          <div
            key={fileId}
            className={`flex items-center px-3 h-full border-r border-white/5 cursor-pointer group transition-colors ${
              isActive 
                ? 'bg-[#1A1625] text-slate-200 border-b-2 border-b-[#C5A059]' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
            onClick={() => onTabClick(fileId)}
          >
            <span className="material-icons-round text-xs mr-1.5 text-[#C5A059]/60">
              {getFileIcon(file.name)}
            </span>
            <span className="text-[12px] mr-2">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(fileId);
              }}
              className="w-4 h-4 flex items-center justify-center rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="material-icons-round text-xs">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function CodeEditor() {
  const {
    project,
    activeFileId,
    openFiles,
    expandedFolders,
    getActiveFile,
    getActiveFileContent,
    updateFileContent,
    openFile,
    closeFile,
    toggleFolder,
    findFileById,
  } = useCode();

  const [sidebarWidth, setSidebarWidth] = useState(200);

  const handleEditorChange = useCallback((value) => {
    if (activeFileId) {
      updateFileContent(activeFileId, value || '');
    }
  }, [activeFileId, updateFileContent]);

  const activeFile = getActiveFile();
  const activeContent = getActiveFileContent();

  // Get language for Monaco
  const getMonacoLanguage = (file) => {
    if (!file) return 'typescript';
    const langMap = {
      'typescript': 'typescript',
      'javascript': 'javascript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'markdown': 'markdown',
    };
    return langMap[file.language] || 'typescript';
  };

  return (
    <div className="w-full h-full flex rounded-xl overflow-hidden border border-[#C5A059]/10 bg-[#0A090F]">
      {/* File Explorer Sidebar */}
      <div 
        className="flex flex-col border-r border-white/5 bg-[#0d0c12]"
        style={{ width: sidebarWidth, minWidth: 150, maxWidth: 350 }}
      >
        {/* Sidebar Header */}
        <div className="h-9 flex items-center justify-between px-3 border-b border-white/5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            File Explorer
          </span>
          <div className="flex items-center space-x-1">
            <button className="p-1 hover:bg-white/5 rounded transition-colors" title="Search">
              <span className="material-icons-round text-sm text-slate-500">search</span>
            </button>
            <button className="p-1 hover:bg-white/5 rounded transition-colors" title="New File">
              <span className="material-icons-round text-sm text-slate-500">add</span>
            </button>
            <button className="p-1 hover:bg-white/5 rounded transition-colors" title="Collapse All">
              <span className="material-icons-round text-sm text-slate-500">close_fullscreen</span>
            </button>
          </div>
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto py-2">
          {project.files.map((item) => (
            <FileTreeItem
              key={item.id}
              item={item}
              level={0}
              onFileClick={openFile}
              onFolderToggle={toggleFolder}
              expandedFolders={expandedFolders}
              activeFileId={activeFileId}
            />
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* File Tabs */}
        <FileTabs
          openFiles={openFiles}
          activeFileId={activeFileId}
          onTabClick={openFile}
          onTabClose={closeFile}
          findFileById={findFileById}
          files={project.files}
        />

        {/* Monaco Editor */}
        <div className="flex-1 min-h-0">
          {activeFile ? (
            <Editor
              height="100%"
              language={getMonacoLanguage(activeFile)}
              value={activeContent}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                lineNumbers: 'on',
                lineNumbersMinChars: 4,
                wordWrap: 'off',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                padding: { top: 8, bottom: 8 },
                renderLineHighlight: 'all',
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                tabSize: 2,
                bracketPairColorization: { enabled: true },
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                },
                guides: {
                  indentation: true,
                  bracketPairs: true,
                },
                renderWhitespace: 'selection',
                folding: true,
                foldingHighlight: true,
                lineHeight: 20,
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <span className="material-icons-round text-4xl mb-2 text-[#C5A059]/30">code</span>
                <p className="text-sm">Select a file to edit</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
