import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('school_id');

  if (!schoolId) {
    return NextResponse.json({ error: 'School ID required' }, { status: 400 });
  }

  try {
    // Get total items count
    const { count: totalItems } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'active');

    // Get low stock items count
    const { data: allItems } = await supabase
      .from('inventory_items')
      .select('id, name, current_stock, minimum_stock_level')
      .eq('school_id', schoolId)
      .eq('status', 'active');

    const lowStockItems = allItems?.filter(item => item.current_stock <= item.minimum_stock_level) || [];

    // Get active issuances count
    const { count: activeIssuances } = await supabase
      .from('inventory_issuances')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'issued');

    // Get overdue issuances
    const today = new Date().toISOString().split('T')[0];
    const { data: overdueIssuances } = await supabase
      .from('inventory_issuances')
      .select(`
        id,
        issued_to_name,
        expected_return_date,
        item:inventory_items(name)
      `)
      .eq('school_id', schoolId)
      .eq('status', 'issued')
      .lt('expected_return_date', today);

    // Get total inventory value
    const { data: items } = await supabase
      .from('inventory_items')
      .select('current_stock, unit_price')
      .eq('school_id', schoolId)
      .eq('status', 'active');

    const totalValue = items?.reduce(
      (sum, item) => sum + (item.current_stock * item.unit_price),
      0
    ) || 0;

    // Get items by category
    const { data: categoryStats } = await supabase
      .from('inventory_items')
      .select(`
        category_id,
        category:inventory_categories(name),
        current_stock
      `)
      .eq('school_id', schoolId)
      .eq('status', 'active');

    const categorySummary = categoryStats?.reduce((acc: any, item: any) => {
      const categoryName = item.category?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = { count: 0, totalStock: 0 };
      }
      acc[categoryName].count += 1;
      acc[categoryName].totalStock += item.current_stock;
      return acc;
    }, {});

    // Get recent transactions
    const { data: recentTransactions } = await supabase
      .from('inventory_stock_transactions')
      .select(`
        *,
        item:inventory_items(name, item_code)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      summary: {
        totalItems: totalItems || 0,
        lowStockCount: lowStockItems?.length || 0,
        activeIssuances: activeIssuances || 0,
        overdueIssuances: overdueIssuances?.length || 0,
        totalValue: totalValue,
      },
      lowStockItems: lowStockItems || [],
      overdueIssuances: overdueIssuances || [],
      categorySummary: categorySummary || {},
      recentTransactions: recentTransactions || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
