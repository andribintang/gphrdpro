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
import LeavesPage from './pages/LeavesPage';
import EmployeesPage from './pages/EmployeesPage';
import ReportsPage from './pages/ReportsPage';
import PayrollEnginePage from './pages/PayrollEnginePage';
import SettingsPage from './pages/SettingsPage';
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
import SalesReportPage from './pages/erp/SalesReportPage';
import ImportPage      from './pages/erp/ImportPage';
import PurchasesPage   from './pages/erp/PurchasesPage';
import ExpensesPage    from './pages/erp/ExpensesPage';
import ProfitLossPage  from './pages/erp/ProfitLossPage';
import StockOpnamePage from './pages/erp/StockOpnamePage';
import ShipmentsPage   from './pages/erp/ShipmentsPage';
import ReturnsPage     from './pages/erp/ReturnsPage';
import ErpMasterPage   from './pages/erp/MasterDataPage';
import DailyReportPage  from './pages/erp/DailyReportPage';
import ChannelReportPage from './pages/erp/ChannelReportPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <CompanyProvider>
            <Routes>

              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

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
                  <ProtectedRoute roles={['admin','hr']}><ResultsPage /></ProtectedRoute>
                } />

                {/* ERP */}
                <Route path="erp" element={
                  <ProtectedRoute roles={['admin','hr','supervisor','employee']}><ErpDashboard /></ProtectedRoute>
                } />
                <Route path="erp/products" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><ProductsPage /></ProtectedRoute>
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
                  <ProtectedRoute roles={['admin','hr','supervisor']}><CustomersPage /></ProtectedRoute>
                } />
                <Route path="erp/reports" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><SalesReportPage /></ProtectedRoute>
                } />
                <Route path="erp/import" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><ImportPage /></ProtectedRoute>
                } />
                <Route path="erp/purchases" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><PurchasesPage /></ProtectedRoute>
                } />
                <Route path="erp/expenses" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><ExpensesPage /></ProtectedRoute>
                } />
                <Route path="erp/profit-loss" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><ProfitLossPage /></ProtectedRoute>
                } />
                <Route path="erp/stock-opname" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><StockOpnamePage /></ProtectedRoute>
                } />
                <Route path="erp/shipments" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><ShipmentsPage /></ProtectedRoute>
                } />
                <Route path="erp/returns" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><ReturnsPage /></ProtectedRoute>
                } />
                <Route path="erp/master" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><ErpMasterPage /></ProtectedRoute>
                } />
                <Route path="erp/daily-report" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><DailyReportPage /></ProtectedRoute>
                } />
                <Route path="erp/report-channel" element={
                  <ProtectedRoute roles={['admin','hr','supervisor']}><ChannelReportPage /></ProtectedRoute>
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
  );
}
