import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Copy, Trash2, LayoutDashboard, Target, LogOut, Search, Shield, Zap,
  Mic, ShieldCheck, ChevronUp, ChevronDown, 
  ChevronLeft, ChevronRight, Upload, Play, MoreVertical,
  Settings2, Eye, Share2, FileText, Cpu, ImageIcon, Maximize, Undo2, Redo2, Layers, Youtube, Send, X
} from 'lucide-react';
import { Project } from '../../hooks/useProjects';
import { FloatingEditor } from './FloatingEditor';
import * as pdfjsLib from 'pdfjs-dist';

interface EditorViewProps {
  project: Project;
  activeSid: string | number | null;
  setActiveSid: (id: string | number) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  setView: (view: string) => void;
  setModal: (modal: { type: string | null, data?: any }) => void;
  updateActiveSlide: (field: string, val: any) => void;
  deleteSlide: (id: number) => void;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (idx: number) => void;
  captureHistory: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  user: any;
  isRecording: boolean;
  handleStartRecording: () => void;
  handleStopRecording: () => void;
  handleAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  audioInputRef: React.RefObject<HTMLInputElement>;
  onLogout: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  project,
  activeSid,
  setActiveSid,
  isSidebarOpen,
  setIsSidebarOpen,
  setView,
  setModal,
  updateActiveSlide,
  deleteSlide,
  onDragStart,
  onDragOver,
  onDrop,
  captureHistory,
  handleUndo,
  handleRedo,
  handleFileUpload,
  user,
  isRecording,
  handleStartRecording,
  handleStopRecording,
  handleAudioUpload,
  audioInputRef,
  onLogout
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(140);
  const [isFrameless, setIsFrameless] = useState(false);
  const [fitToFrame, setFitToFrame] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [activeGallery, setActiveGallery] = useState<{ images: string[], index: number } | null>(null);
  const [activeNote, setActiveNote] = useState<{ text: string, title: string } | null>(null);
  const [activeDoc, setActiveDoc] = useState<{ url: string, name: string } | null>(null);
  const [globalShowNarrative, setGlobalShowNarrative] = useState(true);
  const [isRecordingState, setIsRecordingState] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isResizing = useRef(false);
  const narrativeRef = useRef<HTMLTextAreaElement>(null);

  const autoResizeNarrative = () => {
    if (narrativeRef.current) {
      narrativeRef.current.style.height = 'auto';
      narrativeRef.current.style.height = narrativeRef.current.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    autoResizeNarrative();
    window.addEventListener('resize', autoResizeNarrative);
    return () => window.removeEventListener('resize', autoResizeNarrative);
  }, [activeSid, globalShowNarrative, fitToFrame]);

  const toggleRecording = async () => {
    if (isRecordingState) {
      mediaRecorderRef.current?.stop();
      setIsRecordingState(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const tempUrl = URL.createObjectURL(audioBlob);
          updateActiveSlide('audioUrl', tempUrl);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecordingState(true);
      } catch (err) {
        console.error("Microphone access error", err);
        alert("Cannot access microphone.");
      }
    }
  };

