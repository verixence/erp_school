# 🏫 School ERP - Multi-Tenant Management System

## 📖 Overview

A comprehensive SaaS School ERP system designed to support 150+ schools (tenants) with 2,000+ students each. Built with modern web technologies and featuring advanced multi-tenant isolation, feature flags, and role-based access control.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Row-Level Security)
- **State Management**: TanStack Query
- **Authentication**: Supabase Auth (Magic Links)
- **Package Manager**: pnpm (monorepo with workspaces)
- **Deployment**: Vercel (Web) + Supabase (Database)

### Monorepo Structure
```
.
├── package.json         # Root workspace configuration
├── pnpm-workspace.yaml  # Workspace definitions
├── tsconfig.base.json   # Shared TypeScript config
├── .env.example         # Environment variables template
├── db/                  # Database migrations & seeds
│   ├── migrations/
│   │   └── 0001_init.sql
│   └── seed.ts
├── common/              # Shared types & utilities
│   └── src/
│       └── index.ts
├── web/                 # Next.js web application
│   ├── src/
│   │   ├── app/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── providers/
│   └── package.json
└── mobile/              # Future: Expo React Native
```

## 🚀 Phase 2 Features (Current)

### ✅ Completed
- **Multi-tenant Architecture**: Full tenant isolation with Row-Level Security  
- **Authentication System**: Email/password authentication with Supabase
- **Super Admin Portal**: Manage all schools and their features
- **School Admin Portal**: Complete CRUD operations for Students, Teachers, Parents, Classes
- **Feature Flag System**: Toggle features per school dynamically
- **Role-Based Access Control**: Super Admin, School Admin, Teacher, Parent roles
- **Reusable CRUD Components**: Optimistic UI updates with search, pagination, and modals
- **Beautiful UI**: Modern, responsive design with Tailwind CSS and sidebar navigation
- **Type Safety**: Full TypeScript coverage with strict mode

### 🔐 Demo Credentials
- **Super Admin**: `admin@school.edu` / `admin123`  
- **School Admin**: `school@demo.edu` / `school123`

### 🎯 Phase 2 Usage

**Super Admin Workflow:**
1. Login → Super Admin Dashboard → View school statistics
2. Select School → Toggle Features → Save Changes  
3. Real-time updates with optimistic UI

**School Admin Workflow:**
1. Login → School Admin Dashboard → View KPIs (students, teachers, parents, active features)
2. **Students**: Add/Edit/Delete with grade and section selection
3. **Teachers**: Invite teachers by email with automatic role assignment
4. **Parents**: Register parent accounts for student communication
5. **Classes**: Create and manage class structure
6. Search, pagination, and modal-based editing for all entities

### 🔧 Core Modules
- **Core Management**: Basic school operations (always enabled)
- **Attendance**: Student attendance tracking
- **Examinations**: Exam scheduling and results
- **Fee Management**: Fee collection and tracking
- **Homework**: Assignment management
- **Announcements**: School-wide communications
- **Chat**: Internal messaging system
- **Library**: Book and resource management
- **Transportation**: Bus and transport management

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ with pnpm installed
- Supabase account (for database)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd erp_school
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Set up the database**
   
   **Option A: Using Supabase Cloud**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key to `.env.local`
   - Run the migration SQL manually in the Supabase SQL editor
   
   **Option B: Using Local Supabase (Recommended for development)**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Start local Supabase
   pnpm db:start
   
   # Apply migrations
   pnpm db:migrate
   
   # Seed demo data
   pnpm db:seed
   ```

5. **Start the development server**
   ```bash
   pnpm dev:web
   ```

6. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000)
   - **Super Admin**: `admin@school.edu` / `admin123`
   - **School Admin**: `school@demo.edu` / `school123`

## 🔐 Authentication & Authorization

### User Roles
- **Super Admin**: Manage all schools, toggle features, system administration
- **School Admin**: Manage their school's data and users
- **Teacher**: Access teaching tools and student data
- **Parent**: View their children's information

### Security Features
- Email/password authentication with show/hide toggle
- JWT-based sessions with automatic refresh
- Row-Level Security (RLS) for tenant isolation (temporarily disabled for development)
- Role-based route protection with middleware
- Secure API endpoints

## 🗄️ Database Schema

### Core Tables
```sql
-- Schools (tenants)
schools (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  domain text UNIQUE,
  enabled_features jsonb DEFAULT '{}',
  custom_modules jsonb DEFAULT '[]',
  status text DEFAULT 'active'
)

-- Users with role-based access
users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role user_role NOT NULL,
  school_id uuid REFERENCES schools
)

-- Students linked to schools and parents
students (
  id uuid PRIMARY KEY,
  school_id uuid REFERENCES schools,
  full_name text,
  grade text,
  section text,
  parent_id uuid REFERENCES users
)
```

### Row-Level Security Policies
- Super admins can access all data
- School users can only access their tenant's data
- Students are restricted to their school context
- Parents can only see their children's data

## 🎨 UI/UX Features

### Design System
- **Color Palette**: Blue and purple gradients with semantic colors
- **Typography**: Inter font family for clarity
- **Components**: Fully responsive with mobile-first approach
- **Animations**: Smooth transitions and loading states
- **Accessibility**: WCAG 2.1 compliant design patterns

### Key UI Components
- **Dashboard Cards**: Statistics and quick actions
- **Feature Toggle Matrix**: Visual switches for enabling/disabling features
- **Loading States**: Skeleton screens and spinners
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Success/error feedback

## 📱 Future Phases

### Phase 3: Core Educational Modules
- Attendance management with QR codes
- Grade book and report cards
- Assignment and homework tracking
- Parent-teacher communication portal

### Phase 4: Mobile Application
- React Native app for iOS and Android
- Push notifications for important updates
- Offline capability for core features

### Phase 5: Advanced Features
- Video conferencing integration
- AI-powered analytics and insights
- Advanced reporting and dashboards
- Third-party integrations (Google Classroom, etc.)

### Phase 4: Mobile Application
- React Native with Expo
- Push notifications
- Offline-first architecture
- Cross-platform deployment

### Phase 5: Advanced Features
- Custom module system
- Advanced analytics and reporting
- Multi-language support
- White-label theming
- Billing and subscription management

## 🧪 Testing Strategy

### Planned Testing Approach
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API endpoint and database interaction testing
- **E2E Tests**: Full user workflow testing with Playwright
- **Performance Tests**: Load testing for multi-tenancy
- **Security Tests**: Penetration testing for tenant isolation

## 🚀 Deployment

### Production Deployment
1. **Database**: Deploy to Supabase Cloud
2. **Web App**: Deploy to Vercel with environment variables
3. **Domain**: Configure custom domain with SSL
4. **Monitoring**: Set up error tracking and analytics

### Environment Variables
```bash
# Required for production
NEXT_PUBLIC_SUPA_URL=your-supabase-project-url
NEXT_PUBLIC_SUPA_ANON_KEY=your-supabase-anon-key
SUPA_SERVICE_KEY=your-supabase-service-key
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make changes with proper TypeScript typing
4. Follow the conventional commit format
5. Submit a pull request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for Next.js and React
- **Prettier**: Code formatting (configured)
- **Conventional Commits**: Commit message format

## 📞 Support

For technical support or questions:
- Create an issue in the GitHub repository
- Check the documentation wiki
- Contact the development team

## 📄 License

This project is proprietary and confidential. All rights reserved.

---

**Built with ❤️ for educational institutions worldwide** 