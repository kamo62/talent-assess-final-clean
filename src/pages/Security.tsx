import React from 'react';
import { Shield, Server, Lock, Users, Search, Bell, Clock, CloudLightning, FileWarning, CheckCircle } from 'lucide-react';

export function Security() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <article className="prose prose-indigo max-w-none">
        <h1>Security</h1>
        <p className="text-gray-500">Last Updated: April 17, 2025</p>

        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-6 w-6 text-indigo-600" />
            <h2 className="m-0">1. Security Overview</h2>
          </div>
          <p>
            We take your data's security seriously. Our platform follows industry best practices and adheres to 
            South African POPIA requirements around safeguarding personal information.
          </p>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-6 w-6 text-indigo-600" />
            <h2 className="m-0">2. Infrastructure & Network Security</h2>
          </div>
          <h3>Hosted on Hardened Servers</h3>
          <p>
            All servers run in industry‑standard data centers (RSA & EU) with physical security controls, 
            24/7 monitoring, and biometric access.
          </p>

          <h3>Network Segmentation</h3>
          <p>
            Public‑facing components (web servers) are isolated from our databases and internal services 
            via firewalls and virtual private networks (VPCs).
          </p>

          <h3>DDoS Protection & WAF</h3>
          <p>
            Web Application Firewall (WAF) and distributed denial‑of‑service (DDoS) mitigation guard 
            against common web threats.
          </p>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-6 w-6 text-indigo-600" />
            <h2 className="m-0">3. Encryption</h2>
          </div>
          <h3>Data in Transit</h3>
          <p>All client–server traffic is encrypted with HTTPS/TLS 1.2+</p>

          <h3>Data at Rest</h3>
          <p>
            Sensitive fields (ID numbers, test results) are encrypted in our databases using AES‑256. 
            Backups are also encrypted.
          </p>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-6 w-6 text-indigo-600" />
            <h2 className="m-0">4. Access Control & Authentication</h2>
          </div>
          <h3>Role‑Based Access Control (RBAC)</h3>
          <p>
            Fine‑grained roles (Admin, Recruiter, Interviewer, Candidate) ensure users see only what they need.
          </p>

          <h3>Strong Credentials</h3>
          <p>Enforced password strength rules & optional MFA for recruiters and admins.</p>

          <h3>SSO/SAML/OIDC Support</h3>
          <p>Integrate with Azure AD, Okta, or Google Workspace for enterprise clients.</p>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-6 w-6 text-indigo-600" />
            <h2 className="m-0">5. Vulnerability Management</h2>
          </div>
          <h3>Automated Patch Management</h3>
          <p>Operating systems and third‑party libraries are scanned and patched weekly.</p>

          <h3>Dependency Scanning</h3>
          <p>We run OWASP dependency‑check on every build to catch known CVEs.</p>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <FileWarning className="h-6 w-6 text-indigo-600" />
            <h2 className="m-0">6. Penetration Testing & Audits</h2>
          </div>
          <h3>Annual 3rd‑Party Pen‑Tests</h3>
          <p>Engaging accredited security firms to perform external and internal penetration tests.</p>

          <h3>Code & Infrastructure Reviews</h3>
          <p>Regular internal security code reviews and IaC audits against CIS benchmarks.</p>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-6 w-6 text-indigo-600" />
            <h2 className="m-0">7. Incident Response & Breach Notification</h2>
          </div>
          <h3>24/7 Monitoring & Alerts</h3>
          <p>Security Information and Event Management (SIEM) detects anomalies in real time.</p>

          <h3>Formal IR Plan</h3>
          <p>Pre‑defined playbooks to contain, investigate, and remediate incidents within 24 hours.</p>

          <h3>Notification Commitment</h3>
          <p>
            In the unlikely event of a data breach, affected users and the Information Regulator will be 
            notified within the timeframes mandated by POPIA.
          </p>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <CloudLightning className="h-6 w-6 text-indigo-600" />
            <h2 className="m-0">8. Business Continuity & Disaster Recovery</h2>
          </div>
          <h3>Daily Backups</h3>
          <p>Encrypted backups are stored in geographically separate locations (RSA & EU).</p>

          <h3>RTO/RPO Targets</h3>
          <p>Recovery Time Objective (RTO) of 4 hours, Recovery Point Objective (RPO) of 1 hour.</p>

          <h3>Quarterly DR Drills</h3>
          <p>We simulate failover scenarios to validate backups and restore procedures.</p>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <FileWarning className="h-6 w-6 text-indigo-600" />
            <h2 className="m-0">9. Responsible Disclosure</h2>
          </div>
          <p>
            We welcome security researchers to responsibly disclose any vulnerabilities. Please email 
            security@example.com (example only; configure before deployment) and allow us 90 days to investigate and remediate before any
            public disclosure.
          </p>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-indigo-600" />
            <h2 className="m-0">10. Compliance & Certifications</h2>
          </div>
          <h3>POPIA‑Aligned Controls</h3>
          <p>Adopting technical and organizational measures mandated by the Protection of Personal Information Act.</p>

          <h3>GDPR Principles</h3>
          <p>We voluntarily follow GDPR security principles for our EU‑stored data.</p>

          <h3>ISO 27001 Roadmap</h3>
          <p>We are working towards formal ISO 27001 certification by Q4 2025.</p>
        </section>
      </article>
    </div>
  );
}
