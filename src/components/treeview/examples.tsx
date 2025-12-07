import { useState } from 'react'
import TreeView from '.'
import type { NodeId } from '../../core/composite-store'

export function Example() {
  const [expandedIds, setExpandedIds] = useState<NodeId[]>(['_A_', '_A2_'])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">
            Uncontrolled Tabs (Horizontal)
          </h2>
          <TreeView.Root
            expandedIds={expandedIds}
            onExpandedIdsChange={(next) => {
              console.log('[expandedIds changed]:', next)
              setExpandedIds(next)
            }}
          >
            <TreeView.Item nodeId="_A_">
              <TreeView.Indicator /> <TreeView.Text>A (Parent)</TreeView.Text>
              <TreeView.SubRoot>
                <TreeView.Item nodeId="_A1_">
                  <TreeView.Indicator /> <TreeView.Text>A-1</TreeView.Text>
                </TreeView.Item>

                <TreeView.Item nodeId="_A2_">
                  <TreeView.Indicator />{' '}
                  <TreeView.Text>A-2 (Parent)</TreeView.Text>
                  <TreeView.SubRoot>
                    <TreeView.Item nodeId="_A2_a">
                      <TreeView.Indicator />{' '}
                      <TreeView.Text>A-2-a</TreeView.Text>
                    </TreeView.Item>

                    <TreeView.Item nodeId="_A2_b">
                      <TreeView.Indicator />{' '}
                      <TreeView.Text>A-2-b</TreeView.Text>
                    </TreeView.Item>
                  </TreeView.SubRoot>
                </TreeView.Item>
              </TreeView.SubRoot>
            </TreeView.Item>

            <TreeView.Item nodeId="_B_">
              <TreeView.Indicator /> <TreeView.Text>B</TreeView.Text>
            </TreeView.Item>

            <TreeView.Item nodeId="_C_">
              <TreeView.Indicator /> <TreeView.Text>C</TreeView.Text>
            </TreeView.Item>
          </TreeView.Root>
        </div>
      </div>
    </div>
  )
}
