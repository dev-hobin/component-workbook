import { TreeView } from './tree-compound'

// 간단한 아이콘 컴포넌트
function FolderIcon() {
  return <span>📁</span>
}

function FileIcon() {
  return <span>📄</span>
}

export function Example() {
  return (
    <div style={{ padding: 20, background: '#1e293b', minHeight: '100vh' }}>
      <h1 style={{ color: 'white', marginBottom: 20 }}>TreeView 테스트</h1>

      <TreeView.Root aria-label="파일 탐색기" className="tree-root">
        {/* 1depth - app 폴더 */}
        <TreeView.Item nodeId="app" className="tree-item">
          <div className="tree-item-content">
            <FolderIcon />
            <TreeView.Text>app</TreeView.Text>
          </div>

          <TreeView.SubRoot className="tree-group">
            {/* 2depth - src 폴더 */}
            <TreeView.Item nodeId="src" className="tree-item">
              <div className="tree-item-content">
                <FolderIcon />
                <TreeView.Text>src</TreeView.Text>
              </div>

              <TreeView.SubRoot className="tree-group">
                {/* 3depth - components 폴더 */}
                <TreeView.Item nodeId="components" className="tree-item">
                  <div className="tree-item-content">
                    <FolderIcon />
                    <TreeView.Text>components</TreeView.Text>
                  </div>

                  <TreeView.SubRoot className="tree-group">
                    {/* 4depth - 파일들 */}
                    <TreeView.Item nodeId="button" className="tree-item">
                      <div className="tree-item-content">
                        <FileIcon />
                        <TreeView.Text>Button.tsx</TreeView.Text>
                      </div>
                    </TreeView.Item>

                    <TreeView.Item nodeId="dialog" className="tree-item">
                      <div className="tree-item-content">
                        <FileIcon />
                        <TreeView.Text>Dialog.tsx</TreeView.Text>
                      </div>
                    </TreeView.Item>
                  </TreeView.SubRoot>
                </TreeView.Item>

                {/* 3depth - hooks 폴더 */}
                <TreeView.Item nodeId="hooks" className="tree-item">
                  <div className="tree-item-content">
                    <FolderIcon />
                    <TreeView.Text>hooks</TreeView.Text>
                  </div>

                  <TreeView.SubRoot className="tree-group">
                    <TreeView.Item nodeId="use-tree" className="tree-item">
                      <div className="tree-item-content">
                        <FileIcon />
                        <TreeView.Text>useTree.ts</TreeView.Text>
                      </div>
                    </TreeView.Item>
                  </TreeView.SubRoot>
                </TreeView.Item>
              </TreeView.SubRoot>
            </TreeView.Item>

            {/* 2depth - public 폴더 */}
            <TreeView.Item nodeId="public" className="tree-item">
              <div className="tree-item-content">
                <FolderIcon />
                <TreeView.Text>public</TreeView.Text>
              </div>

              <TreeView.SubRoot className="tree-group">
                <TreeView.Item nodeId="favicon" className="tree-item">
                  <div className="tree-item-content">
                    <FileIcon />
                    <TreeView.Text>favicon.ico</TreeView.Text>
                  </div>
                </TreeView.Item>
              </TreeView.SubRoot>
            </TreeView.Item>

            {/* 2depth - 루트 파일들 */}
            <TreeView.Item nodeId="package" className="tree-item">
              <div className="tree-item-content">
                <FileIcon />
                <TreeView.Text>package.json</TreeView.Text>
              </div>
            </TreeView.Item>

            <TreeView.Item nodeId="tsconfig" className="tree-item">
              <div className="tree-item-content">
                <FileIcon />
                <TreeView.Text>tsconfig.json</TreeView.Text>
              </div>
            </TreeView.Item>
          </TreeView.SubRoot>
        </TreeView.Item>

        {/* 1depth - 또 다른 루트 폴더 */}
        <TreeView.Item nodeId="docs" className="tree-item">
          <div className="tree-item-content">
            <FolderIcon />
            <TreeView.Text>docs</TreeView.Text>
          </div>

          <TreeView.SubRoot className="tree-group">
            <TreeView.Item nodeId="readme" className="tree-item">
              <div className="tree-item-content">
                <FileIcon />
                <TreeView.Text>README.md</TreeView.Text>
              </div>
            </TreeView.Item>
          </TreeView.SubRoot>
        </TreeView.Item>
      </TreeView.Root>

      <style>{`
        .tree-root {
          color: #f1f5f9;
          font-size: 14px;
          font-family: system-ui, sans-serif;
          list-style: none;
          padding: 8px;
          margin: 0;
          outline: none;
          border-radius: 8px;
          background: #0f172a;
        }

        .tree-root:focus-visible {
          ring: 2px solid #3b82f6;
        }

        .tree-item {
          list-style: none;
          padding: 2px 0;
          outline: none;
        }

        .tree-item-content {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
        }

        .tree-item-content:hover {
          background: #334155;
        }

        /* 포커스 상태 */
        .tree-item[data-focused="true"] > .tree-item-content {
          background: #1e40af;
        }

        /* 선택 상태 */
        .tree-item[data-selected="true"] > .tree-item-content {
          background: #1d4ed8;
        }

        .tree-group {
          list-style: none;
          padding-left: 20px;
          margin: 0;
          border-left: 1px solid #334155;
          margin-left: 8px;
        }

        /* hidden 속성으로 숨김 처리됨 */
        .tree-group[hidden] {
          display: none;
        }
      `}</style>
    </div>
  )
}
