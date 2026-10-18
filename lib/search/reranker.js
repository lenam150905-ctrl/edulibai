/**
 * Module Reranker chấm điểm và tái sắp xếp Top ứng viên
 * Đường dẫn: lib/search/reranker.js
 */
export function applyReranker(
  query,
  candidateChunks,
  config = { weightKeyword: 0.3, weightSemantic: 0.7 }
) {
  const queryWords = (query || "").toLowerCase().split(/\s+/).filter(Boolean);

  return candidateChunks
    .map((chunk) => {
      const text = (chunk.content || "").toLowerCase();

      // Đếm số từ khóa xuất hiện chính xác trong đoạn trích
      let matchCount = 0;
      for (const w of queryWords) {
        if (text.includes(w)) matchCount++;
      }
      const keywordOverlap = matchCount / (queryWords.length || 1);

      // Điểm ngữ nghĩa nền tảng từ Vector hoặc RRF
      const semanticBase =
        chunk.similarityScore !== undefined
          ? chunk.similarityScore
          : (chunk.rrfScore || 0) * 30;

      // Tính điểm tổng hợp tái xếp hạng
      const finalRerankScore = Number(
        (
          keywordOverlap * config.weightKeyword +
          semanticBase * config.weightSemantic
        ).toFixed(4)
      );

      return {
        ...chunk,
        rerankScore: finalRerankScore,
      };
    })
    .sort((a, b) => b.rerankScore - a.rerankScore);
}