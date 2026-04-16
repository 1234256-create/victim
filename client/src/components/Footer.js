import React from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Footer = () => {
  const [canContribute, setCanContribute] = React.useState(false);

  React.useEffect(() => {
    const checkContributionStatus = async () => {
      try {
        const [activeRes, publicRes, roundRes] = await Promise.all([
          axios.get('/api/settings/contributionActive'),
          axios.get('/api/settings/publicContributionsEnabled'),
          axios.get('/api/settings/contributionRound')
        ]);
        const isActive = activeRes.data?.data?.value ?? true;
        const isPublic = publicRes.data?.data?.value === true;
        const round = roundRes.data?.data?.value;
        const nowMs = Date.now();
        const hasRound = Boolean(round && round.startTime && round.endTime && nowMs <= new Date(round.endTime).getTime());
        setCanContribute(isActive && (isPublic || hasRound));
      } catch (error) { }
    };
    checkContributionStatus();
    window.addEventListener('datastore:update', checkContributionStatus);
    return () => window.removeEventListener('datastore:update', checkContributionStatus);
  }, []);

  return (
    <footer className="bg-black/20 backdrop-blur-md border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-start">

          {/* Platform */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold">Platform</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/voting"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Voting
                </Link>
              </li>
              {canContribute && (
                <li>
                  <Link
                    to="/contribute"
                    className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                  >
                    Contribute
                  </Link>
                </li>
              )}
              <li>
                <Link
                  to="/leaderboard"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/referral"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Referral
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/whitepaper"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Whitepaper
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/privacy"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold">Contact</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:Info@victimdao.org"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Info@victimdao.org
                </a>
              </li>
            </ul>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold">Address</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-gray-400 text-sm">
                  12 N 2nd Street STE 100,<br />Richmond, KY 40475
                </span>
              </li>
              <li>
                <span className="text-gray-400 text-sm">
                  10200 Linn Station Road,<br />Louisville, KY, 40223, USA
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-4 pt-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2026 Victim DAO Platform. All rights reserved.
            </p>
            <p className="text-gray-400 text-sm mt-2 md:mt-0">
              Built with ❤️ for the decentralized future
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
