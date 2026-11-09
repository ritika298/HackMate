<?php
/* POST /projects/create.php {title,description,category,campus_id?,team_size,looking_for[],tech[],hackathon_id?,repo_url?}
 * The owner is ALWAYS the session user; the owner is also inserted into project_members (is_owner = 1). */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
$me = require_login();

$v = new V(hm_input());
$title = $v->str('title', 3, 150, true, 'Title');
$description = $v->str('description', 10, 5000, true, 'Description', true);
$category = $v->enum('category', ['hackathon', 'college_project', 'competition', 'open_source', 'research'], false, 'hackathon');
$campusId = $v->int('campus_id', 1, 2147483647, false, 'Campus') ?? $me['campus_id'];
$size = $v->int('team_size', 2, 12, true, 'Team size');
$lookingFor = $v->list('looking_for', HM_ROLES_MAX, 40) ?? [];
$tech = $v->list('tech', 15, 60) ?? [];
$hackathonId = $v->int('hackathon_id', 1, 2147483647, false, 'Hackathon');
$repo = $v->url('repo_url', [], 'Repository link');
$v->done();

$st = db()->prepare('SELECT 1 FROM campuses WHERE id = ? AND is_active = 1');
$st->execute([$campusId]);
if (!$st->fetch()) {
    fail('Please fix the highlighted fields.', 422, 'validation_error', ['campus_id' => 'Select a valid campus.']);
}
[$skillIds, $unknown] = hm_resolve_skills($tech);
if ($unknown) {
    fail('Please fix the highlighted fields.', 422, 'validation_error', ['tech' => 'Unknown skill: ' . $unknown[0]]);
}
if ($hackathonId !== null) {
    $st = db()->prepare("SELECT 1 FROM hackathons WHERE id = ? AND status = 'published'");
    $st->execute([$hackathonId]);
    if (!$st->fetch()) {
        fail('Please fix the highlighted fields.', 422, 'validation_error', ['hackathon_id' => 'Hackathon not found.']);
    }
}

$projectId = hm_tx(function ($pdo) use ($me, $title, $description, $category, $campusId, $size, $lookingFor, $skillIds, $hackathonId, $repo) {
    $pdo->prepare('INSERT INTO projects (owner_id, campus_id, hackathon_id, title, description, category, team_size_target, looking_for_roles, repo_url)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$me['id'], $campusId, $hackathonId, $title, $description, $category, $size, hm_csv_join($lookingFor), $repo]);
    $id = (int) $pdo->lastInsertId();
    $pdo->prepare("INSERT INTO project_members (project_id, user_id, member_role, is_owner) VALUES (?, ?, 'Owner', 1)")->execute([$id, $me['id']]);
    hm_set_project_skills($id, $skillIds);
    return $id;
});
ok(hm_project_by_id($projectId), 'Project created successfully.', 201);
