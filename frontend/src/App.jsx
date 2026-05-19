import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout  from './components/MainLayout';
import ErpLayout   from './components/ErpLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import LeavesPage from './pages/LeavesPage';
import EmployeesPage from './pages/EmployeesPage';
import ReportsPage from './pages/ReportsPage';
import PayrollEnginePage from './pages/PayrollEnginePage';
import SettingsPage from './pages/SettingsPage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import ErpDashboard  from './pages/erp/ErpDashboard';
import ProductsPage  from './pages/erp/ProductsPage';
import OrdersPage    from './pages/erp/OrdersPage';
import NewOrderPage    from './pages/erp/NewOrderPage';
import OrderDetailPage from './pages/erp/OrderDetailPage';
import CustomersPage   from './pages/erp/CustomersPage';
import SalesReportPage from './pages/erp/SalesReportPage';
import ImportPage        from './pages/erp/ImportPage';
import PurchasesPage    from './pages/erp/PurchasesPage';
import ExpensesPage     from './pages/erp/ExpensesPage';
import ProfitLossPage   from './pages/erp/ProfitLossPage';
import StockOpnamePage  from './pages/erp/StockOpnamePage';
import PayrollComponentManager from './pages/PayrollComponentManager';
import IncentiveDashboard from './pages/incentive/IncentiveDashboard';
import MasterDataPage from './pages/incentive/MasterDataPage';
import PeriodsPage from './pages/incentive/PeriodsPage';
import InputDataPage from './pages/incentive/InputDataPage';
import ResultsPage from './pages/incentive/ResultsPage';

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

            {/* Protected - with main layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="leaves" element={<LeavesPage />} />
              <Route path="payroll" element={<Navigate to="/payroll-pro" replace />} />
              <Route
                path="employees"
                element={
                  <ProtectedRoute roles={['admin', 'hr', 'supervisor']}>
                    <EmployeesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <ProtectedRoute roles={['admin', 'hr', 'supervisor']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="payroll-pro"
                element={
                  <ProtectedRoute roles={['admin', 'hr', 'supervisor', 'employee']}>
                    <PayrollEnginePage />
                  </ProtectedRoute>
                }
              />
              {/* Incentive System */}
              <Route path="incentive" element={<ProtectedRoute roles={['admin','hr']}><IncentiveDashboard /></ProtectedRoute>} />
              <Route path="incentive/master" element={<ProtectedRoute roles={['admin','hr']}><MasterDataPage /></ProtectedRoute>} />
              <Route path="incentive/master/:section" element={<ProtectedRoute roles={['admin','hr']}><MasterDataPage /></ProtectedRoute>} />
              <Route path="incentive/periods" element={<ProtectedRoute roles={['admin','hr']}><PeriodsPage /></ProtectedRoute>} />
              <Route path="incentive/input/:periodId" element={<ProtectedRoute roles={['admin','hr']}><InputDataPage /></ProtectedRoute>} />
              <Route path="incentive/results/:periodId" element={<ProtectedRoute roles={['admin','hr']}><ResultsPage /></ProtectedRoute>} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="company-settings" element={
                <ProtectedRoute roles={['admin']}><CompanySettingsPage /></ProtectedRoute>
              } />
              <Route path="payroll-components" element={
                <ProtectedRoute roles={['admin','hr']}><PayrollComponentManager /></ProtectedRoute>
              } />
            </Route>


            {/* ERP — ErpLayout provides secondary sidebar */}
            <Route path="erp" element={<ErpLayout />}>
              <Route index element={<ProtectedRoute roles={['admin','hr','supervisor','employee']}><ErpDashboard /></ProtectedRoute>} />
              <Route path="products"     element={<ProtectedRoute roles={['admin','hr']}><ProductsPage /></ProtectedRoute>} />
              <Route path="orders"       element={<ProtectedRoute roles={['admin','hr','supervisor','employee']}><OrdersPage /></ProtectedRoute>} />
              <Route path="orders/new"   element={<ProtectedRoute roles={['admin','hr','supervisor','employee']}><NewOrderPage /></ProtectedRoute>} />
              <Route path="orders/:id"   element={<ProtectedRoute roles={['admin','hr','supervisor','employee']}><OrderDetailPage /></ProtectedRoute>} />
              <Route path="customers"    element={<ProtectedRoute roles={['admin','hr']}><CustomersPage /></ProtectedRoute>} />
              <Route path="reports"      element={<ProtectedRoute roles={['admin','hr']}><SalesReportPage /></ProtectedRoute>} />
              <Route path="import"       element={<ProtectedRoute roles={['admin','hr']}><ImportPage /></ProtectedRoute>} />
              <Route path="purchases"    element={<ProtectedRoute roles={['admin','hr']}><PurchasesPage /></ProtectedRoute>} />
              <Route path="expenses"     element={<ProtectedRoute roles={['admin','hr']}><ExpensesPage /></ProtectedRoute>} />
              <Route path="profit-loss"  element={<ProtectedRoute roles={['admin','hr']}><ProfitLossPage /></ProtectedRoute>} />
              <Route path="stock-opname" element={<ProtectedRoute roles={['admin','hr']}><StockOpnamePage /></ProtectedRoute>} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </CompanyProvider>
        </BrowserRouter>

        {/* Toast notifications */}
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
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              padding: '12px 16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: 'white' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: 'white' },
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}


