'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Eye, Search, Calendar, Receipt as ReceiptIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Receipt {
  id: string;
  receipt_no: string;
  receipt_date: string;
  student_name: string;
  student_admission_no: string;
  student_grade: string;
  student_section: string;
  payment_method: string;
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
  receipt_items: any;
  total_amount: number;
  school_name: string;
  school_address: string;
  school_phone: string | null;
  school_email: string | null;
  school_logo_url: string | null;
}

export default function ParentReceiptsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  // Fetch receipts for parent's children
  const { data: receiptsData, isLoading } = useQuery({
    queryKey: ['parent-receipts'],
    queryFn: async () => {
      const response = await fetch('/api/parent/receipts?limit=100');
      if (!response.ok) throw new Error('Failed to fetch receipts');
      return response.json();
    }
  });

  const receipts = receiptsData?.receipts || [];

  // Filter receipts based on search term
  const filteredReceipts = receipts.filter((receipt: Receipt) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      receipt.receipt_no.toLowerCase().includes(search) ||
      receipt.student_name.toLowerCase().includes(search) ||
      receipt.student_admission_no?.toLowerCase().includes(search)
    );
  });

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowReceiptDialog(true);
  };

  const handleDownloadReceipt = (receipt: Receipt) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to download receipt');
      return;
    }

    const receiptItems = Array.isArray(receipt.receipt_items)
      ? receipt.receipt_items
      : [receipt.receipt_items];

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${receipt.receipt_no}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0;
          }
          .details {
            margin: 20px 0;
          }
          .details table {
            width: 100%;
            border-collapse: collapse;
          }
          .details td {
            padding: 8px 0;
          }
          .items {
            margin: 30px 0;
          }
          .items table {
            width: 100%;
            border-collapse: collapse;
          }
          .items th, .items td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          .items th {
            background-color: #f5f5f5;
          }
          .total {
            font-size: 18px;
            font-weight: bold;
            text-align: right;
            margin-top: 20px;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${receipt.school_logo_url ? `<img src="${receipt.school_logo_url}" alt="School Logo" style="max-width: 150px; max-height: 150px; margin-bottom: 10px;">` : ''}
          <h1>${receipt.school_name}</h1>
          <p>${receipt.school_address}</p>
          ${receipt.school_phone ? `<p>Phone: ${receipt.school_phone}</p>` : ''}
          ${receipt.school_email ? `<p>Email: ${receipt.school_email}</p>` : ''}
          <p class="title">FEE PAYMENT RECEIPT</p>
        </div>

        <div class="details">
          <table>
            <tr>
              <td><strong>Receipt No:</strong></td>
              <td>${receipt.receipt_no}</td>
              <td><strong>Date:</strong></td>
              <td>${new Date(receipt.receipt_date).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td><strong>Student Name:</strong></td>
              <td>${receipt.student_name}</td>
              <td><strong>Admission No:</strong></td>
              <td>${receipt.student_admission_no || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Class/Grade:</strong></td>
              <td>${receipt.student_grade || 'N/A'}</td>
              <td><strong>Section:</strong></td>
              <td>${receipt.student_section || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <div class="items">
          <table>
            <thead>
              <tr>
                <th>Fee Type</th>
                <th style="text-align: right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${receiptItems.map((item: any) => `
                <tr>
                  <td>${item.fee_type}</td>
                  <td style="text-align: right;">₹${Number(item.amount).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="total">
          <p>Total Amount Paid: ₹${Number(receipt.total_amount).toFixed(2)}</p>
        </div>

        <div class="details" style="margin-top: 30px;">
          <table>
            <tr>
              <td><strong>Payment Method:</strong></td>
              <td>${receipt.payment_method.toUpperCase()}</td>
              <td><strong>Payment Date:</strong></td>
              <td>${new Date(receipt.payment_date).toLocaleDateString()}</td>
            </tr>
            ${receipt.reference_number ? `
            <tr>
              <td><strong>Reference No:</strong></td>
              <td colspan="3">${receipt.reference_number}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div class="footer">
          <p>This is a computer-generated receipt and does not require a signature.</p>
          <p>For any queries, please contact the school office.</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Fee Receipts</h1>
        <p className="text-muted-foreground">View and download payment receipts for your children</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Receipts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div>
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Receipt No, Student Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Receipts Table */}
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading receipts...</div>
          ) : filteredReceipts.length === 0 ? (
            <div className="text-center py-12">
              <ReceiptIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No receipts found</h3>
              <p className="text-gray-500">Payment receipts will appear here once fees are paid</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt: Receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-medium">{receipt.receipt_no}</TableCell>
                      <TableCell>{new Date(receipt.receipt_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{receipt.student_name}</div>
                          <div className="text-sm text-gray-500">
                            {receipt.student_grade} - {receipt.student_section}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">₹{Number(receipt.total_amount).toFixed(2)}</TableCell>
                      <TableCell className="capitalize">{receipt.payment_method}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewReceipt(receipt)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadReceipt(receipt)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* View Receipt Dialog */}
          <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Receipt Details</DialogTitle>
              </DialogHeader>
              {selectedReceipt && (
                <div className="space-y-4">
                  <div className="text-center border-b pb-4">
                    <h2 className="text-2xl font-bold">{selectedReceipt.school_name}</h2>
                    <p className="text-gray-600">{selectedReceipt.school_address}</p>
                    {selectedReceipt.school_phone && <p>Phone: {selectedReceipt.school_phone}</p>}
                    {selectedReceipt.school_email && <p>Email: {selectedReceipt.school_email}</p>}
                    <p className="text-xl font-semibold mt-2">FEE PAYMENT RECEIPT</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Receipt No</p>
                      <p className="font-medium">{selectedReceipt.receipt_no}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium">{new Date(selectedReceipt.receipt_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Student Name</p>
                      <p className="font-medium">{selectedReceipt.student_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Admission No</p>
                      <p className="font-medium">{selectedReceipt.student_admission_no || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Class/Grade</p>
                      <p className="font-medium">{selectedReceipt.student_grade || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Section</p>
                      <p className="font-medium">{selectedReceipt.student_section || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Fee Details</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fee Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(Array.isArray(selectedReceipt.receipt_items)
                          ? selectedReceipt.receipt_items
                          : [selectedReceipt.receipt_items]
                        ).map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{item.fee_type}</TableCell>
                            <TableCell className="text-right">₹{Number(item.amount).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell className="font-bold">Total</TableCell>
                          <TableCell className="text-right font-bold">
                            ₹{Number(selectedReceipt.total_amount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div>
                      <p className="text-sm text-gray-600">Payment Method</p>
                      <p className="font-medium capitalize">{selectedReceipt.payment_method}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment Date</p>
                      <p className="font-medium">{new Date(selectedReceipt.payment_date).toLocaleDateString()}</p>
                    </div>
                    {selectedReceipt.reference_number && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Reference Number</p>
                        <p className="font-medium">{selectedReceipt.reference_number}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
                      Close
                    </Button>
                    <Button onClick={() => handleDownloadReceipt(selectedReceipt)}>
                      <Download className="h-4 w-4 mr-2" />
                      Print Receipt
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
