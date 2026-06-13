# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.1] - 2026-06-13

### Fixed
- CashRegister crash on revisit: null safety for `montoInicial`, `montoFinalDeclarado`, `importe` in history columns
- Cash register status showing "closed" when open in VehicleDetail: replaced `fetch()` with axios for production compatibility
- Duplicate payment rows in multi-payment modal: `rowIdCounter` uses `useRef` instead of resetting on every render
- CashRegister crash on close: `setDetailData` now wraps result in `{ register, resumen }` object
- Back button in VehicleDetail always going to `/vehicles`: replaced `navigate('/vehicles')` with `navigate(-1)`
- StockMovementsReport: Producto, Código, Categoría and Subcategoría columns showing empty data — fixed backend SQL to return product fields and frontend to use flat `dataIndex`
- Excel export in StockMovementsReport: rebuilt with all 8 columns, auto-fit widths, and human-readable labels

### Changed
- AGENTS.md: draft naming convention now uses incremental `-draft.{n}` suffix

## [1.3.0] - 2026-06-09

### Fixed
- Financial summary (Total/Pagado/Devuelto/Saldo) showing $0 after saving services — backend now recalculates `visits.total` inside the PUT transaction
- Services being lost when adding multiple in one batch — `accumulatedServicios` local variable preserves pending services across iterations
- sql.js build crash (`ReferenceError: $ is not defined`) in production bundle — `fix-sqljs.mjs` now guards `$n.exports` patterns

### Changed
- Dev mode (`pnpm dev`) now uses the same database as the installed app (`userData/torque.db`) instead of `cwd()/data/torque.db`
- Photos directory unified between dev and production modes

## [1.2.7] - 2026-06-08

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

[1.3.1]: https://github.com/Leonani/torque-desktop/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/Leonani/torque-desktop/compare/v1.2.7...v1.3.0
[1.2.7]: https://github.com/Leonani/torque-desktop/compare/v1.2.6...v1.2.7
[1.2.6]: https://github.com/Leonani/torque-desktop/compare/v1.2.4...v1.2.6
[1.2.4]: https://github.com/Leonani/torque-desktop/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/Leonani/torque-desktop/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/Leonani/torque-desktop/compare/v1.2.1...v1.2.2
