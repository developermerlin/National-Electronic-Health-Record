# Hospital Department Structure Guide

## Overview

This system implements a comprehensive, professional hospital department structure with 13 major departments and 162 specialized sub-units. The structure is designed to support real-world hospital operations in Sierra Leone and similar healthcare systems.

---

## Architecture

### 4-Layer Department Model

1. **DepartmentCategory** - Master list of department types (Surgery, ICU, Laboratory, etc.)
2. **DepartmentUnit** - Sub-units within each category (General Surgery, Hematology Lab, etc.)
3. **HospitalDepartment** - Actual department instances in specific hospitals
4. **HospitalDepartmentUnitInstance** - Specific unit instances within hospital departments

### Benefits of This Structure

✅ **Standardization** - All hospitals use the same department/unit definitions  
✅ **Flexibility** - Hospitals can activate only the departments/units they have  
✅ **Scalability** - Easy to add new departments or units system-wide  
✅ **Tracking** - Individual management of each unit (beds, staff, location)  
✅ **Reporting** - Consistent data structure for national-level analytics

---

## Department Categories (13 Total)

### 1. **Surgery Department** (14 units)
- General Surgery
- Orthopedic Surgery
- Neurosurgery
- Cardiothoracic Surgery
- Plastic & Reconstructive Surgery
- Urology
- Vascular Surgery
- Pediatric Surgery
- Trauma Surgery
- Laparoscopic Surgery
- Surgical Outpatient Clinic
- Pre-Operative Unit
- Post-Operative Unit
- Operating Theatre

### 2. **ICU Department** (8 units)
- General ICU
- Medical ICU (MICU)
- Surgical ICU (SICU)
- Cardiac ICU (CICU)
- Pediatric ICU (PICU)
- Neonatal ICU (NICU)
- High Dependency Unit (HDU)
- Critical Care Monitoring Unit

### 3. **Laboratory Department** (10 units)
- Hematology Laboratory
- Clinical Chemistry Laboratory
- Microbiology Laboratory
- Parasitology Laboratory
- Immunology Laboratory
- Serology Laboratory
- Histopathology Laboratory
- Cytology Laboratory
- Blood Bank / Transfusion Services
- Molecular Diagnostics Laboratory

### 4. **Radiology Department** (8 units)
- X-Ray Unit
- Ultrasound Unit
- CT Scan Unit
- MRI Unit
- Mammography Unit
- Fluoroscopy Unit
- Interventional Radiology Unit
- Nuclear Medicine Unit

### 5. **Medical Department (General Medicine)** (13 units)
- Internal Medicine
- Cardiology
- Neurology
- Gastroenterology
- Nephrology
- Pulmonology
- Endocrinology
- Rheumatology
- Dermatology
- Infectious Diseases
- Oncology
- Geriatrics
- Family Medicine

### 6. **Dental Department** (9 units)
- General Dentistry
- Oral Surgery
- Orthodontics
- Prosthodontics
- Periodontics
- Endodontics
- Pediatric Dentistry
- Oral Medicine
- Oral Radiology

### 7. **Physiotherapy Department** (8 units)
- Orthopedic Physiotherapy
- Neurological Physiotherapy
- Pediatric Physiotherapy
- Sports Physiotherapy
- Cardiopulmonary Physiotherapy
- Geriatric Physiotherapy
- Rehabilitation Unit
- Occupational Therapy Unit

### 8. **Ophthalmology Department** (9 units)
- General Eye Clinic
- Cataract Unit
- Glaucoma Unit
- Retina Unit
- Cornea Unit
- Pediatric Ophthalmology
- Oculoplastic Surgery
- Refraction & Optical Services
- Low Vision Clinic

### 9. **ENT Department** (8 units)
- General ENT Clinic
- Otology (Ear Disorders)
- Rhinology (Nose Disorders)
- Laryngology (Throat Disorders)
- Audiology Unit
- Speech Therapy Unit
- Head & Neck Surgery
- Pediatric ENT

### 10. **Psychiatry Department** (9 units)
- General Psychiatry
- Child & Adolescent Psychiatry
- Adult Psychiatry
- Geriatric Psychiatry
- Addiction Medicine
- Clinical Psychology
- Counseling Services
- Psychiatric Rehabilitation
- Community Mental Health

