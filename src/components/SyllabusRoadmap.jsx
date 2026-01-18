import { useState } from 'react';
import { useCode } from '../context/CodeContext';
import { BookOpen, Map, Clock, Lightbulb, Brain, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import GlobalLoader from './globalloader';

/**
 * SyllabusRoadmap Component
 * Allows users to paste their syllabus and get a structured learning roadmap
 * with topics, timeline, and viva preparation tips
 */
function SyllabusRoadmap() {
  const { 
    analyzeSyllabusContent, 
    aiResponse, 
    aiLoading, 
    aiError, 
    clearAIResponse 
  } = useCode();
  
  const [syllabusText, setSyllabusText] = useState('');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    if (!syllabusText.trim()) {
      alert('Please paste your syllabus content first');
      return;
    }

    clearAIResponse();
    setHasAnalyzed(true);
    await analyzeSyllabusContent(syllabusText);
  };

  const handleClear = () => {
    setSyllabusText('');
    clearAIResponse();
    setHasAnalyzed(false);
  };

  // Simple markdown parser for display
  const renderMarkdown = (text) => {
    if (!text) return null;
    
    // Split into lines and process
    const lines = text.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeContent = [];
    let codeLanguage = '';

    lines.forEach((line, idx) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${idx}`} className="bg-black/40 border border-[#C5A059]/10 rounded-xl p-4 overflow-x-auto my-4">
              <code className="text-slate-200 text-sm">{codeContent.join('\n')}</code>
            </pre>
          );
          codeContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeLanguage = line.slice(3);
        }
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(<h3 key={idx} className="text-lg font-display font-bold text-[#FFE0A3] mt-6 mb-3 flex items-center gap-2">{line.slice(4)}</h3>);
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={idx} className="text-xl font-display font-bold text-[#FFE0A3] mt-8 mb-4 flex items-center gap-2">{line.slice(3)}</h2>);
      } else if (line.startsWith('# ')) {
        elements.push(<h1 key={idx} className="text-2xl font-display font-bold gold-gradient-text mt-6 mb-4">{line.slice(2)}</h1>);
      } 
      // Bold text patterns
      else if (line.includes('**Viva') || line.toLowerCase().includes('viva tip')) {
        elements.push(
          <div key={idx} className="viva-tip-box px-4 py-3 mt-4 mb-2">
            <p className="text-sm text-slate-200" dangerouslySetInnerHTML={{ 
              __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#C5A059]">$1</strong>')
            }} />
          </div>
        );
      }
      // List items
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <li key={idx} className="text-slate-300 text-sm ml-4 mb-2 flex items-start gap-2">
            <ChevronRight size={14} className="text-[#C5A059] mt-1 shrink-0" />
            <span dangerouslySetInnerHTML={{ 
              __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#C5A059]">$1</strong>')
            }} />
          </li>
        );
      }
      else if (/^\d+\.\s/.test(line.trim())) {
        elements.push(
          <li key={idx} className="text-slate-300 text-sm ml-4 mb-2 list-decimal list-inside">
            <span dangerouslySetInnerHTML={{ 
              __html: line.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#C5A059]">$1</strong>')
            }} />
          </li>
        );
      }
      // Regular paragraphs
      else if (line.trim()) {
        elements.push(
          <p key={idx} className="text-slate-300 text-sm leading-relaxed mb-3" dangerouslySetInnerHTML={{ 
            __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#C5A059]">$1</strong>')
              .replace(/`([^`]+)`/g, '<code class="bg-black/40 px-1.5 py-0.5 rounded text-[#FFE0A3] text-xs">$1</code>')
          }} />
        );
      }
    });

    return elements;
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 flex items-center justify-center">
            <Map className="text-[#C5A059]" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-slate-100">Syllabus Roadmap</h2>
            <p className="text-xs text-slate-500">Paste your syllabus to generate a structured learning path</p>
          </div>
        </div>
        
        {hasAnalyzed && (
          <button 
            onClick={handleClear}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-[#C5A059] transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Input Section */}
        <div className="w-[45%] flex flex-col">
          <div className="product-card p-5 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} className="text-[#C5A059]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Paste Your Syllabus</h3>
            </div>
            
            <textarea
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              placeholder="Paste your syllabus content here...

Example:
Unit 1: Introduction to HTML
- Basic structure of HTML documents
- HTML tags and elements
- Forms and input elements

Unit 2: CSS Fundamentals
- Selectors and properties
- Box Model
- Flexbox and Grid layouts"
              className="flex-1 w-full bg-transparent border-none focus:ring-0 text-sm text-slate-200 placeholder:text-slate-600 resize-none leading-relaxed glass-input rounded-xl p-4"
            />
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
              <span className="text-xs text-slate-500">
                {syllabusText.length} characters
              </span>
              
              <button
                onClick={handleAnalyze}
                disabled={aiLoading || !syllabusText.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl luxury-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <Loader2 size={16} className="text-[#C5A059] animate-spin" />
                ) : (
                  <Sparkles size={16} className="text-[#C5A059]" />
                )}
                <span className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">
                  {aiLoading ? 'Analyzing...' : 'Generate Roadmap'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {aiError ? (
            <div className="feedback-card p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400">!</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-400">Error</h4>
                <p className="text-xs text-slate-400 mt-1">{aiError}</p>
              </div>
            </div>
          ) : aiLoading ? (
            <div className="feedback-card p-12 flex flex-col items-center justify-center">
              <GlobalLoader size={60} message="Analyzing your syllabus..." />
            </div>
          ) : aiResponse?.content ? (
            <div className="feedback-card p-6 flex-1 overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 flex items-center justify-center">
                  <Brain className="text-[#C5A059]" size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Professor's Feedback</h3>
                  <p className="text-xs text-slate-500">AI-generated learning roadmap</p>
                </div>
              </div>
              
              <div className="ai-response">
                {renderMarkdown(aiResponse.content)}
              </div>

              {/* Viva Tips Summary */}
              <div className="viva-tip-box p-4 mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={18} className="text-[#C5A059]" />
                  <h4 className="text-sm font-bold text-[#C5A059]">Viva Preparation Tips</h4>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <ChevronRight size={12} className="text-[#C5A059] mt-0.5" />
                    <span>Focus on understanding concepts, not just memorizing syntax</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight size={12} className="text-[#C5A059] mt-0.5" />
                    <span>Practice explaining code line-by-line to build confidence</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight size={12} className="text-[#C5A059] mt-0.5" />
                    <span>Review the roadmap topics and prepare for interconnected questions</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="feedback-card p-12 flex flex-col items-center justify-center text-center flex-1">
              <div className="w-16 h-16 rounded-2xl bg-[#C5A059]/10 flex items-center justify-center mb-4">
                <Clock className="text-[#C5A059]" size={28} />
              </div>
              <h3 className="text-lg font-display font-bold text-slate-200 mb-2">Ready to Analyze</h3>
              <p className="text-sm text-slate-400 max-w-md">
                Paste your syllabus in the text area and click "Generate Roadmap" to get a structured learning path with viva tips.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SyllabusRoadmap;
