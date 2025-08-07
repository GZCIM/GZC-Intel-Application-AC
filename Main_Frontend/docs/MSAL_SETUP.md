# MSAL Authentication Setup Guide

## Overview

This application now uses Microsoft Authentication Library (MSAL) for Azure AD authentication instead of mock tokens. This provides real enterprise-grade authentication with proper access tokens.

## Features Implemented

✅ **Real MSAL Authentication** - No more mock tokens
✅ **Azure AD Integration** - Enterprise-grade authentication
✅ **Access Token Management** - Automatic token refresh
✅ **User Context Integration** - Seamless user state management
✅ **Custom Authentication Hooks** - Easy-to-use React hooks
✅ **Authentication Guards** - Route protection
✅ **Login Modal** - Modern UI for authentication

## Prerequisites

1. Azure AD tenant
2. App Registration in Azure AD
3. Proper permissions configured

## Environment Variables

Create a `.env.local` file in the project root with:

```env
# MSAL Authentication Configuration
VITE_CLIENT_ID=your-client-id-here
VITE_TENANT_ID=your-tenant-id-here
```

### How to Get These Values

1. **VITE_CLIENT_ID**:
   - Go to Azure Portal → Azure Active Directory → App registrations
   - Select your app or create a new one
   - Copy the "Application (client) ID"

2. **VITE_TENANT_ID**:
   - Go to Azure Portal → Azure Active Directory → Overview
   - Copy the "Tenant ID"

## Azure AD App Registration Setup

### 1. Create App Registration

```bash
# In Azure Portal:
1. Navigate to Azure Active Directory
2. Go to "App registrations"
3. Click "New registration"
4. Set name: "GZC Intel Dashboard"
5. Set redirect URI: "http://localhost:5173" (for development)
6. Register the application
```

### 2. Configure Authentication

```bash
# In your App Registration:
1. Go to "Authentication"
2. Add platform: "Single-page application"
3. Add redirect URI: "http://localhost:5173"
4. Enable "Access tokens" and "ID tokens"
5. Save configuration
```

### 3. Set API Permissions

```bash
# In your App Registration:
1. Go to "API permissions"
2. Add permission: "Microsoft Graph"
3. Add delegated permissions:
   - User.Read (to read user profile)
   - openid (for OpenID Connect)
   - profile (for user profile info)
   - email (for user email)
4. Grant admin consent
```

## Usage

### Basic Authentication

```tsx
import { useAuth } from '../hooks/useAuth'

function MyComponent() {
  const { isAuthenticated, login, logout } = useAuth()

  return (
    <div>
      {isAuthenticated ? (
        <button onClick={logout}>Sign Out</button>
      ) : (
        <button onClick={login}>Sign In</button>
      )}
    </div>
  )
}
```

### Getting User Information

```tsx
import { useUser } from '../hooks/useUser'

function UserProfile() {
  const { user, msalAccount } = useUser()

  if (!user) return <div>Not authenticated</div>

  return (
    <div>
      <h2>Welcome, {user.name}</h2>
      <p>Email: {user.email}</p>
      <p>Tenant: {user.tenantId}</p>
    </div>
  )
}
```

### Getting Access Tokens

```tsx
import { useAuth } from '../hooks/useAuth'

function ApiCall() {
  const { getAccessToken } = useAuth()

  const callAPI = async () => {
    try {
      const token = await getAccessToken()
      // Use token in API calls
      const response = await fetch('/api/data', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    } catch (error) {
      console.error('Failed to get token:', error)
    }
  }

  return <button onClick={callAPI}>Call API</button>
}
```

### Using Authentication Guards

```tsx
import AuthGuard from '../components/AuthGuard'

function ProtectedPage() {
  return (
    <AuthGuard>
      <div>This content requires authentication</div>
    </AuthGuard>
  )
}
```

## Components Updated

The following components have been updated to use MSAL:

- ✅ `UnifiedProvider.tsx` - Now uses real MSAL tokens
- ✅ `UserContext.tsx` - Integrated with MSAL user management
- ✅ `LoginModal.tsx` - Uses new authentication hooks
- ✅ All components using `useUser` - Updated import paths

## Architecture

### Provider Hierarchy

```
MsalProvider (main.tsx)
├── App
    ├── ThemeProvider
    ├── UnifiedProvider (uses MSAL tokens)
    ├── UserProvider (syncs with MSAL)
    └── Other providers...
```

### Authentication Flow

1. User clicks "Sign In"
2. MSAL popup opens with Azure AD login
3. User authenticates with Microsoft
4. MSAL receives tokens and user info
5. UserContext syncs with MSAL account
6. App updates to authenticated state

## Testing

Use the `AuthDemo` component to test authentication:

```tsx
import AuthDemo from '../components/AuthDemo'

// Add to your routes or components for testing
<AuthDemo />
```

## Production Deployment

For production, update:

1. **Redirect URIs**: Add your production domain
2. **Environment Variables**: Set production values
3. **API Permissions**: Ensure proper scopes are configured
4. **Security**: Enable Conditional Access if needed

## Troubleshooting

### Common Issues

1. **"Client ID not found"**: Check VITE_CLIENT_ID is set correctly
2. **"Invalid redirect URI"**: Ensure redirect URI is registered in Azure AD
3. **"Insufficient permissions"**: Check API permissions and admin consent
4. **Token refresh fails**: Check network connectivity and Azure AD status

### Debug Mode

Enable MSAL logging by updating `msalConfig.ts`:

```tsx
system: {
  loggerOptions: {
    logLevel: LogLevel.Verbose,
    // ... rest of config
  }
}
```

## Migration Notes

### From Mock Authentication

- ✅ Removed mock token system from `UnifiedProvider`
- ✅ UserContext no longer uses default "Mikaël Thomas" user
- ✅ Real Azure AD users are now used
- ✅ Access tokens are real and can be used for API calls

### Breaking Changes

- `login()` now requires no parameters (uses MSAL popup)
- `logout()` is now async and uses MSAL logout
- User object structure includes Azure AD fields (tenantId, accountId)
