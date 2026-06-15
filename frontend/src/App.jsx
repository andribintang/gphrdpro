import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AttendancePage      from './pages/AttendancePage';
import AttendanceAdminPage from './pages/AttendanceAdminPage';
import UserAccessPage      from './pages/UserAccessPage';
import DepartmentsPage     from './pages/DepartmentsPage';
import OrgChartPage        from './pages/OrgChartPage';
import HRAssistantPage     from './pages/HRAssistantPage';
import LeavesPage from './pages/LeavesPage';
import EmployeesPage from './pages/EmployeesPage';
import ReportsPage from './pages/ReportsPage';
import PayrollEnginePage from './pages/PayrollEnginePage';
import SettingsPage     from './pages/SettingsPage';
import SelfServicePage  from './pages/SelfServicePage';
import NewsPage          from './pages/NewsPage';
import CleanupPage       from './pages/CleanupPage';
import BackupPage        from './pages/BackupPage';
import SplashScreen      from './components/SplashScreen';
import CompanySettingsPage from './pages/CompanySettingsPage';
import PayrollComponentManager from './pages/PayrollComponentManager';
import IncentiveDashboard from './pages/incentive/IncentiveDashboard';
import MasterDataPage from './pages/incentive/MasterDataPage';
import PeriodsPage from './pages/incentive/PeriodsPage';
import InputDataPage from './pages/incentive/InputDataPage';
import ResultsPage from './pages/incentive/ResultsPage';
import ErpDashboard    from './pages/erp/ErpDashboard';
import ProductsPage    from './pages/erp/ProductsPage';
import OrdersPage      from './pages/erp/OrdersPage';
import NewOrderPage    from './pages/erp/NewOrderPage';
import OrderDetailPage from './pages/erp/OrderDetailPage';
import CustomersPage   from './pages/erp/CustomersPage';
import SalesReportPage   from './pages/erp/SalesReportPage';
import SalesTargetPage   from './pages/erp/SalesTargetPage';
import ImportPage      from './pages/erp/ImportPage';
import PurchasesPage   from './pages/erp/PurchasesPage';
import ExpensesPage    from './pages/erp/ExpensesPage';
import ProfitLossPage  from './pages/erp/ProfitLossPage';
import StockOpnamePage from './pages/erp/StockOpnamePage';
import InventoryPage    from './pages/erp/InventoryPage';
import ShipmentsPage   from './pages/erp/ShipmentsPage';
import ReturnsPage     from './pages/erp/ReturnsPage';
import ErpMasterPage   from './pages/erp/MasterDataPage';
import DailyReportPage  from './pages/erp/DailyReportPage';
import ChannelReportPage from './pages/erp/ChannelReportPage';
import StoreDashboard     from './pages/store/StoreDashboard';
import StoreProductsPage  from './pages/store/StoreProductsPage';
import StoreOrdersPage    from './pages/store/StoreOrdersPage';
import StoreCatalogPage   from './pages/store/StoreCatalogPage';


// ── Device-aware default redirect ────────────────────────────
function DeviceRedirect() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  return <Navigate to={isMobile ? '/dashboard' : '/erp/dashboard'} replace />;
}

