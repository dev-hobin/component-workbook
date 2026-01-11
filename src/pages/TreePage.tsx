import { useState } from 'react'
import Tree from '../components/tree/styled'

export default function TreePage() {
  const [selectedValues, setSelectedValues] = useState<string[]>([])

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tree View</h1>
        <p className="mt-2 text-gray-600">
          A hierarchical tree view with keyboard navigation and expand/collapse
          support.
        </p>
      </div>

      {/* Basic Example */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Basic Tree</h2>
        <p className="text-sm text-gray-600">
          Click to expand/collapse folders. Use arrow keys to navigate.
        </p>
        <Tree.Root
          defaultExpandedValues={['documents']}
          selectedValues={selectedValues}
          onSelectedValuesChange={setSelectedValues}
          aria-label="File explorer"
        >
          <Tree.Item value="documents" textValue="Documents">
            <Tree.ItemLabel>
              <Tree.FolderIcon />
              Documents
            </Tree.ItemLabel>
            <Tree.ItemGroup>
              <Tree.Item value="documents-work" textValue="Work">
                <Tree.ItemLabel>
                  <Tree.FolderIcon />
                  Work
                </Tree.ItemLabel>
                <Tree.ItemGroup>
                  <Tree.Item value="documents-work-report" textValue="Annual Report.pdf">
                    <Tree.ItemLabel>
                      <Tree.FileIcon />
                      Annual Report.pdf
                    </Tree.ItemLabel>
                  </Tree.Item>
                  <Tree.Item value="documents-work-presentation" textValue="Presentation.pptx">
                    <Tree.ItemLabel>
                      <Tree.FileIcon />
                      Presentation.pptx
                    </Tree.ItemLabel>
                  </Tree.Item>
                </Tree.ItemGroup>
              </Tree.Item>
              <Tree.Item value="documents-personal" textValue="Personal">
                <Tree.ItemLabel>
                  <Tree.FolderIcon />
                  Personal
                </Tree.ItemLabel>
                <Tree.ItemGroup>
                  <Tree.Item value="documents-personal-resume" textValue="Resume.docx">
                    <Tree.ItemLabel>
                      <Tree.FileIcon />
                      Resume.docx
                    </Tree.ItemLabel>
                  </Tree.Item>
                </Tree.ItemGroup>
              </Tree.Item>
            </Tree.ItemGroup>
          </Tree.Item>
          <Tree.Item value="downloads" textValue="Downloads">
            <Tree.ItemLabel>
              <Tree.FolderIcon />
              Downloads
            </Tree.ItemLabel>
            <Tree.ItemGroup>
              <Tree.Item value="downloads-image" textValue="image.png">
                <Tree.ItemLabel>
                  <Tree.FileIcon />
                  image.png
                </Tree.ItemLabel>
              </Tree.Item>
              <Tree.Item value="downloads-archive" textValue="archive.zip">
                <Tree.ItemLabel>
                  <Tree.FileIcon />
                  archive.zip
                </Tree.ItemLabel>
              </Tree.Item>
            </Tree.ItemGroup>
          </Tree.Item>
          <Tree.Item value="readme" textValue="README.md">
            <Tree.ItemLabel>
              <Tree.FileIcon />
              README.md
            </Tree.ItemLabel>
          </Tree.Item>
        </Tree.Root>
        {selectedValues.length > 0 && (
          <p className="text-sm text-gray-600">
            Selected:{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">
              {selectedValues.join(', ')}
            </code>
          </p>
        )}
      </section>

      {/* Multi-Select Example */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Multi-Select Tree
        </h2>
        <p className="text-sm text-gray-600">
          Press Space to toggle selection. Multiple items can be selected.
        </p>
        <MultiSelectExample />
      </section>

      {/* Deep Nesting Example */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Deep Nesting (4+ Levels)
        </h2>
        <p className="text-sm text-gray-600">
          Test deep hierarchies with keyboard navigation.
        </p>
        <Tree.Root
          defaultExpandedValues={['root', 'level-1', 'level-2', 'level-3']}
          aria-label="Deep nested tree"
        >
          <Tree.Item value="root" textValue="Root">
            <Tree.ItemLabel>
              <Tree.FolderIcon />
              Root
            </Tree.ItemLabel>
            <Tree.ItemGroup>
              <Tree.Item value="level-1" textValue="Level 1">
                <Tree.ItemLabel>
                  <Tree.FolderIcon />
                  Level 1
                </Tree.ItemLabel>
                <Tree.ItemGroup>
                  <Tree.Item value="level-2" textValue="Level 2">
                    <Tree.ItemLabel>
                      <Tree.FolderIcon />
                      Level 2
                    </Tree.ItemLabel>
                    <Tree.ItemGroup>
                      <Tree.Item value="level-3" textValue="Level 3">
                        <Tree.ItemLabel>
                          <Tree.FolderIcon />
                          Level 3
                        </Tree.ItemLabel>
                        <Tree.ItemGroup>
                          <Tree.Item value="level-4" textValue="Level 4 File">
                            <Tree.ItemLabel>
                              <Tree.FileIcon />
                              Level 4 File
                            </Tree.ItemLabel>
                          </Tree.Item>
                        </Tree.ItemGroup>
                      </Tree.Item>
                    </Tree.ItemGroup>
                  </Tree.Item>
                </Tree.ItemGroup>
              </Tree.Item>
            </Tree.ItemGroup>
          </Tree.Item>
        </Tree.Root>
      </section>

      {/* Keyboard Navigation Info */}
      <section className="p-4 bg-gray-800 text-white rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Keyboard Navigation</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-300 mb-1">Navigation</h3>
            <ul className="text-sm space-y-1 text-gray-400">
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Down</kbd> - Next
                visible item
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Up</kbd> - Previous
                visible item
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Home</kbd> - First
                item
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">End</kbd> - Last
                visible item
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">A-Z</kbd> - Jump to
                matching item
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-300 mb-1">
              Expand/Collapse
            </h3>
            <ul className="text-sm space-y-1 text-gray-400">
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Right</kbd> - Expand
                or move to first child
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Left</kbd> - Collapse
                or move to parent
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> - Toggle
                expand (folder) or select (file)
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">*</kbd> - Expand all
                siblings
              </li>
            </ul>
          </div>
          <div className="col-span-2">
            <h3 className="font-semibold text-gray-300 mb-1">Selection</h3>
            <ul className="text-sm space-y-1 text-gray-400">
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> - Select
                item (single-select mode)
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Space</kbd> - Toggle
                selection (multi-select mode)
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

function MultiSelectExample() {
  const [selectedValues, setSelectedValues] = useState<string[]>([])

  return (
    <>
      <Tree.Root
        selectionMode="multiple"
        selectedValues={selectedValues}
        onSelectedValuesChange={setSelectedValues}
        aria-label="Multi-select tree"
      >
        <Tree.Item value="fruits" textValue="Fruits">
          <Tree.ItemLabel>
            <Tree.FolderIcon />
            Fruits
          </Tree.ItemLabel>
          <Tree.ItemGroup>
            <Tree.Item value="apple" textValue="Apple">
              <Tree.ItemLabel>
                <Tree.FileIcon />
                Apple
              </Tree.ItemLabel>
            </Tree.Item>
            <Tree.Item value="banana" textValue="Banana">
              <Tree.ItemLabel>
                <Tree.FileIcon />
                Banana
              </Tree.ItemLabel>
            </Tree.Item>
            <Tree.Item value="cherry" textValue="Cherry">
              <Tree.ItemLabel>
                <Tree.FileIcon />
                Cherry
              </Tree.ItemLabel>
            </Tree.Item>
          </Tree.ItemGroup>
        </Tree.Item>
        <Tree.Item value="vegetables" textValue="Vegetables">
          <Tree.ItemLabel>
            <Tree.FolderIcon />
            Vegetables
          </Tree.ItemLabel>
          <Tree.ItemGroup>
            <Tree.Item value="carrot" textValue="Carrot">
              <Tree.ItemLabel>
                <Tree.FileIcon />
                Carrot
              </Tree.ItemLabel>
            </Tree.Item>
            <Tree.Item value="broccoli" textValue="Broccoli">
              <Tree.ItemLabel>
                <Tree.FileIcon />
                Broccoli
              </Tree.ItemLabel>
            </Tree.Item>
          </Tree.ItemGroup>
        </Tree.Item>
      </Tree.Root>
      {selectedValues.length > 0 && (
        <p className="text-sm text-gray-600">
          Selected ({selectedValues.length}):{' '}
          <code className="bg-gray-100 px-2 py-1 rounded">
            {selectedValues.join(', ')}
          </code>
        </p>
      )}
    </>
  )
}
