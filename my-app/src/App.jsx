import React, { useState, useRef, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { TrendingUp, AlertCircle, Flame, Sparkles, Plus } from 'lucide-react';

// --- API Layer ---
import * as API from './utils/api';

// --- Components ---
import Header from './components/Header';
import VoiceCircle from './components/VoiceCircle';
import NavigationTabs from './components/NavigationTabs';
import LeaderboardView from './components/LeaderBoardView';
import CircleView from './components/CircleView';
import InputBox from './components/InputBox';
import ChatMessage from './components/ChatMessage';
import InsightCard from './components/InsightCard';
import DailyChallenge from './components/DailyChallenge';
import LevelUpModal from './components/LevelUpModal';
import Confetti from './components/Confetti';
import BalanceCard from './components/BalanceCard';
import AddExpenseModal from './components/AddExpenseModal';
import ProfileModal from './components/ProfileModal'; // <--- IMPORT


// --- Utils ---
import { analyzeMoodFromQuery } from './utils/helpers';
import './styles/animations.css';

const App = () => {
  // ==============================
  // 1. STATE MANAGEMENT
  // ==============================
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [user, setUser] = useState(null);

  // Data States
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [savingsStats, setSavingsStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [groups, setGroups] = useState([]);

  // UI States
  const [activeTab, setActiveTab] = useState('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{
    text: "Hello! I'm your FinCoach. I can help you track expenses, set goals, or analyze your spending.",
    isUser: false
  }]);
  
  // MODAL STATES
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false); // <--- NEW

  // Game States
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [mood, setMood] = useState('motivational');

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (token) {
      API.setAuthToken(token);
      loadDashboardData();
    }
  }, [token]);

  // ==============================
  // 2. CONTINUOUS VOICE RECOGNITION
  // ==============================
  useEffect(() => {
    let recognition;

    if (isListening) {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Voice input is not supported in this browser. Try Chrome.");
        setIsListening(false);
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      
      recognition.lang = 'en-IN'; 
      recognition.continuous = true; 
      recognition.interimResults = true; 

      recognition.onstart = () => {
        console.log("Mic active...");
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInput(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech error:", event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
           setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (isListening) {
           try { recognition.start(); } catch(e) {}
        }
      };

      recognition.start();
    }

    return () => {
      if (recognition) {
        recognition.stop(); 
        console.log("Mic stopped manually.");
      }
    };
  }, [isListening]);

  // ==============================
  // 3. HANDLERS
  // ==============================

  const handleLoginSuccess = (credentialResponse) => {
    const t = credentialResponse.credential;
    setToken(t);
  };

  const handleGuestLogin = () => {
    setToken("guest_mode");
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    API.setAuthToken(null);
  };

  const handleUpdateProfile = async (updatedData) => {
    try {
      const newUser = await API.updateProfile(updatedData);
      setUser(newUser);
      loadDashboardData(); // Refresh stats based on new income/budget
    } catch (error) {
      console.error("Profile update failed", error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsProcessing(true);
      const [userData, lbData, stats, txData, goalsData, groupsData] = await Promise.all([
        API.fetchUserData(),
        API.fetchLeaderboard(),
        API.fetchSavingsStats(),
        API.fetchTransactions(),
        API.fetchGoals(),
        API.fetchGroups()
      ]);

      setUser(userData);
      setLeaderboardData(lbData);
      setSavingsStats(stats);
      setTransactions(txData);
      setGoals(goalsData);
      setGroups(groupsData);
      
      if (userData?.moodState) {
        setMood(userData.moodState.toLowerCase());
      }

    } catch (error) {
      console.error("Load Error:", error);
      if (error.response?.status === 401) handleLogout();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoalComplete = async (goalId) => {
    try {
      await API.addGoalProgress(goalId, 500);
      setChallengeCompleted(true);
      setShowConfetti(true);
      loadDashboardData();
    } catch (e) {
      console.error("Goal update failed", e);
    }
  };

  const handleAddExpense = async (expenseData) => {
    try {
      setIsProcessing(true);
      await API.addTransaction({
        merchant: expenseData.title || 'Manual Entry',
        amount: Number(expenseData.amount),
        category: expenseData.category || 'Expense'
      });
      
      setIsExpenseModalOpen(false);
      await loadDashboardData();
      
      setMessages(prev => [...prev, { 
        text: `✅ I've recorded ₹${expenseData.amount} for ${expenseData.title || 'Expense'}.`, 
        isUser: false 
      }]);
    } catch (error) {
      console.error("Failed to add expense", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;

    if (isListening) setIsListening(false);

    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setInput('');
    setIsProcessing(true);
    
    const detectedMood = analyzeMoodFromQuery(userMessage);
    setMood(detectedMood);

    try {
      let responseText = "";
      
      if (userMessage.toLowerCase().includes("at") && userMessage.match(/rs\.?\s?\d+/i)) {
         try {
           const parsed = await API.parseSMS(userMessage);
           responseText = `✅ Recorded expense: ₹${parsed.amount} at ${parsed.merchant}.`;
           loadDashboardData();
         } catch (e) {
           responseText = "I couldn't parse that. Try: 'Paid Rs 500 at Starbucks'";
         }
      } 
      else if (userMessage.toLowerCase().startsWith("add goal")) {
        const parts = userMessage.split(" ");
        if (parts.length >= 4) {
           const amount = parts.pop();
           const title = parts.slice(2).join(" ");
           await API.addGoal({ title, target: amount });
           responseText = `🎯 Goal '${title}' added with target ₹${amount}!`;
           loadDashboardData();
        } else {
           responseText = "To add a goal, say: 'Add goal [Name] [Amount]'";
        }
      }
      else {
        const aiRes = await API.getAIAdvice();
        responseText = aiRes.message;
      }

      setMessages(prev => [...prev, { 
        text: responseText, 
        isUser: false,
        mood: detectedMood 
      }]);

    } catch (err) {
      setMessages(prev => [...prev, { text: "Error connecting to FinCoach brain.", isUser: false }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // ==============================
  // 4. RENDER
  // ==============================

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full animate-scale-in">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl shadow-lg">
            💰
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Arth-Sarthi</h1>
          <p className="text-gray-600 mb-8">Your AI Financial Companion</p>
          <div className="space-y-4">
            <div className="flex justify-center">
               <GoogleLogin onSuccess={handleLoginSuccess} onError={() => {}} useOneTap />
            </div>
            <p className="text-center text-gray-400 text-sm">OR</p>
            <button
              onClick={handleGuestLogin}
              className="w-full py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 transition"
            >
              🚀 Continue as Guest (Demo)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentBalance = savingsStats?.balance || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
      <Header 
        level={Math.floor((user?.points || 0) / 100) + 1} 
        xp={(user?.points || 0) % 100} 
        maxXp={100} 
        points={user?.points || 0} 
        mood={mood} 
        onProfileClick={() => setIsProfileOpen(true)} // <--- CONNECTED
      />

      {/* PROFILE MODAL */}
      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        user={user}
        onLogout={handleLogout}
        onUpdateProfile={handleUpdateProfile}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 flex flex-col">
        <div className="relative -mt-16 mb-6 z-20 mx-auto w-full max-w-xl px-2">
          <BalanceCard balance={currentBalance} growth="+5%" />
        </div>

        <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} mood={mood} />

        {activeTab === 'chat' && (
          <div className="animate-fade-in pb-24">
            <div className="mb-6">
              {goals.length > 0 ? (
                <DailyChallenge 
                  challenge={`Add funds to: ${goals[0].title}`} 
                  completed={challengeCompleted} 
                  onComplete={() => handleGoalComplete(goals[0].id)} 
                />
              ) : (
                <div className="bg-blue-100 p-4 rounded-xl text-blue-800 text-center">
                  🎯 Type <strong>"Add goal [Name] [Amount]"</strong> to start saving!
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <InsightCard icon={TrendingUp} title="Total Saved" value={`₹${savingsStats?.savings || 0}`} color="border-green-600" onClick={() => setInput("Show my savings")} />
              <InsightCard icon={AlertCircle} title="Total Spent" value={`₹${savingsStats?.totalSpent || 0}`} color="border-yellow-600" onClick={() => setInput("Analyze my spending")} />
              <InsightCard icon={Flame} title="Global Rank" value={`#${leaderboardData.findIndex(u => u.id === 'user_1') + 1 || '-'}`} color="border-orange-600" onClick={() => setActiveTab('leaderboard')} />

              <div className="md:col-span-3 flex justify-center mt-2">
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-5 rounded-full shadow-lg hover:scale-105 transition-all font-bold"
                >
                  <Plus size={20} /> Add Expense
                </button>
              </div>
            </div>

            <VoiceCircle isListening={isListening} onToggleListen={() => setIsListening(!isListening)} level={1} mood={mood} />
            
            <AddExpenseModal
              isOpen={isExpenseModalOpen}
              onClose={() => setIsExpenseModalOpen(false)}
              onAdd={handleAddExpense}
            />

            {transactions.length > 0 && (
              <div className="mt-6 max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-4">
                <h3 className="text-lg font-bold mb-2 text-gray-800">Recent Activity</h3>
                <ul className="space-y-2">
                  {transactions.slice(0, 5).map((tx, idx) => (
                    <li key={tx.id || idx} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div>
                        <p className="font-bold text-gray-800">{tx.merchant || tx.title || 'Expense'}</p>
                        <p className="text-xs text-gray-500">{tx.category} • {tx.date}</p>
                      </div>
                      <p className="font-bold text-red-500">-₹{tx.amount}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-12 bg-white rounded-2xl shadow-xl p-4 md:p-6 max-w-4xl mx-auto mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" /> AI Coach Chat
              </h2>
              <div className="max-h-80 overflow-y-auto pr-2">
                {messages.map((msg, idx) => (
                  <ChatMessage key={idx} message={msg.text} isUser={msg.isUser} xpGained={msg.xpGained} mood={msg.mood || mood} />
                ))}
                {isProcessing && <div className="text-gray-400 text-sm animate-pulse ml-4">Thinking...</div>}
                <div ref={chatEndRef} />
              </div>
            </div>

            <InputBox 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onSubmit={handleSubmit} 
              disabled={isProcessing}
              onMicClick={() => setIsListening(!isListening)} 
            />
          </div>
        )}

        {activeTab === 'leaderboard' && (
           <div className="animate-slide-in">
             <LeaderboardView leaderboardData={leaderboardData} /> 
           </div>
        )}

        {activeTab === 'circle' && (
           <div className="animate-slide-in">
             <CircleView 
                groups={groups} 
                onCreateGroup={(name) => API.createGroup(name).then(loadDashboardData)}
                onJoinGroup={(code) => API.joinGroup(code).then(loadDashboardData)}
                mood={mood} 
             />
           </div>
        )}
      </main>

      {showLevelUp && <LevelUpModal level={Math.floor((user?.points || 0)/100)} onClose={() => setShowLevelUp(false)} />}
      <Confetti show={showConfetti} />
    </div>
  );
};

export default App;