import React from 'react';
import { Mail, Send } from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">Victim DAO - Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last Updated: November 2025</p>

        <div className="space-y-6 text-gray-800">
          <p>Welcome to Victim DAO ("we," "our," "the DAO," or "Victim DAO"). By accessing or using victimdao.org, our applications, smart contracts, portals, or any associated services (collectively, the "Services"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use our Services.</p>

          <h2 className="text-xl font-bold text-gray-900">1. Nature of the Platform</h2>
          <p>Victim DAO is a decentralized recovery protocol designed to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Verify scam victims</li>
            <li>Issue on-chain proof-of-loss tokens ("$VDAO")</li>
            <li>Facilitate community-governed treasury distributions</li>
            <li>Support recovery and justice efforts within Web3</li>
          </ul>
          <p>Victim DAO is not an insurance company, financial institution, broker, or legal service provider. All functions are experimental, community-governed, and executed through blockchain-based smart contracts.</p>

          <h2 className="text-xl font-bold text-gray-900">2. Eligibility</h2>
          <p>By using our Services, you confirm that you:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Are at least 18 years old</li>
            <li>Are legally permitted to use blockchain-based protocols in your jurisdiction</li>
            <li>Are not located in a sanctioned country or on any government blacklist</li>
            <li>Understand the risks of using decentralized technologies</li>
          </ul>
          <p>We reserve the right to restrict access where legally required.</p>

          <h2 className="text-xl font-bold text-gray-900">3. No Guarantees of Compensation</h2>
          <p>Submitting a claim does not guarantee:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Verification</li>
            <li>Token issuance</li>
            <li>Treasury payouts</li>
            <li>Any level of financial compensation</li>
          </ul>
          <p>All compensation decisions are made by DAO member voting, and outcomes may vary. Victim DAO assumes no responsibility for the DAO's decisions.</p>

          <h2 className="text-xl font-bold text-gray-900">4. User Responsibilities</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Submit fraudulent, misleading, or inaccurate victim claims</li>
            <li>Upload harmful, malicious, or illegal content</li>
            <li>Manipulate DAO governance or token economics</li>
            <li>Interfere with smart contracts or system integrity</li>
            <li>Impersonate another person or entity</li>
          </ul>
          <p>Violations may result in denial of services, claim rejection, or permanent banning.</p>

          <h2 className="text-xl font-bold text-gray-900">5. Token ($VDAO) Terms</h2>
          <p>$VDAO tokens are utility governance tokens representing verified proof-of-loss claims. They are:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Minted based on validated losses</li>
            <li>Used for governance and voting</li>
            <li>Potentially burned during compensation redemptions</li>
          </ul>
          <p>$VDAO is not:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>A security</li>
            <li>An investment</li>
            <li>A guarantee of value</li>
            <li>A promise of compensation</li>
          </ul>
          <p>Token value may fluctuate or fall to zero.</p>

          <h2 className="text-xl font-bold text-gray-900">6. Smart Contract Risks</h2>
          <p>By using Victim DAO, you acknowledge and accept:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Smart contract bugs or vulnerabilities</li>
            <li>Possible loss of tokens or funds</li>
            <li>Network congestion or transaction failures</li>
            <li>Oracle errors or governance exploits</li>
            <li>That transactions are irreversible</li>
          </ul>
          <p>Victim DAO provides no warranties, explicit or implied.</p>

          <h2 className="text-xl font-bold text-gray-900">7. No Legal or Financial Advice</h2>
          <p>Content on this site is provided for informational purposes only. Nothing in our Services constitutes legal, financial, tax, or investment advice. Always consult licensed professionals.</p>

          <h2 className="text-xl font-bold text-gray-900">8. Third-Party Links and Partners</h2>
          <p>Victim DAO may link to third-party platforms such as Telegram, partner DAOs, wallet providers, and exchange platforms. We do not control or endorse third-party services and are not responsible for their actions or policies.</p>

          <h2 className="text-xl font-bold text-gray-900">9. Intellectual Property</h2>
          <p>Unless otherwise stated, all website text, design, and branding belong to Victim DAO. The community retains rights to open-source code where applicable. You may not copy, modify, or distribute our content without permission.</p>

          <h2 className="text-xl font-bold text-gray-900">10. Termination</h2>
          <p>We may suspend or restrict your access to the Services if you:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Violate these Terms</li>
            <li>Engage in fraudulent or abusive behavior</li>
            <li>Harm the protocol or community</li>
            <li>Submit false claims</li>
          </ul>
          <p>Decentralized components may not be fully terminable.</p>

          <h2 className="text-xl font-bold text-gray-900">11. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, Victim DAO, its contributors, members, and partners are not liable for:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Loss of funds or tokens</li>
            <li>Smart contract exploits</li>
            <li>DAO voting outcomes</li>
            <li>Service interruptions</li>
            <li>Errors or inaccuracies in claim verification</li>
            <li>Any indirect, incidental, or consequential damages</li>
          </ul>
          <p>Your use of the platform is at your own risk.</p>

          <h2 className="text-xl font-bold text-gray-900">12. Changes to These Terms</h2>
          <p>We may update these Terms at any time. Changes will be posted on this page with a new "Last Updated" date. Continued use of the Services means you accept the updated Terms.</p>

          <h2 className="text-xl font-bold text-gray-900">13. Contact</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-900">
              <Mail className="w-5 h-5" />
              <span>info@victimdao.org</span>
            </div>
            <div className="flex items-center gap-2 text-gray-900">
              <Send className="w-5 h-5" />
              <span>victimdao.org</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;