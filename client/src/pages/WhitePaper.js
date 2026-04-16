import React from 'react';

const WhitePaper = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-12 text-gray-800" style={{ fontFamily: 'Georgia, Times, serif' }}>

        {/* Header */}
        <div className="text-center mb-10 pb-6 border-b border-gray-200">
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '8px' }}>
            Victim DAO Whitepaper
          </h1>
          <p style={{ fontStyle: 'italic', color: '#555', fontSize: '0.95rem' }}>
            "Restoring Trust in Web3, One Victim at a Time"
          </p>
          <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#444' }}>
            <strong>Published:</strong> October 2025
          </p>

          {/* Download button */}
          <div className="mt-4">
            <a
              href={`/documents/${encodeURIComponent('Victim DAO Whitepaper (1).pdf')}`}
              download
              style={{
                display: 'inline-block',
                padding: '8px 18px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#374151',
                textDecoration: 'none',
                background: '#f9f9f9'
              }}
            >
              Download PDF
            </a>
          </div>
        </div>

        {/* Table of Contents */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '10px' }}>Table of Contents</h2>
          <ol style={{ listStyleType: 'decimal', paddingLeft: '20px', lineHeight: '2', fontSize: '0.9rem', color: '#1e40af' }}>
            <li>Executive Summary</li>
            <li>The Problem</li>
            <li>The Vision</li>
            <li>How It Works</li>
            <li>Tokenomics</li>
            <li>Governance</li>
            <li>Use of Funds &amp; Team Compensation</li>
            <li>Why $VDAO Has Value</li>
            <li>Partnerships &amp; Listings</li>
            <li>Roadmap</li>
            <li>Legal &amp; Ethical Notes</li>
            <li>Get Involved</li>
            <li>Conclusion</li>
          </ol>
        </div>

        {/* Section 1 */}
        <Section title="1. Executive Summary">
          <p className="mb-3">The Web3 revolution has unlocked financial freedom for millions but it has also exposed users to a rising wave of fraud rug pulls and crypto scams. Victim DAO is a decentralised initiative designed to verify scam victims issue them on-chain tokens representing their losses and create a transparent community-governed mechanism for funding partial compensation and recovery efforts.</p>
          <p>Victim DAO is more than a compensation tool it is a justice protocol that brings hope structure and long-term accountability to the chaos of scam-ridden blockchain ecosystems.</p>
        </Section>

        {/* Section 2 */}
        <Section title="2. The Problem">
          <p className="mb-3">Over $20 billion has been lost to crypto scams and rug pulls since 2020.</p>
          <p className="mb-3">Most victims have no legal recourse no insurance and no platform for recovery.</p>
          <p className="mb-3">There is no standardized system for verifying scam victims no coordination for bounty recovery efforts and no support for rebuilding financial stability.</p>
          <p>Trust in Web3 is eroding.</p>
        </Section>

        {/* Section 3 */}
        <Section title="3. The Vision">
          <p className="mb-3">"We can't fix every rug pull but we can build a system that helps victims heal recover and protect the next generation" — Rafael Fernando Founder</p>
          <p>Victim DAO's goal is to create a permanent decentralized recovery infrastructure supported by a tokenized proof of loss system a community treasury and a DAO-led governance structure for distributing funds to verified victims.</p>
        </Section>

        {/* Section 4 */}
        <Section title="4. How It Works">
          <SubSection title="4.1 Verification">
            <p className="mb-2">Victims submit claims via the Victim DAO portal.</p>
            <p className="mb-2">Each claim includes wallet transactions scam details and timestamps.</p>
            <p className="mb-2">A verification council initially centralized later decentralized reviews and approves claims.</p>
            <p>Approved victims are issued VDAO tokens proportional to their verified loss.</p>
          </SubSection>
          <SubSection title="4.2 Token Issuance">
            <p className="mb-2">1 VDAO = $1 of verified loss.</p>
            <p className="mb-2">Tokens are non-inflationary minted only when a verified claim is approved.</p>
            <p>Victims hold these tokens as proof of loss and DAO voting rights.</p>
          </SubSection>
          <SubSection title="4.3 Treasury Funding">
            <p className="mb-2">The DAO's treasury is funded by:</p>
            <p className="mb-2">Crypto donations individuals DAOs protocols exchanges</p>
            <p className="mb-2">Legal recoveries via forensic or legal partners</p>
            <p className="mb-2">Revenue from DAO-aligned products and services NFT drops DeFi tools staking</p>
            <p>Member contributions and bounty-specific donations</p>
          </SubSection>
          <SubSection title="4.4 Reward Distribution">
            <p className="mb-2">Periodically the DAO holds compensation events.</p>
            <p className="mb-2">Voting determines:</p>
            <p className="mb-2">Number of victims to reward</p>
            <p className="mb-2">Reward caps e.g. 50% of loss</p>
            <p className="mb-2">Distribution method raffle need-based rotation etc</p>
            <p>Selected victims burn their tokens to claim compensation.</p>
          </SubSection>
          <SubSection title="4.5 Token Burn">
            <p className="mb-2">When victims are compensated their tokens are sent to a burn address.</p>
            <p className="mb-2">This:</p>
            <p className="mb-2">Reduces total supply</p>
            <p className="mb-2">Marks that the claim has been partially or fully fulfilled</p>
            <p>Adds scarcity and value to remaining tokens</p>
          </SubSection>

          {/* Process Flow */}
          <div style={{ marginTop: '20px', marginBottom: '16px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '0.95rem' }}>How It Works Process Flow</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.8rem' }}>
              {['Victim', 'Verification Council', 'Token Issuance', 'DAO Treasury', 'Reward Distribution'].map((step, i, arr) => (
                <React.Fragment key={i}>
                  <div style={{ border: '1px solid #93c5fd', borderRadius: '4px', padding: '6px 10px', color: '#1e40af', whiteSpace: 'nowrap', textAlign: 'center', minWidth: '80px' }}>{step}</div>
                  {i < arr.length - 1 && <span style={{ color: '#9ca3af', fontSize: '1rem' }}>──</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </Section>

        {/* Section 5 — Tokenomics table */}
        <Section title="5. Tokenomics">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginTop: '8px' }}>
            <thead>
              <tr style={{ background: '#2563eb', color: '#fff' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #1e40af' }}>Parameter</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #1e40af' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Token Name', 'Victim DAO Token'],
                ['Ticker', '$VDAO'],
                ['Type', 'BEP-20'],
                ['Initial Supply', '0 (Minted per verified claim)'],
                ['Mint Logic', '1 token = $1 lost (adjustable)'],
                ['Burn Logic', 'Burned upon reward redemption'],
                ['Team Allocation', '10% of each mint (vested over 12 24 months)'],
                ['Max Redemption', 'DAO-defined caps per cycle (e.g. 50% per victim)'],
              ].map(([param, desc], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f0f4ff' }}>
                  <td style={{ padding: '7px 12px', border: '1px solid #d1d5db' }}>{param}</td>
                  <td style={{ padding: '7px 12px', border: '1px solid #d1d5db' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Section 6 */}
        <Section title="6. Governance">
          <p className="mb-3">Victim DAO uses a democratic contributor weighted voting model that ensures fairness and rewards meaningful participation.</p>
          <p className="mb-2" style={{ fontWeight: 'bold' }}>Voting Eligibility:</p>
          <p className="mb-3">Only verified victims with active $VDAO tokens are eligible to vote.</p>
          <p className="mb-2" style={{ fontWeight: 'bold' }}>Voting Power:</p>
          <p className="mb-2">Every DAO member receives 1 default vote regardless of their token balance.</p>
          <p className="mb-2">Additional votes are granted based on:</p>
          <p className="mb-2">Financial contributions to DAO bounty recovery missions</p>
          <p className="mb-2">Volunteer work claim verification development community moderation</p>
          <p>Successful referrals of victims or partners</p>
        </Section>

        {/* Section 7 */}
        <Section title="7. Use of Funds &amp; Team Compensation">
          <p className="mb-3">To sustain operations and incentivize long term growth:</p>
          <p className="mb-3">5% of all donations and recovery proceeds are allocated immediately to the core team's operations wallet for essential costs such as infrastructure legal support and outreach.</p>
          <p className="mb-3">10% of each victim token mint is allocated to a Team Vesting Pool.</p>
          <p className="mb-3">Team tokens are locked for 12 24 months with a gradual linear release to align incentives.</p>
          <p className="mb-3">Team tokens can be redeemed for treasury funds only through DAO approved redemption rounds under the same burn and claim model used by victims.</p>
          <p className="mb-3">Contributors such as bounty hunters verifiers and developers are rewarded through token based bounties or NFT badges representing reputation and governance rights.</p>
          <p className="mb-4">All team allocations and transfers are fully transparent and auditable on chain.</p>

          {/* Use of Funds visualisation */}
          <p style={{ fontWeight: 'bold', marginBottom: '16px' }}>Use of Funds Visualization</p>
          <div style={{ display: 'flex', gap: '48px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Pie chart with labels outside via SVG */}
            <div style={{ flexShrink: 0 }}>
              <svg viewBox="0 0 320 220" width="320" height="220">
                {/* Pie slices - centered at 130,110 with r=90 */}
                {/* 85% Victim Treasury: 0° to 306° */}
                <path d="M130,110 L130,20 A90,90 0 1,1 48.1,132.6 Z" fill="#2563eb" />
                {/* 10% Team Vesting: 306° to 342° */}
                <path d="M130,110 L48.1,132.6 A90,90 0 0,1 82.7,28.4 Z" fill="#93c5fd" />
                {/* 5% Operations: 342° to 360° */}
                <path d="M130,110 L82.7,28.4 A90,90 0 0,1 130,20 Z" fill="#bfdbfe" />

                {/* Label: Operations 5% - top right, outside circle */}
                <line x1="155" y1="38" x2="210" y2="20" stroke="#999" strokeWidth="0.8" />
                <text x="213" y="22" fontSize="10" fill="#444">Operations 5%</text>

                {/* Label: Team Vesting 10% - left, outside circle */}
                <line x1="55" y1="108" x2="8" y2="90" stroke="#999" strokeWidth="0.8" />
                <text x="10" y="82" fontSize="10" fill="#444">Team Vesting 10%</text>

                {/* Label: Victim Treasury 85% - bottom, outside circle */}
                <line x1="130" y1="200" x2="130" y2="215" stroke="#999" strokeWidth="0.8" />
                <text x="92" y="215" fontSize="10" fill="#444">Victim Treasury 85%</text>
              </svg>
            </div>

            {/* Vesting bar */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <p style={{ fontSize: '0.85rem', marginBottom: '10px', color: '#1e40af', fontWeight: 'bold' }}>Team Vesting Timeline (12 24 months)</p>
              <div style={{ height: '22px', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: '50%', background: '#3b82f6' }} />
                <div style={{ width: '50%', background: '#bfdbfe' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#555', marginTop: '6px' }}>
                <span>0m</span><span>12m</span><span>24m</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Section 8 */}
        <Section title="8. Why $VDAO Has Value">
          <p className="mb-3">Despite being non speculative at its core $VDAO gains value through:</p>
          <p className="mb-2">Redemption Rights potential future compensation</p>
          <p className="mb-2">Governance voting on real DAO decisions</p>
          <p className="mb-2">Scarcity supply decreases with every successful redemption</p>
          <p className="mb-2">Market Dynamics victims can sell their tokens on the open market if needed</p>
          <p>Utility required for participation in bounties governance and whitelist events</p>
        </Section>

        {/* Section 9 */}
        <Section title="9. Partnerships &amp; Listings">
          <p className="mb-3">Victim DAO is currently in stealth negotiations with:</p>
          <p className="mb-2">Legal firms specializing in crypto asset recovery</p>
          <p className="mb-2">Forensic analysis platforms</p>
          <p className="mb-2">Grant programs Gitcoin Ethereum Foundation</p>
          <p className="mb-3">Top10 centralized exchanges under NDA</p>
          <p>Tokens may be listed once critical mass is achieved to allow secondary liquidity. Until then token transfers may be gated.</p>
        </Section>

        {/* Section 10 — Roadmap table */}
        <Section title="10. Roadmap">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginTop: '8px' }}>
            <thead>
              <tr style={{ background: '#2563eb', color: '#fff' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #1e40af' }}>Phase</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #1e40af' }}>Timeline</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #1e40af' }}>Key Milestones</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Phase 1', 'Q4 2025', 'Smart contract development, audits, website launch'],
                ['Phase 2', 'Q4 2025', 'Victim verification live, first token mint events'],
                ['Phase 3', 'Q4 2025', 'DAO treasury and voting opens'],
                ['Phase 4', 'Q1–Q2 2026', 'Legal recovery missions, protocol revenue phase'],
                ['Phase 5', 'Q3–Q4', 'Decentralization of core processes — from verification to voting to redemption'],
                ['Phase 6', 'Q1 2027', 'Exchange listing (tentative), bounty program'],
              ].map(([phase, timeline, milestone], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f0f4ff' }}>
                  <td style={{ padding: '7px 12px', border: '1px solid #d1d5db' }}>{phase}</td>
                  <td style={{ padding: '7px 12px', border: '1px solid #d1d5db', whiteSpace: 'nowrap' }}>{timeline}</td>
                  <td style={{ padding: '7px 12px', border: '1px solid #d1d5db' }}>{milestone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Section 11 */}
        <Section title="11. Legal &amp; Ethical Notes">
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', lineHeight: '1.9' }}>
            <li>Victim DAO is not an insurance service or a financial promise.</li>
            <li>Compensation is based on donations and treasury status not guaranteed.</li>
            <li>Verifications are human reviewed initially with a goal to move toward decentralized oracle verification.</li>
          </ul>
        </Section>

        {/* Section 12 */}
        <Section title="12. Get Involved">
          <p className="mb-3">We are calling on:</p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', lineHeight: '1.9', marginBottom: '16px' }}>
            <li>Scam victims</li>
            <li>Security researchers</li>
            <li>Crypto lawyers</li>
            <li>Philanthropic DAOs</li>
            <li>Developers &amp; dApp builders</li>
          </ul>
          <p className="mb-2">Join us:</p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', lineHeight: '1.9' }}>
            <li>Website <a href="https://www.victimdao.org" style={{ color: '#2563eb' }}>www.victimdao.org</a></li>
            <li>Email <a href="mailto:info@victimdao.org" style={{ color: '#2563eb' }}>info@victimdao.org</a></li>
          </ul>
        </Section>

        {/* Section 13 */}
        <Section title="13. Conclusion">
          <p className="mb-3">Victim DAO is an audacious experiment in decentralized compassion. While we can't guarantee every victim full restitution we can provide a transparent community powered and hopeful alternative to being forgotten.</p>
          <p>Together we can rebuild trust in Web3 one victim at a time.</p>
        </Section>

        {/* Legal Disclaimer */}
        <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          <h2 style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '8px' }}>Legal Disclaimer</h2>
          <p style={{ fontSize: '0.85rem', color: '#555', lineHeight: '1.7' }}>
            This document is for informational purposes only and does not constitute financial legal or investment advice. Victim DAO does not guarantee compensation profits or recovery outcomes. All verifications and reward distributions are subject to DAO governance and treasury availability. Participation in Victim DAO is voluntary and at ones own risk.
          </p>
        </div>

      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div style={{ marginBottom: '32px' }}>
    <h2 style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '12px', color: '#111' }}>{title}</h2>
    <div style={{ fontSize: '0.88rem', lineHeight: '1.75', color: '#374151' }}>{children}</div>
  </div>
);

const SubSection = ({ title, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <h3 style={{ fontWeight: 'bold', fontSize: '0.93rem', marginBottom: '8px', color: '#111' }}>{title}</h3>
    <div style={{ fontSize: '0.88rem', lineHeight: '1.75', color: '#374151' }}>{children}</div>
  </div>
);

export default WhitePaper;
