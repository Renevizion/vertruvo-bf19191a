# Admin Platform Guide

Complete guide to using all admin features in your platform.

## Table of Contents
1. [Health Alerts](#health-alerts)
2. [Workflow Templates](#workflow-templates)
3. [Auto-Scaling Alerts](#auto-scaling-alerts)
4. [Feature Flag Dashboard](#feature-flag-dashboard)
5. [Automated Backups](#automated-backups)
6. [User Role Management](#user-role-management)

---

## Health Alerts

**Purpose**: Monitor system health and get notified when metrics breach thresholds.

### How It Works
1. The system checks configured metrics every 5 minutes via the `health-monitor` edge function
2. When a metric breaches its threshold, notifications are sent via your chosen channel
3. Supports email, Slack, and custom webhooks

### Setting Up Alerts

1. **Go to Admin > Alerts tab**

2. **Create a New Alert Rule**:
   - **Alert Name**: Descriptive name (e.g., "High Error Rate")
   - **Metric**: Choose what to monitor:
     - `error_rate`: Number of errors in last hour
     - `workflow_failures`: Failed workflow runs
     - `api_response_time`: API performance
     - `webhook_failures`: Failed webhook deliveries
     - `active_users`: Current active users
   
   - **Condition**: Set operator (>, <, >=, ==)
   - **Threshold**: The value that triggers the alert
   - **Notification Channel**: 
     - **Email**: Enter admin email
     - **Slack**: Paste Slack webhook URL
     - **Webhook**: Custom webhook endpoint
   - **Target**: Where to send notifications

3. **Toggle Active/Inactive**: Use the switch to enable/disable alerts

### Example Alert Configurations

**High Error Rate Alert**:
```
Name: High Error Rate
Metric: error_rate
Condition: >
Threshold: 10
Channel: email
Target: admin@yourcompany.com
```

**Workflow Health Check**:
```
Name: Workflow Failures
Metric: workflow_failures  
Condition: >=
Threshold: 5
Channel: slack
Target: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Testing Alerts
- The health monitor runs automatically every 5 minutes
- To test immediately, manually trigger workflows that match your alert conditions
- Check console logs for notification attempts

---

## Workflow Templates

**Purpose**: Create and share workflow templates across all workspaces.

### How It Works
1. Admin publishes existing workflows as templates
2. Templates appear in the Automations page sidebar for all users
3. Users can click templates to instantly load them into their workflow builder
4. Templates can be featured to appear at the top

### Publishing Templates

1. **Go to Admin > Templates tab**

2. **Click "Publish Template"**

3. **Fill in details**:
   - **Select Workflow**: Choose from existing workflows
   - **Template Name**: User-friendly name
   - **Description**: Explain what the template does
   - **Category**: Organize templates (Sales, Marketing, Support, etc.)

4. **Manage Templates**:
   - **Feature**: Click star icon to feature a template (shows first)
   - **Delete**: Remove templates that are outdated
   - **Track Usage**: See how many times each template was used

### Example Templates

**Sales Follow-up**:
```
Name: Automated Lead Follow-up
Description: Automatically sends follow-up emails 24 hours after lead creation
Category: Sales
```

**Support Ticket Routing**:
```
Name: Priority Ticket Routing
Description: Routes high-priority support tickets to senior agents
Category: Support
```

### Using Templates (End User)
1. Go to Automations page
2. Look for "Quick Start Templates" in left sidebar
3. Click any template to load it into the canvas
4. Customize and save

---

## Auto-Scaling Alerts

**Purpose**: Monitor system resources and get recommendations for scaling.

### How It Works
1. System tracks CPU, memory, database connections, and API requests
2. Color-coded status shows health (Green = Healthy, Yellow = Warning, Red = Critical)
3. Automatic recommendations appear when scaling is needed
4. Real-time monitoring with 30-second refresh

### Monitored Resources

| Resource | Warning Threshold | Critical Threshold | Action Needed |
|----------|------------------|-------------------|---------------|
| **CPU Usage** | 70% | 90% | Scale up compute resources |
| **Memory Usage** | 75% | 90% | Increase RAM allocation |
| **DB Connections** | 70% | 85% | Optimize queries or scale DB |
| **API Requests/min** | 800 | 950 | Add rate limiting or scale |

### Reading the Dashboard

**Healthy (Green)**:
- System operating normally
- No action needed

**Warning (Yellow)**:
- Resource usage elevated
- Monitor closely
- Consider scaling if trend continues

**Critical (Red)**:
- Immediate action required
- Scale up resources
- Investigate high usage

### Adding Test Metrics

To simulate metrics for testing:
```sql
-- Insert test CPU usage
INSERT INTO system_metrics (metric_type, metric_value)
VALUES ('cpu_usage', 85);

-- Insert test memory usage
INSERT INTO system_metrics (metric_type, metric_value)
VALUES ('memory_usage', 78);
```

---

## Feature Flag Dashboard

**Purpose**: Control feature availability with gradual rollouts.

### How It Works
1. Create feature flags for new features
2. Enable/disable features without code changes
3. Gradual rollout using percentage-based distribution
4. Perfect for A/B testing and phased releases

### Creating Feature Flags

1. **Go to Admin > Flags tab**

2. **Create New Flag**:
   - **Flag Name**: Code identifier (e.g., `new_dashboard_ui`)
   - **Description**: What this flag controls
   - **Rollout Percentage**: 0-100% (how many users see it)
   - **Enabled**: Master on/off switch

3. **Adjust Rollout**:
   - Start at 0-10% for initial testing
   - Increase gradually (25%, 50%, 75%, 100%)
   - Monitor for issues at each stage

### Example Flag Configurations

**Beta Feature**:
```
Name: advanced_search
Description: Enable new advanced search interface
Rollout: 25%
Enabled: true
```
*Result: 25% of users see the new search interface*

**Internal Testing**:
```
Name: ai_recommendations
Description: AI-powered product recommendations
Rollout: 5%
Enabled: true
```
*Result: 5% of users (beta testers) see AI recommendations*

### Using Feature Flags in Code

The backend already has feature flag support. To use in your edge functions:

```typescript
import { isFeatureEnabled } from '../_shared/feature-flags.ts';

// Check if feature is enabled
if (isFeatureEnabled('new_dashboard_ui')) {
  // Show new UI
} else {
  // Show old UI
}
```

### Best Practices
1. **Start Small**: Begin with 5-10% rollout
2. **Monitor Metrics**: Check error rates after each increase
3. **Quick Rollback**: Set to 0% if issues arise
4. **Clean Up**: Delete flags once features are fully launched

---

## Automated Backups

**Purpose**: Ensure your database is regularly backed up with no manual intervention.

### How It Works
1. Automatic backups run on your configured schedule
2. Backup metadata stored in platform config
3. Manual backup option for immediate needs
4. History tracking for all backups

### Configuring Backups

1. **Go to Admin > Backups tab**

2. **Set Schedule**:
   - **Hourly**: Every hour (for critical systems)
   - **Daily**: Every day at 2 AM (recommended)
   - **Weekly**: Every Sunday at 2 AM
   - **Monthly**: 1st of each month at 2 AM

3. **Manual Backup**:
   - Click "Backup Now" for immediate backup
   - Useful before major changes
   - Creates "manual" type backup in history

### Backup History

The dashboard shows:
- **Timestamp**: When backup was created
- **Type**: Manual or Automatic
- **Size**: Backup file size in MB
- **Status**: Completed or Failed
- **Download**: Access backup files (production only)

### Recovery Process

**To restore from backup** (in production):
1. Navigate to Admin > Backups
2. Find the backup you want to restore
3. Click download icon
4. Contact your database administrator for restoration

### Best Practices
1. **Daily Backups**: Minimum recommendation for production
2. **Test Restores**: Periodically test backup restoration
3. **Off-site Storage**: Keep backups in separate location
4. **Retention**: Keep at least 30 days of backups

---

## User Role Management

**Purpose**: Manage user access and permissions across your platform.

### Understanding Roles

| Role | Permissions | Best For |
|------|------------|----------|
| **Owner** | Full access, can't be removed | Company owner |
| **Admin** | Platform management, user management | IT admins |
| **Manager** | Team management, read access | Team leads |
| **Agent** | Customer interactions, limited write | Support staff |
| **User** | Basic access, own data only | End users |

### Managing Users

1. **Go to Admin > Users tab**

2. **View User Details**:
   - Name and email
   - Current role
   - User ID
   - Profile picture (if set)

3. **Change User Role**:
   - Select new role from dropdown
   - Click "Update Role"
   - Changes take effect immediately
   - User may need to refresh/re-login

4. **Remove User**:
   - Click trash icon
   - Confirm removal
   - User loses platform access immediately

### Adding New Admin Users

**Via Database**:
```sql
-- Give user admin role
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid-here', 'admin');
```

**Via UI** (coming soon):
- Will have "Invite User" button
- Send email invitation
- User signs up with admin role pre-assigned

### Security Best Practices
1. **Principle of Least Privilege**: Give minimum necessary access
2. **Regular Audits**: Review user roles quarterly
3. **Remove Inactive Users**: Delete accounts no longer needed
4. **Owner Role**: Limit to 1-2 people maximum
5. **Admin Access**: Only for trusted team members

---

## Monitoring & Maintenance

### Regular Tasks

**Daily**:
- Check Health Alerts for any triggered alarms
- Review Auto-Scaling dashboard for resource issues
- Monitor Backup completion status

**Weekly**:
- Review Feature Flag rollout progress
- Check User Role changes in Audit Logs
- Verify Workflow Template usage

**Monthly**:
- Audit all user roles and permissions
- Clean up old feature flags (100% rollout)
- Review backup retention policy
- Export data for compliance (via Data Export)

### Troubleshooting

**Health Alerts Not Sending**:
1. Check alert is enabled (toggle switch)
2. Verify notification target (email/webhook URL)
3. Check edge function logs: Admin > Monitoring
4. Test with low threshold to trigger alert

**Feature Flags Not Working**:
1. Ensure flag is enabled
2. Check rollout percentage > 0
3. Verify flag name matches code
4. Clear browser cache

**Backup Failures**:
1. Check database connection
2. Verify storage space
3. Review backup schedule timing
4. Check edge function logs

---

## Quick Reference

### Common Tasks

**Add Health Alert**: Admin > Alerts > Fill form > Add Alert Rule

**Feature New Template**: Admin > Templates > Click star icon on template

**Change User Role**: Admin > Users > Select role > Update Role

**Manual Backup**: Admin > Backups > Backup Now

**Check Resource Usage**: Admin > Scaling > View dashboard

**Toggle Feature Flag**: Admin > Flags > Use switch

---

## Support

For additional help:
1. Check Audit Logs (Admin > Audit) for change history
2. Review Monitoring Dashboard for system health
3. Export logs via Data Export for detailed analysis

All admin features are production-ready and fully functional!
