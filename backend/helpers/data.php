
<?php
/* Shared queries and serializers. Every function returns exactly the JSON shapes frontend/js/api.js documents.
 * Public user objects NEVER contain email, password_hash or role. */

const HM_ROLES_MAX = 10;
const HM_LEVELS = ['beginner', 'intermediate', 'advanced'];

function hm_csv_split(?string $s): array
{
    if ($s === null || trim($s) === '') {
        return [];
    }

    return array_values(array_filter(
        array_map('trim', explode(',', $s)),
        fn($x) => $x !== ''
    ));
}

function hm_csv_join(array $items, int $maxLen = 255): ?string
{
    $s = implode(',', $items);

    if ($s === '') {
        return null;
    }

    return mb_substr($s, 0, $maxLen);
}

function hm_placeholders(int $n): string
{
    return implode(',', array_fill(0, $n, '?'));
}

/* ---------- skills ---------- */

/* Resolve skill names to IDs.
 * Automatically creates custom skills that do not exist yet.
 * Matching is case-insensitive.
 * Returns [ids, unknownNames].
 */
function hm_resolve_skills(array $names): array
{
    if (!$names) {
        return [[], []];
    }

    $pdo = db();

    // Clean names and remove duplicates.
    $cleanNames = [];

    foreach ($names as $name) {
        $name = trim((string) $name);

        if ($name === '' || mb_strlen($name) > 60) {
            continue;
        }

        $key = mb_strtolower($name);

        if (!isset($cleanNames[$key])) {
            $cleanNames[$key] = $name;
        }
    }

    if (!$cleanNames) {
        return [[], []];
    }

    // Create missing skills. Existing skills remain unchanged.
    $insert = $pdo->prepare(
        "INSERT IGNORE INTO skills (name, category) VALUES (?, 'other')"
    );

    foreach ($cleanNames as $name) {
        $insert->execute([$name]);
    }

    // Retrieve IDs for all selected skills.
    $namesToFind = array_values($cleanNames);

    $st = $pdo->prepare(
        'SELECT id, name FROM skills WHERE name IN (' .
        hm_placeholders(count($namesToFind)) . ')'
    );

    $st->execute($namesToFind);

    $map = [];

    foreach ($st->fetchAll() as $row) {
        $map[mb_strtolower($row['name'])] = (int) $row['id'];
    }

    $ids = [];

    foreach ($cleanNames as $key => $name) {
        if (isset($map[$key])) {
            $ids[$map[$key]] = $map[$key];
        }
    }

    return [array_values($ids), []];
}

/* ---------- users ---------- */

const HM_USER_SELECT = 'u.id, u.name, c.short_name AS campus, p.branch, p.year, p.bio, p.avatar_url, p.interests, p.preferred_roles,
    p.experience_level, p.experience_text, p.github_url, p.linkedin_url, p.looking_for_team';

const HM_USER_FROM = ' FROM users u JOIN campuses c ON c.id = u.campus_id LEFT JOIN profiles p ON p.user_id = u.id ';

/* Turn rows selected with HM_USER_SELECT into API user objects. */
function hm_shape_users(array $rows): array
{
    if (!$rows) {
        return [];
    }

    $ids = array_map(fn($r) => (int) $r['id'], $rows);

    $st = db()->prepare(
        'SELECT us.user_id, s.name FROM user_skills us
         JOIN skills s ON s.id = us.skill_id
         WHERE us.user_id IN (' . hm_placeholders(count($ids)) . ')
         ORDER BY s.name'
    );

    $st->execute($ids);

    $skills = [];

    foreach ($st->fetchAll() as $r) {
        $skills[(int) $r['user_id']][] = $r['name'];
    }

    $out = [];

    foreach ($rows as $r) {
        $id = (int) $r['id'];

        $out[] = [
            'id'               => $id,
            'name'             => $r['name'],
            'campus'           => $r['campus'],
            'branch'           => (string) ($r['branch'] ?? ''),
            'year'             => $r['year'] !== null ? (int) $r['year'] : null,
            'bio'              => (string) ($r['bio'] ?? ''),
            'avatar_url'       => $r['avatar_url'] ?? null,
            'skills'           => $skills[$id] ?? [],
            'interests'        => hm_csv_split($r['interests'] ?? null),
            'preferred_roles'  => hm_csv_split($r['preferred_roles'] ?? null),
            'experience_level' => $r['experience_level'] ?? 'beginner',
            'experience_text'  => (string) ($r['experience_text'] ?? ''),
            'github_url'       => (string) ($r['github_url'] ?? ''),
            'linkedin_url'     => (string) ($r['linkedin_url'] ?? ''),
            'looking_for_team' => (bool) ($r['looking_for_team'] ?? false),
        ];
    }

    return $out;
}

