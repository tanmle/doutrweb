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

async function importPayroll() {
    const filePath = path.resolve(process.cwd(), 'DOUTR - Finance - Payroll.csv');
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

    let currentMonth: string | null = null;
    let currentStandardWorkDays: number = 0;

    const payrollsToInsert: any[] = [];

    // Regex to match Month Headers
    // Examples: "Tháng 9/2024", "25-Mar", "25-Apr"
    // Note: CSV view shows "25-Mar" which xlsx might parse as date or string "25-Mar"
    // Wait, let's look at the actual CSV content provided in view_file.
    // Line 2: "Tháng 9/2024",,,,"23,780,000 ₫",Standard Work Date,25
    // Line 55: "25-Mar",,,,"53,711,538 ₫",Standard Work Date,26
    // Line 100: "25-Jul",,,,"50,000,000 ₫",Standard Work Date,27

    // It seems headers are in the first column (index 0). 
    // And "Standard Work Date" is at index 5, value at index 6.

    console.log(`Total rows found: ${rows.length}`);

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const col0 = (row[0] || '').toString().trim();

        // Check if it is a header row
        // A header row usually has "Standard Work Date" in column 5 (index 5) 
        // OR we detect the Month pattern in col 0.

        const col5 = (row[5] || '').toString().trim();
        if (col5.toLowerCase().includes('standard work date')) {
            // It's a header row
            const stdDays = parseFloat(row[6]);
            if (!isNaN(stdDays)) {
                currentStandardWorkDays = stdDays;
            }

            // Parse Month from col0
            // Cases: "Tháng 9/2024", "25-Mar", "25-Jun", "Tháng 10/2024"
            let monthStr = col0;

            // Normalize "Tháng 9/2024" -> "2024-09"
            // Normalize "25-Mar" -> This year? Or look at context?
            // Wait, "25-Mar" in the file is likely "Mar-25" (March 2025) interpreted by Excel?
            // Lines 44: "Tháng 2/2025"
            // Lines 55: "25-Mar". This likely means March 2025.
            // Lines 84: "25-Jun". June 2025.

            let year = '';
            let month = '';

            if (monthStr.toLowerCase().startsWith('tháng')) {
                const match = monthStr.match(/[Tt]háng\s+(\d{1,2})\/(\d{4})/);
                if (match) {
                    month = match[1].padStart(2, '0');
                    year = match[2];
                    currentMonth = (`${year}-${month}-01`);
                }
            } else {
                // Try parsing "25-Mar", "25-Apr" style
                // Usually these are MM-YY or DD-Mon 
                // Given the sequence (Feb 2025 -> Mar -> Apr ...), "25-Mar" likely means March 2025.
                // But "25" could form the year 2025.
                // Let's assume content is Month-Year where Month is short text, Year is 2 digits.
                // Or format: YY-Mon? No, 25-Mar -> Year 25, Month Mar.

                // If date parsing is ambiguous, let's rely on the sequence or regex.
                // Regex for "25-Mon" or "Mon-25"
                // Actually, looking at file: "Tháng 2/2025" -> "25-Mar" (March 2025)
                // So "25" is the year 2025.

                const parts = monthStr.split('-');
                if (parts.length === 2) {
                    // Check which part is numeric 25
                    const p0 = parts[0]; // "25"
                    const p1 = parts[1]; // "Mar"

                    let y = '';
                    let m = '';

                    if (!isNaN(parseInt(p0)) && parseInt(p0) === 25) {
                        y = '2025';
                        m = p1;
                    } else if (!isNaN(parseInt(p1)) && parseInt(p1) === 25) {
                        y = '2025';
                        m = p0;
                    }

                    if (y && m) {
                        const date = new Date(`${m} 1, 2000`); // Parse month name
                        if (!isNaN(date.getTime())) {
                            const mNum = date.getMonth() + 1;
                            currentMonth = `${y}-${mNum.toString().padStart(2, '0')}-01`;
                        }
                    }
                }
            }

            console.log(`Row ${i + 1}: Header found "${col0}". Set Month=${currentMonth}, StdDays=${currentStandardWorkDays}`);
            continue;
        }

        // Process Data Row
        // Structure: #, ID, Base Salary, Actual work day, Total Salary
        // Col 1: ID
        // Col 2: Base Salary
        // Col 3: Actual work day
        // Col 4: Total Salary

        const userId = row[1];
        if (!userId || !userId.toString().includes('-')) continue; // Valid UUID has dashes

        if (!currentMonth) continue; // Skip if no month context

        // Parse values
        const baseSalaryRaw = row[2]; // "10,000,000 ₫ "
        let baseSalary = 0;
        if (baseSalaryRaw) {
            baseSalary = parseFloat(baseSalaryRaw.toString().replace(/[^0-9.-]+/g, ''));
        }

        const actualWorkDays = parseFloat(row[3]);

        const totalSalaryRaw = row[4];
        let totalSalary = 0;
        if (totalSalaryRaw) {
            totalSalary = parseFloat(totalSalaryRaw.toString().replace(/[^0-9.-]+/g, ''));
        }

        // Construct record
        payrollsToInsert.push({
            user_id: userId,
            month: currentMonth,
            standard_work_days: currentStandardWorkDays,
            actual_work_days: isNaN(actualWorkDays) ? 0 : actualWorkDays,
            total_salary: isNaN(totalSalary) ? 0 : totalSalary,
            bonus: 0, // Not in CSV
            status: 'paid', // All paid as per instruction
            created_at: new Date().toISOString()
        });
    }

    console.log(`Parsed ${payrollsToInsert.length} payroll records to insert.`);

    if (payrollsToInsert.length === 0) {
        return;
    }

    // Insert loop
    const chunkSize = 50;
    for (let i = 0; i < payrollsToInsert.length; i += chunkSize) {
        const chunk = payrollsToInsert.slice(i, i + chunkSize);
        // Upserting might be safer to avoid duplicate errors on re-runs if unique constraint exists
        // But standard insert is fine if table empty or we rely on ID. 
        // We don't have CSV IDs mapped to DB IDs, so likely they will be new records.
        // If we want to avoid duplicates on (user_id, month), we should stick to that constraint if it exists.
        // Let's assume plain insert for now.

        const { error } = await supabase.from('payroll_records').upsert(chunk, { onConflict: 'user_id, month' });

        if (error) {
            console.error('Error inserting chunk:', error);
        } else {
            console.log(`Inserted chunk ${i / chunkSize + 1}/${Math.ceil(payrollsToInsert.length / chunkSize)}`);
        }
    }

    // Also optionally update User Base Salary in Profiles?
    // User asked to import to Payroll, didn't explicitly say update User Profile base salary.
    // But typically Base Salary is user property. 
    // Maybe we skip this to be safe, or just do it.
    // Let's strictly import to payroll_records as requested.
}

importPayroll().catch(console.error);
