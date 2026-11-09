-- HackMate DEMO seed data. Run AFTER schema.sql. NEVER load into production as-is.
-- Demo users have an intentionally INVALID password hash: nobody can log in until Account 2
-- generates real hashes with PHP password_hash() (see docs/HANDOFF_ACCOUNT_1.md).
SET NAMES utf8mb4;


INSERT INTO campuses (id, name, short_name, slug, city) VALUES
 (1,'Indira Gandhi Delhi Technical University for Women','IGDTUW','igdtuw','Delhi'),
 (2,'Delhi Technological University','DTU','dtu','Delhi'),
 (3,'Netaji Subhas University of Technology','NSUT','nsut','Delhi'),
 (4,'Indian Institute of Technology Delhi','IIT Delhi','iit-delhi','Delhi'),
 (6,'Indraprastha Institute of Information Technology Delhi','IIIT Delhi','iiit-delhi','Delhi');


INSERT INTO skills (id, name, category) VALUES
 (1,'Python','language'),(2,'JavaScript','language'),(3,'Java','language'),(4,'C++','language'),
 (5,'React','frontend'),(6,'HTML/CSS','frontend'),(7,'Node.js','backend'),(8,'PHP','backend'),
 (9,'MySQL','backend'),(10,'FastAPI','backend'),(11,'Machine Learning','data_ai'),(12,'Deep Learning','data_ai'),
 (13,'Data Analysis','data_ai'),(14,'Flutter','mobile'),(15,'Android','mobile'),(16,'Figma','design'),
 (17,'UI/UX','design'),(18,'Docker','devops'),(19,'Git','devops'),(20,'Cybersecurity','other'),
 (21,'Blockchain','other'),(22,'IoT','other'),(23,'Research Writing','other'),(24,'Product Management','other'),
 (25,'TensorFlow','data_ai'),(26,'AI/ML','data_ai'),(27,'Data Science','data_ai'),(28,'Cloud','devops'),(29,'DevOps','devops');

-- password_hash below is a placeholder, NOT a valid hash.mysql -u root hackmate -e "SHOW TABLES;"
INSERT INTO users (id, campus_id, name, email, password_hash, role, status, email_verified_at) VALUES
 (1,2,'Admin HackMate','admin@hackmate.test','!DEMO-NO-LOGIN','admin','active',NOW()),
 (2,2,'Shubham Verma','shubham@hackmate.test','!DEMO-NO-LOGIN','student','active',NOW()),
 (3,3,'Rahul Mehta','rahul@hackmate.test','!DEMO-NO-LOGIN','student','active',NOW()),
 (4,1,'Ananya Sharma','ananya@hackmate.test','!DEMO-NO-LOGIN','student','active',NOW()),
 (5,4,'Karan Malhotra','karan@hackmate.test','!DEMO-NO-LOGIN','student','active',NOW()),
 (6,1,'Priya Singh','priya@hackmate.test','!DEMO-NO-LOGIN','student','active',NOW()),
 (7,2,'Aarav Gupta','aarav@hackmate.test','!DEMO-NO-LOGIN','student','active',NOW()),
 (8,1,'Meera Nair','meera@hackmate.test','!DEMO-NO-LOGIN','student','active',NOW()),
 (9,3,'Ishaan Kapoor','ishaan@hackmate.test','!DEMO-NO-LOGIN','student','active',NOW());

