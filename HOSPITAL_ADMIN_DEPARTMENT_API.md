# Hospital Admin - Department Management API Guide

## Overview

Hospital administrators can now manage their hospital's departments and units through dedicated API endpoints. These endpoints enforce **hospital-specific access control** - hospital admins can only manage departments in their assigned hospital.

---

## 🔐 Access Control

### Role-Based Permissions

| Role | Access Level |
|------|-------------|
| **hospital_admin** | Can manage departments **only in their assigned hospital** |
| **ministry_admin** | Can manage departments in **any hospital** (with hospital_id parameter) |
| **district_admin** | Can manage departments in **hospitals in their district** |
| **admin** | Full access to all hospitals |

### Authentication

All endpoints require authentication. Include JWT token in headers:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

---

## 📋 API Endpoints for Hospital Admins

### Base URL
```
http://localhost:8000/api/v1/
```

---

## 1. Browse Department Categories

**Get all available department types with their units**

```http
GET /hospital-admin/department-categories/
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "surgery",
    "display_name": "Surgery Department",
    "description": "Comprehensive surgical services...",
    "is_active": true,
    "units": [
      {
        "id": 1,
        "name": "General Surgery",
        "code": "UNIT-SUR-GES-001",
        "category_name": "Surgery Department",
        "is_active": true
      },
      {
        "id": 2,
        "name": "Orthopedic Surgery",
        "code": "UNIT-SUR-ORS-001",
        "category_name": "Surgery Department",
        "is_active": true
      }
    ]
  }
]
```

**Use Case:** Display available department types when creating a new department

---

## 2. Get My Hospital's Departments

**Get all departments in the hospital admin's hospital**

```http
GET /hospital-admin/departments/
```

**For Hospital Admins:** Automatically shows departments for your assigned hospital

**For Ministry/District Admins:** Must include `hospital` parameter
```http
GET /hospital-admin/departments/?hospital=1
```

**Response:**
```json
{
  "hospital": {
    "id": 1,
    "name": "Connaught Hospital",
    "code": "HSP-CON-001"
  },
  "departments": [
    {
      "id": 1,
      "hospital": 1,
      "hospital_name": "Connaught Hospital",
      "category": 1,
      "category_name": "Surgery Department",
      "department_code": "HDPT-HSP-CON-001-SUR-001",
      "head_of_department": "Dr. John Kamara",
      "head_user": 5,
      "head_user_name": "Dr. John Kamara",
      "phone": "+232-76-123456",
      "email": "surgery@connaught.sl",
      "location": "Building A, Floor 2",
      "status": "active",
      "is_active": true,
      "units_count": 5,
      "created_at": "2026-06-07T10:00:00Z"
    }
  ]
}
```

---

## 3. Create a New Department

**Add a department to your hospital**

```http
POST /hospital-admin/departments/create/
```

**Request Body:**
```json
{
  "category": 1,  // Department category ID (e.g., Surgery)
  "head_of_department": "Dr. John Kamara",
  "head_user": 5,  // Optional: User ID of department head
  "phone": "+232-76-123456",
  "email": "surgery@hospital.sl",
  "location": "Building A, Floor 2",
  "status": "active",
  "is_active": true
}
```

**Notes:**
- Hospital admins don't need to specify `hospital` - it's automatically set to their hospital
- Ministry/District admins must include `"hospital": 1` in the request body
- Each hospital can only have one instance of each department category

**Response:** (201 Created)
```json
{
  "id": 1,
  "hospital": 1,
  "hospital_name": "Connaught Hospital",
  "category": 1,
  "category_name": "Surgery Department",
  "department_code": "HDPT-HSP-CON-001-SUR-001",
  "head_of_department": "Dr. John Kamara",
  "units_count": 0,
  "available_units": [
    {
      "id": 1,
      "name": "General Surgery",
      "code": "UNIT-SUR-GES-001"
    },
    {
      "id": 2,
      "name": "Orthopedic Surgery",
      "code": "UNIT-SUR-ORS-001"
    }
  ]
}
```

---

## 4. Get Department Details

**Get detailed information about a specific department**

```http
GET /hospital-admin/departments/{department_id}/
```

**Example:**
```http
GET /hospital-admin/departments/1/
```

