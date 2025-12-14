# Security Hardening Checklist

This checklist ensures all security measures are properly implemented for Vision Smart AI.

## Pre-Deployment Security Checklist

### Environment Configuration

- [ ] `JWT_SECRET` set to strong random value (min 64 characters)
- [ ] `DATABASE_URL` uses encrypted connection
- [ ] `NODE_ENV` set to `production`
- [ ] All API keys stored in environment variables (not in code)
- [ ] `.env` file added to `.gitignore`
- [ ] No secrets committed to version control
- [ ] Gemini API key properly secured
- [ ] Frontend URL configured for CORS

### Database Security

- [ ] Database migration completed successfully
- [ ] PostgreSQL using SSL/TLS connections
- [ ] Database user has minimal required permissions
- [ ] Regular backups configured and tested
- [ ] Audit logs table created
- [ ] Password history table created
- [ ] Failed login attempts tracking enabled
- [ ] Session management table created

### Authentication & Authorization

- [ ] Password policy enforced (12+ chars, complexity)
- [ ] JWT tokens use short expiration (1 hour)
- [ ] Refresh tokens implemented
- [ ] Token blacklisting working
- [ ] Session timeout configured
- [ ] Failed login attempts monitored
- [ ] Account lockout after repeated failures
- [ ] Password reset flow secured

### API Security

- [ ] Rate limiting enabled on all endpoints
- [ ] Authentication rate limiter active (5 per 15 min)
- [ ] Registration rate limiter active (3 per hour)
- [ ] AI operations rate limiter active (20 per hour)
- [ ] CSRF protection enabled
- [ ] Input validation with Zod schemas
- [ ] Input sanitization implemented
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (sanitization + CSP)

### Security Headers

- [ ] Helmet middleware configured
- [ ] Content Security Policy (CSP) enabled
- [ ] Strict-Transport-Security (HSTS) enabled
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options set to nosniff
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy configured
- [ ] X-XSS-Protection enabled

### Logging & Monitoring

- [ ] Audit logging implemented
- [ ] Security events logged
- [ ] Failed authentication attempts logged
- [ ] Log retention policy configured (90 days)
- [ ] Logs do not contain sensitive data
- [ ] Error messages sanitized (no stack traces in production)
- [ ] Monitoring alerts configured

### Infrastructure Security

- [ ] HTTPS/TLS enabled (minimum TLS 1.2)
- [ ] SSL certificate valid and not self-signed
- [ ] Firewall configured
- [ ] Only necessary ports exposed
- [ ] Database not directly accessible from internet
- [ ] Private network for internal services
- [ ] Principle of least privilege applied

### Container Security

- [ ] Docker images scanned with Trivy
- [ ] No critical vulnerabilities in images
- [ ] Multi-stage builds used
- [ ] Minimal base images
- [ ] Non-root user in containers
- [ ] Secrets not in Dockerfile
- [ ] Images regularly updated

### Dependency Security

- [ ] All dependencies updated to latest secure versions
- [ ] npm audit shows no critical vulnerabilities
- [ ] Dependabot enabled
- [ ] Snyk scanning configured
- [ ] License compliance checked
- [ ] No deprecated packages in use

### CI/CD Security

- [ ] Security scanning in CI pipeline
- [ ] Secret scanning enabled (TruffleHog/GitGuardian)
- [ ] CodeQL analysis configured
- [ ] Automated security tests
- [ ] Build artifacts scanned
- [ ] Deployment requires approval

### Code Security

- [ ] No hardcoded secrets
- [ ] No commented-out sensitive code
- [ ] Error handling doesn't expose internals
- [ ] User input validated everywhere
- [ ] Database queries parameterized
- [ ] File uploads validated and scanned
- [ ] Path traversal prevented

### Data Protection

- [ ] Sensitive data encrypted at rest
- [ ] All traffic encrypted in transit
- [ ] Passwords hashed with bcrypt (rounds >= 10)
- [ ] PII properly handled
- [ ] Data retention policy defined
- [ ] Secure data deletion process
- [ ] Backup encryption enabled

