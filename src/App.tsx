import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, FileText, ChevronRight, ChevronLeft, 
  X, Send, Plus, LayoutDashboard, Eye, Share2, Lock, Download,
  Trash2, ImageIcon, FileSearch, MonitorPlay, Youtube, Zap, 
  Copy, Settings2, MoveHorizontal, Cpu, Terminal, Headset, Mic, Undo2, Redo2,
  Upload, Play, Square, Maximize, Pause, RotateCcw, Check, ShieldCheck
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-expect-error - Vite specific import
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { auth, db, googleProvider, handleFirestoreError, OperationType, uploadFileToStorage } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';
import { getGeminiChatResponse } from './services/geminiService';

// Use local worker from node_modules for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const appendFixedSlides = (slides: any[] = []) => {
  const safeSlides = Array.isArray(slides) ? slides : [];
  let newSlides = [...safeSlides];
  if (!newSlides.find(s => s.id === 'founder-note')) {
    newSlides.push({ id: 'founder-note', title: "Founder Note", content: "Founder's internal notes...", imageUrl: null, showNarrative: true, appendix: {}, isFixed: true });
  }
  if (!newSlides.find(s => s.id === 'vc-feedback')) {
    newSlides.push({ id: 'vc-feedback', title: "Angel/VC Feedback", content: "VCs can leave feedback here...", imageUrl: null, showNarrative: true, appendix: {}, isFixed: true });
  }
  return newSlides;
};

const INITIAL_PROJECTS: any[] = [];

const getSafeProject = (p: any) => {
  if (!p) return null;
  return {
     ...p,
     slides: Array.isArray(p.slides) ? p.slides : []
  };
};

const generateSecurePin = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#*&!';
  return Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Delete" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-[#F4F4F1]/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4 border-2 border-black">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-black p-10 max-w-sm w-full shadow-[8px_8px_0_0_#000] text-center rounded-none flex flex-col items-center">
        <div className="w-20 h-20 bg-white border-2 border-black flex items-center justify-center mb-8 rounded-full">
           {confirmText === 'Delete' ? <Trash2 size={40} className="text-black" /> : <Copy size={40} className="text-black" />}
        </div>
        <h3 className="text-2xl font-serif font-black text-black mb-2 italic uppercase">{title}</h3>
        <p className="text-gray-700 text-sm mb-10 leading-relaxed font-mono">{message}</p>
        <div className="flex gap-4 w-full">
          <button onClick={onCancel} className="flex-1 py-4 bg-white border-2 border-black text-black font-bold font-mono text-[10px] uppercase hover:bg-black hover:text-white transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-4 bg-black border-2 border-black text-white font-bold font-mono text-[10px] uppercase hover:bg-white hover:text-black transition-all">{confirmText}</button>
        </div>
      </motion.div>
    </div>
  );
};

