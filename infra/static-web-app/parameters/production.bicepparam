using '../main.bicep'

param skuName = 'Standard'
param stagingEnvironmentPolicy = 'Disabled'
param tags = {
  environment: 'production'
  workload: 'talking-tom-app'
}