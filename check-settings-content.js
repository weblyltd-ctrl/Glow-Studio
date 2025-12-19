
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envConfig = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '.env.local')));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function dumpSettings() {
    console.log('Dumping studio_settings...');
    const { data, error } = await supabase.from('studio_settings').select('*');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Data:', data);
    }
}

dumpSettings();
