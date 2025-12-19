
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envConfig = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '.env.local')));

const SUPABASE_URL = envConfig.VITE_SUPABASE_URL;
const SUPABASE_KEY = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAdminPassword() {
    console.log('Checking studio_settings table...');
    try {
        const { data: fetchSettings, error } = await supabase.from('studio_settings').select('*').limit(1);

        if (error) {
            console.error('Error fetching settings:', error);
            return;
        }

        console.log('Fetched settings:', fetchSettings);

        // We expect an array now since we didn't use .single() to be safe if table is empty
        const settings = fetchSettings && fetchSettings.length > 0 ? fetchSettings[0] : null;

        if (!settings) {
            console.log('Table studio_settings is empty.');
            return;
        }

        const inputPassword = '102030';
        // Check possible column names
        const passwordFromDb = settings.admin_password || settings.password || settings.key;

        if (passwordFromDb == inputPassword) {
            console.log('Password Match: SUCCESS');
        } else {
            console.log(`Password Mismatch. DB has keys: ${Object.keys(settings).join(',')}. Value: '${passwordFromDb}', Input: '${inputPassword}'`);
        }

    } catch (err) {
        console.error('Unexpected Error:', err);
    }
}

checkAdminPassword();
