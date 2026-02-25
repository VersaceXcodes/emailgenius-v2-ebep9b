import React, { useState } from 'react';
import { useAppStore } from '@/store/main';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';

const UV_Login: React.FC = () => {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isLoading = useAppStore((state) => state.authentication_state.authentication_status.is_loading);
  const errorMessage = useAppStore((state) => state.authentication_state.error_message);
  const signIn = useAppStore((state) => state.sign_in_email_password);
  const signUp = useAppStore((state) => state.sign_up_email_password);
  const clearAuthError = useAppStore((state) => state.clear_auth_error);

  const isSignUp = mode === 'sign-up';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();

    try {
      if (isSignUp) {
        await signUp(name, email, password);
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      console.error('Authentication request failed:', error);
    }
  };

  const handleSwitchMode = (nextMode: 'sign-in' | 'sign-up') => {
    if (nextMode === mode) return;
    clearAuthError();
    setMode(nextMode);
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-600 p-12 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2 text-white">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Home</span>
        </Link>
        
        <div className="text-white">
          <Mail className="w-16 h-16 mb-8" />
          <h1 className="text-4xl font-bold mb-4">EmailGenius</h1>
          <p className="text-xl text-blue-100">
            Write perfect emails in seconds with the power of AI.
          </p>
        </div>

        <div className="text-blue-100 text-sm">
          <p>&copy; 2026 EmailGenius. All rights reserved.</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full space-y-8">
          <div className="lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2 text-gray-700 mb-8 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Home</span>
            </Link>
          </div>

          <div>
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <Mail className="w-10 h-10 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">EmailGenius</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="mt-2 text-gray-600">
              {isSignUp 
                ? 'Start writing amazing emails today' 
                : 'Sign in to continue to your dashboard'}
            </p>
          </div>

          <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => handleSwitchMode('sign-in')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                !isSignUp ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('sign-up')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                isSignUp ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Sign up
            </button>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="text-sm font-medium">{errorMessage}</p>
              </div>
            )}

            <div className="space-y-4">
              {isSignUp && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>

            {isSignUp && (
              <p className="text-xs text-center text-gray-500">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default UV_Login;
