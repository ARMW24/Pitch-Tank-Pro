import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Layout, Target, LogOut, Search, Shield, Zap, 
  ArrowRight, Mail, User as UserIcon
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

  const [view, setView] = useState<'landing' | 'dashboard' | 'editor' | 'tracking' | 'preview'>('landing');
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

  // Auto-detect room from URL
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
      const pid = await findProjectByPin(pin.toUpperCase());
      if (pid) {
        const sessId = crypto.randomUUID();
        // Record session in Supabase
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
  if (!user && view === 'landing') {
    return (
      <div className="min-h-screen bg-[#F4F4F1] flex flex-col items-center relative overflow-hidden p-6 md:p-12">
        <div className="absolute inset-0 bg-dot-pattern opacity-10"></div>
        <div className="max-w-6xl w-full flex flex-col lg:flex-row items-center justify-between gap-16 relative z-10 mt-12 lg:mt-24">
          
          <div className="flex-1 space-y-10 text-center lg:text-left">
             <div className="inline-block bg-black text-white px-4 py-1 font-mono text-[10px] uppercase tracking-widest font-bold">Beta v2.4</div>
             <h1 className="text-6xl md:text-8xl font-serif font-black italic uppercase leading-[0.85] tracking-tighter text-black">
                Pitch <br/> <span className="text-outline">Tank</span>
             </h1>
             <p className="text-xl md:text-2xl font-mono text-gray-700 max-w-xl leading-relaxed">
                The world's first <span className="font-bold underline decoration-4">Interactive Pitch</span>
             </p>
             
             <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button 
                   onClick={signInWithGoogle}
                   className="bg-white text-black px-10 py-6 border-2 border-black font-mono font-bold uppercase tracking-widest shadow-[8px_8px_0_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all flex items-center justify-center gap-3"
                >
                   <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" /> 
                   Sign up with Google
                </button>
             </div>
          </div>

          <div className="w-full max-w-md bg-white border-2 border-black p-10 shadow-[16px_16px_0_0_#000] space-y-8">
             <div className="flex items-center gap-4 border-b-2 border-black pb-6">
                <Shield size={32} />
                <h2 className="text-2xl font-serif font-black italic uppercase">Angel / VC Access</h2>
             </div>
             
             <div className="space-y-4">
                <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-4">Enter the access code provided by the founder:</p>
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
                <div className="h-4"></div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-2">Access PIN</label>
                <div className="flex gap-3">
                   <input 
                      className="flex-1 min-w-0 bg-white border-2 border-black px-4 py-4 text-xl font-mono font-bold tracking-[0.2em] uppercase outline-none focus:bg-gray-50"
                      maxLength={6}
                      placeholder="XXXXXX"
                      value={pin}
                      onChange={e => setPin(e.target.value.toUpperCase())}
                   />
                   <button 
                      onClick={handlePinJoin}
                      disabled={joining || pin.length < 4}
                      className="bg-black text-white px-8 border-2 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                   >
                      <ArrowRight />
                   </button>
                </div>
                {error && <p className="text-red-600 font-mono text-[10px] uppercase font-bold text-center mt-4">{error}</p>}

                <div className="pt-6 border-t-2 border-black mt-6">
                   <p className="text-[10px] font-mono font-bold text-gray-400 uppercase leading-relaxed">
                      Data is isolated by Supabase Account. Your pitch rooms are securely stored and private.
                   </p>
                </div>
             </div>
          </div>

        </div>
      </div>
    );
  }

  // Logged In Router
  return (
    <div className="h-screen bg-[#F4F4F1] flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar - Only show in Dashboard/Editor/Tracking */}
       {(view === 'dashboard' || view === 'editor' || view === 'tracking') && (
        <aside 
          className={`bg-black flex flex-col items-center py-10 border-r-2 border-black gap-10 z-50 transition-all duration-300 ${isSidebarExpanded ? 'w-64' : 'w-24'}`}
          onMouseEnter={() => setIsSidebarExpanded(true)}
          onMouseLeave={() => setIsSidebarExpanded(false)}
        >
          <div className="flex items-center w-full px-6 gap-4 cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="w-12 h-12 bg-white text-black flex items-center justify-center font-serif font-black text-xl italic flex-shrink-0">PT</div>
            {isSidebarExpanded && <span className="text-white font-serif font-black italic text-xl uppercase tracking-tighter">Pitch Tank</span>}
          </div>
          
          <nav className="flex flex-1 flex-col gap-8 w-full">
             <button onClick={() => setView('dashboard')} className={`flex items-center gap-4 px-6 py-3 transition-all ${view === 'dashboard' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>
               <Layout size={24} className="flex-shrink-0"/>
               {isSidebarExpanded && <span className="font-mono text-[10px] uppercase font-bold tracking-widest">Dashboard</span>}
             </button>
             <button onClick={() => setView('tracking')} className={`flex items-center gap-4 px-6 py-3 transition-all ${view === 'tracking' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>
               <Target size={24} className="flex-shrink-0"/>
               {isSidebarExpanded && <span className="font-mono text-[10px] uppercase font-bold tracking-widest">Tracking</span>}
             </button>
          </nav>

          <button onClick={handleSignOut} className="flex items-center gap-4 px-6 py-3 w-full text-red-500 hover:bg-red-500 hover:text-white transition-all">
            <LogOut size={24} className="flex-shrink-0"/>
            {isSidebarExpanded && <span className="font-mono text-[10px] uppercase font-bold tracking-widest">Logout</span>}
          </button>
        </aside>
       )}

      {/* Main Content Area */}
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
           />
         )}

         {view === 'editor' && activeProject && (
            <EditorView 
               project={activeProject}
               activeSid={activeSid}
               setActiveSid={setActiveSid}
               isSidebarOpen={true}
               setIsSidebarOpen={() => {}}
               setView={setView}
               setModal={(m) => {
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
                 for (const file of files) {
                   const path = `users/${user?.id}/slides/${Date.now()}_${file.name}`;
                   const { data } = await supabase.storage.from('assets').upload(path, file);
                   if (data) {
                     const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(data.path);
                     newSlides.push({
                       id: Date.now() + Math.random(),
                       title: file.name,
                       content: '',
                       imageUrl: publicUrl
                     });
                   }
                 }
                 updateProject(activeProject.id, { slides: newSlides });
               }}
               user={user}
               isRecording={false}
               handleStartRecording={() => {}}
               handleStopRecording={() => {}}
               handleAudioUpload={() => {}}
               audioInputRef={React.createRef()}
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
                 // Feedback slide updates
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
        project={projectToEdit}
        onCancel={() => setIsAIKnowledgeModalOpen(false)}
        onSave={async (files) => {
           if (projectToEdit) {
              await updateProject(projectToEdit.id, { aiKnowledgeFiles: files });
           }
        }}
      />
    </div>
  );
}

export default App;
