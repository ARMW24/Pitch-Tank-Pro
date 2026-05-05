import { useState, useEffect } from 'react';
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

  const updateProject = async (id: string, updates: any) => {
    // Map camelCase to snake_case for Supabase
    const supabaseUpdates: any = {};
    if (updates.name !== undefined) supabaseUpdates.name = updates.name;
    if (updates.pinCode !== undefined) supabaseUpdates.pin_code = updates.pinCode;
    if (updates.aiKnowledgeFiles !== undefined) supabaseUpdates.ai_knowledge_files = updates.aiKnowledgeFiles;
    if (updates.slides !== undefined) supabaseUpdates.slides = updates.slides;

    const { data, error } = await supabase
      .from('projects')
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      return null;
    }

    const updatedProject = transformProject(data);
    setProjects(projects.map((p) => (p.id === id ? updatedProject : p)));
    return updatedProject;
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
      .select('id')
      .eq('pin_code', pin)
      .single();

    if (error) {
      console.error('Error finding project by pin:', error);
      return null;
    }

    return data.id;
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

