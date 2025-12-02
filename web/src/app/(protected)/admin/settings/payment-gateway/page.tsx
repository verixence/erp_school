'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface PaymentGatewaySettings {
  id?: string;
  gateway_provider: string;
  is_enabled: boolean;
  api_key: string;
  api_secret: string;
  webhook_secret?: string;
  merchant_id?: string;
  account_id?: string;
  currency: string;
  convenience_fee_type: 'percentage' | 'fixed';
  convenience_fee_value: number;
  convenience_fee_bearer: 'parent' | 'school';
  is_test_mode: boolean;
}

export default function PaymentGatewaySettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<PaymentGatewaySettings>({
    gateway_provider: 'razorpay',
    is_enabled: false,
    api_key: '',
    api_secret: '',
    webhook_secret: '',
    merchant_id: '',
    account_id: '',
    currency: 'INR',
    convenience_fee_type: 'percentage',
    convenience_fee_value: 0,
    convenience_fee_bearer: 'parent',
    is_test_mode: true,
  });

  const [showSecrets, setShowSecrets] = useState({
    api_key: false,
    api_secret: false,
    webhook_secret: false,
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch existing settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['payment-gateway-settings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/settings/payment-gateway');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      return data.settings;
    },
  });

  // Update form when settings are fetched
  useEffect(() => {
    if (settings) {
      setFormData({
        ...formData,
        ...settings,
        // Don't show actual secrets, just placeholder if they exist
        api_key: settings.api_key ? '••••••••••••' : '',
        api_secret: settings.api_secret ? '••••••••••••' : '',
        webhook_secret: settings.webhook_secret ? '••••••••••••' : '',
      });
    }
  }, [settings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: PaymentGatewaySettings) => {
      const response = await fetch('/api/admin/settings/payment-gateway', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-gateway-settings'] });
      setSuccessMessage('Payment gateway settings saved successfully!');
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setSuccessMessage(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Only send actual values, not placeholders
    const dataToSend = { ...formData };
    if (dataToSend.api_key === '••••••••••••') delete (dataToSend as any).api_key;
    if (dataToSend.api_secret === '••••••••••••') delete (dataToSend as any).api_secret;
    if (dataToSend.webhook_secret === '••••••••••••') delete (dataToSend as any).webhook_secret;

    saveMutation.mutate(dataToSend);
  };

  const toggleSecretVisibility = (field: 'api_key' | 'api_secret' | 'webhook_secret') => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Payment Gateway Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure online payment gateway for fee collection from parents
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Gateway Status */}
        <Card>
          <CardHeader>
            <CardTitle>Gateway Status</CardTitle>
            <CardDescription>
              Enable or disable online payment acceptance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_enabled" className="text-base">
                  Enable Online Payments
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow parents to pay fees online through payment gateway
                </p>
              </div>
              <Switch
                id="is_enabled"
                checked={formData.is_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_enabled: checked })
                }
              />
            </div>

            {formData.is_enabled && (
              <Badge className="bg-green-100 text-green-800">
                Online Payments Active
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Gateway Provider */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Gateway Provider</CardTitle>
            <CardDescription>
              Select your payment gateway provider
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gateway_provider">Provider</Label>
              <Select
                value={formData.gateway_provider}
                onValueChange={(value) =>
                  setFormData({ ...formData, gateway_provider: value })
                }
              >
                <SelectTrigger id="gateway_provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="paytm">Paytm</SelectItem>
                  <SelectItem value="phonepe">PhonePe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_test_mode" className="text-base">
                  Test Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Use test credentials for safe testing (no real transactions)
                </p>
              </div>
              <Switch
                id="is_test_mode"
                checked={formData.is_test_mode}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_test_mode: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* API Credentials */}
        <Card>
          <CardHeader>
            <CardTitle>API Credentials</CardTitle>
            <CardDescription>
              Enter your {formData.gateway_provider} API credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api_key">API Key / Key ID</Label>
              <div className="relative">
                <Input
                  id="api_key"
                  type={showSecrets.api_key ? 'text' : 'password'}
                  value={formData.api_key}
                  onChange={(e) =>
                    setFormData({ ...formData, api_key: e.target.value })
                  }
                  placeholder="Enter API Key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => toggleSecretVisibility('api_key')}
                >
                  {showSecrets.api_key ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_secret">API Secret / Secret Key</Label>
              <div className="relative">
                <Input
                  id="api_secret"
                  type={showSecrets.api_secret ? 'text' : 'password'}
                  value={formData.api_secret}
                  onChange={(e) =>
                    setFormData({ ...formData, api_secret: e.target.value })
                  }
                  placeholder="Enter API Secret"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => toggleSecretVisibility('api_secret')}
                >
                  {showSecrets.api_secret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook_secret">Webhook Secret (Optional)</Label>
              <div className="relative">
                <Input
                  id="webhook_secret"
                  type={showSecrets.webhook_secret ? 'text' : 'password'}
                  value={formData.webhook_secret}
                  onChange={(e) =>
                    setFormData({ ...formData, webhook_secret: e.target.value })
                  }
                  placeholder="Enter Webhook Secret"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => toggleSecretVisibility('webhook_secret')}
                >
                  {showSecrets.webhook_secret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Convenience Fee */}
        <Card>
          <CardHeader>
            <CardTitle>Convenience Fee</CardTitle>
            <CardDescription>
              Configure additional charges for online payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="convenience_fee_type">Fee Type</Label>
                <Select
                  value={formData.convenience_fee_type}
                  onValueChange={(value: 'percentage' | 'fixed') =>
                    setFormData({ ...formData, convenience_fee_type: value })
                  }
                >
                  <SelectTrigger id="convenience_fee_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="convenience_fee_value">Fee Value</Label>
                <Input
                  id="convenience_fee_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.convenience_fee_value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      convenience_fee_value: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="convenience_fee_bearer">Who Pays the Fee?</Label>
              <Select
                value={formData.convenience_fee_bearer}
                onValueChange={(value: 'parent' | 'school') =>
                  setFormData({ ...formData, convenience_fee_bearer: value })
                }
              >
                <SelectTrigger id="convenience_fee_bearer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent (Added to total)</SelectItem>
                  <SelectItem value="school">School (Absorbed by school)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Currency */}
        <Card>
          <CardHeader>
            <CardTitle>Currency Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData({ ...formData, currency: value })
                }
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Important Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Keep your API credentials secure and never share them publicly</p>
          <p>• Use test mode during initial setup to avoid real transactions</p>
          <p>• Convenience fees help cover transaction charges from payment gateways</p>
          <p>• Webhook secret is used to verify payment callbacks from the gateway</p>
          <p>
            • Once enabled, parents will see a "Pay Now" button on their fee details page
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
