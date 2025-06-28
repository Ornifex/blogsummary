# Blog Summary ![Build](https://github.com/ornifex/blogsummary/actions/workflows/deploy.yml/badge.svg)

Blog Summary is a web application that provides concise, topic-specific summaries of World of Warcraft blog posts, for now focusing exclusively on the current Retail version. Summaries are generated in fetch-latest.ts by using a free tier of Gemini's API and organized by class and content type for focused browsing.

## Features

- Serves summaries official WoW blog posts
- Summaries grouped by class and content type
- Clean, readable UI with filtering and pagination
- Built with React, TypeScript, and Vite
- Dockerized for easy deployment

## Development

1. Install dependencies:

   ```sh
   npm i
   ```

2. Run the development server:

   ```sh
   npm run dev
   ```

3. Fetch and update summaries:

   ```sh
   npx tsx fetch-latest.ts
   ```

## Deployment

The app can be deployed using Docker to Azure Web App via GitHub Actions.

See [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

### Workflow Details

1. **lint** ─┐
1. **audit** ├─▶ 4. **deploy**
1. **build** ┘

> The `lint`, `audit`, and `build` jobs run in parallel. The `deploy` job runs only after all three complete successfully.

The deployment workflow is automated using GitHub Actions and consists of the following jobs:

- **lint**: Checks out the code, sets up Node.js, installs dependencies, and runs ESLint and Prettier to ensure code quality and consistent formatting.
- **audit**: Checks out the code, sets up Node.js, installs dependencies, and runs `npm audit` to scan for security vulnerabilities in dependencies.
- **build**: Checks out the code, logs in to Docker Hub, sets up Docker Buildx, and builds the Docker image using cache for faster builds. The image is then pushed to a Docker Hub repository.
- **deploy**: Runs only if the lint, audit, and build jobs succeed. It logs in to Azure using credentials stored in GitHub Secrets, then deploys the newly built Docker image to the Azure Web App specified by `app-name`.

This workflow ensures that code is linted, checked for vulnerabilities, built, and deployed in a reliable and automated fashion. The deployment only occurs if all previous checks pass, providing a robust CI/CD pipeline.
