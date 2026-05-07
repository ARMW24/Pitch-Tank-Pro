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

const transformProject = (data: any): Project => ({
  id: data.id,
  name: data.name,
  userId: data.user_id,
  pinCode: data.pin_code,
  aiKnowledgeFiles: data.ai_knowledge_files || [],
  slides: data.slides || [],
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  scheduleEnabled: data.schedule_enabled || false,
  scheduleStart: data.schedule_start || "",
  scheduleEnd: data.schedule_end || "",
});

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
    if (updates.scheduleEnabled !== undefined) supabaseUpdates.schedule_enabled = updates.scheduleEnabled;
    if (updates.scheduleStart !== undefined) supabaseUpdates.schedule_start = updates.scheduleStart;
    if (updates.scheduleEnd !== undefined) supabaseUpdates.schedule_end = updates.scheduleEnd;

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
    // Optimistic update with functional state to prevent race conditions
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, ...updates };
      }
      return p;
    }));

    if (pendingId.current && pendingId.current !== id) {
      await flushUpdates();
    }
    
    pendingId.current = id;
    pendingUpdates.current = { ...pendingUpdates.current, ...updates };

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

