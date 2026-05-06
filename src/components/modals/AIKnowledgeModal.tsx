import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, X, FileText, Trash2, ShieldCheck, Key, MessageSquare } from 'lucide-react';
import { Project } from '../../hooks/useProjects';

interface AIKnowledgeModalProps {
  isOpen: boolean;
  project: Project | null;
  onCancel: () => void;
  onSave: (files: any[]) => void;
}

export const AIKnowledgeModal: React.FC<AIKnowledgeModalProps> = ({ isOpen, project, onCancel, onSave }) => {
  const [files, setFiles] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isAddingText, setIsAddingText] = useState(false);
  const [customText, setCustomText] = useState('');
  const [textTitle, setTextTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      const allFiles = project?.aiKnowledgeFiles || [];
      const settingsFile = allFiles.find(f => f.type === 'settings');
      const normalFiles = allFiles.filter(f => f.type !== 'settings');
      
      setFiles(normalFiles);
      setApiKey(settingsFile?.apiKey || '');
      setPrompt(settingsFile?.prompt || '');
    }
  }, [isOpen, project]);

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

  const handleSaveAll = () => {
    const dataToSave = [
      { type: 'settings', apiKey, prompt },
      ...files
    ];
    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#F4F4F1] border-2 border-black p-6 md:p-8 max-w-2xl w-full shadow-[8px_8px_0_0_#000] rounded-none flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center mb-6 shrink-0">
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
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-vertical flex flex-col min-h-0">
            {/* API Key Section */}
            <div className="mb-6 shrink-0">
               <label className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-black mb-2"><Key size={12}/> API Key</label>
               <div className="flex gap-2">
                  <input 
                     type="password" 
                     value={apiKey} 
                     onChange={e => setApiKey(e.target.value)} 
                     placeholder="sk-..." 
                     className="flex-1 bg-white border-2 border-black p-3 font-mono text-sm focus:outline-none" 
                  />
                  <button 
                     onClick={() => {
                        handleSaveAll();
                        alert("API Key saved successfully!");
                     }} 
                     className="bg-black text-white px-6 font-mono font-bold text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-colors shrink-0"
                  >
                     Save
                  </button>
               </div>
               <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-2">Required for the AI Agent to process questions in this room.</p>
            </div>

            {/* Knowledge Files Section */}
            <div className="mb-6 flex-1 flex flex-col min-h-0 shrink-0">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-black mb-2">Knowledge Documents</label>
              <div className="flex-1 overflow-y-auto bg-white border-2 border-black p-4 space-y-3 min-h-[120px] max-h-[200px] custom-scrollbar-vertical">
                {files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 py-6">
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
              <div className="flex items-center gap-2 mt-3">
                <label className="flex-1 cursor-pointer bg-white border-2 border-black text-black py-2 font-mono font-bold text-[10px] uppercase tracking-widest text-center hover:bg-black hover:text-white transition-all">
                   <input type="file" multiple accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileUpload} />
                   Import Files
                </label>
                <button 
                  onClick={() => setIsAddingText(true)} 
                  className="flex-1 bg-white border-2 border-black text-black py-2 font-mono font-bold text-[10px] uppercase tracking-widest text-center hover:bg-black hover:text-white transition-all"
                >
                   Add Text
                </button>
              </div>
            </div>

            {/* Prompt Section */}
            <div className="mb-6 shrink-0">
               <label className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-black mb-2"><MessageSquare size={12}/> AI Agent Prompt</label>
               <textarea 
                  value={prompt} 
                  onChange={e => setPrompt(e.target.value)} 
                  placeholder="You are an expert VC investor. Analyze the pitch based on the following documents..." 
                  className="w-full bg-white border-2 border-black p-4 font-mono text-sm resize-none focus:outline-none h-24 custom-scrollbar-vertical" 
               />
               <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-2">Instructions to guide how the AI Agent responds to the investor.</p>
            </div>

            <div className="pt-2 border-t-2 border-black shrink-0">
              <button 
                onClick={() => { handleSaveAll(); onCancel(); }} 
                className="w-full bg-black border-2 border-black text-white px-8 py-4 font-mono font-bold text-xs uppercase tracking-widest text-center shadow-[4px_4px_0_0_#000] hover:bg-white hover:text-black transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000]"
              >
                 Done & Save All
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

