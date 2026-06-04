# Contributing to Project Patak

Thank you for your interest in contributing to Project Patak! As a civic tech project, we welcome community involvement to improve tracking service reliability and utility outages in the Philippines.

Please take a moment to review this document to understand our development workflows and guidelines.

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful, inclusive, and collaborative environment. Please report any harassment or inappropriate behavior to the project maintainers.

---

## Getting Started

### 1. Fork and Clone the Repository
Fork the repository on GitHub, then clone your fork locally:

```bash
git clone https://github.com/YOUR-USERNAME/patak.git
cd patak
```

### 2. Local Setup
Follow the environment configuration and dependency setup outlined in the [README.md](README.md) to set up the local Nuxt server and the Python scraper virtual environment.

---

## Development Workflow

### Branch Naming Conventions
Create a new branch off the `main` branch. Use clear prefixes for your branch names:
*   `feature/` for new features (e.g., `feature/map-legend`)
*   `bugfix/` for bug fixes (e.g., `bugfix/date-regex-parsing`)
*   `refactor/` for code refactoring (e.g., `refactor/db-client-error-handling`)
*   `docs/` for documentation updates (e.g., `docs/api-guide`)

```bash
git checkout -b feature/your-branch-name
```

### Coding Standards
*   **JavaScript/TypeScript**: We use Nuxt 3 standards. Write clean, modular Vue 3 components and API routes. Use TypeScript types for safety.
*   **Python**: Follow PEP 8 guidelines. Keep scraping selectors decoupled and document regex matches.
*   **Styling**: Use Tailwind CSS classes. Avoid arbitrary utility values where possible; prefer standard Tailwind tokens.

### Commit Messages
We encourage clear, structured commit messages describing what changes were made and why.
*   *Good*: `fix(scraper): correct date regex for meralco split layouts`
*   *Bad*: `fixed stuff`

---

## Submitting a Pull Request

1.  **Format and lint** your code locally to ensure it is clean.
2.  **Verify the changes** by running the dev server and test scraper run.
3.  **Push your changes** to your fork:
    ```bash
    git push origin feature/your-branch-name
    ```
4.  Open a Pull Request on the main repository comparing your branch to `main`.
5.  Provide a clear description of the problem solved and include any screenshots for UI adjustments.

Once submitted, project maintainers will review your PR and provide feedback. Thank you for making Project Patak better!
