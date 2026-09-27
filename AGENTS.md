# AI Coding Agent Guidelines

This document establishes the strict operational boundaries and rules for any AI Coding Agent interacting with this repository. 
**The AI MUST read, understand, and strictly adhere to these rules before proposing or executing any changes.**

## 🛑 Core Principles
1. **Preserve First. Modify Second.**
2. **Minimal Change Over Rewrite.**
3. **Existing Architecture Is the Source of Truth.**
4. **Never make architectural decisions on behalf of the user.** 
   The assumption that "code can be written better" is NEVER a valid justification for altering architecture or business logic.

## 🚫 Strictly Prohibited Actions
Without explicit, unambiguous authorization from the user, the AI is STRICTLY FORBIDDEN to:
- Alter the system architecture.
- Change the technology stack.
- Modify the Database Schema or Data Models.
- Alter existing Business Logic.
- Delete existing files or functions based on an assumption that they are unnecessary.
- Modify API Contracts (endpoints, request/response payloads).
- Change n8n Workflows, Nodes, Triggers, or Data Flows.
- Rename existing files, folders, or modules.
- Introduce new dependencies or libraries without first analyzing the impact (especially if the issue can be resolved with existing code).
- Modify `.env`, Secrets, Credentials, or any sensitive configurations.
- Build new systems or components that duplicate existing functionality.
- Perform large-scale refactoring or project-wide code formatting.
- Modify any files completely unrelated to the specific assigned task.

*If a requirement is ambiguous, or if fixing a bug seemingly requires violating these rules, the AI MUST STOP and ask the user for clarification.*

## 🚥 Levels of Change

### Level 1 — Safe Change (Pre-approved for execution if requirements are clear)
- Bug Fixes
- UI/UX Fixes
- Validation Fixes
- Error Handling improvements
- Adding small, isolated functions
- Adding Unit/Integration Tests

### Level 2 — Controlled Change (Impact must be explained BEFORE execution)
- Adding new API endpoints
- Adding new Database Tables or Columns
- Adding new n8n Nodes to an existing workflow
- Adding minor dependencies
- Altering existing Data Flow
- Modifying Business Logic

### Level 3 — Architecture Change (NEVER automatic; requires explicit user approval)
- Changing Frameworks or Languages
- Changing Database paradigms (e.g., SQL to NoSQL)
- Changing Backend, Frontend, or Workflow Architecture
- Altering Authentication/Authorization mechanisms
- System Rewrites or major Migrations

## 📋 Pre-Modification Workflow
Before making ANY code changes, the AI MUST execute the following sequence:
1. **Read `AGENTS.md` and `DESIGN.md`.**
2. **Analyze relevant files** tied directly to the user's prompt.
3. **Identify the root cause** (if resolving a bug).
4. **List the files to be modified** and evaluate the system-wide impact.
5. **Execute minimal required changes** (Do not touch unrelated files).
6. **Verify compatibility** with project constraints (Types, Linting, Build, Tests).
7. **Confirm structural integrity** (ensure original architecture remains intact).
8. **Summarize the changes** concisely for the user.