### 11. **In-Patient Department (IPD)** (9 units)
- Male Medical Ward
- Female Medical Ward
- Surgical Ward
- Pediatric Ward
- Maternity Ward
- Private Ward
- ICU Ward
- Isolation Ward
- High Dependency Unit (HDU)

### 12. **Out-Patient Department (OPD)** (11 units)
- General OPD
- Specialist OPD
- Medical OPD
- Surgical OPD
- Pediatric OPD
- ENT OPD
- Eye Clinic OPD
- Dental OPD
- Physiotherapy OPD
- Psychiatry OPD
- Follow-Up Clinic

### 13. **Pediatrics Department** (12 units)
- General Pediatrics
- Neonatology
- Pediatric Cardiology
- Pediatric Neurology
- Pediatric Nephrology
- Pediatric Oncology
- Pediatric Endocrinology
- Pediatric Gastroenterology
- Pediatric Pulmonology
- Pediatric Intensive Care Unit (PICU)
- Child Development Clinic
- Immunization Clinic

### Additional Departments

- **Emergency / Casualty** (5 units)
- **Pharmacy** (5 units)
- **Maternity / Obstetrics** (6 units)
- **Medical Records** (4 units)
- **Administration** (5 units)
- **Triage** (3 units)
- **Other** (6 units - Nutrition, Social Services, etc.)

---

## Setup Instructions

### 1. Run Migrations

```bash
cd backend
python manage.py migrate
```

### 2. Initialize Departments and Units

```bash
python manage.py init_departments_units
```

This command will create:
- **20 Department Categories**
- **162 Department Units**

### 3. Verify in Django Admin

Navigate to: `http://localhost:8000/admin/`

You should see:
- Department Categories
- Department Units
- Hospital Departments
- Hospital Department Unit Instances

---

## API Endpoints

### Department Categories

```
GET    /api/v1/department-categories/              # List all categories
GET    /api/v1/department-categories/{id}/         # Get category details
GET    /api/v1/department-categories/with_units/   # Get all categories with units
GET    /api/v1/department-categories/{id}/units/   # Get units for a category
POST   /api/v1/department-categories/              # Create category (admin)
PUT    /api/v1/department-categories/{id}/         # Update category
DELETE /api/v1/department-categories/{id}/         # Delete category
```

### Department Units

```
GET    /api/v1/department-units/                   # List all units
GET    /api/v1/department-units/{id}/              # Get unit details
GET    /api/v1/department-units/?category={id}     # Filter by category
POST   /api/v1/department-units/                   # Create unit (admin)
PUT    /api/v1/department-units/{id}/              # Update unit
DELETE /api/v1/department-units/{id}/              # Delete unit
```

### Hospital Departments

```
GET    /api/v1/hospital-departments/                      # List hospital departments
GET    /api/v1/hospital-departments/{id}/                 # Get department details
GET    /api/v1/hospital-departments/?hospital={id}        # Filter by hospital
GET    /api/v1/hospital-departments/{id}/available_units/ # Get units that can be added
GET    /api/v1/hospital-departments/{id}/statistics/      # Get department stats
POST   /api/v1/hospital-departments/                      # Create department
POST   /api/v1/hospital-departments/{id}/add_unit/        # Add unit to department
PUT    /api/v1/hospital-departments/{id}/                 # Update department
DELETE /api/v1/hospital-departments/{id}/                 # Delete department
```

### Hospital Department Unit Instances

```
GET    /api/v1/hospital-department-units/                 # List all unit instances
GET    /api/v1/hospital-department-units/{id}/            # Get unit instance details
GET    /api/v1/hospital-department-units/?hospital={id}   # Filter by hospital
GET    /api/v1/hospital-department-units/?department={id} # Filter by department
POST   /api/v1/hospital-department-units/                 # Create unit instance
PUT    /api/v1/hospital-department-units/{id}/            # Update unit instance
DELETE /api/v1/hospital-department-units/{id}/            # Delete unit instance
```

---

## Usage Examples

### Example 1: Create a Hospital Department

