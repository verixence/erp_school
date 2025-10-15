'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';

interface InventoryTransactionHistoryProps {
  schoolId: string;
}

export default function InventoryTransactionHistory({ schoolId }: InventoryTransactionHistoryProps) {
  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['inventory-transactions', schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/inventory/transactions?school_id=${schoolId}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
  });

  const getTransactionIcon = (type: string) => {
    if (['purchase', 'return', 'adjustment'].includes(type)) {
      return <ArrowUp className="h-5 w-5 text-green-500" />;
    } else if (['issue', 'damage', 'loss'].includes(type)) {
      return <ArrowDown className="h-5 w-5 text-red-500" />;
    }
    return <RefreshCw className="h-5 w-5 text-gray-500" />;
  };

  const getTransactionColor = (type: string) => {
    if (['purchase', 'return', 'adjustment'].includes(type)) return 'text-green-600';
    if (['issue', 'damage', 'loss'].includes(type)) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground">Loading transactions...</p>
        ) : (
          <div className="space-y-3">
            {transactionsData?.transactions?.map((transaction: any) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  {getTransactionIcon(transaction.transaction_type)}
                  <div>
                    <h3 className="font-medium">{transaction.item?.name}</h3>
                    <p className="text-sm text-gray-600">
                      Code: {transaction.item?.item_code}
                    </p>
                    <p className={`text-sm capitalize ${getTransactionColor(transaction.transaction_type)}`}>
                      {transaction.transaction_type}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${getTransactionColor(transaction.transaction_type)}`}>
                    {['issue', 'damage', 'loss'].includes(transaction.transaction_type) ? '-' : '+'}
                    {transaction.quantity}
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(transaction.transaction_date).toLocaleDateString()}
                  </div>
                  {transaction.reference_number && (
                    <div className="text-xs text-gray-500">
                      Ref: {transaction.reference_number}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
