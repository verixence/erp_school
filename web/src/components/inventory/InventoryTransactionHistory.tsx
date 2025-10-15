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
        ) : transactionsData?.transactions?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No transactions found</p>
        ) : (
          <div className="space-y-3">
            {transactionsData?.transactions?.map((transaction: any) => (
              <div
                key={transaction.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    {getTransactionIcon(transaction.transaction_type)}
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base">{transaction.item?.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>Code: {transaction.item?.item_code}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          ['purchase', 'return', 'adjustment'].includes(transaction.transaction_type)
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {transaction.transaction_type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${getTransactionColor(transaction.transaction_type)}`}>
                      {['issue', 'damage', 'loss'].includes(transaction.transaction_type) ? '-' : '+'}
                      {transaction.quantity}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(transaction.transaction_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>

                {/* Additional information */}
                <div className="mt-3 pt-3 border-t space-y-1.5">
                  {transaction.user?.display_name && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Processed by:</span>
                      <span className="font-medium text-gray-700">{transaction.user.display_name}</span>
                    </div>
                  )}
                  {transaction.reference_number && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Reference:</span>
                      <span className="font-mono text-gray-700">{transaction.reference_number}</span>
                    </div>
                  )}
                  {transaction.notes && (
                    <div className="text-sm mt-2">
                      <span className="text-gray-500">Notes:</span>
                      <p className="text-gray-700 mt-1 pl-2 border-l-2 border-gray-200">{transaction.notes}</p>
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
