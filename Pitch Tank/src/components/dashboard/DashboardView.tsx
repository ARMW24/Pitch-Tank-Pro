import React, { useState } from 'react';
import { Plus, Layers, Copy, Trash2, LayoutDashboard, Search } from 'lucide-react';
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
  findProjectByPin
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
           <form className="flex flex-col sm:flex-row shadow-[4px_4px_0_0_#000] border-2 border-black" onSubmit={handlePinSubmit}>
              <input name="code" className="flex-1 p-3 md:p-4 font-mono text-sm border-b-2 sm:border-b-0 sm:border-r-2 border-black focus:outline-none focus:bg-gray-50" placeholder="Paste Link or Code (e.g. A@7x9T&!)" />
              <button type="submit" disabled={searching} className="bg-black text-white font-bold uppercase tracking-widest px-6 py-4 hover:bg-gray-800 transition-colors">
                {searching ? "SEARCHING..." : "View Pitch"}
              </button>
           </form>
           {homeError && <p className="mt-4 text-red-500 font-mono text-xs font-bold uppercase tracking-widest text-center">{homeError}</p>}
        </div>

        {!user && (
           <div className="bg-yellow-100 border-2 border-yellow-500 p-6 mb-8 text-sm flex flex-col gap-2 shadow-[4px_4px_0_0_#eab308]">
              <p className="text-xl uppercase italic font-black font-serif tracking-tight">Please log in to manage your Pitch Rooms</p>
              <p className="text-xs font-mono mt-1 font-bold text-gray-700">Data is isolated by Supabase Account. Your pitch rooms are securely stored and private.</p>
           </div>
        )}

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