/* Public view of one active user. */
function hm_public_user(int $id): ?array
{
    $st = db()->prepare(
        'SELECT ' . HM_USER_SELECT . HM_USER_FROM .
        " WHERE u.id = ? AND u.status = 'active'"
    );

    $st->execute([$id]);
    $row = $st->fetch();

    return $row ? hm_shape_users([$row])[0] : null;
}

/* Several users by ID, keyed by ID. */
function hm_users_map(array $ids): array
{
    $ids = array_values(array_unique(array_map('intval', $ids)));

    if (!$ids) {
        return [];
    }

    $st = db()->prepare(
        'SELECT ' . HM_USER_SELECT . HM_USER_FROM .
        ' WHERE u.id IN (' . hm_placeholders(count($ids)) . ')'
    );

    $st->execute($ids);

    $map = [];

    foreach (hm_shape_users($st->fetchAll()) as $u) {
        $map[$u['id']] = $u;
    }

    return $map;
}

/* The logged-in user's own profile. */
function hm_own_user(int $id): ?array
{
    $u = hm_public_user($id);

    if (!$u) {
        return null;
    }

    $st = db()->prepare(
        'SELECT email, role, campus_id FROM users WHERE id = ?'
    );

    $st->execute([$id]);
    $x = $st->fetch();

    $u['email'] = $x['email'];
    $u['role'] = $x['role'];
    $u['campus_id'] = (int) $x['campus_id'];

    return $u;
}

/* % of profile fields filled. */
function hm_profile_completion(array $u): int
{
    $checks = [
        $u['bio'] !== '',
        $u['branch'] !== '',
        $u['year'] !== null,
        count($u['skills']) > 0,
        count($u['interests']) > 0,
        count($u['preferred_roles']) > 0,
        $u['experience_text'] !== '',
        $u['github_url'] !== '',
        $u['linkedin_url'] !== '',
    ];

    return (int) round(
        100 * count(array_filter($checks)) / count($checks)
    );
}

/* ---------- projects ---------- */

const HM_PROJECT_SELECT = 'pr.id, pr.title, pr.description, pr.category, pr.status, pr.team_size_target, pr.looking_for_roles, pr.repo_url,
    pr.hackathon_id, pr.created_at, pr.owner_id, o.name AS owner_name, c.short_name AS campus,
    (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = pr.id) AS member_count';

const HM_PROJECT_FROM = ' FROM projects pr JOIN users o ON o.id = pr.owner_id JOIN campuses c ON c.id = pr.campus_id ';

function hm_shape_projects(array $rows): array
{
    if (!$rows) {
        return [];
    }

    $ids = array_map(fn($r) => (int) $r['id'], $rows);

    $st = db()->prepare(
        'SELECT ps.project_id, s.name FROM project_skills ps
         JOIN skills s ON s.id = ps.skill_id
         WHERE ps.project_id IN (' . hm_placeholders(count($ids)) . ')
         ORDER BY s.name'
    );

    $st->execute($ids);

    $tech = [];

    foreach ($st->fetchAll() as $r) {
        $tech[(int) $r['project_id']][] = $r['name'];
    }

    $out = [];

    foreach ($rows as $r) {
        $id = (int) $r['id'];

        $out[] = [
            'id'           => $id,
            'title'        => $r['title'],
            'description'  => $r['description'],
            'category'     => $r['category'],
            'status'       => $r['status'],
            'campus'       => $r['campus'],
            'owner'        => [
                'id' => (int) $r['owner_id'],
                'name' => $r['owner_name']
            ],
            'team_size'    => (int) $r['team_size_target'],
            'member_count' => (int) $r['member_count'],
            'looking_for'  => hm_csv_split($r['looking_for_roles']),
            'tech'         => $tech[$id] ?? [],
            'repo_url'     => (string) ($r['repo_url'] ?? ''),
            'hackathon_id' => $r['hackathon_id'] !== null
                ? (int) $r['hackathon_id']
                : null,
            'created_at'   => $r['created_at'],
        ];
    }

    return $out;
}

