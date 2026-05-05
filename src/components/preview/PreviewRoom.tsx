import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Zap, 
  Maximize, X, Youtube, ImageIcon, FileText, Cpu, Headset
} from 'lucide-react';
import { Project } from '../../hooks/useProjects';
import { getGeminiChatResponse } from '../../services/geminiService';
import { supabase } from '../../lib/supabase';

interface PreviewRoomProps {
  project: Project;
  onBack: () => void;
  onUpdateSlide?: (sid: string | number, field: string, val: any) => void;
  initialSid?: string | number | null;
  visitorSessionId?: string | null;
}

export const PreviewRoom: React.FC<PreviewRoomProps> = ({ 
  project, 
  onBack, 
  onUpdateSlide, 
  initialSid, 
  visitorSessionId 
}) => {
  if (!project) return null;
  const slides = project.slides || [];
  const [activeSid, setActiveSid] = useState(initialSid || slides[0]?.id);
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isAIChatOpen) {
      scrollToBottom();
    }
  }, [messages, isAIChatOpen]);

  const currentSlide = slides.find((s: any) => s.id === activeSid) || slides[0] || { id: 'empty', title: 'Untitled', content: '', appendix: {} };
  const slideIndex = Math.max(0, slides.findIndex((s: any) => s.id === activeSid));

  useEffect(() => {
    if (!activeSid && project && slides.length > 0) {
       setActiveSid(slides[0].id);
    }
  }, [activeSid, project, slides]);

  useEffect(() => {
    if (!playAudio && audioRef.current) {
      audioRef.current.pause();
    } else if (playAudio && audioRef.current && currentSlide.audioUrl) {
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
      setActiveSid(slides[slideIndex - 1].id);
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

  const saveFeedback = async () => {
    if (visitorSessionId) {
      try {
        await supabase.from('sessions').update({ has_feedback: true }).eq('id', visitorSessionId);
      } catch (e) {
        console.error("Failed to save feedback status", e);
      }
    }
  };

  return (
    <div className={`flex-1 bg-[#F4F4F1] text-black flex flex-col relative h-full overflow-hidden`}>
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
              
              <div className="flex items-center gap-1 bg-white border-2 border-black pl-1 shrink-0">
                  <button onClick={handlePrev} disabled={slideIndex === 0} className="hover:bg-gray-100 p-1 md:p-1.5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ChevronLeft size={16}/></button>
                  <span className="font-mono font-bold uppercase text-[9px] md:text-[10px] whitespace-nowrap pt-0.5 px-2">Pg {slideIndex + 1} / {slides.length}</span>
                  <button onClick={handleNext} disabled={slideIndex === slides.length - 1} className="hover:bg-gray-100 p-1 md:p-1.5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ChevronRight size={16}/></button>
              </div>

              <button onClick={onBack} className="bg-white border-2 border-black text-black hover:bg-black hover:text-white px-3 py-1.5 md:px-6 md:py-2 font-mono font-bold text-[9px] md:text-[10px] uppercase tracking-widest transition-colors shrink-0 ml-2">Exit</button>
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
                      <div className="w-full h-full relative z-10" onContextMenu={(e) => e.preventDefault()}>
                        <img 
                          src={currentSlide.imageUrl} 
                          className="w-full h-full object-contain pointer-events-none select-none" 
                          alt={currentSlide.title} 
                          onDragStart={(e) => e.preventDefault()}
                        />
                      </div>
                    ) : (
                      <div className={`w-full h-full flex flex-col items-center justify-center text-center relative z-10 px-12 bg-white text-black`}>
                        <h1 className="text-[6vw] font-serif font-black uppercase mb-6 tracking-tighter italic leading-none">{currentSlide.title}</h1>
                        <div className={`w-24 h-1 mb-8 mx-auto bg-black`}></div>
                        {currentSlide.isFixed ? (
                          <textarea 
                             className={`text-2xl font-mono leading-relaxed max-w-4xl w-full h-[60vh] text-center bg-transparent resize-none focus:outline-none custom-scrollbar-vertical text-gray-600`} 
                             value={currentSlide.content || ''}
                             readOnly={(() => {
                                const params = new URLSearchParams(window.location.search);
                                const isVisitor = params.has('room');
                                if (currentSlide.id === 'founder-note' && isVisitor) return true;
                                return false;
                             })()}
                             onChange={(e) => {
                               if (onUpdateSlide) {
                                  onUpdateSlide(currentSlide.id, 'content', e.target.value);
                               }
                             }}
                             onBlur={(e) => {
                                if (currentSlide.id === 'vc-feedback' && e.target.value.trim().length > 0) {
                                   saveFeedback();
                                }
                             }}
                             placeholder={currentSlide.id === 'founder-note' ? "Founder notes are typed in the editor..." : "Type VC feedback here..."}
                          />
                        ) : (
                          <p className={`text-2xl font-mono leading-relaxed max-w-4xl whitespace-pre-wrap text-gray-600`}>{currentSlide.content}</p>
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


                </motion.div>
              </AnimatePresence>
              
              {showSubtitles && currentSlide.content && currentSlide.id !== 'founder-note' && currentSlide.id !== 'vc-feedback' && (
                <div className="bg-black border-t-2 border-black flex flex-col items-center justify-center px-6 md:px-12 shrink-0 relative py-4">
                   <div className="w-full max-w-4xl bg-transparent text-white font-serif italic text-sm md:text-lg leading-relaxed text-center min-h-[64px] flex items-center justify-center whitespace-pre-wrap">
                      {currentSlide.content}
                   </div>
                </div>
              )}
            </div>
            
            {/* Overlays for Video, Gallery, Note, Doc */}
            {/* ... (Same as original) */}
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

      {/* AI Chat Drawer */}
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
             <div className="p-3 border-t-2 border-black bg-[#F4F4F1] flex gap-2">
                <input 
                  className="flex-1 bg-white border-2 border-black px-3 py-2 text-xs font-mono focus:outline-none" 
                  placeholder="Ask founder avatar..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage} className="bg-black text-white p-2 hover:bg-gray-800 transition-colors">
                  <Cpu size={16} />
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
