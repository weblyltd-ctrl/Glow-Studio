
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envConfig = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '.env.local')));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function inspectSchema() {
    console.log('Inspecting schema for studio_settings...');
    // Note: accessing information_schema might require permissions, let's try.
    // If this fails, we will try to insert a dummy row and see the error which might list columns.

    // Method 1: RPC or just try to select * again with error handling
    const { data, error } = await supabase.from('studio_settings').select('*').limit(1);

    if (error) {
        console.log('Select * Error:', error);
        if (error.code === '42703') {
            console.log('Column issue confirmed.');
        }
    } else {
        if (data && data.length > 0) {
            console.log('Row found. Keys:', Object.keys(data[0]));
        } else {
            console.log('Table found but empty. Cannot confirm column names from data.');
        }
    }
}

inspectSchema();
