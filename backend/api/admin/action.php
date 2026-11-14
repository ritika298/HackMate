
<?php
/* POST /admin/action.php
 * ADMIN only.
 *
 * user      : suspend | activate | set_campus
 * project   : close | reopen | delete
 * hackathon : feature | unfeature | archive | unarchive | publish | delete | create
 * report    : review | resolve | dismiss
 * skill     : create | delete
 */

require_once __DIR__ . '/../../bootstrap.php';

require_method('POST');
$admin = require_admin();

$in = hm_input();
$v = new V($in);

$entity = $v->enum(
    'entity',
    ['user', 'project', 'hackathon', 'report', 'skill'],
    true
);

$action = $v->str('action', 2, 20, true, 'Action');
$id = $v->int('id', 1, 2147483647, false, 'Id');

$v->done();

$pdo = db();

$needId = function () use ($id) {
    if ($id === null) {
        fail(
            'An id is required for this action.',
            422,
            'validation_error',
            ['id' => 'Id is required.']
        );
    }
};

$bad = fn() => fail(
    'Unknown action for ' . $entity . '.',
    422,
    'validation_error',
    ['action' => 'Not a valid action.']
);

$affected = function (PDOStatement $st, string $what) {
    if ($st->rowCount() === 0) {
        fail(
            $what . ' not found (or nothing to change).',
            404,
            'not_found'
        );
    }
};

