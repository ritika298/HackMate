<?php
/* GET /projects/list.php?q&campus&skill&category&status&mine&page&limit — public (landing page uses it).
 * Closed projects are hidden unless requested with status=closed by someone who is a member (mine=1). */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
$me = hm_current_user();

$where = ['1 = 1'];
$params = [];
if (($q = hm_query_str('q')) !== '') {
    $like = hm_like($q);
    $where[] = "(pr.title LIKE ? ESCAPE '|' OR pr.description LIKE ? ESCAPE '|' OR pr.looking_for_roles LIKE ? ESCAPE '|')";
    array_push($params, $like, $like, $like);
}
if (($campus = hm_query_str('campus')) !== '') {
    $where[] = 'c.short_name = ?';
    $params[] = $campus;
}
if (($skill = hm_query_str('skill')) !== '') {
    $where[] = 'EXISTS (SELECT 1 FROM project_skills ps JOIN skills s ON s.id = ps.skill_id WHERE ps.project_id = pr.id AND s.name = ?)';
    $params[] = $skill;
}
$category = hm_query_str('category');
if (in_array($category, ['hackathon', 'college_project', 'competition', 'open_source', 'research'], true)) {
    $where[] = 'pr.category = ?';
    $params[] = $category;
}
$status = hm_query_str('status');
if (in_array($status, ['open', 'in_progress', 'completed', 'closed'], true)) {
    $where[] = 'pr.status = ?';
    $params[] = $status;
} else {
    $where[] = "pr.status <> 'closed'";
}
if (($_GET['mine'] ?? '') === '1') {
    if (!$me) {
        fail('Please log in to continue.', 401, 'unauthenticated');
    }
    $where[] = 'EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = pr.id AND pm.user_id = ?)';
    $params[] = $me['id'];
} elseif ($status === 'closed') {
    // closed projects are only listed to their members
    if (!$me) {
        fail('Please log in to continue.', 401, 'unauthenticated');
    }
    $where[] = 'EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = pr.id AND pm.user_id = ?)';
    $params[] = $me['id'];
}

[$limit, $offset] = hm_page(60, 100);
$st = db()->prepare('SELECT ' . HM_PROJECT_SELECT . HM_PROJECT_FROM . ' WHERE ' . implode(' AND ', $where)
    . ' ORDER BY pr.created_at DESC, pr.id DESC LIMIT ' . $limit . ' OFFSET ' . $offset);
$st->execute($params);
ok(hm_shape_projects($st->fetchAll()), 'Projects loaded.');
