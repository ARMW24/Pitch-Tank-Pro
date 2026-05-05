import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, LayoutDashboard, Settings2, Eye, 
  Share2, FileText, Cpu, Trash2, ImageIcon, Play, Plus, 
  Maximize, Undo2, Redo2, Layers, Youtube, Send, X, Upload,
  Mic, ShieldCheck, LogOut
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
  const isResizing = useRef(false);

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

  return (
    <div className="flex-1 flex flex-row bg-[#F4F4F1] overflow-hidden text-black font-sans relative z-10 w-full h-full">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} shrink-0 bg-white border-r-2 border-black transition-all duration-300 flex flex-col z-50 overflow-hidden relative`}>
         <div className="h-16 border-b-2 border-black flex items-center justify-between px-4 shrink-0 bg-[#F4F4F1]">
            {isSidebarOpen && <span className="font-serif font-black italic truncate pr-4">{project.name}</span>}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-black hover:text-white border-2 border-transparent focus:border-black rounded-none transition-colors">
              {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
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
            <button onClick={() => updateActiveSlide('showNarrative', !activeSlide?.showNarrative)} className="flex items-center justify-between px-5 py-3 hover:bg-gray-100 transition-colors w-full group overflow-hidden">
              <div className="flex items-center gap-4">
                <FileText size={18} className="shrink-0 group-hover:scale-110 transition-transform" />
                {isSidebarOpen && <span className="text-[10px] font-mono font-bold uppercase tracking-widest leading-none mt-1">Narrative Log</span>}
              </div>
              {isSidebarOpen && (
                <div className={`w-8 h-4 border-2 border-black flex items-center p-0.5 transition-colors shrink-0 ${activeSlide?.showNarrative ? 'bg-black' : 'bg-white'}`}>
                  <div className={`w-2 h-2 bg-white border border-black transition-transform ${activeSlide?.showNarrative ? 'translate-x-[12px] border-white bg-white' : 'translate-x-0 bg-black'}`}></div>
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

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AnimatePresence>
          {isEditorOpen && (
            <FloatingEditor 
               slide={activeSlide as any} 
               isOpen={isEditorOpen} 
               onClose={() => setIsEditorOpen(false)} 
               onUpdate={updateActiveSlide} 
               userId={user?.id}
               onPrevSlide={() => {
                 const idx = slides.findIndex(s => s.id === activeSlide?.id);
                 if (idx > 0) setActiveSid(slides[idx - 1].id);
               }}
               onNextSlide={() => {
                 const idx = slides.findIndex(s => s.id === activeSlide?.id);
                 if (idx >= 0 && idx < slides.length - 1) setActiveSid(slides[idx + 1].id);
               }}
               canPrev={(slides.findIndex(s => s.id === activeSlide?.id) ?? -1) > 0}
               canNext={(slides.findIndex(s => s.id === activeSlide?.id) ?? -1) < (slides.length ?? 0) - 1}
               captureHistory={captureHistory}
            />
          )}
        </AnimatePresence>

        {/* Main Preview Area */}
        <div className={`flex-1 flex flex-col overflow-hidden justify-center relative z-10 w-full h-full min-h-[0] ${isFrameless ? '' : 'p-4 lg:p-8'}`}>
           <div className={`w-full flex-1 min-h-[0] ${isFrameless ? 'bg-gray-50' : 'bg-white border-2 border-black shadow-[8px_8px_0_0_#000]'} overflow-hidden relative flex flex-col group`}>
              {!isFrameless && (
                <div className="h-8 border-b-2 border-black bg-[#F4F4F1] flex items-center px-4 justify-between shrink-0">
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 border border-black rounded-full bg-white"></div>
                    <div className="w-2.5 h-2.5 border border-black rounded-full bg-white"></div>
                    <div className="w-2.5 h-2.5 border border-black rounded-full bg-white"></div>
                  </div>
                  <button onClick={() => setFitToFrame(!fitToFrame)} className="text-[9px] font-mono uppercase font-bold text-gray-500 hover:text-black">
                    {fitToFrame ? 'Original Size' : 'Fit to Frame'}
                  </button>
                </div>
              )}
              
              <div className="flex-1 w-full h-full overflow-hidden relative bg-black flex items-center justify-center min-h-0">
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
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-gray-700">
                        <Layers size={48} className="opacity-20" />
                        <p className="font-mono text-[10px] uppercase tracking-widest opacity-40">No Image Data</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                
                {/* Visual Indicators for Markers */}
                {[1, 2, 3].map(num => {
                  const yt = activeSlide[`youtubeMarker${num}`];
                  const gal = activeSlide[`galleryMarker${num}`];
                  const note = activeSlide[`noteMarker${num}`];
                  const doc = activeSlide[`docMarker${num}`];
                  return (
                    <React.Fragment key={num}>
                      {yt && <div className="absolute z-30 pointer-events-none" style={{ left: `${yt.x}%`, top: `${yt.y}%` }}><div className="bg-red-600 w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 shadow-lg"></div></div>}
                      {gal && <div className="absolute z-30 pointer-events-none" style={{ left: `${gal.x}%`, top: `${gal.y}%` }}><div className="bg-blue-600 w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 shadow-lg"></div></div>}
                      {note && <div className="absolute z-30 pointer-events-none" style={{ left: `${note.x}%`, top: `${note.y}%` }}><div className="bg-yellow-400 w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 shadow-lg"></div></div>}
                      {doc && <div className="absolute z-30 pointer-events-none" style={{ left: `${doc.x}%`, top: `${doc.y}%` }}><div className="bg-purple-500 w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 shadow-lg"></div></div>}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Controls Overlay */}
              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-40 pointer-events-none">
                 <div className="flex gap-4 pointer-events-auto">
                    <button onClick={() => setIsFrameless(!isFrameless)} className="bg-black text-white p-3 rounded-full hover:scale-110 transition-transform shadow-lg border-2 border-white/20">
                       <Maximize size={20} />
                    </button>
                    <div className="bg-white border-2 border-black flex items-center p-1 shadow-lg">
                       <button onClick={handleUndo} className="p-2 hover:bg-black hover:text-white transition-colors border-r border-black/10"><Undo2 size={16}/></button>
                       <button onClick={handleRedo} className="p-2 hover:bg-black hover:text-white transition-colors"><Redo2 size={16}/></button>
                    </div>
                 </div>
                 
                 <div className="flex flex-col items-end gap-4 pointer-events-auto">
                    {activeSlide.audioUrl && (
                       <div className="bg-white border-2 border-black p-3 shadow-lg flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="font-mono text-[9px] font-black uppercase tracking-widest">Audio Narrative Linked</span>
                          <button onClick={() => updateActiveSlide('audioUrl', null)} className="text-red-500 hover:bg-red-50 p-1"><X size={14}/></button>
                       </div>
                    )}
                    <div className="flex gap-2">
                       <button 
                         onMouseDown={handleStartRecording} 
                         onMouseUp={handleStopRecording}
                         className={`flex items-center gap-3 px-6 py-3 border-2 border-black font-mono font-bold text-[10px] uppercase tracking-widest transition-all ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-black hover:bg-black hover:text-white shadow-lg'}`}
                       >
                         <Mic size={16} /> {isRecording ? 'Recording...' : 'Hold to Record Narrative'}
                       </button>
                       <button onClick={() => audioInputRef.current?.click()} className="bg-white text-black p-3 border-2 border-black hover:bg-black hover:text-white transition-all shadow-lg">
                          <Upload size={16} />
                       </button>
                       <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={handleAudioUpload} />
                    </div>
                 </div>
              </div>
              {activeSlide.showNarrative && activeSlide.content && (
                <div className="h-24 bg-black/90 border-t-2 border-black p-4 flex items-center justify-center text-center">
                   <p className="text-white font-mono text-xs uppercase tracking-widest leading-relaxed max-w-2xl">{activeSlide.content}</p>
                </div>
              )}
           </div>
        </div>

        {/* Timeline Area */}
        <div 
          style={{ height: timelineHeight }}
          className="bg-white border-t-2 border-black shrink-0 relative flex flex-col z-[60]"
        >
           <div 
             onMouseDown={() => { isResizing.current = true; }}
             className="absolute -top-1.5 left-0 right-0 h-3 cursor-row-resize z-50 flex items-center justify-center"
           >
              <div className="w-12 h-1 bg-black/10 rounded-full group-hover:bg-black/30 transition-colors"></div>
           </div>
           
           <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar-horizontal flex items-center px-8 gap-4 bg-[#F4F4F1]">
              <label className="shrink-0 flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-black/20 hover:border-black hover:bg-white cursor-pointer transition-all gap-2 group">
                 <div className="bg-black text-white p-2 group-hover:scale-110 transition-transform"><Plus size={16}/></div>
                 <span className="text-[8px] font-mono font-bold uppercase tracking-widest">Add Flow</span>
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
