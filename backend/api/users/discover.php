<?php
/* GET /users/discover.php?q&campus&skill&role&branch&year&page&limit
 * Active students only, never the caller. Returns public user objects (no email / hash / role). */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
$me = require_login();

$where = ["u.status = 'active'", "u.role = 'student'", 'u.id <> ?'];
$params = [$me['id']];

$q = hm_query_str('q');
if ($q !== '') {
    $like = hm_like($q);
    $where[] = "(u.name LIKE ? ESCAPE '|' OR p.branch LIKE ? ESCAPE '|' OR p.bio LIKE ? ESCAPE '|' OR p.interests LIKE ? ESCAPE '|'
        OR p.preferred_roles LIKE ? ESCAPE '|'
        OR EXISTS (SELECT 1 FROM user_skills us2 JOIN skills s2 ON s2.id = us2.skill_id WHERE us2.user_id = u.id AND s2.name LIKE ? ESCAPE '|'))";
    array_push($params, $like, $like, $like, $like, $like, $like);
}
if (($campus = hm_query_str('campus')) !== '') {
    $where[] = 'c.short_name = ?';
    $params[] = $campus;
}
if (($skill = hm_query_str('skill')) !== '') {
    $where[] = 'EXISTS (SELECT 1 FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = u.id AND s.name = ?)';
    $params[] = $skill;
}
if (($role = hm_query_str('role')) !== '') {
    $where[] = "p.preferred_roles LIKE ? ESCAPE '|'";
    $params[] = hm_like($role);
}
if (($branch = hm_query_str('branch')) !== '') {
    $where[] = "p.branch LIKE ? ESCAPE '|'";
    $params[] = hm_like($branch);
}
if (($year = hm_query_int('year', 1, 6, null)) !== null) {
    $where[] = 'p.year = ?';
    $params[] = $year;
}

[$limit, $offset] = hm_page(60, 100);
$sql = 'SELECT ' . HM_USER_SELECT . HM_USER_FROM . ' WHERE ' . implode(' AND ', $where)
    . ' ORDER BY p.looking_for_team DESC, u.id DESC LIMIT ' . $limit . ' OFFSET ' . $offset;
$st = db()->prepare($sql);
$st->execute($params);
ok(hm_shape_users($st->fetchAll()), 'Users loaded.');
