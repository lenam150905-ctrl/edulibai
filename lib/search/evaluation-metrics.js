/**
 * Tính Precision@K
 * @param {string[]} retrievedIds Danh sách ID được trả về (đã xếp hạng)
 * @param {string[]} relevantIds Danh sách ID thực sự đúng (Ground Truth)
 * @param {number} k
 * @returns {number}
 */
export function calculatePrecisionAtK(retrievedIds, relevantIds, k = 5) {
  if (k <= 0) return 0;
  const topK = retrievedIds.slice(0, k);
  const relevantSet = new Set(relevantIds.map(String));
  const hits = topK.filter((id) => relevantSet.has(String(id))).length;
  return Number((hits / k).toFixed(4));
}

/**
 * Tính Recall@K
 * @param {string[]} retrievedIds Danh sách ID được trả về
 * @param {string[]} relevantIds Danh sách ID thực sự đúng (Ground Truth)
 * @param {number} k
 * @returns {number}
 */
export function calculateRecallAtK(retrievedIds, relevantIds, k = 5) {
  if (relevantIds.length === 0) return 0;
  const topK = retrievedIds.slice(0, k);
  const relevantSet = new Set(relevantIds.map(String));
  const hits = topK.filter((id) => relevantSet.has(String(id))).length;
  return Number((hits / relevantIds.length).toFixed(4));
}

/**
 * Tính Reciprocal Rank (RR) cho một query
 * @param {string[]} retrievedIds Danh sách ID được trả về
 * @param {string[]} relevantIds Danh sách ID thực sự đúng
 * @returns {number}
 */
export function calculateReciprocalRank(retrievedIds, relevantIds) {
  const relevantSet = new Set(relevantIds.map(String));
  for (let i = 0; i < retrievedIds.length; i++) {
    if (relevantSet.has(String(retrievedIds[i]))) {
      return Number((1 / (i + 1)).toFixed(4));
    }
  }
  return 0;
}