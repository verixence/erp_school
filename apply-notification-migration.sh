#!/bin/bash

# Apply Notification Sync System Migration
# This script applies the notification system to your Supabase database

echo "🚀 Applying Notification Sync System Migration..."
echo ""

# Check if supabase CLI is installed
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI found"
    echo "📝 Applying migration..."
    
    cd "$(dirname "$0")"
    
    # Apply the migration
    supabase db push --db-url "$DATABASE_URL" < db/migrations/notification_sync_system.sql
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migration applied successfully!"
        echo ""
        echo "🔍 Verifying installation..."
        
        # Verify functions were created
        supabase db execute --db-url "$DATABASE_URL" <<SQL
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'queue_push_notification',
  'create_bulk_notifications_with_push',
  'send_push_to_users',
  'get_users_by_audience'
);
SQL
        
        echo ""
        echo "✅ All done! Notification system is ready."
        echo ""
        echo "📋 Next steps:"
        echo "   1. Restart your web app (npm run dev in web/)"
        echo "   2. Test by creating an announcement"
        echo ""
    else
        echo "❌ Migration failed. Please check the error above."
        exit 1
    fi
else
    echo "⚠️  Supabase CLI not found"
    echo ""
    echo "Please apply the migration manually using one of these methods:"
    echo ""
    echo "📝 Option 1: Using Supabase Dashboard"
    echo "   1. Open https://supabase.com/dashboard"
    echo "   2. Go to SQL Editor"
    echo "   3. Copy contents of: db/migrations/notification_sync_system.sql"
    echo "   4. Paste and click 'Run'"
    echo ""
    echo "📝 Option 2: Using psql"
    echo "   psql YOUR_DATABASE_URL < db/migrations/notification_sync_system.sql"
    echo ""
fi

