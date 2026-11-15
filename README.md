# Skill Assessment Platform

A comprehensive technical assessment platform designed for South African companies to streamline their technical hiring process.

## Features

- **Custom Coding Challenges**: Create role-specific coding assessments
- **System Design Assessments**: Evaluate architectural thinking
- **Job Profile Matching**: Template-based assessments
- **Real-time Collaboration**: Interactive assessment environment
- **Analytics Dashboard**: Track candidate performance
- **Organization Management**: Multi-team support

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Set up environment variables:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
4. Start the development server:
```bash
npm run dev
```

## Project Structure

```
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   ├── lib/            # Utilities and helpers
│   └── types/          # TypeScript type definitions
├── supabase/
│   └── migrations/     # Database migrations
└── public/            # Static assets
```

## Database Schema

### Core Tables

- `case_studies`: System design and programming case studies
- `code_assessments`: Coding challenges and problems
- `code_submissions`: User submissions for assessments
- `assessment_progress`: Tracks user progress
- `assessment_analytics`: Performance metrics

### Organization Management

- `organizations`: Company/team information
- `organization_members`: User-organization relationships
- `groups`: Team groupings within organizations

### Access Control

- `roles`: User role definitions
- `user_roles`: User-role assignments
- `audit_logs`: System audit trail

## API Documentation

### Authentication

```typescript
// Sign up
await supabase.auth.signUp({
  email: string,
  password: string
});

// Sign in
await supabase.auth.signInWithPassword({
  email: string,
  password: string
});
```

### Assessment Management

```typescript
// Create assessment
await supabase
  .from('code_assessments')
  .insert({
    title: string,
    description: string,
    difficulty: 'easy' | 'medium' | 'hard'
  });

// Get assessments
await supabase
  .from('code_assessments')
  .select('*')
  .order('created_at', { ascending: false });
```

### Submission Handling

```typescript
// Submit code
await supabase
  .from('code_submissions')
  .insert({
    code: string,
    language: string,
    user_id: string
  });
```

## Security Features

- Row Level Security (RLS) policies
- Role-based access control
- Audit logging
- Organization-level data isolation

## Development Guidelines

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for formatting

### Component Structure

```typescript
interface Props {
  // Define prop types
}

function Component({ prop1, prop2 }: Props) {
  // Implementation
}
```

### Database Migrations

- One migration per logical change
- Include rollback procedures
- Test migrations in development

## Deployment

The application is configured for deployment on Netlify with:

- Automatic builds on push
- Environment variable management
- Preview deployments for PRs

## Contributing

Payment flows use the authenticated user's email and your configured public
`VITE_PAYSTACK_PUBLIC_KEY`; no shared account or payment key is supplied.

### Private configuration and source archives

- Copy `.env.example` to the ignored `.env` and supply your own configuration.
  Every `VITE_` value is public in the browser. Use Supabase's public anon key,
  never its service-role key, in the frontend.
- AI-provider, mail and service-role secrets belong in the Supabase Edge Functions'
  server environment, without a `VITE_` prefix. Calendar notifications also require
  your verified `SENDGRID_FROM_EMAIL` sender.
- The existing AI-key settings screens still use Base64 encoding or plaintext
  database fields, not secure encryption. Do not store real provider secrets
  through those screens until server-side secret storage and access controls have
  been implemented and verified. That redesign is outside this source cleanup.
- The legacy Judge0 integration still calls its provider from the browser. Do not
  supply a private/production API key until an authenticated server-side proxy is
  implemented. This source cleanup does not implement that proxy.
- Contact addresses using `example.com` are reserved examples, not monitored
  mailboxes. Configure your own verified contacts before deployment.
- Migrations no longer promote a named person to administrator. Administrator
  approval is an operator step; this does not revoke grants in existing databases.
- Local environment files and Supabase CLI state must not be committed or shared.
  Any real secret previously committed must be rotated with its provider. Removing
  a file from the current tree does not remove it from Git history.
- Core archives include application source, Supabase functions/migrations,
  `.gitignore` and build inputs. They exclude credentials, local project metadata,
  dependencies, generated builds, tests and agent/task/planning files.

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.
