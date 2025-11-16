<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Keycloak SSO Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for Keycloak SSO authentication
    |
    */

    'base_url' => env('KEYCLOAK_BASE_URL', 'https://sso.vnuhcm.edu.vn/auth'),
    'realm' => env('KEYCLOAK_REALM', 'Production'),
    'client_id' => env('KEYCLOAK_CLIENT_ID', 'webapp-nq57'),
    'client_secret' => env('KEYCLOAK_CLIENT_SECRET'),
    'redirect_uri' => env('KEYCLOAK_REDIRECT_URI', 'https://nq57.vnuhcm.edu.vn/api/v1/auth/sso/callback'),
];
