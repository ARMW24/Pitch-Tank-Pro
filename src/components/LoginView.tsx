import React from 'react';
import { UserIcon } from 'lucide-react';

interface LoginViewProps {
  onLogin: () => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  return (
    <div className="min-h-screen bg-[#F4F4F1] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border-2 border-black p-10 shadow-[16px_16px_0_0_#000] text-center space-y-8">
        <h1 className="text-4xl font-serif font-black italic uppercase">Pitch Tank</h1>
        <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Founder Access Only</p>
        
        <button 
           onClick={onLogin}
           className="w-full bg-white border-2 border-black py-4 px-8 flex items-center justify-center gap-4 hover:bg-black hover:text-white transition-all group shadow-[8px_8px_0_0_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
        >
           <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" /> 
           <span className="font-mono font-black text-sm uppercase tracking-widest">Sign in with Google</span>
        </button>
      </div>
    </div>
  );
}
