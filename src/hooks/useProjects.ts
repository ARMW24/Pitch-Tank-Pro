import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface Project {
  id: string;
  name: string;
  userId: string;
  pinCode: string;
  aiKnowledgeFiles: any[];
  slides: any[];
  createdAt: string;
  updatedAt: string;
  scheduleEnabled?: boolean;
  scheduleStart?: string;
  scheduleEnd?: string;
}

const transformProject = (data: any): Project => {
  const allSlides = data.slides || [];
  const meta = allSlides.find((s: any) => s.isScheduleMeta === true) || {};
  const cleanSlides = allSlides.filter((s: any) => s.isScheduleMeta !== true);

  return {
    id: data.id,
    name: data.name,
    userId: data.user_id,
    pinCode: data.pin_code,
    aiKnowledgeFiles: data.ai_knowledge_files || [],
    slides: cleanSlides,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    scheduleEnabled: meta.scheduleEnabled || false,
    scheduleStart: meta.scheduleStart || "",
    scheduleEnd: meta.scheduleEnd || "",
  };
};

export function useProjects(user: User | null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
    } else {
      setProjects((data || []).map(transformProject));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const createProject = async (name: string, pinCode: string, initialSlides: any[]) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          name,
          user_id: user.id,
          pin_code: pinCode,
          slides: initialSlides,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return null;
    }

    const newProject = transformProject(data);
    setProjects([newProject, ...projects]);
    return newProject;
  };

  const updateTimeout = useRef<any>(null);
  const pendingUpdates = useRef<any>({});
  const pendingId = useRef<string | null>(null);

  const flushUpdates = async () => {
    if (!pendingId.current || Object.keys(pendingUpdates.current).length === 0) return;
    const id = pendingId.current;
    const updates = pendingUpdates.current;
    pendingUpdates.current = {};
    pendingId.current = null;

    const supabaseUpdates: any = {};
    if (updates.name !== undefined) supabaseUpdates.name = updates.name;
    if (updates.pinCode !== undefined) supabaseUpdates.pin_code = updates.pinCode;
    if (updates.aiKnowledgeFiles !== undefined) supabaseUpdates.ai_knowledge_files = updates.aiKnowledgeFiles;
    if (updates.slides !== undefined) supabaseUpdates.slides = updates.slides;

    const { error } = await supabase
      .from('projects')
      .update(supabaseUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating project:', error);
      fetchProjects();
    }
  };

  const updateProject = async (id: string, updates: any) => {
    let finalUpdates = { ...updates };

    // Optimistically calculate meta updates
    const proj = projects.find(p => p.id === id);
    if (proj) {
      const currentScheduleEnabled = updates.scheduleEnabled !== undefined ? updates.scheduleEnabled : (proj.scheduleEnabled || false);
      const currentScheduleStart = updates.scheduleStart !== undefined ? updates.scheduleStart : (proj.scheduleStart || "");
      const currentScheduleEnd = updates.scheduleEnd !== undefined ? updates.scheduleEnd : (proj.scheduleEnd || "");
      
      const cleanSlides = (updates.slides !== undefined ? updates.slides : (proj.slides || [])).filter((s: any) => s.isScheduleMeta !== true);
      
      const metaSlide = {
        isScheduleMeta: true,
        scheduleEnabled: currentScheduleEnabled,
        scheduleStart: currentScheduleStart,
        scheduleEnd: currentScheduleEnd
      };

      finalUpdates.slides = [...cleanSlides, metaSlide];
    }

    // Optimistic update with functional state to prevent race conditions
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return { 
          ...p, 
          ...updates,
          slides: (updates.slides !== undefined ? updates.slides : (p.slides || [])).filter((s: any) => s.isScheduleMeta !== true)
        };
      }
      return p;
    }));

    if (pendingId.current && pendingId.current !== id) {
      await flushUpdates();
    }
    
    pendingId.current = id;
    pendingUpdates.current = { ...pendingUpdates.current, ...finalUpdates };

    if (updateTimeout.current) clearTimeout(updateTimeout.current);
    updateTimeout.current = setTimeout(flushUpdates, 1000);

    return true;
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      return false;
    }

    setProjects(projects.filter((p) => p.id !== id));
    return true;
  };

  const findProjectByPin = async (pin: string) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .ilike('pin_code', pin)
      .single();

    if (error) {
      console.error('Error finding project by pin:', error);
      return null;
    }

    return transformProject(data);
  };

  const getProject = async (id: string) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching project:', error);
      return null;
    }
    return transformProject(data);
  };

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    findProjectByPin,
    getProject,
    refresh: fetchProjects,
  };
}