export default function App() {
  const [showSplash, setShowSplash] = React.useState(() => {
    // Show splash only once per session
    const shown = sessionStorage.getItem('splash_shown');
    if (shown) return false;
    sessionStorage.setItem('splash_shown', '1');
    return true;
  });
  return (
    <>
      {showSplash && <SplashScreen onDone={()=>setShowSplash(false)}/>}
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
          <CompanyProvider>
            <Routes>

              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<DeviceRedirect />} />

              {/* ALL protected routes inside MainLayout */}
              <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>

                {/* Dashboard */}
                <Route path="dashboard" element={<DashboardPage />} />

                {/* HRD */}
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="attendance-admin" element={
                  <ProtectedRoute roles={['admin','hr']}><AttendanceAdminPage /></ProtectedRoute>
                } />
                <Route path="leaves" element={<LeavesPage />} />
                <Route path="payroll" element={<Navigate to="/payroll-pro" replace />} />
                <Route path="employees" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><EmployeesPage /></ProtectedRoute>
                } />
                <Route path="reports" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><ReportsPage /></ProtectedRoute>
                } />
                <Route path="payroll-pro" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><PayrollEnginePage /></ProtectedRoute>
                } />

                {/* Pengaturan */}
                <Route path="settings" element={<SettingsPage />} />
                <Route path="self-service" element={<SelfServicePage />} />
                <Route path="news" element={<NewsPage />} />
                <Route path="cleanup" element={<ProtectedRoute roles={['admin']}><CleanupPage /></ProtectedRoute>} />
                <Route path="backup" element={<ProtectedRoute roles={['admin']}><BackupPage /></ProtectedRoute>} />
                <Route path="org-chart" element={<ProtectedRoute roles={['admin','hr','supervisor']}><OrgChartPage /></ProtectedRoute>}/>
                <Route path="hr-assistant" element={<ProtectedRoute roles={['admin','hr']}><HRAssistantPage /></ProtectedRoute>}/>
                <Route path="departments" element={
                  <ProtectedRoute roles={['admin','hr']}><DepartmentsPage /></ProtectedRoute>
                } />
                <Route path="user-access" element={
                  <ProtectedRoute roles={['admin','hr']}><UserAccessPage /></ProtectedRoute>
                } />
                <Route path="company-settings" element={
                  <ProtectedRoute roles={['admin']}><CompanySettingsPage /></ProtectedRoute>
                } />
                <Route path="payroll-components" element={
                  <ProtectedRoute roles={['admin','hr']}><PayrollComponentManager /></ProtectedRoute>
                } />

                {/* Insentif */}
                <Route path="incentive" element={
                  <ProtectedRoute roles={['admin','hr']}><IncentiveDashboard /></ProtectedRoute>
                } />
                <Route path="incentive/master" element={
                  <ProtectedRoute roles={['admin','hr']}><MasterDataPage /></ProtectedRoute>
                } />
                <Route path="incentive/master/:section" element={
                  <ProtectedRoute roles={['admin','hr']}><MasterDataPage /></ProtectedRoute>
                } />
                <Route path="incentive/periods" element={
                  <ProtectedRoute roles={['admin','hr']}><PeriodsPage /></ProtectedRoute>
                } />
                <Route path="incentive/input/:periodId" element={
                  <ProtectedRoute roles={['admin','hr']}><InputDataPage /></ProtectedRoute>
                } />
                <Route path="incentive/results/:periodId" element={
                  <ProtectedRoute roles={['admin','hr','employee']}><ResultsPage /></ProtectedRoute>
                } />

                {/* ERP */}
                <Route path="erp" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><ErpDashboard /></ProtectedRoute>
                } />
                <Route path="erp/products" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><ProductsPage /></ProtectedRoute>
                } />
                <Route path="erp/orders" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><OrdersPage /></ProtectedRoute>
                } />
                <Route path="erp/orders/new" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><NewOrderPage /></ProtectedRoute>
                } />
                <Route path="erp/orders/:id" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><OrderDetailPage /></ProtectedRoute>
                } />
                <Route path="erp/customers" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><CustomersPage /></ProtectedRoute>
                } />
                <Route path="erp/sales-target" element={<ProtectedRoute roles={['admin','hr','supervisor']}><SalesTargetPage /></ProtectedRoute>}/>
                <Route path="erp/reports" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><SalesReportPage /></ProtectedRoute>
                } />
                <Route path="erp/import" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><ImportPage /></ProtectedRoute>
                } />
                <Route path="erp/purchases" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><PurchasesPage /></ProtectedRoute>
                } />
                <Route path="erp/expenses" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><ExpensesPage /></ProtectedRoute>
                } />
                <Route path="erp/profit-loss" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><ProfitLossPage /></ProtectedRoute>
                } />
                <Route path="erp/stock-opname" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><StockOpnamePage /></ProtectedRoute>
                } />
                <Route path="erp/inventory" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><InventoryPage /></ProtectedRoute>
                } />
                <Route path="erp/shipments" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><ShipmentsPage /></ProtectedRoute>
                } />
                <Route path="erp/returns" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><ReturnsPage /></ProtectedRoute>
                } />
                <Route path="erp/master" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><ErpMasterPage /></ProtectedRoute>
                } />
                <Route path="erp/daily-report" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><DailyReportPage /></ProtectedRoute>
                } />
                <Route path="erp/report-channel" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><ChannelReportPage /></ProtectedRoute>
                } />

                {/* ── Store Management ──────────────────── */}
                <Route path="store" element={
                  <ProtectedRoute roles={['admin','hr']}><StoreDashboard /></ProtectedRoute>
                } />
                <Route path="store/:brand/products" element={
                  <ProtectedRoute roles={['admin','hr']}><StoreProductsPage /></ProtectedRoute>
                } />
                <Route path="store/:brand/orders" element={
                  <ProtectedRoute roles={['admin','hr']}><StoreOrdersPage /></ProtectedRoute>
                } />
                <Route path="store/:brand/catalog" element={
                  <ProtectedRoute roles={['admin','hr']}><StoreCatalogPage /></ProtectedRoute>
                } />

                {/* 404 */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />

              </Route>

            </Routes>
          </CompanyProvider>
        </BrowserRouter>

        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '500',
              padding: '12px 16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: 'white' } },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
    </>
  );
}