// ── Flip for Business Disbursement Service ────────────────────
// Docs: https://docs.flip.id/
const axios = require('axios');

const FLIP_API_URL  = process.env.FLIP_API_URL  || 'https://bigflip.id/api/v2';
const FLIP_SECRET   = process.env.FLIP_SECRET_KEY || '';
const FLIP_VALIDATION_TOKEN = process.env.FLIP_VALIDATION_TOKEN || '';

// Axios instance dengan Basic Auth (Flip pakai secret key sebagai username)
const flipApi = axios.create({
  baseURL: FLIP_API_URL,
  auth: { username: FLIP_SECRET, password: '' },
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  timeout: 30000,
});

// ── Get bank list ─────────────────────────────────────────────
const getBanks = async () => {
  const r = await flipApi.get('/general/banks');
  return r.data;
};

// ── Validate bank account ─────────────────────────────────────
const validateBankAccount = async (bankCode, accountNumber) => {
  const params = new URLSearchParams({
    account_number: accountNumber,
    bank_code:      bankCode,
  });
  const r = await flipApi.post('/disbursement/bank-account-inquiry', params);
  return r.data; // { account_number, bank_code, account_holder }
};

// ── Create single disbursement ────────────────────────────────
const createDisbursement = async ({ idempotencyKey, amount, bankCode, accountNumber, accountName, remark }) => {
  const params = new URLSearchParams({
    account_number: accountNumber,
    bank_code:      bankCode,
    amount:         Math.round(amount),
    remark:         (remark || 'Gaji').substring(0, 18), // max 18 chars
  });
  const r = await flipApi.post('/disbursement', params, {
    headers: { 'idempotency-key': idempotencyKey },
  });
  return r.data;
  // Returns: { id, amount, status, timestamp, bank_code, account_number, recipient_name, ... }
};

// ── Get disbursement status ───────────────────────────────────
const getDisbursementStatus = async (disbursementId) => {
  const r = await flipApi.get(`/disbursement/${disbursementId}`);
  return r.data;
};

// ── Get disbursement list ─────────────────────────────────────
const getDisbursementList = async ({ page = 1, pagination = 20 } = {}) => {
  const r = await flipApi.get(`/disbursement?pagination=${pagination}&page=${page}`);
  return r.data;
};

// ── Validate webhook token ────────────────────────────────────
const validateWebhook = (token) => {
  return token === FLIP_VALIDATION_TOKEN;
};

// ── Map Flip status to our status ────────────────────────────
const mapStatus = (flipStatus) => {
  const map = {
    'PENDING':   'PENDING',
    'PROCESSED': 'PENDING',
    'DONE':      'DONE',
    'FAILED':    'FAILED',
    'CANCELLED': 'CANCELLED',
  };
  return map[flipStatus] || 'PENDING';
};

// ── List of Indonesian banks supported by Flip ────────────────
const BANK_LIST = [
  { code: 'bca',     name: 'BCA' },
  { code: 'bni',     name: 'BNI' },
  { code: 'bri',     name: 'BRI' },
  { code: 'mandiri', name: 'Mandiri' },
  { code: 'bsi',     name: 'BSI' },
  { code: 'cimb',    name: 'CIMB Niaga' },
  { code: 'danamon', name: 'Danamon' },
  { code: 'permata', name: 'Permata' },
  { code: 'btn',     name: 'BTN' },
  { code: 'panin',   name: 'Panin' },
  { code: 'mega',    name: 'Bank Mega' },
  { code: 'bukopin', name: 'Bukopin' },
  { code: 'sinarmas',name: 'Sinar Mas' },
  { code: 'ocbc',    name: 'OCBC NISP' },
  { code: 'uob',     name: 'UOB' },
  { code: 'muamalat',name: 'Muamalat' },
  { code: 'maybank', name: 'Maybank' },
  { code: 'jago',    name: 'Bank Jago' },
  { code: 'allo',    name: 'Allo Bank' },
  { code: 'seabank', name: 'SeaBank' },
  { code: 'neo',     name: 'Bank Neo Commerce' },
  { code: 'blu',     name: 'blu by BCA' },
  { code: 'gopay',   name: 'GoPay' },
  { code: 'ovo',     name: 'OVO' },
  { code: 'dana',    name: 'DANA' },
  { code: 'shopeepay', name: 'ShopeePay' },
];

module.exports = {
  getBanks, validateBankAccount,
  createDisbursement, getDisbursementStatus, getDisbursementList,
  validateWebhook, mapStatus, BANK_LIST,
};
