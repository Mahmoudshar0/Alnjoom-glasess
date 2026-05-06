You are building a production-grade Optical Shop Management System for a real optical store.

This is NOT a generic dashboard.
This is a real business system used daily in an eyewear shop.

Think like:

* Senior Full-Stack Engineer
* Product Designer
* System Architect

Your goal is to build a complete, scalable, production-ready system.

---

## PROJECT OVERVIEW

This system manages the full workflow of an optical shop:

Customer → Examination → Frame → Lens → Order → Invoice → Delivery → History

The system must support:

* multi-device usage over local network
* real data persistence
* role-based access control
* printing
* inventory management
* customer history tracking

---

## TECH STACK

Use:

* Frontend: React
* Backend: Node.js (Express or NestJS)
* Database: PostgreSQL
* Deployment: Local Network (Main machine acts as server)

The system should be easy to run locally and accessible from multiple devices.

---

## USER ROLES

### Employee

Can:

* manage customers
* add/edit examinations
* create orders
* generate invoices
* update order status
* view customer reports
* view inventory

Cannot:

* access financial reports
* manage employees

---

### Admin

Can:

* everything employee can do
* manage employees
* access financial reports
* view analytics

---

## CORE MODULES

Build these modules:

1. Authentication
2. Dashboard
3. Customers
4. Customer Profile
5. Examinations
6. Orders
7. Invoices
8. Inventory
9. Customer Reports
10. Employee Management
11. Financial Reports
12. Settings

---

## BUSINESS LOGIC

### Customers

* persistent profile
* no duplication
* searchable by name or phone

---

### Examinations

Store:

* date
* doctor
* right eye (SPH, CYL, Axis)
* left eye (SPH, CYL, Axis)
* ADD
* IPD
* height
* notes

Latest exam must be highlighted.

---

### Orders

Must link:

* customer
* examination
* products

Statuses:

* New
* In Progress
* Ready
* Delivered

---

### Inventory

Support:

* Frames
* Lenses
* Accessories

Dynamic forms based on product type.

---

### Invoices

* generated from orders
* track total / paid / remaining
* payment method
* status

---

### Customer Report

Must include:

* customer info
* exam history
* order history
* invoice summary
* outstanding balance

---

## PRINTING

Support:

* Customer Report printing
* Invoice printing

Requirements:

* A4 layout
* clean design
* no dashboard UI elements
* includes logo and branding

---

## UX REQUIREMENTS

The system must behave like a real product:

* Every button must work
* Add → opens form
* Save → stores data
* Tables update instantly
* No dead buttons
* No fake navigation

---

## RETURNING CUSTOMER EXPERIENCE

This is CRITICAL:

When opening a customer profile, show:

* latest exam
* latest frame
* latest lens
* latest invoice
* visit history

Make this fast and clear.

---

## CURRENCY

Use:
KWD (Kuwaiti Dinar)

Format:
KWD 12.500

---

## VISUAL DIRECTION

Design must feel:

* premium
* clean
* optical / medical retail
* modern SaaS

Use subtle visual inspiration from:

* glasses
* lenses
* focus / clarity

DO NOT overdesign.

---

## ARCHITECTURE

* clean folder structure
* reusable components
* API layer separation
* role-based access control
* environment configuration
* scalable design

---

## BACKUP & RESTORE

Implement:

* backup system for database
* restore functionality
* easy migration to another machine

---

## BUILD ORDER

Follow this order:

1. project setup
2. database schema
3. authentication
4. customers module
5. customer profile
6. examinations
7. inventory
8. orders
9. invoices
10. printing
11. employee management
12. financial reports
13. backup system
14. final polishing

---

## FINAL EXPECTATION

The system must:

* be fully functional
* feel like a real product
* be production-ready locally
* support multiple devices
* have clean UX
* have no broken features

Do NOT build a static UI.
Build a real working system.




___

This project is an Optical Shop Management System for a real eyewear business.

The system is used daily inside an optical store to manage customers, examinations, orders, and sales.

---

## BUSINESS PURPOSE

The system helps the shop:

* register customers
* store eye examination data
* sell frames and lenses
* track orders and deliveries
* generate invoices
* manage inventory
* handle returning customers efficiently

---

## KEY IDEA

This is not just a sales system.

It is a **customer history system**.

Each customer must have:

* full profile
* examination history
* order history
* invoice history
* visit timeline

---

## MAIN FLOW

Customer → Examination → Order → Invoice → Delivery → History

---

## IMPORTANT FEATURES

* fast customer lookup
* clear latest examination
* easy order creation
* accurate pricing
* printable reports
* real inventory tracking

---

## USER TYPES

### Employee

Handles daily operations.

### Admin

Handles management and reports.

---

## DESIGN GOAL

The system should feel:

* professional
* clean
* modern
* related to optical business

Use subtle visual inspiration from:

* glasses
* lenses
* clarity / focus

---

## SYSTEM STYLE

The system must feel like:

* a real business tool
* not a template
* not a demo
* not a static design

---

## FINAL GOAL

Build a system that:

* works in real life
* can be used inside a shop
* is easy for employees
* is powerful for managers
* is ready for production use

This should feel like a real SaaS product built specifically for optical stores.