```json
POST /api/v1/hospital-departments/

{
  "hospital": 1,
  "category": 1,  // Surgery Department
  "head_of_department": "Dr. John Kamara",
  "head_user": 5,
  "phone": "+232-76-123456",
  "email": "surgery@hospital.sl",
  "location": "Building A, Floor 2",
  "status": "active",
  "is_active": true
}
```

### Example 2: Add a Unit to a Department

```json
POST /api/v1/hospital-departments/1/add_unit/

{
  "unit_id": 3,  // General Surgery
  "unit_head": "Dr. Sarah Bangura",
  "unit_head_user": 12,
  "bed_capacity": 20,
  "staff_count": 8,
  "phone": "+232-76-654321",
  "location": "Building A, Floor 2, Wing B",
  "status": "operational",
  "is_active": true
}
```

### Example 3: Get All Departments for a Hospital

```
GET /api/v1/hospital-departments/?hospital=1
```

### Example 4: Get Available Units for a Department

```
GET /api/v1/hospital-departments/1/available_units/
```

---

## Database Schema

### DepartmentCategory
- `id` - Primary key
- `name` - Category code (surgery, icu, laboratory, etc.)
- `display_name` - Full display name
- `description` - Category description
- `is_active` - Active status
- `created_at`, `updated_at` - Timestamps

### DepartmentUnit
- `id` - Primary key
- `category` - ForeignKey to DepartmentCategory
- `name` - Unit name
- `code` - Auto-generated unique code
- `description` - Unit description
- `is_active` - Active status
- `created_at`, `updated_at` - Timestamps

### HospitalDepartment
- `id` - Primary key
- `hospital` - ForeignKey to Hospital
- `category` - ForeignKey to DepartmentCategory
- `department_code` - Auto-generated unique code
- `head_of_department` - Department head name
- `head_user` - ForeignKey to User
- `phone`, `email`, `location` - Contact info
- `status` - Department status
- `is_active` - Active status
- `created_by`, `created_at`, `updated_at` - Audit fields

### HospitalDepartmentUnitInstance
- `id` - Primary key
- `hospital_department` - ForeignKey to HospitalDepartment
- `unit` - ForeignKey to DepartmentUnit
- `unit_code` - Auto-generated unique code
- `unit_head` - Unit head name
- `unit_head_user` - ForeignKey to User
- `bed_capacity` - Number of beds
- `staff_count` - Number of staff
- `phone`, `location` - Contact info
- `status` - Unit status
- `is_active` - Active status
- `created_at`, `updated_at` - Timestamps

---

## Frontend Integration (To Be Implemented)

### Recommended Components

1. **DepartmentCategoryList** - View all department categories
2. **DepartmentUnitList** - View units by category
3. **HospitalDepartmentManagement** - Manage hospital departments
4. **DepartmentUnitAssignment** - Add/remove units from departments
5. **DepartmentDashboard** - Department statistics and overview

### Sample React Component Structure

```jsx
// Example: Hospital Department Management
<HospitalDepartmentList hospital={hospitalId}>
  <DepartmentCard department={dept}>
    <UnitList units={dept.unit_instances} />
    <AddUnitButton availableUnits={dept.available_units} />
  </DepartmentCard>
</HospitalDepartmentList>
```

---

## Best Practices

1. **Initialize Once** - Run `init_departments_units` only once per system
2. **Hospital-Specific** - Each hospital activates only the departments they have
3. **Unit Assignment** - Add units to departments as they become operational
4. **Staff Assignment** - Link users to departments/units via `head_user` and `unit_head_user`
5. **Bed Tracking** - Update `bed_capacity` for ward-type units
6. **Status Management** - Use status fields to track operational state

---

## Migration History

- **Migration 0037** - `add_department_categories_units`
  - Created DepartmentCategory model
  - Created DepartmentUnit model
  - Created HospitalDepartment model
  - Created HospitalDepartmentUnitInstance model

---

## Support

For questions or issues with the department structure:
1. Check Django admin for data verification
2. Review API endpoints using Django REST Framework browsable API
3. Check migration status: `python manage.py showmigrations userauths`

---

**Last Updated:** June 7, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
