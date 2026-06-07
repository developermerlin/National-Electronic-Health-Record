# Testing Hospital Admin Department Management

## Quick Test Guide

### Prerequisites
1. ✅ Backend server running: `python manage.py runserver`
2. ✅ Departments initialized: `python manage.py init_departments_units`
3. ✅ Hospital admin user created with assigned hospital

---

## Test 1: Browse Department Categories

**Endpoint:**
```
GET http://localhost:8000/api/v1/hospital-admin/department-categories/
```

**Expected Result:**
- 20 department categories
- Each with their units listed
- Surgery Department should have 14 units
- Laboratory Department should have 10 units

**cURL Command:**
```bash
curl -X GET http://localhost:8000/api/v1/hospital-admin/department-categories/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Test 2: Get My Hospital's Departments

**Endpoint:**
```
GET http://localhost:8000/api/v1/hospital-admin/departments/
```

**Expected Result:**
- List of departments for the hospital admin's hospital
- Empty array if no departments created yet
- Hospital information included

**cURL Command:**
```bash
curl -X GET http://localhost:8000/api/v1/hospital-admin/departments/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Test 3: Create Surgery Department

**Endpoint:**
```
POST http://localhost:8000/api/v1/hospital-admin/departments/create/
```

**Request Body:**
```json
{
  "category": 1,
  "head_of_department": "Dr. John Kamara",
  "phone": "+232-76-123456",
  "email": "surgery@hospital.sl",
  "location": "Building A, Floor 2",
  "status": "active",
  "is_active": true
}
```

**Expected Result:**
- Status: 201 Created
- Department created with auto-generated code
- Available units listed

**cURL Command:**
```bash
curl -X POST http://localhost:8000/api/v1/hospital-admin/departments/create/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": 1,
    "head_of_department": "Dr. John Kamara",
    "phone": "+232-76-123456",
    "location": "Building A, Floor 2"
  }'
```

---

## Test 4: Add General Surgery Unit

**Endpoint:**
```
POST http://localhost:8000/api/v1/hospital-admin/departments/1/add-unit/
```

**Request Body:**
```json
{
  "unit_id": 1,
  "unit_head": "Dr. Sarah Bangura",
  "bed_capacity": 20,
  "staff_count": 8,
  "phone": "+232-76-111222",
  "location": "Building A, Floor 2, Wing B",
  "status": "operational"
}
```

**Expected Result:**
- Status: 201 Created
- Unit instance created with auto-generated code
- Unit details returned

**cURL Command:**
```bash
curl -X POST http://localhost:8000/api/v1/hospital-admin/departments/1/add-unit/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "unit_id": 1,
    "unit_head": "Dr. Sarah Bangura",
    "bed_capacity": 20,
    "staff_count": 8,
    "location": "Building A, Floor 2, Wing B"
  }'
```

---

## Test 5: Get Department Details

**Endpoint:**
```
GET http://localhost:8000/api/v1/hospital-admin/departments/1/
```

**Expected Result:**
- Department details
- List of unit instances
- List of available units (units not yet added)

**cURL Command:**
```bash
curl -X GET http://localhost:8000/api/v1/hospital-admin/departments/1/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Test 6: Get Department Units

**Endpoint:**
```
GET http://localhost:8000/api/v1/hospital-admin/departments/1/units/
```

**Expected Result:**
- Array of units in the department
- Each with bed capacity, staff count, etc.

**cURL Command:**
```bash
curl -X GET http://localhost:8000/api/v1/hospital-admin/departments/1/units/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Test 7: Update Unit

**Endpoint:**
```
PATCH http://localhost:8000/api/v1/hospital-admin/units/1/update/
```

**Request Body:**
```json
{
  "bed_capacity": 25,
  "staff_count": 10
}
```

**Expected Result:**
- Status: 200 OK
- Updated unit details

**cURL Command:**
```bash
curl -X PATCH http://localhost:8000/api/v1/hospital-admin/units/1/update/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bed_capacity": 25,
    "staff_count": 10
  }'
```

---

## Test 8: Access Control Test (Should Fail)

**Test:** Try to access another hospital's department

**Expected Result:**
- Status: 403 Forbidden
- Error message: "You can only view departments in your hospital"

---

## Test 9: Duplicate Department Test (Should Fail)

**Test:** Try to create Surgery Department again

**Expected Result:**
- Status: 400 Bad Request
- Error message: "This department already exists in your hospital"

---

## Test 10: Duplicate Unit Test (Should Fail)

**Test:** Try to add General Surgery unit again to the same department

**Expected Result:**
- Status: 400 Bad Request
- Error message: "This unit already exists in the department"

---

## Using Django REST Framework Browsable API

**Easier Testing Method:**

1. Navigate to: `http://localhost:8000/api/v1/`
2. Login with your hospital admin credentials
3. Browse to each endpoint
4. Use the built-in forms to test POST/PUT/PATCH requests

**Endpoints to Test:**
- `http://localhost:8000/api/v1/hospital-admin/department-categories/`
- `http://localhost:8000/api/v1/hospital-admin/departments/`
- `http://localhost:8000/api/v1/hospital-admin/departments/create/`

---

## Postman Collection

### Import these requests into Postman:

**1. Get Department Categories**
```
GET {{base_url}}/hospital-admin/department-categories/
Headers:
  Authorization: Bearer {{token}}
```

**2. Get My Departments**
```
GET {{base_url}}/hospital-admin/departments/
Headers:
  Authorization: Bearer {{token}}
```

**3. Create Department**
```
POST {{base_url}}/hospital-admin/departments/create/
Headers:
  Authorization: Bearer {{token}}
  Content-Type: application/json
Body (raw JSON):
{
  "category": 1,
  "head_of_department": "Dr. John Kamara",
  "phone": "+232-76-123456",
  "location": "Building A, Floor 2"
}
```

**4. Add Unit**
```
POST {{base_url}}/hospital-admin/departments/1/add-unit/
Headers:
  Authorization: Bearer {{token}}
  Content-Type: application/json
Body (raw JSON):
{
  "unit_id": 1,
  "unit_head": "Dr. Sarah Bangura",
  "bed_capacity": 20,
  "staff_count": 8,
  "location": "Building A, Floor 2, Wing B"
}
```

**Variables:**
- `base_url`: `http://localhost:8000/api/v1`
- `token`: Your JWT access token

---

## Expected Database State After Tests

### DepartmentCategory Table
- 20 records (created by init_departments_units)

### DepartmentUnit Table
- 162 records (created by init_departments_units)

### HospitalDepartment Table
- 1 record: Surgery Department at your hospital

### HospitalDepartmentUnitInstance Table
- 1 record: General Surgery unit

---

## Verification Checklist

- [ ] Can browse all 20 department categories
- [ ] Can see units for each category
- [ ] Can create a department for my hospital
- [ ] Cannot create duplicate department
- [ ] Can add units to department
- [ ] Cannot add duplicate unit
- [ ] Can view department details with units
- [ ] Can update unit information
- [ ] Can deactivate a unit
- [ ] Cannot access other hospital's departments
- [ ] Auto-generated codes are unique

---

## Common Issues & Solutions

### Issue: "You are not assigned to a hospital"
**Solution:** Assign the hospital admin user to a hospital in Django Admin

### Issue: "Department not found"
**Solution:** Check the department_id in the URL matches an existing department

### Issue: "Unit not found or does not belong to this department category"
**Solution:** Ensure the unit_id belongs to the same category as the department

### Issue: 401 Unauthorized
**Solution:** Get a fresh JWT token by logging in again

---

**Test Status:** Ready to Test  
**Date:** June 7, 2026
