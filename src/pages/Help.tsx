import React, { useState } from 'react';
import { Book, Lightbulb, HelpCircle, Video, FileText, ChevronDown, Code, PlayCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Section {
  id: string;
  title: string;
  content: string;
}

export function Help() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const sections: Record<string, Section[]> = {
    'getting-started': [
      {
        id: 'platform-overview',
        title: 'Platform Overview',
        content: `
Our platform streamlines technical assessments with three main components:

### Code Assessments
- Multiple programming languages supported
- Automated test cases
- Real-time collaboration features
- Integrated code editor
- Version control support

### MCQ Assessments
- Categorized question bank
- Timed assessments
- Automatic grading
- Performance analytics
- Custom scoring rules

### Case Studies
- System design challenges
- Problem-solving scenarios
- Customizable templates
- Rubric-based evaluation
- Collaborative review process`
      },
      {
        id: 'first-assessment',
        title: 'Creating Your First Assessment',
        content: `
### 1. Choose Assessment Type
- Navigate to the Assessment section
- Select from Code, MCQ, or Case Study
- Click "Create New Assessment"

### 2. Configure Settings
- Set difficulty level
- Define time limits
- Add instructions
- Configure scoring rules
- Set access permissions

### 3. Add Content
- Write clear questions
- Include test cases
- Define evaluation criteria
- Add supporting resources
- Preview and test

### 4. Assign to Candidates
- Select candidates or groups
- Set due dates
- Configure notifications
- Send invitations
- Track progress`
      },
      {
        id: 'inviting-candidates',
        title: 'Inviting Candidates',
        content: `
### Preparation
- Ensure assessment is ready
- Verify candidate emails
- Check permissions
- Review time zones
- Test assessment flow

### Sending Invites
- Use bulk invite feature
- Set appropriate deadlines
- Include custom messages
- Configure reminders
- Track delivery status

### Managing Invites
- Monitor acceptance
- Handle bounced emails
- Resend if needed
- Update deadlines
- Track progress

### Best Practices
- Send during business hours
- Allow sufficient time
- Include clear instructions
- Provide support contact
- Follow up as needed`
      }
    ],
    'video-tutorials': [
      {
        id: 'getting-started-video',
        title: 'Getting Started Guide',
        content: `
### Platform Overview (5:30)
[Watch Video](https://www.youtube.com/watch?v=example1)
- Complete platform walkthrough
- Key features overview
- Basic navigation
- Account setup

### Creating Assessments (8:45)
[Watch Video](https://www.youtube.com/watch?v=example2)
- Different assessment types
- Configuration options
- Best practices
- Example walkthrough

### Managing Candidates (6:15)
[Watch Video](https://www.youtube.com/watch?v=example3)
- Candidate management
- Sending invitations
- Tracking progress
- Reviewing submissions`
      },
      {
        id: 'advanced-features',
        title: 'Advanced Features',
        content: `
### Custom Templates (7:20)
[Watch Video](https://www.youtube.com/watch?v=example4)
- Template creation
- Customization options
- Reusing templates
- Best practices

### Analytics & Reporting (9:10)
[Watch Video](https://www.youtube.com/watch?v=example5)
- Understanding metrics
- Custom reports
- Data visualization
- Performance tracking

### Team Collaboration (5:55)
[Watch Video](https://www.youtube.com/watch?v=example6)
- Role management
- Permissions setup
- Collaborative review
- Communication tools`
      }
    ],
    'api-documentation': [
      {
        id: 'api-overview',
        title: 'API Overview',
        content: `
### Authentication
\`\`\`typescript
POST /auth/token
{
  "email": string,
  "password": string
}
\`\`\`

### Assessment Endpoints
\`\`\`typescript
// Create assessment
POST /api/assessments
{
  "title": string,
  "type": "code" | "mcq" | "case_study",
  "difficulty": "easy" | "medium" | "hard"
}

// Get assessments
GET /api/assessments
GET /api/assessments/:id

// Update assessment
PUT /api/assessments/:id

// Delete assessment
DELETE /api/assessments/:id
\`\`\`

### Response Format
\`\`\`typescript
{
  "data": {
    "id": string,
    "created_at": string,
    // ... other fields
  },
  "error": null
}
\`\`\`

### Error Handling
\`\`\`typescript
{
  "data": null,
  "error": {
    "code": string,
    "message": string
  }
}
\`\`\``
      },
      {
        id: 'api-authentication',
        title: 'Authentication & Security',
        content: `
### Authentication Methods
- API Key Authentication
- OAuth 2.0
- JWT Tokens

### Security Best Practices
- Use HTTPS only
- Implement rate limiting
- Validate all inputs
- Handle errors properly

### Example Implementation
\`\`\`typescript
const client = new AssessmentClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.example.com'
});

// Make authenticated request
const assessment = await client.createAssessment({
  title: 'JavaScript Basics',
  type: 'code',
  difficulty: 'medium'
});
\`\`\``
      }
    ],
    'interactive-guides': [
      {
        id: 'assessment-creation',
        title: 'Creating Your First Assessment',
        content: `
### Step 1: Navigate to Assessments
![Step 1](https://images.unsplash.com/photo-1531403009284-440f080d1e12?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80)
- Click "Assessments" in the main menu
- Select "Create New Assessment"
- Choose assessment type

### Step 2: Basic Configuration
![Step 2](https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80)
- Enter title and description
- Set difficulty level
- Configure time limit
- Add instructions

### Step 3: Content Creation
![Step 3](https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80)
- Add questions/problems
- Set up test cases
- Define scoring criteria
- Preview content

### Step 4: Publishing
![Step 4](https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80)
- Review all settings
- Set visibility
- Publish assessment
- Share with candidates`
      },
      {
        id: 'candidate-management',
        title: 'Managing Candidates',
        content: `
### Step 1: Adding Candidates
![Step 1](https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80)
- Navigate to Candidates
- Click "Add Candidate"
- Enter candidate details
- Set up profile

### Step 2: Assessment Assignment
![Step 2](https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80)
- Select assessments
- Configure deadlines
- Set requirements
- Send invitations

### Step 3: Progress Tracking
![Step 3](https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80)
- Monitor completion
- Review submissions
- Track performance
- Generate reports

### Step 4: Feedback & Results
![Step 4](https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80)
- Review results
- Provide feedback
- Share reports
- Make decisions`
      }
    ],
    'best-practices': [
      {
        id: 'assessment-design',
        title: 'Assessment Design Tips',
        content: `
### Structure
- Start with easier questions
- Gradually increase difficulty
- Include diverse problem types
- Balance question types
- Consider time allocation

### Content
- Use clear language
- Provide relevant context
- Include practical scenarios
- Add helpful comments
- Review for clarity

### Time Management
- Set realistic limits
- Consider complexity
- Allow buffer time
- Track completion rates
- Adjust as needed

### Evaluation
- Define clear criteria
- Use objective metrics
- Provide detailed feedback
- Track performance trends
- Maintain consistency`
      },
      {
        id: 'question-writing',
        title: 'Writing Effective Questions',
        content: `
### Technical Questions
- Focus on practical scenarios
- Test fundamental concepts
- Include edge cases
- Verify solutions
- Add test cases

### MCQ Best Practices
- Write clear options
- Avoid ambiguity
- Include explanations
- Balance difficulty
- Review accuracy

### Case Studies
- Use real scenarios
- Define requirements
- Include constraints
- Provide resources
- Set clear goals

### Language and Format
- Use consistent terms
- Provide context
- Review clarity
- Format properly
- Include examples`
      },
      {
        id: 'candidate-experience',
        title: 'Optimizing Candidate Experience',
        content: `
### Communication
- Send clear instructions
- Provide requirements
- Offer support channels
- Set expectations
- Follow up promptly

### Platform Access
- Test assessment links
- Verify permissions
- Monitor status
- Check compatibility
- Provide alternatives

### Feedback Process
- Set clear timelines
- Provide detailed feedback
- Be constructive
- Maintain objectivity
- Track improvements

### Support
- Offer technical help
- Address questions
- Gather feedback
- Improve process
- Document issues`
      }
    ],
    'faq': [
      {
        id: 'technical-requirements',
        title: 'Technical Requirements',
        content: `
### Browser Requirements
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
- Opera 70+

### Internet Connection
- 1 Mbps minimum
- Stable connection
- Backup recommended
- Low latency
- Reliable provider

### Device Specifications
- Modern processor
- 4GB RAM minimum
- Updated OS
- Webcam (optional)
- Microphone (optional)

### Additional Software
- No plugins needed
- Editor included
- Video supported
- Screen sharing
- Collaboration tools`
      },
      {
        id: 'troubleshooting',
        title: 'Troubleshooting',
        content: `
### Connection Issues
- Check internet
- Clear cache
- Try incognito
- Disable VPN
- Update browser

### Assessment Access
- Verify email
- Check status
- Clear cookies
- Try different browser
- Contact support

### Technical Problems
- Update browser
- Disable extensions
- Check requirements
- Restart device
- Clear data

### Data Recovery
- Auto-save enabled
- Manual backup
- Version history
- Support contact
- Recovery tools`
      },
      {
        id: 'billing-questions',
        title: 'Billing & Subscriptions',
        content: `
### Plans Available
- Free tier features
- Professional benefits
- Enterprise options
- Custom solutions
- Volume pricing

### Payment Process
- Secure payment
- Multiple methods
- Monthly billing
- Annual discount
- Invoice options

### Subscription Changes
- Easy upgrades
- Flexible downgrades
- Pro-rated billing
- Cancel anytime
- Data retention

### Support
- 24/7 assistance
- Quick response
- Issue tracking
- Refund policy
- Account management`
      }
    ]
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Help & Documentation
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
          Everything you need to know about using the platform effectively
        </p>
      </div>

      <div className="mt-12 space-y-8">
        {/* Getting Started Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <Book className="h-6 w-6 text-indigo-600" />
              <h2 className="ml-3 text-xl font-medium text-gray-900">Getting Started</h2>
            </div>
            <div className="mt-6 space-y-4">
              {sections['getting-started'].map((section) => (
                <div key={section.id} className="border rounded-lg">
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{section.title}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 transform transition-transform ${
                        expandedSection === section.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedSection === section.id && (
                    <div className="px-4 py-3 border-t">
                      <div className="prose prose-indigo max-w-none">
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Video Tutorials Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <PlayCircle className="h-6 w-6 text-indigo-600" />
              <h2 className="ml-3 text-xl font-medium text-gray-900">Video Tutorials</h2>
            </div>
            <div className="mt-6 space-y-4">
              {sections['video-tutorials'].map((section) => (
                <div key={section.id} className="border rounded-lg">
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{section.title}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 transform transition-transform ${
                        expandedSection === section.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedSection === section.id && (
                    <div className="px-4 py-3 border-t">
                      <div className="prose prose-indigo max-w-none">
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* API Documentation Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <Code className="h-6 w-6 text-indigo-600" />
              <h2 className="ml-3 text-xl font-medium text-gray-900">API Documentation</h2>
            </div>
            <div className="mt-6 space-y-4">
              {sections['api-documentation'].map((section) => (
                <div key={section.id} className="border rounded-lg">
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{section.title}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 transform transition-transform ${
                        expandedSection === section.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedSection === section.id && (
                    <div className="px-4 py-3 border-t">
                      <div className="prose prose-indigo max-w-none">
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Guides Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <Video className="h-6 w-6 text-indigo-600" />
              <h2 className="ml-3 text-xl font-medium text-gray-900">Interactive Guides</h2>
            </div>
            <div className="mt-6 space-y-4">
              {sections['interactive-guides'].map((section) => (
                <div key={section.id} className="border rounded-lg">
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{section.title}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 transform transition-transform ${
                        expandedSection === section.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedSection === section.id && (
                    <div className="px-4 py-3 border-t">
                      <div className="prose prose-indigo max-w-none">
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Best Practices Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <Lightbulb className="h-6 w-6 text-indigo-600" />
              <h2 className="ml-3 text-xl font-medium text-gray-900">Best Practices</h2>
            </div>
            <div className="mt-6 space-y-4">
              {sections['best-practices'].map((section) => (
                <div key={section.id} className="border rounded-lg">
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{section.title}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 transform transition-transform ${
                        expandedSection === section.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedSection === section.id && (
                    <div className="px-4 py-3 border-t">
                      <div className="prose prose-indigo max-w-none">
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <HelpCircle className="h-6 w-6 text-indigo-600" />
              <h2 className="ml-3 text-xl font-medium text-gray-900">Frequently Asked Questions</h2>
            </div>
            <div className="mt-6 space-y-4">
              {sections['faq'].map((section) => (
                <div key={section.id} className="border rounded-lg">
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{section.title}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 transform transition-transform ${
                        expandedSection === section.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedSection === section.id && (
                    <div className="px-4 py-3 border-t">
                      <div className="prose prose-indigo max-w-none">
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-indigo-50 rounded-lg px-6 py-8 sm:p-10">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-indigo-900">Need more help?</h2>
            <p className="mt-3 text-indigo-700">
              Our support team is available 24/7 to assist you with any questions or issues.
            </p>
            <div className="mt-6">
              <a
                href="mailto:support@example.com"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
