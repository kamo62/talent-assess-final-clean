import React from 'react';

export function Privacy() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <article className="prose prose-indigo max-w-none">
        <h1>Privacy Policy</h1>
        <p className="text-gray-500">Last Updated: April 17, 2025</p>

        <h2>Introduction</h2>
        <p>
          Welcome to our Privacy Policy. We value your privacy and are committed to protecting your personal information. 
          This policy describes how we collect, use, and safeguard personal information on our recruitment and technical 
          skills assessment platform ("the Platform"). It is designed to comply with South Africa's Protection of Personal 
          Information Act, 2013 ("POPIA") and to align with international best practices, including the European Union's 
          General Data Protection Regulation ("GDPR").
        </p>
        <p>
          By using our Platform, you agree to the collection and use of your personal information as outlined in this policy. 
          We are a South African-based service that helps companies assess technical candidates. All individuals using our 
          Platform must be 18 years or older (see Age Restrictions below). This policy applies when you use our Platform, 
          register an account, complete a technical assessment, or otherwise provide your personal information to us.
        </p>

        <h2>What Information We Collect</h2>
        <p>
          We collect personal information necessary to evaluate candidates' skills and match them to job opportunities. 
          This includes:
        </p>
        <ul>
          <li>Personal Identifiers: Your name, surname, and South African ID number (or passport number if applicable).</li>
          <li>Contact Information: Your email address (and phone number, if provided for communication).</li>
          <li>Professional History: Details about your work experience, past job roles, and education history (such as qualifications and institutions attended).</li>
          <li>Assessment Results: The results of technical tests or assessments you take on our Platform, including scores, responses, and any feedback.</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>We use the personal information we collect for the following purposes:</p>
        <ul>
          <li>Evaluating Your Candidacy: To assess your technical skills and abilities through our tests and evaluations.</li>
          <li>Job Matching: To match you with current job roles that you have applied for, and — with your consent — to consider you for future job opportunities that align with your profile.</li>
          <li>Communication: To communicate with you about the assessment process.</li>
          <li>Platform Operation and Improvement: To operate, maintain, and improve our Platform and services.</li>
          <li>Compliance and Legal: To comply with legal obligations or respond to lawful requests.</li>
        </ul>

        <h2>Legal Basis for Processing</h2>
        <p>We process your personal information only when we have a valid legal reason to do so. Under POPIA and GDPR, the legal basis for our processing may include:</p>
        <ul>
          <li>Consent</li>
          <li>Contractual Necessity</li>
          <li>Legal Obligation</li>
          <li>Legitimate Interests</li>
        </ul>

        <h2>Data Storage and Transfer</h2>
        <p>
          Your personal data is stored securely on servers located in South Africa and in the European Union (EU). 
          We use trusted third-party hosting providers and maintain local storage within South Africa.
        </p>

        <h2>Data Retention</h2>
        <p>
          We keep your personal information only for as long as necessary to fulfill the purposes outlined in this policy, 
          unless a longer retention period is required or permitted by law.
        </p>

        <h2>Your Rights</h2>
        <p>Under POPIA and GDPR, you have the following rights:</p>
        <ul>
          <li>Access to your personal information</li>
          <li>Correction of inaccurate data</li>
          <li>Deletion of your data</li>
          <li>Objection to processing</li>
          <li>Withdrawal of consent</li>
          <li>Data portability</li>
          <li>Right to lodge a complaint</li>
        </ul>

        <h2>Security Measures</h2>
        <p>We implement appropriate technical and organizational measures including:</p>
        <ul>
          <li>Encryption protocols</li>
          <li>Access control</li>
          <li>Security monitoring</li>
          <li>Third-party security verification</li>
        </ul>

        <h2>Age Restrictions</h2>
        <p>
          Our Platform and services are intended for use by individuals 18 years of age or older. We do not knowingly 
          collect personal information from anyone under the age of 18.
        </p>

        <h2>Contact Information</h2>
        <p>For questions or concerns about this Privacy Policy, please contact us:</p>
        <ul>
          <li>Email: privacy@example.com (example only; configure before deployment)</li>
          <li>Postal Address: Configure your organisation's verified privacy contact before deployment.</li>
        </ul>

        <h2>Changes to this Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we make changes, we will revise the "Last Updated" 
          date at the top of this policy. Your continued use of the Platform after any modifications constitutes your 
          acceptance of the updated policy.
        </p>
      </article>
    </div>
  );
}
