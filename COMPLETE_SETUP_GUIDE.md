# National Electronic Health Record - Complete Setup Guide

## 🎯 Overview

This is a comprehensive role-based authentication system for a National Electronic Health Record application. The system supports multiple user roles (Admin, Doctor, Nurse, Receptionist, Lab Technician, Pharmacist, Patient) with granular permissions.

---

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

---

## 🔧 Backend Setup

### Step 1: Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Configure Database

1. Create PostgreSQL database:
```sql
CREATE DATABASE National_Medical_Record;
```

2. Update `backend/backend/settings.py` if needed (database credentials are already configured):
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'National_Medical_Record',
        'USER': 'postgres',
        'PASSWORD': 'rootadmin1',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### Step 3: Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### Step 4: Initialize Roles and Permissions

```bash
python manage.py init_roles_permissions
```

This creates:
- **7 Roles**: admin, doctor, nurse, receptionist, lab_technician, pharmacist, patient
- **17 Permissions**: Various permissions for managing patients, medical records, appointments, etc.
- **Role-Permission Mappings**: Automatically assigns appropriate permissions to each role

### Step 5: Create Admin User

```bash
python manage.py createsuperuser
```

Follow the prompts to create your admin account.

### Step 6: Assign Admin Role

1. Start the server: `python manage.py runserver`
2. Access Django admin: http://localhost:8000/admin/
3. Login with your superuser credentials
4. Go to **Users** → Find your superuser
5. Edit and assign the **admin** role
6. Save

### Step 7: Start Backend Server

```bash
python manage.py runserver
```

Backend will run on: http://localhost:8000

---

## 🎨 Frontend Setup

### Step 1: Install Dependencies

```bash
cd frontend
npm install
npm install jwt-decode
```

### Step 2: Start Development Server

```bash
npm run dev
```

Frontend will run on: http://localhost:5173

---

## 🚀 Usage Guide

### 1. Login

Navigate to: http://localhost:5173/login

Use your admin credentials created earlier.

### 2. Admin Dashboard

After login, you'll be redirected to: http://localhost:5173/admin/dashboard

Features:
- View user statistics
- See recent users
- View role distribution
- Quick actions

### 3. User Management

Navigate to: http://localhost:5173/admin/users

Features:
- **Create Users**: Add new users with specific roles
- **Edit Users**: Update user information and roles
- **Activate/Deactivate**: Control user access
- **Reset Passwords**: Reset user passwords
- **Search & Filter**: Find users by name, email, role, or status

### 4. Creating a New User

1. Click "Create New User" button
2. Fill in the form:
   - Full Name
   - Email (will be username)
   - Phone
   - Role (select from dropdown)
   - Employee ID (optional)
   - Department (optional)
   - Password
   - Active status
3. Click "Create User"

### 5. Role-Based Redirection

After login, users are automatically redirected based on their role:
- **Admin** → `/admin/dashboard`
- **Doctor** → `/doctor/dashboard`
- **Nurse** → `/nurse/dashboard`
- **Receptionist** → `/receptionist/dashboard`
- **Lab Technician** → `/lab/dashboard`
- **Pharmacist** → `/pharmacy/dashboard`
- **Patient** → `/patient/dashboard`

---

## 🔐 API Endpoints

### Authentication
- `POST /api/v1/user/token/` - Login
- `POST /api/v1/user/token/refresh/` - Refresh token
- `POST /api/v1/user/password-reset/<email>/` - Password reset

### Admin Dashboard
- `GET /api/v1/admin/dashboard/` - Dashboard overview
- `GET /api/v1/admin/users/` - List users (with filters)
- `POST /api/v1/admin/users/` - Create user
- `GET /api/v1/admin/users/{id}/` - Get user details
- `PUT /api/v1/admin/users/{id}/` - Update user
- `DELETE /api/v1/admin/users/{id}/` - Deactivate user
- `POST /api/v1/admin/users/{id}/activate/` - Activate user
- `POST /api/v1/admin/users/{id}/reset_password/` - Reset password
- `GET /api/v1/admin/users/statistics/` - User statistics

### Role Management
- `GET /api/v1/admin/roles/` - List roles
- `GET /api/v1/admin/roles/{id}/` - Get role details
- `POST /api/v1/admin/roles/{id}/assign_permissions/` - Assign permissions
- `GET /api/v1/admin/roles/{id}/users/` - Get users by role

