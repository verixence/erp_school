#!/bin/bash

# Simple script to apply the inventory management migration
# This reads the SQL file and provides instructions

MIGRATION_FILE="db/migrations/0065_inventory_management_system.sql"

echo "=================================================="
echo "Inventory Management System - Migration Helper"
echo "=================================================="
echo ""
echo "Migration file: $MIGRATION_FILE"
echo ""
echo "To apply this migration, you have two options:"
echo ""
echo "Option 1: Copy SQL to Supabase Dashboard (Recommended)"
echo "--------------------------------------------------------"
echo "1. Go to your Supabase project dashboard"
echo "2. Click on 'SQL Editor' in the left sidebar"
echo "3. Click 'New Query'"
echo "4. Copy and paste the SQL from: $MIGRATION_FILE"
echo "5. Click 'Run' to execute"
echo ""
echo "Option 2: Use Supabase CLI"
echo "--------------------------------------------------------"
echo "If you have Supabase CLI installed, run:"
echo "  cd $(pwd)"
echo "  supabase db push"
echo ""
echo "=================================================="
echo ""
echo "The migration will create these tables:"
echo "  • inventory_categories"
echo "  • inventory_items"
echo "  • inventory_stock_transactions"
echo "  • inventory_issuances"
echo "  • inventory_maintenance"
echo "  • inventory_purchase_orders"
echo "  • inventory_purchase_order_items"
echo ""
echo "=================================================="
echo ""

# Offer to display the SQL
read -p "Would you like to see the SQL content now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo ""
    echo "========== SQL CONTENT =========="
    cat "$MIGRATION_FILE"
    echo ""
    echo "========== END OF SQL =========="
fi

echo ""
echo "After applying the migration, refresh your browser"
echo "and the inventory system will be fully functional!"
echo ""
