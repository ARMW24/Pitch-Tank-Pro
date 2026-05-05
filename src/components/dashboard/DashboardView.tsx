import React, { useState } from 'react';
import { Plus, Layers, Copy, Trash2, LayoutDashboard, Search, LogOut } from 'lucide-react';
import { Project } from '../../hooks/useProjects';
import { User } from '@supabase/supabase-js';

interface DashboardViewProps {
  user: User | null;
  projects: Project[];
  loading: boolean;
  onNewProject: () => void;
  onCopyProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onOpenProject: (projectId: string) => void;
  onPreviewProject: (projectId: string) => void;
  findProjectByPin: (pin: string) => Promise<string | null>;
  onLogout: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  projects,
  loading,
  onNewProject,
  onCopyProject,
  onDeleteProject,
  onOpenProject,
  onPreviewProject,
  findProjectByPin,
  onLogout
}) => {
  const [homeError, setHomeError] = useState("");
  const [searching, setSearching] = useState(false);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHomeError("");
    const formData = new FormData(e.target as HTMLFormElement);
    const code = (formData.get('code') as string).trim();
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

    setSearching(true);
    const projectId = await findProjectByPin(code);
    if (projectId) {
      window.location.href = `/?room=${projectId}`;
    } else {
      setHomeError('Invalid or expired Access Code.');
    }
    setSearching(false);
  };

  return (
    <div className="flex-1 bg-[#F4F4F1] p-6 lg:p-12 overflow-y-auto relative">
      <div className="absolute inset-0 bg-dot-pattern opacity-10"></div>
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-8 lg:mb-16 flex flex-col md:flex-row md:items-end justify-between border-b-2 border-black pb-8 gap-6">
          <div>
            <div className="flex items-center gap-4 mb-6">
               <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-serif font-black italic">PT</div>
               <span className="font-serif font-black italic uppercase tracking-tighter text-xl">Pitch Tank</span>
            </div>
            <p className="text-[10px] font-mono tracking-widest uppercase mb-1">Project Stream / Rooms</p>
            <h1 className="text-5xl lg:text-7xl font-sans font-black tracking-tighter leading-none">INVESTMENT<br/>ROOMS</h1>
          </div>
          <div className="flex gap-3">
             <button onClick={onNewProject} className="bg-black text-white px-6 py-3 font-mono font-bold text-[10px] uppercase tracking-widest hover:bg-white hover:text-black border-2 border-black transition-all shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1">New Room</button>
             <button onClick={onLogout} className="border-2 border-black px-6 py-3 font-mono font-bold text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Logout</button>
          </div>
        </header>



        {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white border-2 border-black shadow-[8px_8px_0_0_#000]">
               <div className="w-12 h-12 border-4 border-black border-t-transparent animate-spin rounded-full"></div>
               <p className="font-mono text-[10px] uppercase tracking-widest font-bold">Synchronizing Pitch Rooms...</p>
            </div>
        ) : user && projects.length === 0 ? (
           <div className="bg-white border-2 border-black p-8 text-center shadow-[8px_8px_0_0_#000] mb-8">
              <h2 className="text-2xl font-black italic uppercase mb-2">Welcome!</h2>
              <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mb-6">You don't have any pitch rooms yet.</p>
              <button 
                 onClick={onNewProject} 
                 className="px-6 py-3 bg-black text-white hover:bg-gray-800 flex items-center justify-center gap-2 mx-auto focus:ring-2 focus:ring-offset-2 focus:ring-black">
                <Plus size={18} /> Create Your First Room
              </button>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {projects.map(project => (
              <div key={project.id} className="bg-white min-h-[320px] p-6 lg:p-8 border-2 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-[4px] hover:translate-x-[4px] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all group relative flex flex-col justify-between rounded-none overflow-hidden">
                <div className="absolute top-0 right-0 flex border-b-2 border-l-2 border-black bg-white group-hover:bg-[#F4F4F1] transition-colors">
                    <button onClick={(e) => {
                      e.stopPropagation();
                      onCopyProject(project);
                    }} className="p-3 border-r-2 border-black text-black hover:bg-black hover:text-white transition-colors"><Copy size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }} className="p-3 text-black hover:bg-black hover:text-white transition-colors"><Trash2 size={16} /></button>
                </div>
                
                <div className="pt-6">
                    <div className="w-16 h-16 bg-black text-white flex items-center justify-center mb-6 rounded-full overflow-hidden border-2 border-black bg-cover bg-center" style={project.slides?.[0]?.imageUrl ? { backgroundImage: `url(${project.slides[0].imageUrl})` } : {}}>
                        {!project.slides?.[0]?.imageUrl && <Layers size={24} />}
                    </div>
                    <h3 className="text-3xl font-serif font-black text-black italic tracking-tighter leading-tight mb-2 truncate">{project.name}</h3>
                    <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">{(project.slides || []).length} INTERACTIVE SLIDES</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <button onClick={() => onOpenProject(project.id)} className="flex-1 bg-black text-white py-3 font-mono font-bold text-[10px] uppercase tracking-widest hover:bg-white hover:text-black border-2 border-black transition-colors rounded-none">Builder</button>
                    <button onClick={() => onPreviewProject(project.id)} className="flex-1 sm:flex-none sm:px-6 border-2 border-black text-black py-3 font-mono font-bold text-[10px] uppercase hover:bg-black hover:text-white transition-colors rounded-none flex items-center justify-center">Preview</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
