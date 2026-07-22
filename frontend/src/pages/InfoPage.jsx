import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './InfoPage.css';

const pageContent = {
  terms: {
    title: 'Terms & Conditions',
    effectiveDate: '[DD/MM/YYYY]',
    sections: [
      ['Welcome', ['Welcome to MEDIO ("MEDIO", "we", "our", or "us"). These Terms & Conditions ("Terms") govern your access to and use of the MEDIO application and related services ("Service").', 'By signing in or using MEDIO, you agree to be bound by these Terms. If you do not agree with these Terms, please do not use the Service.']],
      ['1. About MEDIO', ['MEDIO is a platform designed to help users discover and coordinate convenient meeting points and related location-based services.']],
      ['2. Eligibility', ['By using MEDIO, you confirm that you have the legal capacity to enter into this agreement, the information you provide is accurate and up to date, and you will use the Service only for lawful purposes.']],
      ['3. Account Registration', ['MEDIO uses Google Sign-In for authentication. You are responsible for maintaining the security of your Google account, using your account only for yourself, and promptly notifying us if you believe your account has been accessed without authorization.']],
      ['4. Acceptable Use', ['You agree not to use MEDIO for illegal or fraudulent activity, attempt unauthorized access, upload harmful software, interfere with platform security, or use automated tools to scrape or misuse the Service without authorization.']],
      ['5. User Content', ['If you submit any content through MEDIO, you confirm that you have the right to submit that content and that it does not violate any law or the rights of others. You remain responsible for any content you provide.']],
      ['6. Privacy', ['Your use of MEDIO is also governed by our Privacy Policy, which explains how we collect, use, and protect your personal information.']],
      ['7. Intellectual Property', ['All trademarks, logos, branding, software, designs, and content provided by MEDIO are owned by or licensed to MEDIO unless otherwise stated. You may not copy, modify, distribute, reverse engineer, or reproduce any part of the Service without prior written permission, except as permitted by applicable law.']],
      ['8. Service Availability', ['We strive to keep MEDIO available and functioning properly. However, we do not guarantee uninterrupted, error-free, or always-available service. We may suspend, modify, or discontinue features for maintenance, security, or operational reasons.']],
      ['9. Third-Party Services', ['MEDIO may rely on third-party services such as Google Sign-In, mapping providers, cloud hosting, or database services. Your use of those services may also be subject to their respective terms and privacy policies.']],
      ['10. Disclaimer', ['MEDIO provides meeting point recommendations and related information for convenience. We do not guarantee that recommendations, maps, travel estimates, or other information will always be accurate, complete, or suitable for every situation. Users are responsible for making their own travel, safety, and meeting decisions.']],
      ['11. Limitation of Liability', ['To the maximum extent permitted by applicable law, MEDIO and its developers shall not be liable for indirect, incidental, consequential, special, or punitive damages arising from or related to your use of the Service.']],
      ['12. Account Suspension or Termination', ['We may suspend or terminate your access if you violate these Terms, your use poses a security risk, or we are required to do so by law. You may stop using MEDIO at any time and may request account deletion in accordance with our Privacy Policy.']],
      ['13. Changes to These Terms', ['We may update these Terms from time to time. If significant changes are made, we will update the Effective Date and may notify users through the application. Continued use after updates constitutes acceptance of the revised Terms.']],
      ['14. Governing Law', ['These Terms shall be governed by and interpreted in accordance with the laws of India. Any disputes shall be subject to the jurisdiction of the competent courts in India.']],
      ['15. Contact Us', ['Email: [your-email@example.com]', 'Developer/Organization: MEDIO']],
      ['16. Acceptance', ['By selecting "Continue with Google" and using MEDIO, you acknowledge that you have read and understood these Terms & Conditions, agree to comply with them, and agree to use MEDIO responsibly and lawfully.']],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    effectiveDate: '[DD/MM/YYYY]',
    sections: [
      ['Welcome', ['Welcome to MEDIO ("we", "our", "us"). Your privacy is important to us. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use the MEDIO mobile application or website ("Service").', 'By signing in to MEDIO, you acknowledge that you have read and understood this Privacy Policy and consent to the collection and processing of your personal data as described below.']],
      ['1. Information We Collect', ['When you sign in using your Google Account, we collect your full name, email address, and Google profile photo when available. We do not collect your Google password.', 'When you use MEDIO, we may store your saved places, place labels and addresses, selected coordinates, meet-point searches, route planning activity, Travel route details required for route history and journey summaries, profile preferences such as notification settings and units, Support information you provide, and technical authentication data such as secure cookies or app tokens needed to keep you signed in.']],
      ['2. Why We Collect Your Information', ['We use your information to create and manage your MEDIO account, authenticate your identity through Google Sign-In, provide meet-point recommendations and route features, save your preferences and places, generate route summaries, improve MEDIO, respond to support requests, maintain security, and comply with applicable legal obligations.', 'We do not sell your personal information to anyone.']],
      ['3. How We Store Your Information', ['Your information is stored securely in our database using industry-standard security measures. We take reasonable steps to protect your information against unauthorized access, alteration, disclosure, or destruction.', 'Although we strive to protect your information, no method of electronic storage or transmission over the Internet is completely secure. Therefore, we cannot guarantee absolute security.']],
      ['4. Sharing of Information', ['We may share your information with Google for authentication, with trusted service providers who help us operate MEDIO, when required by law or lawful government request, or to protect our legal rights, users, or platform security.', 'We do not sell, rent, or trade your personal information.']],
      ['5. Data Retention', ['We retain your personal information only for as long as necessary to provide our services or comply with legal obligations. If you delete your account, we will delete or anonymize your personal data within a reasonable period unless legally required to retain certain information.']],
      ['6. Your Rights', ['Subject to applicable law, you may request access, correction, deletion, or withdrawal of consent where applicable, and contact us regarding any privacy-related concerns.']],
      ['7. Account Deletion', ['You may delete your account using the account deletion option within the application or by contacting us. Upon verification, we will delete your account and related saved places and activity unless retention is required by law.']],
      ['8. Children\'s Privacy', ['MEDIO is not intended for children under the age required by applicable law to provide independent consent. If we become aware that we collected personal information from a child without required consent, we will take steps to delete it.']],
      ['9. Third-Party Services', ['MEDIO uses Google Sign-In for authentication. Your use of Google services is also governed by Google\'s own privacy policy. MEDIO may also use secure cloud infrastructure, mapping, routing, and database providers to operate the service.']],
      ['10. Changes to This Privacy Policy', ['We may update this Privacy Policy from time to time. When significant changes are made, we will update the Effective Date and may notify users through the application. Continued use after changes constitutes acceptance of the revised Privacy Policy.']],
      ['11. Contact Us', ['Email: [your-email@example.com]', 'Developer/Organization: MEDIO']],
      ['12. Consent', ['By selecting "Continue with Google" and using MEDIO, you confirm that you have read and understood this Privacy Policy, consent to the collection, storage, and processing of your personal information as described, and agree to the use of your information for providing MEDIO services.']],
    ],
  },
  about: {
    title: 'About MEDIO',
    sections: [
      ['Welcome to MEDIO', ['MEDIO is a smart meet-point recommendation platform designed to help people find convenient meeting locations based on the preferences and locations of all participants.', 'Our goal is to make planning meetups simpler by reducing the time spent deciding where to meet. Whether you are meeting friends, classmates, colleagues, or family, MEDIO helps you discover suitable meeting points quickly and efficiently.']],
      ['Our Features', ['Smart meet-point recommendations', 'Secure Google Sign-In', 'Easy-to-use and intuitive interface', 'Fast and reliable performance', 'Privacy-focused account management']],
      ['Our Commitment', ['We are committed to protecting your privacy and handling your personal information responsibly. MEDIO only collects the information necessary to provide our services and follows applicable privacy practices.', 'We continuously improve MEDIO by fixing bugs, enhancing performance, and introducing new features based on user feedback.', 'Thank you for choosing MEDIO. We hope MEDIO makes every meetup easier, smarter, and more enjoyable.']],
    ],
  },
  support: {
    title: 'Contact Support',
    sections: [
      ['We are here to help', ['If you experience any issues, have questions, would like to report a bug, suggest a feature, or have concerns about your privacy or account, please contact us.', 'Email: your-email@example.com']],
      ['We can help with', ['Login or account issues', 'Bug reports', 'Feature requests', 'Privacy-related questions', 'Account deletion requests', 'General feedback']],
      ['When contacting us, please include', ['Your registered email address', 'Your device model', 'Android version', 'A brief description of the issue', 'Screenshots if applicable']],
      ['Response Time', ['We aim to respond to all support requests as soon as reasonably possible. Thank you for helping us improve MEDIO.']],
    ],
  },
};

export default function InfoPage({ type }) {
  const navigate = useNavigate();
  const content = pageContent[type] || pageContent.about;

  return (
    <div className="info-page">
      <header className="info-header">
        <button className="info-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>
        <span className="info-kicker">MEDIO</span>
      </header>
      <main className="info-content">
        <h1>{content.title}</h1>
        {content.effectiveDate && (
          <p className="info-effective">Effective Date: {content.effectiveDate}</p>
        )}
        {content.sections.map(([heading, paragraphs]) => (
          <section key={heading} className="info-section">
            <h2>{heading}</h2>
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
