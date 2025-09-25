#!/bin/bash

echo "Setting up Keycloak for Todo App..."

# Wait for Keycloak to be fully ready
echo "Waiting for Keycloak to be ready..."
until curl -s http://localhost:8080/realms/master/.well-known/openid_configuration > /dev/null; do
  echo "  Keycloak not ready yet, waiting..."
  sleep 2
done

echo "✅ Keycloak is ready!"

# Get admin access token
echo "Getting admin access token..."
ACCESS_TOKEN=$(curl -s \
  -d 'client_id=admin-cli' \
  -d 'username=admin' \
  -d 'password=admin' \
  -d 'grant_type=password' \
  'http://localhost:8080/realms/master/protocol/openid-connect/token' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])' 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get access token"
    exit 1
fi

echo "✅ Access token obtained"

# Delete existing realm if it exists
echo "Cleaning up existing realm..."
curl -s -X DELETE "http://localhost:8080/admin/realms/todo" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Create new realm
echo "Creating new 'todo' realm..."
curl -s -X POST "http://localhost:8080/admin/realms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "realm": "todo",
    "enabled": true,
    "displayName": "Smart Todo App",
    "registrationAllowed": true,
    "registrationEmailAsUsername": false,
    "rememberMe": true,
    "verifyEmail": false,
    "loginWithEmailAllowed": true,
    "duplicateEmailsAllowed": false,
    "resetPasswordAllowed": true,
    "editUsernameAllowed": false,
    "bruteForceProtected": false,
    "loginTheme": "keycloak",
    "adminTheme": "keycloak",
    "emailTheme": "keycloak",
    "accountTheme": "keycloak"
  }'

echo "✅ Realm created"

# Wait a moment for realm to be fully initialized
sleep 2

# Create client
echo "Creating client 'todo-app'..."
curl -s -X POST "http://localhost:8080/admin/realms/todo/clients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "clientId": "todo-app",
    "name": "Smart Todo Application",
    "enabled": true,
    "clientAuthenticatorType": "client-secret",
    "secret": "todo-secret",
    "standardFlowEnabled": true,
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": false,
    "publicClient": false,
    "protocol": "openid-connect",
    "redirectUris": [
      "http://localhost:3000/api/auth/callback/keycloak",
      "http://localhost:3000/*"
    ],
    "webOrigins": [
      "http://localhost:3000"
    ],
    "attributes": {
      "post.logout.redirect.uris": "http://localhost:3000"
    },
    "defaultClientScopes": [
      "web-origins", 
      "role_list", 
      "profile", 
      "roles", 
      "email"
    ]
  }'

echo "✅ Client created"

# Final verification
echo "Verifying setup..."
sleep 3

OIDC_CONFIG=$(curl -s http://localhost:8080/realms/todo/.well-known/openid_configuration 2>/dev/null)
if echo "$OIDC_CONFIG" | grep -q "authorization_endpoint"; then
    echo ""
    echo "🎉 SUCCESS! Keycloak is properly configured!"
    echo ""
    echo "Keycloak Admin Console: http://localhost:8080/admin/ (admin/admin)"
    echo "Todo Realm: http://localhost:8080/realms/todo/"
    echo ""
    echo "Next steps:"
    echo "1. Your Next.js app should now redirect users to Keycloak"
    echo "2. Visit http://localhost:3000 to test"
    echo "3. Users can register by clicking 'Register' on the Keycloak login page"
    echo ""
else
    echo "❌ Verification failed. Response:"
    echo "$OIDC_CONFIG"
    exit 1
fi