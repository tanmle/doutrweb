import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
let env: Record<string, string> = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        const key = parts[0]?.trim();
        // Rejoin value parts in case value contains '='
        const value = parts.slice(1).join('=')?.trim();
        if (key && value) {
            env[key] = value;
        }
    });
} else {
    console.warn('.env.local not found, checking process.env');
    // In case running in an environment where these are already set
    env = process.env as Record<string, string>;
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Service Role Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function importFees() {
    const filePath = path.resolve(process.cwd(), 'DOUTR - Finance - monthly fee.csv');
    console.log(`Reading file from: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error(`File not found at ${filePath}`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // header: 1 returns array of arrays
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let currentDate: string | null = null;
    const feesToInsert: any[] = [];

    console.log(`Total rows found: ${rows.length}`);

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0) continue;

        const col0 = (row[0] || '').toString().trim();

        // Check for Month header
        // Pattern example: "Tháng 9/2024"
        if (col0.toLowerCase().startsWith('tháng')) {
            const match = col0.match(/[Tt]háng\s+(\d{1,2})\/(\d{4})/);
            if (match) {
                const month = match[1].padStart(2, '0');
                const year = match[2];
                currentDate = `${year}-${month}-15`;
                console.log(`Found header "${col0}", switching to date: ${currentDate}`);
            }
            // This is a header row, so we skip processing it as a fee
            continue;
        }

        // If we haven't found a date yet, skip rows (like the main header)
        if (!currentDate) continue;

        // It's a fee row
        const name = col0;
        if (!name) continue; // Skip empty names

        const rawPrice = row[1];
        let price = 0;
        if (rawPrice) {
            // Remove " ₫", commas, spaces. Keep only digits, hyphen, dot.
            // Assuming ',' is thousand separator and not in the number we want to parse unless it's decimal.
            // Based on file check: "42,499,137" -> 42499147.
            const cleanPriceStr = rawPrice.toString().replace(/[^0-9.-]+/g, '');
            price = parseFloat(cleanPriceStr);
            if (isNaN(price)) price = 0;
        }

        const owner_id = row[2] ? row[2].toString().trim() : null;
        const note = row[3] ? row[3].toString().trim() : null;

        feesToInsert.push({
            name,
            price,
            owner_id: owner_id && owner_id.length > 0 ? owner_id : null,
            note,
            date: currentDate
        });
    }

    console.log(`Parsed ${feesToInsert.length} fees to insert.`);

    if (feesToInsert.length === 0) {
        console.log("No fees found to insert.");
        return;
    }

    // Chunk inserts to avoid limits
    const chunkSize = 50;
    for (let i = 0; i < feesToInsert.length; i += chunkSize) {
        const chunk = feesToInsert.slice(i, i + chunkSize);
        // console.log(`Inserting chunk ${i/chunkSize + 1} with ${chunk.length} items...`);
        const { error } = await supabase.from('monthly_fees').insert(chunk);
        if (error) {
            console.error('Error inserting chunk:', error);
        } else {
            console.log(`Inserted chunk ${i / chunkSize + 1}/${Math.ceil(feesToInsert.length / chunkSize)}`);
        }
    }
}

importFees().catch(console.error);
