targetScope = 'resourceGroup'

@description('Azure region for the Static Web App resource.')
param location string = resourceGroup().location

@description('Name of the Azure Static Web App.')
param staticWebAppName string

@description('SKU name for the Static Web App.')
@allowed([
  'Free'
  'Standard'
])
param skuName string = 'Standard'

@description('Repository URL associated with the deployment workflow.')
param repositoryUrl string = ''

@description('Branch used by the deployment workflow.')
param branch string = 'main'

@description('Repository root relative path for the app source.')
param appLocation string = '/'

@description('Repository root relative path for the built app artifact.')
param outputLocation string = 'build'

@description('Controls whether preview environments are enabled.')
@allowed([
  'Enabled'
  'Disabled'
])
param stagingEnvironmentPolicy string = 'Enabled'

@description('Whether public network traffic is allowed to reach the site.')
@allowed([
  'Enabled'
  'Disabled'
])
param publicNetworkAccess string = 'Enabled'

@description('Tags applied to the Static Web App resource.')
param tags object = {}

var tierName = skuName == 'Standard' ? 'Standard' : 'Free'

resource staticSite 'Microsoft.Web/staticSites@2025-03-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: skuName
    tier: tierName
  }
  tags: union(tags, {
    'managed-by': 'github-actions'
    'application': 'talking-tom-app'
  })
  properties: {
    allowConfigFileUpdates: false
    branch: branch
    repositoryUrl: repositoryUrl
    publicNetworkAccess: publicNetworkAccess
    stagingEnvironmentPolicy: stagingEnvironmentPolicy
    buildProperties: {
      appLocation: appLocation
      outputLocation: outputLocation
      skipGithubActionWorkflowGeneration: true
    }
  }
}

output staticWebAppId string = staticSite.id
output staticWebAppName string = staticSite.name
output defaultHostname string = staticSite.properties.defaultHostname