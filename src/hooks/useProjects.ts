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
  defaultAudio?: boolean;
  defaultAuto?: boolean;
  defaultSubs?: boolean;
  accessCodeRequired?: boolean;
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
    defaultAudio: meta.defaultAudio !== undefined ? meta.defaultAudio : true,
    defaultAuto: meta.defaultAuto !== undefined ? meta.defaultAuto : false,
    defaultSubs: meta.defaultSubs !== undefined ? meta.defaultSubs : true,
    accessCodeRequired: meta.accessCodeRequired !== undefined ? meta.accessCodeRequired : true,
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

  const createProject = async (name: string, pinCode: string, initialSlides: any[], aiKnowledgeFiles?: any[]) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          name,
          user_id: user.id,
          pin_code: pinCode,
          slides: initialSlides,
          ai_knowledge_files: aiKnowledgeFiles || [],
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return null;
    }

    const newProject = transformProject(data);
    setProjects(prev => {
      const updated = [newProject, ...prev];
      projectsRef.current = updated;
      return updated;
    });
    return newProject;
  };

  const projectsRef = useRef<Project[]>([]);
  
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const updateTimeout = useRef<any>(null);
  const pendingUpdates = useRef<any>({});
  const pendingId = useRef<string | null>(null);

  const flushUpdates = async () => {
    console.log('[useProjects] flushUpdates called. pendingId:', pendingId.current, 'pendingUpdates:', pendingUpdates.current);
    if (!pendingId.current || Object.keys(pendingUpdates.current).length === 0) {
      console.log('[useProjects] flushUpdates early return: nothing to update.');
      return;
    }
    const id = pendingId.current;
    const updates = pendingUpdates.current;
    pendingUpdates.current = {};
    pendingId.current = null;

    const supabaseUpdates: any = {};
    if (updates.name !== undefined) supabaseUpdates.name = updates.name;
    if (updates.pinCode !== undefined) supabaseUpdates.pin_code = updates.pinCode;
    if (updates.aiKnowledgeFiles !== undefined) supabaseUpdates.ai_knowledge_files = updates.aiKnowledgeFiles;
    if (updates.slides !== undefined) supabaseUpdates.slides = updates.slides;

    console.log('[useProjects] Sending update to Supabase:', supabaseUpdates);
    const { error } = await supabase
      .from('projects')
      .update(supabaseUpdates)
      .eq('id', id);

    if (error) {
      console.error('[useProjects] Error updating project in Supabase:', error);
      fetchProjects();
    } else {
      console.log('[useProjects] Supabase update successful for project:', id);
    }
  };

  const updateProject = async (id: string, updates: any, options?: { immediate?: boolean }) => {
    console.log('[useProjects] updateProject called for project id:', id, 'with updates:', updates, 'options:', options);
    let finalUpdates = { ...updates };

    // Optimistically calculate meta updates
    const proj = projectsRef.current.find(p => p.id === id);
    if (proj) {
      console.log('[useProjects] Found active project in local state:', proj.name);
      const currentScheduleEnabled = updates.scheduleEnabled !== undefined ? updates.scheduleEnabled : (proj.scheduleEnabled || false);
      const currentScheduleStart = updates.scheduleStart !== undefined ? updates.scheduleStart : (proj.scheduleStart || "");
      const currentScheduleEnd = updates.scheduleEnd !== undefined ? updates.scheduleEnd : (proj.scheduleEnd || "");
      const currentDefaultAudio = updates.defaultAudio !== undefined ? updates.defaultAudio : (proj.defaultAudio !== undefined ? proj.defaultAudio : true);
      const currentDefaultAuto = updates.defaultAuto !== undefined ? updates.defaultAuto : (proj.defaultAuto !== undefined ? proj.defaultAuto : false);
      const currentDefaultSubs = updates.defaultSubs !== undefined ? updates.defaultSubs : (proj.defaultSubs !== undefined ? proj.defaultSubs : true);
      const currentAccessCodeRequired = updates.accessCodeRequired !== undefined ? updates.accessCodeRequired : (proj.accessCodeRequired !== undefined ? proj.accessCodeRequired : true);
      
      const cleanSlides = (updates.slides !== undefined ? updates.slides : (proj.slides || [])).filter((s: any) => s.isScheduleMeta !== true);
      
      const metaSlide = {
        isScheduleMeta: true,
        scheduleEnabled: currentScheduleEnabled,
        scheduleStart: currentScheduleStart,
        scheduleEnd: currentScheduleEnd,
        defaultAudio: currentDefaultAudio,
        defaultAuto: currentDefaultAuto,
        defaultSubs: currentDefaultSubs,
        accessCodeRequired: currentAccessCodeRequired
      };

      finalUpdates.slides = [...cleanSlides, metaSlide];
      console.log('[useProjects] Generated metadata slide with values:', metaSlide);
    } else {
      console.warn('[useProjects] Could NOT find active project in local projects state for id:', id);
    }

    // Optimistic update with functional state to prevent race conditions
    setProjects(prev => {
      const updated = prev.map(p => {
        if (p.id === id) {
          const newProj = { 
            ...p, 
            ...updates,
            slides: (updates.slides !== undefined ? updates.slides : (p.slides || [])).filter((s: any) => s.isScheduleMeta !== true)
          };
          console.log('[useProjects] Optimistic update for project in setProjects:', newProj);
          return newProj;
        }
        return p;
      });
      projectsRef.current = updated;
      return updated;
    });

    if (pendingId.current && pendingId.current !== id) {
      console.log('[useProjects] Different project id detected. Flushing previous updates first.');
      await flushUpdates();
    }
    
    pendingId.current = id;
    pendingUpdates.current = { ...pendingUpdates.current, ...finalUpdates };
    console.log('[useProjects] Set pendingUpdates.current to:', pendingUpdates.current);

    if (updateTimeout.current) {
      console.log('[useProjects] Clearing previous updateTimeout.');
      clearTimeout(updateTimeout.current);
      updateTimeout.current = null;
    }

    if (options?.immediate) {
      console.log('[useProjects] Options specify immediate save. Executing flushUpdates now.');
      await flushUpdates();
    } else {
      updateTimeout.current = setTimeout(() => {
        console.log('[useProjects] Debounce timeout fired. Executing flushUpdates.');
        flushUpdates();
      }, 1000);
    }

    return true;
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      return false;
    }

    setProjects(prev => {
      const updated = prev.filter((p) => p.id !== id);
      projectsRef.current = updated;
      return updated;
    });
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

