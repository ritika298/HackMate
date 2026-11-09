<?php
/* GET /hackathons/list.php?q&mode&skill&saved=1&include_past=1 — published only. Public; is_saved is per caller (false if logged out).
 * By default only events that have not ended yet are returned. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
$me = hm_current_user();
$uid = $me ? $me['id'] : 0;

$where = ["h.status = 'published'"];
$params = [];
if (($_GET['include_past'] ?? '') !== '1') {
    $where[] = 'h.end_date >= CURDATE()';
}
if (($q = hm_query_str('q')) !== '') {
    $like = hm_like($q);
    $where[] = "(h.name LIKE ? ESCAPE '|' OR h.organizer LIKE ? ESCAPE '|' OR h.description LIKE ? ESCAPE '|' OR h.location LIKE ? ESCAPE '|')";
    array_push($params, $like, $like, $like, $like);
}
$mode = hm_query_str('mode');
if (in_array($mode, ['online', 'offline', 'hybrid'], true)) {
    $where[] = 'h.mode = ?';
    $params[] = $mode;
}
if (($skill = hm_query_str('skill')) !== '') {
    $where[] = 'EXISTS (SELECT 1 FROM hackathon_skills hs JOIN skills s ON s.id = hs.skill_id WHERE hs.hackathon_id = h.id AND s.name = ?)';
    $params[] = $skill;
}
if (($_GET['saved'] ?? '') === '1') {
    if (!$me) {
        fail('Please log in to continue.', 401, 'unauthenticated');
    }
    $where[] = 'EXISTS (SELECT 1 FROM saved_hackathons sv WHERE sv.hackathon_id = h.id AND sv.user_id = ?)';
    $params[] = $me['id'];
}
[$limit, $offset] = hm_page(60, 100);
ok(hm_query_hackathons(implode(' AND ', $where), $params, $uid, 'h.is_featured DESC, h.start_date ASC, h.id ASC', $limit, $offset), 'Hackathons loaded.');