### Permissions
- `GET /api/v1/admin/permissions/` - List all permissions

---

## 👥 Default Roles & Permissions

### Administrator
**Full system access**
- All patient operations
- All medical records operations
- All appointments operations
- All prescriptions operations
- All lab results operations
- User management
- Reports & billing

### Doctor
**Medical professional access**
- View/Add/Edit patients
- View/Add/Edit medical records
- Manage appointments
- Create/View prescriptions
- View lab results
- View reports

### Nurse
**Care provider access**
- View patients
- View/Add medical records
- View appointments
- View prescriptions
- View lab results

### Receptionist
**Front desk access**
- View/Add/Edit patients
- Manage appointments
- Manage billing

### Lab Technician
**Laboratory access**
- View patients
- View medical records
- View/Manage lab results

### Pharmacist
**Pharmacy access**
- View patients
- View prescriptions
- View medical records

### Patient
**Personal access**
- View own medical records
- View own appointments
- View own prescriptions
- View own lab results

---

## 🛠️ Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Check database credentials in `settings.py`
- Verify database exists

### Migration Errors
```bash
python manage.py makemigrations --empty userauths
python manage.py migrate --fake userauths
python manage.py migrate
```

### CORS Issues
- Backend already configured with `CORS_ALLOW_ALL_ORIGINS = True`
- For production, update to specific origins

### JWT Token Errors
- Tokens expire after 5 minutes
- Refresh tokens valid for 50 days
- Check token configuration in `settings.py`

---

## 📁 Project Structure

```
National Electronic Health Record/
├── backend/
│   ├── api/                    # API endpoints
│   ├── userauths/              # User authentication & roles
│   │   ├── models.py           # User, Role, Permission models
│   │   ├── serializer.py       # API serializers
│   │   ├── views.py            # Auth views
│   │   ├── admin_views.py      # Admin management views
│   │   └── management/
│   │       └── commands/
│   │           └── init_roles_permissions.py
│   ├── backend/                # Django settings
│   └── manage.py
│
└── frontend/
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx    # Authentication context
    │   ├── views/
    │   │   ├── admin/
    │   │   │   ├── AdminDashboard.jsx
    │   │   │   └── UserManagement.jsx
    │   │   ├── auth/
    │   │   │   └── Login.jsx
    │   │   └── Home.jsx
    │   └── App.jsx
    └── package.json
```

---

## 🔄 Next Steps

1. **Create Role-Specific Dashboards**
   - Doctor Dashboard
   - Nurse Dashboard
   - Receptionist Dashboard
   - Lab Technician Dashboard
   - Pharmacist Dashboard
   - Patient Dashboard

2. **Implement Patient Management**
   - Patient registration
   - Patient records
   - Medical history

3. **Implement Appointment System**
   - Schedule appointments
   - Appointment calendar
   - Notifications

4. **Implement Medical Records**
   - Electronic health records
   - Medical history
   - Diagnoses and treatments

5. **Implement Prescription System**
   - Create prescriptions
   - Prescription history
   - Medication tracking

6. **Implement Lab Results**
   - Lab test orders
   - Results management
   - Reports

---

## 🔒 Security Best Practices

1. **Never commit sensitive data**
   - Use environment variables for secrets
   - Add `.env` to `.gitignore`

2. **Production settings**
   - Set `DEBUG = False`
   - Use strong `SECRET_KEY`
   - Configure allowed hosts
   - Use HTTPS
   - Implement rate limiting

3. **Password policies**
   - Enforce strong passwords
   - Implement password expiry
   - Enable two-factor authentication

4. **Audit logging**
   - Log all user actions
   - Monitor suspicious activities
   - Regular security audits

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review API documentation: http://localhost:8000/
3. Check Django admin: http://localhost:8000/admin/

---

## ✅ Checklist

- [ ] PostgreSQL installed and running
- [ ] Backend dependencies installed
- [ ] Database created
- [ ] Migrations run
- [ ] Roles and permissions initialized
- [ ] Superuser created and admin role assigned
- [ ] Backend server running
- [ ] Frontend dependencies installed
- [ ] jwt-decode package installed
- [ ] Frontend server running
- [ ] Successfully logged in as admin
- [ ] Admin dashboard accessible
- [ ] User management working
- [ ] Test user created successfully

---

**Congratulations! Your National Electronic Health Record system with role-based authentication is now set up and ready to use!** 🎉
