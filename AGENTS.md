# Repository Guidelines

## Project Structure & Module Organization
- `handler.js`: AWS Lambda entrypoint exposing `checkDriverLicense`.
- `src/driver.license.js`: core logic supporting two providers: RIMS API (JSON-based) and scrape (HTML parsing from `safedriving.or.kr`). Uses `request-promise-native` and `cheerio` for HTTP requests and HTML parsing.
- `test/unit`: Jest unit tests (for example, `driver.license.test.js`).
- `test/data`: JSON fixtures used by tests (for example, `test.data.json`).
- `serverless.yml`: Serverless Framework configuration for the `flo-check-driver-license` service.

## Build, Test, and Development Commands
- Install dependencies: `npm install`.
- Run all tests: `npm test` (runs Jest across `test/**`).
- Run a single test file: `npx jest test/unit/driver.license.test.js`.
- Typical Serverless workflow (optional): `npx serverless deploy` to deploy, `npx serverless invoke -f chckDrvLicense` to invoke remotely.

## Environment Variables & Configuration
- `RIMS_API_BASE`: Base URL for RIMS API (required when using RIMS provider).
- `DRIVER_LICENSE_PROVIDER`: Provider selection - `'rims'` (default) or `'scrape'`. Can also be specified per request via `data.provider`.
- `RIMS_TIMEOUT_MS`: Request timeout in milliseconds (default: 15000).
- These can be set in `serverless.yml` or via `.env` file (with `useDotenv: true`).

## Coding Style & Naming Conventions
- JavaScript (Node.js 20.x compatible) with `'use strict';`.
- Indentation: 4 spaces; use single quotes and terminate statements with semicolons.
- Use camelCase for variables and functions (`makeResponse`, `driverLicense`), PascalCase for classes (`DriverLicense`).
- Keep modules small: business logic in `src/`, Lambda wiring in `handler.js`, configuration in `serverless.yml`.

## Testing Guidelines
- Testing framework: Jest.
- Place unit tests under `test/unit` and name files `*.test.js` (for example, `driver.license.test.js`).
- Use fixtures from `test/data` instead of hard-coding large payloads.
- Run `npm test` before opening a pull request; add tests for new behavior and edge cases (invalid parameters, unexpected HTML structure, RIMS API responses).
- Tests should cover both provider types (RIMS and scrape) and their respective response formats.

## Commit & Pull Request Guidelines
- Follow the existing pattern: start commit messages with the ticket ID, e.g., `FY-328 short description`.
- Keep commits focused and descriptive (what changed and why).
- Pull requests should include: a short summary, relevant issue/ticket links, test instructions (commands and expected outcome), and notes about any behavioral or configuration changes.
