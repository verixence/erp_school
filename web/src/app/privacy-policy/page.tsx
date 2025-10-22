import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - CampusHoster',
  description: 'Privacy Policy for CampusHoster mobile and web applications',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg p-8 sm:p-12">
        <h1 className="text-4xl font-bold text-purple-600 border-b-2 border-purple-600 pb-4 mb-6">
          Privacy Policy
        </h1>
        <p className="text-gray-600 italic mb-8">Last updated: October 22, 2025</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">1. Introduction</h2>
          <p className="text-gray-700 leading-relaxed">
            CampusHoster ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application and web platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">2. Information We Collect</h2>

          <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.1 Personal Information</h3>
          <p className="text-gray-700 mb-3">We collect the following information when you use CampusHoster:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Account Information:</strong> Username, email address, first name, last name, phone number</li>
            <li><strong>Profile Information:</strong> Role (teacher/parent), school affiliation, employee ID (for teachers)</li>
            <li><strong>User-Generated Content:</strong> Photos uploaded for assignments, profile pictures</li>
            <li><strong>Educational Data:</strong> Attendance records, homework submissions, exam scores, class information</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2.2 Automatically Collected Information</h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Device Information:</strong> Device type, operating system version</li>
            <li><strong>Usage Data:</strong> App features accessed, time spent in app</li>
            <li><strong>Push Notification Tokens:</strong> To send notifications about assignments, attendance, and announcements</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">3. How We Use Your Information</h2>
          <p className="text-gray-700 mb-3">We use the collected information for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Provide and maintain the CampusHoster service</li>
            <li>Enable teachers to manage classes, attendance, and assignments</li>
            <li>Allow parents to view their children's academic progress</li>
            <li>Send notifications about important school updates</li>
            <li>Improve and optimize our app functionality</li>
            <li>Ensure security and prevent unauthorized access</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">4. Data Storage and Security</h2>
          <p className="text-gray-700 mb-3">We take data security seriously:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Encryption:</strong> All data is encrypted in transit using HTTPS/TLS</li>
            <li><strong>Secure Storage:</strong> Data is stored on secure servers provided by Supabase</li>
            <li><strong>Authentication:</strong> Secure username-based authentication system</li>
            <li><strong>Access Control:</strong> Role-based access ensures users only see appropriate data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">5. Data Sharing</h2>
          <p className="text-gray-700 mb-3">We do not sell, trade, or rent your personal information. We may share data only in these circumstances:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Within Your School:</strong> Teachers and administrators at your school can access relevant educational data</li>
            <li><strong>Service Providers:</strong> Third-party services like Supabase (database hosting) that help us operate the app</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">6. Your Data Rights</h2>
          <p className="text-gray-700 mb-3">You have the following rights regarding your data:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
            <li><strong>Opt-out:</strong> Disable push notifications in app settings</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">7. Children's Privacy</h2>
          <p className="text-gray-700 leading-relaxed">
            CampusHoster is designed for use by teachers and parents. We do not knowingly collect information directly from children under 13. Parents can view their children's educational data through their parent account.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">8. Data Retention</h2>
          <p className="text-gray-700 leading-relaxed">
            We retain your data for as long as your account is active or as needed to provide services. Educational records may be retained according to school policies and legal requirements.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">9. Third-Party Services</h2>
          <p className="text-gray-700 mb-3">Our app uses the following third-party services:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Supabase:</strong> Database and authentication services</li>
            <li><strong>Expo Notifications:</strong> Push notification delivery</li>
            <li><strong>Google Play Services:</strong> App distribution and updates</li>
            <li><strong>Vercel:</strong> Web application hosting</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">10. Changes to This Privacy Policy</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">11. Contact Us</h2>
          <p className="text-gray-700 mb-3">If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us:</p>
          <ul className="list-none space-y-2 text-gray-700">
            <li><strong>Email:</strong> privacy@verixence.com</li>
            <li><strong>Support:</strong> support@verixence.com</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">12. GDPR Compliance (EU Users)</h2>
          <p className="text-gray-700 mb-3">If you are in the European Union, you have additional rights under GDPR:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Right to data portability</li>
            <li>Right to object to processing</li>
            <li>Right to restrict processing</li>
            <li>Right to withdraw consent</li>
          </ul>
        </section>

        <div className="border-t border-gray-300 pt-6 mt-12">
          <p className="text-center text-gray-600 text-sm">
            © 2025 CampusHoster. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
