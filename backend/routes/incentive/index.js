const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const master = require('../../controllers/incentive/masterController');
const trans  = require('../../controllers/incentive/transactionController');

router.use(authenticate);
router.use(authorize('admin', 'hr'));

// ── Dashboard ────────────────────────────────────────────────
router.get('/dashboard', trans.getDashboardStats);
router.post('/sync-erp/:period_id', trans.syncFromERP);

// ── Master: Branches ─────────────────────────────────────────
router.get('/branches',     master.getBranches);
router.post('/branches',    master.createBranch);
router.put('/branches/:id', master.updateBranch);
router.delete('/branches/:id', master.deleteBranch);

// ── Master: Positions ────────────────────────────────────────
router.get('/positions',     master.getPositions);
router.post('/positions',    master.createPosition);
router.put('/positions/:id', master.updatePosition);
router.delete('/positions/:id', master.deletePosition);

// ── Master: Employees ────────────────────────────────────────
router.get('/employees',     master.getIncEmployees);
router.get('/employees/:id', master.getIncEmployee);
router.post('/employees',    master.createIncEmployee);
router.put('/employees/:id', master.updateIncEmployee);
router.delete('/employees/:id', master.deleteIncEmployee);

// ── Master: Sales Channels ───────────────────────────────────
router.get('/channels',     master.getSalesChannels);
router.put('/channels/:id', master.updateSalesChannel);

// ── Channel Rates (per branch) ───────────────────────────────
router.get('/channel-rates',          master.getChannelRates);
router.post('/channel-rates',         master.upsertChannelRate);
router.delete('/channel-rates/:id',   master.deleteChannelRate);

// ── Master: Activity Types ───────────────────────────────────
router.get('/activity-types',     master.getActivityTypes);
router.post('/activity-types',    master.createActivityType);
router.put('/activity-types/:id', master.updateActivityType);
router.delete('/activity-types/:id', master.deleteActivityType);

// ── Master: Bonus Targets ────────────────────────────────────
router.get('/bonus-targets',     master.getBonusTargets);
router.post('/bonus-targets',    master.createBonusTarget);
router.put('/bonus-targets/:id', master.updateBonusTarget);
router.delete('/bonus-targets/:id', master.deleteBonusTarget);

// ── Periods ──────────────────────────────────────────────────
router.get('/periods',               trans.getPeriods);
router.get('/periods/:id',           trans.getPeriod);
router.post('/periods',              trans.createPeriod);
router.post('/periods/:id/calculate',trans.calculatePeriod);
router.post('/periods/:id/approve',  trans.approvePeriod);
router.post('/periods/:id/lock',     trans.lockPeriod);

// ── WA Sales ─────────────────────────────────────────────────
router.get('/sales/wa',        trans.getWaSales);
router.post('/sales/wa',       trans.createWaSale);
router.put('/sales/wa/:id',    trans.updateWaSale);
router.delete('/sales/wa/:id', trans.deleteWaSale);

// ── Marketplace Sales ────────────────────────────────────────
router.get('/sales/marketplace', trans.getMarketplaceSales);
router.post('/sales/marketplace',trans.upsertMarketplaceSale);

// ── Web Sales ────────────────────────────────────────────────
router.get('/sales/web',  trans.getWebSales);
router.post('/sales/web', trans.upsertWebSale);

// ── Activities ───────────────────────────────────────────────
router.get('/activities',        trans.getActivities);
router.post('/activities',       trans.createActivity);
router.delete('/activities/:id', trans.deleteActivity);

// ── Results / Slips ──────────────────────────────────────────
router.get('/results',     trans.getResults);
router.get('/results/:id', trans.getResultDetail);

module.exports = router;