  const localHandleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tempUrl = URL.createObjectURL(file);
    updateActiveSlide('audioUrl', tempUrl);
  };

  const slides = project.slides || [];
  const activeSlide = slides.find((s: any) => s.id === (activeSid || slides[0]?.id)) || slides[0] || { title: 'Untitled', content: '', id: 'empty' };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 60 && newHeight <= window.innerHeight * 0.8) {
        setTimelineHeight(newHeight);
      }
    };
    const handleMouseUp = () => {
      isResizing.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const activeSlideIdx = project.slides.findIndex((s: any) => s.id === activeSlide?.id);
  const canPrev = activeSlideIdx > 0;
  const canNext = activeSlideIdx >= 0 && activeSlideIdx < project.slides.length - 1;
  const onPrevSlide = () => { if (canPrev) { setActiveSid(project.slides[activeSlideIdx - 1].id); captureHistory(); } };
  const onNextSlide = () => { if (canNext) { setActiveSid(project.slides[activeSlideIdx + 1].id); captureHistory(); } };

  return (
    <div className="h-full flex relative overflow-hidden group/sidebar bg-[#F4F4F1]">
      {/* Sidebar - Re-added magnet hover handling */}
      <div className={`shrink-0 z-[100] h-full bg-[#F4F4F1] border-r-2 border-black relative transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-0'}`}>
        {/* Magnet Handle */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute top-1/2 -translate-y-1/2 -right-4 w-8 h-16 bg-white border-2 border-black/10 shadow-sm flex items-center justify-center cursor-pointer z-[60] hover:bg-black hover:text-white transition-all opacity-0 group-hover/sidebar:opacity-100 ${!isSidebarOpen && 'opacity-100 -right-8'}`}
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className={`flex flex-col h-full ${!isSidebarOpen && 'invisible opacity-0'} transition-all duration-300`}>
          <div className="p-6 border-b border-black/5">
             <h2 className="text-xl font-serif font-black italic uppercase tracking-tighter flex items-center gap-2">
                <Target size={24} className="text-black" />
                <span>Pitch Room</span>
             </h2>
          </div>
         <div className="flex-1 py-6 flex flex-col gap-2">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-100 transition-colors w-full text-left group">
              <LayoutDashboard size={18} className="shrink-0 group-hover:scale-110 transition-transform" />
              {isSidebarOpen && <span className="text-[10px] font-mono font-bold uppercase tracking-widest leading-none mt-1">Back to Rooms</span>}
            </button>
            <div className="w-full h-[2px] bg-black/10 my-2"></div>
            <button onClick={() => setIsEditorOpen(!isEditorOpen)} className={`flex items-center gap-4 px-5 py-3 transition-colors w-full text-left group ${isEditorOpen ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>
              <Settings2 size={18} className={`shrink-0 ${!isEditorOpen && 'group-hover:rotate-45'} transition-all`} />
              {isSidebarOpen && <span className="text-[10px] font-mono font-bold uppercase tracking-widest leading-none mt-1">Edit</span>}
            </button>
            <button onClick={() => setView('preview')} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-100 transition-colors w-full text-left group">
              <Eye size={18} className="shrink-0 group-hover:scale-110 transition-transform" />
              {isSidebarOpen && <span className="text-[10px] font-mono font-bold uppercase tracking-widest leading-none mt-1">Preview Play</span>}
            </button>
            <div className="w-full h-[2px] bg-black/10 my-2"></div>
            <button onClick={() => setModal({ type: 'share' })} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-100 transition-colors w-full text-left group">
              <Share2 size={18} className="shrink-0 group-hover:scale-110 transition-transform" />
              {isSidebarOpen && <span className="text-[10px] font-mono font-bold uppercase tracking-widest leading-none mt-1">Share Pitch Room</span>}
            </button>
            <button onClick={() => setGlobalShowNarrative(!globalShowNarrative)} className="flex items-center justify-between px-5 py-3 hover:bg-gray-100 transition-colors w-full group overflow-hidden">
              <div className="flex items-center gap-4">
                <FileText size={18} className="shrink-0 group-hover:scale-110 transition-transform" />
                {isSidebarOpen && <span className="text-[10px] font-mono font-bold uppercase tracking-widest leading-none mt-1">Narrative Log</span>}
              </div>
              {isSidebarOpen && (
                <div className={`w-8 h-4 border-2 border-black flex items-center p-0.5 transition-colors shrink-0 ${globalShowNarrative ? 'bg-black' : 'bg-white'}`}>
                  <div className={`w-2 h-2 bg-white border border-black transition-transform ${globalShowNarrative ? 'translate-x-[12px] border-white bg-white' : 'translate-x-0 bg-black'}`}></div>
                </div>
              )}
            </button>
            <button onClick={() => setModal({ type: 'aiKnowledge' })} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-100 transition-colors w-full text-left group">
              <Cpu size={18} className="shrink-0 group-hover:scale-110 transition-transform" />
              {isSidebarOpen && <span className="text-[10px] font-mono font-bold uppercase tracking-widest leading-none mt-1">AI Knowledge</span>}
            </button>
            <div className="mt-auto border-t-2 border-black pt-4">
               <button onClick={onLogout} className="flex items-center gap-4 px-5 py-3 text-red-500 hover:bg-red-500 hover:text-white transition-all w-full text-left group">
                  <LogOut size={18} className="shrink-0" />
                  {isSidebarOpen && <span className="text-[10px] font-mono font-bold uppercase tracking-widest leading-none mt-1">Logout</span>}
               </button>
             </div>
          </div>
       </div>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AnimatePresence>
          {isEditorOpen && (
            <FloatingEditor 
               slide={activeSlide as any} 
               isOpen={isEditorOpen} 
               onClose={() => setIsEditorOpen(false)} 
               onUpdate={updateActiveSlide} 
               userId={user?.id}
               captureHistory={captureHistory}
               onPrevSlide={onPrevSlide}
               onNextSlide={onNextSlide}
               canPrev={canPrev}
               canNext={canNext}
            />
          )}
        </AnimatePresence>

        {/* Main Preview Area */}
        <div className={`flex-1 flex flex-col overflow-hidden relative z-10 w-full min-h-[0] ${isFrameless ? '' : 'p-4 lg:p-8'}`}>
           <div className={`w-full flex-1 min-h-[0] ${isFrameless ? 'bg-gray-50' : 'bg-white border-2 border-black shadow-[12px_12px_0_0_#000]'} overflow-hidden relative flex flex-col group`}>
              {!isFrameless && (
                <div className="h-10 border-b-2 border-black bg-[#F4F4F1] flex items-center px-4 justify-between shrink-0">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 border-2 border-black rounded-full bg-white"></div>
                    <div className="w-3 h-3 border-2 border-black rounded-full bg-white"></div>
                    <div className="w-3 h-3 border-2 border-black rounded-full bg-white"></div>
                  </div>
                  <div className="flex items-center">
                     {activeSlide.audioUrl && (
                        <div className="flex items-center gap-2 mr-4 border-r-2 border-black pr-4 h-full">
                           <audio controls src={activeSlide.audioUrl} className="max-w-[200px]" />
                           <button onClick={() => updateActiveSlide('audioUrl', null)} className="text-red-500 hover:scale-110 ml-2"><X size={12}/></button>
                        </div>
                     )}
                     <div className="flex items-center gap-2 mr-4 border-r-2 border-black pr-4 h-full">
                        <button 
                          onClick={toggleRecording}
                          className={`flex items-center gap-2 px-3 py-1.5 border-2 border-black font-mono font-bold text-[9px] uppercase tracking-widest transition-all ${isRecordingState ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-black hover:bg-black hover:text-white'}`}
                        >
                          <Mic size={14} /> {isRecordingState ? 'REC...' : 'REC'}
                        </button>
                        <button onClick={() => audioInputRef.current?.click()} className="bg-white text-black p-1.5 border-2 border-black hover:bg-black hover:text-white transition-all">
                           <Upload size={14} />
                        </button>
                        <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={localHandleAudioUpload} />
                     </div>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setFitToFrame(!fitToFrame)} className="text-[10px] font-mono uppercase font-black text-black/40 hover:text-black transition-colors">
                        {fitToFrame ? 'ORIGINAL SIZE' : 'FIT TO FRAME'}
                      </button>
                      <button onClick={() => setIsFrameless(!isFrameless)} className="text-[10px] font-mono uppercase font-black text-black/40 hover:text-black transition-colors mr-4">
                        {isFrameless ? 'SHOW FRAME' : 'HIDE FRAME'}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 border-l-2 border-black pl-4 h-full">
                       <button onClick={onPrevSlide} disabled={!canPrev} className="p-1 hover:bg-black hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black transition-colors rounded-sm"><ChevronLeft size={16}/></button>
                       <button onClick={onNextSlide} disabled={!canNext} className="p-1 hover:bg-black hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black transition-colors rounded-sm"><ChevronRight size={16}/></button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex-1 w-full h-full overflow-hidden relative bg-[#F4F4F1] flex items-center justify-center min-h-0">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={activeSlide.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full flex items-center justify-center relative"
                  >
                    {activeSlide.imageUrl ? (
                      <img 
                        src={activeSlide.imageUrl} 
                        className={`max-w-full max-h-full transition-all ${fitToFrame ? 'object-contain w-full h-full' : 'object-none'}`} 
                        alt={activeSlide.title} 
                      />
                    ) : activeSlide.isFixed ? (
                      <div className={`w-full h-full flex flex-col items-center justify-center text-center relative z-10 px-12 bg-white text-black`}>
                        <h1 className="text-[6vw] font-serif font-black uppercase mb-6 tracking-tighter italic leading-none">{activeSlide.title}</h1>
                        <div className={`w-24 h-1 mb-8 mx-auto bg-black`}></div>
                        <textarea 
                           className={`text-2xl font-mono leading-relaxed max-w-4xl w-full h-[60vh] text-center bg-transparent resize-none focus:outline-none custom-scrollbar-vertical text-gray-600`} 
                           value={activeSlide.content || ''}
                           readOnly={activeSlide.id === 'vc-feedback'}
                           placeholder={activeSlide.id === 'vc-feedback' ? "VCs will type their feedback in the Preview room." : "Type your notes here..."}
                           onChange={(e) => updateActiveSlide('content', e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-black/20">
                        <Layers size={48} />
                        <p className="font-mono text-[10px] uppercase tracking-widest">No Slide Media</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                
                {/* Floating Actions */}
                <div className="absolute top-6 right-6 flex flex-col gap-3 z-40">
                    {isFrameless && (
                       <button onClick={() => setIsFrameless(false)} className="bg-white border-2 border-black px-4 py-2 font-mono text-[10px] uppercase font-black hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0_0_#000]">
                         Show Frame
                       </button>
                    )}
                    <div className="bg-white border-2 border-black flex items-center p-1 shadow-[4px_4px_0_0_#000]">
                       <button onClick={handleUndo} className="p-2 hover:bg-black hover:text-white transition-colors border-r-2 border-black"><Undo2 size={16}/></button>
                       <button onClick={handleRedo} className="p-2 hover:bg-black hover:text-white transition-colors"><Redo2 size={16}/></button>
                    </div>
                </div>

                <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 z-40">
                   <div className="flex gap-2 pointer-events-auto">
                   </div>
                </div>
              </div>

              {/* Dedicated Narrative Bar - Editable and Same Size as Preview Subtitles */}
              {globalShowNarrative && !activeSlide.isFixed && (
                <div className="bg-black border-t-2 border-black flex flex-col items-center justify-center px-12 shrink-0 relative py-4">
                   <textarea 
                      ref={narrativeRef}
                      className="w-full max-w-4xl bg-transparent text-white font-serif italic text-sm md:text-lg leading-relaxed text-center resize-none focus:outline-none overflow-hidden placeholder:text-white/40"
                      value={activeSlide.content || ''}
                      onChange={(e) => {
                        autoResizeNarrative();
                        updateActiveSlide('content', e.target.value);
                      }}
                      placeholder="Type narrative subtitles here..."
                      style={{ minHeight: '64px' }}
                   />
                </div>
              )}
           </div>
        </div>

        {/* Timeline Area */}
        <div 
          style={{ height: timelineHeight, minHeight: timelineHeight, flexShrink: 0 }}
          className="bg-white border-t-2 border-black relative flex flex-col z-[60] w-full"
        >
           <div 
             onMouseDown={() => { isResizing.current = true; }}
             className="absolute -top-1.5 left-0 right-0 h-3 cursor-row-resize z-50 flex items-center justify-center"
           >
              <div className="w-12 h-1 bg-black/10 rounded-full group-hover:bg-black/30 transition-colors"></div>
           </div>
           
           <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar-horizontal flex items-center px-8 gap-4 bg-[#F4F4F1]">
            <label className="shrink-0 flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-black/20 hover:border-black hover:bg-white cursor-pointer transition-all gap-2 group bg-white shadow-[4px_4px_0_0_rgba(0,0,0,0.05)] hover:shadow-[4px_4px_0_0_#000]">
                 <div className="bg-black text-white p-2 group-hover:scale-110 transition-transform"><Plus size={16}/></div>
                 <span className="text-[8px] font-mono font-bold uppercase tracking-widest">Add Media</span>
                 <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
              </label>

              {slides.map((s: any, idx: number) => (
                <div 
                  key={s.id}
                  draggable={!s.isFixed}
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(idx)}
                  onClick={() => setActiveSid(s.id)}
                  className={`shrink-0 w-32 h-24 border-2 relative transition-all cursor-pointer group ${activeSid === s.id ? 'border-black shadow-[4px_4px_0_0_#000] z-20 scale-105' : 'border-black/20 hover:border-black/50 hover:bg-white'}`}
                >
                   {s.imageUrl ? (
                     <img src={s.imageUrl} className="w-full h-full object-cover" alt={s.title} />
                   ) : (
                     <div className="w-full h-full bg-gray-100 flex items-center justify-center"><Layers size={20} className="opacity-10" /></div>
                   )}
                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                   <div className="absolute bottom-0 left-0 right-0 p-2 bg-white/90 backdrop-blur-sm border-t border-black/10">
                      <p className="text-[8px] font-mono font-bold uppercase tracking-tighter truncate">{s.title}</p>
                   </div>
                   {!s.isFixed && (
                     <button 
                       onClick={(e) => { e.stopPropagation(); deleteSlide(s.id); }}
                       className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full border border-black opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                     >
                       <X size={10} />
                     </button>
                   )}
                   {s.isFixed && (
                      <div className="absolute top-1 left-1"><ShieldCheck size={10} className="text-black/30" /></div>
                   )}
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};
