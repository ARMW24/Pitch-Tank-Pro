import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface NewProjectModalProps {
  isOpen: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onConfirm, onCancel }) => {
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                onConfirm(name);
                setName('');
              }
            }}
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
