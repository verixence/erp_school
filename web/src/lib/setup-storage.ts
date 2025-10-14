// Storage bucket setup utility
// Run this once to create the expense-receipts bucket

import { supabase } from './supabase-client';

export async function setupExpenseReceiptsBucket() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return { success: false, error: listError };
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'expense-receipts');

    if (bucketExists) {
      console.log('✓ expense-receipts bucket already exists');
      return { success: true, message: 'Bucket already exists' };
    }

    // Create bucket
    const { data, error } = await supabase.storage.createBucket('expense-receipts', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
    });

    if (error) {
      console.error('Error creating bucket:', error);
      return { success: false, error };
    }

    console.log('✓ expense-receipts bucket created successfully');
    return { success: true, message: 'Bucket created successfully', data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error };
  }
}

// Run if called directly
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // This can be called from browser console: setupExpenseReceiptsBucket()
  (window as any).setupExpenseReceiptsBucket = setupExpenseReceiptsBucket;
}