const AIKnowledgeModal = ({ isOpen, project, onCancel, onSave }) => {
  const [files, setFiles] = useState<any[]>(project?.aiKnowledgeFiles || []);
  const [isAddingText, setIsAddingText] = useState(false);
  const [customText, setCustomText] = useState('');
  const [textTitle, setTextTitle] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = Array.from(e.target.files || []) as File[];
    if (!uploaded.length) return;
    
    const parsedFiles = await Promise.all(uploaded.map(async f => {
        let content = "File uploaded but content unparsed.";
        if (f.type.includes('text') || f.name.endsWith('.txt')) {
             content = await f.text();
        }
        return {
          name: f.name,
          type: f.type,
          size: f.size,
          content
        };
    }));
    
    setFiles(prev => [...prev, ...parsedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  const handleAddCustomText = () => {
    if (!customText.trim()) return;
    setFiles([...files, {
      name: textTitle.trim() || `Custom Note ${files.length + 1}`,
      type: 'text/plain',
      size: customText.length,
      content: customText
    }]);
    setCustomText('');
    setTextTitle('');
    setIsAddingText(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#F4F4F1] border-2 border-black p-8 max-w-xl w-full shadow-[8px_8px_0_0_#000] rounded-none flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
           <h3 className="font-serif font-black italic text-2xl uppercase tracking-tighter text-black flex items-center gap-3"><Cpu size={24}/> AI Knowledge Base</h3>
           <button onClick={onCancel} className="p-2 hover:bg-black hover:text-white border-2 border-transparent transition-colors"><X size={20}/></button>
        </div>
        
        {isAddingText ? (
          <div className="flex-1 flex flex-col min-h-[300px]">
             <input value={textTitle} onChange={e => setTextTitle(e.target.value)} placeholder="Note Title (Optional)" className="mb-4 bg-white border-2 border-black p-3 font-mono text-sm placeholder:text-gray-400 focus:outline-none" />
             <textarea value={customText} onChange={e => setCustomText(e.target.value)} placeholder="Type custom knowledge or context here..." className="flex-1 bg-white border-2 border-black p-4 font-mono text-sm resize-none focus:outline-none custom-scrollbar-vertical mb-4" />
             <div className="flex gap-4">
                <button onClick={() => setIsAddingText(false)} className="flex-1 bg-white border-2 border-black p-3 font-mono font-bold text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors">Cancel</button>
                <button onClick={handleAddCustomText} className="flex-1 bg-black text-white border-2 border-black p-3 font-mono font-bold text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-colors">Save Text</button>
             </div>
          </div>
        ) : (
          <>
            <p className="text-xs font-mono text-gray-600 mb-6 leading-relaxed">
              Upload text, PDF, or DOC files, or type notes directly. The Founder Clone will use this data to answer investor queries in the Preview Room.
            </p>

            <div className="flex-1 overflow-y-auto mb-6 bg-white border-2 border-black p-4 space-y-3 min-h-[160px]">
              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                   <ShieldCheck size={32} className="mb-2 opacity-50" />
                   <span className="font-mono text-[10px] uppercase font-bold tracking-widest">No Knowledge Base</span>
                </div>
              ) : (
                files.map((file, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border-2 border-black bg-[#F4F4F1]">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <FileText size={16} className="shrink-0" />
                        <span className="font-mono text-xs font-bold truncate">{file.name}</span>
                        <span className="font-mono text-[9px] text-gray-500 shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                     </div>
                     <button onClick={() => removeFile(i)} className="text-red-600 hover:text-red-800 shrink-0"><Trash2 size={14}/></button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0 flex-wrap sm:flex-nowrap">
              <label className="flex-1 cursor-pointer bg-white border-2 border-black text-black px-4 py-3 font-mono font-bold text-[10px] uppercase tracking-widest text-center shadow-[4px_4px_0_0_#000] hover:bg-black hover:text-white transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] whitespace-nowrap">
                 <input type="file" multiple accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileUpload} />
                 Import Files
              </label>
              <button 
                onClick={() => setIsAddingText(true)} 
                className="flex-1 cursor-pointer bg-white border-2 border-black text-black px-4 py-3 font-mono font-bold text-[10px] uppercase tracking-widest text-center shadow-[4px_4px_0_0_#000] hover:bg-black hover:text-white transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] whitespace-nowrap"
              >
                 Add Text
              </button>
              <button 
                onClick={() => { onSave(files); onCancel(); }} 
                className="w-full sm:w-auto flex-1 bg-black border-2 border-black text-white px-8 py-3 font-mono font-bold text-[10px] uppercase tracking-widest text-center shadow-[4px_4px_0_0_#000] hover:bg-white hover:text-black transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000]"
              >
                 Done
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

const ShareModal = ({ isOpen, project, onCancel }: any) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen || !project) return null;
  const url = window.location.origin + window.location.pathname + '?room=' + project.id;
  
  return (
    <div className="fixed inset-0 bg-[#F4F4F1]/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-black p-10 max-w-sm w-full shadow-[8px_8px_0_0_#000] rounded-none flex flex-col">
        <h3 className="text-2xl font-serif font-black text-black mb-6 italic uppercase">Share Room</h3>
        
        <div className="space-y-6">
           <div>
             <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-2 block">Direct Link</label>
             <div className="flex items-center gap-2">
                <input value={url} readOnly className="flex-1 bg-gray-50 border border-gray-300 p-2 text-xs font-mono outline-none" />
                <button onClick={() => { navigator.clipboard.writeText(url); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }} className="p-2 bg-black text-white hover:bg-gray-800 transition-colors shrink-0">
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                </button>
             </div>
           </div>
           
           <div>
             <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-2 block">Access Code (For Homepage)</label>
             <div className="flex items-center gap-2">
                <input value={project.pinCode} readOnly className="flex-1 bg-gray-50 border border-gray-300 p-2 text-sm font-mono font-bold outline-none uppercase tracking-widest" />
                <button onClick={() => { navigator.clipboard.writeText(project.pinCode); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }} className="p-2 bg-black text-white hover:bg-gray-800 transition-colors shrink-0">
                  {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                </button>
             </div>
           </div>
        </div>
        
        <button onClick={onCancel} className="mt-8 font-mono font-bold text-xs uppercase tracking-widest py-3 border-2 border-black hover:bg-black hover:text-white transition-colors">Done</button>
      </motion.div>
    </div>
  );
};

const NewProjectModal = ({ isOpen, onConfirm, onCancel }) => {
  const [name, setName] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-[#F4F4F1]/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-black p-12 max-w-md w-full shadow-[8px_8px_0_0_#000] rounded-none">
        <h3 className="text-3xl font-serif font-black text-black mb-8 italic">CREATE ROOM</h3>
        <div className="space-y-3 mb-10">
          <label className="text-[10px] font-mono font-bold uppercase tracking-widest">Room Name</label>
          <input 
            autoFocus
            className="w-full bg-white border-2 border-black px-6 py-4 text-sm font-mono focus:outline-none focus:bg-gray-50 transition-all text-black rounded-none"
            placeholder="e.g. Project Neon"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <button onClick={onCancel} className="flex-1 py-4 bg-white border-2 border-black text-black font-bold font-mono text-[10px] uppercase hover:bg-black hover:text-white transition-colors">Cancel</button>
          <button 
            disabled={!name.trim()}
            onClick={() => { onConfirm(name); setName(''); }} 
            className="flex-1 py-4 bg-black border-2 border-black text-white font-bold font-mono text-[10px] uppercase disabled:opacity-50 hover:bg-white hover:text-black transition-colors"
          >
            Create
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const FloatingEditor = ({ slide, isOpen, onClose, onUpdate, captureHistory, onPrevSlide, onNextSlide, canPrev, canNext }: any) => {
  const [pos, setPos] = useState({ x: window.innerWidth - 440, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState('general');

  if (!isOpen || !slide) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    }
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
    };
    const handleUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, pos.x, pos.y]);

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>, num: number) => {
    e.preventDefault();
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;
    
    // Only max 10 images total
    const existing = slide[`galleryMarker${num}`]?.images || [];
    if (existing.length + files.length > 10) {
       alert("Max 10 images per gallery limit.");
       return;
    }
    
    const newImages = [...existing];
    for(const file of files) {
       if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} is larger than 10MB.`);
          continue;
       }
       const tempUrl = URL.createObjectURL(file);
       newImages.push(tempUrl);
       // Note: To be fully functional with Firebase, these should be uploaded.
       // We'll upload them properly in the background if there's a user session.
       if (auth.currentUser) {
           uploadFileToStorage(file, `users/${auth.currentUser.uid}/galleries/${Date.now()}_${file.name}`)
             .then(url => {
                 onUpdate(`galleryMarker${num}`, { 
                   images: [...(slide[`galleryMarker${num}`]?.images || []), url].filter(u => u !== tempUrl),
                   x: slide[`galleryMarker${num}`]?.x ?? (40 + num*5), 
                   y: slide[`galleryMarker${num}`]?.y ?? 40 
                 });
             }).catch(console.error);
       }
    }
    captureHistory();
    onUpdate(`galleryMarker${num}`, { images: newImages, x: slide[`galleryMarker${num}`]?.x ?? (40 + num*5), y: slide[`galleryMarker${num}`]?.y ?? 40 });
    e.target.value = '';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{ left: pos.x, top: pos.y }}
      className="fixed w-[400px] bg-[#F4F4F1] border-2 border-black shadow-[8px_8px_0_0_#000] z-[250] flex flex-col overflow-hidden rounded-none"
    >
      <div 
        onMouseDown={handleMouseDown}
        className="drag-handle p-4 border-b-2 border-black flex items-center justify-between bg-white cursor-move select-none"
      >
        <div className="flex items-center gap-3">
          <div className="bg-black p-2 text-white"><Settings2 size={16} /></div>
          <div>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-black leading-none">Edit Properties</h4>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex bg-[#F4F4F1] border border-black rounded-sm overflow-hidden mr-1">
             <button onClick={(e) => { e.stopPropagation(); onPrevSlide(); captureHistory(); }} disabled={!canPrev} className="px-2 py-1 hover:bg-black hover:text-white disabled:opacity-30 disabled:hover:bg-[#F4F4F1] disabled:hover:text-black transition-colors border-r border-black"><ChevronLeft size={14}/></button>
             <button onClick={(e) => { e.stopPropagation(); onNextSlide(); captureHistory(); }} disabled={!canNext} className="px-2 py-1 hover:bg-black hover:text-white disabled:opacity-30 disabled:hover:bg-[#F4F4F1] disabled:hover:text-black transition-colors"><ChevronRight size={14}/></button>
           </div>
           <button onClick={onClose} className="p-1 border border-transparent hover:border-black transition-colors"><X size={18} /></button>
        </div>
      </div>
      
      <div className="flex border-b-2 border-black bg-white">
        {['general', 'interactive'].map(tab => (
           <button 
             key={tab} 
             onClick={() => setActiveTab(tab)}
             className={`flex-1 py-3 text-[10px] font-mono font-bold uppercase tracking-widest border-r-2 border-black last:border-r-0 ${activeTab === tab ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
           >
             {tab}
           </button>
        ))}
      </div>

      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold uppercase tracking-widest border-l-4 border-black pl-2 block">Headline</label>
              <input 
                className="w-full bg-white border-2 border-black px-4 py-3 text-sm font-serif font-bold text-black focus:outline-none focus:bg-gray-50 transition-colors rounded-none"
                value={slide.title || ''}
                onFocus={captureHistory}
                onChange={(e) => onUpdate('title', e.target.value)}
                placeholder="Internal Headline"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold uppercase tracking-widest border-l-4 border-black pl-2 block">Content</label>
              <textarea 
                className="w-full bg-white border-2 border-black px-4 py-3 text-sm font-serif text-black focus:outline-none focus:bg-gray-50 transition-colors rounded-none min-h-[100px]"
                value={slide.content || ''}
                onFocus={captureHistory}
                onChange={(e) => onUpdate('content', e.target.value)}
                placeholder="Slide text content..."
              />
            </div>
          </div>
        )}

        {activeTab === 'interactive' && (
          <div className="space-y-8">
            <div>
               <h5 className="text-[10px] font-mono font-bold uppercase text-black tracking-widest bg-white inline-block px-2 py-1 border-2 border-black mb-4">Video Links</h5>
               <div className="space-y-4">
                 {[1, 2, 3].map(num => (
                   <div key={num} className="space-y-2">
                      <label className="text-[9px] font-mono uppercase font-bold text-gray-500 flex items-center gap-2"><Youtube size={12}/> YouTube Marker {num}</label>
                      <input 
                        className="w-full bg-white border-2 border-black px-3 py-2 text-xs font-mono rounded-none focus:outline-none" 
                        value={slide[`youtubeMarker${num}`]?.url || ''} 
                        onFocus={captureHistory}
                        onChange={e => onUpdate(`youtubeMarker${num}`, e.target.value ? { url: e.target.value, x: slide[`youtubeMarker${num}`]?.x ?? (30 + num*10), y: slide[`youtubeMarker${num}`]?.y ?? 50 } : null)} 
                        placeholder={`Paste YouTube Link ${num}...`} 
                      />
                   </div>
                 ))}
               </div>
            </div>

            <div className="border-t-2 border-black pt-6">
               <h5 className="text-[10px] font-mono font-bold uppercase text-black tracking-widest bg-white inline-block px-2 py-1 border-2 border-black mb-4">Image Galleries</h5>
               <p className="text-[9px] font-mono mb-4">Max 3 galleries, 10 images each (10MB max).</p>
               <div className="space-y-4">
                 {[1, 2, 3].map(num => (
                   <div key={`gal-${num}`} className="space-y-2 border border-black p-3 bg-white">
                      <label className="text-[9px] font-mono uppercase font-bold text-gray-500 flex items-center justify-between">
                         <span className="flex items-center gap-2"><ImageIcon size={12}/> Gallery {num}</span>
                         <span className="bg-black text-white px-1.5 py-0.5">{slide[`galleryMarker${num}`]?.images?.length || 0}/10</span>
                      </label>
                      
                      {(!slide[`galleryMarker${num}`]?.images || slide[`galleryMarker${num}`]?.images?.length < 10) && (
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-black/30 hover:border-black p-2 cursor-pointer bg-gray-50 transition-colors">
                             <Upload size={12} /> <span className="text-[9px] font-mono uppercase font-bold">Upload Local Files</span>
                             <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleGalleryUpload(e, num)} />
                          </label>
                          <div className="flex gap-2">
                             <input 
                               type="text" 
                               placeholder="/image.png or url" 
                               className="flex-1 bg-transparent border-b border-black/30 px-2 py-1 text-[10px] font-mono rounded-none focus:outline-none focus:border-black" 
                               onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                     const val = (e.target as HTMLInputElement).value;
                                     if (!val) return;
                                     captureHistory();
                                     onUpdate(`galleryMarker${num}`, { 
                                       images: [...(slide[`galleryMarker${num}`]?.images || []), val],
                                       x: slide[`galleryMarker${num}`]?.x ?? (40 + num*5), 
                                       y: slide[`galleryMarker${num}`]?.y ?? 40 
                                     });
                                     (e.target as HTMLInputElement).value = '';
                                  }
                               }} 
                             />
                             <button className="bg-black text-white px-2 tracking-widest py-1 text-[9px] uppercase font-mono font-bold hover:bg-gray-800" onClick={(e) => {
                               const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                               const val = input.value;
                               if (!val) return;
                               captureHistory();
                               onUpdate(`galleryMarker${num}`, { 
                                 images: [...(slide[`galleryMarker${num}`]?.images || []), val],
                                 x: slide[`galleryMarker${num}`]?.x ?? (40 + num*5), 
                                 y: slide[`galleryMarker${num}`]?.y ?? 40 
                               });
                               input.value = '';
                             }}>Add</button>
                          </div>
                        </div>
                      )}
                      
                      {slide[`galleryMarker${num}`]?.images?.length > 0 && (
                        <button onClick={() => { captureHistory(); onUpdate(`galleryMarker${num}`, null); }} className="text-[9px] uppercase font-mono text-center w-full mt-2 text-red-500 hover:text-red-700">Clear Gallery</button>
                      )}
                   </div>
                 ))}
               </div>
            </div>

            <div className="border-t-2 border-black pt-6">
               <h5 className="text-[10px] font-mono font-bold uppercase text-black tracking-widest bg-white inline-block px-2 py-1 border-2 border-black mb-4">Sticky Notes</h5>
               <div className="space-y-4">
                 {[1, 2, 3].map(num => (
                   <div key={`note-${num}`} className="space-y-2 border border-black p-3 bg-[#fdfcda]">
                      <label className="text-[9px] font-mono uppercase font-bold text-gray-800 flex items-center gap-2"><FileText size={12}/> Sticky Note {num}</label>
                      <textarea 
                        className="w-full bg-transparent border-b border-black/30 px-2 py-2 text-xs font-serif rounded-none focus:outline-none focus:border-black min-h-[60px]" 
                        value={slide[`noteMarker${num}`]?.text || ''} 
                        onFocus={captureHistory}
                        onChange={e => onUpdate(`noteMarker${num}`, e.target.value ? { text: e.target.value, x: slide[`noteMarker${num}`]?.x ?? (60 + num*5), y: slide[`noteMarker${num}`]?.y ?? (20 + num*10) } : null)} 
                        placeholder={`Note content...`} 
                      />
                   </div>
                 ))}
               </div>
            </div>

            <div className="border-t-2 border-black pt-6">
               <h5 className="text-[10px] font-mono font-bold uppercase text-black tracking-widest bg-white inline-block px-2 py-1 border-2 border-black mb-4">Documents</h5>
               <p className="text-[9px] font-mono mb-4 text-gray-500">Max 3 documents per slide (pdf, doc, img).</p>
               <div className="space-y-4">
                 {[1, 2, 3].map(num => (
                   <div key={`doc-${num}`} className="space-y-2 border border-black p-3 bg-white">
                      <label className="text-[9px] font-mono uppercase font-bold text-gray-800 flex items-center justify-between">
                         <span className="flex items-center gap-2"><FileText size={12}/> Document {num}</span>
                      </label>
                      
                      {!slide[`docMarker${num}`]?.url && (
                        <div className="flex flex-col gap-2 mt-2">
                          <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-black/30 hover:border-black p-2 cursor-pointer bg-gray-50 transition-colors">
                             <Upload size={12} /> <span className="text-[9px] font-mono uppercase font-bold">Local File</span>
                             <input type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (!file) return;
                                 captureHistory();
                                 onUpdate(`docMarker${num}`, { 
                                     url: URL.createObjectURL(file), name: file.name,
                                     x: slide[`docMarker${num}`]?.x ?? (70 + num*5), 
                                     y: slide[`docMarker${num}`]?.y ?? (30 + num*10) 
                                 });
                             }} />
                          </label>
                          <div className="flex gap-2">
                             <input 
                               type="text" 
                               placeholder="External URL" 
                               className="flex-1 bg-transparent border-b border-black/30 px-2 py-1 text-[10px] font-mono rounded-none focus:outline-none focus:border-black" 
                               onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                     const val = (e.target as HTMLInputElement).value;
                                     if (!val) return;
                                     captureHistory();
                                     onUpdate(`docMarker${num}`, { 
                                       url: val, name: 'Document ' + num,
                                       x: slide[`docMarker${num}`]?.x ?? (70 + num*5), 
                                       y: slide[`docMarker${num}`]?.y ?? (30 + num*10) 
                                     });
                                     (e.target as HTMLInputElement).value = '';
                                  }
                               }} 
                             />
                             <button className="bg-black text-white px-2 tracking-widest py-1 text-[9px] uppercase font-mono font-bold hover:bg-gray-800" onClick={(e) => {
                               const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                               const val = input.value;
                               if (!val) return;
                               captureHistory();
                               onUpdate(`docMarker${num}`, { 
                                 url: val, name: 'Document ' + num,
                                 x: slide[`docMarker${num}`]?.x ?? (70 + num*5), 
                                 y: slide[`docMarker${num}`]?.y ?? (30 + num*10) 
                               });
                               input.value = '';
                             }}>Add</button>
                          </div>
                        </div>
                      )}

                      {slide[`docMarker${num}`]?.url && (
                         <div className="flex items-center justify-between bg-gray-100 border border-black p-2 mt-2">
                            <span className="text-[9px] font-mono truncate max-w-[120px]">{slide[`docMarker${num}`].name}</span>
                            <button onClick={() => { captureHistory(); onUpdate(`docMarker${num}`, null); }} className="text-red-500 hover:text-red-700 p-1">
                               <X size={12}/>
                            </button>
                         </div>
                      )}
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const PreviewRoom = ({ project, onBack, onUpdateSlide, initialSid, visitorSessionId }: { project: any, onBack: () => void, onUpdateSlide: (sid: any, field: string, val: any) => void, initialSid?: any, visitorSessionId?: string }) => {
  if (!project) return null;
  const [activeSid, setActiveSid] = useState(initialSid || project.slides[0]?.id);
  const [interactiveMode, setInteractiveMode] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [playAudio, setPlayAudio] = useState(true);
  const [autoPlayNext, setAutoPlayNext] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [activeGallery, setActiveGallery] = useState<{images: string[], index: number} | null>(null);
  const [activeNote, setActiveNote] = useState<{title?: string, text: string} | null>(null);
  const [activeDoc, setActiveDoc] = useState<{name?: string, url: string} | null>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [isFrameless, setIsFrameless] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(playAudio);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hello, I'm the Founder Avatar. Please let me know if you have any questions for this project, I hope I can assist you to answer your question here." }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (instant = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: instant ? "auto" : "smooth",
        block: "end"
      });
    }
  };

  useEffect(() => {
    if (isAIChatOpen) {
      // Small timeout to ensure DOM is ready after message update or opening
      const timer = setTimeout(() => scrollToBottom(), 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isAIChatOpen]);

  const slides = Array.isArray(project?.slides) ? project.slides : [];
  const currentSlide = slides.find(s => String(s.id) === String(activeSid)) || slides[0] || { id: 'empty', title: 'Untitled', content: '', appendix: {} };
  const slideIndex = Math.max(0, slides.findIndex(s => String(s.id) === String(activeSid)));

  useEffect(() => {
    // Ensure we have an active session ID if shared project data is loaded
    if (!activeSid && project && slides.length > 0) {
       setActiveSid(slides[0].id);
    }
  }, [activeSid, project, slides]);

  // Sync state when global play audio preference changes
  useEffect(() => {
    if (!playAudio && audioRef.current) {
      audioRef.current.pause();
    } else if (playAudio && audioRef.current) {
      audioRef.current.play().catch(e => console.log("Autoplay blocked:", e));
    }
  }, [playAudio, currentSlide.id]);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(e => console.log("Play blocked:", e));
      } else {
        audioRef.current.pause();
      }
    }
  };

  const restartAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  const handleNext = () => {
    if (slideIndex < slides.length - 1) {
      setActiveSid(slides[slideIndex + 1].id);
    }
  };

  const handlePrev = () => {
    if (slideIndex > 0) {
      setActiveSid(project.slides[slideIndex - 1].id);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setAgentTyping(true);
    
    try {
      const resp = await getGeminiChatResponse(
         [...messages, { role: 'user', text: userMsg }],
         project.aiKnowledgeFiles || [],
         (currentSlide?.content || "") + "\n" + (currentSlide?.title || "")
      );
      setMessages(prev => [...prev, { role: 'ai', text: resp }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I am unable to connect to the knowledge engine right now. " + e.message }]);
    } finally {
      setAgentTyping(false);
    }
  };

  return (
    <div className={`flex-1 ${isFrameless ? 'bg-black' : 'bg-[#F4F4F1]'} text-black flex flex-col relative h-full overflow-hidden`}>
      {!isFrameless && <div className="absolute inset-0 bg-dot-pattern opacity-10"></div>}
      
      {!isFrameless && (
        <header className="h-20 px-4 md:px-8 flex items-center justify-between bg-[#F4F4F1] z-40 border-b-2 border-black shrink-0 relative">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-black text-white border-2 border-black flex items-center justify-center font-bold text-xs md:text-sm font-serif shrink-0">PT</div>
          <div className="hidden sm:block">
            <h3 className="font-sans font-black text-lg md:text-xl uppercase tracking-tighter leading-none truncate">{project.name}</h3>
            <p className="text-gray-500 text-[9px] md:text-[10px] font-mono mt-1 tracking-widest uppercase">NDA Active • Restricted</p>
          </div>
        </div>

        <div className="flex gap-2 md:gap-4 items-center flex-wrap md:flex-nowrap justify-end">
             <div className="flex items-center gap-1 bg-white border-2 border-black pl-1 mr-2 shrink-0">
                <button onClick={handlePrev} disabled={slideIndex === 0} className="hover:bg-gray-100 p-1 md:p-1.5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ChevronLeft size={16}/></button>
                <span className="font-mono font-bold uppercase text-[9px] md:text-[10px] whitespace-nowrap pt-0.5 px-2">Pg {slideIndex + 1} / {slides.length}</span>
                <button onClick={handleNext} disabled={slideIndex === slides.length - 1} className="hover:bg-gray-100 p-1 md:p-1.5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ChevronRight size={16}/></button>
             </div>
            {currentSlide.audioUrl && (
              <div className="flex items-center gap-1">
                <button onClick={toggleAudio} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors" title={isPlayingAudio ? "Pause" : "Play"}>
                  {isPlayingAudio ? <Pause size={10} /> : <Play size={10} className="fill-current ml-0.5" />}
                </button>
                <button onClick={restartAudio} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors" title="Restart">
                  <RotateCcw size={10} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 md:gap-3 mr-1 md:mr-2">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={playAudio} onChange={e => setPlayAudio(e.target.checked)} className="accent-black w-3 h-3" />
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest">Audio</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={autoPlayNext} onChange={e => setAutoPlayNext(e.target.checked)} className="accent-black w-3 h-3" />
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest">Auto</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showSubtitles} onChange={e => setShowSubtitles(e.target.checked)} className="accent-black w-3 h-3" />
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest">Subs</span>
              </label>
            </div>
            
            <div className="bg-white border-2 border-black flex items-center p-1 shrink-0">
              <button 
                onClick={() => setInteractiveMode(false)}
                className={`px-2 py-1 md:px-4 md:py-1.5 text-[9px] md:text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${!interactiveMode ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}
              >
                Passive
              </button>
              <button 
                onClick={() => setInteractiveMode(true)}
                className={`px-2 py-1 md:px-4 md:py-1.5 text-[9px] md:text-[10px] font-mono font-bold uppercase tracking-widest transition-colors flex items-center gap-1 md:gap-2 ${interactiveMode ? 'bg-green-500 text-black border border-black' : 'text-gray-500 hover:text-black'}`}
              >
                <Zap size={10} className="md:w-3 md:h-3"/> <span className="hidden sm:inline">Interactive</span><span className="sm:hidden">Int</span>
              </button>
            </div>

            <div className="bg-white border-2 border-black flex items-center p-1 shrink-0 ml-2">
               <button 
                 onClick={() => setIsFrameless(true)}
                 className={`px-2 py-1 md:px-4 md:py-1.5 text-[9px] md:text-[10px] font-mono font-bold uppercase tracking-widest transition-colors text-gray-500 hover:text-black hover:bg-gray-100 flex items-center gap-1 md:gap-2`}
               >
                 <Maximize size={10} className="md:w-3 md:h-3"/> <span className="hidden sm:inline">Fit Screen</span><span className="sm:hidden">Fit</span>
               </button>
            </div>
            <div className="w-[2px] h-6 bg-black/10 mx-1 md:mx-2 hidden sm:block"></div>
            <button onClick={onBack} className="bg-white border-2 border-black text-black hover:bg-black hover:text-white px-3 py-1.5 md:px-6 md:py-2 font-mono font-bold text-[9px] md:text-[10px] uppercase tracking-widest transition-colors shrink-0">Exit Room</button>
        </div>
      </header>
      )}

      <div className={`flex-1 flex overflow-hidden relative z-10 w-full min-h-[0]`}>
        <div className={`flex-1 relative flex flex-col items-center justify-center min-w-[0] ${isFrameless ? '' : 'p-4 lg:p-10'} `}>
            <div className={`w-full h-full relative flex flex-col group ${isFrameless ? '' : 'shadow-[8px_8px_0_0_rgba(0,0,0,1)] border-2 border-black bg-white'} overflow-hidden`}>
               {isFrameless && (
                  <div className="absolute top-4 right-4 z-[100] flex gap-2 items-center">
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded text-white shadow-lg mr-2">
                       <button onClick={handlePrev} disabled={slideIndex === 0} className="hover:text-white text-white/50 disabled:opacity-30 disabled:hover:text-white/50 transition-colors"><ChevronLeft size={16}/></button>
                       <span className="font-mono font-bold uppercase text-[10px] whitespace-nowrap pt-0.5">Pg {slideIndex + 1} / {slides.length}</span>
                       <button onClick={handleNext} disabled={slideIndex === slides.length - 1} className="hover:text-white text-white/50 disabled:opacity-30 disabled:hover:text-white/50 transition-colors"><ChevronRight size={16}/></button>
                    </div>
                    <button onClick={() => setIsFrameless(false)} className="bg-white text-black border-2 border-transparent text-[9px] font-mono font-bold uppercase tracking-widest px-3 py-1.5 shadow-lg hover:bg-gray-200 transition-all rounded">
                      Exit Fit Screen
                    </button>
                  </div>
               )}

               <AnimatePresence mode="wait">
                <motion.div 
                  key={currentSlide.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full flex flex-col items-center justify-center relative p-0 md:p-8 min-h-0 min-w-0 overflow-hidden"
                >
                  {currentSlide.audioUrl && (
                     <audio 
                       ref={audioRef}
                       src={currentSlide.audioUrl} 
                       autoPlay={playAudio} 
                       className="hidden" 
                       onPlay={() => setIsPlayingAudio(true)}
                       onPause={() => setIsPlayingAudio(false)}
                       onEnded={() => {
                         setIsPlayingAudio(false);
                         if (autoPlayNext) {
                           handleNext();
                         }
                       }}
                     />
                  )}
                  <div className={`relative flex-1 flex items-center justify-center w-full min-h-0 min-w-0 mx-auto`}>
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 z-0">
                      <div className="text-[12vw] font-serif font-black uppercase tracking-tighter -rotate-12 whitespace-nowrap overflow-hidden text-white md:text-black w-full text-center italic">CONFIDENTIAL</div>
                    </div>

                    {currentSlide.imageUrl ? (
                      <img src={currentSlide.imageUrl} className="w-full h-full object-contain relative z-10" alt={currentSlide.title} />
                    ) : (
                      <div className={`w-full h-full flex flex-col items-center justify-center text-center relative z-10 px-12 ${isFrameless ? 'bg-black text-white' : 'bg-white text-black'}`}>
                        <h1 className="text-[6vw] font-serif font-black uppercase mb-6 tracking-tighter italic leading-none">{currentSlide.title}</h1>
                        <div className={`w-24 h-1 mb-8 mx-auto ${isFrameless ? 'bg-white/50' : 'bg-black'}`}></div>
                        {currentSlide.isFixed ? (
                          <textarea 
                             className={`text-2xl font-mono leading-relaxed max-w-4xl w-full h-[60vh] text-center bg-transparent resize-none focus:outline-none custom-scrollbar-vertical ${isFrameless ? 'text-gray-300' : 'text-gray-600'}`} 
                             value={currentSlide.content || ''}
                             readOnly={(() => {
                                const params = new URLSearchParams(window.location.search);
                                const isVisitor = params.has('room');
                                if (currentSlide.id === 'founder-note') return true;
                                if (currentSlide.id === 'vc-feedback' && !isVisitor) return true;
                                return false;
                             })()}
                             onChange={(e) => {
                               if (onUpdateSlide) {
                                  onUpdateSlide(currentSlide.id, 'content', e.target.value);
                               }
                             }}
                             onBlur={(e) => {
                                const params = new URLSearchParams(window.location.search);
                                const isVisitor = params.has('room');
                                if (isVisitor && currentSlide.id === 'vc-feedback' && e.target.value.trim().length > 0) {
                                   import('firebase/firestore').then(async ({ doc, setDoc }) => {
                                      if (visitorSessionId) {
                                         setDoc(doc(db, 'projects', project.id, 'sessions', visitorSessionId), { hasFeedback: true }, { merge: true });
                                      }
                                   });
                                }
                             }}
                             placeholder={currentSlide.id === 'founder-note' ? "Founder notes are typed in the editor..." : "Type VC feedback here..."}
                          />
                        ) : (
                          <p className={`text-2xl font-mono leading-relaxed max-w-4xl whitespace-pre-wrap ${isFrameless ? 'text-gray-300' : 'text-gray-600'}`}>{currentSlide.content}</p>
                        )}
                      </div>
                    )}

                    {interactiveMode && [1, 2, 3].map(num => {
                      const ytMarker = currentSlide[`youtubeMarker${num}`];
                      const galMarker = currentSlide[`galleryMarker${num}`];
                      const noteMarker = currentSlide[`noteMarker${num}`];
                      const docMarker = currentSlide[`docMarker${num}`];
                      
                      return (
                        <React.Fragment key={num}>
                           {ytMarker && (
                              <button 
                                className="absolute z-30 animate-pulse hover:animate-none opacity-80 hover:opacity-100 transition-opacity"
                                style={{ left: `${ytMarker.x}%`, top: `${ytMarker.y}%`, transform: 'translate(-50%, -50%)' }}
                                onClick={() => {
                                  let embedUrl = ytMarker.url;
                                  if (embedUrl.includes('watch?v=')) {
                                    embedUrl = embedUrl.replace('watch?v=', 'embed/').split('&')[0];
                                  } else if (embedUrl.includes('youtu.be/')) {
                                    embedUrl = embedUrl.replace('youtu.be/', 'www.youtube.com/embed/').split('?')[0];
                                  }
                                  setPlayingVideo(embedUrl);
                                }}
                              >
                                <div className="bg-red-600 text-white p-1.5 md:p-2 rounded-full shadow-lg border border-black flex items-center gap-1 md:pr-3 hover:scale-105 transition-transform whitespace-nowrap">
                                  <Youtube size={16} /> <span className="hidden md:inline text-[9px] font-mono font-bold uppercase tracking-widest">Play {num > 1 ? num : ''}</span>
                                </div>
                              </button>
                           )}
                           
                           {galMarker && galMarker.images && galMarker.images.length > 0 && (
                              <button 
                                className="absolute z-30 animate-pulse hover:animate-none opacity-80 hover:opacity-100 transition-opacity"
                                style={{ left: `${galMarker.x}%`, top: `${galMarker.y}%`, transform: 'translate(-50%, -50%)' }}
                                onClick={() => setActiveGallery({ images: galMarker.images, index: 0 })}
                              >
                                <div className="bg-blue-600 text-white p-1.5 md:p-2 rounded-full shadow-lg border border-black flex items-center gap-1 md:pr-3 hover:scale-105 transition-transform whitespace-nowrap">
                                  <ImageIcon size={16} /> <span className="hidden md:inline text-[9px] font-mono font-bold uppercase tracking-widest">Gallery {num}</span>
                                </div>
                              </button>
                           )}
                           
                           {noteMarker && noteMarker.text && (
                              <button 
                                className="absolute z-30 animate-pulse hover:animate-none opacity-80 hover:opacity-100 transition-opacity"
                                style={{ left: `${noteMarker.x}%`, top: `${noteMarker.y}%`, transform: 'translate(-50%, -50%)' }}
                                onClick={() => setActiveNote({ text: noteMarker.text, title: `Note ${num}` })}
                              >
                                <div className="bg-yellow-400 text-black p-1.5 md:p-2 rounded-full shadow-lg border border-black flex items-center gap-1 md:pr-3 hover:scale-105 transition-transform whitespace-nowrap">
                                  <FileText size={16} /> <span className="hidden md:inline text-[9px] font-mono font-bold uppercase tracking-widest">Read</span>
                                </div>
                              </button>
                           )}

                           {docMarker && docMarker.url && (
                              <button 
                                className="absolute z-30 animate-pulse hover:animate-none opacity-80 hover:opacity-100 transition-opacity"
                                style={{ left: `${docMarker.x}%`, top: `${docMarker.y}%`, transform: 'translate(-50%, -50%)' }}
                                onClick={() => setActiveDoc({ url: docMarker.url, name: docMarker.name })}
                              >
                                <div className="bg-purple-500 text-white p-1.5 md:p-2 rounded-full shadow-lg border border-black flex items-center gap-1 md:pr-3 hover:scale-105 transition-transform whitespace-nowrap">
                                  <FileText size={16} /> <span className="hidden md:inline text-[9px] font-mono font-bold uppercase tracking-widest">Doc {num}</span>
                                </div>
                              </button>
                           )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {showSubtitles && currentSlide.content && !currentSlide.isFixed && (
                    <div className={`w-full shrink-0 text-white px-4 py-3 md:px-6 md:py-4 text-center z-40 mt-0 md:mt-4 md:rounded-sm ${isFrameless ? 'bg-black/80 backdrop-blur-sm border-t border-white/20 relative' : 'bg-black shadow-[0_-4px_10px_rgba(0,0,0,0.2)] md:shadow-none border-t-2 md:border-2 border-white/10 md:border-transparent'}`}>
                      <p className="font-serif italic text-sm md:text-lg leading-relaxed whitespace-pre-wrap">{currentSlide.content}</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              
            </div>
            
            {playingVideo && (
              <div className="fixed inset-0 bg-[#F4F4F1]/95 backdrop-blur-sm z-[500] flex flex-col items-center justify-center p-6 lg:p-12 pt-20">
                <div className="w-full max-w-5xl relative z-[505] bg-black border-2 border-black shadow-[12px_12px_0_0_#000]">
                   <div className="w-full flex justify-end bg-black p-2 border-b-2 border-white/20">
                     <button onClick={() => setPlayingVideo(null)} className="bg-transparent text-white hover:bg-white hover:text-black border-2 border-white px-3 py-1.5 font-mono font-bold text-[10px] lg:text-[12px] uppercase transition-all flex items-center gap-2">
                       <X size={14} /> Close Video
                     </button>
                   </div>
                   <iframe src={playingVideo} className="w-full aspect-video border-none bg-black" allow="autoplay; encrypted-media" allowFullScreen></iframe>
                </div>
              </div>
            )}
            
            {activeGallery && (
               <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex flex-col items-center justify-center p-4">
                  <div className="relative w-full max-w-5xl flex flex-col h-[80vh] bg-black/50 border-2 border-black">
                     <div className="w-full flex justify-end p-2 bg-black border-b border-white/20 z-[605]">
                        <button onClick={() => setActiveGallery(null)} className="bg-transparent text-white hover:bg-white hover:text-black border border-white px-3 py-1 font-mono font-bold text-[10px] uppercase transition-all flex items-center gap-1">
                          <X size={14} /> Close Gallery
                        </button>
                     </div>
                     <div className="flex-1 w-full flex items-center justify-center min-h-0 relative p-4">
                        <img src={activeGallery.images[activeGallery.index]} className="max-w-full max-h-full object-contain" alt="Gallery preview" />
                     </div>
                     <div className="h-24 w-full flex items-center justify-center gap-2 overflow-x-auto p-4 shrink-0 mt-4 custom-scrollbar-horizontal bg-white/10 rounded-none border-2 border-white/20">
                     {activeGallery.images.map((img: string, i: number) => (
                        <button key={i} onClick={() => setActiveGallery({ ...activeGallery, index: i })} className={`relative shrink-0 h-full border-2 transition-all ${i === activeGallery.index ? 'border-white scale-110 shadow-lg z-10' : 'border-white/20 opacity-50 hover:opacity-100'}`}>
                           <img src={img} className="h-full object-cover aspect-video" alt="Thumbnail" />
                        </button>
                     ))}
                     </div>
                  </div>
               </div>
            )}
            
            {activeNote && (
               <div className="fixed inset-0 bg-[#F4F4F1]/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#fdfcda] border-2 border-black shadow-[12px_12px_0_0_#000] w-full max-w-md relative p-8">
                     <button onClick={() => setActiveNote(null)} className="absolute top-4 right-4 p-1 border border-transparent hover:border-black transition-colors"><X size={16}/></button>
                     <h3 className="font-mono font-bold text-black uppercase tracking-widest text-[10px] mb-4 pb-2 border-b-2 border-black/10 flex items-center gap-2"><FileText size={14}/> {activeNote.title}</h3>
                     <p className="font-serif text-black leading-relaxed whitespace-pre-wrap">{activeNote.text}</p>
                  </motion.div>
               </div>
            )}
            
            {activeDoc && (
               <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex flex-col items-center justify-center p-4">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-black shadow-[12px_12px_0_0_#000] w-full h-[80vh] max-w-5xl relative flex flex-col">
                     <div className="p-4 border-b-2 border-black flex justify-between items-center shrink-0">
                        <h3 className="font-mono font-bold text-black uppercase tracking-widest text-[10px] sm:text-[12px] flex items-center gap-2 truncate pr-4"><FileText size={14}/> {activeDoc.name}</h3>
                        <button onClick={() => setActiveDoc(null)} className="shrink-0 bg-white text-black hover:bg-black hover:text-white border-2 border-black px-3 py-1.5 font-mono font-bold text-[10px] uppercase transition-colors flex items-center gap-1">
                          <X size={14} /> <span className="hidden sm:inline">Close</span>
                        </button>
                     </div>
                     <div className="flex-1 bg-gray-100 overflow-hidden relative">
                        {activeDoc.url.match(/\.(jpeg|jpg|gif|png)$/i) != null || activeDoc.url.startsWith('blob:') ? (
                           <img src={activeDoc.url} className="w-full h-full object-contain" alt={activeDoc.name} />
                        ) : (
                           <iframe src={activeDoc.url} className="w-full h-full border-none bg-white" title={activeDoc.name} />
                        )}
                     </div>
                  </motion.div>
               </div>
            )}
        </div>
      </div>
      
      {/* Floating AI Chat Button */}
      <button 
        onClick={() => setIsAIChatOpen(true)}
        className="fixed bottom-6 right-6 z-[400] bg-black text-white p-4 rounded-full shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] hover:scale-105 hover:shadow-lg transition-all border border-black group"
      >
        <Headset size={24} className="group-hover:animate-pulse" />
      </button>

      {/* AI Chat Drawer / Modal */}
      <AnimatePresence>
        {isAIChatOpen && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 right-6 w-80 max-h-[500px] h-[60vh] bg-white border-2 border-black shadow-[8px_8px_0_0_#000] z-[400] flex flex-col"
          >
             <div className="bg-[#F4F4F1] border-b-2 border-black px-4 py-3 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2">
                 <Cpu size={16} className="text-black" />
                 <span className="font-mono font-bold text-[10px] tracking-widest uppercase">AI Agent</span>
               </div>
               <button onClick={() => setIsAIChatOpen(false)} className="hover:text-red-500 transition-colors"><X size={14}/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`text-[11px] font-mono max-w-[85%] px-3 py-2 border border-black ${m.role === 'ai' ? 'bg-[#F4F4F1] text-black shadow-[2px_2px_0_0_#000] rounded-tl-none' : 'bg-black text-white rounded-tr-none'}`}>
                       {m.text}
                    </div>
                  </div>
                ))}
                {agentTyping && (
                  <div className="flex justify-start">
                    <div className="bg-[#F4F4F1] border border-black px-3 py-2 font-mono text-[9px] uppercase tracking-tighter animate-pulse">
                      AI is typing...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
             </div>
             <div className="p-3 border-t-2 border-black bg-white shrink-0">
                <div className="flex bg-white border border-black overflow-hidden focus-within:ring-1 focus-within:ring-black">
                   <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter' && sendMessage()} placeholder="Ask AI..." className="flex-1 px-3 py-2 text-xs font-mono focus:outline-none"/>
                   <button onClick={sendMessage} className="px-3 bg-black text-white hover:bg-gray-800 transition-colors"><Send size={12}/></button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DatabaseIcon = ({size=24, className=""}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
);

export default function App() {
  const hasRoomParam = new URLSearchParams(window.location.search).has('room');
  const [view, setView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [activePid, setActivePid] = useState<string | null>(null);
  const [activeSid, setActiveSid] = useState<number | string | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  const [visitorInfo, setVisitorInfo] = useState<{name: string, email: string, sessionId: string} | null>(null);
  const [isGated, setIsGated] = useState(false);
  const [sharedProjectData, setSharedProjectData] = useState<any | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [invalidRoom, setInvalidRoom] = useState(false);
  const [loadingShared, setLoadingShared] = useState(hasRoomParam);
  const [gatedError, setGatedError] = useState("");
  const [homeError, setHomeError] = useState("");

  const lastSavedProjectsRef = useRef(projects);

  const exportProjectData = (project: any) => {
    try {
      const dataStr = JSON.stringify(project, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `${project.name.replace(/\s+/g, '_').toLowerCase()}_pitch_data.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authInitialized) return;
    if (!user) {
      setProjects(INITIAL_PROJECTS);
      lastSavedProjectsRef.current = INITIAL_PROJECTS;
      setIsInitialLoading(false);
      return;
    }
    const projectsQuery = query(collection(db, 'projects'), where('userId', '==', user.uid));
    setIsInitialLoading(true);
    getDocs(projectsQuery).then((snapshot) => {
      const userProjects = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(p => !p.userId || p.userId === user.uid)
        .map(p => ({ ...p, slides: appendFixedSlides(p.slides || []) }))
        .sort((a, b) => {
           const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt || 0);
           const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt || 0);
           return timeB - timeA;
        });
        
      if (userProjects.length > 0) {
        setProjects(userProjects);
        lastSavedProjectsRef.current = userProjects;
      } else {
        setProjects([]);
        lastSavedProjectsRef.current = [];
      }
      setIsInitialLoading(false);
    }).catch((error) => {
      handleFirestoreError(error, OperationType.GET, 'projects');
      setIsInitialLoading(false);
    });
  }, [user, authInitialized]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    if (roomId && authInitialized) {
      setLoadingShared(true);
      import('firebase/firestore').then(({ getDoc, doc }) => {
        getDoc(doc(db, 'projects', roomId)).then(snap => {
          if (snap.exists()) {
            const data = snap.data() as any;
            const isOwner = user && data.userId === user.uid;
            
            // Defensive slide mapping
            const rawSlides = data.slides || [];
            const safeSlides = Array.isArray(rawSlides) ? rawSlides : [];
            const slidesWithFixed = appendFixedSlides(safeSlides);

            if (isOwner) {
               setActivePid(roomId);
               setProjects(prev => {
                  const existing = prev.find(p => p.id === snap.id);
                  if (existing) return prev;
                  return [...prev, { id: snap.id, ...data, slides: slidesWithFixed }];
               });
               setView('preview');
            } else {
               setSharedProjectData({ 
                 id: snap.id, 
                 ...data, 
                 slides: slidesWithFixed 
               });
               setIsGated(true);
            }
          } else {
            setInvalidRoom(true);
          }
          setLoadingShared(false);
        }).catch(err => {
          console.error("Shared room fetch error:", err);
          setInvalidRoom(true);
          setLoadingShared(false);
        });
      }).catch(err => {
        console.error("Firebase import error:", err);
        setLoadingShared(false);
      });
    }
  }, [authInitialized, user?.uid]);

  useEffect(() => {
     let interval: any;
     if (view === 'preview' && visitorInfo && activePid) {
        interval = setInterval(() => {
           import('firebase/firestore').then(({ setDoc, doc, increment }) => {
              const ref = doc(db, 'projects', activePid, 'sessions', visitorInfo.sessionId);
              setDoc(ref, { 
                lastPing: Date.now(),
                timeSpent: increment(10)
              }, { merge: true }).catch(() => {});
           });
        }, 10000);
     }
     return () => clearInterval(interval);
  }, [view, visitorInfo, activePid]);

  if (loadingShared) {
     return (
        <div className="fixed inset-0 bg-[#F4F4F1] flex items-center justify-center z-[100]">
           <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 border-4 border-black border-t-transparent animate-spin rounded-full"></div>
              <p className="font-mono text-xs uppercase tracking-widest font-bold">Connecting to Pitch Room...</p>
           </div>
        </div>
     );
  }

  if (invalidRoom) {
     return (
        <div className="fixed inset-0 bg-[#F4F4F1] flex items-center justify-center z-[100] p-6">
           <div className="max-w-md w-full bg-white border-2 border-black p-8 shadow-[8px_8px_0_0_#000] text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-6 rounded-full border-2 border-red-600">
                 <X size={32} className="rotate-0" />
              </div>
              <h2 className="text-2xl font-black italic uppercase mb-2">Room Not Found</h2>
              <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mb-8 leading-relaxed">The link you followed is invalid, expired, or has been deleted by the owner.</p>
              <button 
                 onClick={() => window.location.href = '/'}
                 className="w-full bg-black text-white py-4 font-mono font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors"
              >
                 Return to Pitch Tank
              </button>
           </div>
        </div>
     );
  }

  if (isGated && sharedProjectData) {
     return (
        <div className="fixed inset-0 bg-[#F4F4F1] flex flex-col items-center justify-center p-6 text-black font-sans z-[200]">
           <div className="w-full max-w-md bg-white p-8 md:p-12 shadow-[16px_16px_0_0_#000] border-2 border-black">
              <div className="mb-10 text-center">
                 <div className="w-16 h-16 bg-black text-white flex items-center justify-center mx-auto mb-6 rounded-full shadow-lg">
                    <Lock size={32} />
                 </div>
                 <h1 className="font-serif italic font-black text-3xl md:text-4xl mb-2 uppercase tracking-tighter">{sharedProjectData.name}</h1>
                 <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-400 font-bold">Secure Access Required</p>
              </div>

              <form onSubmit={(e) => {
                 e.preventDefault();
                 setGatedError("");
                 const fd = new FormData(e.target as HTMLFormElement);
                 const enteredPin = (fd.get('pin') as string).trim();
                
                if (sharedProjectData.pinCode && enteredPin !== sharedProjectData.pinCode) {
                    setGatedError("Access Denied: Invalid Code");
                    return;
                 }
                 
                 const vName = (fd.get('name') as string).trim() || "Investor / Partner";
                 const sid = Date.now().toString();
                 
                 setVisitorInfo({ name: vName, email: "", sessionId: sid });
                 setIsGated(false);
                 setActivePid(sharedProjectData.id);
                 setView('preview');
                 
                 // Delayed session creation to prevent render blocking
                 setTimeout(() => {
                    import('firebase/firestore').then(({ setDoc, doc }) => {
                        const ref = doc(db, 'projects', sharedProjectData.id, 'sessions', sid);
                        setDoc(ref, {
                           name: vName,
                           email: "",
                           startedAt: Date.now(),
                           lastPing: Date.now(),
                           timeSpent: 0,
                           hasFeedback: false
                        }).catch(err => console.error("Session log error", err));
                     });
                 }, 500);
                 
              }} className="space-y-8">
                 <div className="bg-gray-50 border-l-4 border-black p-4 mb-6">
                    <p className="text-[11px] font-mono leading-relaxed text-gray-600">
                       Welcome to the Founder's Private Pitch Room. Your presence and engagement metrics will be logged for review by the project owner.
                    </p>
                 </div>

                 <div>
                    <label className="block font-mono text-[10px] font-bold uppercase tracking-widest mb-3 text-gray-500">Enter Access Code</label>
                    <input 
                       name="pin" 
                       type="text"
                       required 
                       autoFocus
                       autoComplete="off"
                       className="w-full border-2 border-black p-4 font-mono text-2xl bg-gray-50 focus:bg-white focus:ring-4 focus:ring-black/5 transition-all outline-none text-center tracking-[0.3em] font-black placeholder:text-gray-200" 
                       placeholder="CODE" 
                    />
                    {gatedError && (
                       <div className="bg-red-50 text-red-600 p-3 mt-4 border-2 border-red-600 flex items-center gap-3 animate-shake">
                          <X size={16} />
                          <p className="text-[10px] font-mono font-bold uppercase tracking-widest">{gatedError}</p>
                       </div>
                    )}
                 </div>

                 <div>
                    <label className="block font-mono text-[10px] font-bold uppercase tracking-widest mb-3 text-gray-500">Your Name (Internal Record)</label>
                    <input 
                       name="name" 
                       className="w-full border-2 border-black p-4 font-mono text-sm bg-gray-50 focus:bg-white transition-all outline-none" 
                       placeholder="e.g. V.C. Partner" 
                    />
                 </div>

                 <button 
                    type="submit" 
                    className="w-full bg-black text-white font-mono font-bold text-xs uppercase tracking-[0.2em] p-5 hover:bg-white hover:text-black transition-all border-2 border-black shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none"
                 >
                    Authorize Access
                 </button>
              </form>
              
              <div className="mt-10 text-center">
                 <button onClick={() => window.location.href = '/'} className="text-[9px] font-mono text-gray-400 hover:text-black uppercase tracking-widest underline decoration-2 underline-offset-4">
                    Leave This Room
                 </button>
              </div>
           </div>
        </div>
     );
  }

  // Effect to handle URL route based on room param
  // (already mapped above)
  useEffect(() => {
    if (!user || projects === lastSavedProjectsRef.current) return;
    
    // Find modified projects
    const saveToFirestore = async () => {
       for (const project of projects) {
          const lastSaved = lastSavedProjectsRef.current.find(p => p.id === project.id);
          if (project !== lastSaved) {
             try {
                const { id, ...data } = project;
                const ref = doc(db, 'projects', id);
                let payload: any = {};
                if (!lastSaved) {
                   payload = {
                     ...data,
                     userId: user.uid,
                     createdAt: serverTimestamp(),
                     updatedAt: serverTimestamp(),
                   };
                } else {
                   // Sanitize slides: don't save temporary blob URLs
                   const sanitizedSlides = (data.slides || []).map((s: any) => {
                      if (s.imageUrl && s.imageUrl.startsWith('blob:')) {
                         const oldSlide = lastSaved.slides?.find((os: any) => os.id === s.id);
                         return { ...s, imageUrl: oldSlide?.imageUrl || null };
                      }
                      return s;
                   });

                   payload = {
                     name: data.name,
                     slides: sanitizedSlides,
                     aiKnowledgeFiles: data.aiKnowledgeFiles || [],
                     pinCode: data.pinCode || lastSaved.pinCode,
                     updatedAt: serverTimestamp(),
                   };
                }
                
                await setDoc(ref, payload, { merge: true });
                if (data.pinCode) {
                   await setDoc(doc(db, 'pinCodes', data.pinCode), { projectId: id }, { merge: true });
                }
             } catch (err: any) {
                console.error("Error saving project full obj:", err);
                console.error("Error saving project", err.message);
             }
          }
       }
       lastSavedProjectsRef.current = projects;
    };
    
    const timeoutMsg = setTimeout(saveToFirestore, 1000);
    return () => clearTimeout(timeoutMsg);
  }, [projects, user]);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [modal, setModal] = useState<{type: string | null, data?: any}>({ type: null, data: null });
  const [loading, setLoading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [timelineHeight, setTimelineHeight] = useState(140);
  const [isFrameless, setIsFrameless] = useState(false);
  const [fitToFrame, setFitToFrame] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isShareCopied, setIsShareCopied] = useState(false);
  
  const [pastProjects, setPastProjects] = useState<typeof INITIAL_PROJECTS[]>([]);
  const [futureProjects, setFutureProjects] = useState<typeof INITIAL_PROJECTS[]>([]);

  const isResizing = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const captureHistory = () => {
    setPastProjects(prev => {
        if (prev.length > 0 && prev[prev.length - 1] === projects) return prev;
        return [...prev, projects].slice(-20);
    });
    setFutureProjects([]);
  };

  const handleStartRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Audio recording is not supported in this environment. Please try opening the app in a new tab.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
           audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
         const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
         const localUrl = URL.createObjectURL(audioBlob);
         captureHistory();
         updateActiveSlide('audioUrl', localUrl);
         stream.getTracks().forEach(track => track.stop());
         
         if (user) {
            try {
                const remoteUrl = await uploadFileToStorage(audioBlob, `users/${user.uid}/audio/${Date.now()}.webm`);
                updateActiveSlide('audioUrl', remoteUrl); // update with remote URL
            } catch (err) {
                console.error("Storage upload failed, using local URL", err);
            }
         }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
       console.error("Microphone access denied or error:", err);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      captureHistory();
      updateActiveSlide('audioUrl', localUrl);
      
      if (user) {
         try {
             const remoteUrl = await uploadFileToStorage(file, `users/${user.uid}/audio/${Date.now()}_${file.name}`);
             updateActiveSlide('audioUrl', remoteUrl); // update when done
         } catch (err) {
             console.error("Audio upload failed", err);
         }
      }
    }
    e.target.value = '';
  };

  const handleUndo = () => {
    if (pastProjects.length === 0) return;
    const previous = pastProjects[pastProjects.length - 1];
    setPastProjects(prev => prev.slice(0, -1));
    setFutureProjects(prev => [projects, ...prev]);
    setProjects(previous);
  };

  const handleRedo = () => {
    if (futureProjects.length === 0) return;
    const next = futureProjects[0];
    setFutureProjects(prev => prev.slice(1));
    setPastProjects(prev => [...prev, projects]);
    setProjects(next);
  };

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

  useEffect(() => {
    if (activePid && !activeSid) {
       const p = projects.find(proj => proj.id === activePid) || sharedProjectData;
       if (p && p.slides && p.slides.length > 0) {
          setActiveSid(p.slides[0].id);
       }
    }
  }, [activePid, activeSid, projects, sharedProjectData]);

  const activeProject = getSafeProject(projects.find(p => p.id === activePid) || (sharedProjectData?.id === activePid ? sharedProjectData : undefined));
  const slides = activeProject?.slides || [];
  const activeSlide = slides.find((s: any) => String(s.id) === String(activeSid || slides[0]?.id)) || slides[0] || { title: 'Untitled', content: '', id: 'empty' };

  if (loadingShared && !sharedProjectData && !activeProject) {
     return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#F4F4F1] min-h-screen">
          <div className="w-12 h-12 border-4 border-black border-t-transparent animate-spin rounded-full mb-4"></div>
          <p className="font-mono text-xs uppercase tracking-widest font-black">Loading Pitch Data...</p>
        </div>
     );
  }

  if (view === 'editor' && (!activeProject || (activeProject.slides.length === 0 && !isInitialLoading))) {
     return (
       <div className="flex-1 flex items-center justify-center bg-[#F4F4F1]">
          <div className="text-center p-8 bg-white border-2 border-black shadow-[8px_8px_0_0_#000]">
             <p className="font-mono text-xs uppercase tracking-widest mb-6 font-bold">Project Recovery Mode / Syncing</p>
             <p className="text-[10px] font-mono text-gray-400 mb-8 max-w-xs mx-auto">Please wait while we sync your pitch deck or return to the dashboard if this persists.</p>
             <button onClick={() => {
                setActivePid(null);
                setActiveSid(null);
                setView('dashboard');
             }} className="w-full py-4 bg-black text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors">Back to Dashboard</button>
          </div>
       </div>
     );
  }

  const handleCreateProject = (name: string) => {
    const pin = generateSecurePin(); // secure code
    const newProject = {
      id: 'p' + Date.now(),
      name: name,
      pinCode: pin,
      slides: [
        { id: 1, title: "Initial Slide", content: "Tell your story...", imageUrl: null, showNarrative: true, appendix: {} },
        { id: 'founder-note', title: "Founder Note", content: "Founder's internal notes...", imageUrl: null, showNarrative: true, appendix: {}, isFixed: true },
        { id: 'vc-feedback', title: "Angel/VC Feedback", content: "VCs can leave feedback here...", imageUrl: null, showNarrative: true, appendix: {}, isFixed: true }
      ]
    };
    setProjects([newProject, ...projects]);
    setModal({ type: null });
  };

  const updateSlideField = (pid: string, sid: number | string, field: string, val: any) => {
     setProjects(prev => prev.map(p => p.id === pid ? {
        ...p, slides: (p.slides || []).map(s => String(s.id) === String(sid) ? { ...s, [field]: val } : s)
     } : p));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const files = Array.from(target.files || []) as File[];
    if (!files.length) return;
    
    setLoading(true);
    const newSlides: any[] = [];
    const pendingUploads: { sid: number, fileOrBlob: File | Blob, ext: string }[] = [];
    
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

      if (isPdf) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          for (let pNum = 1; pNum <= pdf.numPages; pNum++) {
            const page = await pdf.getPage(pNum);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
             const slideId = Date.now() + index * 1000 + pNum;
             
             let tempImageUrl = null;
             if (context) {
                await page.render({ canvasContext: context, viewport: viewport } as any).promise;
                const blob: Blob = await new Promise(resolve => canvas.toBlob(b => resolve(b as Blob), 'image/webp', 0.8));
                tempImageUrl = URL.createObjectURL(blob);
                pendingUploads.push({ sid: slideId, fileOrBlob: blob, ext: `_pg${pNum}.webp` });
             }
             
             newSlides.push({
               id: slideId,
               title: `${file.name.split('.')[0]} - Pg ${pNum}`,
               content: "Narrative context...",
               imageUrl: tempImageUrl, 
               showNarrative: true,
               appendix: { "Source": file.name }
             });
           }
         } catch (error) {
           console.error("PDF conversion failed", error);
         }
       } else {
         const slideId = Date.now() + index * 1000;
         const tempImageUrl = URL.createObjectURL(file);
         pendingUploads.push({ sid: slideId, fileOrBlob: file, ext: `_${file.name}` });
         
         newSlides.push({
           id: slideId,
           title: file.name.split('.')[0],
           content: "Narrative context...",
           imageUrl: tempImageUrl, 
           showNarrative: true,
           appendix: {}
         });
       }
    }

    captureHistory();
    setProjects(prev => prev.map(p => {
       if (p.id !== activePid) return p;
       const fixedSlides = p.slides.filter(s => s.isFixed);
       const normalSlides = p.slides.filter(s => !s.isFixed);
       return { ...p, slides: [...normalSlides, ...newSlides, ...fixedSlides] };
    }));
    if (newSlides.length > 0 && activePid) setActiveSid(String(newSlides[0].id));
    e.target.value = ''; // reset input
    
    // Background uploads
    if (user && activePid) {
       for (const task of pendingUploads) {
          try {
             const remoteUrl = await uploadFileToStorage(task.fileOrBlob, `users/${user.uid}/images/${Date.now()}${task.ext}`);
             updateSlideField(activePid, task.sid, 'imageUrl', remoteUrl);
          } catch (err) {
             console.error("Background upload failed for slide", task.sid, err);
          }
       }
    }
    setLoading(false);
  };

  const updateActiveSlide = (field: string, val: any) => {
    setProjects(prev => prev.map(p => p.id === activePid ? {
      ...p, slides: p.slides.map(s => String(s.id) === String(activeSid || p.slides[0].id) ? { ...s, [field]: val } : s)
    } : p));
  };

  const deleteSlide = (id: number) => {
    if (!activeProject || activeProject.slides.length <= 1) return;
    captureHistory();
    const filtered = activeProject.slides.filter(s => String(s.id) !== String(id));
    setProjects(prev => prev.map(p => p.id === activePid ? { ...p, slides: filtered } : p));
    if (filtered.length > 0) setActiveSid(String(filtered[0].id));
  };

  const onDragStart = (idx: number) => {
    captureHistory();
    setDragIdx(idx);
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (idx: number) => {
    if (dragIdx === null || !activeProject) return;
    const items = [...activeProject.slides];
    const draggedSlide = items[dragIdx];
    const targetSlide = items[idx];
    if (draggedSlide?.isFixed || targetSlide?.isFixed) {
        setDragIdx(null);
        return;
    }
    const [moved] = items.splice(dragIdx, 1);
    items.splice(idx, 0, moved);
    setProjects(prev => prev.map(p => p.id === activePid ? { ...p, slides: items } : p));
    setDragIdx(null);
  };

  const TrackingView = () => {
    const [sessions, setSessions] = useState<any[]>([]);
    
    useEffect(() => {
       if (view !== 'tracking') return;
       import('firebase/firestore').then(({ collection, getDocs, query, orderBy }) => {
          Promise.all(projects.map(p => 
             getDocs(query(collection(db, 'projects', p.id, 'sessions'), orderBy('startedAt', 'desc')))
             .then(snaps => snaps.docs.map(s => ({ ...s.data(), id: s.id, projectId: p.id, projectName: p.name })))
          )).then(results => {
             setSessions(results.flat().sort((a: any, b: any) => b.startedAt - a.startedAt));
          }).catch(console.error);
       });
    }, [view, projects]);

    return (
      <div className="flex-1 overflow-auto bg-[#F4F4F1] p-6 lg:p-12 custom-scrollbar-vertical">
         <div className="max-w-6xl mx-auto border-2 border-black bg-white p-8 md:p-12 shadow-[12px_12px_0_0_#000]">
            <h1 className="text-3xl lg:text-4xl font-serif font-black italic uppercase text-black mb-8 border-b-2 border-black pb-4">VC Tracking Log</h1>
               {sessions.length === 0 ? (
                  <div className="text-center text-gray-500 font-mono py-12 uppercase text-xs tracking-widest border border-dashed border-gray-300">No viewership data yet</div>
               ) : (
                  <div className="overflow-x-auto">
                     <table className="w-full text-left font-mono text-sm whitespace-nowrap">
                        <thead>
                           <tr className="border-b-2 border-black text-[10px] uppercase tracking-widest text-gray-500">
                              <th className="pb-4 pr-6 font-normal">VC Name</th>
                              <th className="pb-4 pr-6 font-normal">Pitch Room</th>
                              <th className="pb-4 pr-6 font-normal">Viewed At</th>
                              <th className="pb-4 pr-6 font-normal">Time Spent</th>
                              <th className="pb-4 font-normal">Feedback</th>
                           </tr>
                        </thead>
                        <tbody>
                           {sessions.map(s => (
                              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                 <td className="py-4 pr-6">
                                    <div className="font-bold text-black">{s.name}</div>
                                    <div className="text-[10px] text-gray-400 mt-1">{s.email}</div>
                                 </td>
                                 <td className="py-4 pr-6 text-xs bg-white border border-gray-100 flex flex-col items-start px-3 py-2 rounded shadow-sm relative -top-1">
                                    <span className="font-bold text-black border-b border-gray-100 pb-1 mb-1 w-full">{s.projectName}</span>
                                    <span className="text-[10px] text-gray-500 font-mono">PIN: <span className="font-bold text-black">{projects.find(p => p.id === s.projectId)?.pinCode || 'No PIN'}</span></span>
                                 </td>
                                 <td className="py-4 pr-6 text-xs">{new Date(s.startedAt).toLocaleString()}</td>
                                 <td className="py-4 pr-6 text-xs">{Math.floor((s.timeSpent || 0) / 60)} min {Math.floor((s.timeSpent || 0) % 60)} sec</td>
                                 <td className="py-4">
                                    {s.hasFeedback ? <span className="bg-black text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest">Yes</span> : <span className="text-gray-400 px-3 py-1.5 text-[10px] uppercase border border-gray-200">No</span>}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}
         </div>
      </div>
    );
  };

  const Dashboard = () => (
    <div className="flex-1 bg-[#F4F4F1] p-6 lg:p-12 overflow-y-auto md:border-l-2 border-black relative">
      <div className="absolute inset-0 bg-dot-pattern opacity-10"></div>
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-8 lg:mb-16 flex flex-col gap-2 border-b-2 border-black pb-8">
          <p className="text-[10px] font-mono tracking-widest uppercase mb-1">Project Stream / Rooms</p>
          <h1 className="text-5xl lg:text-7xl font-sans font-black tracking-tighter leading-none">INVESTMENT<br/>ROOMS</h1>
        </header>

        <div className="bg-white border-2 border-black p-6 md:p-8 shadow-[8px_8px_0_0_#000] mb-8 lg:mb-12">
           <h2 className="text-xl md:text-2xl font-black italic uppercase mb-2">Angel / VC Access</h2>
           <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mb-4">Enter the access code provided by the founder:</p>
           <form className="flex flex-col sm:flex-row shadow-[4px_4px_0_0_#000] border-2 border-black" onSubmit={async (e) => {
              e.preventDefault();
              setHomeError("");
              const frm = new FormData(e.target as HTMLFormElement);
              let code = (frm.get('code') as string).trim();
              if (!code) return;
              
              if (code.startsWith('http')) {
                 try {
                     const url = new URL(code);
                     const r = url.searchParams.get('room');
                     if (r) {
                        window.location.href = `/?room=${r}`;
                        return;
                     }
                 } catch (e) {}
              }
              
              const btn = (e.target as HTMLFormElement).querySelector('button');
              if (btn) btn.innerHTML = "SEARCHING...";
              
              import('firebase/firestore').then(async ({ doc, getDoc }) => {
                 try {
                     const pinSnap = await getDoc(doc(db, 'pinCodes', code));
                     if (!pinSnap.exists()) {
                        setHomeError('Invalid or expired Access Code.');
                        if (btn) btn.innerHTML = "VIEW PITCH";
                     } else {
                        window.location.href = `/?room=${pinSnap.data().projectId}`;
                     }
                 } catch (e) {
                     setHomeError('Error finding room.');
                     if (btn) btn.innerHTML = "VIEW PITCH";
                 }
              });
           }}>
              <input name="code" className="flex-1 p-3 md:p-4 font-mono text-sm border-b-2 sm:border-b-0 sm:border-r-2 border-black focus:outline-none focus:bg-gray-50" placeholder="Paste Link or Code (e.g. A@7x9T&!)" />
              <button type="submit" className="bg-black text-white font-bold uppercase tracking-widest px-6 py-4 hover:bg-gray-800 transition-colors">View Pitch</button>
           </form>
           {homeError && <p className="mt-4 text-red-500 font-mono text-xs font-bold uppercase tracking-widest text-center">{homeError}</p>}
        </div>

        {!user && (
           <div className="bg-yellow-100 border-2 border-yellow-500 p-6 mb-8 text-sm flex flex-col gap-2 shadow-[4px_4px_0_0_#eab308]">
              <p className="text-xl uppercase italic font-black font-serif tracking-tight">Please log in to manage your Pitch Rooms</p>
              <p className="text-xs font-mono mt-1 font-bold text-gray-700">Data is isolated by Google Account. If you log in with a different account later, you will not see these rooms.</p>
           </div>
        )}

        {isInitialLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white border-2 border-black shadow-[8px_8px_0_0_#000]">
               <div className="w-12 h-12 border-4 border-black border-t-transparent animate-spin rounded-full"></div>
               <p className="font-mono text-[10px] uppercase tracking-widest font-bold">Synchronizing Pitch Rooms...</p>
            </div>
        ) : user && projects.length === 0 && (
           <div className="bg-white border-2 border-black p-8 text-center shadow-[8px_8px_0_0_#000] mb-8">
              <h2 className="text-2xl font-black italic uppercase mb-2">Welcome!</h2>
              <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mb-6">You don't have any pitch rooms yet.</p>
              <button 
                 onClick={() => user ? setModal({ type: 'new' }) : setHomeError('Please sign in with Google to create rooms.')} 
                 className="px-6 py-3 bg-black text-white hover:bg-gray-800 flex items-center justify-center gap-2 mx-auto focus:ring-2 focus:ring-offset-2 focus:ring-black">
                <Plus size={18} /> Create Your First Room
              </button>
           </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {projects.map(project => (
            <div key={project.id} className="bg-white min-h-[320px] p-6 lg:p-8 border-2 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-[4px] hover:translate-x-[4px] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all group relative flex flex-col justify-between rounded-none overflow-hidden">
               <div className="absolute top-0 right-0 flex border-b-2 border-l-2 border-black bg-white group-hover:bg-[#F4F4F1] transition-colors">
                  <button onClick={(e) => {
                    e.stopPropagation();
                    exportProjectData(project);
                  }} title="Export Pitch Data" className="p-3 border-r-2 border-black text-black hover:bg-black hover:text-white transition-colors">
                    <Download size={16} />
                  </button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setModal({ type: 'copy', data: project });
                  }} title="Duplicate Room" className="p-3 border-r-2 border-black text-black hover:bg-black hover:text-white transition-colors">
                    <Copy size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'del', data: project.id }); }} title="Delete Room" className="p-3 text-black hover:bg-black hover:text-white transition-colors"><Trash2 size={16} /></button>
               </div>
               
               <div className="pt-6">
                  <div className="w-16 h-16 bg-black text-white flex items-center justify-center mb-6 rounded-full overflow-hidden border-2 border-black bg-cover bg-center" style={project.slides?.[0]?.imageUrl ? { backgroundImage: `url(${project.slides[0].imageUrl})` } : {}}>
                     {!project.slides?.[0]?.imageUrl && <Layers size={24} />}
                  </div>
                  <h3 className="text-3xl font-serif font-black text-black italic tracking-tighter leading-tight mb-2 truncate">{project.name}</h3>
                  <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">{(project.slides || []).length} INTERACTIVE SLIDES</p>
               </div>
               
               <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button onClick={() => { setActivePid(project.id); setActiveSid((project.slides || [])[0]?.id); setView('editor'); }} className="flex-1 bg-black text-white py-3 font-mono font-bold text-[10px] uppercase tracking-widest hover:bg-white hover:text-black border-2 border-black transition-colors rounded-none">Builder</button>
                  <button onClick={() => { setActivePid(project.id); setView('preview'); }} className="flex-1 sm:flex-none sm:px-6 border-2 border-black text-black py-3 font-mono font-bold text-[10px] uppercase hover:bg-black hover:text-white transition-colors rounded-none flex items-center justify-center">Preview</button>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const EditorView = () => (
    <div className="flex-1 flex flex-row bg-[#F4F4F1] overflow-hidden text-black font-sans relative z-10 w-full h-full">
      <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} shrink-0 bg-white border-r-2 border-black transition-all duration-300 flex flex-col z-50 overflow-hidden relative`}>
         <div className="h-16 border-b-2 border-black flex items-center justify-between px-4 shrink-0 bg-[#F4F4F1]">
            {isSidebarOpen && <span className="font-serif font-black italic truncate pr-4">{activeProject?.name}</span>}
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
            <button onClick={async () => {
              let p: any = activeProject;
              if (!p.pinCode) {
                 const pin = generateSecurePin();
                 p = { ...p, pinCode: pin };
                 import('firebase/firestore').then(({ doc, setDoc, serverTimestamp }) => {
                    setDoc(doc(db, 'projects', p.id), { pinCode: pin, updatedAt: serverTimestamp() }, { merge: true });
                    setDoc(doc(db, 'pinCodes', pin), { projectId: p.id }, { merge: true });
                 });
                 setProjects(prev => prev.map(proj => proj.id === p.id ? p : proj));
              } else {
                 // Ensure existing projects have their pinCodes registered
                 import('firebase/firestore').then(({ doc, setDoc }) => {
                    setDoc(doc(db, 'pinCodes', p.pinCode), { projectId: p.id }, { merge: true }).catch(() => {});
                 });
              }
              setModal({ type: 'share' });
            }} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-100 transition-colors w-full text-left group">
              <Share2 size={18} className="shrink-0 group-hover:scale-110 transition-transform" />
              {isSidebarOpen && <span className="text-[10px] font-mono font-bold uppercase tracking-widest leading-none mt-1">
                Share Pitch Room
              </span>}
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
               onPrevSlide={() => {
                 const sl = activeProject?.slides || [];
                 const idx = sl.findIndex(s => s.id === activeSlide?.id);
                 if (idx > 0) setActiveSid(sl[idx - 1].id);
               }}
               onNextSlide={() => {
                 const sl = activeProject?.slides || [];
                 const idx = sl.findIndex(s => s.id === activeSlide?.id);
                 if (idx >= 0 && idx < sl.length - 1) setActiveSid(sl[idx + 1].id);
               }}
               canPrev={(activeProject?.slides?.findIndex(s => s.id === activeSlide?.id) ?? -1) > 0}
               canNext={(activeProject?.slides?.findIndex(s => s.id === activeSlide?.id) ?? -1) < (activeProject?.slides?.length ?? 0) - 1}
               captureHistory={captureHistory}
            />
          )}
        </AnimatePresence>

        <div className={`flex-1 flex flex-col overflow-hidden justify-center relative z-10 w-full h-full min-h-[0] ${isFrameless ? '' : 'p-4 lg:p-8'}`}>
          <div className={`w-full flex-1 min-h-[0] ${isFrameless ? 'bg-gray-50' : 'bg-white border-2 border-black shadow-[8px_8px_0_0_#000]'} overflow-hidden relative flex flex-col group`}>
             
             {!isFrameless && (
               <div className="h-8 border-b-2 border-black bg-[#F4F4F1] flex items-center px-4 justify-between shrink-0">
                 <div className="flex gap-2">
                   <div className="w-2.5 h-2.5 border border-black rounded-full bg-white"></div>
                   <div className="w-2.5 h-2.5 border border-black rounded-full bg-white"></div>
                   <div className="w-2.5 h-2.5 border border-black rounded-full bg-white"></div>
                 </div>
                 <div className="flex gap-4">
                   <button onClick={() => setFitToFrame(!fitToFrame)} className="text-[9px] font-mono uppercase font-bold text-gray-500 hover:text-black">
                     {fitToFrame ? 'Original Size' : 'Fit to Frame'}
                   </button>
                   <button onClick={() => setIsFrameless(true)} className="text-[9px] font-mono uppercase font-bold text-gray-500 hover:text-black">Hide Frame</button>
                 </div>
               </div>
             )}
             
             {isFrameless && (
                <div className="absolute top-4 right-4 z-50 flex gap-2">
                  <button onClick={() => setFitToFrame(!fitToFrame)} className="bg-white border-2 border-black text-[9px] font-mono font-bold uppercase tracking-widest px-3 py-1.5 shadow-[2px_2px_0_0_#000] hover:bg-black hover:text-white hover:translate-y-[2px] hover:translate-x-[2px] transition-all">
                     {fitToFrame ? 'Original Size' : 'Fit to Frame'}
                  </button>
                  <button onClick={() => setIsFrameless(false)} className="bg-white border-2 border-black text-[9px] font-mono font-bold uppercase tracking-widest px-3 py-1.5 shadow-[2px_2px_0_0_#000] hover:bg-black hover:text-white hover:translate-y-[2px] hover:translate-x-[2px] transition-all">
                    Show Frame
                  </button>
                </div>
             )}

            <div className={`flex-1 relative flex items-center justify-center overflow-hidden w-full min-h-0 min-w-0 ${isFrameless ? '' : 'bg-gray-50'}`}>
              <div className={`relative flex items-center justify-center w-full h-full min-h-0 min-w-0 ${isFrameless || !activeSlide?.imageUrl ? '' : 'p-4 md:p-8'}`}>
                <div className={`relative flex items-center justify-center w-full h-full min-h-0 min-w-0 ${isFrameless || !activeSlide?.imageUrl ? '' : 'shadow-[12px_12px_0_0_rgba(0,0,0,0.1)] border border-black/10 bg-white'}`}>
                {activeSlide?.imageUrl ? (
                  <img src={activeSlide.imageUrl} className={`block shrink-0 ${fitToFrame ? 'w-full h-full object-contain absolute inset-0' : 'max-w-none'}`} alt={activeSlide.title} />
                ) : activeSlide?.isFixed ? (
                  <div className={`w-full h-full flex flex-col items-center justify-center p-12 text-center relative ${isFrameless ? '' : 'bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)] border-2 border-black m-4'}`}>
                     <h1 className="text-black font-serif text-3xl md:text-5xl font-black italic mb-6 tracking-tighter uppercase">{activeSlide?.title}</h1>
                     <div className={`w-24 h-1 mb-8 mx-auto ${isFrameless ? 'bg-white/50' : 'bg-black'}`}></div>
                        <textarea 
                           className={`text-xl md:text-2xl font-mono leading-relaxed max-w-4xl w-full h-[60vh] text-center bg-transparent resize-none focus:outline-none custom-scrollbar-vertical ${isFrameless ? 'text-gray-300' : 'text-gray-600'}`} 
                           value={activeSlide.content || ''}
                           readOnly={activeSlide.id === 'vc-feedback'}
                           onChange={(e) => {
                              if (activeProject) {
                                  updateSlideField(activeProject.id, activeSlide.id, 'content', e.target.value);
                              }
                           }}
                           placeholder={activeSlide.id === 'founder-note' ? "Type founder notes here..." : "Read VC feedback here..."}
                        />
                  </div>
                ) : (
                  <div className={`w-full h-full flex flex-col items-center justify-center p-12 text-center shadow-sm border border-gray-100 ${isFrameless ? '' : 'bg-white m-4'}`}>
                     <div className="p-8 border-2 border-black mb-8 bg-white rounded-full shadow-[4px_4px_0_0_#000]">
                        <ImageIcon size={48} className="text-black opacity-30" />
                     </div>
                     <h1 className="text-black font-serif text-3xl md:text-5xl font-black italic mb-4">{activeSlide?.title || "Empty Canvas"}</h1>
                     <div className="mt-8">
                        <label htmlFor="file-main" className="bg-white text-black border-2 border-black px-8 py-3 text-[10px] font-mono font-bold uppercase tracking-widest cursor-pointer hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0_0_#000]">Import Asset</label>
                        <input type="file" id="file-main" multiple className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,.webp" />
                     </div>
                  </div>
                )}

                {[1, 2, 3].map(num => {
                  const ytMarker = activeSlide?.[`youtubeMarker${num}`];
                  const galMarker = activeSlide?.[`galleryMarker${num}`];
                  const noteMarker = activeSlide?.[`noteMarker${num}`];
                  const docMarker = activeSlide?.[`docMarker${num}`];
                  
                  return (
                    <React.Fragment key={num}>
                      {ytMarker && (
                        <div 
                          className="absolute cursor-move z-30 group"
                          style={{ left: `${ytMarker.x}%`, top: `${ytMarker.y}%`, transform: 'translate(-50%, -50%)' }}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if ((e.target as HTMLElement).closest('button')) return;
                            const parent = e.currentTarget.parentElement;
                            if (!parent) return;
                            const rect = parent.getBoundingClientRect();
                            const handleMove = (moveEvent: MouseEvent) => {
                               const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
                               const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
                               updateActiveSlide(`youtubeMarker${num}`, { ...ytMarker, x, y });
                            };
                            const handleUp = () => {
                               window.removeEventListener('pointermove', handleMove);
                               window.removeEventListener('pointerup', handleUp);
                            };
                            window.addEventListener('pointermove', handleMove);
                            window.addEventListener('pointerup', handleUp);
                          }}
                        >
                           <div className="relative hover:scale-110 active:scale-95 transition-transform">
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 captureHistory();
                                 updateActiveSlide(`youtubeMarker${num}`, null);
                               }}
                               className="absolute -top-2 -right-2 bg-black text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-40 hover:scale-110 shadow-lg border border-white"
                             >
                               <X size={10} />
                             </button>
                             <div className="bg-red-600 text-white p-1.5 md:p-2 rounded-full shadow-lg border border-black flex items-center gap-1 md:pr-3 whitespace-nowrap">
                               <Youtube size={16} /> <span className="hidden md:inline text-[9px] font-mono font-bold uppercase tracking-widest">Play {num > 1 ? num : ''}</span>
                             </div>
                           </div>
                        </div>
                      )}
                      
                      {galMarker && galMarker.images && galMarker.images.length > 0 && (
                        <div 
                          className="absolute cursor-move z-30 group"
                          style={{ left: `${galMarker.x}%`, top: `${galMarker.y}%`, transform: 'translate(-50%, -50%)' }}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if ((e.target as HTMLElement).closest('button')) return;
                            const parent = e.currentTarget.parentElement;
                            if (!parent) return;
                            const rect = parent.getBoundingClientRect();
                            const handleMove = (moveEvent: MouseEvent) => {
                               const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
                               const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
                               updateActiveSlide(`galleryMarker${num}`, { ...galMarker, x, y });
                            };
                            const handleUp = () => {
                               window.removeEventListener('pointermove', handleMove);
                               window.removeEventListener('pointerup', handleUp);
                            };
                            window.addEventListener('pointermove', handleMove);
                            window.addEventListener('pointerup', handleUp);
                          }}
                        >
                           <div className="relative hover:scale-110 active:scale-95 transition-transform">
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 captureHistory();
                                 updateActiveSlide(`galleryMarker${num}`, null);
                               }}
                               className="absolute -top-2 -right-2 bg-black text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-40 hover:scale-110 shadow-lg border border-white"
                             >
                               <X size={10} />
                             </button>
                             <div className="bg-blue-600 text-white p-1.5 md:p-2 rounded-full shadow-lg border border-black flex items-center gap-1 md:pr-3 whitespace-nowrap">
                               <ImageIcon size={16} /> <span className="hidden md:inline text-[9px] font-mono font-bold uppercase tracking-widest">Gallery {num}</span>
                             </div>
                           </div>
                        </div>
                      )}

                      {noteMarker && noteMarker.text && (
                        <div 
                          className="absolute cursor-move z-30 group"
                          style={{ left: `${noteMarker.x}%`, top: `${noteMarker.y}%`, transform: 'translate(-50%, -50%)' }}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if ((e.target as HTMLElement).closest('button')) return;
                            const parent = e.currentTarget.parentElement;
                            if (!parent) return;
                            const rect = parent.getBoundingClientRect();
                            const handleMove = (moveEvent: MouseEvent) => {
                               const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
                               const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
                               updateActiveSlide(`noteMarker${num}`, { ...noteMarker, x, y });
                            };
                            const handleUp = () => {
                               window.removeEventListener('pointermove', handleMove);
                               window.removeEventListener('pointerup', handleUp);
                            };
                            window.addEventListener('pointermove', handleMove);
                            window.addEventListener('pointerup', handleUp);
                          }}
                        >
                           <div className="relative hover:scale-110 active:scale-95 transition-transform">
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 captureHistory();
                                 updateActiveSlide(`noteMarker${num}`, null);
                               }}
                               className="absolute -top-2 -right-2 bg-black text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-40 hover:scale-110 shadow-lg border border-white"
                             >
                               <X size={10} />
                             </button>
                             <div className="bg-yellow-400 text-black p-1.5 md:p-2 rounded-full shadow-lg border border-black flex items-center gap-1 md:pr-3 whitespace-nowrap">
                               <FileText size={16} /> <span className="hidden md:inline text-[9px] font-mono font-bold uppercase tracking-widest">Read Note</span>
                             </div>
                           </div>
                        </div>
                      )}

                      {docMarker && docMarker.url && (
                        <div 
                          className="absolute cursor-move z-30 group"
                          style={{ left: `${docMarker.x}%`, top: `${docMarker.y}%`, transform: 'translate(-50%, -50%)' }}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if ((e.target as HTMLElement).closest('button')) return;
                            const parent = e.currentTarget.parentElement;
                            if (!parent) return;
                            const rect = parent.getBoundingClientRect();
                            const handleMove = (moveEvent: MouseEvent) => {
                               const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
                               const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
                               updateActiveSlide(`docMarker${num}`, { ...docMarker, x, y });
                            };
                            const handleUp = () => {
                               window.removeEventListener('pointermove', handleMove);
                               window.removeEventListener('pointerup', handleUp);
                            };
                            window.addEventListener('pointermove', handleMove);
                            window.addEventListener('pointerup', handleUp);
                          }}
                        >
                           <div className="relative hover:scale-110 active:scale-95 transition-transform">
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 captureHistory();
                                 updateActiveSlide(`docMarker${num}`, null);
                               }}
                               className="absolute -top-2 -right-2 bg-black text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-40 hover:scale-110 shadow-lg border border-white"
                             >
                               <X size={10} />
                             </button>
                             <div className="bg-purple-500 text-white p-1.5 md:p-2 rounded-full shadow-lg border border-black flex items-center gap-1 md:pr-3 whitespace-nowrap">
                               <FileText size={16} /> <span className="hidden md:inline text-[9px] font-mono font-bold uppercase tracking-widest">Doc {num}</span>
                             </div>
                           </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {activeSlide?.showNarrative && (
            <div className="w-full mt-4 shrink-0 bg-white border-2 border-black shadow-[8px_8px_0_0_#000] flex flex-col z-20">
              <div className="flex items-center justify-between px-4 py-2 border-b-2 border-black bg-[#F4F4F1] shrink-0">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black">Narrative Detail</span>
                <div className="flex items-center gap-2">
                  {activeSlide?.audioUrl ? (
                    <div className="flex items-center gap-3 bg-black text-white px-2 py-0.5 border border-black h-7 rounded-sm">
                      <audio src={activeSlide.audioUrl} controls className="h-6 w-32 shrink-0 md:w-48" style={{ height: '20px' }} />
                      <button onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        captureHistory();
                        updateActiveSlide('audioUrl', null);
                      }} className="hover:text-red-400 shrink-0"><Trash2 size={12}/></button>
                    </div>
                  ) : isRecording ? (
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStopRecording(); }}
                      className="flex items-center gap-2 border border-black px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest transition-colors bg-red-500 text-white animate-pulse shadow-[2px_2px_0_0_#b91c1c] translate-y-[2px] translate-x-[2px] h-7"
                    >
                       <Square size={12} className="fill-current" /> Stop Record
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); audioInputRef.current?.click(); }}
                        className="flex items-center gap-2 border border-black px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest transition-colors bg-white hover:bg-black hover:text-white shadow-[2px_2px_0_0_#000] h-7"
                      >
                         <Upload size={12} /> Import Audio
                       </button>
                       <button 
                         onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStartRecording(); }}
                         className="flex items-center gap-2 border border-black px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest transition-colors bg-white hover:bg-black hover:text-white shadow-[2px_2px_0_0_#000] h-7"
                       >
                         <Mic size={12} /> Record Voice
                       </button>
                    </>
                  )}
                  <input type="file" ref={audioInputRef} onChange={handleAudioUpload} accept="audio/*" className="hidden" />
                </div>
              </div>
              <textarea 
                rows={Math.max(1, (activeSlide?.content || '').split('\n').length)}
                className="w-full px-4 py-3 md:px-6 md:py-4 text-sm md:text-lg bg-black text-white text-center font-serif italic leading-relaxed focus:outline-none resize-none placeholder:text-gray-600 block shrink-0"
                value={activeSlide?.content || ''}
                onFocus={captureHistory}
                onChange={(e) => updateActiveSlide('content', e.target.value)}
                placeholder="Type your narrative here..."
              />
            </div>
          )}
        </div>

        <div style={{ height: timelineHeight }} className="bg-white border-t-2 border-black flex flex-col shrink-0 z-40 relative">
          <div 
            className="absolute top-0 left-0 right-0 h-2 -mt-1 cursor-ns-resize hover:bg-black/20 z-50 transition-colors" 
            onMouseDown={(e) => { isResizing.current = true; e.preventDefault(); }} 
          />
          <div className="px-6 h-8 shrink-0 border-b-2 border-black flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-black bg-[#F4F4F1]">
             <div className="flex items-center gap-3">
               <MoveHorizontal size={14} /> <span>Sequence Flow</span>
               <div className="flex items-center gap-1 border-l-2 border-black/20 pl-3 ml-2">
                 <button onClick={handleUndo} disabled={pastProjects.length === 0} className={`p-0.5 rounded-sm border border-transparent ${pastProjects.length === 0 ? 'opacity-30' : 'hover:bg-black hover:text-white transition-colors'}`}><Undo2 size={12} /></button>
                 <button onClick={handleRedo} disabled={futureProjects.length === 0} className={`p-0.5 rounded-sm border border-transparent ${futureProjects.length === 0 ? 'opacity-30' : 'hover:bg-black hover:text-white transition-colors'}`}><Redo2 size={12} /></button>
               </div>
             </div>
             {loading && <div className="text-black animate-pulse flex items-center gap-2 bg-white px-2 py-1 border border-black"><FileSearch size={12}/> <span>AI Parsing Context</span></div>}
          </div>
          
          <div className="flex-1 overflow-x-auto flex items-center px-6 gap-3 py-3 custom-scrollbar-horizontal bg-white overflow-y-hidden">
             {activeProject?.slides.map((slide, idx) => !slide.isFixed && (
                <div 
                  key={slide.id} 
                  draggable={!slide.isFixed} 
                  onDragStart={(e) => { if (!slide.isFixed) onDragStart(idx); else e.preventDefault(); }} 
                  onDragOver={(e) => { if (!slide.isFixed) onDragOver(e); }} 
                  onDrop={(e) => { if (!slide.isFixed) onDrop(idx); }}
                  className={`relative flex-shrink-0 group h-full aspect-[4/3] ${slide.isFixed ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
                >
                  <button 
                    onClick={() => { setActiveSid(String(slide.id)); setIsEditorOpen(false); }}
                    className={`w-full h-full border-2 transition-colors relative flex flex-col rounded-none overflow-hidden ${String(activeSid) === String(slide.id) ? 'border-black bg-gray-100 shadow-[4px_4px_0_0_#000]' : 'border-gray-200 hover:border-black bg-white'}`}
                  >
                    <div className="flex-1 w-full flex items-center justify-center p-1 bg-gray-50 relative overflow-hidden">
                      {slide.imageUrl ? (
                        <img src={slide.imageUrl} className="w-full h-full object-contain relative z-10" alt="thumb" />
                      ) : (
                        <FileText size={20} className="text-gray-300 relative z-10 shrink-0" />
                      )}
                    </div>
                    <div className={`h-7 w-full border-t flex-shrink-0 border-gray-200 px-2 flex items-center justify-start group-hover:bg-black group-hover:text-white transition-colors ${slide.isFixed ? 'bg-yellow-100/50' : 'bg-[#F4F4F1]'}`}>
                       <span className="text-[8px] font-mono font-bold uppercase tracking-wider truncate shrink-0">{slide.title || `P.${idx + 1}`}</span>
                    </div>
                  </button>
                  {!slide.isFixed && <button onClick={(e) => { e.stopPropagation(); deleteSlide(slide.id); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 border-2 border-black hover:bg-black w-6 h-6 flex items-center justify-center"><X size={12}/></button>}
                </div>
             ))}

             <div className="flex-shrink-0 h-full aspect-[4/3]">
               <input type="file" id="import-seq" multiple className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,.webp" />
               <label htmlFor="import-seq" className="w-full h-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-black hover:bg-black hover:text-white transition-colors cursor-pointer bg-[#F4F4F1] relative">
                 <Plus size={20} className="mb-1" />
                 <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-center">Add<br/>Media</span>
               </label>
             </div>

             {activeProject?.slides.map((slide, idx) => slide.isFixed && (
                <div 
                  key={slide.id} 
                  draggable={!slide.isFixed} 
                  onDragStart={(e) => { if (!slide.isFixed) onDragStart(idx); else e.preventDefault(); }} 
                  onDragOver={(e) => { if (!slide.isFixed) onDragOver(e); }} 
                  onDrop={(e) => { if (!slide.isFixed) onDrop(idx); }}
                  className={`relative flex-shrink-0 group h-full aspect-[4/3] ${slide.isFixed ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
                >
                  <button 
                    onClick={() => { setActiveSid(String(slide.id)); setIsEditorOpen(false); }}
                    className={`w-full h-full border-2 transition-colors relative flex flex-col rounded-none overflow-hidden ${String(activeSid) === String(slide.id) ? 'border-black bg-gray-100 shadow-[4px_4px_0_0_#000]' : 'border-gray-200 hover:border-black bg-white'}`}
                  >
                    <div className="flex-1 w-full flex items-center justify-center p-1 bg-gray-50 relative overflow-hidden">
                      {slide.imageUrl ? (
                        <img src={slide.imageUrl} className="w-full h-full object-contain relative z-10" alt="thumb" />
                      ) : (
                        <FileText size={20} className="text-gray-300 relative z-10 shrink-0" />
                      )}
                    </div>
                    <div className={`h-7 w-full border-t flex-shrink-0 border-gray-200 px-2 flex items-center justify-start group-hover:bg-black group-hover:text-white transition-colors ${slide.isFixed ? 'bg-yellow-100/50' : 'bg-[#F4F4F1]'}`}>
                       <span className="text-[8px] font-mono font-bold uppercase tracking-wider truncate shrink-0">{slide.title || `P.${idx + 1}`}</span>
                    </div>
                  </button>
                  {!slide.isFixed && <button onClick={(e) => { e.stopPropagation(); deleteSlide(slide.id); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 border-2 border-black hover:bg-black w-6 h-6 flex items-center justify-center"><X size={12}/></button>}
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#F4F4F1] font-sans text-black overflow-hidden relative">
      <div className="absolute inset-0 bg-dot-pattern opacity-10 pointer-events-none z-0"></div>
      
      {(view === 'dashboard' || view === 'tracking') && (
        <div className="w-full md:w-80 md:h-full bg-white flex flex-col text-black py-6 md:py-10 z-50 border-b-2 md:border-b-0 md:border-r-2 border-black shrink-0 relative">
          <div className="px-6 md:px-10 md:mb-16 flex items-center justify-between md:justify-start gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-black text-white border-2 border-black flex items-center justify-center font-bold text-base md:text-lg font-serif">PT</div>
              <span className="text-2xl md:text-3xl font-black tracking-tighter uppercase font-sans leading-tight">PITCH<br className="hidden md:block"/>TANK</span>
            </div>
            <button onClick={() => user ? setModal({ type: 'new' }) : setHomeError('Please sign in with Google to create rooms.')} className="md:hidden flex items-center justify-center w-10 h-10 border-2 border-black bg-white text-black shrink-0 hover:bg-black hover:text-white transition-colors">
              <Plus size={20} />
            </button>
          </div>
          <nav className="hidden md:flex flex-1 flex-col space-y-4 px-8 mt-6 md:mt-0">
            <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-4 px-6 py-4 border-2 border-black transition-all rounded-none ${view === 'dashboard' ? 'bg-black text-white shadow-[4px_4px_0_0_#000]' : 'bg-white text-black hover:bg-gray-100'}`}>
              <LayoutDashboard size={20} />
              <span className="font-mono font-bold text-[10px] uppercase tracking-widest">Rooms</span>
            </button>
            <button onClick={() => user ? setModal({ type: 'new' }) : setHomeError('Please sign in with Google to create rooms.')} className="w-full flex items-center gap-4 px-6 py-4 border-2 border-black bg-white text-black transition-all hover:shadow-[4px_4px_0_0_#000] rounded-none">
              <Plus size={20} />
              <span className="font-mono font-bold text-[10px] uppercase tracking-widest">New Room</span>
            </button>
            <button onClick={() => setView('tracking')} className={`w-full flex items-center gap-4 px-6 py-4 border-2 border-black transition-all rounded-none ${view === 'tracking' ? 'bg-black text-white shadow-[4px_4px_0_0_#000]' : 'bg-white text-black hover:bg-gray-100'}`}>
              <Share2 size={20} />
              <span className="font-mono font-bold text-[10px] uppercase tracking-widest">Tracking</span>
            </button>
          </nav>
          
          <div className="px-8 mt-auto hidden md:block">
            {user ? (
               <div className="flex flex-col gap-2">
                 <p className="text-[10px] font-mono tracking-widest uppercase truncate text-gray-500">{user.email}</p>
                 <button onClick={() => {
                    signOut(auth).then(() => {
                        setProjects([]);
                        setActivePid(null);
                        setActiveSid(null);
                        setVisitorInfo(null);
                        setSharedProjectData(null);
                        lastSavedProjectsRef.current = [];
                        window.location.href = '/';
                    });
                 }} className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-black bg-white text-black hover:bg-gray-100 transition-colors">
                    <span className="font-mono font-bold text-[10px] uppercase tracking-widest">Sign Out</span>
                 </button>
               </div>
            ) : (
               <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-black bg-black text-white hover:bg-white hover:text-black transition-colors">
                  <span className="font-mono font-bold text-[10px] uppercase tracking-widest">Sign in with Google</span>
               </button>
            )}
          </div>
        </div>
      )}

      {view === 'dashboard' && Dashboard()}
      {view === 'tracking' && TrackingView()}
      {view === 'editor' && (activeProject ? EditorView() : <div className="flex-1 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-gray-400">Loading Room...</div>)}
      {view === 'preview' && (activeProject ? <PreviewRoom project={activeProject} onBack={() => setView('editor')} onUpdateSlide={(sid, field, val) => updateSlideField(activeProject.id, sid, field, val)} initialSid={activeSid} visitorSessionId={visitorInfo?.sessionId} /> : <div className="flex-1 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-gray-400">Loading Room...</div>)}

      <AnimatePresence>
        {modal.type === 'share' && <ShareModal isOpen={true} project={activeProject} onCancel={() => setModal({ type: null })} />}
        {modal.type === 'new' && <NewProjectModal isOpen={true} onCancel={() => setModal({ type: null })} onConfirm={handleCreateProject} />}
        {modal.type === 'aiKnowledge' && <AIKnowledgeModal isOpen={true} project={activeProject} onCancel={() => setModal({ type: null })} onSave={(files) => {
           setProjects(projects.map(p => p.id === activeProject?.id ? { ...p, aiKnowledgeFiles: files } : p));
        }} />}
        {modal.type === 'del' && <ConfirmationModal isOpen={true} title="Destroy Room?" message="This destroys the pitch flow permanently." onCancel={() => setModal({ type: null })} onConfirm={async () => { 
          setProjects(projects.filter(p => p.id !== modal.data)); 
          if (user) {
             try {
                await deleteDoc(doc(db, 'projects', modal.data));
             } catch (e) {
                console.error("Failed to delete", e);
             }
          }
          setModal({ type: null }); 
        }} confirmText="Delete" />}
        {modal.type === 'copy' && <ConfirmationModal isOpen={true} title="Duplicate Room?" message="Create an exact copy of this pitch deck?" onCancel={() => setModal({ type: null })} onConfirm={() => { setProjects([{ ...modal.data, id: 'p' + Date.now(), name: `${modal.data.name} (Copy)` }, ...projects]); setModal({ type: null }); }} confirmText="Duplicate" />}
      </AnimatePresence>
    </div>
  );
}
