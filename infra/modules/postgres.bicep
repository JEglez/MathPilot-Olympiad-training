// infra/modules/postgres.bicep
// PostgreSQL Flexible Server (Burstable B1ms) + pgvector extension
// Reference: docs/plan/02-mvp-architecture.md §3.5

@description('Azure region for the server')
param location string

@description('Name for the PostgreSQL Flexible Server')
param serverName string

@description('Database name')
param databaseName string = 'mathpilot'

@description('Admin username')
param adminUser string = 'mathpilot_admin'

@description('Admin password (stored as a secret in Key Vault or passed via GitHub Secrets)')
@secure()
param adminPassword string

@description('Resource tags')
param tags object = {}

// ── PostgreSQL Flexible Server ────────────────────────────────────────────────

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2022-12-01' = {
  name: serverName
  location: location
  tags: tags
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: adminUser
    administratorLoginPassword: adminPassword
    version: '15'
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    // Public access is controlled via firewall rules below.
    // AllowAllAzureServices rule covers GitHub Actions hosted runners.
  }
}

// Allow all Azure services (includes GitHub Actions hosted runners via Azure IPs)
resource allowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2022-12-01' = {
  parent: postgresServer
  name: 'AllowAllAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Enable pgvector extension (required before CREATE EXTENSION vector)
resource pgvectorExtension 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2022-12-01' = {
  parent: postgresServer
  name: 'azure.extensions'
  properties: {
    value: 'vector'
    source: 'user-override'
  }
}

// Database
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2022-12-01' = {
  parent: postgresServer
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

@description('Fully qualified domain name of the PostgreSQL server')
output fqdn string = postgresServer.properties.fullyQualifiedDomainName

@description('Server name')
output serverName string = postgresServer.name

@description('Database name')
output databaseName string = database.name

@description('Admin username')
output adminUser string = adminUser
