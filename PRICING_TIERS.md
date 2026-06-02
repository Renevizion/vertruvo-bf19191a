# Kiruvo Pricing Tiers & Feature Recommendations

Based on the current application build, here are the recommended features for each pricing tier:

---

## 🌟 Starter - $60/month
**Target**: Solopreneurs, freelancers, and very small teams (1-3 users)

### Recommended Features:
- **Leads**: Up to 500 active leads
- **Contacts**: Up to 1,000 contacts
- **Users**: 1 workspace owner + 1 additional user
- **Pipelines**: 1 custom pipeline with unlimited stages
- **AI Features**:
  - Basic AI insights (limited to 50 queries/month)
  - Basic chatbot functionality
  - Email/SMS sentiment analysis
- **Communication**:
  - Email campaigns (up to 1,000 emails/month)
  - SMS campaigns (up to 200 SMS/month)
  - Basic call tracking
- **Automations**: 3 active workflows
- **Forms**: Up to 5 custom forms
- **Analytics**: Basic reporting and dashboards
- **Support**: Standard email support (48-hour response time)
- **Storage**: 5GB file storage
- **Custom Fields**: Up to 10 custom fields per object type
- **API Access**: No API access

### Database Limits to Implement:
```sql
leads_limit: 500
contacts_limit: 1000
users_limit: 2
pipelines_limit: 1
workflows_limit: 3
forms_limit: 5
ai_queries_limit: 50
email_limit: 1000
sms_limit: 200
storage_limit_gb: 5
custom_fields_per_type: 10
api_access: false
```

---

## 🚀 Professional - $140/month (Most Popular)
**Target**: Growing businesses, small to medium teams (4-10 users)

### Recommended Features:
- **Leads**: Up to 2,500 active leads
- **Contacts**: Up to 10,000 contacts
- **Users**: 1 workspace owner + up to 10 additional users
- **Pipelines**: Unlimited pipelines with unlimited stages
- **AI Features**:
  - Advanced AI insights (500 queries/month)
  - Advanced chatbot with knowledge base integration
  - Predictive lead scoring
  - Email/SMS sentiment analysis
  - AI-powered workflow suggestions
- **Communication**:
  - Email campaigns (up to 10,000 emails/month)
  - SMS campaigns (up to 2,000 SMS/month)
  - Advanced call tracking with recording
  - Call analytics
- **Automations**: 20 active workflows
- **Forms**: Unlimited custom forms
- **Analytics**: Advanced reporting, custom dashboards, export capabilities
- **Support**: Priority email support (24-hour response time) + live chat
- **Storage**: 50GB file storage
- **Custom Fields**: Up to 50 custom fields per object type
- **API Access**: Standard API access (1,000 requests/day)
- **Integrations**: Google Sheets, webhooks, custom integrations
- **Team Features**:
  - Role-based permissions
  - Activity audit logs
  - Team collaboration features
  - Staff management

### Database Limits to Implement:
```sql
leads_limit: 2500
contacts_limit: 10000
users_limit: 11
pipelines_limit: -1  // unlimited
workflows_limit: 20
forms_limit: -1  // unlimited
ai_queries_limit: 500
email_limit: 10000
sms_limit: 2000
storage_limit_gb: 50
custom_fields_per_type: 50
api_access: true
api_requests_per_day: 1000
```

---

## 💼 Enterprise - $320/month
**Target**: Large teams, enterprises, agencies (11+ users)

### Recommended Features:
- **Leads**: Unlimited leads
- **Contacts**: Unlimited contacts
- **Users**: 1 workspace owner + unlimited additional users
- **Pipelines**: Unlimited pipelines with unlimited stages
- **AI Features**:
  - Premium AI insights (unlimited queries)
  - Advanced AI agents for voice calls
  - Custom AI model fine-tuning
  - Multi-language AI support
  - Predictive analytics and forecasting
  - AI-powered workflow automation
  - Advanced sentiment analysis with recommendations
- **Communication**:
  - Email campaigns (unlimited)
  - SMS campaigns (unlimited)
  - Advanced call tracking with recording and transcription
  - Call analytics and coaching insights
  - Multi-channel campaign orchestration
