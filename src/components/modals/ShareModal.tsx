import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, X } from 'lucide-react';
import { Project } from '../../hooks/useProjects';

interface ShareModalProps {
  isOpen: boolean;
  project: Project | null;
  onCancel: () => void;
  onUpdateProject?: (id: string, updates: any) => Promise<boolean>;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, project, onCancel, onUpdateProject }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [localAccessCodeRequired, setLocalAccessCodeRequired] = useState(true);

  useEffect(() => {
    if (project) {
      setLocalAccessCodeRequired(project.accessCodeRequired !== false);
    }
  }, [project]);

  if (!isOpen || !project) return null;
  const url = window.location.origin + window.location.pathname + '?room=' + project.id;
  
  const handleToggle = async (checked: boolean) => {
    setLocalAccessCodeRequired(checked);
    if (onUpdateProject) {
      await onUpdateProject(project.id, { accessCodeRequired: checked });
    }
  };

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
                <button onClick={() => { navigator.clipboard.writeText(project.pinCode || ''); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }} className="p-2 bg-black text-white hover:bg-gray-800 transition-colors shrink-0">
                  {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                </button>
             </div>
           </div>

           {onUpdateProject && (
             <div className="pt-2 border-t border-dashed border-gray-200">
               <label className="flex items-center justify-between p-3 border-2 border-black bg-[#F4F4F1] hover:bg-gray-50 transition-colors cursor-pointer select-none">
                 <div className="flex flex-col">
                   <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black">Require Access Code</span>
                   <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">
                     {localAccessCodeRequired ? 'PIN is required to view' : 'Bypass PIN for direct entry'}
                   </span>
                 </div>
                 <div className="flex items-center gap-2 shrink-0">
                   <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 border border-black uppercase tracking-widest transition-colors ${localAccessCodeRequired ? 'bg-black text-white' : 'bg-white text-black'}`}>
                     {localAccessCodeRequired ? 'ON' : 'OFF'}
                   </span>
                   <div className="relative">
                     <input 
                       type="checkbox" 
                       checked={localAccessCodeRequired} 
                       onChange={(e) => handleToggle(e.target.checked)}
                       className="sr-only" 
                     />
                     <div className={`w-10 h-6 border-2 border-black rounded-none transition-colors duration-200 ${localAccessCodeRequired ? 'bg-black' : 'bg-gray-200'}`}></div>
                     <div className={`absolute top-1 left-1 w-4 h-4 bg-white border-2 border-black rounded-none transition-transform duration-200 ${localAccessCodeRequired ? 'translate-x-4' : 'translate-x-0'}`}></div>
                   </div>
                 </div>
               </label>
             </div>
           )}
        </div>
        
        <button onClick={onCancel} className="mt-8 font-mono font-bold text-xs uppercase tracking-widest py-3 border-2 border-black hover:bg-black hover:text-white transition-colors">Done</button>
      </motion.div>
    </div>
  );
};
