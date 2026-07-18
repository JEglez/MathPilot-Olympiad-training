// infra/main.bicep
// MathPilot MVP infrastructure — PostgreSQL + pgvector + Azure OpenAI
// Reference: docs/governance/architecture-principles.md §7
//            docs/plan/02-mvp-architecture.md §3
//
// Deploy via GitHub Actions (.github/workflows/deploy.yml) or locally:
//   az deployment group create \
//     --resource-group <rg> \
//     --template-file infra/main.bicep \
//     --parameters infra/params/dev.bicepparam \
//     --parameters pgAdminPassword=<secret>

@description('Azure region for all resources')
param location string = 'westus2'

@description('Short prefix used for resource naming (e.g. "omm-mathpilot")')
param prefix string = 'mathpilot'

@description('Environment tag (dev | staging | prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('PostgreSQL admin password')
@secure()
param pgAdminPassword string

// ── Resource tags ─────────────────────────────────────────────────────────────

var tags = {
  project: 'mathpilot'
  environment: environment
  managedBy: 'bicep'
}

// ── Module: PostgreSQL + pgvector ─────────────────────────────────────────────

module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    location: location
    serverName: '${prefix}-db'
    databaseName: 'mathpilot'
    adminUser: 'mathpilot_admin'
    adminPassword: pgAdminPassword
    tags: tags
  }
}

// ── Module: Azure OpenAI ──────────────────────────────────────────────────────

module openai 'modules/openai.bicep' = {
  name: 'openai'
  params: {
    location: location
    accountName: '${prefix}-openai'
    tags: tags
  }
}

// ── Outputs (used by deploy.yml to set GitHub Secrets) ───────────────────────

@description('PostgreSQL FQDN — combine with pgAdminPassword to build DB_URL')
output pgFqdn string = postgres.outputs.fqdn

@description('Database name')
output pgDatabase string = postgres.outputs.databaseName

@description('PostgreSQL admin username')
output pgAdminUser string = postgres.outputs.adminUser

@description('Azure OpenAI endpoint')
output openaiEndpoint string = openai.outputs.endpoint

@description('Azure OpenAI account name (used to retrieve key via az CLI)')
output openaiAccountName string = openai.outputs.accountName

@description('Classification model deployment name')
output classificationModel string = openai.outputs.classificationModel

@description('Embedding model deployment name')
output embeddingModel string = openai.outputs.embeddingModel
