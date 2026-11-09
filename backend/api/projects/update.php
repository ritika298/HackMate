<?php
/* POST /projects/update.php {id, title?, description?, category?, status?, team_size?, looking_for?, tech?, repo_url?, hackathon_id?}
 * Only the project's owner may edit it. Fields not sent are left alone. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
$me = require_login();

$in = hm_input();
$v = new V($in);
$id = $v->int('id', 1, 2147483647, true, 'Project');
$title = $v->str('title', 3, 150, false, 'Title');
$description = $v->str('description', 10, 5000, false, 'Description', true);
$category = $v->enum('category', ['hackathon', 'college_project', 'competition', 'open_source', 'research'], false);
$status = $v->enum('status', ['open', 'in_progress', 'completed', 'closed'], false);
$size = $v->int('team_size', 2, 12, false, 'Team size');
$lookingFor = $v->list('looking_for', HM_ROLES_MAX, 40);
$tech = $v->list('tech', 15, 60);
$repo = $v->url('repo_url', [], 'Repository link');
$hackathonId = $v->int('hackathon_id', 1, 2147483647, false, 'Hackathon');
$v->done();

$skillIds = null;
if ($tech !== null) {
    [$skillIds, $unknown] = hm_resolve_skills($tech);
    if ($unknown) {
        fail('Please fix the highlighted fields.', 422, 'validation_error', ['tech' => 'Unknown skill: ' . $unknown[0]]);
    }
}

hm_tx(function ($pdo) use ($me, $id, $in, $title, $description, $category, $status, $size, $lookingFor, $skillIds, $repo, $hackathonId) {
    $st = $pdo->prepare('SELECT owner_id FROM projects WHERE id = ? FOR UPDATE');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row) {
        fail('Project not found.', 404, 'not_found');
    }
    if ((int) $row['owner_id'] !== $me['id']) {
        fail('Only the project owner can edit this project.', 403, 'forbidden');
    }
    if ($size !== null) {
        $st = $pdo->prepare('SELECT COUNT(*) FROM project_members WHERE project_id = ?');
        $st->execute([$id]);
        if ($size < (int) $st->fetchColumn()) {
            fail('Please fix the highlighted fields.', 422, 'validation_error', ['team_size' => 'Team size cannot be smaller than the current number of members.']);
        }
    }
    if ($hackathonId !== null) {
        $st = $pdo->prepare("SELECT 1 FROM hackathons WHERE id = ? AND status = 'published'");
        $st->execute([$hackathonId]);
        if (!$st->fetch()) {
            fail('Please fix the highlighted fields.', 422, 'validation_error', ['hackathon_id' => 'Hackathon not found.']);
        }
    }
    $cols = [];
    foreach (['title' => $title, 'description' => $description, 'category' => $category, 'status' => $status, 'team_size_target' => $size, 'hackathon_id' => $hackathonId] as $c => $val) {
        if ($val !== null) {
            $cols[$c] = $val;
        }
    }
    if ($lookingFor !== null) {
        $cols['looking_for_roles'] = hm_csv_join($lookingFor);
    }
    if (array_key_exists('repo_url', $in)) {
        $cols['repo_url'] = $repo;
    }
    if ($cols) {
        $set = implode(', ', array_map(fn($c) => "$c = ?", array_keys($cols)));
        $pdo->prepare("UPDATE projects SET $set WHERE id = ?")->execute(array_merge(array_values($cols), [$id]));
    }
    if ($skillIds !== null) {
        hm_set_project_skills($id, $skillIds);
    }
});
ok(hm_project_by_id($id), 'Project updated.');
