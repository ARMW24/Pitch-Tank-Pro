import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const sessId = '00000000-0000-0000-0000-000000000007';
  const projectId = 'ec719c77-53a5-4d26-a20f-13c97af2bcea';
  
  console.log("Inserting session...");
  const { data: iData, error: iErr } = await supabase.from('sessions').insert({
    id: sessId,
    project_id: projectId, 
    name: 'Test Update', email: 'test@test.com', started_at: new Date().toISOString(), last_ping: new Date().toISOString(), time_spent: 0, has_feedback: false
  }).select();
  
  if (iErr) {
    console.error("Insert Error:", iErr);
    return;
  }
  console.log("Inserted!", iData);
  
  console.log("Attempting Update...");
  const { data: uData, error: uErr } = await supabase.from('sessions').update({ time_spent: 30 }).eq('id', sessId).select();
  if (uErr) {
    console.error("Update Error:", uErr);
  } else {
    console.log("Updated!", uData);
  }
}
run();
