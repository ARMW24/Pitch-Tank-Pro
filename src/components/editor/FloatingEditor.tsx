import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, ChevronLeft, ChevronRight, X, Youtube, ImageIcon, Upload, FileText, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FloatingEditorProps {
  slide: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (field: string, val: any) => void;
  captureHistory: () => void;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  canPrev: boolean;
  canNext: boolean;
  userId: string | undefined;
  handleUndo: () => void;
  handleRedo: () => void;
}

export const FloatingEditor: React.FC<FloatingEditorProps> = ({
  slide,
  isOpen,
  onClose,
  onUpdate,
  captureHistory,
  onPrevSlide,
  onNextSlide,
  canPrev,
  canNext,
  userId,
  handleUndo,
  handleRedo
}) => {
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
  }, [isDragging]);

  const uploadToSupabase = async (file: File | Blob, path: string) => {
    const { data, error } = await supabase.storage.from('assets').upload(path, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(data.path);
    return publicUrl;
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>, num: number) => {
    e.preventDefault();
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;
    
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
       
       if (userId) {
           const path = `users/${userId}/galleries/${Date.now()}_${file.name}`;
           uploadToSupabase(file, path)
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
           <div className="flex items-center gap-1 border-r-2 border-black pr-2 mr-2">
              <button onClick={handleUndo} className="p-1 hover:bg-black hover:text-white transition-colors" title="Undo">
                 <RotateCcw size={16} className="scale-x-[-1]" />
              </button>
              <button onClick={handleRedo} className="p-1 hover:bg-black hover:text-white transition-colors" title="Redo">
                 <RotateCcw size={16} />
              </button>
           </div>
           <div className="flex items-center border-r-2 border-black pr-2 mr-2">
              <button 
                onClick={onPrevSlide} 
                disabled={!canPrev}
                className="p-1 hover:bg-black hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={onNextSlide} 
                disabled={!canNext}
                className="p-1 hover:bg-black hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight size={18} />
              </button>
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
                className={`w-full bg-white border-2 border-black px-4 py-3 text-sm font-serif text-black focus:outline-none focus:bg-gray-50 transition-colors rounded-none min-h-[100px] ${slide.id === 'vc-feedback' ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
                value={slide.content || ''}
                readOnly={slide.id === 'vc-feedback'}
                onFocus={captureHistory}
                onChange={(e) => onUpdate('content', e.target.value)}
                placeholder={slide.id === 'vc-feedback' ? "VCs will type their feedback in the Preview room." : "Slide text content..."}
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
                             <input type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={async (e) => {
                                 const file = e.target.files?.[0];
                                 if (!file) return;
                                 captureHistory();
                                 const tempUrl = URL.createObjectURL(file);
                                 onUpdate(`docMarker${num}`, { 
                                     url: tempUrl, name: file.name,
                                     x: slide[`docMarker${num}`]?.x ?? (70 + num*5), 
                                     y: slide[`docMarker${num}`]?.y ?? (30 + num*10) 
                                 });
                                 if (userId) {
                                    const path = `users/${userId}/docs/${Date.now()}_${file.name}`;
                                    try {
                                       const url = await uploadToSupabase(file, path);
                                       onUpdate(`docMarker${num}`, { ...slide[`docMarker${num}`], url });
                                    } catch (err) {
                                       console.error("Doc upload failed", err);
                                    }
                                 }
                             }} />
                          </label>
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

      <div className="p-4 border-t-2 border-black bg-white flex justify-end">
        <button 
          onClick={onClose}
          className="bg-black text-white px-6 py-2 font-mono font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition-colors"
        >
          Save & Close
        </button>
      </div>
    </motion.div>
  );
};