- **Automations**: Unlimited active workflows
- **Forms**: Unlimited custom forms with advanced logic
- **Analytics**: 
  - Enterprise reporting suite
  - Custom dashboards with white-label options
  - Data export in all formats
  - Real-time analytics
  - Custom report builder
- **Support**: 
  - 24/7 priority support
  - Dedicated account manager
  - Phone support
  - SLA guarantee (99.9% uptime)
  - Onboarding assistance
- **Storage**: 500GB file storage (expandable)
- **Custom Fields**: Unlimited custom fields per object type
- **API Access**: Premium API access (unlimited requests)
- **Integrations**: 
  - All standard integrations
  - Custom integrations built on request
  - Dedicated webhook endpoints
  - SSO/SAML authentication
- **Enterprise Features**:
  - Advanced role-based permissions with custom roles
  - Comprehensive audit logs with data retention
  - Data backup and recovery
  - Custom domain for forms and pages
  - White-label options
  - Advanced security features
  - Multi-workspace management
  - Custom contract terms
  - Priority feature requests

### Database Limits to Implement:
```sql
leads_limit: -1  // unlimited
contacts_limit: -1  // unlimited
users_limit: -1  // unlimited
pipelines_limit: -1  // unlimited
workflows_limit: -1  // unlimited
forms_limit: -1  // unlimited
ai_queries_limit: -1  // unlimited
email_limit: -1  // unlimited
sms_limit: -1  // unlimited
storage_limit_gb: 500
custom_fields_per_type: -1  // unlimited
api_access: true
api_requests_per_day: -1  // unlimited
sla_guarantee: true
dedicated_account_manager: true
```

---

## Implementation Priority

### Phase 1: Immediate (Required for Launch)
1. ✅ Create pricing page
2. ⏳ Implement Stripe checkout flow
3. ⏳ Create subscription verification system
4. ⏳ Build basic usage tracking for leads/contacts
5. ⏳ Implement plan-based access control

### Phase 2: Short-term (Within 2 weeks)
1. Implement usage limits enforcement:
   - Lead creation limits
   - Contact creation limits
   - User invitation limits
   - Workflow creation limits
2. Add usage monitoring dashboard for users
3. Implement upgrade/downgrade flows
4. Add trial period (14 days free)

### Phase 3: Medium-term (Within 1 month)
1. Implement AI query tracking and limits
2. Add email/SMS campaign limits
3. Implement storage limits
4. Add API rate limiting
5. Create admin dashboard for monitoring subscriptions

### Phase 4: Long-term (Ongoing)
1. Add usage alerts and notifications
2. Implement overage charges or blocking
3. Create custom pricing for enterprise deals
4. Add referral program
5. Implement annual billing discount (save 20%)

---

## Recommended Stripe Configuration

Create three products in Stripe with these details:

### Product 1: Starter
- **Price ID**: `price_starter_monthly` (you'll create this)
- **Amount**: $60/month
- **Billing**: Monthly recurring
- **Trial**: 14 days

### Product 2: Professional
- **Price ID**: `price_professional_monthly`
- **Amount**: $140/month
- **Billing**: Monthly recurring
- **Trial**: 14 days

### Product 3: Enterprise
- **Price ID**: `price_enterprise_monthly`
- **Amount**: $320/month
- **Billing**: Monthly recurring
- **Trial**: 14 days
- **Note**: Can be customized per customer

---

## Next Steps

1. **Create Stripe Products**: Set up the three pricing tiers in your Stripe dashboard
2. **Implement Checkout**: Build the subscription checkout flow
3. **Add Verification**: Create edge function to verify active subscriptions
4. **Implement Limits**: Add database checks for plan limits
5. **Build Enforcement**: Prevent actions when limits are exceeded
6. **Add Monitoring**: Track usage and notify users approaching limits
7. **Test Everything**: Test trial, subscription, upgrade, downgrade, cancellation flows

---

*Note: The `-1` value in database limits means "unlimited" for that tier.*
