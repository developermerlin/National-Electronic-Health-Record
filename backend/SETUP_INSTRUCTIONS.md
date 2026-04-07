# National Electronic Health Record - Backend Setup

## Role-Based Authentication System Setup

### Step 1: Run Database Migrations

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### Step 2: Initialize Roles and Permissions

```bash
python manage.py init_roles_permissions
```

This command will create:
- **7 Roles**: Admin, Doctor, Nurse, Receptionist, Lab Technician, Pharmacist, Patient
- **17 Permissions**: Various permissions for managing patients, medical records, appointments, etc.
- **Role-Permission Mappings**: Automatically assigns appropriate permissions to each role

### Step 3: Create a Superuser (Admin)

```bash
python manage.py createsuperuser
```

After creating the superuser, you need to assign the admin role to this user:

1. Access Django admin: `http://localhost:8000/admin/`
2. Go to Users
3. Edit your superuser
4. Assign the "admin" role
5. Save

### Step 4: Start the Development Server

```bash
python manage.py runserver
```

## API Endpoints

### Authentication
- `POST /api/v1/user/token/` - Login (get access & refresh tokens)
- `POST /api/v1/user/token/refresh/` - Refresh access token
- `POST /api/v1/user/register/` - Register new user (public)
- `POST /api/v1/user/password-reset/<email>/` - Request password reset
- `POST /api/v1/user/password-change/` - Change password

### Admin Dashboard
- `GET /api/v1/admin/dashboard/` - Get dashboard overview
- `GET /api/v1/admin/users/` - List all users (with filters)
- `POST /api/v1/admin/users/` - Create new user
- `GET /api/v1/admin/users/{id}/` - Get user details
- `PUT /api/v1/admin/users/{id}/` - Update user
- `DELETE /api/v1/admin/users/{id}/` - Deactivate user
- `POST /api/v1/admin/users/{id}/activate/` - Activate user
- `POST /api/v1/admin/users/{id}/reset_password/` - Reset user password
- `GET /api/v1/admin/users/statistics/` - Get user statistics

### Role Management
- `GET /api/v1/admin/roles/` - List all roles
- `GET /api/v1/admin/roles/{id}/` - Get role details
- `POST /api/v1/admin/roles/{id}/assign_permissions/` - Assign permissions to role
- `GET /api/v1/admin/roles/{id}/users/` - Get users with specific role

### Permissions
- `GET /api/v1/admin/permissions/` - List all available permissions

### Bulk Actions
- `POST /api/v1/admin/bulk-action/` - Perform bulk actions on users

## Available Roles

1. **Administrator** - Full system access
2. **Doctor** - Manage patients, medical records, prescriptions
3. **Nurse** - View and assist with patient care
4. **Receptionist** - Manage appointments and patient registration
5. **Lab Technician** - Manage lab results
6. **Pharmacist** - Manage prescriptions
7. **Patient** - View own medical records

## Available Permissions

- View/Add/Edit/Delete Patients
- View/Add/Edit Medical Records
- View/Manage Appointments
- View/Create Prescriptions
- View/Manage Lab Results
- View/Manage Users (Admin only)
- View Reports
- Manage Billing

## Testing the API

### 1. Login
```bash
curl -X POST http://localhost:8000/api/v1/user/token/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your_password"}'
```

### 2. Create a User (Admin only)
```bash
curl -X POST http://localhost:8000/api/v1/admin/users/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@hospital.com",
    "full_name": "Dr. John Smith",
    "phone": "+1234567890",
    "role": 2,
    "employee_id": "DOC001",
    "department": "Cardiology",
    "password": "secure_password",
    "is_active": true
  }'
```

### 3. Get Dashboard Overview
```bash
curl -X GET http://localhost:8000/api/v1/admin/dashboard/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Database Schema

### User Model Extensions
- `role` - ForeignKey to Role
- `employee_id` - Unique employee identifier
- `department` - Department name
- `is_active` - Active status
- `created_by` - User who created this account

### Role Model
- `name` - Role name (admin, doctor, nurse, etc.)
- `description` - Role description
- `created_at` / `updated_at` - Timestamps

### Permission Model
- `name` - Permission name
- `description` - Permission description

### RolePermission Model
- `role` - ForeignKey to Role
- `permission` - ForeignKey to Permission
- Many-to-many relationship between roles and permissions

## Security Notes

1. All admin endpoints require authentication
2. Only users with admin role can access admin endpoints
3. Passwords are hashed using Django's default password hasher
4. JWT tokens expire after 5 minutes (configurable in settings)
5. Refresh tokens are valid for 50 days

## Next Steps

1. Run migrations
2. Initialize roles and permissions
3. Create superuser and assign admin role
4. Test API endpoints
5. Build frontend admin dashboard
