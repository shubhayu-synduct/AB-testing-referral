# Geo-Fencing Implementation

## Overview
This application implements geo-fencing at the edge using Vercel's middleware to block access from restricted countries while maintaining performance and security.

## Blocked Countries
The following countries are blocked by default:
- **CU** - Cuba
- **IR** - Iran  
- **KP** - North Korea
- **SY** - Syria
- **SD** - Sudan
- **BY** - Belarus
- **RU** - Russia

## How It Works

### 1. Edge Detection
The middleware runs at Vercel's edge network and detects user location through multiple methods:
1. **Vercel's edge runtime**: `request.geo?.country`
2. **Cloudflare headers**: `cf-ipcountry` header
3. **Vercel headers**: `x-vercel-ip-country` header
4. **Fallback**: Defaults to 'US' if no country detected

### 2. Path Whitelisting
Certain paths are whitelisted and allowed even for blocked countries:
- Static files (`/_next`, `.svg`, `.png`, etc.)
- API routes (`/api/*`) - *Optional, can be blocked if needed*
- Essential files (`/favicon.ico`, `/robots.txt`)

### 3. Blocking Logic
Users are blocked if:
- Their country is in the blocked list **AND**
- The requested path is not whitelisted

### 4. Block Page
Blocked users see a professional HTML page with:
- Detected country information
- Polite restriction message
- Contact information for appeals
- Proper HTTP headers (403 status, no-cache, no-index)

## Configuration

### Environment Variables
```bash
# Disable geo-fencing (useful for development/testing)
NEXT_PUBLIC_GEO_FENCING_ENABLED=false
```

### Testing
Use the test endpoint to check geo-detection:
```
GET /api/geo-test
```

This returns detailed information about:
- Detected country from all sources
- Current blocking status
- Environment configuration
- Request headers

## Deployment Notes

### Vercel Configuration
- Middleware automatically runs on Vercel's edge network
- No additional configuration needed
- Works with all Vercel plans

### Performance
- Blocking happens at the edge before reaching your application
- Minimal latency impact for allowed users
- Blocked users never consume your application resources

### Logging
The middleware logs:
- Blocked attempts with country, path, IP, and user agent
- Geo-detection information (production only)
- Configuration status

## Customization

### Adding/Removing Countries
Edit the `BLOCKED_COUNTRIES` array in `middleware.ts`:
```typescript
const BLOCKED_COUNTRIES = ['CU', 'IR', 'KP', 'SY', 'SD', 'BY', 'RU']
```

### Modifying Whitelisted Paths
Edit the `isPathWhitelisted()` function in `middleware.ts`:
```typescript
const whitelistedPaths = [
  '/_next',
  '/favicon.ico',
  // Add your paths here
]
```

### Customizing Block Page
Modify the `generateBlockedPage()` function to change the appearance and message shown to blocked users.

## Security Considerations

### IP Spoofing
- Edge detection is more reliable than client-side detection
- Multiple fallback methods increase accuracy
- Consider implementing additional verification for high-security needs

### Bypass Methods
- VPNs and proxies can potentially bypass geo-restrictions
- This implementation provides compliance-level blocking, not absolute security
- Monitor logs for suspicious patterns

### Legal Compliance
- Ensure your blocking list complies with applicable laws and regulations
- Consider consulting legal counsel for compliance requirements
- Keep documentation of blocking decisions and rationale

## Troubleshooting

### False Positives
If legitimate users are blocked:
1. Check the geo-test endpoint to verify country detection
2. Review whitelisted paths
3. Consider temporary disabling via environment variable
4. Check Vercel deployment logs

### False Negatives
If blocked countries are accessing:
1. Verify middleware is deployed and running
2. Check environment variable configuration
3. Review Vercel edge function logs
4. Confirm country codes are correct (ISO 3166-1 alpha-2)

## Support
For issues or questions about geo-fencing implementation, check:
1. Vercel middleware documentation
2. Application logs via Vercel dashboard
3. Test endpoint: `/api/geo-test`
