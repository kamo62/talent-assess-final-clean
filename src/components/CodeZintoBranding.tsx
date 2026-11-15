import React from 'react';
import { Code2 } from 'lucide-react';

export const CodeZintoBrand = () => {
  return (
    <div className="flex items-center">
      <Code2 className="h-8 w-8 text-indigo-600" />
      <span className="ml-2 text-xl font-bold text-gray-900">CodeZinto</span>
    </div>
  );
};

export const CodeZintoTagline = () => {
  return (
    <p className="text-sm text-gray-600">
      Precision coding and technical evaluations with local flair
    </p>
  );
};

export const BRAND_CONFIG = {
  name: 'CodeZinto',
  domain: 'codezinto.co.za',
  tagline: 'Precision coding and technical evaluations with local flair',
  fullName: 'CodeZinto Assessments',
  description: 'CodeZinto Assessments - Precision coding and technical evaluations with local flair. Streamline your technical hiring process with AI-powered assessments tailored for South African companies.',
  keywords: ['CodeZinto', 'technical assessments', 'coding tests', 'South Africa', 'hiring platform', 'AI assessments', 'programming tests', 'Judge0'],
  social: {
    twitter: '@codezinto',
    linkedin: 'codezinto',
    email: 'support@example.com',
    address: 'Cape Town, South Africa'
  }
};
