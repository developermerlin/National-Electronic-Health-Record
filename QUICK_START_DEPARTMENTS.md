# Quick Start Guide - Hospital Departments

## 🚀 Quick Setup (5 Minutes)

### 1. Initialize Departments (One-Time Only)
```bash
cd backend
python manage.py init_departments_units
```

**Expected Output:**
```
✓ Created category: Surgery Department
  ✓ Created unit: General Surgery
  ✓ Created unit: Orthopedic Surgery
  ...
Department Categories Created: 20
Department Units Created: 162
✓ Department initialization complete!
```

### 2. Verify in Django Admin
```
URL: http://localhost:8000/admin/
Login with your admin credentials

Navigate to:
- Department Categories (20 items)
- Department Units (162 items)
```

---

## 📋 What You Got

### 13 Major Departments
1. **Surgery** (14 units) - General, Orthopedic, Neurosurgery, etc.
2. **ICU** (8 units) - General ICU, MICU, SICU, PICU, NICU
3. **Laboratory** (10 units) - Hematology, Chemistry, Microbiology
4. **Radiology** (8 units) - X-Ray, CT, MRI, Ultrasound
5. **Medical** (13 units) - Cardiology, Neurology, Oncology
6. **Dental** (9 units) - General, Oral Surgery, Orthodontics
7. **Physiotherapy** (8 units) - Orthopedic, Neurological, Sports
8. **Ophthalmology** (9 units) - Cataract, Glaucoma, Retina
9. **ENT** (8 units) - Ear, Nose, Throat specialists
10. **Psychiatry** (9 units) - Mental health services
11. **IPD** (9 units) - In-patient wards
12. **OPD** (11 units) - Out-patient clinics
13. **Pediatrics** (12 units) - Child health services

Plus: Emergency, Pharmacy, Maternity, Records, Admin, Triage, Other

---

## 🔗 Key API Endpoints

### Browse All Departments & Units
```
GET /api/v1/department-categories/with_units/
```

### Create Hospital Department
```
POST /api/v1/hospital-departments/
{
  "hospital": 1,
  "category": 1,  // Surgery
  "head_of_department": "Dr. John Kamara",
  "phone": "+232-76-123456"
}
```

### Add Unit to Department
```
POST /api/v1/hospital-departments/1/add_unit/
{
  "unit_id": 1,  // General Surgery
  "bed_capacity": 20,
  "staff_count": 8
}
```

### Get Hospital's Departments
```
GET /api/v1/hospital-departments/?hospital=1
```

---

## 📊 Data Structure

```
Hospital
  └── HospitalDepartment (e.g., Surgery Department)
       ├── Category: Surgery
       ├── Head: Dr. John Kamara
       └── Units:
            ├── General Surgery (20 beds, 8 staff)
            ├── Orthopedic Surgery (15 beds, 6 staff)
            └── Neurosurgery (10 beds, 5 staff)
```

---

## 🎯 Common Tasks

### Task 1: View All Department Types
```
Django Admin → Department Categories
or
GET /api/v1/department-categories/
```

### Task 2: View Units for Surgery Department
```
Django Admin → Department Units → Filter by "Surgery"
or
GET /api/v1/department-units/?category=1
```

### Task 3: Setup Surgery Department for a Hospital
```python
# Via Django Admin or API
1. Create HospitalDepartment (Hospital + Surgery Category)
2. Add units: General Surgery, Orthopedic Surgery, etc.
3. Assign heads, beds, staff for each unit
```

### Task 4: Get Department Statistics
```
GET /api/v1/hospital-departments/1/statistics/
```

---

## 💡 Pro Tips

1. **Don't Re-Initialize** - Run `init_departments_units` only once
2. **Hospital-Specific** - Each hospital activates only departments they have
3. **Gradual Setup** - Add departments and units as they become operational
4. **Track Everything** - Use bed_capacity and staff_count for resource planning
5. **Use Codes** - Auto-generated codes ensure unique identification

---

## 🔍 Quick Reference

| Model | Purpose | Example |
|-------|---------|---------|
| DepartmentCategory | Master list of department types | Surgery, ICU, Laboratory |
| DepartmentUnit | Sub-units within categories | General Surgery, Hematology Lab |
| HospitalDepartment | Actual department in a hospital | Surgery Dept at Connaught Hospital |
| HospitalDepartmentUnitInstance | Specific unit in a hospital | General Surgery Unit at Connaught |

---

## 📚 Full Documentation

- **Complete Guide**: `DEPARTMENT_STRUCTURE_GUIDE.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Models**: `backend/userauths/models.py` (lines 349-538)

---

## ✅ Checklist

- [ ] Run `python manage.py init_departments_units`
- [ ] Verify 20 categories in Django Admin
- [ ] Verify 162 units in Django Admin
- [ ] Test API endpoints
- [ ] Create first hospital department
- [ ] Add units to department
- [ ] Build frontend components (next step)

---

**Ready to use!** 🎉
