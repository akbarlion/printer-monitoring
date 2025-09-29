# Printer Monitoring System

A comprehensive web application for monitoring and managing network printers using SNMP protocol. Built with Angular 17 and PrimeNG for modern, responsive UI.

## Features

### Authentication
- **Login/Register** with flip card animation
- **JWT Token** authentication with refresh tokens
- **Role-based** access control
- **Auto-refresh** tokens on page reload

### Printer Management
- **Real-time monitoring** via SNMP
- **Printer status** tracking (Online/Offline/Warning/Error)
- **Toner levels** monitoring
- **Page counters** and usage statistics
- **Add/Edit/Delete** printers

### Alert System
- **Real-time alerts** for printer issues
- **Severity levels** (Critical/High/Medium/Low)
- **Alert filtering** and search
- **Mark as read/unread** functionality
- **Alert history** tracking

### Dashboard
- **Overview** of all printers
- **Status summary** cards
- **Recent alerts** display
- **Quick actions** for common tasks

### Modern UI
- **PrimeNG** components with Lara Light theme
- **Responsive** design for all devices
- **Glassmorphism** effects
- **Smooth animations** and transitions
- **Professional** branding with logo

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Angular CLI 17+
- Backend API server (for production)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd printer-monitoring

# Install dependencies
npm install

# Start development server
ng serve

# Navigate to http://localhost:4200
```

### Development Setup

```bash
# Generate new component
ng generate component component-name

# Generate service
ng generate service services/service-name

# Build for production
ng build --prod
```

## Project Structure

```
src/
├── app/
│   ├── components/          # Reusable components
│   ├── services/           # Business logic services
│   │   ├── auth.service.ts     # Authentication
│   │   ├── printer.service.ts  # Printer management
│   │   └── snmp.service.ts     # SNMP communication
│   ├── interfaces/         # TypeScript interfaces
│   ├── interceptors/       # HTTP interceptors
│   ├── guards/            # Route guards
│   ├── layout/            # Layout components
│   │   ├── topbar/           # Navigation bar
│   │   └── app.layout.component.ts
│   ├── login/             # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── printer-list/      # Printer management
│   ├── printer-detail/    # Individual printer view
│   └── alerts/           # Alert management
├── assets/
│   └── image/            # Logo and images
└── environments/         # Environment configs
```

## Configuration

### Environment Variables

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  api_printer: 'http://localhost:3000/api/',
  snmp_endpoint: 'http://localhost:3000/api/snmp/'
};
```

### API Endpoints

- **Authentication:** `/api/auth/login`, `/api/auth/register`
- **Printers:** `/api/printers`
- **Alerts:** `/api/alerts`
- **SNMP:** `/api/snmp/query`

## Usage

### Login/Register
1. Navigate to application
2. Use flip card to switch between login/register
3. Register creates account and flips back to login
4. Login with credentials to access dashboard

### Managing Printers
1. Go to **Printers** page
2. **Add Printer** with IP address and SNMP community
3. **Test Connection** before saving
4. **Monitor status** and metrics in real-time

### Monitoring Alerts
1. Visit **Alerts** page
2. **Filter by severity** or status
3. **Mark alerts as read** when resolved
4. **Search** through alert history

## Technologies

- **Frontend:** Angular 17, TypeScript
- **UI Library:** PrimeNG, PrimeFlex, PrimeIcons
- **Styling:** SCSS, CSS Grid/Flexbox
- **Authentication:** JWT with refresh tokens
- **HTTP:** Angular HttpClient with interceptors
- **State Management:** RxJS Observables
- **Build Tool:** Angular CLI with Webpack

## Responsive Design

- **Desktop:** Full feature set with sidebar navigation
- **Tablet:** Optimized layout with collapsible menus
- **Mobile:** Touch-friendly interface with bottom navigation

## Security Features

- **JWT Authentication** with access/refresh tokens
- **HTTP Interceptors** for automatic token handling
- **Route Guards** for protected pages
- **CSRF Protection** via Angular built-ins
- **Input Validation** on all forms

## Deployment

### Production Build

```bash
# Build for production
ng build --configuration production

# Files will be in dist/ directory
# Deploy to web server (Apache, Nginx, etc.)
```

### Docker Deployment

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist/printer-monitoring /usr/share/nginx/html
EXPOSE 80
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check existing documentation
- Review Angular and PrimeNG documentation

---