**Response:**
```json
{
  "id": 1,
  "hospital": 1,
  "hospital_name": "Connaught Hospital",
  "category": 1,
  "category_name": "Surgery Department",
  "department_code": "HDPT-HSP-CON-001-SUR-001",
  "head_of_department": "Dr. John Kamara",
  "head_user": 5,
  "head_user_name": "Dr. John Kamara",
  "phone": "+232-76-123456",
  "email": "surgery@connaught.sl",
  "location": "Building A, Floor 2",
  "status": "active",
  "is_active": true,
  "unit_instances": [
    {
      "id": 1,
      "unit": 1,
      "unit_name": "General Surgery",
      "unit_code": "HDPT-HSP-CON-001-SUR-001-UNIT-SUR-GES-001-001",
      "unit_head": "Dr. Sarah Bangura",
      "bed_capacity": 20,
      "staff_count": 8,
      "status": "operational"
    }
  ],
  "available_units": [
    {
      "id": 2,
      "name": "Orthopedic Surgery",
      "code": "UNIT-SUR-ORS-001"
    }
  ]
}
```

---

## 5. Update Department

**Update department information**

```http
PUT /hospital-admin/departments/{department_id}/update/
PATCH /hospital-admin/departments/{department_id}/update/
```

**Request Body (PUT - all fields):**
```json
{
  "head_of_department": "Dr. Mohamed Sesay",
  "head_user": 12,
  "phone": "+232-76-654321",
  "email": "surgery@hospital.sl",
  "location": "Building B, Floor 3",
  "status": "active",
  "is_active": true
}
```

**Request Body (PATCH - partial update):**
```json
{
  "head_of_department": "Dr. Mohamed Sesay",
  "phone": "+232-76-654321"
}
```

---

## 6. Add Unit to Department

**Add a specialized unit to your department**

```http
POST /hospital-admin/departments/{department_id}/add-unit/
```

**Request Body:**
```json
{
  "unit_id": 1,  // ID of the unit to add (e.g., General Surgery)
  "unit_head": "Dr. Sarah Bangura",
  "unit_head_user": 15,  // Optional: User ID
  "bed_capacity": 20,
  "staff_count": 8,
  "phone": "+232-76-111222",
  "location": "Building A, Floor 2, Wing B",
  "status": "operational",
  "is_active": true
}
```

**Response:** (201 Created)
```json
{
  "id": 1,
  "hospital_department": 1,
  "department_name": "Surgery Department",
  "hospital_name": "Connaught Hospital",
  "unit": 1,
  "unit_name": "General Surgery",
  "unit_code": "HDPT-HSP-CON-001-SUR-001-UNIT-SUR-GES-001-001",
  "unit_head": "Dr. Sarah Bangura",
  "unit_head_user": 15,
  "bed_capacity": 20,
  "staff_count": 8,
  "phone": "+232-76-111222",
  "location": "Building A, Floor 2, Wing B",
  "status": "operational",
  "is_active": true
}
```

---

## 7. Get Department Units

**Get all units in a specific department**

```http
GET /hospital-admin/departments/{department_id}/units/
```

**Response:**
```json
[
  {
    "id": 1,
    "unit": 1,
    "unit_name": "General Surgery",
    "unit_code": "HDPT-HSP-CON-001-SUR-001-UNIT-SUR-GES-001-001",
    "unit_head": "Dr. Sarah Bangura",
    "bed_capacity": 20,
    "staff_count": 8,
    "status": "operational",
    "is_active": true
  },
  {
    "id": 2,
    "unit": 2,
    "unit_name": "Orthopedic Surgery",
    "unit_code": "HDPT-HSP-CON-001-SUR-001-UNIT-SUR-ORS-001-001",
    "unit_head": "Dr. Mohamed Sesay",
    "bed_capacity": 15,
    "staff_count": 6,
    "status": "operational",
    "is_active": true
  }
]
```

---

## 8. Update Unit

**Update unit information**

```http
PUT /hospital-admin/units/{unit_instance_id}/update/
PATCH /hospital-admin/units/{unit_instance_id}/update/
```

**Request Body (PATCH):**
```json
{
  "unit_head": "Dr. New Head",
  "bed_capacity": 25,
  "staff_count": 10,
  "status": "operational"
}
```