function hm_project_by_id(int $id): ?array
{
    $st = db()->prepare(
        'SELECT ' . HM_PROJECT_SELECT . HM_PROJECT_FROM .
        ' WHERE pr.id = ?'
    );

    $st->execute([$id]);
    $row = $st->fetch();

    return $row ? hm_shape_projects([$row])[0] : null;
}

function hm_set_project_skills(int $projectId, array $skillIds): void
{
    $pdo = db();

    $pdo->prepare(
        'DELETE FROM project_skills WHERE project_id = ?'
    )->execute([$projectId]);

    $ins = $pdo->prepare(
        'INSERT INTO project_skills (project_id, skill_id) VALUES (?, ?)'
    );

    foreach ($skillIds as $sid) {
        $ins->execute([$projectId, $sid]);
    }
}

/* ---------- hackathons ---------- */

function hm_shape_hackathons(array $rows): array
{
    if (!$rows) {
        return [];
    }

    $ids = array_map(fn($r) => (int) $r['id'], $rows);

    $st = db()->prepare(
        'SELECT hs.hackathon_id, s.name FROM hackathon_skills hs
         JOIN skills s ON s.id = hs.skill_id
         WHERE hs.hackathon_id IN (' . hm_placeholders(count($ids)) . ')
         ORDER BY s.name'
    );

    $st->execute($ids);

    $sk = [];

    foreach ($st->fetchAll() as $r) {
        $sk[(int) $r['hackathon_id']][] = $r['name'];
    }

    $out = [];

    foreach ($rows as $r) {
        $id = (int) $r['id'];

        $out[] = [
            'id'                    => $id,
            'name'                  => $r['name'],
            'organizer'             => $r['organizer'],
            'description'           => (string) ($r['description'] ?? ''),
            'mode'                  => $r['mode'],
            'location'              => (string) ($r['location'] ?? ''),
            'start_date'            => $r['start_date'],
            'end_date'              => $r['end_date'],
            'registration_deadline' => $r['registration_deadline'],
            'registration_url'      => (string) ($r['registration_url'] ?? ''),
            'prize_info'            => (string) ($r['prize_info'] ?? ''),
            'skills'                => $sk[$id] ?? [],
            'is_featured'           => (bool) $r['is_featured'],
            'is_saved'              => (bool) ($r['is_saved'] ?? false),
            'status'                => $r['status'],
        ];
    }

    return $out;
}

/* $where uses positional placeholders for $params. $uid = 0 for anonymous. */
function hm_query_hackathons(
    string $where,
    array $params,
    int $uid,
    string $order = 'h.is_featured DESC, h.start_date ASC',
    int $limit = 100,
    int $offset = 0
): array {
    $sql = 'SELECT h.*, EXISTS(
                SELECT 1 FROM saved_hackathons sh
                WHERE sh.hackathon_id = h.id AND sh.user_id = ?
            ) AS is_saved
            FROM hackathons h
            WHERE ' . $where . '
            ORDER BY ' . $order . '
            LIMIT ' . (int) $limit . '
            OFFSET ' . (int) $offset;

    $st = db()->prepare($sql);
    $st->execute(array_merge([$uid], $params));

    return hm_shape_hackathons($st->fetchAll());
}

