import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Project } from '../../hooks/useProjects';

interface TrackingViewProps {
  projects: Project[];
}

export const TrackingView: React.FC<TrackingViewProps> = ({ projects }) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
     const fetchSessions = async () => {
        setLoading(true);
        try {
           const allSessions: any[] = [];
           for (const p of projects) {
              const { data, error } = await supabase
                 .from('sessions')
                 .select('*')
                 .eq('project_id', p.id)
                 .order('started_at', { ascending: false });
              
              if (data) {
                 allSessions.push(...data.map((s: any) => ({ 
                    ...s, 
                    projectId: p.id, 
                    projectName: p.name 
                 })));
              }
           }
           setSessions(allSessions.sort((a: any, b: any) => 
              new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
           ));
        } catch (error) {
           console.error("Failed to fetch sessions", error);
        } finally {
           setLoading(false);
        }
     };

     fetchSessions();
  }, [projects]);

  return (
    <div className="flex-1 overflow-auto bg-[#F4F4F1] p-6 lg:p-12 custom-scrollbar-vertical">
       <div className="max-w-6xl mx-auto border-2 border-black bg-white p-8 md:p-12 shadow-[12px_12px_0_0_#000]">
          <h1 className="text-3xl lg:text-4xl font-serif font-black italic uppercase text-black mb-8 border-b-2 border-black pb-4">VC Tracking Log</h1>
             {loading ? (
                <div className="text-center font-mono py-12 uppercase text-xs tracking-widest">Loading metrics...</div>
             ) : sessions.length === 0 ? (
                <div className="text-center text-gray-500 font-mono py-12 uppercase text-xs tracking-widest border border-dashed border-gray-300">No viewership data yet</div>
             ) : (
                <div className="overflow-x-auto">
                   <table className="w-full text-left font-mono text-sm whitespace-nowrap">
                      <thead>
                         <tr className="border-b-2 border-black text-[10px] uppercase tracking-widest text-gray-500">
                            <th className="pb-4 pr-6 font-normal">VC Name</th>
                            <th className="pb-4 pr-6 font-normal">Pitch Room</th>
                            <th className="pb-4 pr-6 font-normal">Viewed At</th>
                            <th className="pb-4 pr-6 font-normal">Time Spent</th>
                            <th className="pb-4 font-normal">Feedback</th>
                         </tr>
                      </thead>
                      <tbody>
                         {sessions.map(s => (
                            <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                               <td className="py-4 pr-6">
                                  <div className="font-bold text-black">{s.name}</div>
                                  <div className="text-[10px] text-gray-400 mt-1">{s.email}</div>
                               </td>
                               <td className="py-4 pr-6 text-xs bg-white border border-gray-100 flex flex-col items-start px-3 py-2 rounded shadow-sm relative -top-1">
                                  <span className="font-bold text-black border-b border-gray-100 pb-1 mb-1 w-full">{s.projectName}</span>
                                  <span className="text-[10px] text-gray-500 font-mono">PIN: <span className="font-bold text-black">{projects.find(p => p.id === s.project_id)?.pinCode || 'No PIN'}</span></span>
                               </td>
                               <td className="py-4 pr-6 text-xs">{new Date(s.started_at).toLocaleString()}</td>
                               <td className="py-4 pr-6 text-xs">{Math.floor((s.time_spent || 0) / 60)} min {Math.floor((s.time_spent || 0) % 60)} sec</td>
                               <td className="py-4">
                                  {s.has_feedback ? (
                                    <div className="flex flex-col gap-2 max-w-xs">
                                      <span className="bg-black text-white px-2 py-1 text-[9px] font-bold uppercase tracking-widest w-fit">Feedback Received</span>
                                      <p className="text-xs text-gray-600 font-sans italic border-l-2 border-black pl-2 whitespace-normal break-words">{s.feedback}</p>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 px-3 py-1.5 text-[10px] uppercase border border-gray-200">No Feedback</span>
                                  )}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             )}
       </div>
    </div>
  );
};
