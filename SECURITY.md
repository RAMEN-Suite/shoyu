# Security policy

## Supported versions

Security fixes are applied to the latest release, which is what the production deployments run. The `dev` branch images may change without notice.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not open a public issue for an undisclosed vulnerability.

Include the affected version, reproduction steps, impact, and any known mitigation. You can expect an acknowledgement within seven days. A fix timeline depends on severity and reproducibility; coordinated disclosure will be agreed with the reporter before details are published.

## Supply chain

The client and server are published as container images on `ghcr.io/ramen-suite/shoyu-client` and `ghcr.io/ramen-suite/shoyu-server`. Every pull request builds both images and scans them for vulnerabilities, release images carry build provenance and SBOM attestations.
