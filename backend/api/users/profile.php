
<?php
/*
 * GET  /users/profile.php[?id=N]
 * POST /users/profile.php
 *
 * Custom skills are created automatically when they do not already exist.
 */

require_once __DIR__ . '/../../bootstrap.php';

$method = require_method('GET', 'POST');
$me = require_login();

/* ==========================================
   GET PROFILE
========================================== */

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

/* ==========================================
   VALIDATE PROFILE INPUT
========================================== */

$in = hm_input();
$v = new V($in);

$name = $v->str('name', 2, 100, false, 'Name');
$campusId = $v->int('campus_id', 1, 2147483647, false, 'College');
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

/* ==========================================
   VALIDATE CAMPUS
========================================== */

if ($campusId !== null) {
    $campusCheck = db()->prepare(
        'SELECT 1 FROM campuses WHERE id = ? AND is_active = 1'
    );

    $campusCheck->execute([$campusId]);

    if (!$campusCheck->fetchColumn()) {
        fail(
            'Please select a valid active college.',
            422,
            'validation_error',
            ['campus_id' => 'Select a valid college.']
        );
    }
}

/* ==========================================
   PROFILE FIELDS
========================================== */

$profileCols = [];

foreach (
    [
        'branch' => $branch,
        'year' => $year,
        'bio' => $bio,
        'experience_text' => $expText,
        'github_url' => $github,
        'linkedin_url' => $linkedin
    ] as $col => $val
) {
    if (array_key_exists($col, $in)) {
        $profileCols[$col] = $val;
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

/* ==========================================
   SAVE PROFILE AND SKILLS
========================================== */

hm_tx(function ($pdo) use (
    $me,
    $name,
    $campusId,
    $profileCols,
    $skills
) {

    /* UPDATE USER DETAILS */

    if ($name !== null || $campusId !== null) {
        $sets = [];
        $params = [];

        if ($name !== null) {
            $sets[] = 'name = ?';
            $params[] = $name;
        }

        if ($campusId !== null) {
            $sets[] = 'campus_id = ?';
            $params[] = $campusId;
        }

        $params[] = $me['id'];

        $pdo->prepare(
            'UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?'
        )->execute($params);
    }

    /* UPDATE PROFILE DETAILS */

    if ($profileCols) {
        $cols = array_keys($profileCols);

        $sql = '
            INSERT INTO profiles (
                user_id,
                ' . implode(', ', $cols) . '
            )
            VALUES (
                ?,
                ' . hm_placeholders(count($cols)) . '
            )
            ON DUPLICATE KEY UPDATE
            ' . implode(
                ', ',
                array_map(fn($c) => "$c = VALUES($c)", $cols)
            );

        $pdo->prepare($sql)->execute(
            array_merge(
                [$me['id']],
                array_values($profileCols)
            )
        );
    }

    /* CREATE OR FIND SKILLS */

    if ($skills !== null) {
        $skillIds = [];

        $findSkill = $pdo->prepare(
            'SELECT id FROM skills
             WHERE LOWER(name) = LOWER(?)
             LIMIT 1'
        );

        $createSkill = $pdo->prepare(
            "INSERT INTO skills (name, category)
             VALUES (?, 'other')"
        );

        foreach ($skills as $skillName) {
            $skillName = trim($skillName);

            if ($skillName === '') {
                continue;
            }

            // First check whether the skill already exists.
            $findSkill->execute([$skillName]);

            $skillId = $findSkill->fetchColumn();

            // If it does not exist, create it.
            if ($skillId === false) {
                try {
                    $createSkill->execute([$skillName]);

                    $skillId = (int) $pdo->lastInsertId();

                } catch (\PDOException $ex) {

                    // Another request may have created the same skill.
                    // Only recover from a duplicate-key error.
                    if ($ex->getCode() !== '23000') {
                        throw $ex;
                    }

                    $findSkill->execute([$skillName]);
                    $skillId = $findSkill->fetchColumn();

                    if ($skillId === false) {
                        throw $ex;
                    }
                }
            }

            $skillId = (int) $skillId;

            // Prevent duplicate IDs in the user's skill list.
            $skillIds[$skillId] = $skillId;
        }

        /* REPLACE USER SKILLS */

        $pdo->prepare(
            'DELETE FROM user_skills WHERE user_id = ?'
        )->execute([$me['id']]);

        $insertSkill = $pdo->prepare(
            'INSERT INTO user_skills (user_id, skill_id)
             VALUES (?, ?)'
        );

        foreach ($skillIds as $sid) {
            $insertSkill->execute([$me['id'], $sid]);
        }
    }
});

/* ==========================================
   RETURN UPDATED PROFILE
========================================== */

ok(
    hm_own_user($me['id']),
    'Profile updated.'
);