---

## 9. Delete/Deactivate Unit

**Deactivate a unit (soft delete)**

```http
DELETE /hospital-admin/units/{unit_instance_id}/delete/
```

**Response:**
```json
{
  "message": "Unit deactivated successfully"
}
```

**Note:** This is a soft delete - the unit is marked as inactive but not removed from the database.

---

## 🔄 Complete Workflow Example

### Scenario: Setting up Surgery Department at Connaught Hospital

#### Step 1: Browse Available Departments
```javascript
const response = await fetch('/api/v1/hospital-admin/department-categories/');
const categories = await response.json();
// Find Surgery Department (category_id = 1)
```

#### Step 2: Create Surgery Department
```javascript
const createDept = await fetch('/api/v1/hospital-admin/departments/create/', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    category: 1,  // Surgery
    head_of_department: "Dr. John Kamara",
    phone: "+232-76-123456",
    location: "Building A, Floor 2"
  })
});
const department = await createDept.json();
// department.id = 1
```

#### Step 3: Add General Surgery Unit
```javascript
const addUnit = await fetch('/api/v1/hospital-admin/departments/1/add-unit/', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    unit_id: 1,  // General Surgery
    unit_head: "Dr. Sarah Bangura",
    bed_capacity: 20,
    staff_count: 8,
    location: "Building A, Floor 2, Wing B"
  })
});
```

#### Step 4: Add Orthopedic Surgery Unit
```javascript
const addUnit2 = await fetch('/api/v1/hospital-admin/departments/1/add-unit/', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    unit_id: 2,  // Orthopedic Surgery
    unit_head: "Dr. Mohamed Sesay",
    bed_capacity: 15,
    staff_count: 6,
    location: "Building A, Floor 2, Wing C"
  })
});
```

#### Step 5: View All Departments
```javascript
const depts = await fetch('/api/v1/hospital-admin/departments/');
const data = await depts.json();
console.log(data.departments);
```

---

## 🚨 Error Responses

### 403 Forbidden - Not Assigned to Hospital
```json
{
  "error": "You are not assigned to a hospital"
}
```

### 403 Forbidden - Wrong Hospital
```json
{
  "error": "You can only view departments in your hospital"
}
```

### 400 Bad Request - Department Already Exists
```json
{
  "error": "This department already exists in your hospital"
}
```

### 400 Bad Request - Unit Already Exists
```json
{
  "error": "This unit already exists in the department"
}
```

### 404 Not Found - Department Not Found
```json
{
  "error": "Department not found"
}
```

---

## 📊 Summary of Endpoints

| Method | Endpoint | Description | Hospital Admin Access |
|--------|----------|-------------|----------------------|
| GET | `/hospital-admin/department-categories/` | Browse all department types | ✅ Read-only |
| GET | `/hospital-admin/departments/` | Get my hospital's departments | ✅ Own hospital only |
| POST | `/hospital-admin/departments/create/` | Create new department | ✅ Own hospital only |
| GET | `/hospital-admin/departments/{id}/` | Get department details | ✅ Own hospital only |
| PUT/PATCH | `/hospital-admin/departments/{id}/update/` | Update department | ✅ Own hospital only |
| POST | `/hospital-admin/departments/{id}/add-unit/` | Add unit to department | ✅ Own hospital only |
| GET | `/hospital-admin/departments/{id}/units/` | Get department units | ✅ Own hospital only |
| PUT/PATCH | `/hospital-admin/units/{id}/update/` | Update unit | ✅ Own hospital only |
| DELETE | `/hospital-admin/units/{id}/delete/` | Deactivate unit | ✅ Own hospital only |

---

## 🔑 Key Features

✅ **Automatic Hospital Assignment** - Hospital admins don't need to specify hospital ID  
✅ **Access Control** - Can only manage their own hospital's departments  
✅ **Validation** - Prevents duplicate departments and units  
✅ **Soft Delete** - Units are deactivated, not permanently deleted  
✅ **Auto-Generated Codes** - Unique codes for departments and units  
✅ **Detailed Responses** - Includes related data (hospital name, category name, etc.)

---

**Last Updated:** June 7, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
