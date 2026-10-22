import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './views/layout/Layout'
import { AccountPage } from './views/pages/AccountPage'
import { AdminPage } from './views/pages/AdminPage'
import { BookPage } from './views/pages/BookPage'
import { CartPage } from './views/pages/CartPage'
import { CatalogPage } from './views/pages/CatalogPage'
import { CheckoutPage } from './views/pages/CheckoutPage'
import { HomePage } from './views/pages/HomePage'
import { NotFoundPage } from './views/pages/NotFoundPage'
import { ReportPage } from './views/pages/ReportPage'
import { SupportPage } from './views/pages/SupportPage'
import { TrackingPage } from './views/pages/TrackingPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="sach" element={<CatalogPage />} />
          <Route path="sach/:id" element={<BookPage />} />
          <Route path="gio-hang" element={<CartPage />} />
          <Route path="thanh-toan" element={<CheckoutPage />} />
          <Route path="don-hang" element={<TrackingPage />} />
          <Route path="tai-khoan" element={<AccountPage />} />
          <Route path="quan-tri" element={<AdminPage />} />
          <Route path="ho-tro" element={<SupportPage />} />
          <Route path="bao-cao" element={<ReportPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
