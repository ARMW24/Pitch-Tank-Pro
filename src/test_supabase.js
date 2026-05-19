import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env
const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
  console.error('Failed to read Supabase configuration from .env');
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseAnonKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const transformProject = (data) => {
  const allSlides = data.slides || [];
  const meta = allSlides.find((s) => s.isScheduleMeta === true) || {};
  const cleanSlides = allSlides.filter((s) => s.isScheduleMeta !== true);

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
  };
};

async function run() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('name', 'Pepperdine..')
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    return;
  }

  console.log('Raw Project Data name:', data.name);
  console.log('Raw slides count:', data.slides?.length);
  
  const transformed = transformProject(data);
  console.log('Transformed Project properties:');
  console.log('- defaultAudio:', transformed.defaultAudio);
  console.log('- defaultAuto:', transformed.defaultAuto);
  console.log('- defaultSubs:', transformed.defaultSubs);
}

run();
