# Deployment

Deploy API and workers separately from the web application. Apply committed migrations before starting application versions. Workers require a durable queue and idempotency keys. Configure permitted source adapters and the vision adapter through environment variables.

Release is blocked when migrations, critical invariants, calibration integrity, firewall tests, or PDF validation fail. Backups and restore checks are operational prerequisites.
