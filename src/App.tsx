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

// Modals
import { NewProjectModal } from './components/modals/NewProjectModal';
import { ShareModal } from './components/modals/ShareModal';
import { ConfirmationModal } from './components/modals/ConfirmationModal';
import { AIKnowledgeModal } from './components/modals/AIKnowledgeModal';

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

  const [view, setView] = useState<'landing' | 'login' | 'dashboard' | 'editor' | 'tracking' | 'preview'>('landing');
  const [activePid, setActivePid] = useState<string | null>(null);
  const [activeSid, setActiveSid] = useState<string | number | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) {
      handleDirectJoin(roomFromUrl);
    } else if (window.location.pathname === '/login') {
      setView('login');
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
      const pid = await findProjectByPin(pin.toUpperCase());
      if (pid) {
        const sessId = crypto.randomUUID();
        // Record session
        await supabase.from('sessions').insert({
          id: sessId,
          project_id: pid,
          name: visitorName || 'Anonymous VC',
          email: visitorEmail || 'no-email@vc.com',
          started_at: new Date().toISOString()
        });
        
        setVisitorSessionId(sessId);
        const project = await getProject(pid);
        if (project) {
          setProjectToEdit(project);
          setActivePid(pid);
          setView('preview');
        }
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

  if (authLoading) {
    return (
      <div className="h-screen bg-[#F4F4F1] flex flex-col items-center justify-center font-mono uppercase text-xs tracking-widest gap-4">
        <div className="w-12 h-12 border-4 border-black border-t-transparent animate-spin"></div>
        Authenticating...
      </div>
    );
  }

  // Auth UI (Landing Page)
  if (!user && (view === 'landing' || view === 'login')) {
    if (view === 'login') {
      return (
        <div className="min-h-screen bg-[#F4F4F1] flex flex-col items-center justify-center relative overflow-hidden p-6">
          <div className="absolute inset-0 bg-dot-pattern opacity-10"></div>
          
          <div className="w-full max-w-md bg-white border-2 border-black p-10 shadow-[16px_16px_0_0_#000] space-y-10 relative z-10">
             <button onClick={() => setView('landing')} className="absolute -top-4 -left-4 bg-black text-white px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest hover:translate-x-1 hover:translate-y-1 transition-transform flex items-center gap-2">
                <ArrowRight size={14} className="rotate-180" /> Back
             </button>
             
             <div className="text-center space-y-4">
                <div className="inline-block bg-black text-white px-3 py-1 font-mono text-[9px] uppercase tracking-widest">Founder Access</div>
                <h1 className="text-4xl font-serif font-black italic uppercase tracking-tighter">Login to <br/> Pitch Tank</h1>
                <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest">Securely manage your pitch rooms</p>
             </div>

             <button 
                onClick={() => signInWithGoogle()}
                className="w-full bg-white border-2 border-black py-5 px-6 flex items-center justify-center gap-4 hover:bg-black hover:text-white transition-all group shadow-[8px_8px_0_0_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
             >
                <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" /> 
                <span className="font-mono font-black text-sm uppercase tracking-widest">Sign in with Google</span>
             </button>

             <p className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-[0.2em] leading-relaxed text-center">
                Data is isolated by Supabase Account. Your pitch rooms are securely stored and private.
             </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F4F4F1] flex flex-col items-center relative overflow-hidden p-6 md:p-12">
        <div className="absolute inset-0 bg-dot-pattern opacity-10"></div>
        
        <div className="max-w-6xl w-full flex flex-col lg:flex-row items-center justify-between gap-16 relative z-10 mt-12 lg:mt-24">
          {/* Hero Section */}
          <div className="flex-1 space-y-10 text-center lg:text-left">
             <div className="inline-block bg-black text-white px-4 py-1 font-mono text-[10px] uppercase tracking-widest font-bold">BETA V2.4</div>
             <h1 className="text-6xl md:text-8xl font-serif font-black italic uppercase leading-[0.85] tracking-tighter text-black">
                Pitch <br/> <span className="text-outline">Tank</span>
             </h1>
             <p className="text-xl md:text-2xl font-mono text-gray-700 max-w-xl leading-relaxed">
                The world's first <span className="font-bold underline decoration-4">Interactive Pitch</span>
             </p>

             <div className="pt-8">
                <button 
                   onClick={() => setView('login')}
                   className="font-mono font-black text-xs uppercase tracking-[0.3em] border-b-4 border-black hover:bg-black hover:text-white px-4 py-2 transition-all"
                >
                   Founder Login →
                </button>
             </div>
          </div>

          {/* Access Card */}
          <div className="w-full max-w-md bg-white border-2 border-black p-10 shadow-[16px_16px_0_0_#000] space-y-8 relative">
             <div className="absolute -top-4 -right-4 bg-black text-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest shadow-lg">Visitor Access</div>
             
             <div className="space-y-6">
                <div className="flex items-center gap-4 border-b-2 border-black pb-4">
                   <ShieldCheck size={28} />
                   <h2 className="text-2xl font-serif font-black italic uppercase">Angel / VC Access</h2>
                </div>
                
                <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest">Enter the access code provided by the founder:</p>
                
                <div className="space-y-4">
                   <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                         className="w-full bg-gray-50 border-2 border-black pl-12 pr-4 py-4 font-mono text-sm focus:bg-white outline-none" 
                         placeholder="Your Name (e.g. VC Name)"
                         value={visitorName}
                         onChange={e => setVisitorName(e.target.value)}
                      />
                   </div>
                   <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                         className="w-full bg-gray-50 border-2 border-black pl-12 pr-4 py-4 font-mono text-sm focus:bg-white outline-none" 
                         placeholder="Your Email Address"
                         value={visitorEmail}
                         onChange={e => setVisitorEmail(e.target.value)}
                      />
                   </div>
                   
                   <div className="pt-4">
                      <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-2">Access PIN</label>
                      <div className="flex gap-3">
                         <input 
                            className="w-full bg-white border-2 border-black px-4 py-4 text-xl font-mono font-bold tracking-[0.1em] uppercase outline-none focus:bg-gray-50"
                            maxLength={8}
                            placeholder="CODE"
                            value={pin}
                            onChange={e => setPin(e.target.value.toUpperCase())}
                         />
                         <button 
                            onClick={handlePinJoin}
                            disabled={joining || pin.length < 4}
                            className="bg-black text-white px-6 py-4 hover:bg-gray-800 disabled:opacity-30 transition-all flex items-center justify-center shrink-0"
                         >
                            {joining ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <ArrowRight size={20} />}
                         </button>
                      </div>
                      {error && <p className="text-red-600 font-mono text-[10px] uppercase font-bold text-center mt-4">{error}</p>}
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Logged In Router
  return (
    <div className="h-screen bg-[#F4F4F1] flex flex-col overflow-hidden">
      <main className="flex-1 flex flex-col min-w-0">
         {view === 'landing' && user && (
           <div className="flex-1 flex flex-col items-center justify-center space-y-12 p-8 text-center">
              <h2 className="text-5xl font-serif font-black italic uppercase text-black">Welcome Back, {user.email?.split('@')[0]}</h2>
              <button onClick={() => setView('dashboard')} className="bg-black text-white px-12 py-6 border-2 border-black font-mono font-bold uppercase tracking-widest shadow-[8px_8px_0_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all">Go to Dashboard</button>
           </div>
         )}

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
                 const newSlides = activeProject.slides.map(s => 
                   s.id === (activeSid || activeProject.slides[0]?.id) ? { ...s, [field]: val } : s
                 );
                 updateProject(activeProject.id, { slides: newSlides });
               }}
               deleteSlide={(sid) => {
                 const newSlides = activeProject.slides.filter(s => s.id !== sid);
                 updateProject(activeProject.id, { slides: newSlides });
               }}
               onDragStart={() => {}}
               onDragOver={() => {}}
               onDrop={() => {}}
               captureHistory={() => {}}
               handleUndo={() => {}}
               handleRedo={() => {}}
               handleFileUpload={async (e) => {
                 const files = Array.from(e.target.files || []) as File[];
                 if (!files.length) return;
                 const newSlides = [...activeProject.slides];
                 let insertIndex = newSlides.findIndex(s => s.id === 'founder-note' || s.id === 'vc-feedback');
                 if (insertIndex === -1) insertIndex = newSlides.length;
                 
                 let lastAddedId = null;
                 for (const file of files) {
                   const path = `users/${user?.id}/slides/${Date.now()}_${file.name}`;
                   console.log('Uploading slide to Supabase:', path);
                   const { data, error } = await supabase.storage.from('assets').upload(path, file);
                   
                   if (error) {
                     console.error('Supabase Upload Error:', error);
                     alert(`Failed to upload ${file.name}: ${error.message}`);
                     continue;
                   }

                   if (data) {
                     const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(data.path);
                     console.log('Slide Public URL:', publicUrl);
                     
                     const newId = String(Date.now() + Math.random());
                     newSlides.splice(insertIndex, 0, {
                       id: newId,
                       title: file.name,
                       content: '',
                       imageUrl: publicUrl
                     });
                     insertIndex++;
                     lastAddedId = newId;
                   }
                 }
                 await updateProject(activeProject.id, { slides: newSlides });
                 if (lastAddedId) {
                   setActiveSid(lastAddedId);
                 }
               }}
               user={user}
               isRecording={false}
               handleStartRecording={() => {}}
               handleStopRecording={() => {}}
               handleAudioUpload={() => {}}
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
                 const newSlides = activeProject.slides.map(s => 
                   s.id === sid ? { ...s, [field]: val } : s
                 );
                 updateProject(activeProject.id, { slides: newSlides });
               }}
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
