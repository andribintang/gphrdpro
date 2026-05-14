const Branch        = require('./Branch');
const Position      = require('./Position');
const IncEmployee   = require('./IncEmployee');
const SalesChannel  = require('./SalesChannel');
const ChannelRate   = require('./ChannelRate');
const ActivityType  = require('./ActivityType');
const BonusTarget   = require('./BonusTarget');
const IncentivePeriod = require('./IncentivePeriod');
const {
  WaSale, MarketplaceSale, MarketplaceShare,
  WebSale, WebShare, EmployeeActivity,
  IncentiveResult, AuditLog, ChannelRate,
} = require('./Transactions');

// ── Branch ↔ Position ─────────────────────────────────────────
Branch.hasMany(Position,    { foreignKey: 'branch_id', as: 'positions' });
Position.belongsTo(Branch,  { foreignKey: 'branch_id', as: 'branch' });

// ── Branch ↔ IncEmployee ──────────────────────────────────────
Branch.hasMany(IncEmployee,     { foreignKey: 'branch_id', as: 'employees' });
IncEmployee.belongsTo(Branch,   { foreignKey: 'branch_id', as: 'branch' });
Position.hasMany(IncEmployee,   { foreignKey: 'position_id', as: 'employees' });
IncEmployee.belongsTo(Position, { foreignKey: 'position_id', as: 'position' });

// ── Period ↔ Transactions ─────────────────────────────────────
IncentivePeriod.hasMany(WaSale,           { foreignKey: 'period_id', as: 'waSales' });
WaSale.belongsTo(IncentivePeriod,         { foreignKey: 'period_id', as: 'period' });
IncentivePeriod.hasMany(MarketplaceSale,  { foreignKey: 'period_id', as: 'marketplaceSales' });
MarketplaceSale.belongsTo(IncentivePeriod,{ foreignKey: 'period_id', as: 'period' });
IncentivePeriod.hasMany(WebSale,          { foreignKey: 'period_id', as: 'webSales' });
WebSale.belongsTo(IncentivePeriod,        { foreignKey: 'period_id', as: 'period' });
IncentivePeriod.hasMany(EmployeeActivity, { foreignKey: 'period_id', as: 'activities' });
EmployeeActivity.belongsTo(IncentivePeriod,{ foreignKey: 'period_id', as: 'period' });
IncentivePeriod.hasMany(IncentiveResult,  { foreignKey: 'period_id', as: 'results' });
IncentiveResult.belongsTo(IncentivePeriod,{ foreignKey: 'period_id', as: 'period' });

// ── Employee ↔ Transactions ───────────────────────────────────
IncEmployee.hasMany(WaSale,            { foreignKey: 'employee_id', as: 'waSales' });
WaSale.belongsTo(IncEmployee,          { foreignKey: 'employee_id', as: 'employee' });
IncEmployee.hasMany(EmployeeActivity,  { foreignKey: 'employee_id', as: 'activities' });
EmployeeActivity.belongsTo(IncEmployee,{ foreignKey: 'employee_id', as: 'employee' });
IncEmployee.hasMany(IncentiveResult,   { foreignKey: 'employee_id', as: 'results' });
IncentiveResult.belongsTo(IncEmployee, { foreignKey: 'employee_id', as: 'employee' });

// ── Branch ↔ Transactions ─────────────────────────────────────
Branch.hasMany(WaSale,            { foreignKey: 'branch_id', as: 'waSales' });
WaSale.belongsTo(Branch,          { foreignKey: 'branch_id', as: 'branch' });
Branch.hasMany(MarketplaceSale,   { foreignKey: 'branch_id', as: 'marketplaceSales' });
MarketplaceSale.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Branch.hasMany(WebSale,           { foreignKey: 'branch_id', as: 'webSales' });
WebSale.belongsTo(Branch,         { foreignKey: 'branch_id', as: 'branch' });

// ── MarketplaceSale ↔ Shares ──────────────────────────────────
MarketplaceSale.hasMany(MarketplaceShare,    { foreignKey: 'marketplace_sale_id', as: 'shares' });
MarketplaceShare.belongsTo(MarketplaceSale,  { foreignKey: 'marketplace_sale_id', as: 'sale' });
IncEmployee.hasMany(MarketplaceShare,        { foreignKey: 'employee_id', as: 'marketplaceShares' });
MarketplaceShare.belongsTo(IncEmployee,      { foreignKey: 'employee_id', as: 'employee' });

// ── WebSale ↔ Shares ─────────────────────────────────────────
WebSale.hasMany(WebShare,         { foreignKey: 'web_sale_id', as: 'shares' });
WebShare.belongsTo(WebSale,       { foreignKey: 'web_sale_id', as: 'sale' });
IncEmployee.hasMany(WebShare,     { foreignKey: 'employee_id', as: 'webShares' });
WebShare.belongsTo(IncEmployee,   { foreignKey: 'employee_id', as: 'employee' });

// ── Branch/Channel ↔ ChannelRate ─────────────────────────────
Branch.hasMany(ChannelRate,       { foreignKey: 'branch_id',  as: 'channelRates' });
ChannelRate.belongsTo(Branch,     { foreignKey: 'branch_id',  as: 'branch' });
SalesChannel.hasMany(ChannelRate, { foreignKey: 'channel_id', as: 'branchRates' });
ChannelRate.belongsTo(SalesChannel,{ foreignKey: 'channel_id', as: 'channel' });

// ── ActivityType ↔ EmployeeActivity ─────────────────────────
ActivityType.hasMany(EmployeeActivity,   { foreignKey: 'activity_type_id', as: 'activities' });
EmployeeActivity.belongsTo(ActivityType, { foreignKey: 'activity_type_id', as: 'activityType' });

module.exports = {
  Branch, Position, IncEmployee,
  SalesChannel, ActivityType, BonusTarget,
  IncentivePeriod,
  WaSale, MarketplaceSale, MarketplaceShare,
  WebSale, WebShare, EmployeeActivity,
  IncentiveResult, AuditLog, ChannelRate,
};
