<?php
/* GET /teams/get.php → {teams:[{project:{id,title,description,hackathon}, members:[{…user, member_role, is_owner}]}]}
 * Only projects the caller is a member of. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
$me = require_login();

$st = db()->prepare('SELECT pr.id, pr.title, pr.description, h.name AS hackathon
    FROM project_members pm JOIN projects pr ON pr.id = pm.project_id LEFT JOIN hackathons h ON h.id = pr.hackathon_id
    WHERE pm.user_id = ? ORDER BY pm.joined_at DESC, pr.id DESC LIMIT 50');
$st->execute([$me['id']]);
$projects = $st->fetchAll();
if (!$projects) {
    ok(['teams' => []], 'Teams loaded.');
}
$ids = array_map(fn($p) => (int) $p['id'], $projects);
$st = db()->prepare('SELECT project_id, user_id, member_role, is_owner FROM project_members
    WHERE project_id IN (' . hm_placeholders(count($ids)) . ') ORDER BY is_owner DESC, joined_at ASC');
$st->execute($ids);
$memberRows = $st->fetchAll();
$users = hm_users_map(array_map(fn($m) => (int) $m['user_id'], $memberRows));

$byProject = [];
foreach ($memberRows as $m) {
    $uid = (int) $m['user_id'];
    if (isset($users[$uid])) {
        $byProject[(int) $m['project_id']][] = $users[$uid] + ['member_role' => $m['member_role'], 'is_owner' => (bool) $m['is_owner']];
    }
}
$teams = [];
foreach ($projects as $p) {
    $teams[] = [
        'project' => ['id' => (int) $p['id'], 'title' => $p['title'], 'description' => $p['description'], 'hackathon' => $p['hackathon']],
        'members' => $byProject[(int) $p['id']] ?? [],
    ];
}
ok(['teams' => $teams], 'Teams loaded.');
