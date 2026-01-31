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
        const value = parts.slice(1).join('=')?.trim();
        if (key && value) {
            env[key] = value;
        }
    });
} else {
    console.warn('.env.local not found, checking process.env');
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

async function importSellingFees() {
    const filePath = path.resolve(process.cwd(), 'DOUTR - Finance - selling fee.csv');
    console.log(`Reading file from: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error(`File not found at ${filePath}`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
        console.log("Not enough data rows found.");
        return;
    }

    // Row 0 is header: empty, Sep-24, Oct-24, ...
    const headerRow = rows[0];
    const dateColumns: { colIndex: number; dateStr: string }[] = [];

    for (let c = 1; c < headerRow.length; c++) {
        const headerVal = headerRow[c];
        if (!headerVal) continue;

        // Parse "Sep-24" -> "2024-09-15"
        // Assuming format is Month-YY (e.g. Sep-24 or Sep-2024)
        const parts = headerVal.toString().split('-');
        if (parts.length === 2) {
            const monthStr = parts[0];
            let yearStr = parts[1];
            // Handle 2 digit year
            if (yearStr.length === 2) yearStr = '20' + yearStr;

            const monthIndex = new Date(Date.parse(monthStr + " 1, 2000")).getMonth() + 1;
            if (monthIndex > 0) {
                const formattedDate = `${yearStr}-${monthIndex.toString().padStart(2, '0')}-15`;
                dateColumns.push({ colIndex: c, dateStr: formattedDate });
            }
        }
    }

    console.log(`Found ${dateColumns.length} date columns.`);

    const ownerId = 'de84c563-09f3-4ec2-a188-5a21dbd560d5';
    const feesToInsert: any[] = [];

    let currentNote: string | null = null;

    // Start from row 1 (data)
    // Row 2 sounds like total "Nhập hàng", maybe we skip specific rows? 
    // User says: "the one with no money (for example: KANGOL - Dung/Huong) is the note for the ones under it"

    // Let's iterate rows.
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const firstCol = (row[0] || '').toString().trim();

        // If row has no name in first column and no data, it's likely empty
        // But notice row 11, 12 are empty commas.
        if (!firstCol) continue;

        // Check if this row has any money values in the date columns
        let hasMoney = false;
        for (const dc of dateColumns) {
            const val = row[dc.colIndex];
            if (val) {
                const cleanVal = val.toString().replace(/[^0-9.-]+/g, '');
                if (cleanVal && parseFloat(cleanVal) !== 0) {
                    hasMoney = true;
                    break;
                }
            }
        }

        if (!hasMoney) {
            // It's a Note row (Group Header)
            // e.g., "KANGOL - Dung/Huong"
            // Or strictly "Nhập hàng" (row 2) might have money... row 2 in csv showed totals?
            // Let's check row 2 in CSV screenshot/view:
            // 2: Nhập hàng,0 ₫,0 ₫,"1,225,109 ₫"... -> This HAS money.
            // The instruction says "the one with no money... is the note"
            // So "Nhập hàng" might be a fee itself? Or a category?
            // User said "first column is Fee Name".

            // Row 2: "Nhập hàng" -> has money values. So it is a fee entry?
            // Row 3: "KANGOL - Dung/Huong" -> no money values adjacent?
            // 3: "KANGOL - Dung/Huong",,,,,... (commas)
            // So yes, row 3 is a Note/Group header.

            currentNote = firstCol;
            console.log(`Found group/note: ${currentNote}`);
        } else {
            // It is a specific Fee row
            // e.g. "Sample B001HQO200 - Dung"
            // It belongs to the currentNote (group)

            const feeName = firstCol;

            // Iterate over date columns to find non-zero values
            for (const dc of dateColumns) {
                const rawVal = row[dc.colIndex];
                if (!rawVal) continue;

                const cleanPriceStr = rawVal.toString().replace(/[^0-9.-]+/g, '');
                const price = parseFloat(cleanPriceStr);

                if (!isNaN(price) && price !== 0) {
                    feesToInsert.push({
                        name: feeName,
                        price: price,
                        owner_id: ownerId,
                        date: dc.dateStr,
                        note: currentNote // The group header becomes the note
                    });
                }
            }
        }
    }

    console.log(`Parsed ${feesToInsert.length} selling fees to insert.`);

    if (feesToInsert.length === 0) {
        console.log("No fees found to insert.");
        return;
    }

    // Chunk inserts
    const chunkSize = 50;
    for (let i = 0; i < feesToInsert.length; i += chunkSize) {
        const chunk = feesToInsert.slice(i, i + chunkSize);
        const { error } = await supabase.from('selling_fees').insert(chunk);
        if (error) {
            console.error('Error inserting chunk:', error);
        } else {
            console.log(`Inserted chunk ${i / chunkSize + 1}/${Math.ceil(feesToInsert.length / chunkSize)}`);
        }
    }
}

importSellingFees().catch(console.error);
