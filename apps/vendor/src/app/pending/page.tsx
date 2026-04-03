'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@ecommerce/ui-kit';

export default function PendingApprovalPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Application Pending Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Thank you for registering as a vendor. Your application has been submitted and is
            currently under review by our team.
          </p>
          <p className="text-sm text-gray-600">
            You will receive an email notification once your application has been reviewed. In the
            meantime, you can continue using the platform as a customer.
          </p>
          <div className="pt-4">
            <a
              href="/login"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Return to login
            </a>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