/* Shared by hackathons/create.php, hackathons/update.php and admin/action.php. */
function hm_save_hackathon(
    array $input,
    ?int $id,
    int $adminId
): int {
    $v = new V($input);
    $creating = $id === null;

    $f = [];
    $f['name'] = $v->str('name', 3, 150, $creating);
    $f['organizer'] = $v->str('organizer', 2, 150, $creating);
    $f['description'] = $v->str('description', 0, 5000, false, '', true);
    $f['mode'] = $v->enum('mode', ['online', 'offline', 'hybrid'], false, $creating ? 'online' : null);
    $f['location'] = $v->str('location', 0, 150, false);
    $f['start_date'] = $v->date('start_date', $creating);
    $f['end_date'] = $v->date('end_date', $creating);
    $f['registration_deadline'] = $v->date('registration_deadline', $creating);
    $f['registration_url'] = $v->url('registration_url');
    $f['prize_info'] = $v->str('prize_info', 0, 255, false);

    $feat = $v->bool('is_featured');
    $f['is_featured'] = $feat === null ? null : (int) $feat;

    $f['status'] = $v->enum(
        'status',
        ['draft', 'published', 'archived'],
        false,
        $creating ? 'published' : null
    );

    $skillNames = $v->list('skills', 15, 60);
    $v->done();

    $skillIds = null;

    if ($skillNames !== null) {
        [$skillIds, $unknown] = hm_resolve_skills($skillNames);

        if ($unknown) {
            fail(
                'Unknown skill: ' . $unknown[0],
                422,
                'validation_error',
                ['skills' => 'Unknown skill: ' . $unknown[0]]
            );
        }
    }

    $pdo = db();

    return hm_tx(function () use (
        $pdo,
        $f,
        $id,
        $creating,
        $adminId,
        $skillIds
    ) {
        if (!$creating) {
            $st = $pdo->prepare(
                'SELECT start_date, end_date, registration_deadline
                 FROM hackathons WHERE id = ? FOR UPDATE'
            );

            $st->execute([$id]);
            $cur = $st->fetch();

            if (!$cur) {
                fail('Hackathon not found.', 404, 'not_found');
            }
        } else {
            $cur = [];
        }

        $start = $f['start_date'] ?? $cur['start_date'];
        $end = $f['end_date'] ?? $cur['end_date'];
        $deadline = $f['registration_deadline'] ?? $cur['registration_deadline'];

        if ($end < $start) {
            fail(
                'End date must be on or after the start date.',
                422,
                'validation_error',
                ['end_date' => 'End date must be on or after the start date.']
            );
        }

        if ($deadline > $end) {
            fail(
                'Registration deadline must be on or before the end date.',
                422,
                'validation_error',
                ['registration_deadline' => 'Deadline must be on or before the end date.']
            );
        }

        $cols = array_filter($f, fn($x) => $x !== null);

        if ($creating) {
            $cols['created_by'] = $adminId;
            $names = array_keys($cols);

            $pdo->prepare(
                'INSERT INTO hackathons (' . implode(',', $names) .
                ') VALUES (' . hm_placeholders(count($names)) . ')'
            )->execute(array_values($cols));

            $hid = (int) $pdo->lastInsertId();
        } else {
            $hid = (int) $id;

            if ($cols) {
                $set = implode(
                    ', ',
                    array_map(fn($k) => "$k = ?", array_keys($cols))
                );

                $pdo->prepare(
                    "UPDATE hackathons SET $set WHERE id = ?"
                )->execute(array_merge(array_values($cols), [$hid]));
            }
        }

        if ($skillIds !== null) {
            $pdo->prepare(
                'DELETE FROM hackathon_skills WHERE hackathon_id = ?'
            )->execute([$hid]);

            $ins = $pdo->prepare(
                'INSERT INTO hackathon_skills (hackathon_id, skill_id) VALUES (?, ?)'
            );

            foreach ($skillIds as $sid) {
                $ins->execute([$hid, $sid]);
            }
        }

        return $hid;
    });
}

/* ---------- notifications ---------- */

function hm_notify(
    int $userId,
    string $type,
    string $title,
    ?string $body = null,
    ?string $link = null
): void {
    db()->prepare(
        'INSERT INTO notifications (user_id, type, title, body, link_url)
         VALUES (?, ?, ?, ?, ?)'
    )->execute([
        $userId,
        $type,
        mb_substr($title, 0, 150),
        $body !== null ? mb_substr($body, 0, 300) : null,
        $link
    ]);
}
