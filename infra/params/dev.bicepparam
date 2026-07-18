// infra/params/dev.bicepparam
// Development environment parameters for MathPilot MVP.
// pgAdminPassword is NOT stored here — it is passed as a GitHub Secret
// (MATHPILOT_PG_ADMIN_PASSWORD) at deploy time.

using '../main.bicep'

param location = 'westus2'
param prefix = 'omm-mathpilot'
param environment = 'dev'
// pgAdminPassword is injected by the deploy workflow
