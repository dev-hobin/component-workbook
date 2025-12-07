import TreeView from '.'

function FolderIcon() {
  return <span className="text-sky-400 mr-1">📁</span>
}

function FileIcon() {
  return <span className="text-slate-400 mr-1">📄</span>
}

export function Example() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-[360px] rounded-xl border border-slate-800 bg-slate-900/80 shadow-lg shadow-slate-950/60 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">
            Project Explorer
          </h2>
          <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
            TreeView demo
          </span>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/40">
          <TreeView.Root className="p-2 text-[13px] text-slate-50 outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded-lg">
            {/* root */}
            <TreeView.Item
              nodeId="root"
              className="px-1 py-0.5 cursor-pointer hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60 data-[selected=true]:border-l-2 data-[selected=true]:border-l-sky-500"
            >
              <div className="flex items-center gap-1">
                <FolderIcon />
                <TreeView.Text>app</TreeView.Text>
              </div>

              <TreeView.SubRoot className="mt-0.5 ml-3 border-l border-slate-800/60 pl-2 space-y-0.5 hidden data-[expanded=true]:block">
                {/* src */}
                <TreeView.Item
                  nodeId="root-src"
                  className="px-1 py-0.5 cursor-pointer hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60 data-[selected=true]:border-l-2 data-[selected=true]:border-l-sky-500"
                >
                  <div className="flex items-center gap-1">
                    <FolderIcon />
                    <TreeView.Text>src</TreeView.Text>
                  </div>

                  <TreeView.SubRoot className="mt-0.5 ml-3 border-l border-slate-800/60 pl-2 space-y-0.5 hidden data-[expanded=true]:block">
                    {/* components */}
                    <TreeView.Item
                      nodeId="root-src-components"
                      className="px-1 py-0.5 cursor-pointer hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60 data-[selected=true]:border-l-2 data-[selected=true]:border-l-sky-500"
                    >
                      <div className="flex items-center gap-1">
                        <FolderIcon />
                        <TreeView.Text>components</TreeView.Text>
                      </div>

                      <TreeView.SubRoot className="mt-0.5 ml-3 border-l border-slate-800/60 pl-2 space-y-0.5 hidden data-[expanded=true]:block">
                        <TreeView.Item
                          nodeId="root-src-components-button"
                          className="px-1 py-0.5 cursor-pointer hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60 data-[selected=true]:border-l-2 data-[selected=true]:border-l-sky-500"
                        >
                          <div className="flex items-center gap-1">
                            <FileIcon />
                            <TreeView.Text>Button.tsx</TreeView.Text>
                          </div>
                        </TreeView.Item>

                        <TreeView.Item
                          nodeId="root-src-components-dialog"
                          className="px-1 py-0.5 cursor-pointer hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60 data-[selected=true]:border-l-2 data-[selected=true]:border-l-sky-500"
                        >
                          <div className="flex items-center gap-1">
                            <FileIcon />
                            <TreeView.Text>Dialog.tsx</TreeView.Text>
                          </div>
                        </TreeView.Item>
                      </TreeView.SubRoot>
                    </TreeView.Item>

                    {/* hooks */}
                    <TreeView.Item
                      nodeId="root-src-hooks"
                      className="px-1 py-0.5 cursor-pointer hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60 data-[selected=true]:border-l-2 data-[selected=true]:border-l-sky-500"
                    >
                      <div className="flex items-center gap-1">
                        <FolderIcon />
                        <TreeView.Text>hooks</TreeView.Text>
                      </div>

                      <TreeView.SubRoot className="mt-0.5 ml-3 border-l border-slate-800/60 pl-2 space-y-0.5 hidden data-[expanded=true]:block">
                        <TreeView.Item
                          nodeId="root-src-hooks-treeview"
                          className="px-1 py-0.5 cursor-pointer hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60 data-[selected=true]:border-l-2 data-[selected=true]:border-l-sky-500"
                        >
                          <div className="flex items-center gap-1">
                            <FileIcon />
                            <TreeView.Text>useTreeView.ts</TreeView.Text>
                          </div>
                        </TreeView.Item>
                      </TreeView.SubRoot>
                    </TreeView.Item>

                    {/* pages */}
                    <TreeView.Item
                      nodeId="root-src-pages"
                      className="px-1 py-0.5 cursor-pointer hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60 data-[selected=true]:border-l-2 data-[selected=true]:border-l-sky-500"
                    >
                      <div className="flex items-center gap-1">
                        <FolderIcon />
                        <TreeView.Text>pages</TreeView.Text>
                      </div>

                      <TreeView.SubRoot className="mt-0.5 ml-3 border-l border-slate-800/60 pl-2 space-y-0.5 hidden data-[expanded=true]:block">
                        <TreeView.Item
                          nodeId="root-src-pages-index"
                          className="px-1 py-0.5 cursor-pointer hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60 data-[selected=true]:border-l-2 data-[selected=true]:border-l-sky-500"
                        >
                          <div className="flex items-center gap-1">
                            <FileIcon />
                            <TreeView.Text>index.tsx</TreeView.Text>
                          </div>
                        </TreeView.Item>

                        <TreeView.Item
                          nodeId="root-src-pages-settings"
                          className="px-1 py-0.5 cursor-pointer hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60 data-[selected=true]:border-l-2 data-[selected=true]:border-l-sky-500"
                        >
                          <div className="flex items-center gap-1">
                            <FileIcon />
                            <TreeView.Text>settings.tsx</TreeView.Text>
                          </div>
                        </TreeView.Item>
                      </TreeView.SubRoot>
                    </TreeView.Item>
                  </TreeView.SubRoot>
                </TreeView.Item>

                {/* public */}
                <TreeView.Item
                  nodeId="root-public"
                  className="px-1 py-0.5 cursor-pointer hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60 data-[selected=true]:border-l-2 data-[selected=true]:border-l-sky-500"
                >
                  <div className="flex items-center gap-1">
                    <FolderIcon />
                    <TreeView.Text>public</TreeView.Text>
                  </div>

                  <TreeView.SubRoot className="mt-0.5 ml-3 border-l border-slate-800/60 pl-2 space-y-0.5 hidden data-[expanded=true]:block">
                    <TreeView.Item
                      nodeId="root-public-favicon"
                      className="px-1 py-0.5 cursor-pointer hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60 data-[selected=true]:border-l-2 data-[selected=true]:border-l-sky-500"
                    >
                      <div className="flex items-center gap-1">
                        <FileIcon />
                        <TreeView.Text>favicon.ico</TreeView.Text>
                      </div>
                    </TreeView.Item>
                  </TreeView.SubRoot>
                </TreeView.Item>

                {/* root files */}
                <TreeView.Item
                  nodeId="root-package"
                  className="px-1 py-0.5 cursor-pointer hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60 data-[selected=true]:border-l-2 data-[selected=true]:border-l-sky-500"
                >
                  <div className="flex items-center gap-1">
                    <FileIcon />
                    <TreeView.Text>package.json</TreeView.Text>
                  </div>
                </TreeView.Item>

                <TreeView.Item
                  nodeId="root-tsconfig"
                  className="px-1 py-0.5 cursor-pointer hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60 data-[selected=true]:border-l-2 data-[selected=true]:border-l-sky-500"
                >
                  <div className="flex items-center gap-1">
                    <FileIcon />
                    <TreeView.Text>tsconfig.json</TreeView.Text>
                  </div>
                </TreeView.Item>
              </TreeView.SubRoot>
            </TreeView.Item>
          </TreeView.Root>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          <span className="font-medium text-slate-300">Tip</span> · 방향키로
          탐색하고,{' '}
          <kbd className="px-1 py-px rounded bg-slate-800 text-[10px]">
            Enter
          </kbd>{' '}
          /
          <kbd className="px-1 py-px rounded bg-slate-800 text-[10px]">
            Space
          </kbd>{' '}
          로 열기·선택,{' '}
          <kbd className="px-1 py-px rounded bg-slate-800 text-[10px]">←</kbd> /
          <kbd className="px-1 py-px rounded bg-slate-800 text-[10px]">→</kbd>{' '}
          로 폴더를 접거나 펼칠 수 있어요.
        </p>
      </div>
    </div>
  )
}
