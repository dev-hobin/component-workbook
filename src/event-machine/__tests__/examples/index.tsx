/**
 * Phase 4 검증: 예제 컴포넌트 모음
 */

import { useState } from 'react'
import { AsyncCombobox } from './AsyncCombobox'
import { HoverMenu } from './HoverMenu'
import { HoverMenuCompoundTest } from './HoverMenuCompound'
import { AsyncComboboxCompoundTest } from './AsyncComboboxCompound'

type Tab = 'combobox' | 'hover' | 'combobox-compound' | 'hover-compound'

export function Phase4Examples() {
  const [tab, setTab] = useState<Tab>('combobox')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'combobox', label: 'Async Combobox' },
    { id: 'combobox-compound', label: 'Combobox (Compound)' },
    { id: 'hover', label: 'Hover Menu' },
    { id: 'hover-compound', label: 'Hover (Compound)' },
  ]

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <div style={{ padding: 20, borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: 0 }}>Phase 4: Event Machine Examples</h2>
        <p style={{ color: '#666', margin: '10px 0 0' }}>
          새 기능 검증을 위한 예제 컴포넌트
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '10px 20px', borderBottom: '1px solid #eee' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              backgroundColor: tab === t.id ? '#007bff' : '#f0f0f0',
              color: tab === t.id ? 'white' : 'black',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 20 }}>
        {tab === 'combobox' && <AsyncCombobox />}
        {tab === 'combobox-compound' && <AsyncComboboxCompoundTest />}
        {tab === 'hover' && <HoverMenu />}
        {tab === 'hover-compound' && <HoverMenuCompoundTest />}
      </div>
    </div>
  )
}

export { AsyncCombobox } from './AsyncCombobox'
export { HoverMenu } from './HoverMenu'
