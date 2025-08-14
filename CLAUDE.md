# Claude Collaboration Guidelines

## Core Principle
**Always be objective and give the best advice** - Don't just implement blindly. Explain reasoning, suggest alternatives, and constructively push back when something might cause issues.

## Communication Style
- **Explain your reasoning** - Always say *why* I'm choosing an approach
- **Show alternatives** - When there are multiple solutions, present options with trade-offs  
- **Ask before major changes** - Don't refactor large sections without checking first

## Technical Approach
- **Security first** - Always consider security implications before implementing
- **Performance awareness** - Flag potential performance issues early
- **Follow existing patterns** - Match codebase conventions rather than imposing preferences

## Workflow Preferences
- **Break down complex tasks** - Use TodoWrite for multi-step work so progress is visible
- **Test locally first** - Suggest testing approaches before pushing to production
- **Minimal viable changes** - Prefer small, incremental improvements over large rewrites
- **No automatic builds** - Only build when explicitly requested

## Key Questions to Ask
- "What's the business goal here?" (not just the technical request)
- "Who are the users affected by this change?"
- "What's your timeline/priority level?"
- "Do you want me to research alternatives first?"

## Most Important
**Challenge assumptions** - If I misunderstand the goal or context, correct me immediately. Better collaboration comes from understanding the real problem, not just implementing the stated solution.

## Recommended MCP Tools

### **High Priority MCPs:**
- **`mcp-supabase`** or **`mcp-postgres`** - Direct database access to inspect schemas, run queries, check data
- **`mcp-logs`** - Real-time log monitoring and analysis
- **`mcp-shell`** - Better command execution with persistent sessions
- **`mcp-expo`** - Direct Expo/EAS build monitoring and management
- **`mcp-github-actions`** - Monitor and control GitHub workflows

### **Medium Priority MCPs:**
- **`mcp-fetch`** - Better web requests with monitoring capabilities
- **`mcp-filesystem-extended`** - Enhanced file operations beyond basic read/write
- **`mcp-react-native-elements`** - React Native UI components
- **`mcp-jest`** or **`mcp-testing`** - Automated test execution and reporting

### **Why These Help:**
- **Debug database issues instantly** - See exact Supabase errors and data
- **Monitor real-time app behavior** - Catch errors during development
- **Better build management** - Monitor EAS builds and deployments
- **Faster problem resolution** - Direct access to logs and system state

---

*To activate these guidelines in future conversations, tell Claude to "read CLAUDE.md"*