### Compliance

- [ ] GDPR requirements reviewed (if applicable)
- [ ] Data processing documented
- [ ] Privacy policy created
- [ ] Terms of service created
- [ ] Cookie policy (if using cookies)
- [ ] User consent mechanisms
- [ ] Data export capability
- [ ] Right to deletion implemented

### Incident Response

- [ ] Incident response plan documented
- [ ] Contact list maintained
- [ ] Backup and recovery tested
- [ ] Incident response team identified
- [ ] Communication plan prepared
- [ ] Post-mortem process defined

## Post-Deployment Verification

### Immediate Checks (Day 1)

- [ ] Application accessible via HTTPS only
- [ ] HTTP redirects to HTTPS
- [ ] Rate limiting working (test with curl)
- [ ] Authentication working
- [ ] CSRF protection working
- [ ] Security headers present (check with curl)
- [ ] Error messages sanitized
- [ ] Logging working

### Week 1 Checks

- [ ] No security alerts in logs
- [ ] Rate limiting effective
- [ ] No failed deployments
- [ ] Monitoring alerts working
- [ ] Backup successful
- [ ] Audit logs accumulating
- [ ] No performance issues from security measures

### Monthly Checks

- [ ] Review audit logs for anomalies
- [ ] Check for failed login patterns
- [ ] Review rate limit violations
- [ ] Dependency updates applied
- [ ] Security scan results reviewed
- [ ] Backup restoration tested
- [ ] Incident response plan reviewed

### Quarterly Checks

- [ ] Full security audit
- [ ] Penetration testing (recommended)
- [ ] Review and update security policies
- [ ] Team security training
- [ ] Incident response drill
- [ ] Compliance review

## Security Testing Commands

### Test Rate Limiting

```bash
# Test auth rate limiting (should block after 5 attempts)
for i in {1..10}; do
  curl -X POST https://your-api.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\n%{http_code}\n"
done
```

### Test Security Headers

```bash
# Check security headers
curl -I https://your-api.com | grep -E "(Strict-Transport|X-Frame|X-Content|Content-Security)"
```

### Test HTTPS Redirect

```bash
# Should redirect to HTTPS
curl -I http://your-api.com
```

### Test JWT Expiration

```bash
# Generate token, wait 1+ hour, should be expired
```

### Test CSRF Protection

```bash
# Should fail without CSRF token
curl -X POST https://your-api.com/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"email":"test@test.com",...}'
```

## Security Vulnerability Response

### Critical (Immediate Action Required)

- [ ] Incident response team notified
- [ ] Affected systems identified
- [ ] Immediate containment actions taken
- [ ] Stakeholders notified
- [ ] Patch developed and tested
- [ ] Emergency deployment planned
- [ ] Post-incident review scheduled

### High (24 Hour Response)

- [ ] Vulnerability assessed
- [ ] Impact analyzed
- [ ] Patch or workaround identified
- [ ] Testing plan created
- [ ] Deployment scheduled
- [ ] Monitoring increased

### Medium/Low (1 Week Response)

- [ ] Vulnerability documented
- [ ] Fix scheduled in sprint
- [ ] Testing included in plan
- [ ] Deploy with next release

## Common Security Pitfalls to Avoid

- [ ] Don't use development secrets in production
- [ ] Don't disable security features "temporarily"
- [ ] Don't expose stack traces to users
- [ ] Don't store passwords in plain text (anywhere!)
- [ ] Don't trust client-side validation alone
- [ ] Don't use outdated dependencies
- [ ] Don't skip security scans
- [ ] Don't ignore Dependabot PRs
- [ ] Don't commit secrets to Git
- [ ] Don't use weak JWT secrets

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Security.md](../SECURITY.md)
- [Incident Response Plan](./INCIDENT_RESPONSE_PLAN.md)

---

**Last Updated:** 2025-12-13
**Review Frequency:** Quarterly
**Owner:** Security Team
