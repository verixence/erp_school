import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Deletion Request - CampusHoster',
  description: 'Request deletion of your CampusHoster account and personal data',
};

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-lg p-8 sm:p-12">
        <h1 className="text-4xl font-bold text-purple-600 border-b-2 border-purple-600 pb-4 mb-6">
          Data Deletion Request
        </h1>

        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-purple-700 mb-4">Request Account & Data Deletion</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              To request deletion of your CampusHoster account and all associated personal data, please email us at:
            </p>
            <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded">
              <p className="text-lg">
                <strong>Email:</strong>{' '}
                <a href="mailto:privacy@verixence.com" className="text-purple-600 hover:text-purple-800 font-medium">
                  privacy@verixence.com
                </a>
              </p>
              <p className="text-gray-700 mt-4">
                Include your account details (name, username, and school name) in your request.
                We will process your request within 30 days.
              </p>
            </div>
          </section>

          <section className="text-center pt-6 border-t border-gray-300">
            <p className="text-sm text-gray-600">
              View our full <a href="/privacy-policy" className="text-purple-600 hover:text-purple-800 font-medium">Privacy Policy</a> for more information about how we handle your data.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
