import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, LayoutDashboard, Target, LogOut, Search, Shield, Zap, 
  ArrowRight, Mail, User as UserIcon, Home, ShieldCheck
} from 'lucide-react';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useProjects, Project } from './hooks/useProjects';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { EditorView } from './components/editor/EditorView';
import { TrackingView } from './components/dashboard/TrackingView';
import { PreviewRoom } from './components/preview/PreviewRoom';
import { LoginView } from './components/LoginView';

// Modals
import { NewProjectModal } from './components/modals/NewProjectModal';
import { ShareModal } from './components/modals/ShareModal';
import { ConfirmationModal } from './components/modals/ConfirmationModal';
import { AIKnowledgeModal } from './components/modals/AIKnowledgeModal';

import * as pdfjsLib from 'pdfjs-dist';
// Initialize PDF.js worker using unpkg which reliably serves the correct module format
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const compressImage = async (file: Blob | File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1080;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(img.src);
        blob ? resolve(blob) : reject(new Error('Canvas to Blob failed'));
      }, 'image/webp', 0.85);
    };
    img.onerror = reject;
  });
};

const extractPdfPages = async (file: File): Promise<Blob[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const blobs: Blob[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for crispness
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width; canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx!, viewport } as any).promise;
    
    // Convert to webp directly from canvas
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to create blob from PDF page')), 'image/webp', 0.85);
    });
    
    // Double compress to ensure it meets max dimensions
    const compressedBlob = await compressImage(blob);
    blobs.push(compressedBlob);
  }
  return blobs;
};

// Utils
import { generateSecurePin, appendFixedSlides } from './utils/helpers';
import { supabase } from './lib/supabase';

