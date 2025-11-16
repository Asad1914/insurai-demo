#!/bin/bash
# Run database migration to add structured_features column

cd /home/asad/insurnace_bot/backend

# Source .env file to get database credentials
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run migration
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/add_structured_features.sql

echo "✅ Migration completed!"
