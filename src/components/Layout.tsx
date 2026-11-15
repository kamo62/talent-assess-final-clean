import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  BookOpen, 
  Code, 
  LogOut, 
  Settings, 
  History, 
  BarChart, 
  Users,
  User,
  Building2,
  ChevronDown,
  ListChecks,
  GraduationCap,
  Shield,
  HelpCircle,
  CreditCard
} from 'lucide-react';
import { CodeZintoBrand } from './CodeZintoBranding';

export function Layout() {
  const navigate = useNavigate();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const orgMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
      if (orgMenuRef.current && !orgMenuRef.current.contains(event.target as Node)) {
        setShowOrgMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              {/* CodeZinto Brand */}
              <Link to="/dashboard" className="flex-shrink-0">
                <CodeZintoBrand />
              </Link>

              {/* Assessments Link */}
              <Link
                to="/assessments"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:text-gray-700"
              >
                <GraduationCap className="h-5 w-5 mr-2" />
                Assessments
              </Link>

              <Link
                to="/recruitment"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:text-gray-700"
              >
                <Users className="h-5 w-5 mr-2" />
                Recruitment
              </Link>

              {/* Organization Menu */}
              <div className="relative" ref={orgMenuRef}>
                <button
                  onClick={() => setShowOrgMenu(!showOrgMenu)}
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:text-gray-700 focus:outline-none"
                >
                  <Building2 className="h-5 w-5 mr-2" />
                  Organization
                  <ChevronDown className={`h-4 w-4 ml-1 transform transition-transform duration-200 ${showOrgMenu ? 'rotate-180' : ''}`} />
                </button>

                {showOrgMenu && (
                  <div className="absolute left-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <Link
                        to="/organization"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={() => setShowOrgMenu(false)}
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Members
                      </Link>
                      <Link
                        to="/organization/permissions"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={() => setShowOrgMenu(false)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Permissions
                      </Link>
                      <Link
                        to="/enterprise-ai"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={() => setShowOrgMenu(false)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        AI Settings
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                to="/credits"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:text-gray-700"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Billing & Balance
              </Link>

              <Link
                to="/help"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:text-gray-700"
              >
                <HelpCircle className="h-5 w-5 mr-2" />
                Help
              </Link>

              <Link
                to="/profile"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:text-gray-700"
              >
                <User className="h-5 w-5 mr-2" />
                Profile
              </Link>

              {/* Settings Dropdown */}
              <div className="relative" ref={settingsMenuRef}>
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:text-gray-700 focus:outline-none"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Settings
                  <ChevronDown className={`h-4 w-4 ml-1 transform transition-transform duration-200 ${showSettingsMenu ? 'rotate-180' : ''}`} />
                </button>

                {showSettingsMenu && (
                  <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <Link
                        to="/admin"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={() => setShowSettingsMenu(false)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Admin Settings
                      </Link>
                      <Link
                        to="/assessment-management"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={() => setShowSettingsMenu(false)}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Assessment Management
                      </Link>
                      <Link
                        to="/ai-providers"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={() => setShowSettingsMenu(false)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        AI Providers
                      </Link>
                      <Link
                        to="/audit-log"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={() => setShowSettingsMenu(false)}
                      >
                        <History className="h-4 w-4 mr-2" />
                        Audit Log
                      </Link>
                      <Link
                        to="/analytics"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={() => setShowSettingsMenu(false)}
                      >
                        <BarChart className="h-4 w-4 mr-2" />
                        Analytics
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:text-gray-700"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