switch ($entity) {

    /* =====================================
       MANAGE USERS
    ===================================== */

    case 'user':

        $needId();

        if ($action === 'set_campus') {

            $cv = new V($in);

            $campusId = $cv->int(
                'campus_id',
                1,
                2147483647,
                true,
                'College'
            );

            $cv->done();

            $campus = $pdo->prepare(
                'SELECT 1 FROM campuses
                 WHERE id = ? AND is_active = 1'
            );

            $campus->execute([$campusId]);

            if (!$campus->fetchColumn()) {
                fail(
                    'Please select a valid active college.',
                    422,
                    'validation_error'
                );
            }

            $exists = $pdo->prepare(
                'SELECT 1 FROM users WHERE id = ?'
            );

            $exists->execute([$id]);

            if (!$exists->fetchColumn()) {
                fail('User not found.', 404, 'not_found');
            }

            $pdo->prepare(
                'UPDATE users SET campus_id = ? WHERE id = ?'
            )->execute([$campusId, $id]);

            $msg = 'User college updated.';

            break;
        }

        if (!in_array($action, ['suspend', 'activate'], true)) {
            $bad();
        }

        if ($id === $admin['id']) {
            fail(
                'You cannot change your own account status.',
                409,
                'forbidden_target'
            );
        }

        $st = $pdo->prepare(
            'SELECT role FROM users WHERE id = ?'
        );

        $st->execute([$id]);

        $role = $st->fetchColumn();

        if ($role === false) {
            fail('User not found.', 404, 'not_found');
        }

        if ($role === 'admin') {
            fail(
                'Admin accounts cannot be suspended here.',
                409,
                'forbidden_target'
            );
        }

        $pdo->prepare(
            'UPDATE users SET status = ? WHERE id = ?'
        )->execute([
            $action === 'suspend' ? 'suspended' : 'active',
            $id
        ]);

        $msg = $action === 'suspend'
            ? 'User suspended.'
            : 'User reactivated.';

        break;


    /* =====================================
       MANAGE PROJECTS
    ===================================== */

    case 'project':

        $needId();

        if ($action === 'delete') {

            $pdo->beginTransaction();

            try {

                $pdo->prepare(
                    'DELETE FROM project_members
                     WHERE project_id = ?'
                )->execute([$id]);

                $pdo->prepare(
                    'DELETE FROM project_skills
                     WHERE project_id = ?'
                )->execute([$id]);

                $pdo->prepare(
                    'DELETE FROM team_requests
                     WHERE project_id = ?'
                )->execute([$id]);

                $st = $pdo->prepare(
                    'DELETE FROM projects WHERE id = ?'
                );

                $st->execute([$id]);

                if ($st->rowCount() === 0) {
                    fail(
                        'Project not found.',
                        404,
                        'not_found'
                    );
                }

                $pdo->commit();

                $msg = 'Project deleted.';

            } catch (Throwable $e) {

                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }

                throw $e;
            }

            break;
        }

        if (!in_array($action, ['close', 'reopen'], true)) {
            $bad();
        }

        $st = $pdo->prepare(
            'UPDATE projects SET status = ? WHERE id = ?'
        );

        $st->execute([
            $action === 'close' ? 'closed' : 'open',
            $id
        ]);

        $chk = $pdo->prepare(
            'SELECT 1 FROM projects WHERE id = ?'
        );

        $chk->execute([$id]);

        if (!$chk->fetchColumn()) {
            fail('Project not found.', 404, 'not_found');
        }

        $msg = $action === 'close'
            ? 'Project closed.'
            : 'Project reopened.';

        break;


    /* =====================================
       MANAGE HACKATHONS
    ===================================== */

    case 'hackathon':

        if ($action === 'create') {

            $newId = hm_save_hackathon(
                $in,
                null,
                $admin['id']
            );

            ok(
                ['id' => $newId],
                'Hackathon created.',
                201
            );
        }

        $needId();

        if ($action === 'delete') {

            $st = $pdo->prepare(
                'DELETE FROM hackathons WHERE id = ?'
            );

            $st->execute([$id]);

            $affected($st, 'Hackathon');

            $msg = 'Hackathon deleted.';

            break;
        }

        /*
         * Fixed action map.
         * Column names are hardcoded, never user supplied.
         */

        $map = [

            'feature' => [
                'is_featured',
                1
            ],

            'unfeature' => [
                'is_featured',
                0
            ],

            'archive' => [
                'status',
                'archived'
            ],

            'unarchive' => [
                'status',
                'published'
            ],

            'publish' => [
                'status',
                'published'
            ]

        ];

        if (!isset($map[$action])) {
            $bad();
        }

        $chk = $pdo->prepare(
            'SELECT 1 FROM hackathons WHERE id = ?'
        );

        $chk->execute([$id]);

        if (!$chk->fetchColumn()) {
            fail(
                'Hackathon not found.',
                404,
                'not_found'
            );
        }

        [$col, $val] = $map[$action];

        $pdo->prepare(
            "UPDATE hackathons SET $col = ? WHERE id = ?"
        )->execute([$val, $id]);

        $msg = 'Hackathon updated.';

        break;


    /* =====================================
       MANAGE REPORTS
    ===================================== */

    case 'report':

        $needId();

        $map = [
            'review' => 'reviewing',
            'resolve' => 'resolved',
            'dismiss' => 'dismissed'
        ];

        if (!isset($map[$action])) {
            $bad();
        }

        $final = $action !== 'review';

        $st = $pdo->prepare(
            'UPDATE reports
             SET status = ?,
                 resolved_by = ?,
                 resolved_at = ' .
                 ($final ? 'NOW()' : 'NULL') .
             ' WHERE id = ?'
        );

        $st->execute([
            $map[$action],
            $final ? $admin['id'] : null,
            $id
        ]);

        $chk = $pdo->prepare(
            'SELECT 1 FROM reports WHERE id = ?'
        );

        $chk->execute([$id]);

        if (!$chk->fetchColumn()) {
            fail('Report not found.', 404, 'not_found');
        }

        $msg = 'Report updated.';

        break;


    /* =====================================
       MANAGE SKILLS
    ===================================== */

    case 'skill':

        if ($action === 'create') {

            $vv = new V($in);

            $name = $vv->str(
                'name',
                2,
                60,
                true,
                'Skill name'
            );

            if (
                $name !== null &&
                strpos($name, ',') !== false
            ) {
                $vv->fail(
                    'name',
                    'Skill names cannot contain commas.'
                );
            }

            $vv->done();

            try {

                $pdo->prepare(
                    "INSERT INTO skills (name, category)
                     VALUES (?, 'other')"
                )->execute([$name]);

            } catch (PDOException $e) {

                if (($e->errorInfo[1] ?? 0) === 1062) {
                    fail(
                        'That skill already exists.',
                        409,
                        'duplicate'
                    );
                }

                throw $e;
            }

            ok(
                ['id' => (int) $pdo->lastInsertId()],
                'Skill added.',
                201
            );
        }

        if ($action !== 'delete') {
            $bad();
        }

        $needId();

        $st = $pdo->prepare(
            'DELETE FROM skills WHERE id = ?'
        );

        $st->execute([$id]);

        $affected($st, 'Skill');

        $msg = 'Skill deleted.';

        break;
}

ok((object) [], $msg ?? 'Done.');
