import React from 'react';
import { Lock, Mail, Send } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-gray-900" />
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Victim DAO - Privacy Policy</h1>
        </div>

        <p className="text-sm text-gray-500 mb-8">Last Updated: November 2025</p>

        <div className="space-y-6 text-gray-800">
          <p>This Privacy Policy explains how Victim DAO ("we," "our," or "the DAO") collects, uses, and protects information when you use our website and decentralized services.</p>
          <p>Victim DAO is designed to protect victims, ensure transparency, and maintain community trust.</p>

          <h2 className="text-xl font-bold text-gray-900">1. What We Collect</h2>
          <p>Victim DAO is built to minimize personal data collection.</p>
          <p>We collect only what is necessary to verify claims and operate the protocol.</p>

          <h3 className="text-lg font-semibold text-gray-900">1.1 Information You Provide</h3>
          <p>When submitting a claim or contacting us, you may voluntarily provide:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Wallet addresses and transaction hashes</li>
            <li>Scam-related evidence (screenshots, messages, links)</li>
            <li>Email address (optional)</li>
            <li>Telegram username (optional)</li>
            <li>Description of incident</li>
          </ul>
          <p>You choose what personal data to include.</p>
          <p>Do not upload sensitive documents such as passports, IDs, or bank statements unless absolutely required for verification.</p>

          <h2 className="text-xl font-bold text-gray-900">2. Blockchain Data</h2>
          <p>When interacting with our smart contracts, the following is permanently recorded on-chain:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Wallet addresses</li>
            <li>$VDAO token balances</li>
            <li>Proof-of-loss records</li>
            <li>DAO governance actions</li>
          </ul>
          <p>Blockchain data is public, immutable, and outside our control.</p>

          <h2 className="text-xl font-bold text-gray-900">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Verify victim claims</li>
            <li>Assess evidence</li>
            <li>Issue proof-of-loss tokens</li>
            <li>Allocate governance rights</li>
            <li>Communicate with victims and members</li>
            <li>Improve our services</li>
            <li>Prevent fraud and abuse</li>
          </ul>
          <p>We do not sell or rent your data.</p>

          <h2 className="text-xl font-bold text-gray-900">4. How We Protect Your Information</h2>
          <p>We apply reasonable technical and organizational measures to protect off-chain data, including:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Encrypted storage</li>
            <li>Secure submission portals</li>
            <li>Minimal data retention</li>
            <li>Limited access by verification council members</li>
          </ul>
          <p>However, no system is completely secure, and we cannot guarantee protection against all threats.</p>

          <h2 className="text-xl font-bold text-gray-900">5. Data Sharing</h2>
          <p>We may share data only in the following situations:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>DAO verification council: to evaluate claims</li>
            <li>Partners and auditors: to improve security</li>
            <li>Legal authorities: if required by law</li>
            <li>Community governance: when transparency is essential</li>
          </ul>
          <p>We do not share data for marketing purposes.</p>

          <h2 className="text-xl font-bold text-gray-900">6. Data Retention</h2>
          <p>We retain off-chain submissions only as long as necessary for:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Verification</li>
            <li>Auditability</li>
            <li>Security</li>
            <li>Compliance</li>
          </ul>
          <p>You may request deletion of off-chain data, except:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>On-chain data (immutable)</li>
            <li>Data required for legal or fraud-prevention reasons</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">7. Cookies & Analytics</h2>
          <p>Victim DAO may use minimal, privacy-friendly analytics to understand traffic and improve the website.</p>
          <p>We do not use invasive tracking or serve targeted ads.</p>

          <h2 className="text-xl font-bold text-gray-900">8. Children's Privacy</h2>
          <p>Victim DAO is not intended for individuals under 18.</p>
          <p>We do not knowingly collect data from minors.</p>

          <h2 className="text-xl font-bold text-gray-900">9. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have rights to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access your stored data</li>
            <li>Request correction or deletion</li>
            <li>Restrict or object to processing</li>
            <li>Export your data</li>
          </ul>
          <p>Requests can be made at: info@victimdao.org</p>

          <h2 className="text-xl font-bold text-gray-900">10. International Users</h2>
          <p>Victim DAO operates globally.</p>
          <p>By using our Services, you consent to the transfer and processing of your information across jurisdictions.</p>

          <h2 className="text-xl font-bold text-gray-900">11. Changes to This Policy</h2>
          <p>We may update this Privacy Policy periodically.</p>
          <p>Continued use of the Services means you accept the revised version.</p>

          <h2 className="text-xl font-bold text-gray-900">12. Contact</h2>
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

export default PrivacyPolicy;