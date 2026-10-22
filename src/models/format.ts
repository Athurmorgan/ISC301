const vnd = new Intl.NumberFormat('vi-VN')

export const formatMoney = (amount: number) => `${vnd.format(Math.round(amount))}đ`

export const formatNumber = (n: number) => vnd.format(n)

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })

export const percentOff = (price: number, listPrice: number) =>
  listPrice > price ? Math.round((1 - price / listPrice) * 100) : 0

/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu */
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
