# iHomeNerd Class And Take-Home Flow

**Status:** concept draft  
**Date:** 2026-04-24  
**Owner:** Alex

---

## 1. Goal

Support teacher-led or host-led temporary shared environments without trapping
students or friends inside someone else’s long-term trust domain.

## 2. Trust domains

### 2.1 Teacher personal Home

The teacher’s normal Home should remain private to the teacher.

### 2.2 Class domain

A class should use a temporary **class CA** and class-scoped trust domain.

Properties:
- scoped to one course / cohort / workshop
- revocable
- can expire at course end
- separate from the teacher’s personal Home CA

### 2.3 Student personal Home

When a student takes the setup home, they should get:
- a new personal Home CA
- their own node ownership
- their own long-term trust boundary

## 3. Classroom / group flow

1. Teacher or host starts `Class Mode` or `Session Mode`
2. iHN creates or activates a temporary class CA
3. Students join via QR, pairing link, or local-network bootstrap
4. Shared drills, model packs, and allowed assets are available
5. Students can use the temporary shared environment during class

## 4. Take-home flow

1. Student taps `Create my own Home`
2. iHN asks for target device:
- Android study node
- laptop
- mini-PC / home box
3. iHN creates a new personal Home CA
4. Only allowed assets move over:
- course pack
- drills
- progress
- teacher-approved content
5. Student’s new Home becomes independent
6. Class trust can later expire without breaking the student’s personal Home

## 5. What transfers

Allowed:
- course assets
- study packs
- progress
- recommended model packs
- teacher-approved materials

Not allowed by default:
- teacher admin rights
- teacher personal Home trust
- other students’ data
- long-term dependency on class CA

## 6. UX concepts

Useful product labels:
- `Class Mode`
- `Session Mode`
- `Take this Home`
- `Create my own Home`
- `Graduate from this session`

## 7. Why this matters

Without this boundary, a clever temporary-session story becomes unsafe or
socially awkward:
- students remain in teacher trust domain
- friends remain in host trust domain
- rotation and revocation get messy

With this boundary, iHN can support:
- classes
- workshops
- travel sessions
- shared study groups

without collapsing ownership.
