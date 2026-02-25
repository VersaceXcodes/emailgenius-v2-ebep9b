import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Mail, LogOut, Sparkles, Copy, Check, CreditCard } from 'lucide-react';
import { ai } from '@/__create/ai';

interface GeneratedEmail {
  id: string;
  topic: string;
  tone: string;
  content: string;
  timestamp: Date;
}

const UV_Dashboard: React.FC = () => {
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const logoutUser = useAppStore(state => state.logout_user);
  
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [generating, setGenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<GeneratedEmail[]>([]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setGenerating(true);
    setError('');
    setCopied(false);

    try {
      const prompt = `Write a ${tone} email about the following topic:\n\n${topic}\n\nWrite a complete, well-formatted email that is ready to send. Include an appropriate subject line.`;
      
      const emailContent = await ai.ask(prompt, {
        temperature: 0.7,
        max_tokens: 500
      });

      const newEmail: GeneratedEmail = {
        id: Date.now().toString(),
        topic,
        tone,
        content: emailContent,
        timestamp: new Date()
      };

      setGeneratedEmail(newEmail);
      setHistory(prev => [newEmail, ...prev.slice(0, 4)]); // Keep last 5
    } catch (err) {
      console.error('Email generation error:', err);
      setError('Failed to generate email. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedEmail) return;
    
    try {
      await navigator.clipboard.writeText(generatedEmail.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      setError('Failed to copy to clipboard');
    }
  };

  const loadFromHistory = (email: GeneratedEmail) => {
    setGeneratedEmail(email);
    setTopic(email.topic);
    setTone(email.tone);
    setCopied(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <Mail className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">EmailGenius</h1>
                <p className="text-xs text-gray-500">Welcome, {currentUser?.name?.split(' ')[0]}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/subscription"
                className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                <CreditCard className="w-4 h-4" />
                Subscription
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 text-gray-700 hover:text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors font-medium"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Generator Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Generate Email</h2>
                  <p className="text-gray-600">Tell us what you need, and we'll write it for you</p>
                </div>
              </div>

              <form onSubmit={handleGenerate} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                    What's your email about?
                  </label>
                  <textarea
                    id="topic"
                    rows={4}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="E.g., Following up on our meeting about the Q4 marketing strategy..."
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-2">
                    Choose a tone
                  </label>
                  <select
                    id="tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                    <option value="persuasive">Persuasive</option>
                    <option value="apologetic">Apologetic</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={generating || !topic.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                >
                  {generating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Email
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Email Preview */}
            {generatedEmail && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Your Email</h3>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy to Clipboard
                      </>
                    )}
                  </button>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {generatedEmail.content}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                    {generatedEmail.tone}
                  </span>
                  <span>
                    {generatedEmail.timestamp.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - History */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Emails</h3>
              
              {history.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No emails generated yet. Start by creating your first email!
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => loadFromHistory(email)}
                      className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate mb-1">
                        {email.topic}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-white rounded text-gray-600 border">
                          {email.tone}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(email.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subscription Status */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-2">Pro Plan</h3>
              <p className="text-blue-100 text-sm mb-4">
                Unlimited email generation for just $9/month
              </p>
              <Link
                to="/subscription"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
              >
                <CreditCard className="w-4 h-4" />
                Manage Subscription
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UV_Dashboard;