INSERT INTO profiles (user_id, branch, year, bio, interests, preferred_roles, experience_level, experience_text, github_url, linkedin_url, looking_for_team) VALUES
 (1,'Admin',NULL,'Platform administrator.',NULL,NULL,'advanced',NULL,NULL,NULL,0),
 (2,'Computer Science',3,'Backend and ML tinkerer. I like turning messy data into something useful.','AI for good, Open source, Climate tech','Backend Developer,ML Engineer','advanced','2 hackathon wins, 1 ML internship','https://github.com/example-shubham','https://linkedin.com/in/example-shubham',1),
 (3,'Information Technology',2,'Frontend dev who cares about pixels and performance.','Web apps, Design systems','Frontend Developer','intermediate','Built 5 personal projects, SIH finalist','https://github.com/example-rahul',NULL,1),
 (4,'Computer Science (AI)',3,'Designer who codes a little. Figma first, then the rest.','Product design, EdTech','UI/UX Designer,Product Manager','intermediate','Design lead at college tech society','https://github.com/example-ananya','https://linkedin.com/in/example-ananya',1),
 (5,'Mathematics & Computing',4,'Research-minded. Looking for a team that wants to publish.','Research, NLP, Reinforcement learning','Researcher,ML Engineer','advanced','Co-author on 1 workshop paper','https://github.com/example-karan',NULL,1),
 (6,'Electronics & Communication',2,'IoT and embedded. Happy when something blinks.','IoT, Hardware hacks, Smart campus','Embedded Developer,Backend Developer','intermediate','Smart-lab automation project','https://github.com/example-priya',NULL,1),
 (7,'Software Engineering',1,'First-year, fast learner, wants to join a first hackathon.','Web dev, Games','Frontend Developer','beginner','Completed CS50, two small web apps','https://github.com/example-aarav',NULL,1),
 (8,'Information Technology',4,'Android + Flutter. Shipped two apps to the Play Store.','Mobile apps, Health tech','Mobile Developer','advanced','2 Play Store apps, 1 internship','https://github.com/example-meera','https://linkedin.com/in/example-meera',1),
 (9,'Computer Engineering',3,'Security nerd. CTFs on weekends.','Cybersecurity, Blockchain','Security Engineer,Backend Developer','intermediate','Top 50 in a national CTF','https://github.com/example-ishaan',NULL,0);

INSERT INTO user_skills (user_id, skill_id, level) VALUES
 (2,1,'advanced'),(2,10,'advanced'),(2,11,'intermediate'),(2,9,'intermediate'),
 (3,2,'advanced'),(3,5,'advanced'),(3,6,'advanced'),
 (4,16,'advanced'),(4,17,'advanced'),(4,6,'intermediate'),
 (5,1,'advanced'),(5,12,'advanced'),(5,23,'advanced'),(5,25,'intermediate'),
 (6,22,'advanced'),(6,4,'intermediate'),(6,1,'intermediate'),
 (7,6,'beginner'),(7,2,'beginner'),(7,19,'beginner'),
 (8,14,'advanced'),(8,15,'advanced'),(8,3,'intermediate'),
 (9,20,'advanced'),(9,21,'intermediate'),(9,7,'intermediate'),
 (2,26,'advanced'),(5,26,'advanced'),(5,27,'advanced'),(6,28,'beginner'),(9,28,'intermediate');

INSERT INTO hackathons (id, name, organizer, description, mode, location, start_date, end_date, registration_deadline, registration_url, prize_info, is_featured, created_by) VALUES
 (1,'Smart India Hackathon (Demo)','Ministry of Education','National-level hackathon solving real problem statements from government bodies.','hybrid','Nodal centres across India','2026-12-12','2026-12-14','2026-11-20','https://example.com/sih','Prizes up to Rs 1,00,000',1,1),
 (2,'HackDTU 6.0','DTU Developers Society','24-hour campus hackathon with tracks in AI, Web3 and sustainability.','offline','DTU, Rohini','2026-11-22','2026-11-23','2026-11-12','https://example.com/hackdtu','Rs 75,000 prize pool',1,1),
 (3,'NSUT CodeSprint','NSUT Coding Club','Online competitive programming and project sprint.','online',NULL,'2026-11-08','2026-11-09','2026-11-05','https://example.com/codesprint','Goodies + internships',0,1),
 (4,'Rendezvous Tech Challenge','IIT Delhi','Flagship fest tech challenge: build, demo, and pitch to judges.','offline','IIT Delhi, Hauz Khas','2026-12-05','2026-12-07','2026-11-25','https://example.com/rendezvous','Rs 2,00,000 pool',1,1),
 (5,'Open Source Sprint','Community Foundation','Four weeks of guided open-source contributions.','online',NULL,'2026-11-15','2026-12-13','2026-11-14','https://example.com/oss-sprint','Certificates + swag',0,1),
 (6,'IGDTUW InnovateHer','IGDTUW Tech Council','Hackathon for women builders with mentors from industry.','hybrid','IGDTUW, Kashmere Gate','2027-01-17','2027-01-18','2027-01-05','https://example.com/innovateher','Rs 50,000 + mentorship',0,1);

