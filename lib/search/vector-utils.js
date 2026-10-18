/**
 * Chuyển mảng Float thành Buffer để lưu vào trường Bytes (SQL Server varbinary)
 * @param {number[]} vector 
 * @returns {Buffer}
 */
export function floatArrayToBuffer(vector) {
  const float32Array = new Float32Array(vector);
  return Buffer.from(float32Array.buffer);
}

/**
 * Chuyển Buffer từ SQL Server Bytes thành mảng Float32Array
 * @param {Buffer} buffer 
 * @returns {Float32Array}
 */
export function bufferToFloatArray(buffer) {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
  return new Float32Array(arrayBuffer);
}

/**
 * Tính Cosine Similarity giữa 2 vector
 * @param {Float32Array|number[]} vecA 
 * @param {Float32Array|number[]} vecB 
 * @returns {number} Độ tương đồng từ -1 đến 1 (thường 0 đến 1)
 */
export function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error("Kích thước 2 vector không đồng nhất.");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Thuật toán chấm điểm BM25 cơ bản cho tập văn bản (phục vụ baseline nghiên cứu)
 * @param {string} query 
 * @param {Array<{id: string, text: string}>} documents 
 * @param {number} k1 (mặc định 1.2)
 * @param {number} b (mặc định 0.75)
 * @returns {Array<{id: string, score: number}>}
 */
export function calculateBM25(query, documents, k1 = 1.2, b = 0.75) {
  const tokenize = (text) =>
    (text || "")
      .toLowerCase()
      .replace(/[^\w\s\u00C0-\u1EF9]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

  const queryTerms = tokenize(query);
  if (queryTerms.length === 0 || documents.length === 0) return [];

  const N = documents.length;
  const docTokensList = documents.map((doc) => ({
    id: doc.id,
    tokens: tokenize(doc.text),
  }));

  const totalLength = docTokensList.reduce((acc, d) => acc + d.tokens.length, 0);
  const avgDocLength = totalLength / N || 1;

  // Tính Document Frequency (DF) cho từng từ khóa trong query
  const df = {};
  for (const term of queryTerms) {
    df[term] = docTokensList.filter((d) => d.tokens.includes(term)).length;
  }

  // Chấm điểm từng tài liệu
  const results = docTokensList.map((doc) => {
    let score = 0;
    const docLen = doc.tokens.length;

    // Đếm tần suất xuất hiện (TF)
    const tf = {};
    for (const token of doc.tokens) {
      tf[token] = (tf[token] || 0) + 1;
    }

    for (const term of queryTerms) {
      const termDF = df[term] || 0;
      if (termDF === 0) continue;

      // IDF theo chuẩn Robertson-Spärck Jones BM25
      const idf = Math.log((N - termDF + 0.5) / (termDF + 0.5) + 1);
      const termTF = tf[term] || 0;

      const numerator = termTF * (k1 + 1);
      const denominator = termTF + k1 * (1 - b + b * (docLen / avgDocLength));

      score += idf * (numerator / denominator);
    }

    return { id: doc.id, score };
  });

  return results.sort((a, b) => b.score - a.score);
}
/**
 * Thuật toán hợp nhất thứ hạng tương hỗ Reciprocal Rank Fusion (RRF)
 * @param {Array<{id: string}>} bm25RankedList Danh sách đã xếp hạng theo BM25
 * @param {Array<{id: string}>} vectorRankedList Danh sách đã xếp hạng theo Vector
 * @param {number} k Hằng số làm mịn (chuẩn NCKH thường là 60)
 * @returns {Array<{id: string, rrfScore: number, bm25Rank: number|null, vectorRank: number|null}>}
 */
export function calculateRRF(bm25RankedList, vectorRankedList, k = 60) {
  const scoreMap = new Map();

  // 1. Duyệt danh sách xếp hạng BM25
  bm25RankedList.forEach((item, index) => {
    const rank = index + 1;
    const rrfContribution = 1 / (k + rank);

    scoreMap.set(item.id, {
      id: item.id,
      rrfScore: rrfContribution,
      bm25Rank: rank,
      vectorRank: null,
    });
  });

  // 2. Duyệt danh sách xếp hạng Vector
  vectorRankedList.forEach((item, index) => {
    const rank = index + 1;
    const rrfContribution = 1 / (k + rank);

    if (scoreMap.has(item.id)) {
      const existing = scoreMap.get(item.id);
      existing.rrfScore += rrfContribution;
      existing.vectorRank = rank;
    } else {
      scoreMap.set(item.id, {
        id: item.id,
        rrfScore: rrfContribution,
        bm25Rank: null,
        vectorRank: rank,
      });
    }
  });

  // 3. Sắp xếp danh sách tổng hợp theo điểm RRF giảm dần
  const results = Array.from(scoreMap.values());
  results.sort((a, b) => b.rrfScore - a.rrfScore);

  return results.map((item) => ({
    ...item,
    rrfScore: Number(item.rrfScore.toFixed(6)),
  }));
}