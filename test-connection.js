
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars manually since we are running with node
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envConfig = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '.env.local')));

const SUPABASE_URL = envConfig.VITE_SUPABASE_URL;
const SUPABASE_KEY = envConfig.VITE_SUPABASE_ANON_KEY;

console.log('Testing connection to:', SUPABASE_URL);
console.log('Key length:', SUPABASE_KEY ? SUPABASE_KEY.length : 0);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
    try {
        const { data, error } = await supabase.from('services').select('*').limit(1);
        if (error) {
            console.error('Supabase Error:', error);
            // Try a public table or just check health if authentication fails
            console.log('Trying to fetch auth session...');
            const { data: authData, error: authError } = await supabase.auth.getSession();
            if (authError) console.error('Auth Error:', authError);
            else console.log('Auth Session Check: OK');
        } else {
            console.log('Success! Connected to Supabase.');
            console.log('Data sample:', data);
        }
    } catch (err) {
        console.error('Unexpected Error:', err);
    }
}

testConnection();
