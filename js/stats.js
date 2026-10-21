'use strict';

/* Pure analytics maths — no DOM, no rendering. API_DATA is read at call time so a refresh just calls this again.
   /type ships one row per format per weekly scrape bucket (5 video + 5 imageAndSidecar today), so every total
   here is the cumulative sample across the weeks present, never a single-week number. */

function computeTypeStats() {
  const rows = API_DATA.type || [];
  const sum = function (arr, key) { return arr.reduce(function (a, b) { return a + (Number(b[key]) || 0); }, 0); };
  const video = rows.filter(function (r) { return r.type === 'video'; });
  const img = rows.filter(function (r) { return r.type === 'imageAndSidecar'; });
  const v = { count: sum(video, 'count'), likes: sum(video, 'likeAmount'), comments: sum(video, 'commentAmount') };
  const i = { count: sum(img, 'count'), likes: sum(img, 'likeAmount'), comments: sum(img, 'commentAmount') };
  const totalPosts = sum(rows, 'count'), totalLikes = sum(rows, 'likeAmount'), totalComments = sum(rows, 'commentAmount');
  const avgLikeVideo = v.count ? v.likes / v.count : 0, avgLikeImg = i.count ? i.likes / i.count : 0;
  /* one percentage helper for everything the view prints, so 0-0 rows never divide by zero */
  const pct = function (part, total) { return total ? (part / total) * 100 : 0; };
  return {
    v: v, i: i, totalPosts: totalPosts, totalLikes: totalLikes, totalComments: totalComments,
    avgLikePerPost: totalPosts ? totalLikes / totalPosts : 0,
    avgCommentPerPost: totalPosts ? totalComments / totalPosts : 0,
    avgLikeVideo: avgLikeVideo, avgLikeImg: avgLikeImg,
    avgCommentVideo: v.count ? v.comments / v.count : 0, avgCommentImg: i.count ? i.comments / i.count : 0,
    /* shares of the same summed rows, so Reels + Foto always add up to 100 */
    videoPostPct: pct(v.count, totalPosts), imgPostPct: pct(i.count, totalPosts),
    videoLikesPct: pct(v.likes, totalLikes), imgLikesPct: pct(i.likes, totalLikes),
    videoCommentsPct: pct(v.comments, totalComments), imgCommentsPct: pct(i.comments, totalComments),
    videoAvgPct: pct(avgLikeVideo, avgLikeVideo + avgLikeImg), imgAvgPct: pct(avgLikeImg, avgLikeVideo + avgLikeImg)
  };
}

/* /topic[0] carries one entry per category plus baseTimeStamp/comparedTo. Keep the category-shaped entries
   (an object with an avgLikeDelta) and sort the biggest move first; this is only the numeric delta, the
   category name stays the row key. The home fact line is the first caller. */
function topicDeltaRows() {
  const row = API_DATA.topic && API_DATA.topic[0] ? API_DATA.topic[0] : null;
  if (!row) return [];
  return Object.keys(row).map(function (k) {
    const d = row[k];
    return d && typeof d === 'object' ? { key: k, avgLikeDelta: Number(d.avgLikeDelta) || 0 } : null;
  }).filter(Boolean).sort(function (a, b) { return b.avgLikeDelta - a.avgLikeDelta; });
}
