# License Strategy

CreationFlow uses a multi-license strategy to balance open-source community access with commercial sustainability.

## License Matrix

| Component                         | License          | Rationale                                          |
| --------------------------------- | ---------------- | -------------------------------------------------- |
| **creationflow-core** (this repo) | AGPL-3.0         | Protects open core, requires sharing modifications |
| **woocommerce-plugin**            | GPL-2.0-or-later | Compatible with WordPress plugin ecosystem         |
| **creationflow-cloud**            | Proprietary      | Commercial SaaS offering                           |
| **creationflow-enterprise**       | Proprietary      | Commercial add-on modules                          |
| **License Server**                | Proprietary      | Private validation service (separate repo)         |

## Core Repository: AGPL-3.0

### Why AGPL-3.0?

The Affero GPL is chosen because CreationFlow is primarily a server-side/self-hosted platform. Standard GPL only requires source distribution when software is _distributed_, but AGPL closes the "SaaS loophole":

- If someone modifies the core and runs it as a network service, they must make the modified source available to users
- Prevents taking the core, modifying it, and running it as a closed SaaS
- Encourages contributions back to the community
- Still allows commercial use and internal self-hosting without obligation to share

### What AGPL-3.0 Means for Users

| Use Case                            | Allowed? | Obligation                                     |
| ----------------------------------- | -------- | ---------------------------------------------- |
| Self-host for own use               | Yes      | None (unless you modify and serve it)          |
| Modify and self-host internally     | Yes      | Keep modifications available to internal users |
| Modify and offer as SaaS            | Yes      | Must publish modified source code              |
| Use as basis for commercial product | Yes      | Must publish source, comply with AGPL          |
| Remove AGPL and close-source        | No       | Violation of license                           |
| Link proprietary software to it     | No       | AGPL "viral" effect applies                    |

### What AGPL-3.0 Means for Contributors

- All contributions to this repo are under AGPL-3.0
- Contributors retain copyright but grant AGPL-3.0 license
- Contributions cannot be relicensed without contributor consent

## WooCommerce Plugin: GPL-2.0-or-later

### Why GPL-2.0?

WordPress and its plugin ecosystem require GPL-compatible licensing:

- WordPress itself is GPL-2.0-or-later
- Plugins that integrate with WordPress should be GPL-compatible
- Ensures the plugin can be freely distributed in the WordPress ecosystem
- Separate from the AGPL-3.0 core to avoid license conflicts

### License Boundary

The WooCommerce plugin is an **adapter**, not core logic:

- It contains only WordPress-specific integration code
- It communicates with the core via REST API
- It does not contain editor, renderer, or pricing logic
- It can be distributed independently under GPL-2.0

## Commercial Modules

### creationflow-cloud (Proprietary)

Planned features:

- Managed hosting and SaaS offering
- Multi-tenant infrastructure
- Automated scaling and monitoring
- Customer support and SLA
- Billing and subscription management

**Boundary:** Cloud-specific infrastructure code stays in a private repository.

### creationflow-enterprise (Proprietary)

Planned features:

- Advanced user/role/permission management
- SSO/SAML integration
- Audit logging
- Custom branding/white-labeling
- Priority support
- Custom integrations

**Boundary:** Enterprise features extend the core via APIs/plugins, not by modifying core code.

## Dual-License Strategy

### For Customers Who Cannot Use AGPL-3.0

Some organizations cannot or will not use AGPL-3.0 software. For these cases:

- Offer a commercial license that removes AGPL obligations
- Customer pays for a license to use the core without AGPL requirements
- License terms are negotiated per customer

### Dual-License Conditions

- Available for organizations that cannot comply with AGPL-3.0
- Typically includes support and maintenance
- Does not include enterprise features (those are separate)
- Revenue supports core development

## License Server

### Purpose

A separate private service that validates licenses and usage:

- Validates commercial license keys
- Tracks subscription status
- Enforces usage limits (e.g., number of workspaces, users)
- Does NOT live in this public repository

### Boundary

- License validation logic is external to the core
- The core does not contain license checks
- Commercial modules may check for valid licenses
- This separation keeps the core truly open-source

## Compatibility Matrix

| Component          | AGPL-3.0 | GPL-2.0 | GPL-3.0 | MIT | Apache-2.0 | Proprietary |
| ------------------ | -------- | ------- | ------- | --- | ---------- | ----------- |
| AGPL-3.0 core      | ✓        | ✓       | ✓       | ✓   | ✓          | ✗           |
| GPL-2.0 plugin     | ✓        | ✓       | ✓       | ✓   | ✓          | ✗           |
| Proprietary module | ✗        | ✗       | ✗       | ✗   | ✗          | ✓           |

**Note:** AGPL-3.0 is compatible with GPL-3.0 but not with GPL-2.0-only. The WooCommerce plugin uses GPL-2.0-**or-later**, which allows compatibility with GPL-3.0 and thus AGPL-3.0.

## Enforcement

### What We Monitor

- Public forks and modifications of the core
- SaaS offerings based on the core without source disclosure
- Unauthorized removal of license notices

### What We Don't Monitor

- Internal self-hosted use
- Modifications that comply with AGPL-3.0
- Use of commercial licenses

## Summary

```
┌─────────────────────────────────────────────────┐
│              creationflow-cloud                  │
│              (Proprietary / SaaS)                │
├─────────────────────────────────────────────────┤
│              creationflow-enterprise             │
│              (Proprietary / Add-ons)             │
├─────────────────────────────────────────────────┤
│              woocommerce-plugin                  │
│              (GPL-2.0-or-later)                  │
├─────────────────────────────────────────────────┤
│              creationflow-core                   │
│              (AGPL-3.0)                          │
│              The open foundation                 │
└─────────────────────────────────────────────────┘
```

The core is open and free. Commercial modules and services provide revenue. The license strategy protects the community while enabling sustainable development.
