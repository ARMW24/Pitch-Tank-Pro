import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const sessId = '00000000-0000-0000-0000-000000000006';
  
  // 1. Fetch to see if it exists. If not, insert.
  let { data, error } = await supabase.from('sessions').select('*').limit(1);
  let projectId = '123e4567-e89b-12d3-a456-426614174000'; // dummy fallback
  if (data && data.length > 0) {
    projectId = data[0].project_id;
  }
  
  console.log("Inserting session with project_id:", projectId);
  const { data: iData, error: iErr } = await supabase.from('sessions').insert({
    id: sessId,
    project_id: projectId, 
    name: 'Test Update', email: 'test@test.com', started_at: new Date().toISOString(), last_ping: new Date().toISOString(), time_spent: 0, has_feedback: false
  }).select();
  
  if (iErr) {
    console.error("Insert Error:", iErr);
  } else {
    console.log("Inserted!");
  }
  
  // Update
  console.log("Attempting Update...");
  const { data: uData, error: uErr } = await supabase.from('sessions').update({ time_spent: 30 }).eq('id', sessId).select();
  if (uErr) {
    console.error("Update Error:", uErr);
  } else {
    console.log("Updated!", uData);
  }
}
run();
