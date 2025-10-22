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
              You have the right to request deletion of your CampusHoster account and all associated personal data.
              We take your privacy seriously and will process your request within 30 days.
            </p>
          </section>

          <section className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded">
            <h3 className="text-xl font-semibold text-purple-800 mb-3">What will be deleted?</h3>
            <p className="text-gray-700 mb-3">When you request data deletion, we will remove:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Your account information (name, email, username, phone number)</li>
              <li>Profile pictures and uploaded photos</li>
              <li>Personal attendance and homework records (for parents)</li>
              <li>Class and student management data (for teachers)</li>
              <li>Push notification tokens</li>
              <li>All other personal information stored in our system</li>
            </ul>
          </section>

          <section className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded">
            <h3 className="text-xl font-semibold text-amber-800 mb-3">Important Notes</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Educational records may be retained for legal compliance and school record-keeping requirements</li>
              <li>Anonymized data used for analytics may be retained</li>
              <li>Once deleted, your account cannot be recovered</li>
              <li>You will lose access to all features and data associated with your account</li>
            </ul>
          </section>

          <section className="bg-gray-50 border border-gray-300 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">How to Request Deletion</h3>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Send an email to our Privacy Team</h4>
                  <p className="text-gray-700 mt-1">
                    Email: <a href="mailto:privacy@verixence.com" className="text-purple-600 hover:text-purple-800 font-medium">
                      privacy@verixence.com
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Include the following information:</h4>
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
                    <li>Subject line: "Data Deletion Request"</li>
                    <li>Your full name</li>
                    <li>Username or email associated with your account</li>
                    <li>School name (if applicable)</li>
                    <li>Reason for deletion (optional)</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">We will process your request</h4>
                  <p className="text-gray-700 mt-1">
                    Our team will verify your identity and process your deletion request within 30 days.
                    You will receive a confirmation email once the deletion is complete.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-gray-300 pt-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Email Template</h3>
            <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
              <p className="text-gray-700">
                <strong>To:</strong> privacy@verixence.com<br />
                <strong>Subject:</strong> Data Deletion Request<br /><br />

                Dear CampusHoster Privacy Team,<br /><br />

                I request the deletion of my account and all associated personal data.<br /><br />

                <strong>Account Details:</strong><br />
                - Full Name: [Your Name]<br />
                - Username: [Your Username]<br />
                - Email: [Your Email]<br />
                - School: [School Name]<br /><br />

                Thank you,<br />
                [Your Name]
              </p>
            </div>
          </section>

          <section className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded">
            <h3 className="text-xl font-semibold text-blue-800 mb-3">Need Help?</h3>
            <p className="text-gray-700 mb-2">
              If you have questions about data deletion or our privacy practices, contact us:
            </p>
            <ul className="space-y-1 text-gray-700">
              <li><strong>Privacy:</strong> <a href="mailto:privacy@verixence.com" className="text-blue-600 hover:text-blue-800">privacy@verixence.com</a></li>
              <li><strong>Support:</strong> <a href="mailto:support@verixence.com" className="text-blue-600 hover:text-blue-800">support@verixence.com</a></li>
            </ul>
          </section>

          <section className="text-center pt-6">
            <p className="text-sm text-gray-600">
              View our full <a href="/privacy-policy" className="text-purple-600 hover:text-purple-800 font-medium">Privacy Policy</a> for more information about how we handle your data.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
