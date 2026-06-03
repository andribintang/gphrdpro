const { PayrollRun, PayrollItem, Employee, User } = require('../models');
const flip = require('../services/flipService');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// ── GET /api/flip/banks ───────────────────────────────────────
const getBanks = (req, res) => {
  return res.json({ success: true, data: { banks: flip.BANK_LIST } });
};

// ── POST /api/flip/validate-account ──────────────────────────
const validateAccount = async (req, res, next) => {
  try {
    const { bank_code, account_number } = req.body;
    if (!bank_code || !account_number)
      return res.status(400).json({ success: false, message: 'bank_code dan account_number wajib' });
    const result = await flip.validateBankAccount(bank_code, account_number);
    return res.json({ success: true, data: result });
  } catch (err) {
    const msg = err.response?.data?.errors?.[0]?.message || err.message;
    return res.status(400).json({ success: false, message: msg });
  }
};

// ── POST /api/flip/disburse/:runId ────────────────────────────
// Trigger pembayaran gaji untuk semua karyawan dalam satu payroll run
const disburseRun = async (req, res, next) => {
  try {
    const run = await PayrollRun.findByPk(req.params.runId);
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run tidak ditemukan' });
    if (run.status !== 'approved')
      return res.status(400).json({ success: false, message: 'Payroll harus di-approve dulu sebelum ditransfer' });

    // Get all items that haven't been successfully transferred
    const items = await PayrollItem.findAll({
      where: {
        payroll_run_id: run.id,
        flip_status: { [Op.notIn]: ['DONE'] },
      },
      include: [{
        model: User, as: 'user',
        include: [{ model: Employee, as: 'employee' }],
      }],
    });

    if (!items.length)
      return res.status(400).json({ success: false, message: 'Semua karyawan sudah ditransfer' });

    const results = { success: 0, failed: 0, skipped: 0, errors: [] };

    for (const item of items) {
      const emp = item.user?.employee;

      // Skip if no bank account
      if (!emp?.bank_code || !emp?.bank_account_number) {
        await item.update({ flip_status: 'FAILED', flip_error: 'Data rekening bank belum diisi' });
        results.skipped++;
        results.errors.push(`${item.employee_name}: rekening bank belum diisi`);
        continue;
      }

      // Skip if net salary = 0
      if (!item.net_salary || parseFloat(item.net_salary) <= 0) {
        results.skipped++;
        continue;
      }

      try {
        const idempotencyKey = `payroll-${run.id}-item-${item.id}`;
        const remark = `${run.period_label}`.substring(0, 18);

        const disbursement = await flip.createDisbursement({
          idempotencyKey,
          amount:        parseFloat(item.net_salary),
          bankCode:      emp.bank_code,
          accountNumber: emp.bank_account_number,
          accountName:   emp.bank_account_name || item.employee_name,
          remark,
        });

        await item.update({
          flip_disbursement_id: String(disbursement.id),
          flip_status:          flip.mapStatus(disbursement.status),
          flip_error:           null,
          transfer_amount:      parseFloat(item.net_salary),
          bank_code:            emp.bank_code,
          bank_account_number:  emp.bank_account_number,
          bank_account_name:    emp.bank_account_name || item.employee_name,
          transfer_at:          disbursement.status === 'DONE' ? new Date() : null,
        });

        results.success++;
      } catch (err) {
        const errMsg = err.response?.data?.errors?.[0]?.message || err.message;
        await item.update({ flip_status: 'FAILED', flip_error: errMsg });
        results.failed++;
        results.errors.push(`${item.employee_name}: ${errMsg}`);
      }
    }

    // Update run status if all done
    const allItems = await PayrollItem.findAll({ where: { payroll_run_id: run.id } });
    const allDone  = allItems.every(i => ['DONE','CANCELLED'].includes(i.flip_status));
    const anyDone  = allItems.some(i => i.flip_status === 'DONE');
    if (allDone || anyDone) {
      await run.update({ status: 'paid', paid_at: new Date(), payment_date: new Date().toISOString().split('T')[0] });
    }

    return res.json({
      success: true,
      message: `Transfer selesai: ${results.success} berhasil, ${results.failed} gagal, ${results.skipped} dilewati`,
      data: results,
    });
  } catch (err) { next(err); }
};

