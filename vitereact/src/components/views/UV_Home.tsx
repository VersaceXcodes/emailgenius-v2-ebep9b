import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Sparkles, Zap, ArrowRight } from 'lucide-react';

const UV_Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Mail className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">EmailGenius</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Email Writing
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Write Perfect Emails in
            <span className="text-blue-600"> Seconds</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Say goodbye to writer's block. EmailGenius uses AI to craft professional,
            engaging emails tailored to any tone or topic.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg shadow-blue-600/20"
            >
              Start Writing Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-lg border border-gray-300"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">AI-Powered</h3>
            <p className="text-gray-600">
              Advanced AI understands context and generates emails that sound natural and professional.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Lightning Fast</h3>
            <p className="text-gray-600">
              Generate complete emails in seconds. No more staring at a blank screen.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Any Tone</h3>
            <p className="text-gray-600">
              From formal business emails to casual messages, choose the perfect tone for every situation.
            </p>
          </div>
        </div>

        {/* Pricing CTA */}
        <div className="mt-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white shadow-xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Email Writing?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of professionals who save hours every week. Only $9/month.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Mail className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-gray-900">EmailGenius</span>
            </div>
            <p className="text-gray-600 text-sm">
              &copy; 2026 EmailGenius. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UV_Home;
