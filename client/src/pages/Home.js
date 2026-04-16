import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Vote, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Award,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const joinNoticeHref = (() => {
    try {
      const ref = localStorage.getItem('landingReferralCode');
      return ref ? `/join-notice?ref=${encodeURIComponent(ref)}` : '/join-notice';
    } catch { return '/join-notice'; }
  })();

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const ref = params.get('ref');
      if (ref) {
        localStorage.setItem('landingReferralCode', ref);
      }
    } catch {}
  }, [location.search]);
  const features = [
    {
      icon: Vote,
      title: 'Secure Voting',
      description: 'Participate in transparent voting rounds to help decide how recovered funds are distributed among victims.'
    },
    {
      icon: DollarSign,
      title: 'Top Contributors & Victim Stats',
      description: 'View key stats on victims helped and the most active contributors.'
    },
    {
      icon: TrendingUp,
      title: 'Community Progress Tracker',
      description: 'Stay updated on recovery milestones and contributions from our Telegram community.'
    }
  ];

  const stats = [
    { number: '1,256', label: 'Total Points Distributed' },
    { number: '500+', label: 'Active Users' },
    { number: '50+', label: 'Voting Rounds' },
    { number: '99.9%', label: 'Uptime' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section - Victim DAO */}
      <section className="relative -mx-8 overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-16">
        <div className="absolute inset-0 bg-black/20"></div>
        {/* Animated blockchain background across entire hero */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <svg viewBox="0 0 1200 400" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="bgTealGrad" x1="0" y1="0" x2="1" y2="0">
                {/* Match hero background hues (purple → indigo), use lighter tints for visibility */}
                <stop offset="0%" stopColor="#9333ea" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              {/* Subtle radial glow for nodes (no wide shadow) */}
              <radialGradient id="nodeGlowHalo" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#a5b4fc" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Ambient particles */}
            {Array.from({ length: 120 }).map((_, i) => (
              <motion.circle
                key={i}
                cx={(i * 73) % 1200}
                cy={((i * 137) % 400)}
                r={(i % 7) * 0.6 + 0.4}
                fill="#7dd3fc"
                initial={{ opacity: 0.12 }}
                animate={{ opacity: [0.12, 0.5, 0.12] }}
                transition={{ duration: 2 + (i % 5) * 0.4, repeat: Infinity }}
              />
            ))}

            {/* Broken chains originate from left and right, elongate, and meet at center */}
            {(() => {
              const centerX = 600; // middle of 1200 viewBox
              const ys = [340,300,260,220,180,140,100];
              const makeLeft = (y, idx) => `M 0 ${y} C 220 ${y-90}, 440 ${Math.min(y+30,395)}, ${centerX} ${Math.min(y-10,395)}`;
              const makeRight = (y, idx) => `M 1200 ${Math.max(y-20,5)} C 980 ${y-80}, 760 ${Math.min(y+20,395)}, ${centerX} ${Math.min(y-10,395)}`;
              return (
                <g>
                  {ys.map((y, i) => (
                    <motion.path
                      key={`left-grow-${i}`}
                      d={makeLeft(y, i)}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={i < 2 ? 3 : i < 4 ? 2.8 : 2.5}
                      strokeOpacity={i < 2 ? 0.22 : 0.18}
                      strokeLinecap="round"
                      strokeDasharray={12 + i * 1.5 + " " + (20 + i * 2)}
                      initial={{ pathLength: 0, strokeDashoffset: 40 }}
                      animate={{ pathLength: 1, strokeDashoffset: [40, 0, 40] }}
                      transition={{ duration: 3.2 + i * 0.25, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                    />
                  ))}
                  {ys.map((y, i) => (
                    <motion.path
                      key={`right-grow-${i}`}
                      d={makeRight(y, i)}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={i < 2 ? 3 : i < 4 ? 2.8 : 2.5}
                      strokeOpacity={i < 2 ? 0.22 : 0.18}
                      strokeLinecap="round"
                      strokeDasharray={12 + i * 1.5 + " " + (20 + i * 2)}
                      initial={{ pathLength: 0, strokeDashoffset: 40 }}
                      animate={{ pathLength: 1, strokeDashoffset: [40, 0, 40] }}
                      transition={{ duration: 3.2 + i * 0.25, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                    />
                  ))}
                </g>
              );
            })()}
            {/* Nodes without outer halo; crisp glow via bright core and stroke */}
            <g>
              {(() => {
                const points = [
                  // lower arcs
                  [120,320],[240,330],[360,340],[480,330],[600,300],[720,285],[840,290],[960,295],[1080,290],
                  [140,290],[260,305],[380,315],[500,305],[620,275],[740,260],[860,265],[980,270],[1100,265],
                  // mid arcs
                  [160,260],[280,275],[400,285],[520,275],[640,250],[760,235],[880,240],[1000,245],[1120,240],
                  // upper arcs
                  [180,220],[300,235],[420,245],[540,235],[660,210],[780,200],[900,205],[1020,210],[1140,205],
                  [200,185],[320,200],[440,210],[560,200],[680,180],[800,170],[920,175],[1040,180],[1160,175]
                ];
                // add extra nodes for top-most chains
                points.push(
                  // high arcs around y ~ 160
                  [180,160],[300,165],[420,170],[540,165],[660,150],[780,140],[900,145],[1020,150],[1140,145],
                  // very top arcs around y ~ 120
                  [200,120],[320,130],[440,135],[560,130],[680,115],[800,105],[920,110],[1040,115],[1160,110]
                );
                // derive center meeting nodes for all arc rows
                const centerX = 600;
                const ys = [380,340,300,260,220,180,140,100,60];
                const centers = ys.map((y) => [centerX, Math.min(y - 10, 395)]);
                return (
                  <g>
                    {points.map(([x,y], i) => (
                      <g key={`web-node-${i}`}>
                        <motion.circle
                          cx={x} cy={y}
                          r={i % 10 === 0 ? 2.6 : 2}
                          fill="url(#bgTealGrad)"
                          stroke="#ffffff"
                          strokeWidth="0.6"
                          strokeOpacity="0.5"
                          initial={{ opacity: 0.3, scale: 0.98 }}
                          animate={{ opacity: [0.3, 0.5, 0.3], scale: [0.98, 1.04, 0.98] }}
                          transition={{ duration: 1.6 + (i % 6) * 0.2, repeat: Infinity }}
                        />
                        <circle cx={x} cy={y} r="0.8" fill="#ffffff" fillOpacity="0.9" />
                        {/* subtle radial glow halo (no blur, no shadow) */}
                        <motion.circle
                          cx={x} cy={y}
                          r={i % 10 === 0 ? 14 : 12}
                          fill="url(#nodeGlowHalo)"
                          initial={{ opacity: 0.15 }}
                          animate={{ opacity: [0.15, 0.6, 0.28, 0.6, 0.15] }}
                          transition={{ duration: 2.2 + (i % 6) * 0.2, repeat: Infinity }}
                        />
                        {/* joining ripple to imply repair */}
                        <motion.circle
                          cx={x} cy={y}
                          r={9}
                          fill="none"
                          stroke="#93c5fd"
                          strokeWidth="1.2"
                          strokeOpacity="0.35"
                          initial={{ opacity: 0.0, scale: 0.9 }}
                          animate={{ opacity: [0.0, 0.35, 0.0], scale: [0.9, 1.25, 0.9] }}
                          transition={{ duration: 1.8 + (i % 4) * 0.2, repeat: Infinity }}
                        />
                      </g>
                    ))}

                    {/* special meeting nodes with stronger timed glow */}
                    {centers.map(([x,y], i) => (
                      <g key={`center-node-${i}`}>
                        <motion.circle
                          cx={x} cy={y}
                          r={3.2}
                          fill="url(#bgTealGrad)"
                          stroke="#ffffff"
                          strokeWidth="0.8"
                          strokeOpacity="0.6"
                          initial={{ opacity: 0.45, scale: 1.0 }}
                          animate={{ opacity: [0.5, 0.8, 0.5], scale: [1.0, 1.18, 1.0] }}
                          transition={{ duration: 3.2 + i * 0.25, repeat: Infinity, repeatType: "mirror" }}
                        />
                        <circle cx={x} cy={y} r="1.0" fill="#ffffff" fillOpacity="0.95" />
                        {/* stronger radial glow halo for meeting nodes */}
                        <motion.circle
                          cx={x} cy={y}
                          r={18}
                          fill="url(#nodeGlowHalo)"
                          initial={{ opacity: 0.18 }}
                          animate={{ opacity: [0.18, 0.7, 0.35, 0.7, 0.18] }}
                          transition={{ duration: 3.4 + i * 0.2, repeat: Infinity, repeatType: "mirror" }}
                        />
                        {/* burst ring at the moment of meeting */}
                        <motion.circle
                          cx={x} cy={y}
                          r={12}
                          fill="none"
                          stroke="#93c5fd"
                          strokeWidth="1.6"
                          strokeOpacity="0.6"
                          initial={{ opacity: 0.0, scale: 0.8 }}
                          animate={{ opacity: [0.0, 0.7, 0.0], scale: [0.8, 1.5, 0.8] }}
                          transition={{ duration: 3.2 + i * 0.25, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                        />
                      </g>
                    ))}
                  </g>
                );
              })()}
            </g>
          </svg>
        </div>
        <div className="relative z-10 w-full mobile-padding py-16">
          <div className="grid lg:grid-cols-1 gap-12 items-center">
            {/* Copy */}
            <div>
              <p className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Victim DAO
              </p>

              <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Rebuilding Web3 with Compassion, Transparency,
                <br className="hidden md:block" />
                and Justice.
              </h1>

              <p className="text-base md:text-lg text-gray-200 mb-6 max-w-2xl">
                Victim DAO is a decentralized recovery protocol that verifies scam victims, issues on-chain proof-of-loss tokens, and funds partial compensation through community governance.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const ref = localStorage.getItem('landingReferralCode');
                    navigate(ref ? `/join-notice?ref=${encodeURIComponent(ref)}` : '/join-notice');
                  }}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-semibold hover:from-purple-600 hover:to-blue-600 transition-all"
                >
                  Are you a victim? Join the DAO →
                </button>

                <button
                  type="button"
                  onClick={() => { navigate('/whitepaper'); }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-white/20 to-white/10 border-2 border-white/60 text-white font-bold hover:from-white/30 hover:to-white/20 hover:border-white/80 transition-all shadow-lg hover:shadow-white/10"
                >
                  📄 Read the Whitepaper →
                </button>
              </div>
            </div>
            {/* Removed right-column visual; background now spans hero */}
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-16 bg-white -mx-8">
        <div className="w-full mobile-padding">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-6"
          >
            The Problem
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-4 text-lg text-gray-700"
          >
            <p className="font-semibold text-gray-800">&gt; Over $20 billion has been lost to crypto scams and rug pulls since 2020.</p>
            <p>Victims are left without legal recourse, insurance, or recovery options.</p>
            <p>Trust in Web3 is fading — and the people who believed in it most are being left behind.</p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 -mx-8">
        <div className="w-full mobile-padding">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            >
              How Victim DAO Helps
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto"
            >
              Verify victims, issue proof-of-loss tokens, and allocate community-backed compensation.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="card p-6 text-center hover:scale-105 transition-transform duration-300"
                >
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon size={32} className="text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 -mx-8">
        <div className="w-full mobile-padding text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-3xl md:text-4xl font-bold text-white mb-6"
          >
            Join the Community Recovery Effort
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-purple-100 mb-8"
          >
            Be part of a transparent, community-governed system restoring trust in Web3.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Link
              to={joinNoticeHref}
              className="bg-white text-purple-600 font-semibold py-4 px-8 rounded-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl inline-flex items-center space-x-2"
            >
              <span>Join Now</span>
              <ArrowRight size={20} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