function App() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { 
    projects, 
    loading: projectsLoading, 
    createProject, 
    updateProject, 
    deleteProject, 
    findProjectByPin,
    getProject
  } = useProjects(user);

  const [view, setView] = useState<'landing' | 'dashboard' | 'editor' | 'tracking' | 'preview'>('landing');
  const [activePid, setActivePid] = useState<string | null>(null);
  const [activeSid, setActiveSid] = useState<string | number | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  
  // Modals state
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAIKnowledgeModalOpen, setIsAIKnowledgeModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  // Landing / Visitor State
  const [pin, setPin] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorSessionId, setVisitorSessionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  // Audio Ref
  const audioInputRef = useRef<HTMLInputElement>(null);
  const draggedIdxRef = useRef<number | null>(null);

  // History State for Undo/Redo
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const captureHistory = (slides: any[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(slides)));
    if (newHistory.length > 20) {
      newHistory.shift();
    } else {
      setHistoryIndex(newHistory.length - 1);
    }
    setHistory(newHistory);
  };

  const handleUndo = () => {
    const activeProject = projects.find(p => p.id === activePid) || projectToEdit;
    if (historyIndex > 0 && activeProject) {
      const prevSlides = history[historyIndex - 1];
      updateProject(activeProject.id, { slides: prevSlides });
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    const activeProject = projects.find(p => p.id === activePid) || projectToEdit;
    if (historyIndex < history.length - 1 && activeProject) {
      const nextSlides = history[historyIndex + 1];
      updateProject(activeProject.id, { slides: nextSlides });
      setHistoryIndex(historyIndex + 1);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) {
      handleDirectJoin(roomFromUrl);
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setView('landing');
  };

  const handleDirectJoin = async (pid: string) => {
    const project = await getProject(pid);
    if (project) {
      setProjectToEdit(project);
      setActivePid(pid);
      setView('preview');
    }
  };

  const handlePinJoin = async () => {
    if (!pin.trim()) return;
    setJoining(true);
    setError('');
    
    try {
      const project = await findProjectByPin(pin.toUpperCase());
      if (project) {
        const sessId = crypto.randomUUID();
        // Record session asynchronously
        supabase.from('sessions').insert({
          id: sessId,
          project_id: project.id,
          name: visitorName || 'Anonymous VC',
          email: visitorEmail || 'no-email@vc.com',
          started_at: new Date().toISOString()
        }).then(() => console.log('Session recorded'), console.error);
        
        setVisitorSessionId(sessId);
        setProjectToEdit(project);
        setActivePid(project.id);
        setView('preview');
      } else {
        setError('Invalid Access Code');
      }
    } catch (err) {
      setError('Connection failed. Try again.');
    } finally {
      setJoining(false);
    }
  };

  const activeProject = projects.find(p => p.id === activePid) || projectToEdit;

  const handleCreateProject = async (name: string) => {
    const pin = generateSecurePin();
    const initialSlides = appendFixedSlides([]);
    const newProj = await createProject(name, pin, initialSlides);
    if (newProj) {
      setIsNewProjectModalOpen(false);
      setActivePid(newProj.id);
      setView('editor');
    }
  };

  const handleDeleteProject = async () => {
    if (projectToEdit) {
      await deleteProject(projectToEdit.id);
      setIsDeleteModalOpen(false);
      setProjectToEdit(null);
    }
  };
  // Auth Redirect: If user is logged in and on a public view, go to dashboard
  useEffect(() => {
    if (user && (view === 'landing' || view === 'login')) {
      setView('dashboard');
    }
  }, [user, view]);

  // Loading UI
  if (authLoading) {
    return (
      <div className="h-screen bg-[#F4F4F1] flex flex-col items-center justify-center font-mono uppercase text-xs tracking-widest gap-4">
        <div className="w-12 h-12 border-4 border-black border-t-transparent animate-spin"></div>
        Authenticating...
      </div>
    );
  }


  // Auth UI (Landing Page / Simple Login Page)
  if (!user && view !== 'preview') {
    return <LoginView onLogin={() => signInWithGoogle().catch(err => alert("Login Error: " + err.message + "\n\nPlease ensure your Vercel URL is added to Supabase Redirect URLs."))} />;
  }

  // Logged In Router
  return (
    <div className="h-screen bg-[#F4F4F1] flex flex-col overflow-hidden">
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
         {view === 'dashboard' && (
           <DashboardView 
              user={user}
              projects={projects} 
              loading={projectsLoading}
              onNewProject={() => setIsNewProjectModalOpen(true)}
              onCopyProject={async (p) => {
                const pin = generateSecurePin();
                const newProj = await createProject(`${p.name} (Copy)`, pin, p.slides);
                if (newProj) {
                  setActivePid(newProj.id);
                  setView('editor');
                }
              }}
              onDeleteProject={(pid) => {
                const proj = projects.find(p => p.id === pid);
                if (proj) {
                  setProjectToEdit(proj);
                  setIsDeleteModalOpen(true);
                }
              }}
              onOpenProject={(pid) => { setActivePid(pid); setView('editor'); }}
              onPreviewProject={(pid) => { setActivePid(pid); setView('preview'); }}
              findProjectByPin={findProjectByPin}
              onLogout={handleSignOut}
           />
         )}

         {view === 'editor' && activeProject && (
            <EditorView 
               project={activeProject}
               activeSid={activeSid}
               setActiveSid={setActiveSid}
               isSidebarOpen={isSidebarExpanded}
               setIsSidebarOpen={setIsSidebarExpanded}
               setView={setView}
               setModal={(m) => {
                 setProjectToEdit(activeProject);
                 if (m.type === 'share') setIsShareModalOpen(true);
                 if (m.type === 'aiKnowledge') setIsAIKnowledgeModalOpen(true);
               }}
               updateActiveSlide={(field, val) => {
                 if (historyIndex === -1) captureHistory(activeProject.slides); // Initial state
                 captureHistory(activeProject.slides);
                 const newSlides = activeProject.slides.map(s => 
                   s.id === (activeSid || activeProject.slides[0]?.id) ? { ...s, [field]: val } : s
                 );
                 updateProject(activeProject.id, { slides: newSlides });
               }}
               deleteSlide={(sid) => {
                 if (historyIndex === -1) captureHistory(activeProject.slides);
                 captureHistory(activeProject.slides);
                 const newSlides = activeProject.slides.filter(s => s.id !== sid);
                 updateProject(activeProject.id, { slides: newSlides });
               }}
               onDragStart={(idx) => { draggedIdxRef.current = idx; }}
               onDragOver={(e) => { e.preventDefault(); }}
               onDrop={(idx) => {
                 if (draggedIdxRef.current === null) return;
                 const draggedIdx = draggedIdxRef.current;
                 if (draggedIdx === idx) return;
                 
                 const newSlides = [...activeProject.slides];
                 
                 // Prevent dragging fixed slides
                 if (newSlides[draggedIdx].isFixed) return;
                 
                 // Limit drop index so it doesn't push past the fixed slides
                 const firstFixedIdx = newSlides.findIndex(s => s.id === 'founder-note' || s.id === 'vc-feedback');
                 let targetIdx = idx;
                 if (firstFixedIdx !== -1 && targetIdx >= firstFixedIdx) {
                   targetIdx = firstFixedIdx - 1;
                   if (targetIdx < 0) targetIdx = 0;
                 }

                 const [draggedSlide] = newSlides.splice(draggedIdx, 1);
                 newSlides.splice(targetIdx, 0, draggedSlide);
                 
                 updateProject(activeProject.id, { slides: newSlides });
                 draggedIdxRef.current = null;
               }}
               captureHistory={() => {
                 if (historyIndex === -1) captureHistory(activeProject.slides);
                 captureHistory(activeProject.slides);
               }}
               handleUndo={handleUndo}
               handleRedo={handleRedo}
               handleFileUpload={async (e) => {
                 const files = Array.from(e.target.files || []) as File[];
                 if (!files.length) return;
                 const newSlides = [...activeProject.slides];
                 let insertIndex = newSlides.findIndex(s => s.id === 'founder-note' || s.id === 'vc-feedback');
                 if (insertIndex === -1) insertIndex = newSlides.length;
                 
                 let lastAddedId = null;
                 for (const file of files) {
                   const fileExtension = file.name.split('.').pop()?.toLowerCase();
                   let blobsToUpload: Blob[] = [];
                   
                   try {
                     if (fileExtension === 'pdf') {
                       blobsToUpload = await extractPdfPages(file);
                     } else if (['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension || '')) {
                       blobsToUpload = [await compressImage(file)];
                     } else {
                       blobsToUpload = [file]; // Fallback
                     }
                   } catch (err) {
                     console.error('Error processing file:', err);
                     blobsToUpload = [file]; // Fallback to original if processing fails
                   }

                   for (let i = 0; i < blobsToUpload.length; i++) {
                     const blob = blobsToUpload[i];
                     const newFileName = `${Date.now()}_${i}.webp`;
                     const path = `users/${user?.id}/slides/${newFileName}`;
                     console.log('Uploading slide to Supabase:', path);
                     
                     // Upload to Supabase as WebP
                     const fileOptions = { cacheControl: '3600', upsert: false, contentType: 'image/webp' };
                     const { data, error } = await supabase.storage.from('assets').upload(path, blob, fileOptions);
                     
                     if (error) {
                       console.error('Supabase Upload Error:', error);
                       alert(`Failed to upload slide ${i+1}: ${error.message}`);
                       continue;
                     }

                     if (data) {
                       const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(data.path);
                       console.log('Slide Public URL:', publicUrl);
                       const newSlideId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                       lastAddedId = newSlideId;
                       
                       newSlides.splice(insertIndex, 0, {
                         id: newSlideId,
                         projectId: activeProject.id,
                         imageUrl: publicUrl,
                         title: `Slide ${newSlides.length + 1}`,
                         order: insertIndex,
                         content: '',
                         showNarrative: false,
                       });
                       insertIndex++;
                     }
                   }
                 }
                 
                 await updateProject(activeProject.id, { slides: newSlides });
                 if (lastAddedId) setActiveSid(lastAddedId);
                 if (e.target) e.target.value = '';
               }}
               user={user}
                               handleAudioUpload={async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (!file || !user) return;
                  const path = `users/${user.id}/audio/${Date.now()}_${file.name}`;
                  const { data, error } = await supabase.storage.from('assets').upload(path, file);
                  if (error) {
                    console.error('Audio Upload Error:', error);
                    alert('Failed to upload audio.');
                    return;
                  }
                  if (data) {
                    const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(data.path);
                    const newSlides = activeProject.slides.map(s => 
                       s.id === activeSid ? { ...s, audioUrl: publicUrl } : s
                    );
                    updateProject(activeProject.id, { slides: newSlides });
                  }
                  if (e.target) e.target.value = '';
                }}
               audioInputRef={audioInputRef}
               onLogout={handleSignOut}
            />
         )}

         {view === 'tracking' && (
            <TrackingView projects={projects} />
         )}

         {view === 'preview' && activeProject && (
            <PreviewRoom 
               project={activeProject}
               onBack={() => user ? setView('editor') : setView('landing')}
               initialSid={activeSid}
               visitorSessionId={visitorSessionId}
               onUpdateSlide={(sid, field, val) => {
                 if (historyIndex === -1) captureHistory(activeProject.slides);
                 captureHistory(activeProject.slides);
                 const newSlides = activeProject.slides.map(s => 
                   s.id === sid ? { ...s, [field]: val } : s
                 );
                 updateProject(activeProject.id, { slides: newSlides });
               }}
               handleUndo={handleUndo}
               handleRedo={handleRedo}
            />
         )}
      </main>

      {/* Modals */}
      <NewProjectModal 
        isOpen={isNewProjectModalOpen} 
        onConfirm={handleCreateProject} 
        onCancel={() => setIsNewProjectModalOpen(false)} 
      />
      
      <ShareModal 
        isOpen={isShareModalOpen} 
        project={projectToEdit} 
        onCancel={() => setIsShareModalOpen(false)} 
      />
      
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        title="Delete Room"
        message="Are you sure you want to permanently delete this room? All slides, metrics and data will be lost."
        onConfirm={handleDeleteProject}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <AIKnowledgeModal 
        isOpen={isAIKnowledgeModalOpen}
        project={activeProject}
        onCancel={() => setIsAIKnowledgeModalOpen(false)}
        onSave={async (files) => {
           if (activeProject) {
              await updateProject(activeProject.id, { aiKnowledgeFiles: files });
           }
        }}
      />
    </div>
  );
}

export default App;