INSERT INTO hackathon_skills (hackathon_id, skill_id) VALUES
 (1,1),(1,2),(1,11),(2,11),(2,21),(2,5),(3,4),(3,1),(4,2),(4,22),(4,17),(5,19),(5,2),(6,17),(6,14),(6,11);

INSERT INTO saved_hackathons (user_id, hackathon_id) VALUES (2,1),(2,2),(2,4),(3,2),(4,6);

INSERT INTO projects (id, owner_id, campus_id, hackathon_id, title, description, category, status, team_size_target, looking_for_roles, repo_url) VALUES
 (1,2,2,1,'EcoVision','Computer vision pipeline that classifies campus waste and routes it to the right bin, with a dashboard for facilities teams.','hackathon','open',4,'Researcher',NULL),
 (2,3,3,2,'AI Waste Management','Smart-bin network with ML sorting and a web app that rewards students for correct disposal.','hackathon','open',4,'ML Engineer,Frontend Developer',NULL),
 (3,4,1,6,'StudyBuddy','Peer-matching app for study groups: find people taking the same course and plan sessions together.','college_project','open',5,'Backend Developer,Mobile Developer',NULL),
 (4,5,4,NULL,'LegalLens NLP','Research project on summarising Indian court judgments with transformer models.','research','open',3,'ML Engineer,Researcher',NULL),
 (5,6,1,4,'SmartLab IoT','Sensor-based lab monitoring: occupancy, temperature and equipment usage.','competition','open',4,'Backend Developer,UI/UX Designer',NULL),
 (6,9,3,NULL,'CampusChain','Verifiable digital certificates for campus events using a lightweight blockchain.','open_source','in_progress',4,'Frontend Developer',NULL);

INSERT INTO project_skills (project_id, skill_id) VALUES
 (1,1),(1,12),(1,10),(2,1),(2,5),(2,10),(3,14),(3,7),(3,17),(4,1),(4,12),(4,23),(5,22),(5,4),(5,9),(6,21),(6,2),(6,7);

INSERT INTO project_members (project_id, user_id, member_role, is_owner) VALUES
 (1,2,'Backend/ML',1),(1,3,'Frontend',0),(1,4,'UI/UX',0),(1,5,'Research',0),
 (2,3,'Frontend',1),(2,7,'Frontend',0),
 (3,4,'Product & Design',1),(3,8,'Mobile',0),
 (4,5,'Lead Researcher',1),
 (5,6,'Embedded',1),(5,9,'Security',0),
 (6,9,'Lead',1);

INSERT INTO team_requests (id, sender_id, receiver_id, project_id, type, message, status, created_at) VALUES
 (1,7,3,2,'join_request','Hi! I am a first-year frontend learner and would love to help on the UI.','accepted',NOW() - INTERVAL 6 DAY),
 (2,8,2,1,'join_request','I can build the mobile companion app for EcoVision if you need one.','pending',NOW() - INTERVAL 1 DAY),
 (3,6,2,NULL,'team_up','Looking for a backend teammate for InnovateHer. Interested?','pending',NOW() - INTERVAL 2 DAY),
 (4,2,5,4,'join_request','I have done document classification before and would like to help with LegalLens.','pending',NOW() - INTERVAL 3 DAY),
 (5,2,4,NULL,'team_up','Want to team up for the next hackathon?','rejected',NOW() - INTERVAL 10 DAY);

INSERT INTO notifications (user_id, type, title, body, link_url, is_read) VALUES
 (2,'request_received','New join request','Meera Nair wants to join EcoVision.','requests.html',0),
 (2,'request_received','New teammate request','Priya Singh sent you a team request.','requests.html',0),
 (2,'hackathon_reminder','Registration closing soon','HackDTU 6.0 registration closes soon.','hackathons.html',1),
 (2,'member_joined','Karan joined EcoVision','Your team is now 4 / 4.','team.html',1);

INSERT INTO reports (reporter_id, target_type, target_user_id, target_project_id, reason, details, status) VALUES
 (3,'user',9,NULL,'spam','Sent the same message to many students.','open'),
 (4,'project',NULL,6,'inappropriate','Description mentions an unrelated paid service.','reviewing');
