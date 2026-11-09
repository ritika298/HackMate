<?php
/* GET  /users/profile.php[?id=N]  — omit id = my own profile (includes email/role); with id = that user's public profile.
 * POST /users/profile.php         — update MY profile. The target user always comes from the session; any id in the body is ignored. */
require_once __DIR__ . '/../../bootstrap.php';
$method = require_method('GET', 'POST');
$me = require_login();

if ($method === 'GET') {
    $id = hm_query_int('id', 1, 2147483647, null);
    if ($id === null || $id === $me['id']) {
        ok(hm_own_user($me['id']), 'Profile loaded.');
    }
    $u = hm_public_user($id);
    if (!$u) {
        fail('Profile not found.', 404, 'not_found');
    }
    ok($u, 'Profile loaded.');
}

$v = new V(hm_input());
$name = $v->str('name', 2, 100, false, 'Name');
$branch = $v->str('branch', 0, 100, false, 'Branch');
$year = $v->int('year', 1, 6, false, 'Year');
$bio = $v->str('bio', 0, 500, false, 'Bio', true);
$skills = $v->list('skills', 15, 60);
$interests = $v->list('interests', 10, 40);
$roles = $v->list('preferred_roles', HM_ROLES_MAX, 40);
$level = $v->enum('experience_level', HM_LEVELS, false);
$expText = $v->str('experience_text', 0, 500, false, 'Experience', true);
$github = $v->url('github_url', ['github.com'], 'GitHub link');
$linkedin = $v->url('linkedin_url', ['linkedin.com'], 'LinkedIn link');
$looking = $v->bool('looking_for_team');
$v->done();

$skillIds = null;
if ($skills !== null) {
    [$skillIds, $unknown] = hm_resolve_skills($skills);
    if ($unknown) {
        fail('Please fix the highlighted fields.', 422, 'validation_error', ['skills' => 'Unknown skill: ' . $unknown[0]]);
    }
}

// Fields the client did not send stay untouched; fields sent empty are cleared (links/text) .
$in = hm_input();
$profileCols = [];
foreach (['branch' => $branch, 'year' => $year, 'bio' => $bio, 'experience_text' => $expText,
          'github_url' => $github, 'linkedin_url' => $linkedin] as $col => $val) {
    if (array_key_exists($col, $in)) {
        $profileCols[$col] = $val; // null when sent empty → column cleared
    }
}
if ($level !== null) {
    $profileCols['experience_level'] = $level;
}
if ($interests !== null) {
    $profileCols['interests'] = hm_csv_join($interests);
}
if ($roles !== null) {
    $profileCols['preferred_roles'] = hm_csv_join($roles);
}
if ($looking !== null) {
    $profileCols['looking_for_team'] = $looking ? 1 : 0;
}

hm_tx(function ($pdo) use ($me, $name, $profileCols, $skillIds) {
    if ($name !== null) {
        $pdo->prepare('UPDATE users SET name = ? WHERE id = ?')->execute([$name, $me['id']]);
    }
    if ($profileCols) {
        $cols = array_keys($profileCols);
        $sql = 'INSERT INTO profiles (user_id, ' . implode(', ', $cols) . ') VALUES (?, ' . hm_placeholders(count($cols)) . ')
                ON DUPLICATE KEY UPDATE ' . implode(', ', array_map(fn($c) => "$c = VALUES($c)", $cols));
        $pdo->prepare($sql)->execute(array_merge([$me['id']], array_values($profileCols)));
    }
    if ($skillIds !== null) {
        $pdo->prepare('DELETE FROM user_skills WHERE user_id = ?')->execute([$me['id']]);
        $ins = $pdo->prepare('INSERT INTO user_skills (user_id, skill_id) VALUES (?, ?)');
        foreach ($skillIds as $sid) {
            $ins->execute([$me['id'], $sid]);
        }
    }
});
ok(hm_own_user($me['id']), 'Profile updated.');
