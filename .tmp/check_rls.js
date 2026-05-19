import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
const supabaseUrl = urlMatch[1].trim();
const supabaseAnonKey = keyMatch[1].trim();

// To bypass RLS and query pg_policies we need a service role key.
// But wait, the user must have set up the tables.
// Let's just fetch all sessions to see if there are any.
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('sessions').select('*').limit(5);
  console.log("Sessions:", data, error);
}
run();
