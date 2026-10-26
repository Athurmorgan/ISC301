import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { syncBooks } from './services/syncService'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Có backend thì lấy giá và tồn kho mới nhất; không có thì dùng dữ liệu đã lưu trên máy
void syncBooks()