// ── POST /api/flip/disburse-item/:itemId ──────────────────────
// Retry transfer untuk 1 karyawan
const disburseItem = async (req, res, next) => {
  try {
    const item = await PayrollItem.findByPk(req.params.itemId, {
      include: [{ model: User, as: 'user', include: [{ model: Employee, as: 'employee' }] }],
    });
    if (!item) return res.status(404).json({ success: false, message: 'Item tidak ditemukan' });
    if (item.flip_status === 'DONE')
      return res.status(400).json({ success: false, message: 'Sudah berhasil ditransfer' });

    const emp = item.user?.employee;
    if (!emp?.bank_code || !emp?.bank_account_number)
      return res.status(400).json({ success: false, message: 'Rekening bank karyawan belum diisi' });

    const run = await PayrollRun.findByPk(item.payroll_run_id);
    const idempotencyKey = `payroll-${item.payroll_run_id}-item-${item.id}-retry-${Date.now()}`;

    const disbursement = await flip.createDisbursement({
      idempotencyKey,
      amount:        parseFloat(item.net_salary),
      bankCode:      emp.bank_code,
      accountNumber: emp.bank_account_number,
      accountName:   emp.bank_account_name || item.employee_name,
      remark:        (run?.period_label || 'Gaji').substring(0, 18),
    });

    await item.update({
      flip_disbursement_id: String(disbursement.id),
      flip_status:          flip.mapStatus(disbursement.status),
      flip_error:           null,
      transfer_amount:      parseFloat(item.net_salary),
      bank_code:            emp.bank_code,
      bank_account_number:  emp.bank_account_number,
      bank_account_name:    emp.bank_account_name || item.employee_name,
      transfer_at:          disbursement.status === 'DONE' ? new Date() : null,
    });

    return res.json({ success: true, message: 'Transfer berhasil diproses', data: { disbursement } });
  } catch (err) {
    const msg = err.response?.data?.errors?.[0]?.message || err.message;
    next(new Error(msg));
  }
};

// ── GET /api/flip/status/:runId ───────────────────────────────
const getRunDisbursementStatus = async (req, res, next) => {
  try {
    const items = await PayrollItem.findAll({
      where: { payroll_run_id: req.params.runId },
      attributes: ['id','employee_name','net_salary','flip_status','flip_error','transfer_at','bank_code','bank_account_number'],
    });
    const summary = {
      total:   items.length,
      done:    items.filter(i => i.flip_status === 'DONE').length,
      pending: items.filter(i => i.flip_status === 'PENDING').length,
      failed:  items.filter(i => i.flip_status === 'FAILED').length,
      none:    items.filter(i => i.flip_status === 'NONE').length,
    };
    return res.json({ success: true, data: { items, summary } });
  } catch (err) { next(err); }
};

// ── POST /api/flip/webhook ────────────────────────────────────
// Flip akan POST ke sini saat status disbursement berubah
const handleWebhook = async (req, res, next) => {
  try {
    const token = req.headers['x-callback-token'] || req.body.token;
    if (!flip.validateWebhook(token)) {
      return res.status(401).json({ success: false, message: 'Invalid webhook token' });
    }

    const { id, status, reason } = req.body;
    if (!id) return res.status(400).json({ success: false });

    // Find item by flip_disbursement_id
    const item = await PayrollItem.findOne({ where: { flip_disbursement_id: String(id) } });
    if (!item) return res.status(200).json({ success: true }); // ACK even if not found

    const newStatus = flip.mapStatus(status);
    await item.update({
      flip_status:  newStatus,
      flip_error:   reason || null,
      transfer_at:  newStatus === 'DONE' ? new Date() : item.transfer_at,
    });

    // If all items in run are DONE, mark run as paid
    if (newStatus === 'DONE') {
      const allItems = await PayrollItem.findAll({ where: { payroll_run_id: item.payroll_run_id } });
      const allDone  = allItems.every(i => ['DONE','CANCELLED'].includes(i.flip_status));
      if (allDone) {
        await PayrollRun.update(
          { status: 'paid', paid_at: new Date(), payment_date: new Date().toISOString().split('T')[0] },
          { where: { id: item.payroll_run_id } }
        );
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getBanks, validateAccount, disburseRun, disburseItem, getRunDisbursementStatus, handleWebhook };
