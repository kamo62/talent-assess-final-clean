import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Code, FileText, ListChecks, X } from 'lucide-react';

interface AssessmentTypeSelectorProps {
  onClose: () => void;
}

export function AssessmentTypeSelector({ onClose }: AssessmentTypeSelectorProps) {
  const navigate = useNavigate();

  const assessmentTypes = [
    {
      type: 'code',
      title: 'Code Assessment',
      description: 'Create programming challenges with test cases and code execution',
      icon: Code,
      color: 'bg-blue-500',
      route: '/code-assessment'
    },
    {
      type: 'case_study',
      title: 'Case Study',
      description: 'Design system architecture and problem-solving scenarios',
      icon: FileText,
      color: 'bg-green-500',
      route: '/case-studies'
    },
    {
      type: 'mcq',
      title: 'Multiple Choice',
      description: 'Create question banks with automated scoring',
      icon: ListChecks,
      color: 'bg-purple-500',
      route: '/mcq-management'
    }
  ];

  const handleSelectType = (route: string) => {
    navigate(route);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Choose Assessment Type
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {assessmentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.type}
                  onClick={() => handleSelectType(type.route)}
                  className="group relative rounded-lg p-6 bg-white border-2 border-gray-200 hover:border-indigo-500 transition-all duration-200 text-left"
                >
                  <div>
                    <span className={`${type.color} rounded-lg inline-flex p-3 text-white`}>
                      <Icon className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600">
                      {type.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {type.description}
                    </p>
                  </div>
                  <span className="absolute top-4 right-4 text-gray-400 group-hover:text-indigo-500">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
