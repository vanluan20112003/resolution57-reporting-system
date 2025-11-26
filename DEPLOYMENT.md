# NQ57 Portal - Deployment Guide

## Environment Configuration

### Development Environment

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_FRONTEND_URL=http://localhost:5000
```

**Backend (.env):**
```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5000

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
```

---

### Production Environment

**Frontend (.env.production):**
```env
# Use relative path for API (same domain)
VITE_API_URL=/api/v1
VITE_FRONTEND_URL=https://nq57.vnuhcm.edu.vn
```

**Backend (.env):**
```env
APP_URL=https://nq57.vnuhcm.edu.vn
FRONTEND_URL=https://nq57.vnuhcm.edu.vn

GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
GOOGLE_REDIRECT_URI=https://nq57.vnuhcm.edu.vn/api/v1/auth/google/callback
```

---

## Google OAuth Configuration

### Development Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - **Authorized JavaScript origins:** `http://localhost:5000`
   - **Authorized redirect URIs:** `http://localhost:8000/api/v1/auth/google/callback`

### Production Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Update OAuth 2.0 credentials:
   - **Authorized JavaScript origins:** `https://nq57.vnuhcm.edu.vn`
   - **Authorized redirect URIs:** `https://nq57.vnuhcm.edu.vn/api/v1/auth/google/callback`

---

## Deployment Steps

### 1. Build Frontend

```bash
cd resources/react
npm install
npm run build
```

This will create optimized production files in `resources/react/dist`

### 2. Configure Web Server (Nginx)

```nginx
server {
    listen 80;
    server_name nq57.vnuhcm.edu.vn;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nq57.vnuhcm.edu.vn;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    root /var/www/nq57-portal/resources/react/dist;
    index index.html;

    # Frontend - React SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Deploy Backend

```bash
# Install dependencies
composer install --optimize-autoloader --no-dev

# Run migrations
php artisan migrate --force

# Optimize Laravel
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Set permissions
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
```

### 4. Start Services

```bash
# Using systemd for Laravel
sudo systemctl start nq57-portal
sudo systemctl enable nq57-portal

# Restart Nginx
sudo systemctl restart nginx
```

---

## Important Notes

1. **All API URLs are centralized** in `resources/react/src/config/api.ts`
2. **Environment variables** control the base URLs
3. **In production**, frontend uses relative paths (`/api/v1`) to avoid CORS issues
4. **Google OAuth redirect URI** must match exactly in Google Console
5. **Database seeder** creates test accounts - remove in production

---

## Testing After Deployment

1. Access: `https://nq57.vnuhcm.edu.vn`
2. Test login with email/password
3. Test Google OAuth login with @vnuhcm.edu.vn email
4. Check that logout redirects correctly
5. Verify user dropdown shows correct information

---

## Troubleshooting

### Issue: API calls return 404
- Check Nginx proxy_pass configuration
- Verify VITE_API_URL in .env

### Issue: Google OAuth redirect mismatch
- Update GOOGLE_REDIRECT_URI in backend .env
- Update redirect URI in Google Cloud Console

### Issue: CORS errors
- Ensure frontend and backend are on same domain
- Or configure CORS in Laravel config/cors.php
