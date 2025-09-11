# Email Automation System Documentation

## Overview
The Dr.Info email automation system sends a sequence of 7 onboarding emails to new users, one email per day, starting from the day after registration.

## How It Works

### 1. User Registration Flow
When a user signs up through any method (email/password, Google OAuth, Microsoft OAuth), they are automatically added to the email automation system with:
- `emailDay: 0` (no emails sent yet)
- `emailAutomationStatus: 'active'`
- `emailAutomationSignupDate: [current timestamp]`

### 2. Email Sequence
- **Day 1**: Welcome to Dr.Info
- **Day 2**: How to Ask Smarter Questions
- **Day 3**: Day 3 content
- **Day 4**: Day 4 content
- **Day 5**: Day 5 content
- **Day 6**: Day 6 content
- **Day 7**: Day 7 content

### 3. Cron Job Schedule
Emails are sent automatically via Vercel cron jobs:
- **Schedule**: Daily at 9:00 AM UTC
- **Endpoint**: `/api/send-emails`
- **Configuration**: `vercel.json`

## Database Fields

### User Document Fields
```typescript
{
  emailDay: number,                    // 0-7 (0 = no emails, 7 = completed)
  emailAutomationStatus: string,       // 'active', 'completed', 'unsubscribed', 'bounced'
  emailAutomationSignupDate: Timestamp, // When user joined automation
  lastEmailSent: Timestamp,            // Last email sent timestamp
  totalEmailsSent: number,             // Total emails sent to user
  emailPreferences: {
    marketing: boolean,
    transactional: boolean
  }
}
```

## API Endpoints

### `/api/send-emails`
- **Method**: GET
- **Purpose**: Process all active users and send next email in sequence
- **Rate Limits**: 1000 emails/hour, 10,000 emails/day
- **Retry Logic**: 3 attempts with exponential backoff

### `/api/test-email-automation`
- **Method**: POST
- **Purpose**: Test email automation functionality
- **Use Case**: Development and testing

## Integration Points

### 1. Signup Form (`/components/auth/signup-form.tsx`)
- Email/password signup
- Google OAuth signup
- Microsoft OAuth signup

### 2. Email Verification (`/app/verify-email/page.tsx`)
- When email is verified

### 3. Onboarding Completion (`/app/onboarding/page.tsx`)
- When user completes profile setup

## Error Handling

### Graceful Degradation
- Email automation failures don't break user registration
- All errors are logged for monitoring
- Users can still use the app even if emails fail

### Retry Logic
- Failed emails are retried up to 3 times
- Exponential backoff between retries
- Failed emails are logged for investigation

## Monitoring & Analytics

### Events Logged
- `user_added_to_email_automation`
- `email_sent`
- `user_unsubscribed`
- `email_automation_run`
- `email_automation_error`

### Statistics Available
- Total users in automation
- Active users
- Completed users
- Unsubscribed users
- Total emails sent
- Users by email day

## Deployment

### Vercel Cron Jobs
```json
{
  "crons": [
    {
      "path": "/api/send-emails",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### Environment Variables Required
- `RESEND_API_KEY` - Email service API key
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Firebase private key
- `FIREBASE_CLIENT_EMAIL` - Firebase client email
- `NEXT_PUBLIC_BASE_URL` - Base URL for unsubscribe links

## Testing

### Manual Testing
1. Create a test user
2. Verify user is added to email automation
3. Call `/api/send-emails` manually
4. Check email delivery and database updates

### Automated Testing
- Use `/api/test-email-automation` endpoint
- Monitor logs for automation events
- Verify email templates are sent correctly

## Troubleshooting

### Common Issues
1. **Emails not sending**: Check Resend API key and rate limits
2. **Users not in automation**: Verify integration functions are called
3. **Wrong email day**: Check database fields and automation logic
4. **Cron not running**: Verify Vercel cron configuration

### Debug Steps
1. Check application logs for automation events
2. Verify user document has email automation fields
3. Test `/api/send-emails` endpoint manually
4. Check Vercel cron job logs

## Future Enhancements

### Potential Improvements
- Dynamic email content based on user behavior
- A/B testing for email templates
- Advanced segmentation and targeting
- Integration with analytics platforms
- Email performance metrics and optimization 