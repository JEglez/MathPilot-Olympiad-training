// infra/params/dev.bicepparam
// Development environment parameter reference for MathPilot MVP.
// NOTE: pgAdminPassword is a @secure() param — it is passed at deploy time
//       via GitHub Secret (MATHPILOT_PG_ADMIN_PASSWORD), never stored here.
//
// Used by deploy.yml as inline --parameters overrides:
//   --parameters location=westus2 prefix=omm-mathpilot environment=dev \
//   --parameters pgAdminPassword="${{ secrets.MATHPILOT_PG_ADMIN_PASSWORD }}"

// location  = westus2
// prefix    = omm-mathpilot
// environment = dev
