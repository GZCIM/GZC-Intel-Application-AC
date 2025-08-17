param location string = 'eastus'
param containerAppName string = 'gzc-intel-application-ac'
param resourceGroup string = 'gzc-kubernetes-rg'
param imageTag string = 'v20250814-153324-final'
param environmentId string = '/subscriptions/6f928fec-8d15-47d7-b27b-be8b568e9789/resourceGroups/gzc-kubernetes-rg/providers/Microsoft.App/managedEnvironments/gzc-container-env'

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
          username: 'gzcacr'
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        {
          name: 'registry-password'
          value: 'b8VRKLBfpCKHWiCZ5oQj2l1a0z/A1sVXRQqTEchLnk+ACRC4yzGp'
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
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

output fqdn string = containerApp.properties.configuration.ingress.fqdn