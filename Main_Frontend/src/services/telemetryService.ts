import { ApplicationInsights } from '@microsoft/applicationinsights-web';

class TelemetryService {
    private appInsights: ApplicationInsights | null = null;
    private isInitialized = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        const connectionString = import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING || 
                                'VITE_APPLICATIONINSIGHTS_CONNECTION_STRING_PLACEHOLDER';
        
        console.log('🔧 TelemetryService connection string:', connectionString?.substring(0, 50) + '...');
        
        // Only initialize if we have a valid connection string (not placeholder)
        if (connectionString && !connectionString.includes('PLACEHOLDER')) {
            try {
                this.appInsights = new ApplicationInsights({
                    config: {
                        connectionString,
                        enableAutoRouteTracking: true,
                        enableCorsCorrelation: true,
                        enableRequestHeaderTracking: true,
                        enableResponseHeaderTracking: true,
                        autoTrackPageVisitTime: true,
                        disableFetchTracking: false,
                        enableAjaxPerfTracking: true,
                        maxAjaxCallsPerView: 500,
                    }
                });
                
                this.appInsights.loadAppInsights();
                this.appInsights.trackPageView({ name: 'App_Initialized' });
                
                // Set user context if available
                const userId = localStorage.getItem('userId');
                if (userId && this.appInsights.context?.user) {
                    this.appInsights.context.user.id = userId;
                }
                
                this.isInitialized = true;
                console.log('✅ Telemetry Service initialized');
                
                // Track initialization
                this.trackEvent('App_Initialized', {
                    timestamp: new Date().toISOString(),
                    environment: 'production'
                });
            } catch (error) {
                console.error('❌ Failed to initialize Application Insights:', error);
            }
        } else {
            console.warn('⚠️ Application Insights not configured (placeholder or missing connection string)');
        }
    }

    public trackEvent(name: string, properties?: Record<string, any>) {
        if (this.appInsights && this.isInitialized) {
            this.appInsights.trackEvent({ name, properties });
            console.log(`📊 Event tracked: ${name}`, properties);
        } else {
            console.log(`📊 [Local] Event: ${name}`, properties);
        }
    }

    public trackException(error: Error, properties?: Record<string, any>) {
        if (this.appInsights && this.isInitialized) {
            this.appInsights.trackException({ 
                error, 
                properties,
                severityLevel: 2 // Error
            });
        }
        console.error('❌ Exception tracked:', error, properties);
    }

    public trackMetric(name: string, value: number, properties?: Record<string, any>) {
        if (this.appInsights && this.isInitialized) {
            this.appInsights.trackMetric({ name, average: value, properties });
        }
    }

    public setUserId(userId: string) {
        if (this.appInsights?.context?.user) {
            this.appInsights.context.user.id = userId;
            localStorage.setItem('userId', userId);
        }
    }

    public trackPageView(name: string, properties?: Record<string, any>) {
        if (this.appInsights && this.isInitialized) {
            this.appInsights.trackPageView({ name, properties });
        }
    }

    // Track authentication events
    public trackAuthEvent(eventType: 'login_attempt' | 'login_success' | 'login_failure' | 'logout', details?: Record<string, any>) {
        this.trackEvent(`Auth_${eventType}`, {
            ...details,
            timestamp: new Date().toISOString()
        });
    }

    // Track tab events
    public trackTabEvent(eventType: 'created' | 'deleted' | 'renamed' | 'switched', tabData?: Record<string, any>) {
        this.trackEvent(`Tab_${eventType}`, {
            ...tabData,
            timestamp: new Date().toISOString()
        });
    }

    // Track component events
    public trackComponentEvent(eventType: 'added' | 'removed' | 'resized' | 'moved', componentData?: Record<string, any>) {
        this.trackEvent(`Component_${eventType}`, {
            ...componentData,
            timestamp: new Date().toISOString()
        });
    }

    // Track API calls
    public trackApiCall(endpoint: string, method: string, success: boolean, duration?: number) {
        this.trackEvent('API_Call', {
            endpoint,
            method,
            success,
            duration,
            timestamp: new Date().toISOString()
        });
    }

    // Track user preferences
    public trackPreferenceChange(preference: string, value: any) {
        this.trackEvent('Preference_Changed', {
            preference,
            value,
            timestamp: new Date().toISOString()
        });
    }
}

// Export singleton instance
export const telemetryService = new TelemetryService();