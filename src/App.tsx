import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import Landing from './components/Landing';
import { Layout } from './components/Layout';
import { CaseStudies } from './pages/CaseStudies';
import { CodeAssessment } from './pages/CodeAssessment';
import { MCQ } from './pages/MCQ';
import { MCQManagement } from './pages/MCQManagement';
import { Admin } from './pages/Admin';
import { AuditLog } from './pages/AuditLog';
import { Analytics } from './pages/Analytics';
import { Recruitment } from './pages/Recruitment';
import { CandidatePortal } from './pages/CandidatePortal';
import { Privacy } from './pages/Privacy';
import { Security } from './pages/Security';
import { Profile } from './pages/Profile';
import { OrganizationManagement } from './pages/OrganizationManagement';
import { Permissions } from './pages/Permissions';
import { Help } from './pages/Help';
import Assessments from './pages/Assessments';
import AIProviderSettings from './pages/AIProviderSettings';
import EnterpriseAISettings from './pages/EnterpriseAISettings';
import { AssessmentManagement } from './pages/AssessmentManagement';
import { PublicAssessment } from './pages/PublicAssessment';
import AssessmentLibrary from './pages/AssessmentLibrary';

function App() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {!session ? (
          <>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/security" element={<Security />} />
            <Route path="assessment/:accessCode" element={<PublicAssessment />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/assessments" replace />} />
            <Route path="case-studies" element={<CaseStudies />} />
            <Route path="code-assessment" element={<CodeAssessment />} />
            <Route path="mcq" element={<MCQ />} />
            <Route path="mcq-management" element={<MCQManagement />} />
            <Route path="recruitment" element={<Recruitment />} />
            <Route path="admin" element={<Admin />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="portal" element={<CandidatePortal />} />
            <Route path="profile" element={<Profile />} />
            <Route path="organization" element={<OrganizationManagement />} />
            <Route path="organization/permissions" element={<Permissions />} />
            <Route path="credits" element={<Assessments />} />
            <Route path="assessments" element={<AssessmentLibrary />} />
            <Route path="ai-providers" element={<AIProviderSettings />} />
            <Route path="enterprise-ai" element={<EnterpriseAISettings />} />
            <Route path="assessment-management" element={<AssessmentManagement />} />
            <Route path="help" element={<Help />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="security" element={<Security />} />
            <Route path="*" element={<Navigate to="/assessments" replace />} />
          </Route>
        )}

      </Routes>
    </BrowserRouter>
  );
}

export default App;
