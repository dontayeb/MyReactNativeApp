# Contributing to EasyWealthGuide

Thank you for your interest in contributing to EasyWealthGuide! This document provides guidelines and instructions for contributing to this project.

## Development Workflow

### Branch Strategy (Git Flow)

We use Git Flow for our branching strategy:

- `master`: Production-ready code only
- `develop`: Integration branch for features
- `feature/*`: Individual features
- `hotfix/*`: Critical bug fixes for production
- `release/*`: Release preparation

### Getting Started

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd MyReactNativeApp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development**:
   ```bash
   npx expo start
   ```

### Creating a New Feature

1. **Create a feature branch from develop**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write clean, documented code
   - Follow existing code style and patterns
   - Add tests if applicable

3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

4. **Push and create pull request**:
   ```bash
   git push origin feature/your-feature-name
   # Create PR to develop branch via GitHub/GitLab
   ```

## Code Style Guidelines

### Commit Messages

We follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build system, dependencies, etc.

**Examples:**
```
feat(auth): add two-factor authentication
fix(dashboard): correct currency conversion calculation
docs: update installation instructions
refactor(api): simplify error handling logic
```

### TypeScript Guidelines

- Use strict TypeScript configuration
- Define proper interfaces and types
- Avoid `any` type unless absolutely necessary
- Use meaningful variable and function names

### React Native Guidelines

- Use functional components with hooks
- Follow React Native best practices
- Implement proper error boundaries
- Use proper styling patterns (StyleSheet)

### Security Guidelines

- Never commit sensitive data (.env files, keys, etc.)
- Use proper encryption for sensitive information
- Follow secure coding practices
- Validate all user inputs

## Testing

- Write unit tests for utility functions
- Test React components with React Native Testing Library
- Test API integration points
- Ensure all tests pass before submitting PR

## Documentation

- Update README.md for significant changes
- Document new features and APIs
- Keep inline code comments minimal but meaningful
- Update relevant .md files in the repository

## Pull Request Process

1. **Ensure your PR**:
   - Has a clear title and description
   - References any related issues
   - Includes tests for new functionality
   - Updates documentation as needed

2. **PR Requirements**:
   - All tests must pass
   - Code must be reviewed by at least one maintainer
   - No merge conflicts with develop branch
   - Follow the established code style

3. **After Approval**:
   - PR will be merged by a maintainer
   - Feature branch will be deleted
   - Update your local develop branch

## Release Process

1. **Create release branch**:
   ```bash
   git checkout develop
   git checkout -b release/v1.1.0
   ```

2. **Prepare release**:
   - Update version numbers
   - Update changelog
   - Final testing and bug fixes

3. **Merge to master**:
   ```bash
   git checkout master
   git merge release/v1.1.0
   git tag v1.1.0
   git push origin master --tags
   ```

4. **Merge back to develop**:
   ```bash
   git checkout develop
   git merge master
   git push origin develop
   ```

## Getting Help

- Check existing issues and documentation
- Ask questions in pull request comments
- Contact maintainers for complex issues

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a positive environment
- Follow professional communication standards

Thank you for contributing to EasyWealthGuide!