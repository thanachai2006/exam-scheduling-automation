# System Design & Architecture (DESIGN.md)

This document outlines the core architecture, data flow, and critical components of the `exam-scheduling-automation` project. AI agents must use this file as the absolute reference for the system's structural truth.

## 🏗 Core Architecture
*   **Frontend:** [Insert Tech Stack, e.g., React, Next.js, Vue]
*   **Backend:** [Insert Tech Stack, e.g., Node.js, Express, NestJS]
*   **Database:** [Insert DB Engine, e.g., PostgreSQL, MongoDB]
*   **Automation:** n8n Workflow Engine
*   **Package Manager / Runtime:** [e.g., npm, yarn, pnpm / Node v20]
*   **Deployment:** Docker / Docker Compose

## 📂 Project Structure & Critical Files
*   `frontend/`: Contains the UI components.
*   `backend/`: Contains the core API and business logic.
*   `database/`: Migrations, schemas, and seed data.
*   `n8n/`: Exported workflow JSON files and custom node configurations.

### Critical Files (Handle with Extreme Caution)
*   `docker-compose.yml`: Main infrastructure configuration.
*   `[Path to Schema file]`: Database source of truth.
*   `[Path to main API router]`: Core API definitions.
*   `[Path to n8n workflow file]`: Core scheduling automation flow.

## 🔄 Data Flow & Business Logic
1.  **Frontend to Backend:** [Describe authentication, typical payload]
2.  **Backend to Database:** [Describe ORM/Query builder used]
3.  **Backend to n8n:** [Describe how triggers occur - e.g., Webhooks vs Polling]
4.  **Scheduling Logic:** [Describe the core constraints, e.g., room availability, proctor limits]

## 🛡 Constraint & Validation Rules
*   **Naming Conventions:** [e.g., camelCase for variables, PascalCase for components]
*   **Coding Conventions:** [e.g., ESLint standard, strict TypeScript]
*   **Database Constraints:** [e.g., cascading deletes, unique indexing rules]

## 📝 AI Modification Boundaries
*   **Files AI Can Safely Edit:** UI components, isolated utility functions, test files.
*   **Files AI CANNOT Edit Without Permission:** `docker-compose.yml`, Database Migrations, Core Authentication middleware, n8n Workflow JSONs.
*   **Generated Files:** [e.g., Prisma client, dist folders] - AI must NEVER manually edit these.