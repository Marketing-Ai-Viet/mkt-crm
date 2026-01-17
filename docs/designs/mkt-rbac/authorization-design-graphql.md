# Thiết Kế Hệ Thống Phân Quyền RBAC + ABAC với Casbin cho Twenty CRM (GraphQL)

## 📋 Table of Contents
- [1. Tổng Quan](#1-tổng-quan)
- [2. Kiến Trúc Hệ Thống](#2-kiến-trúc-hệ-thống)

## 1. Tổng Quan

### 1.1. Objectives
- **Hybrid Authorization**: Kết hợp RBAC (role-based) và ABAC (attribute-based)
- **GraphQL Native**: Deep integration với GraphQL resolvers và directives
- **Field-Level Control**: Fine-grained permissions đến từng field trong GraphQL
- **Twenty CRM Compatible**: Tích hợp với Twenty's workspace và metadata architecture
- **Scalability**: Hỗ trợ 6000+ concurrent users

### 1.2. Core Concepts

#### RBAC Layer (Base Authorization)
- Query/Mutation level permissions
- Role hierarchy support
- Workspace-aware authorization
- Fast permission lookup với caching

#### ABAC Layer (Fine-grained Control)
- Field-level authorization
- Context-aware policies
- Resource ownership checks
- Time/location/department-based rules

#### GraphQL Integration
- Custom directives: `@requirePermission`, `@authorized`, `@hasRole`
- Context-based authorization
- Field resolvers với dynamic filtering
- DataLoader pattern cho batch authorization

### 1.3. Technology Stack
- **Authorization Engine**: Casbin
- **GraphQL**: Apollo Server + NestJS GraphQL
- **Database**: PostgreSQL (policy storage)
- **Cache**: Redis (permission cache)
- **ORM**: TypeORM
- **Framework**: NestJS

---

## 2. Kiến Trúc Hệ Thống

### 2.1. GraphQL Authorization Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. GraphQL Request (Query/Mutation)
     ▼
┌─────────────────────────────────────────────┐
│         Apollo Server / GraphQL Engine      │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Context Builder                     │  │
│  │  - Extract user from JWT             │  │
│  │  - Load workspace context            │  │
│  │  - Build authorization context       │  │
│  └──────────────┬───────────────────────┘  │
└─────────────────┼───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│      GraphQL Directive Processing           │
│                                             │
│  @requirePermission ──┐                     │
│  @authorized ─────────┼─► Authorization    │
│  @hasRole ────────────┘    Check           │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│       Authorization Service Layer           │
│  ┌──────────────┐  ┌──────────────┐        │
│  │ RBAC Engine  │  │ Cache Layer  │        │
│  │  (Casbin)    │  │   (Redis)    │        │
│  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                 │
│  ┌──────▼──────────────────▼───────┐        │
│  │    ABAC Policy Evaluator        │        │
│  └──────────────┬───────────────────┘        │
└─────────────────┼───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│            Resolver Execution               │
│  ┌───────────────┐  ┌──────────────┐       │
│  │ Query         │  │ Field        │       │
│  │ Resolvers     │  │ Resolvers    │       │
│  └───────┬───────┘  └──────┬───────┘       │
│          │                  │                │
│          └──────┬───────────┘                │
│                 │                            │
│         ┌───────▼────────┐                  │
│         │ Data Filtering │                  │
│         │ (Field-level)  │                  │
│         └────────────────┘                  │
└─────────────────┼───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│        PostgreSQL + TypeORM                 │
│   (Policies, Roles, Permissions, Audit)     │
└─────────────────────────────────────────────┘
```

### 2.2. Authorization Layers

#### Layer 1: Operation-Level (Query/Mutation)
- Directive: `@requirePermission(resource: "license", action: "read")`
- Check: Có được phép execute query/mutation không?
- Fast: RBAC cached lookup

#### Layer 2: Object-Level (Entity)
- Directive: `@authorized`
- Check: Có được phép access entity instance này không?
- Logic: Ownership, workspace membership, ABAC rules

#### Layer 3: Field-Level (Properties)
- Directive: `@requirePermission(resource: "user", action: "read:email")`
- Check: Có được phép xem field này không?
- Use case: Hide sensitive fields (salary, SSN, etc.)

*Document version: 2.0 (GraphQL)*  
*Last updated: 2026-01-08*  
*Author: Design cho MKT Software Management with Twenty CRM*
