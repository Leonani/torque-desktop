# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Preserve visits data when editing vehicles without existing visits (auto-creates visit on-the-fly)
- Prevent overwriting dirty form fields when populating vehicle data
- Synchronize service saving via Redux thunks instead of direct API calls
- Migrate assign-product and remove-product endpoints to use proper visitId-based routes

### Added
- Testing infrastructure with Vitest 4.x + Playwright browser mode

## [1.2.6] - 2026-06-08

### Fixed
- Database path resolution in production: app was creating/reading DB from installation directory instead of AppData/Roaming, causing "data loss" perception after updates

## [1.2.4] - 2026-06-06

### Added
- Standalone Express backend for API development (`pnpm dev:api`)

### Fixed
- Print from vehicle list now uses modern WorkOrderPrint component instead of legacy inline HTML
- WorkOrderPrint @media print CSS: hide app body instead of modal wrap to prevent blank PDF
- WorkOrderPrint PDF now saves with proper title "Orden de Trabajo - {patente}"
- 500 error when saving services in vehicle edit form (sql.js undefined binding issue)
- Remove Resumen (summary) section from printed work order

### Changed
- App version shown in window title

## [1.2.3] - 2026-05-28

### Fixed
- Persist photos, inspections, assigned products and services on vehicle creation
- Photos/inspections persisting via ref to avoid closure issues
- Vehicle detail opens edit modal instead of navigating away
- Horizontal padding in form footer buttons
- Preserve visits when updating selected vehicle

## [1.2.2] - 2026-05-20

### Added
- Split settings into Workshop Data and Appearance sections

[1.2.6]: https://github.com/Leonani/torque-desktop/compare/v1.2.4...v1.2.6
[1.2.4]: https://github.com/Leonani/torque-desktop/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/Leonani/torque-desktop/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/Leonani/torque-desktop/compare/v1.2.1...v1.2.2
