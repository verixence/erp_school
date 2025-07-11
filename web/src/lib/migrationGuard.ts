/**
 * 🛡️ Migration Guard
 * 
 * This module provides functions to check if database migrations have been applied
 * and shows helpful error messages if they haven't.
 */

import { createClient } from '@/lib/supabase-client';
import { toast } from 'sonner';

/**
 * Check if report templates table exists and has the required columns
 */
export async function verifyReportTemplatesMigration(): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Try to query the report_templates table
    const { data, error } = await supabase
      .from('report_templates')
      .select('id, name, board, grade_rules, i18n_bundle, template_html, template_css, meta, class_range')
      .limit(1);

    if (error) {
      console.error('Migration check failed:', error);
      
      // Show helpful error message
      toast.error('Database Migration Required', {
        description: 'Please run: pnpm db:mcp to apply the latest migrations',
        duration: 10000,
        action: {
          label: 'Copy Command',
          onClick: () => {
            navigator.clipboard.writeText('pnpm db:mcp');
            toast.success('Command copied to clipboard');
          }
        }
      });
      
      return false;
    }

    return true;
  } catch (error) {
    console.error('Migration verification failed:', error);
    
    toast.error('Database Connection Error', {
      description: 'Unable to verify database state. Please check your connection.',
      duration: 5000
    });
    
    return false;
  }
}

/**
 * Verify all required migrations for the report templates feature
 */
export async function verifyAllMigrations(): Promise<boolean> {
  const reportTemplatesOk = await verifyReportTemplatesMigration();
  return reportTemplatesOk;
} 