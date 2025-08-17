param location string = 'eastus'
param containerAppName string = 'gzc-intel-application-ac'
param resourceGroup string = 'gzc-kubernetes-rg'
param imageTag string = 'v20250814-153324-final'
param environmentId string = '/subscriptions/${subscription().subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.App/managedEnvironments/gzc-container-env'

resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 80
        transport: 'auto'
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: 'gzcacr.azurecr.io'
          identity: 'system'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'gzc-intel-app'
          image: 'gzcacr.azurecr.io/gzc-intel-app:${imageTag}'
          resources: {
            cpu: json('1.0')
            memory: '2.0Gi'
          }
          env: [
            {
              name: 'KEY_VAULT_URL'
              value: 'https://gzc-finma-keyvault.vault.azure.net/'
            }
            {
              name: 'ENVIRONMENT'
              value: 'production'
            }
            {
              name: 'REDIS_HOST'
              value: 'gzc-cache.redis.cache.windows.net'
            }
            {
              name: 'REDIS_PORT'
              value: '6380'
            }
            {
              name: 'FLASK_PORT'
              value: '5100'
            }
            {
              name: 'FLASK_HOST'
              value: '0.0.0.0'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
  identity: {
    type: 'SystemAssigned'
  }
}

output fqdn string = containerApp.properties.configuration.ingress.fqdn