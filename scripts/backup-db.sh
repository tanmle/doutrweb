#!/bin/bash

# Ensure npx is available
if ! command -v npx &> /dev/null; then
    echo "npx command not found. Please install nodejs and npm first."
    exit 1
fi

# Check if logged in
echo "Checking Supabase login status..."
if ! npx supabase projects list > /dev/null 2>&1; then
    echo "You are not logged in to Supabase CLI."
    echo "Please run the following command to login first:"
    echo "  npx supabase login"
    exit 1
fi

# Extract project ref from .env.local if possible, or use hardcoded one
# The project ref is typically the subdomain of the SUPABASE_URL
PROJECT_REF=""
if [ -f .env.local ]; then
    # Try to extract from NEXT_PUBLIC_SUPABASE_URL using regex
    # Example format: https://cmfijxugvymrqltyfcho.supabase.co
    PROJECT_REF=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | sed -E 's/.*https:\/\/([^.]+)\.supabase\.co.*/\1/')
fi

if [ -z "$PROJECT_REF" ]; then
    echo "Could not find project info in .env.local."
    read -p "Enter your Supabase Project ID: " PROJECT_REF
fi

if [ -z "$PROJECT_REF" ]; then
    echo "Project ID is required."
    exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="supabase/backups"
mkdir -p "$BACKUP_DIR"
OUTPUT_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

echo "Backing up database for project $PROJECT_REF..."

# Check if project is linked
if [ ! -f "supabase/config.toml" ]; then
    echo "Project is not linked locally. Linking now..."
    echo "You may be asked for your database password."
    npx supabase link --project-ref "$PROJECT_REF"
    if [ $? -ne 0 ]; then
        echo "Failed to link project. Please ensure you have the correct permissions and password."
        echo "You can try linking manually with: npx supabase link --project-ref $PROJECT_REF"
        exit 1
    fi
fi

# Backup Schema
SCHEMA_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}_schema.sql"
echo "Dumping schema to $SCHEMA_FILE..."
# Note: --project-ref is not supported by db dump, it uses linked project
npx supabase db dump -f "$SCHEMA_FILE"
SCHEMA_EXIT_CODE=$?

# Backup Data
DATA_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}_data.sql"
echo "Dumping data to $DATA_FILE..."
npx supabase db dump --data-only -f "$DATA_FILE"
DATA_EXIT_CODE=$?

if [ $SCHEMA_EXIT_CODE -eq 0 ] && [ $DATA_EXIT_CODE -eq 0 ]; then
    echo "Backup successful!"
    echo "Schema saved to: $SCHEMA_FILE"
    echo "Data saved to: $DATA_FILE"
else
    echo "Backup failed. Please check the error messages above."
    if [ $SCHEMA_EXIT_CODE -ne 0 ]; then echo "Schema dump failed."; fi
    if [ $DATA_EXIT_CODE -ne 0 ]; then echo "Data dump failed."; fi
    exit 1
fi
