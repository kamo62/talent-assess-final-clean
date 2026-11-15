import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Users, Briefcase, Code, Brain, Settings, Mail, MapPin, Gift, CreditCard, Star, TrendingUp, Shield, Zap, LogIn } from 'lucide-react';

export default function LandingImproved() {
  return (
    <div className="min-h-screen">
      {/* Header with Sign In Button */}
      <header className="bg-white shadow-sm py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="text-xl font-bold text-indigo-600">CodeZinto</div>
          <Link
            to="/auth"
            className="inline-flex items-center px-4 py-2 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 transition-colors"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Link>
        </div>
      </header>
      {/* Hero Section with Gradient Background */}
      <div className="relative bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 lg:mt-16 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block">Streamline Your</span>
                  <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Technical Hiring</span>
                </h1>
                <p className="mt-3 text-base text-gray-600 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Comprehensive assessment platform tailored for South African companies. 
                  Create custom technical assessments that perfectly match your job requirements.
                </p>
                
                {/* Free Trial Badge */}
                <div className="mt-6 flex items-center text-sm sm:text-base">
                  <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
                    <Gift className="h-5 w-5" />
                    <span className="font-semibold">14-day free trial with 25 assessments included!</span>
                  </div>
                </div>
                
                <div className="mt-8 sm:flex sm:justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                    <Link
                      to="/auth"
                      className="w-full flex items-center justify-center px-8 py-4 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all md:text-lg"
                    >
                      Get started free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </div>
                  <div className="rounded-lg">
                    <a
                      href="#pricing"
                      className="w-full flex items-center justify-center px-8 py-4 border-2 border-indigo-200 text-base font-medium rounded-lg text-indigo-700 bg-white hover:bg-indigo-50 transition-colors md:text-lg"
                    >
                      View pricing
                    </a>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="relative h-full">
            <div className="absolute inset-0 bg-gradient-to-l from-indigo-600/20 to-transparent z-10"></div>
            <img
              className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full"
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1920&q=80"
              alt="Team collaborating"
            />
          </div>
        </div>
      </div>

      {/* Features Section with Better Cards */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">
              Features
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to assess technical talent
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-600 lg:mx-auto">
              Comprehensive tools to evaluate candidates across different technical roles and skill levels.
            </p>
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {/* Feature Cards with Hover Effects */}
              <div className="relative group">
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 h-full border border-gray-100 hover:border-indigo-200">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Code className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">Custom Coding Challenges</h3>
                  <p className="mt-2 text-gray-600">
                    Create role-specific coding assessments that match your tech stack and requirements.
                  </p>
                </div>
              </div>

              <div className="relative group">
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 h-full border border-gray-100 hover:border-indigo-200">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Brain className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">System Design Assessments</h3>
                  <p className="mt-2 text-gray-600">
                    Evaluate candidates' ability to design scalable and efficient systems.
                  </p>
                </div>
              </div>

              <div className="relative group">
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 h-full border border-gray-100 hover:border-indigo-200">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">Job Profile Matching</h3>
                  <p className="mt-2 text-gray-600">
                    Create assessment templates based on specific job profiles and requirements.
                  </p>
                </div>
              </div>

              <div className="relative group">
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 h-full border border-gray-100 hover:border-indigo-200">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Settings className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">Customizable Workflows</h3>
                  <p className="mt-2 text-gray-600">
                    Adapt the assessment process to match your hiring workflow and requirements.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section with Enhanced Cards */}
      <div id="pricing" className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">
              Pricing
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Choose the right plan for your team
            </p>
            <p className="mt-4 text-lg text-gray-600">
              Or start with our <span className="font-semibold text-green-600">14-day free trial</span> and get 25 assessments to test our platform!
            </p>
          </div>

          {/* Free Trial Banner with Animation */}
          <div className="mt-12 mb-12 max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-shadow">
              <Gift className="h-14 w-14 text-green-600 mx-auto mb-4 animate-bounce" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Start Your Free Trial</h3>
              <p className="text-gray-700 mb-6">
                Get 14 days of full access and 25 free assessments to evaluate candidates. No credit card required!
              </p>
              <Link
                to="/auth"
                className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* What is an Assessment? - Enhanced */}
          <div className="mb-12 max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 shadow-md">
              <h3 className="text-xl font-bold text-gray-900 mb-4">What is an Assessment?</h3>
              <p className="text-gray-700 mb-4">An assessment is a single evaluation unit that can be:</p>
              <div className="space-y-3">
                <div className="flex items-start bg-white/70 backdrop-blur-sm rounded-lg p-3">
                  <Zap className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-gray-900">Code Assessment:</span>
                    <span className="text-gray-700 ml-2">Test programming skills in multiple languages</span>
                  </div>
                </div>
                <div className="flex items-start bg-white/70 backdrop-blur-sm rounded-lg p-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-gray-900">Case Study:</span>
                    <span className="text-gray-700 ml-2">Evaluate analytical and problem-solving abilities</span>
                  </div>
                </div>
                <div className="flex items-start bg-white/70 backdrop-blur-sm rounded-lg p-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-gray-900">Architectural Diagram (Coming Soon):</span>
                    <span className="text-gray-700 ml-2">Assess system design capabilities</span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-600 bg-white/50 backdrop-blur-sm rounded-lg p-3">
                All assessments include automated scoring, plagiarism detection, and detailed candidate reports.
              </p>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:max-w-7xl lg:mx-auto">
            {/* Pay as You Go */}
            <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-200 overflow-hidden">
              <div className="p-8">
                <h3 className="text-xl font-bold text-gray-900">Pay as You Go</h3>
                <p className="mt-3 text-sm text-gray-600">Perfect for occasional use or testing</p>
                <div className="mt-6">
                  <span className="text-5xl font-extrabold text-gray-900">R20</span>
                  <span className="text-lg text-gray-600">/assessment</span>
                </div>
                <Link
                  to="/auth"
                  className="mt-8 block w-full bg-gray-900 text-white rounded-lg py-3 text-sm font-semibold text-center hover:bg-gray-800 transition-colors"
                >
                  Get started
                </Link>
              </div>
              <div className="bg-gray-50 px-8 py-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">What's included</h4>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">All assessment types</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">No monthly commitment</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">Community support</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">Basic templates</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Starter Plan */}
            <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-200 overflow-hidden">
              <div className="p-8">
                <h3 className="text-xl font-bold text-gray-900">Starter</h3>
                <p className="mt-3 text-sm text-gray-600">For small teams, regular hiring</p>
                <div className="mt-6">
                  <span className="text-5xl font-extrabold text-gray-900">R1,500</span>
                  <span className="text-lg text-gray-600">/month</span>
                </div>
                <div className="mt-2">
                  <span className="text-sm font-semibold text-green-600">Save R2,500 vs Pay as You Go</span>
                  <p className="text-xs text-gray-500 mt-1">R7.50 per assessment</p>
                </div>
                <Link
                  to="/auth"
                  className="mt-8 block w-full bg-indigo-600 text-white rounded-lg py-3 text-sm font-semibold text-center hover:bg-indigo-700 transition-colors"
                >
                  Get started
                </Link>
              </div>
              <div className="bg-gray-50 px-8 py-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">What's included</h4>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">200 assessments/month</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">R8 per additional assessment</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">AI-powered assessments</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">Email support</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">Basic analytics</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Professional Plan - Most Popular */}
            <div className="relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all border-2 border-indigo-500 overflow-hidden transform hover:-translate-y-1">
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center py-2 text-sm font-semibold">
                MOST POPULAR
              </div>
              <div className="p-8 pt-12">
                <h3 className="text-xl font-bold text-gray-900">Professional</h3>
                <p className="mt-3 text-sm text-gray-600">For growing teams, high-volume recruiting</p>
                <div className="mt-6">
                  <span className="text-5xl font-extrabold text-gray-900">R4,500</span>
                  <span className="text-lg text-gray-600">/month</span>
                </div>
                <div className="mt-2">
                  <span className="text-sm font-semibold text-green-600">Save over R9,000 vs Pay as You Go</span>
                  <p className="text-xs text-gray-500 mt-1">R6 per assessment</p>
                </div>
                <Link
                  to="/auth"
                  className="mt-8 block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg py-3 text-sm font-semibold text-center hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md"
                >
                  Get started
                </Link>
              </div>
              <div className="bg-indigo-50 px-8 py-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Everything in Starter, plus:</h4>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-indigo-600 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">750 assessments/month</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-indigo-600 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">R6.50 per additional assessment</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-indigo-600 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">Advanced AI assessments</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-indigo-600 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">Custom templates</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-indigo-600 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">API access</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-indigo-600 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">Priority support</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-200 overflow-hidden">
              <div className="p-8">
                <h3 className="text-xl font-bold text-gray-900">Enterprise</h3>
                <p className="mt-3 text-sm text-gray-600">Custom solutions for large organizations</p>
                <div className="mt-6">
                  <span className="text-5xl font-extrabold text-gray-900">Custom</span>
                </div>
                <div className="mt-2">
                  <span className="text-sm text-gray-600">Starting at R5/assessment</span>
                  <p className="text-xs text-gray-500 mt-1">Volume-based pricing</p>
                </div>
                <a
                  href="mailto:enterprise@example.com"
                  className="mt-8 block w-full bg-gray-900 text-white rounded-lg py-3 text-sm font-semibold text-center hover:bg-gray-800 transition-colors"
                >
                  Contact sales
                </a>
              </div>
              <div className="bg-gray-50 px-8 py-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Everything in Professional, plus:</h4>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">Volume-based pricing</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">Custom AI training</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">Dedicated support</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">SLA guarantee</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">SSO integration</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">Custom integrations</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced CTA Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-8 py-12 sm:px-16 sm:py-16 lg:py-20">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                  Ready to transform your technical hiring process?
                </h2>
                <p className="mt-4 text-xl text-indigo-100">
                  Start your free 14-day trial today and transform your hiring process.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/auth"
                    className="bg-white text-indigo-600 rounded-lg shadow-lg px-8 py-4 inline-flex items-center justify-center text-base font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Get started for free
                    <ArrowRight className="ml-3 h-5 w-5" />
                  </Link>
                  <a
                    href="#pricing"
                    className="bg-transparent border-2 border-white text-white rounded-lg px-8 py-4 inline-flex items-center justify-center text-base font-semibold hover:bg-white/10 transition-colors"
                  >
                    Compare plans
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold text-white mb-4">CodeZinto Assessments</h3>
              <p className="text-gray-400 mb-4">
                Precision coding and technical evaluations with local flair. 
                Streamline your hiring process with AI-powered assessments tailored for South African companies.
              </p>
              <div className="flex space-x-4">
                <a href="https://twitter.com" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="https://linkedin.com" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase mb-4">Company</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/about" className="text-gray-300 hover:text-white transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="text-gray-300 hover:text-white transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link to="/careers" className="text-gray-300 hover:text-white transition-colors">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase mb-4">Support</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/help" className="text-gray-300 hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link to="/help#documentation" className="text-gray-300 hover:text-white transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link to="/help#best-practices" className="text-gray-300 hover:text-white transition-colors">
                    Best Practices
                  </Link>
                </li>
                <li>
                  <Link to="/api" className="text-gray-300 hover:text-white transition-colors">
                    API Reference
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase mb-4">Contact</h3>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <a href="mailto:support@example.com" className="text-gray-300 hover:text-white transition-colors">
                    support@example.com
                  </a>
                </li>

                <li className="flex items-center">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-300">
                    Cape Town, South Africa
                  </span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} CodeZinto Assessments. All rights reserved.
              </p>
              <div className="mt-4 md:mt-0 flex space-x-6">
                <Link to="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Terms of Service
                </Link>
                <Link to="/security" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Security
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
