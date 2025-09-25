#!/bin/bash

echo "Setting up Keycloak realm and client for todo app..."

# Get admin access token
echo "Getting admin access token..."
ACCESS_TOKEN=$(curl -s -d 'client_id=admin-cli' -d 'username=admin' -d 'password=admin' -d 'grant_type=password' http://localhost:8080/realms/master/protocol/openid-connect/token | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])' 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "Failed to get access token. Make sure Keycloak is running on localhost:8080"
    exit 1
fi

echo "Access token obtained successfully"

# Create the todo realm
echo "Creating 'todo' realm..."
curl -s -X POST http://localhost:8080/admin/realms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "realm": "todo",
    "enabled": true,
    "displayName": "Todo App",
    "registrationAllowed": true,
    "registrationEmailAsUsername": false,
    "rememberMe": true,
    "verifyEmail": false,
    "loginWithEmailAllowed": true,
    "duplicateEmailsAllowed": false,
    "resetPasswordAllowed": true,
    "editUsernameAllowed": true,
    "bruteForceProtected": true
  }'

echo "Realm created successfully"

# Create the client
echo "Creating 'todo-app' client..."
curl -s -X POST http://localhost:8080/admin/realms/todo/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "clientId": "todo-app",
    "name": "Todo App",
    "enabled": true,
    "clientAuthenticatorType": "client-secret",
    "secret": "todo-secret",
    "redirectUris": ["http://localhost:3000/api/auth/callback/keycloak"],
    "webOrigins": ["http://localhost:3000"],
    "publicClient": false,
    "protocol": "openid-connect",
    "attributes": {
      "saml.assertion.signature": "false",
      "saml.multivalued.roles": "false",
      "saml.force.post.binding": "false",
      "saml.encrypt": "false",
      "saml.server.signature": "false",
      "saml.server.signature.keyinfo.ext": "false",
      "exclude.session.state.from.auth.response": "false",
      "saml_force_name_id_format": "false",
      "saml.client.signature": "false",
      "tls.client.certificate.bound.access.tokens": "false",
      "saml.authnstatement": "false",
      "display.on.consent.screen": "false",
      "saml.onetimeuse.condition": "false"
    },
    "authenticationFlowBindingOverrides": {},
    "fullScopeAllowed": true,
    "nodeReRegistrationTimeout": -1,
    "defaultClientScopes": ["web-origins", "role_list", "profile", "roles", "email"],
    "optionalClientScopes": ["address", "phone", "offline_access", "microprofile-jwt"]
  }'

echo "Client created successfully"

# Verify the setup
echo "Verifying setup..."
OIDC_CONFIG=$(curl -s http://localhost:8080/realms/todo/.well-known/openid_configuration)
if echo "$OIDC_CONFIG" | grep -q "authorization_endpoint"; then
    echo "✅ Success! Keycloak realm 'todo' is now accessible"
    echo "✅ Users can now register and sign in through your app"
    echo ""
    echo "Next steps:"
    echo "1. Restart your Next.js app (if needed)"
    echo "2. Visit http://localhost:3000"
    echo "3. You should be redirected to Keycloak for authentication"
    echo "4. Click 'Register' if you don't have an account"
else
    echo "❌ Setup verification failed"
    echo "Response: $OIDC_CONFIG"
fi