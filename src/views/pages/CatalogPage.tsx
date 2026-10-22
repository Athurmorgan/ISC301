import { useEffect, useState, type ReactNode } from 'react'
import { CATEGORIES } from '../../data/catalog'
import { useCatalog } from '../../controllers/useBooks'
import { PRICE_BANDS, SORT_LABEL, type CatalogQuery, type PriceBand, type SortKey } from '../../models/catalogQuery'
import { BookCard } from '../components/BookCard'
import { Icon } from '../components/Icon'
import { EmptyState, Pagination } from '../components/ui'

export function CatalogPage() {
  const { query, result, update, activeFilters, reset } = useCatalog()
  const [drawer, setDrawer] = useState(false)
  const category = CATEGORIES.find((c) => c.id === query.category)

  useEffect(() => {
    document.title = `${category?.name ?? 'Tủ sách'} — BookWise`
  }, [category])

  const heading = query.q ? `Kết quả cho “${query.q}”` : query.deals ? 'Giá tốt hôm nay' : (category?.name ?? 'Toàn bộ tủ sách')

  return (
    <div className="container-page pt-10 sm:pt-14">
      <header className="border-b border-ink pb-6">
        <p className="eyebrow">Tủ sách</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl leading-tight sm:text-5xl">{heading}</h1>
          <p className="text-sm text-ink-mute num">{result.total} đầu sách</p>
        </div>
        {category && !query.q && <p className="mt-2 text-ink-soft">{category.blurb}</p>}
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-12">
        <aside className="hidden lg:block" aria-label="Bộ lọc">
          <Filters query={query} update={update} />
        </aside>

        <div>
          <div className="mb-8 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setDrawer(true)} className="btn-ghost btn-sm lg:hidden">
              Bộ lọc{activeFilters > 0 && <span className="num"> ({activeFilters})</span>}
            </button>
            {activeFilters > 0 ? (
              <ActiveChips query={query} update={update} reset={reset} />
            ) : (
              <span className="hidden text-sm text-ink-mute lg:block">Tất cả sách đều qua kiểm định 7 bước.</span>
            )}
            <label className="ml-auto flex shrink-0 items-center gap-2 text-sm">
              <span className="hidden text-ink-mute sm:inline">Sắp xếp</span>
              <span className="relative">
                <select
                  value={query.sort}
                  onChange={(e) => update({ sort: e.target.value as SortKey })}
                  className="h-9 appearance-none border border-rule bg-card pl-3 pr-8 text-sm focus:border-ink focus:outline-none"
                  aria-label="Sắp xếp"
                >
                  {Object.entries(SORT_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <Icon name="chevronDown" size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
              </span>
            </label>
          </div>

          {result.items.length ? (
            <>
              <div className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 xl:grid-cols-4">
                {result.items.map((b, i) => (
                  <BookCard key={b.id} book={b} eager={i < 4} />
                ))}
              </div>
              <div className="mt-14">
                <Pagination page={result.page} pageCount={result.pageCount} onChange={(page) => update({ page })} />
              </div>
            </>
          ) : (
            <EmptyState
              title="Chưa có cuốn nào khớp bộ lọc"
              action={
                <button type="button" onClick={reset} className="btn-outline btn-sm">
                  Xoá bộ lọc
                </button>
              }
            >
              Thử bỏ bớt điều kiện, hoặc tìm theo tên tác giả không dấu, ví dụ “haruki”.
            </EmptyState>
          )}
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 flex bg-ink/50 animate-fade lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(false)}>
          <div className="ml-auto flex h-full w-[min(22rem,88vw)] flex-col bg-paper">
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <p className="font-display text-xl">Bộ lọc</p>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Đóng" className="-mr-2 grid h-9 w-9 place-items-center">
                <Icon name="close" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <Filters query={query} update={update} />
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-rule p-4">
              <button type="button" onClick={reset} className="btn-ghost">
                Xoá lọc
              </button>
              <button type="button" onClick={() => setDrawer(false)} className="btn-ink">
                Xem {result.total} sách
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type Update = (patch: Partial<CatalogQuery>) => void

function Filters({ query, update }: { query: CatalogQuery; update: Update }) {
  return (
    <div className="space-y-8">
      <FilterGroup title="Thể loại">
        <Radio checked={query.category === 'all'} onChange={() => update({ category: 'all' })} label="Tất cả" />
        {CATEGORIES.map((c) => (
          <Radio key={c.id} checked={query.category === c.id} onChange={() => update({ category: c.id })} label={c.name} />
        ))}
      </FilterGroup>

      <FilterGroup title="Khoảng giá">
        {(Object.keys(PRICE_BANDS) as PriceBand[]).map((k) => (
          <Radio key={k} checked={query.price === k} onChange={() => update({ price: k })} label={PRICE_BANDS[k].label} />
        ))}
      </FilterGroup>

      <FilterGroup title="Khác">
        <Check checked={query.inStock} onChange={(v) => update({ inStock: v })} label="Chỉ sách còn hàng" />
        <Check checked={query.deals} onChange={(v) => update({ deals: v })} label="Đang có giá tốt" />
      </FilterGroup>
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-3 w-full border-b border-rule pb-2">{title}</legend>
      <div className="space-y-0.5">{children}</div>
    </fieldset>
  )
}

function Radio({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5 text-sm">
      <input type="radio" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className={`h-3.5 w-3.5 shrink-0 rounded-full border ${checked ? 'border-ink bg-ink shadow-[inset_0_0_0_3px_var(--color-paper)]' : 'border-rule'} peer-focus-visible:outline-2 peer-focus-visible:outline-forest`} />
      <span className={checked ? 'font-semibold text-ink' : 'text-ink-soft hover:text-ink'}>{label}</span>
    </label>
  )
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className={`grid h-3.5 w-3.5 shrink-0 place-items-center border ${checked ? 'border-ink bg-ink text-paper' : 'border-rule'} peer-focus-visible:outline-2 peer-focus-visible:outline-forest`}>
        {checked && <Icon name="check" size={10} />}
      </span>
      <span className={checked ? 'font-semibold text-ink' : 'text-ink-soft hover:text-ink'}>{label}</span>
    </label>
  )
}

function ActiveChips({ query, update, reset }: { query: CatalogQuery; update: Update; reset: () => void }) {
  const chips: { label: string; clear: Partial<CatalogQuery> }[] = []
  if (query.q) chips.push({ label: `“${query.q}”`, clear: { q: '' } })
  if (query.category !== 'all') chips.push({ label: CATEGORIES.find((c) => c.id === query.category)!.name, clear: { category: 'all' } })
  if (query.price !== 'all') chips.push({ label: PRICE_BANDS[query.price].label, clear: { price: 'all' } })
  if (query.inStock) chips.push({ label: 'Còn hàng', clear: { inStock: false } })
  if (query.deals) chips.push({ label: 'Giá tốt', clear: { deals: false } })

  return (
    <div className="hidden flex-wrap items-center gap-2 sm:flex">
      {chips.map((c) => (
        <button key={c.label} type="button" onClick={() => update(c.clear)} className="inline-flex h-7 items-center gap-1.5 border border-ink px-2 text-xs hover:bg-ink hover:text-paper">
          {c.label}
          <Icon name="close" size={12} />
        </button>
      ))}
      <button type="button" onClick={reset} className="text-xs text-ink-mute underline underline-offset-4 hover:text-ink">
        Xoá tất cả
      </button>
    </div>
  )
}
