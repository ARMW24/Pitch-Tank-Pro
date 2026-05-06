import { useState, useEffect } from 'react';
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

export function useProjects(user: User | null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    setLoading(true);
    const saved = localStorage.getItem('pitch_tank_projects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse local projects', e);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const saveProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    localStorage.setItem('pitch_tank_projects', JSON.stringify(newProjects));
  };

  const createProject = async (name: string, pinCode: string, initialSlides: any[]) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      userId: user?.id || 'local-user',
      pinCode,
      aiKnowledgeFiles: [],
      slides: initialSlides,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveProjects([newProject, ...projects]);
    return newProject;
  };

  const updateProject = async (id: string, updates: any) => {
    let updatedProject: Project | null = null;
    const newProjects = projects.map(p => {
      if (p.id === id) {
        updatedProject = { ...p, ...updates, updatedAt: new Date().toISOString() };
        return updatedProject;
      }
      return p;
    });
    if (updatedProject) {
      saveProjects(newProjects);
    }
    return updatedProject;
  };

  const deleteProject = async (id: string) => {
    saveProjects(projects.filter(p => p.id !== id));
    return true;
  };

  const findProjectByPin = async (pin: string) => {
    const saved = localStorage.getItem('pitch_tank_projects');
    if (saved) {
      try {
        const parsed: Project[] = JSON.parse(saved);
        return parsed.find(p => p.pinCode === pin) || null;
      } catch (e) {}
    }
    return projects.find(p => p.pinCode === pin) || null;
  };

  const getProject = async (id: string) => {
    const saved = localStorage.getItem('pitch_tank_projects');
    if (saved) {
      try {
        const parsed: Project[] = JSON.parse(saved);
        return parsed.find(p => p.id === id) || null;
      } catch (e) {}
    }
    return projects.find(p => p.id === id) || null;
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
