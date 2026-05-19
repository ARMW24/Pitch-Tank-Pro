import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const sessId = '00000000-0000-0000-0000-000000000009';
  console.log("Attempting Update...");
  const { error: uErr } = await supabase.from('sessions').update({ time_spent: 999 }).eq('id', sessId);
  if (uErr) {
    console.error("Update Error:", uErr);
  } else {
    console.log("Updated without error!");
  }
}
run();
