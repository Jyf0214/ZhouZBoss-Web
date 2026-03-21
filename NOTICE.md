# NOTICE - Third-Party Code Attribution

## LobeChat UI Components

This project includes UI components and design patterns copied from the LobeChat project.

### Source Project
- **Name**: LobeChat
- **Repository**: https://github.com/lobehub/lobe-chat
- **Branch**: canary
- **Commit**: 81bd6dc7321d269288755668a6820589fcb54bb6
- **Last Commit**: 📝 docs: add changelog entries for Jan–Mar 2026 (#13163)
- **Author**: LobeChat Team <i@lobehub.com>
- **License**: MIT
- **Copyright**: © LobeHub. All rights reserved.

### Files Copied/Adapted

#### Core Components
1. `components/AuthCard.tsx` - Authentication card component
2. `components/AuthLayout.tsx` - Authentication page layout
3. `components/style.ts` - CSS-in-JS styles for auth components

#### Pages
1. `app/login/page.tsx` - Sign-in page with two-step flow
2. `app/register/page.tsx` - Sign-up page

#### Constants
1. `const/branding.ts` - Branding constants (inspired by `packages/business/const/src/branding.ts`)
2. `const/url.ts` - URL constants (inspired by `packages/const/src/url.ts`)

#### Hooks
1. `hooks/useIsDark.ts` - Theme detection hook

#### Utilities
1. `lib/utils/env.ts` - Environment detection utilities
2. `lib/utils/platform.ts` - Platform and browser detection utilities

### Design Patterns
- Two-step authentication flow (email → password)
- Input field with embedded action buttons
- CSS-in-JS styling using `antd-style`
- Responsive layout with `@lobehub/ui` Flexbox components

### License Notice

The original LobeChat code is licensed under the MIT License:

```
MIT License

Copyright (c) 2023-2025 LobeHub

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Attribution Requirements

All copied and adapted files include JSDoc comments with:
- Source reference with branch and commit
- `@author LobeChat Team` - Original author
- `@copyright LobeHub. All rights reserved.` - Copyright notice

### Modifications Made

The following modifications were made to adapt the components:
1. Simplified business logic for self-hosted deployment
2. Removed dependencies on LobeChat-specific services
3. Adapted branding to "Originium Kernel"
4. Simplified internationalization (removed i18n dependencies where possible)
5. Modified API endpoints to match local backend structure

---

## Other Dependencies

### @lobehub/ui
- UI component library used throughout the project
- License: MIT

### Ant Design (antd)
- UI component framework
- License: MIT

### Next.js
- React framework
- License: MIT

### Lucide React
- Icon library
- License: ISC

---

**Generated**: 2026-03-21
**Project**: Originium Kernel (ZhouZBoss-Web)
