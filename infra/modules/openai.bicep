// infra/modules/openai.bicep
// Azure OpenAI resource with gpt-4o-mini (classification) and
// text-embedding-3-small (embeddings) deployments.
// Reference: docs/plan/03-dataset-import-search.md §5.3, docs/plan/01-product-analysis.md §cost

@description('Azure region for the OpenAI resource')
param location string

@description('Name for the Cognitive Services / OpenAI account')
param accountName string

@description('Resource tags')
param tags object = {}

// ── Azure OpenAI account ──────────────────────────────────────────────────────

resource openaiAccount 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: accountName
  location: location
  tags: tags
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    customSubDomainName: accountName
  }
}

// ── Model deployments ─────────────────────────────────────────────────────────

// gpt-4o-mini: used for taxonomy classification via Batch API
// GlobalStandard SKU at 30k TPM (≈ $3 one-time import cost)
resource classificationDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openaiAccount
  name: 'gpt-4o-mini'
  sku: {
    name: 'GlobalStandard'
    capacity: 30
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-mini'
      version: '2024-07-18'
    }
    raiPolicyName: 'Microsoft.DefaultV2'
  }
}

// text-embedding-3-small: 1536-dimensional embeddings for pgvector
// GlobalStandard SKU at 30k TPM (≈ $0.50 for 12k problems)
resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openaiAccount
  name: 'text-embedding-3-small'
  sku: {
    name: 'GlobalStandard'
    capacity: 30
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-3-small'
      version: '1'
    }
    raiPolicyName: 'Microsoft.DefaultV2'
  }
  dependsOn: [classificationDeployment]
}

// ── Outputs ───────────────────────────────────────────────────────────────────

@description('Azure OpenAI endpoint URL')
output endpoint string = openaiAccount.properties.endpoint

@description('OpenAI account name (used to fetch key via az CLI)')
output accountName string = openaiAccount.name

@description('Classification model deployment name')
output classificationModel string = classificationDeployment.name

@description('Embedding model deployment name')
output embeddingModel string = embeddingDeployment.name
