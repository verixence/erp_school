# 🚀 Quick Setup Guide

## Phase 1 - Multi-Tenant School ERP

### What's Built
✅ **Complete monorepo structure** with TypeScript  
✅ **Supabase database schema** with Row-Level Security  
✅ **Next.js 14 web app** with modern UI  
✅ **Authentication system** with magic links  
✅ **Super admin portal** with feature toggles  
✅ **Multi-tenant architecture** ready for 150+ schools  

### Quick Start

1. **Setup Environment**
   ```bash
   # Copy and configure environment variables
   cp .env.example web/.env.local
   # Edit web/.env.local with your Supabase credentials
   ```

2. **Database Setup**
   
   **Option A: Supabase Cloud**
   - Create project at https://supabase.com
   - Copy project URL and anon key to `web/.env.local`
   - Go to SQL Editor and run `db/migrations/0001_init.sql`
   - Run seed script: `cd db && npm install && node -r tsx/register seed.ts`
   
   **Option B: Local Development**
   ```bash
   # Install Supabase CLI globally
   npm install -g supabase
   
   # Initialize and start local Supabase
   supabase init
   supabase start
   
   # Update .env.local with local URLs (printed by supabase start)
   # Apply migrations and seed data
   supabase db push
   cd db && npm install && node -r tsx/register seed.ts
   ```

3. **Start Development**
   ```bash
   cd web
   npm run dev
   ```

4. **Access Application**
   - Open http://localhost:3000
   - Login with: `super@erp.io`
   - Check your email for magic link
   - Access super admin portal at /super-admin

### Demo Credentials
- **Super Admin**: `super@erp.io`
- **Demo Schools**: Green Valley High, Sunrise Academy

### Architecture Overview
```
📁 Root Monorepo
├── 🗄️  db/           Database migrations & seeds
├── 📦  common/       Shared TypeScript types  
├── 🌐  web/          Next.js application
└── 📱  mobile/       (Future: React Native)
```

### Key Features Demo
1. **Multi-tenant Dashboard**: View all schools with stats
2. **Feature Toggle Matrix**: Enable/disable features per school
3. **Beautiful UI**: Modern design with Tailwind CSS
4. **Secure Authentication**: Magic link + JWT sessions
5. **Row-Level Security**: Full tenant isolation

### Next Steps
Ready for Phase 2:
- School admin CRUD operations
- Student/teacher management
- Core educational modules
- Mobile app development

### Support
- Check README.md for full documentation
- Review code comments for implementation details
- Database schema is fully documented in migrations

**🎉 Congratulations! Your multi-tenant School ERP foundation is ready!** 