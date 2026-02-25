import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { ArrowLeft, Mail, Check, CreditCard, Loader2 } from 'lucide-react';
import { stripe } from '@/__create/stripe';

const UV_Subscription: React.FC = () => {
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    if (!currentUser?.email) {
      setError('User email not found');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'EmailGenius Pro',
                description: 'Unlimited AI-powered email generation',
              },
              unit_amount: 900, // $9.00 in cents
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${window.location.origin}/dashboard?subscription=success`,
        cancel_url: `${window.location.origin}/subscription?canceled=true`,
        customer_email: currentUser.email,
        metadata: {
          userId: currentUser.id,
        },
      });

      // Redirect to Stripe checkout
      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Stripe checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create checkout session');
      setLoading(false);
    }
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
              </div>
            </div>
            <div className="flex items-center">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upgrade to Pro
          </h1>
          <p className="text-xl text-gray-600">
            Unlock unlimited AI-powered email generation
          </p>
        </div>

        {/* Pricing Card */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-200 overflow-hidden max-w-md mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white text-center">
            <h2 className="text-3xl font-bold mb-2">Pro Plan</h2>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-bold">$9</span>
              <span className="text-xl text-blue-100">/month</span>
            </div>
          </div>

          <div className="p-8">
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">Unlimited email generation</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">All tone options (Professional, Friendly, Formal, etc.)</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">Email history & templates</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">Priority support</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">Cancel anytime</span>
              </li>
            </ul>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Subscribe Now
                </>
              )}
            </button>

            <p className="text-xs text-center text-gray-500 mt-4">
              Secure payment powered by Stripe. Cancel anytime from your dashboard.
            </p>
          </div>
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-2">Can I cancel anytime?</h4>
              <p className="text-gray-600 text-sm">
                Yes! You can cancel your subscription at any time from your dashboard. No questions asked.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-2">What payment methods do you accept?</h4>
              <p className="text-gray-600 text-sm">
                We accept all major credit cards through our secure Stripe payment processor.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-2">Is there a free trial?</h4>
              <p className="text-gray-600 text-sm">
                You can try EmailGenius for free to see how it works. Subscribe when you're ready for unlimited access.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-2">What if I need help?</h4>
              <p className="text-gray-600 text-sm">
                Pro subscribers get priority email support. We're here to help you get the most out of EmailGenius.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UV_Subscription;
