-- Insert missing legacy role slugs so all existing users resolve to a system_role row
-- Run AFTER pulso_3nf_migration.sql is applied

INSERT INTO system_roles (name, label, capabilities, access_level) VALUES
    ('resident',               'Resident / Citizen',          '{}',                                                                                            'resident'),
    ('assistant_city_engineer','Asst. City Engineer (legacy)', '{"records":["view","create","edit","delete"],"ops":["dashboard","dispatch","timeline"],"procurement":["view","apply","approve"]}', 'executive'),
    ('assistant_engineer',     'Assistant Engineer',           '{"records":["view"],"ops":["dashboard","timeline"]}',                                           'staff'),
    ('engineer_i',             'Engineer I',                   '{"records":["view"],"ops":["dashboard","timeline"]}',                                           'staff'),
    ('engineer_ii',            'Engineer II',                  '{"records":["view","create"],"ops":["dashboard","timeline"],"maintenance":["view"]}',           'staff'),
    ('field_engineer',         'Field Engineer',               '{"ops":["dashboard","timeline"],"maintenance":["view"]}',                                       'staff'),
    ('lead_engineer',          'Lead Engineer',                '{"records":["view","create","edit"],"ops":["dashboard","dispatch","timeline"],"maintenance":["view","manage"]}', 'senior'),
    ('maintenance_foreman',    'Maintenance Foreman',          '{"ops":["dashboard"],"maintenance":["view"]}',                                                  'staff')
ON CONFLICT (name) DO NOTHING;

-- Back-fill role_id for all users now that all role slugs exist in system_roles
UPDATE users u
SET    role_id = sr.id
FROM   system_roles sr
WHERE  u.role = sr.name
  AND  u.role_id IS NULL;

-- Verify: show remaining unmatched
SELECT 'final_unmatched_role_check' AS check_name,
       u.role,
       COUNT(*) AS users
FROM   users u
LEFT   JOIN system_roles sr ON u.role = sr.name
WHERE  sr.id IS NULL
GROUP  BY u.role
ORDER  BY COUNT(*) DESC;
