import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Vote as VoteIcon, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Vote = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 12,
    minutes: 60,
    seconds: 5
  });
  const [votes, setVotes] = useState({
    question1: null,
    question2: null
  });
  const [hasVoted, setHasVoted] = useState(false);

  // Sample questions
  const questions = [
    {
      id: 'question1',
      title: 'Should we distribute funds?',
      options: [
        { id: 'A', label: 'YES' },
        { id: 'B', label: 'NO' },
        { id: 'C', label: 'MAYBE' }
      ]
    },
    {
      id: 'question2',
      title: 'Should we go LEFT, RIGHT, UP, or DOWN?',
      options: [
        { id: 'A', label: 'UP' },
        { id: 'B', label: 'DOWN' },
        { id: 'C', label: 'LEFT' },
        { id: 'D', label: 'RIGHT' }
      ]
    }
  ];

  // Timer countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleVoteChange = (questionId, optionId) => {
    setVotes(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleSubmitVotes = () => {
    // Check if all questions are answered
    const unansweredQuestions = questions.filter(q => !votes[q.id]);
    
    if (unansweredQuestions.length > 0) {
      toast.error('Please answer all questions before submitting your vote');
      return;
    }

    // Simulate vote submission
    setHasVoted(true);
    toast.success('Your votes have been submitted successfully!');
    
    // In a real app, this would send the votes to the backend
    console.log('Submitted votes:', votes);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen hero-gradient mobile-padding py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8"
        >
          <h1 className="mobile-header font-bold text-white mb-2">Vote</h1>
          <p className="text-gray-300 mobile-text">Cast your vote on important decisions</p>
        </motion.div>

        {/* Timer Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mobile-glass rounded-xl mobile-card mb-6 sm:mb-8 text-center"
        >
          <h2 className="mobile-subheader font-bold text-white mb-4">Time Remaining</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 responsive-gap mb-4">
            <div className="bg-white/10 rounded-lg p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-bold text-white">{timeLeft.days}</div>
              <div className="text-gray-300 text-xs sm:text-sm">Days</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-bold text-white">{timeLeft.hours}</div>
              <div className="text-gray-300 text-xs sm:text-sm">Hours</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-bold text-white">{timeLeft.minutes}</div>
              <div className="text-gray-300 text-xs sm:text-sm">Minutes</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-bold text-white">{timeLeft.seconds}</div>
              <div className="text-gray-300 text-xs sm:text-sm">Seconds</div>
            </div>
          </div>
          <p className="text-yellow-400 font-semibold mobile-text">
            You have 1 vote for this round
          </p>
        </motion.div>

        {/* Questions */}
        <div className="space-y-6 sm:space-y-8">
          {questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="mobile-glass rounded-xl mobile-card"
            >
              <h3 className="mobile-subheader font-bold text-white mb-4 sm:mb-6">
                {question.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 responsive-gap">
                {question.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleVoteChange(question.id, option.id)}
                    className={`p-4 rounded-lg transition-all duration-300 touch-target ${
                      votes[question.id] === option.id
                        ? 'bg-purple-500/30 border-2 border-purple-400 text-white'
                        : 'bg-white/10 border-2 border-transparent text-gray-300 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm sm:text-base">{option.id}) {option.label}</span>
                      <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 ${
                        votes[question.id] === option.id
                          ? 'bg-purple-400 border-purple-400'
                          : 'border-gray-400'
                      }`}>
                        {votes[question.id] === option.id && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 sm:mt-8 text-center"
        >
          <button
            onClick={handleSubmitVotes}
            disabled={questions.some(q => !votes[q.id])}
            className={`mobile-button font-bold rounded-lg transition-all duration-300 transform touch-target ${
              questions.some(q => !votes[q.id])
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white hover:scale-105'
            }`}
          >
            <VoteIcon className="w-5 h-5 mr-2" />
            Submit Votes ({Object.keys(votes).filter(key => votes[key]).length}/{questions.length})
          </button>
        </motion.div>

        {/* Back to Dashboard */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center"
        >
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-white transition-colors mobile-text touch-target"
          >
            ← Back to Dashboard
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Vote;