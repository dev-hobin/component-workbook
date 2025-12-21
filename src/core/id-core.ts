// ============================================
// Id Core - 순수 함수 모듈
// ============================================
// 결정론적 id 생성
// DOM, React 모름
// ============================================

export type IdGenerator = (slot: string, nodeId?: string) => string

export function createIdGenerator(prefix: string): IdGenerator {
  return (slot: string, nodeId?: string) => {
    if (nodeId) {
      return `${prefix}-${slot}-${nodeId}`
    }
    return `${prefix}-${slot}`
  }
}
