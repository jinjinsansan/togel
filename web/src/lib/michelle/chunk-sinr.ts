/**
 * SINR (Search Is Not Retrieval) チャンキング
 * 
 * 親チャンク（大）: LLMに渡す用（600-800文字）
 * 子チャンク（小）: ベクトル検索用（150-200文字、オーバーラップ50文字）
 */

export interface SinrChunkOptions {
  parentSize?: number;
  parentOverlap?: number;
  childSize?: number;
  childOverlap?: number;
}

export interface ChildChunk {
  content: string;
  index: number;
}

export interface ParentChunk {
  content: string;
  index: number;
  children: ChildChunk[];
}

const DEFAULT_OPTIONS: Required<SinrChunkOptions> = {
  parentSize: 800,
  parentOverlap: 100,
  childSize: 200,
  childOverlap: 50,
};

/**
 * テキストを指定サイズでチャンク分割（汎用関数）
 */
function splitIntoChunks(
  text: string,
  chunkSize: number,
  overlap: number,
): string[] {
  if (chunkSize <= overlap) {
    throw new Error("chunkSize must be greater than overlap");
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const step = chunkSize - overlap;
  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    const slice = normalized.slice(start, end).trim();
    if (slice) {
      chunks.push(slice);
    }
    if (end === normalized.length) {
      break;
    }
    start += step;
  }

  return chunks;
}

/**
 * SINRチャンキング：親→子の2段階分割
 * 
 * @param text - 分割する元テキスト
 * @param options - チャンキングオプション
 * @returns 親チャンクの配列（各親チャンクは子チャンクを含む）
 */
export function chunkTextSinr(
  text: string,
  options: SinrChunkOptions = {},
): ParentChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Step 1: 親チャンクに分割
  const parentContents = splitIntoChunks(
    text,
    opts.parentSize,
    opts.parentOverlap,
  );

  // Step 2: 各親チャンクを子チャンクに分割
  const parents: ParentChunk[] = parentContents.map((parentContent, parentIndex) => {
    const childContents = splitIntoChunks(
      parentContent,
      opts.childSize,
      opts.childOverlap,
    );

    const children: ChildChunk[] = childContents.map((childContent, childIndex) => ({
      content: childContent,
      index: childIndex,
    }));

    return {
      content: parentContent,
      index: parentIndex,
      children,
    };
  });

  return parents;
}

/**
 * チャンク統計を取得（デバッグ用）
 */
export function getChunkStats(parents: ParentChunk[]) {
  const totalParents = parents.length;
  const totalChildren = parents.reduce((sum, p) => sum + p.children.length, 0);
  const avgChildrenPerParent = totalParents > 0 ? totalChildren / totalParents : 0;
  
  const parentLengths = parents.map(p => p.content.length);
  const childLengths = parents.flatMap(p => p.children.map(c => c.content.length));

  return {
    totalParents,
    totalChildren,
    avgChildrenPerParent: avgChildrenPerParent.toFixed(2),
    parentLength: {
      min: Math.min(...parentLengths, 0),
      max: Math.max(...parentLengths, 0),
      avg: parentLengths.length > 0 
        ? (parentLengths.reduce((a, b) => a + b, 0) / parentLengths.length).toFixed(0)
        : 0,
    },
    childLength: {
      min: Math.min(...childLengths, 0),
      max: Math.max(...childLengths, 0),
      avg: childLengths.length > 0
        ? (childLengths.reduce((a, b) => a + b, 0) / childLengths.length).toFixed(0)
        : 0,
    },
  };
}
