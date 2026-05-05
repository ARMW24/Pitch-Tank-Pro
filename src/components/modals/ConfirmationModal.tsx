import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Copy } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Delete"
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-[#F4F4F1]/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4 border-2 border-black">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-black p-10 max-w-sm w-full shadow-[8px_8px_0_0_#000] text-center rounded-none flex flex-col items-center">
        <div className="w-20 h-20 bg-white border-2 border-black flex items-center justify-center mb-8 rounded-full">
           {confirmText === 'Delete' ? <Trash2 size={40} className="text-black" /> : <Copy size={40} className="text-black" />}
        </div>
        <h3 className="text-2xl font-serif font-black text-black mb-2 italic uppercase">{title}</h3>
        <p className="text-gray-700 text-sm mb-10 leading-relaxed font-mono">{message}</p>
        <div className="flex gap-4 w-full">
          <button onClick={onCancel} className="flex-1 py-4 bg-white border-2 border-black text-black font-bold font-mono text-[10px] uppercase hover:bg-black hover:text-white transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-4 bg-black border-2 border-black text-white font-bold font-mono text-[10px] uppercase hover:bg-white hover:text-black transition-all">{confirmText}</button>
        </div>
      </motion.div>
    </div>
  );
};
