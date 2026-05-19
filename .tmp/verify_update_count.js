import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import crypto from 'crypto';
const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const sessId = crypto.randomUUID();
  const projectId = 'ec719c77-53a5-4d26-a20f-13c97af2bcea'; // An existing project id from earlier test
  
  await supabase.from('sessions').insert({
    id: sessId,
    project_id: projectId, 
    name: 'TEST', email: 'test@test.com', started_at: new Date().toISOString(), last_ping: new Date().toISOString(), time_spent: 0, has_feedback: false
  });
  
  const { data, count, error: uErr } = await supabase.from('sessions').update({ time_spent: 500 }, { count: 'exact' }).eq('id', sessId);
  console.log("Update Count:", count);
  console.log("Update Error:", uErr);
}
run();
