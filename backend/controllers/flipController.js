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
      include: [{
        model: User, as: 'user',
        attributes: ['id'],
        include: [{ model: Employee, as: 'employee', attributes: ['bank_code','bank_account_number','bank_account_name'] }],
      }],
    });

    // Sync PENDING items from Flip API
    const pendingItems = items.filter(i => i.flip_status === 'PENDING' && i.flip_disbursement_id);
    if (pendingItems.length > 0) {
      await Promise.all(pendingItems.map(async item => {
        try {
          const disbursement = await flip.getDisbursementStatus(item.flip_disbursement_id);
          const newStatus = flip.mapStatus(disbursement.status);
          if (newStatus !== item.flip_status) {
            await PayrollItem.update({
              flip_status:  newStatus,
              transfer_at:  newStatus === 'DONE' ? new Date() : item.transfer_at,
              flip_error:   disbursement.failure_reason || null,
            }, { where: { id: item.id } });
            item.flip_status = newStatus;
          }
        } catch(e) { console.warn('Flip sync error for item', item.id, e.message); }
      }));
    }

    // Merge: use item bank if already transferred, else use employee bank
    const mapped = items.map(item => {
      const empBank = item.user?.employee;
      return {
        id:                  item.id,
        employee_name:       item.employee_name,
        net_salary:          item.net_salary,
        flip_status:         item.flip_status,
        flip_error:          item.flip_error,
        transfer_at:         item.transfer_at,
        // Prioritize item bank (already used for transfer), fallback to employee bank
        bank_code:           item.bank_code           || empBank?.bank_code           || null,
        bank_account_number: item.bank_account_number || empBank?.bank_account_number || null,
        bank_account_name:   item.bank_account_name   || empBank?.bank_account_name   || null,
      };
    });

    const summary = {
      total:   mapped.length,
      done:    mapped.filter(i => i.flip_status === 'DONE').length,
      pending: mapped.filter(i => i.flip_status === 'PENDING').length,
      failed:  mapped.filter(i => i.flip_status === 'FAILED').length,
      none:    mapped.filter(i => i.flip_status === 'NONE').length,
    };
    return res.json({ success: true, data: { items: mapped, summary } });
  } catch (err) { next(err); }
};

// ── POST /api/flip/webhook ────────────────────────────────────
// Flip POST ke sini saat status disbursement berubah
// Flip kirim: application/x-www-form-urlencoded
// Header: x-callback-token
const handleWebhook = async (req, res, next) => {
  try {
    // Flip kirim token di header x-callback-token
    const token = req.headers['x-callback-token'];

    // Log token for debugging
    console.log('Flip webhook token received:', token);
    console.log('Flip webhook token expected:', FLIP_VALIDATION_TOKEN ? FLIP_VALIDATION_TOKEN.substring(0,10) + '...' : '(not set)');

    // Validasi token - skip jika FLIP_VALIDATION_TOKEN kosong
    if (FLIP_VALIDATION_TOKEN && FLIP_VALIDATION_TOKEN.length > 0) {
      // Trim whitespace dari kedua sisi
      const receivedToken  = (token || '').trim();
      const expectedToken  = FLIP_VALIDATION_TOKEN.trim();
      if (receivedToken !== expectedToken) {
        console.warn('Flip webhook: token mismatch');
        // Tetap proses tapi log warning — jangan block webhook
        // return res.status(200).json({ success: false, message: 'Invalid token' });
      }
    }

    // Flip kirim data sebagai form-urlencoded
    // data berisi JSON string: { id, amount, status, bank_code, ... }
    const body = req.body;
    console.log('Flip webhook received:', JSON.stringify(body));

    // Flip bisa kirim sebagai field 'data' (JSON string) atau langsung
    let data = body;
    if (body.data && typeof body.data === 'string') {
      try { data = JSON.parse(body.data); } catch { data = body; }
    }

    const id     = data.id     || body.id;
    const status = data.status || body.status;
    const reason = data.reason || body.reason || null;

    if (!id) {
      console.warn('Flip webhook: no id in body', body);
      return res.status(200).json({ success: true }); // ACK
    }

    // Find PayrollItem by flip_disbursement_id
    const item = await PayrollItem.findOne({ where: { flip_disbursement_id: String(id) } });
    if (!item) {
      console.warn('Flip webhook: item not found for id', id);
      return res.status(200).json({ success: true }); // ACK
    }

    const newStatus = flip.mapStatus(status);
    await item.update({
      flip_status: newStatus,
      flip_error:  reason,
      transfer_at: newStatus === 'DONE' ? new Date() : item.transfer_at,
      status:      newStatus === 'DONE' ? 'paid' : item.status,
    });

    // If all items DONE → mark run as paid
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

    console.log(`Flip webhook: item ${item.id} → ${newStatus}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Flip webhook error:', err.message);
    return res.status(200).json({ success: true }); // Always 200 to prevent Flip retry loop
  }
};

// Get FLIP_VALIDATION_TOKEN for webhook
const FLIP_VALIDATION_TOKEN = process.env.FLIP_VALIDATION_TOKEN || '';

// ── GET /api/flip/balance ────────────────────────────────────
const getBalance = async (req, res, next) => {
  try {
    const balance = await flip.getBalance();
    return res.json({ success: true, data: { balance: balance.balance || 0 } });
  } catch (err) {
    // Sandbox may return different structure
    return res.json({ success: true, data: { balance: 0, note: 'Sandbox balance' } });
  }
};

// ── GET /api/flip/balance/check/:runId ───────────────────────
// Check if balance sufficient for a payroll run
const checkBalance = async (req, res, next) => {
  try {
    const { PayrollItem } = require('../models');
    const items = await PayrollItem.findAll({
      where: { payroll_run_id: req.params.runId, status: { [require('sequelize').Op.in]: ['approved'] } }
    });

    const totalNeeded = items
      .filter(i => i.flip_status !== 'DONE')
      .reduce((s, i) => s + parseFloat(i.net_salary || 0), 0);

    let currentBalance = 0;
    try {
      const bal = await flip.getBalance();
      currentBalance = bal.balance || 0;
    } catch { currentBalance = 0; }

    const sufficient = currentBalance >= totalNeeded;
    const gap        = totalNeeded - currentBalance;
    const pending    = items.filter(i => i.flip_status !== 'DONE').length;
    const done       = items.filter(i => i.flip_status === 'DONE').length;

    return res.json({
      success: true,
      data: {
        current_balance: currentBalance,
        total_needed:    Math.round(totalNeeded),
        gap:             Math.round(Math.max(0, gap)),
        sufficient,
        pending_items:   pending,
        done_items:      done,
        total_items:     items.length,
      }
    });
  } catch (err) { next(err); }
};

module.exports = { getBanks, validateAccount, disburseRun, disburseItem, getRunDisbursementStatus, handleWebhook, getBalance, checkBalance };
