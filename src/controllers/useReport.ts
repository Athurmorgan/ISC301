import { useMemo } from 'react'
import { booksToCsv, ordersToCsv, salesFromOrders, sampleSales, type ReportRange } from '../models/report'
import { useBooks } from './useBooks'
import { useAllOrders } from './useOrders'

export function useSalesReport(range: ReportRange) {
  const orders = useAllOrders()
  const books = useBooks()
  const report = useMemo(() => salesFromOrders(orders, range) ?? sampleSales(books), [orders, books, range])

  function downloadCsv() {
    const csv = orders.length ? ordersToCsv(orders) : booksToCsv(books)
    // BOM để Excel đọc đúng tiếng Việt
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `bookwise-${orders.length ? 'don-hang' : 'kho-sach'}-${new Date().toISOString().slice(0, 10)}.csv`,
    })
    a.click()
    URL.revokeObjectURL(url)
  }

  return { report, downloadCsv, hasOrders: orders.length > 0 }
}
